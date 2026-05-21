'use client'

import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { BlueprintSectionAudioPlayer } from './BlueprintSectionAudioPlayer'
import {
  chipsForSection,
  applyChipToSection,
  type FeedbackChip,
} from '@/lib/blueprint/feedbackChips'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import type {
  BlueprintFeedbackSection,
  BlueprintSectionAudioEntry,
} from '@/lib/blueprint/shareTypes'

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  )
}

function normalizeBeats(variant: Record<string, unknown>) {
  const beats = variant.beats as Array<{
    title?: string
    synopsis?: string
    intent?: string
    minutes?: number | string
  }>
  if (Array.isArray(beats) && beats.length > 0) return beats
  const outline = variant.beat_outline as Array<{ beat_title?: string; beat_description?: string }>
  if (Array.isArray(outline)) {
    return outline.map((b) => ({ title: b.beat_title, synopsis: b.beat_description }))
  }
  return []
}

function normalizeCharacters(variant: Record<string, unknown>) {
  const rich = variant.character_descriptions as Array<{
    name?: string
    role?: string
    description?: string
    externalGoal?: string
    internalNeed?: string
  }>
  if (Array.isArray(rich) && rich.length > 0) return rich
  const simple = variant.characters as Array<{ name?: string; role?: string; description?: string }>
  return Array.isArray(simple) ? simple : []
}

