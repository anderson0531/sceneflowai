"use client";

import React from 'react';
import { SeriesBible } from '@/types/visionary';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Sparkles } from 'lucide-react';

export const SeriesBibleView: React.FC<{ bible: SeriesBible }> = ({ bible }) => {
  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 font-serif">{bible.seriesTitle}</h1>
        <p className="text-lg text-gray-300 italic">"{bible.logline}"</p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-white">Synopsis</h3>
          <p className="text-sm text-gray-400 mt-1">{bible.synopsis}</p>
        </div>
        <div>
          <h3 className="font-semibold text-white">Protagonist: {bible.protagonist.name} ({bible.protagonist.role})</h3>
          <p className="text-sm text-gray-400 mt-1">{bible.protagonist.backstory}</p>
        </div>
        <div>
          <h3 className="font-semibold text-white">Setting: {bible.setting.locationName}</h3>
          <p className="text-sm text-gray-400 mt-1">{bible.setting.description} ({bible.setting.atmosphericNote})</p>
        </div>
        <div>
          <h3 className="font-semibold text-white">Format Style</h3>
          <p className="text-sm text-gray-400 mt-1">{bible.formatStyle}</p>
        </div>
      </div>

      <Button size="lg" className="mt-6 w-full">
        Send to Storyline Generator
        <Sparkles className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};
