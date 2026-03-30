"use client";

import { useState } from 'react';
import type { VisionaryReport } from '@/lib/visionary/types'

export function useConceptGenerator() {
  const [concepts, setConcepts] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateConcepts = async (report: VisionaryReport) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/visionary/generate-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })

      if (!response.ok) throw new Error('Failed to generate options')
      const data = await response.json();

      if (data.concepts && Array.isArray(data.concepts)) {
        const hardenedConcepts = data.concepts.map((c: any) => ({
          ...c,
          id: c.id || Math.random().toString(36).substr(2, 9),
          vibe: c.vibe || 'Spectacle',
          marketLogic: typeof c.marketLogic === 'string' ? c.marketLogic : 'Global: Standard Opportunity',
          episodes: Array.isArray(c.episodes) ? c.episodes : [],
          protagonist: {
            name: c.protagonist?.name || 'The Visionary',
            role: c.protagonist?.role || 'Lead',
            flaw: c.protagonist?.flaw || 'Hidden conflict'
          }
        }));
        
        setConcepts(hardenedConcepts);
      }
    } catch (err) {
      setError("Failed to synthesize options.");
    } finally {
      setIsLoading(false);
    }
  }

  return { concepts, isLoading, error, generateConcepts }
}
