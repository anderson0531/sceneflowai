"use client";

import React, { useState } from 'react';
import { Globe, Languages, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { marketOutlookData } from '@/data/market-outlook';

const ConceptCard = ({ concept, onSelect }) => (
  <div className="bg-slate-800/50 p-4 rounded-lg border border-white/10 flex flex-col justify-between">
    <div>
      <h4 className="text-lg font-bold text-white">{concept.title}</h4>
      <p className="mt-2 text-sm text-gray-400">{concept.description}</p>
    </div>
    <Button size="sm" className="mt-4 w-full" onClick={() => onSelect(concept)}>
      Select Market
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  </div>
);

export const MarketOutlook = ({ onMarketSelect }) => {
  const [region, setRegion] = useState('global');
  const [language, setLanguage] = useState('en');

  const concepts = marketOutlookData(region, language);

  return (
    <div className="p-4">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Globe className="w-6 h-6 text-blue-400" />
          Market Outlook
        </h3>
        <p className="text-sm text-gray-400 mt-1">Popular concepts to kickstart your next series.</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="w-1/2">
          <label className="text-sm font-medium text-gray-300">Region</label>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global</SelectItem>
              <SelectItem value="na">North America</SelectItem>
              <SelectItem value="eu">Europe</SelectItem>
              <SelectItem value="as">Asia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-1/2">
          <label className="text-sm font-medium text-gray-300">Language</label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          Trending Concepts
        </h4>
        <div className="grid grid-cols-1 gap-4">
          {concepts.map(concept => (
            <ConceptCard key={concept.id} concept={concept} onSelect={onMarketSelect} />
          ))}
        </div>
      </div>
    </div>
  );
};
