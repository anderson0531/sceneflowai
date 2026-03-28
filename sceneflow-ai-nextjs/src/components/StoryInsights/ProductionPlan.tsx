"use client";

import React from 'react';
import { OptimizedCreative } from '@/types/visionary';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Check } from 'lucide-react';

export const ProductionPlan: React.FC<{ creative: OptimizedCreative }> = ({ creative }) => {
  const planSteps = [
    {
      title: 'Creative Localization & Title A/B Testing',
      description: `Test variants of "${creative.optimizedTitle}" to maximize CTR in ${creative.targetMarket.region}.`
    },
    {
      title: `Script Adaptation for ${creative.targetMarket.language} Cultural Nuances`,
      description: creative.targetMarket.culturalAngle,
    },
    {
      title: 'Voiceover Alignment (Target Language)',
      description: `Voice tone: ${creative.localizationStrategy.voiceTone}.`
    },
    {
      title: 'Thumbnails & Metadata Localization',
      description: creative.productionFocus.thumbnailConcept,
    },
    {
      title: 'Multilingual Community Management Strategy',
      description: 'Prepare community engagement responses in the target language.'
    }
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-white mb-2">{creative.optimizedTitle}</h1>
      <p className="text-sm text-gray-400 mb-4">{creative.seriesHook}</p>
      
      <div className="space-y-4">
        {planSteps.map((step, index) => (
          <div key={index} className="bg-slate-800/50 p-4 rounded-lg border border-white/10">
            <h4 className="font-semibold text-white flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-400" />
              {step.title}
            </h4>
            <p className="text-sm text-gray-400 mt-1 pl-6">{step.description}</p>
          </div>
        ))}
      </div>

      <Button size="lg" className="mt-6 w-full">
        Start Production
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};
