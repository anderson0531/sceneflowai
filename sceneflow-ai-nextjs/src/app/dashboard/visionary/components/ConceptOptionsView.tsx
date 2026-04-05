"use client";

import { motion } from 'framer-motion';
import { PlayCircle, Globe, User, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { useStorylineGeneratorStore } from '@/store/useStorylineGeneratorStore';
import { useRouter } from 'next/navigation';

interface ConceptOptionsViewProps {
  concepts: Concept[] | null;
  onSelect?: (concept: Concept) => void;
  isStreaming: boolean;
}

export function ConceptOptionsView({ concepts, onSelect, isStreaming }: ConceptOptionsViewProps) {
  const setSeriesGenerationInput = useStorylineGeneratorStore((state) => state.setSeriesGenerationInput);
  const router = useRouter();

  const handleSelectConcept = (concept: any) => {
    setSeriesGenerationInput({
      title: concept.seriesTitle,
      concept: concept.synopsis,
      marketContext: concept.targetMarketLogic,
    });
    router.push('/dashboard/workflow/ideation');
  };

  const getVibeStyles = (vibe: string) => {
    switch (vibe) {
      case 'dark':
        return 'bg-gray-900 text-white';
      case 'light':
        return 'bg-white text-black';
      case 'emerald':
        return 'bg-emerald-500 text-white';
      default:
        return '';
    }
  };

  if (isStreaming && !concepts) {
    return (
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 rounded-xl p-8">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <motion.div
            className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center"
            animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-7 h-7 text-emerald-300" />
          </motion.div>
          <h3 className="text-xl font-bold text-white">Generating concept variations...</h3>
          <p className="text-sm text-gray-300">
            We are synthesizing three market-aligned series directions from your report.
          </p>
          <div className="flex items-center justify-center gap-2 text-emerald-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Please wait while we finalize your options
          </div>
        </div>
      </div>
    );
  }

  if (!concepts) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
      {concepts.map((concept: any) => (
        <motion.div
          key={concept.id}
          className={`border border-gray-800 rounded-2xl flex flex-col h-full overflow-hidden ${getVibeStyles(concept.vibe)}`}
        >
          {/* Header */}
          <div className="p-6 bg-emerald-500/5 border-b border-gray-800">
             <div className="flex justify-between items-center mb-4">
               <div className="p-2 bg-emerald-500/10 rounded-lg">
                 <Globe className="w-4 h-4 text-emerald-500" />
               </div>
               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                 {typeof concept.marketLogic === 'string' && concept.marketLogic.includes(':') 
                      ? concept.marketLogic.split(':')[0] 
                      : (concept.marketLogic || 'Global Target')}
               </span>
             </div>
             {/* 🛡️ Ensure title is rendered */}
             <h3 className="text-2xl font-bold text-white mb-2 leading-tight">
               {concept.title}
             </h3>
             <p className="text-sm text-gray-400 italic font-medium leading-relaxed">
               &quot;{concept.logline}&quot;
             </p>
          </div>

          <div className="p-6 flex-1 space-y-6">
            <div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">The Narrative</h4>
              <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">{concept.synopsis}</p>
            </div>

            {/* Protagonist Block */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-white">{concept.protagonist.name}</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <span className="text-emerald-500 font-bold uppercase mr-1">Flaw:</span>
                {concept.protagonist.flaw}
              </p>
            </div>

            {/* Episodes Block */}
            <div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest flex items-center gap-2">
                <PlayCircle className="w-3 h-3" /> Featured Episodes
              </h4>
              <ul className="space-y-2">
                {/* 🛡️ Better check for episodes */}
                {concept.episodes && concept.episodes.length > 0 ? (
                  concept.episodes.slice(0, 3).map((ep: any, i: number) => (
                    <li key={i} className="text-[11px] text-gray-400 flex gap-2">
                      <span className="text-emerald-500 font-mono font-bold">0{i+1}</span>
                      <span className="truncate">{ep.title || ep.name || "Untitled Episode"}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[11px] text-gray-600 italic">No episode blueprints found in data.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="p-6 pt-0">
            <button
              onClick={() => onSelect?.(concept)}
              className="w-full py-3 bg-white hover:bg-emerald-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              Initialize Series
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
