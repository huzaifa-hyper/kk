
import React from 'react';
import { GeneratedMascot } from '../types';

interface MascotCardProps {
  mascot: GeneratedMascot;
  isMaster: boolean;
  onSetMaster: (url: string) => void;
  onDelete: (id: string) => void;
  onRefine: (mascot: GeneratedMascot) => void;
}

const MascotCard: React.FC<MascotCardProps> = ({ mascot, isMaster, onSetMaster, onDelete, onRefine }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mascot.url;
    link.download = `chad-mascot-${mascot.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`bg-zinc-900 border rounded-2xl overflow-hidden group transition-all duration-300 shadow-xl ${isMaster ? 'border-green-500 ring-2 ring-green-500/50' : 'border-zinc-800 hover:border-green-500/50'}`}>
      <div className="aspect-square relative overflow-hidden bg-zinc-800">
        <img 
          src={mascot.url} 
          alt={mascot.prompt} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {isMaster && (
          <div className="absolute top-2 left-2 bg-green-500 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg z-10 flex items-center gap-1">
             <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
             MASTER REF
          </div>
        )}

        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-4">
          <button 
            onClick={() => onSetMaster(mascot.url)}
            className="w-full bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all"
          >
            {isMaster ? 'Character Synced' : 'Set as Master Ref'}
          </button>

          <button 
            onClick={() => onRefine(mascot)}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all delay-75"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M21 17v4"/><path d="M19 19h4"/></svg>
            Refine Shadows
          </button>
          
          <button 
            onClick={handleDownload}
            className="w-full bg-green-500 hover:bg-green-400 text-black text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all delay-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>

          <button 
            onClick={() => onDelete(mascot.id)}
            className="w-full bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all delay-150 border border-red-500/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Delete
          </button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-zinc-400 text-sm line-clamp-2 italic leading-tight">"{mascot.prompt}"</p>
        <div className="mt-2 flex justify-between items-center">
          <span className="text-[10px] text-zinc-600 font-mono uppercase">
            {new Date(mascot.timestamp).toLocaleDateString()} {new Date(mascot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MascotCard;
