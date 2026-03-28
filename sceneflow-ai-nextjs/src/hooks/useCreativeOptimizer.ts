"use client";

import { useState, useCallback } from 'react';
import { OptimizedCreative, MarketSelection } from '@/types/visionary';
import { generateText } from '@/lib/vertexai/gemini';
import { CREATIVE_OPTIMIZER_SYSTEM, buildCreativeOptimizerPrompt } from '@/lib/visionary/prompt-templates';
import { safeParseJSON } from '@/lib/utils/safeParseJSON';

export const useCreativeOptimizer = () => {
  const [optimizedCreative, setOptimizedCreative] = useState<OptimizedCreative | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCreative = useCallback(async (marketSelection: MarketSelection, marketData: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const prompt = buildCreativeOptimizerPrompt(marketSelection.originalConcept, marketData);
      const response = await generateText(prompt, {
        model: 'gemini-3.1-pro-preview',
        systemInstruction: CREATIVE_OPTIMIZER_SYSTEM,
        thinkingLevel: 'MEDIUM',
        maxOutputTokens: 4096,
      });

      const parsedResponse = safeParseJSON(response.text);
      if (parsedResponse) {
        setOptimizedCreative(parsedResponse);
      } else {
        throw new Error("Failed to parse creative optimization response.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { optimizedCreative, isLoading, error, generateCreative };
};
