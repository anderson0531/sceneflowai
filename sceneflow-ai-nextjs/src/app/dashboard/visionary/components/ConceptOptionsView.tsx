"use client";

import { motion } from 'framer-motion';
import { 
  Zap, 
  Film, 
  Dices, 
  ChevronRight, 
  User, 
  PlayCircle,
  Globe
} from 'lucide-react';
import { useStorylineGeneratorStore } from '@/store/useStorylineGeneratorStore';
import { useRouter } from 'next/navigation';

interface Episode {
  title: string;
  hook: string;
}

interface Concept {
  id: string;
  title: string;
  marketLogic: string;
  logline: string;
  synopsis: string;
  protagonist: {
    name: string;
    role: string;
    flaw: string;
  };
  episodes: Episode[];
  vibe: 'Spectacle' | 'Legend' | 'Chaos'; // To drive icon/color choice
}

interface ConceptOptionsViewProps {
  concepts: Concept[];
  onSelect?: (concept: Concept) => void;
}

export function ConceptOptionsView({ concepts, onSelect }: ConceptOptionsViewProps) {
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
      case 'Spectacle': return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: Zap }
      case 'Legend': return { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: Film }
      case 'Chaos': return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: Dices }
      default: return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Zap }
    }
  }

  return (
    <div className="space-y-8 py-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Select Your Series Blueprint</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          We’ve synthesized your market data into three distinct narrative directions. 
          Pick one to initialize your full Series Bible.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {concepts.map((concept, index) => {
          const styles = getVibeStyles(concept.vibe)
          const Icon = styles.icon

          return (
            <motion.div
              key={concept.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex flex-col h-full bg-gray-900/80 border ${styles.border} rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group`}
            >
              {/* Header section with safe access */}
              <div className={`p-6 ${styles.bg} border-b ${styles.border}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${styles.bg} border ${styles.border}`}>
                    <Icon className={`w-5 h-5 ${styles.color}`} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <Globe className="w-3 h-3" />
                    {/* 🛡️ DEFENSIVE GUARD: Check if marketLogic exists and is a string before splitting */}
                    {typeof concept.marketLogic === 'string' && concept.marketLogic.includes(':') 
                      ? concept.marketLogic.split(':')[0] 
                      : (concept.marketLogic || 'Global Target')}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {concept.title || "Untitled Concept"}
                </h3>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2 italic">
                  &quot;{concept.logline || "No logline provided."}&quot;
                </p>
              </div>

              {/* Body Section */}
              <div className="p-6 flex-1 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">The Narrative</h4>
                  <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">
                    {concept.synopsis}
                  </p>
                </div>

                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-white">{concept.protagonist.name}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    <span className="text-emerald-500/80">Flaw:</span> {concept.protagonist.flaw}
                  </p>
                </div>

                {/* Featured Episodes section with defensive guard */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wider flex items-center gap-2">
                    <PlayCircle className="w-3 h-3" /> Featured Episodes
                  </h4>
                  <ul className="space-y-2">
                    {/* 🛡️ DEFENSIVE GUARD: Ensure episodes is a valid array before slicing */}
                    {Array.isArray(concept.episodes) && concept.episodes.length > 0 ? (
                      concept.episodes.slice(0, 3).map((ep, i) => (
                        <li key={i} className="text-[11px] text-gray-400 flex gap-2">
                          <span className="text-emerald-500 font-mono">0{i+1}</span>
                          <span className="truncate">{ep?.title || "Untitled Episode"}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[11px] text-gray-500 italic">No episode blueprints generated.</li>
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
          )
        })}
      </div>
    </div>
  );
}
