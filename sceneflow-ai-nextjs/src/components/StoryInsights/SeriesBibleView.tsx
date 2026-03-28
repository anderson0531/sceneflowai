"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { SeriesBible } from '@/types/visionary';
import { Button } from '@/components/ui/Button';
import { useStorylineGeneratorStore } from '@/store/useStorylineGeneratorStore';
import { Sparkles, User, MapPin } from 'lucide-react';

export const SeriesBibleView: React.FC<{ bible: SeriesBible; marketContext: any }> = ({ bible, marketContext }) => {
  const router = useRouter();
  const setSeriesGenerationInput = useStorylineGeneratorStore((state) => state.setSeriesGenerationInput);

  const handleStartSeries = () => {
    const seriesData = {
      title: bible.seriesTitle,
      concept: bible.synopsis,
      marketContext: marketContext,
    };
    
    setSeriesGenerationInput(seriesData);
    router.push('/dashboard/workflow/ideation'); // Redirect to the generator/ideation page
  };

  return (
    <div className="p-4 bg-slate-900/50 rounded-lg">
      {/* Hero Section */}
      <div className="text-center p-6 rounded-lg bg-gradient-to-b from-slate-800 to-slate-900/50 border border-white/10">
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Cinzel', serif" }}>{bible.seriesTitle}</h1>
        <p className="text-lg text-gray-300 italic">"{bible.logline}"</p>
      </div>

      <div className="mt-6 space-y-6">
        {/* Synopsis Section */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Synopsis</h2>
          <p className="text-base text-gray-400 leading-relaxed">{bible.synopsis}</p>
        </div>

        {/* Character & Setting Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Character Card */}
          <div className="bg-slate-800/70 p-4 rounded-lg border border-white/10">
            <h3 className="font-semibold text-white flex items-center gap-2"><User className="w-5 h-5 text-cyan-400" /> Protagonist</h3>
            <p className="text-lg font-bold mt-2">{bible.protagonist.name} - <span className="italic text-gray-300">{bible.protagonist.role}</span></p>
            <p className="text-sm text-gray-400 mt-1">{bible.protagonist.backstory}</p>
            <p className="text-sm text-amber-300 mt-2">Quirk: {bible.protagonist.trait}</p>
          </div>

          {/* Setting Card */}
          <div className="bg-slate-800/70 p-4 rounded-lg border border-white/10">
            <h3 className="font-semibold text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-purple-400" /> Setting</h3>
            <p className="text-lg font-bold mt-2">{bible.setting.locationName}</p>
            <p className="text-sm text-gray-400 mt-1">{bible.setting.description}</p>
            <p className="text-sm text-amber-300 mt-2">Atmosphere: {bible.setting.atmosphericNote}</p>
          </div>
        </div>

        {/* Format Style */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Format Style</h2>
          <p className="text-base text-gray-400">{bible.formatStyle}</p>
        </div>
      </div>

      {/* Action Button */}
      <Button size="lg" className="mt-8 w-full font-bold text-lg" onClick={handleStartSeries}>
        🚀 Start Series Production
      </Button>
    </div>
  );
};
