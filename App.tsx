
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateMascotImage, suggestPrompts, refineMascotImage } from './services/gemini';
import MascotCard from './components/MascotCard';
import PromptSuggestions from './components/PromptSuggestions';
import { GeneratedMascot, PromptSuggestion } from './types';
import { DEFAULT_SUGGESTIONS } from './constants';

const MAX_FREE_QUOTA = 15;

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [history, setHistory] = useState<GeneratedMascot[]>([]);
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>(DEFAULT_SUGGESTIONS);
  const [masterReference, setMasterReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUltra, setIsUltra] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [energy, setEnergy] = useState(MAX_FREE_QUOTA);
  const [totalRenders, setTotalRenders] = useState(0);
  const [isRefilling, setIsRefilling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for custom key on mount
  useEffect(() => {
    const checkKey = async () => {
      try {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasCustomKey(hasKey);
      } catch (e) {
        console.error("Key check failed", e);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      setHasCustomKey(true);
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const handleRefillEnergy = () => {
    setIsRefilling(true);
    setTimeout(() => {
      setEnergy(MAX_FREE_QUOTA);
      setIsRefilling(false);
      setError(null);
    }, 1500);
  };

  const getErrorMessage = (err: any): string => {
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return 'An unknown error occurred.';
    }
  };

  // Load state from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('mascot_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      
      const savedMaster = localStorage.getItem('mascot_master_ref');
      if (savedMaster) setMasterReference(savedMaster);

      const savedEnergy = localStorage.getItem('chad_energy');
      if (savedEnergy) setEnergy(parseInt(savedEnergy));

      const savedTotal = localStorage.getItem('total_renders');
      if (savedTotal) setTotalRenders(parseInt(savedTotal));
    } catch (e) {
      console.error("Failed to load state", e);
    }
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mascot_history', JSON.stringify(history.slice(0, 10)));
      localStorage.setItem('chad_energy', energy.toString());
      localStorage.setItem('total_renders', totalRenders.toString());
    } catch (e) {}
  }, [history, energy, totalRenders]);

  useEffect(() => {
    try {
      if (masterReference) localStorage.setItem('mascot_master_ref', masterReference);
      else localStorage.removeItem('mascot_master_ref');
    } catch (e) {}
  }, [masterReference]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!hasCustomKey && energy <= 0) {
      setError("Free Mode energy depleted! Use the 'Refill' button or upgrade below.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const url = await generateMascotImage(prompt, { 
        masterReference: masterReference || undefined,
        useUltra: isUltra
      });
      
      const newMascot: GeneratedMascot = {
        id: Math.random().toString(36).substr(2, 9),
        url,
        prompt,
        timestamp: Date.now(),
        isUltra
      };

      setHistory(prev => [newMascot, ...prev.slice(0, 9)]);
      setTotalRenders(prev => prev + 1);
      
      if (!hasCustomKey) {
        setEnergy(prev => Math.max(0, prev - 1));
      }

      if (!masterReference) setMasterReference(url);
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429')) {
        setError('Rate limit reached! The Shared Key is cooling down. Refill energy or upgrade.');
        if (!hasCustomKey) setEnergy(0);
      } else if (errorMsg.includes('entity was not found') || errorMsg.includes('404')) {
        setHasCustomKey(false);
        setError('API Key configuration error. Reverted to Free Mode.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (targetMascot: GeneratedMascot) => {
    setIsGenerating(true);
    setError(null);
    try {
      const url = await refineMascotImage(targetMascot.url);
      const newMascot: GeneratedMascot = {
        id: Math.random().toString(36).substr(2, 9),
        url,
        prompt: `${targetMascot.prompt} (Refined)`,
        timestamp: Date.now(),
      };
      setHistory(prev => [newMascot, ...prev.slice(0, 9)]);
      document.getElementById('vault-heading')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err: any) {
      setError(`Refinement failed: ${getErrorMessage(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: string) => {
    const itemToDelete = history.find(h => h.id === id);
    setHistory(prev => prev.filter(h => h.id !== id));
    if (itemToDelete && itemToDelete.url === masterReference) setMasterReference(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setMasterReference(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const handleRefreshSuggestions = useCallback(async () => {
    setIsSuggesting(true);
    try {
      const res = await suggestPrompts();
      if (res.suggestions.length > 0) setSuggestions(res.suggestions);
    } catch (err) {} finally { setIsSuggesting(false); }
  }, []);

  const handleSelectSuggestion = (suggestedPrompt: string) => {
    setPrompt(suggestedPrompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const energyPercentage = (energy / MAX_FREE_QUOTA) * 100;

  return (
    <div className="min-h-screen pb-20 relative">
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-24 h-24 border-8 border-zinc-800 border-t-green-500 rounded-full animate-spin mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)]"></div>
          <div className="bg-white border-4 border-black px-6 py-3 -rotate-1 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-bangers text-3xl text-black tracking-widest animate-pulse">
              {isUltra ? "ULTRA RENDERING..." : "CHAD IS RENDERING..."}
            </p>
          </div>
          <p className="text-zinc-200 mt-6 font-bold text-sm uppercase tracking-[0.3em] max-w-xs drop-shadow-lg text-center">
            {isUltra ? "Generating 2K resolution master art" : "Synthesizing high-density muscular pixels"}
          </p>
        </div>
      )}

      {/* Top Bar Quota Management */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Lifetime:</span>
            <span className="text-[10px] font-mono text-green-500">{totalRenders}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasCustomKey ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-blue-400 animate-pulse'}`}></span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {hasCustomKey ? "Pro Mode" : "Free Mode"}
            </span>
          </div>
          <button 
            onClick={handleSelectKey}
            className={`text-[10px] font-bold py-1 px-3 rounded-full border transition-all uppercase ${hasCustomKey ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-yellow-400 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'}`}
          >
            {hasCustomKey ? "Switch Key" : "⚡️ Upgrade Quota"}
          </button>
        </div>
      </div>

      <header className="relative h-[40vh] min-h-[300px] flex flex-col items-center justify-center text-center px-4 sunburst-bg border-b-8 border-black shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
        <div className="z-10 bg-white border-4 border-black px-8 py-4 -rotate-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-5xl md:text-7xl font-bangers tracking-wider text-black text-shadow-xl">
            CHAD MASCOT AI
          </h1>
        </div>
        <p className="z-10 mt-6 text-black font-extrabold text-xl bg-green-400 px-4 py-1 rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          FREE 2D CHARACTER ENGINE
        </p>
      </header>

      <main className="max-w-6xl mx-auto -mt-12 px-4 space-y-12">
        <section className="bg-zinc-950 border-4 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-2">
                  <label className="text-zinc-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Mascot Context Prompt
                  </label>
                  <div className="relative group">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. Chad lifting giant crypto coins in a gym..."
                      className="w-full h-40 bg-zinc-900 border-2 border-zinc-800 focus:border-green-500 rounded-2xl p-4 text-lg resize-none outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="w-full md:w-48 space-y-2">
                  <label className="text-zinc-400 font-bold text-sm uppercase tracking-widest">Character Sync</label>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <div onClick={triggerUpload} className={`aspect-square bg-zinc-900 rounded-2xl border-2 flex items-center justify-center relative overflow-hidden group border-dashed border-zinc-800 cursor-pointer`}>
                    {masterReference ? <img src={masterReference} className="w-full h-full object-cover" alt="Ref" /> : <div className="text-center p-4 text-[10px] text-zinc-600 font-bold">UPLOAD REF</div>}
                  </div>
                </div>
              </div>

              {/* Energy Bar Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    {hasCustomKey ? "PRO UNLIMITED TIER" : "CHAD ENERGY (FREE MODE)"}
                    {!hasCustomKey && energy < MAX_FREE_QUOTA && (
                      <button 
                        onClick={handleRefillEnergy}
                        disabled={isRefilling}
                        className={`text-[10px] px-2 py-0.5 rounded bg-green-500 text-black font-bold uppercase tracking-tight hover:bg-green-400 transition-all ${isRefilling ? 'animate-pulse opacity-50' : ''}`}
                      >
                        {isRefilling ? "Refilling..." : "⚡️ Refill Now"}
                      </button>
                    )}
                  </label>
                  <span className="text-[10px] font-bold text-zinc-400">
                    {hasCustomKey ? "∞ UNLIMITED" : `${energy} / ${MAX_FREE_QUOTA} RENDERS`}
                  </span>
                </div>
                <div className="h-6 bg-zinc-900 border-2 border-zinc-800 rounded-full overflow-hidden relative shadow-inner">
                  {hasCustomKey ? (
                    <div className="h-full bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 animate-[shimmer_2s_infinite] shadow-[0_0_15px_rgba(250,204,21,0.5)]"></div>
                  ) : (
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        energyPercentage > 50 ? 'bg-green-500' : energyPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                      }`}
                      style={{ width: `${energyPercentage}%` }}
                    ></div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bangers text-white mix-blend-difference tracking-widest">
                      {hasCustomKey ? "MAX POWER" : isRefilling ? "POWERING UP..." : `${Math.round(energyPercentage)}% ENERGY`}
                    </span>
                  </div>
                </div>
              </div>

              {/* API Key / Pro Mode CTA */}
              {!hasCustomKey && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-400 uppercase text-xs flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                      Unlock Unlimited Generations
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Connect your own Gemini API Key to bypass free limits and access 2K Ultra mode. 
                      <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-400 underline ml-1">Learn about paid keys.</a>
                    </p>
                  </div>
                  <button 
                    onClick={handleSelectKey}
                    className="bg-blue-500 hover:bg-blue-400 text-white text-[10px] font-bold py-2 px-4 rounded-xl transition-all shadow-[0_4px_0_0_#1e40af] active:shadow-none active:translate-y-[4px] uppercase whitespace-nowrap"
                  >
                    Connect API Key
                  </button>
                </div>
              )}

              {/* Ultra Toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                <div>
                  <h4 className="font-bold text-zinc-200 uppercase text-xs">Ultra Quality Mode (2K)</h4>
                  <p className="text-[10px] text-zinc-500 italic">Best used with Pro Mode API Key</p>
                </div>
                <button 
                  onClick={() => setIsUltra(!isUltra)}
                  className={`w-14 h-7 rounded-full relative transition-colors ${isUltra ? 'bg-green-500' : 'bg-zinc-800'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isUltra ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <button
                onClick={hasCustomKey || energy > 0 ? handleGenerate : handleSelectKey}
                disabled={isGenerating || !prompt.trim()}
                className={`w-full font-bangers text-2xl py-5 rounded-2xl shadow-[0_6px_0_0_#15803d] active:shadow-none active:translate-y-[6px] transition-all ${
                  !hasCustomKey && energy <= 0 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-800' 
                  : 'bg-green-500 hover:bg-green-400 text-black'
                }`}
              >
                {!hasCustomKey && energy <= 0 
                  ? "CONNECT API KEY FOR UNLIMITED ART" 
                  : isGenerating ? "RENDERING..." : `GENERATE ${isUltra ? "ULTRA" : "FREE"} ART`
                }
              </button>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="flex-1">{error}</span>
                  </div>
                  {(energy <= 0 && !hasCustomKey) && (
                    <button onClick={handleRefillEnergy} className="text-xs bg-green-500 text-black py-1 px-4 rounded-lg font-bold uppercase tracking-wider self-start hover:bg-green-400 transition-colors">
                      ⚡️ Free Energy Refill
                    </button>
                  )}
                  {error.includes('limit') && (
                    <button onClick={handleSelectKey} className="text-xs bg-yellow-500 text-black py-1 px-4 rounded-lg font-bold uppercase tracking-wider self-start hover:bg-yellow-400 transition-colors">
                      ⚡️ Upgrade to Pro Mode
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="border-t lg:border-t-0 lg:border-l border-zinc-800 pt-8 lg:pt-0 lg:pl-10">
              <PromptSuggestions suggestions={suggestions} onSelect={handleSelectSuggestion} isLoading={isSuggesting} onRefresh={handleRefreshSuggestions} />
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center justify-between" id="vault-heading">
            <h2 className="text-3xl font-bangers tracking-wider text-green-500">CHARACTER VAULT</h2>
            {history.length > 0 && <button onClick={() => setHistory([])} className="text-zinc-600 hover:text-red-500 text-sm font-bold uppercase">Clear Vault</button>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {history.map(mascot => (
              <MascotCard 
                key={mascot.id} 
                mascot={mascot} 
                isMaster={masterReference === mascot.url}
                onSetMaster={setMasterReference}
                onDelete={handleDelete}
                onRefine={handleRefine}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-20 py-10 border-t border-zinc-800 text-center px-4">
        <div className="flex flex-col items-center gap-4">
          <p className="text-zinc-500 text-xs uppercase tracking-[0.4em] font-bold">Consistency Engine Active // $CHAD AI</p>
          <div className="flex gap-4">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-zinc-600 underline hover:text-zinc-400">Pro Documentation</a>
            <span className="text-[10px] text-zinc-700">|</span>
            <button onClick={() => setEnergy(MAX_FREE_QUOTA)} className="text-[10px] text-zinc-600 underline hover:text-zinc-400">Reset Free Energy</button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
};

export default App;