function SectionContent({
  sectionId,
  variant,
  omitLoglineInCore,
}: {
  sectionId: BlueprintFixSection
  variant: Record<string, unknown>
  omitLoglineInCore?: boolean
}) {
  switch (sectionId) {
    case 'core':
      return (
        <>
          <ReadOnlyField label="Title" value={String(variant.title || '')} />
          {!omitLoglineInCore && (
            <ReadOnlyField label="Logline" value={String(variant.logline || '')} />
          )}
          <ReadOnlyField label="Genre" value={String(variant.genre || '')} />
          <ReadOnlyField label="Format" value={String(variant.format_length || '')} />
          <ReadOnlyField label="Target audience" value={String(variant.target_audience || '')} />
        </>
      )
    case 'story':
      return (
        <>
          <ReadOnlyField
            label="Synopsis"
            value={String(variant.synopsis || variant.content || '')}
          />
          <ReadOnlyField label="Setting" value={String(variant.setting || '')} />
          <ReadOnlyField label="Protagonist" value={String(variant.protagonist || '')} />
          <ReadOnlyField label="Antagonist" value={String(variant.antagonist || '')} />
        </>
      )
    case 'characters': {
      const chars = normalizeCharacters(variant)
      if (chars.length === 0) {
        return <p className="text-sm text-gray-500">No characters listed.</p>
      }
      return (
        <div className="space-y-3">
          {chars.map((c, i) => (
            <div key={i} className="text-sm border-l-2 border-slate-700 pl-3">
              <div className="font-medium text-gray-200">
                {c.name || 'Character'}
                {c.role ? <span className="text-gray-500 font-normal"> — {c.role}</span> : null}
              </div>
              {c.description ? <p className="text-gray-400 mt-0.5">{c.description}</p> : null}
              {(c as { externalGoal?: string }).externalGoal ? (
                <p className="text-gray-500 text-xs mt-1">
                  Goal: {(c as { externalGoal?: string }).externalGoal}
                </p>
              ) : null}
              {(c as { internalNeed?: string }).internalNeed ? (
                <p className="text-gray-500 text-xs">
                  Need: {(c as { internalNeed?: string }).internalNeed}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )
    }
    case 'beats': {
      const beats = normalizeBeats(variant)
      if (beats.length === 0) {
        return <p className="text-sm text-gray-500">No beats listed.</p>
      }
      return (
        <div className="space-y-2">
          {beats.map((b, i) => (
            <div key={i} className="text-sm rounded-lg bg-slate-800/40 px-3 py-2">
              <div className="text-gray-200 font-medium flex items-center gap-2">
                {b.title || `Beat ${i + 1}`}
                {b.minutes != null && b.minutes !== '' ? (
                  <span className="text-[10px] text-gray-500 font-normal">{b.minutes} min</span>
                ) : null}
              </div>
              {b.intent ? <p className="text-xs text-purple-400/80 mt-0.5">{b.intent}</p> : null}
              {b.synopsis ? <p className="text-gray-400 mt-0.5">{b.synopsis}</p> : null}
            </div>
          ))}
        </div>
      )
    }
    case 'tone': {
      const themes = Array.isArray(variant.themes)
        ? (variant.themes as string[]).join(', ')
        : String(variant.themes || '')
      return (
        <>
          <ReadOnlyField label="Tone" value={String(variant.tone || '')} />
          <ReadOnlyField label="Tone description" value={String(variant.tone_description || '')} />
          <ReadOnlyField label="Style" value={String(variant.style || '')} />
          <ReadOnlyField label="Visual style" value={String(variant.visual_style || '')} />
          <ReadOnlyField label="Themes" value={themes} />
          {Array.isArray(variant.mood_references) && variant.mood_references.length > 0 ? (
            <ReadOnlyField
              label="Mood references"
              value={(variant.mood_references as string[]).join(', ')}
            />
          ) : null}
        </>
      )
    }
    default:
      return null
  }
}

type Props = {
  sectionId: BlueprintFixSection
  title: string
  variant: Record<string, unknown>
  expanded: boolean
  onToggle: () => void
  audio?: BlueprintSectionAudioEntry | null
  allowTts?: boolean
  canFeedback: boolean
  feedback?: BlueprintFeedbackSection
  onFeedbackChange?: (next: BlueprintFeedbackSection) => void
  omitLoglineInCore?: boolean
}

export function BlueprintReviewSection({
  sectionId,
  title,
  variant,
  expanded,
  onToggle,
  audio,
  allowTts = true,
  canFeedback,
  feedback = {},
  onFeedbackChange,
  omitLoglineInCore,
}: Props) {
  const chips = chipsForSection(sectionId)
  const selectedTags = new Set(feedback.tags || [])

  const toggleChip = (chip: FeedbackChip) => {
    if (!onFeedbackChange) return
    const isOn = selectedTags.has(chip.id)
    onFeedbackChange(applyChipToSection(feedback, chip, !isOn))
  }

  const setScore = (n: number) => {
    onFeedbackChange?.({ ...feedback, score: n })
  }

  return (
    <section
      id={`section-${sectionId}`}
      className="rounded-xl border border-slate-700/50 bg-slate-900/40 overflow-hidden scroll-mt-24"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/60">
        <button
          type="button"
          className="flex-1 flex items-center gap-2 text-left text-sm font-medium text-gray-200 hover:bg-slate-800/50 -mx-1 px-1 py-0.5 rounded"
          onClick={onToggle}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
          )}
          {title}
          {canFeedback && feedback.score ? (
            <span className="text-xs text-amber-400/90 ml-1">{feedback.score}/5</span>
          ) : null}
        </button>
        {allowTts && (
          <BlueprintSectionAudioPlayer
            sectionId={sectionId}
            label="Listen"
            audio={audio}
            compact
          />
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-4">
          <div className="space-y-2 pt-1">
            <SectionContent
              sectionId={sectionId}
              variant={variant}
              omitLoglineInCore={omitLoglineInCore}
            />
          </div>

          {canFeedback && onFeedbackChange && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 space-y-3">
              <p className="text-xs font-medium text-purple-300/90">Your feedback on {title}</p>
              <div>
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Rating</span>
                <div className="flex gap-1.5 mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScore(n)}
                      className={cn(
                        'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                        feedback.score === n
                          ? 'bg-amber-500 text-gray-950'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => {
                  const on = selectedTags.has(chip.id)
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => toggleChip(chip)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                        on
                          ? 'bg-purple-600/30 border-purple-500/50 text-purple-200'
                          : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:border-gray-600'
                      )}
                    >
                      {chip.label}
                    </button>
                  )
                })}
              </div>
              <Textarea
                placeholder="Notes for this section (optional)"
                value={feedback.suggestions || ''}
                onChange={(e) =>
                  onFeedbackChange({ ...feedback, suggestions: e.target.value })
                }
                rows={2}
                className="bg-gray-900 border-gray-700 text-sm"
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
