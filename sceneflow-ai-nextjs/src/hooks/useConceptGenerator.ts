"use client";

import { useState, useRef, useCallback } from 'react';
import type { VisionaryReport } from '@/lib/visionary/types'

export function useConceptGenerator() {
  const [concepts, setConcepts] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null);
  const [partialBible, setPartialBible] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateConcepts = useCallback(async (report: any) => {
    setIsLoading(true);
    setError(null);
    setPartialBible('');
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

      if (!response.body) {
        throw new Error("Streaming body not available.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value);
        setPartialBible(prev => prev + chunkText);
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setConcepts(null);
  }, []);

  return { concepts, isLoading, error, generateConcepts, cancel, partialBible };
};
