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
      const data = await response.json()

      // 🛡️ HARDENING LAYER: Map potential AI key variations to UI keys
      const sanitized = (data.concepts || []).map((c: any) => ({
        ...c,
        id: c.id || Math.random().toString(36).substr(2, 9),
        title: c.title || c.seriesTitle || "Untitled Concept",
        episodes: Array.isArray(c.featuredEpisodes) ? c.featuredEpisodes : 
                  Array.isArray(c.episodes) ? c.episodes : [],
        marketLogic: c.marketLogic || c.targetMarketLogic || "Global",
        protagonist: {
          name: c.protagonist?.name || "Unknown",
          role: c.protagonist?.role || "Lead",
          flaw: c.protagonist?.flaw || "No flaw defined"
        }
      }))

      setConcepts(sanitized)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return { concepts, isLoading, error, generateConcepts }
}
