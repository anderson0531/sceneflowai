"use client";

import { useState, useCallback } from 'react';

export const useConceptGenerator = () => {
  const [concepts, setConcepts] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateConcepts = useCallback(async (report: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/visionary/generate-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setConcepts(data.concepts);
      } else {
        throw new Error(data.error || "Failed to generate concepts.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { concepts, isLoading, error, generateConcepts };
};
