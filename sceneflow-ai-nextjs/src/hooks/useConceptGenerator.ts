"use client";

import { useState } from 'react';
import type { VisionaryReport } from '@/lib/visionary/types';

export function useConceptGenerator() {
  const [concepts, setConcepts] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateConcepts = async (report: VisionaryReport) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/visionary/generate-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id }),
      });

      if (!res.ok) throw new Error('Failed to generate options');
      const data = await res.json();

      // 🛡️ HARDENING LAYER: Map potential AI key variations to UI keys
      const sanitized = (data.concepts || []).map((c: any) => ({
        ...c,
        id: c.id || Math.random().toString(36).substr(2, 9),
        title: c.title || c.conceptTitle || c.name || "Untitled Concept",
        logline: c.logline || "No logline provided.",
        synopsis: c.synopsis || c.narrative || c.description || "No narrative generated.",
        marketLogic: c.marketLogic || "GLOBAL",
        vibe: c.vibe || 'Spectacle',
        protagonist: {
          name: c.protagonist?.name || "The Visionary",
          role: c.protagonist?.role || "Lead",
          flaw: c.protagonist?.flaw || "No flaw defined"
        },
        episodes: Array.isArray(c.episodes) ? c.episodes : 
                  Array.isArray(c.featured_episodes) ? c.featured_episodes : []
      }));

      setConcepts(sanitized);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return { concepts, isLoading, error, generateConcepts };
}
