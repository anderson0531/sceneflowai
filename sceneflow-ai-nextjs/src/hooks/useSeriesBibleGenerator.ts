"use client";

import { useState, useCallback } from 'react';
import { SeriesBible, MarketSelection } from '@/types/visionary';

export const useSeriesBibleGenerator = () => {
  const [seriesBible, setSeriesBible] = useState<SeriesBible | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBible = useCallback(async (marketSelection: MarketSelection) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/visionary/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(marketSelection),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setSeriesBible(data.seriesBible);
      } else {
        throw new Error(data.error || "Failed to generate series bible.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { seriesBible, isLoading, error, generateBible };
};
