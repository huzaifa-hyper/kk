
import React from 'react';
import { PromptSuggestion } from '../types';

interface PromptSuggestionsProps {
  suggestions: PromptSuggestion[];
  onSelect: (prompt: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ suggestions, onSelect, isLoading, onRefresh }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span className="text-green-500">✨</span> Suggestion Lab
        </h3>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="text-zinc-400 hover:text-green-500 transition-colors disabled:opacity-50"
          title="Refresh Suggestions"
        >
          <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(s.prompt)}
            className="text-left p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-green-500/30 hover:bg-zinc-800/50 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                s.category === 'Crypto' ? 'bg-blue-500/20 text-blue-400' :
                s.category === 'Luxury' ? 'bg-yellow-500/20 text-yellow-400' :
                s.category === 'Action' ? 'bg-red-500/20 text-red-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {s.category}
              </span>
              <span className="text-sm font-semibold text-zinc-200 group-hover:text-green-400 transition-colors">
                {s.title}
              </span>
            </div>
            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
              {s.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PromptSuggestions;
