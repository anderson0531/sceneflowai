'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import type { BlueprintFeedbackSections, BlueprintFixSection } from '@/lib/blueprint/shareTypes'

const SECTIONS: { id: BlueprintFixSection; label: string }[] = [
  { id: 'core', label: 'Core' },
  { id: 'story', label: 'Story' },
  { id: 'tone', label: 'Tone' },
  { id: 'beats', label: 'Beats' },
  { id: 'characters', label: 'Characters' },
]

type Props = {
  participantId: string
  reviewerName: string
  shareToken: string
  onSubmitted: () => void
}

export function BlueprintShareFeedbackForm({
  participantId,
  reviewerName,
  shareToken,
  onSubmitted,
}: Props) {
  const [overallScore, setOverallScore] = useState(0)
  const [sections, setSections] = useState<BlueprintFeedbackSections>({})
  const [freeformNotes, setFreeformNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const updateSection = (
    id: BlueprintFixSection,
    field: 'strengths' | 'concerns' | 'suggestions',
    value: string
  ) => {
    setSections((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(shareToken)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          reviewerName,
          overallScore: overallScore || undefined,
          sections,
          freeformNotes: freeformNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDone(true)
        onSubmitted()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="text-emerald-300 font-medium">Thanks — your notes were sent.</p>
        <p className="text-sm text-gray-400 mt-2">The project owner can review your feedback in Studio.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Your feedback</h3>
      <div>
        <label className="text-xs text-gray-400">Overall rating (optional)</label>
        <div className="flex gap-2 mt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setOverallScore(n)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${
                overallScore === n
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {SECTIONS.map((sec) => (
        <div key={sec.id} className="rounded-lg border border-gray-800 p-3 space-y-2">
          <div className="text-sm font-medium text-gray-200">{sec.label}</div>
          <Textarea
            placeholder="Strengths"
            value={sections[sec.id]?.strengths || ''}
            onChange={(e) => updateSection(sec.id, 'strengths', e.target.value)}
            rows={2}
            className="bg-gray-900 border-gray-700 text-sm"
          />
          <Textarea
            placeholder="Concerns"
            value={sections[sec.id]?.concerns || ''}
            onChange={(e) => updateSection(sec.id, 'concerns', e.target.value)}
            rows={2}
            className="bg-gray-900 border-gray-700 text-sm"
          />
          <Textarea
            placeholder="Suggestions"
            value={sections[sec.id]?.suggestions || ''}
            onChange={(e) => updateSection(sec.id, 'suggestions', e.target.value)}
            rows={2}
            className="bg-gray-900 border-gray-700 text-sm"
          />
        </div>
      ))}

      <Textarea
        placeholder="Anything else? (optional)"
        value={freeformNotes}
        onChange={(e) => setFreeformNotes(e.target.value)}
        rows={3}
        className="bg-gray-900 border-gray-700"
      />

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-purple-600 hover:bg-purple-500"
      >
        {submitting ? 'Sending…' : 'Submit feedback'}
      </Button>
    </div>
  )
}
