"use client";

import { useState, useCallback, useRef } from 'react';
import { safeParseJSON } from '@/lib/utils/safeParseJSON';

export const useConceptGenerator = () => {
  const [concepts, setConcepts] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateConcepts = useCallback(async (report: any) => {
    setIsLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/visionary/generate-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        signal: abortControllerRef.current.signal,
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
      if (e.name !== 'AbortError') {
        setError(e.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setError(null);
    setConcepts(null);
  }, []);

  return { concepts, isLoading, error, generateConcepts, cancel };
};
