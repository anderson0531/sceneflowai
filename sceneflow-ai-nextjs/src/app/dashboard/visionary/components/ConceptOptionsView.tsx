"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Sparkles } from 'lucide-react';
import { useStorylineGeneratorStore } from '@/store/useStorylineGeneratorStore';
import { useRouter } from 'next/navigation';

export const ConceptOptionsView: React.FC<{ concepts: any[] }> = ({ concepts }) => {
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
    <div className="p-4">
      <h2 className="text-2xl font-bold text-white text-center mb-6">Choose Your Creative Angle</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {concepts.map((concept, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-slate-800/50 p-6 rounded-lg border border-white/10 flex flex-col"
          >
            <div className="flex-grow">
              <h3 className="text-xl font-bold text-white mb-2">{concept.seriesTitle}</h3>
              <p className="text-sm text-amber-300 mb-2">{concept.targetMarketLogic}</p>
              <p className="text-sm text-gray-400 italic mb-4">"{concept.logline}"</p>
              <p className="text-sm text-gray-300">{concept.synopsis}</p>
            </div>
            <Button size="lg" className="mt-6 w-full" onClick={() => handleSelectConcept(concept)}>
              Select Concept & Build Storyline
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
