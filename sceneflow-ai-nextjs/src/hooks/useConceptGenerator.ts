"use client";

import { useState, useRef, useCallback } from 'react';

export function useConceptGenerator() {
  const [concepts, setConcepts] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateConcepts = useCallback(async (report: any) => {
    setIsLoading(true);
    setError(null);
    setConcepts(null);
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
      if (!data?.success || !Array.isArray(data?.concepts)) {
        throw new Error(data?.error || 'Failed to parse concept generation response.');
      }
      setConcepts(data.concepts);

    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setConcepts(null);
    setIsLoading(false);
  }, []);

  return { concepts, isLoading, error, generateConcepts, cancel };
};
