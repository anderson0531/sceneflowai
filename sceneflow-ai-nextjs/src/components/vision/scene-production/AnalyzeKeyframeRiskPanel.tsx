'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Loader2, Microscope, ChevronDown, ChevronUp } from 'lucide-react'

export interface AnalyzeKeyframeRiskPanelProps {
  startFrameUrl?: string | null
  endFrameUrl?: string | null
  promptExcerpt?: string
  className?: string
  /** Shown when user should prefer editing frames over rewriting the prompt */
  emphasizeImageHypothesis?: boolean
}

export function AnalyzeKeyframeRiskPanel({
  startFrameUrl,
  endFrameUrl,
  promptExcerpt = '',
  className = '',
  emphasizeImageHypothesis = false,
}: AnalyzeKeyframeRiskPanelProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null)

  const canRun = !!(startFrameUrl || endFrameUrl)

  const run = useCallback(async () => {
    if (!canRun) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/image/analyze-vertex-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startFrameUrl: startFrameUrl || undefined,
          endFrameUrl: endFrameUrl || undefined,
          promptExcerpt,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Request failed')
      }
      setAnalysis((data.analysis as Record<string, unknown>) || null)
      setOpen(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [canRun, startFrameUrl, endFrameUrl, promptExcerpt])

  const summary = analysis?.summary
  const triggers = analysis?.suspectedVisualTriggers
  const edits = analysis?.suggestedImageEdits
  const perFrame = analysis?.perFrame as Record<string, string> | undefined

  return (
    <div className={`rounded-lg border border-slate-600/80 bg-slate-900/40 p-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canRun || loading}
          onClick={run}
          className="border-indigo-500/50 text-indigo-200 hover:bg-indigo-950/50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Microscope className="w-4 h-4 mr-2" />
          )}
          Analyze keyframes (AI)
        </Button>
        {analysis && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {open ? 'Hide' : 'Show'} results
          </button>
        )}
      </div>
      {emphasizeImageHypothesis && (
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          Vertex reviews the full request (text + images). When the prompt is already mild, keyframes — especially the pair used for FTV — are often the real trigger. This scan suggests what to edit in the frames.
        </p>
      )}
      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
      {open && analysis && (
        <div className="mt-3 space-y-2 text-xs text-slate-200">
          {typeof summary === 'string' && summary && (
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
          )}
          {Array.isArray(triggers) && triggers.length > 0 && (
            <div>
              <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-1">Suspected visual triggers</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
                {triggers.map((t, i) => (
                  <li key={i}>{String(t)}</li>
                ))}
              </ul>
            </div>
          )}
          {perFrame && (perFrame.start || perFrame.end) && (
            <div>
              <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-1">Per frame</p>
              {perFrame.start && (
                <p className="text-slate-400">
                  <span className="text-slate-500">Start: </span>
                  {perFrame.start}
                </p>
              )}
              {perFrame.end && (
                <p className="text-slate-400">
                  <span className="text-slate-500">End: </span>
                  {perFrame.end}
                </p>
              )}
            </div>
          )}
          {Array.isArray(edits) && edits.length > 0 && (
            <div>
              <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-1">Suggested edits (use AI Edit on keyframes)</p>
              <ul className="list-decimal pl-4 space-y-0.5 text-indigo-200/90">
                {edits.map((t, i) => (
                  <li key={i}>{String(t)}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-700/80">
            Heuristic only — not an official Google safety verdict. False positives are common for FTV.
          </p>
        </div>
      )}
    </div>
  )
}
