"use client";

import { motion } from 'framer-motion';
import { PlayCircle, Globe, User, ChevronRight } from 'lucide-react';
import { useStorylineGeneratorStore } from '@/store/useStorylineGeneratorStore';
import { useRouter } from 'next/navigation';

export function ConceptOptionsView({ concepts, onSelect }: any) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
      {concepts.map((concept: any) => (
        <div key={concept.id} className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-emerald-500/5 border-b border-gray-800">
             <div className="flex justify-between items-center mb-4">
               <div className="p-2 bg-emerald-500/10 rounded-lg">
                 <Globe className="w-4 h-4 text-emerald-500" />
               </div>
               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                 {concept.marketLogic}
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

          <div className="p-6 pt-0">
             <button onClick={() => onSelect?.(concept)} className="w-full py-3 bg-white hover:bg-emerald-500 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
               Initialize Series <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </div>
      ))}
    </div>
  );
}
