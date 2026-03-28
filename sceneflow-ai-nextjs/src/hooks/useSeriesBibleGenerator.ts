"use client";

import { useState, useCallback } from 'react';
import { SeriesBible, MarketSelection } from '@/types/visionary';
import { generateText } from '@/lib/vertexai/gemini';
import { buildSeriesBiblePrompt } from '@/lib/visionary/prompt-templates';
import { safeParseJSON } from '@/lib/utils/safeParseJSON';

export const useSeriesBibleGenerator = () => {
  const [seriesBible, setSeriesBible] = useState<SeriesBible | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBible = useCallback(async (marketSelection: MarketSelection) => {
    setIsLoading(true);
    setError(null);

    try {
      const prompt = buildSeriesBiblePrompt(marketSelection);
      const response = await generateText(prompt, {
        model: 'gemini-3.1-pro-preview',
        thinkingLevel: 'MEDIUM',
        maxOutputTokens: 8192,
      });

      const parsedResponse = safeParseJSON(response.text);
      if (parsedResponse) {
        setSeriesBible(parsedResponse);
      } else {
        throw new Error("Failed to parse series bible response.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { seriesBible, isLoading, error, generateBible };
};
