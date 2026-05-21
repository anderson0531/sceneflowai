'use client'

import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import {
  BlueprintSectionAudioPlayer,
  type BlueprintSectionAudioPlayerStatus,
} from './BlueprintSectionAudioPlayer'
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
import { BLUEPRINT_REVIEW_SECTION_THEME } from '@/lib/blueprint/blueprintReviewTheme'

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div className="space-y-1">
      <div className="sf-review-field-label">{label}</div>
      <p className="sf-review-body">{value}</p>
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
  const fieldStack = sectionId === 'story' ? 'space-y-4' : 'space-y-3'

  switch (sectionId) {
    case 'core':
      return (
        <div className={fieldStack}>
          <ReadOnlyField label="Title" value={String(variant.title || '')} />
          {!omitLoglineInCore && (
            <ReadOnlyField label="Logline" value={String(variant.logline || '')} />
          )}
          <ReadOnlyField label="Genre" value={String(variant.genre || '')} />
          <ReadOnlyField label="Format" value={String(variant.format_length || '')} />
          <ReadOnlyField label="Target audience" value={String(variant.target_audience || '')} />
        </div>
      )
    case 'story':
      return (
        <div className={fieldStack}>
          <ReadOnlyField
            label="Synopsis"
            value={String(variant.synopsis || variant.content || '')}
          />
          <ReadOnlyField label="Setting" value={String(variant.setting || '')} />
          <ReadOnlyField label="Protagonist" value={String(variant.protagonist || '')} />
          <ReadOnlyField label="Antagonist" value={String(variant.antagonist || '')} />
        </div>
      )
    case 'characters': {
      const chars = normalizeCharacters(variant)
      if (chars.length === 0) {
        return <p className="sf-review-body-muted">No characters listed.</p>
      }
      return (
        <div className="space-y-4">
          {chars.map((c, i) => (
            <div
              key={i}
              className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-3 border-l-2 border-l-amber-500/40"
            >
              <div className="sf-review-body font-semibold text-white">
                {c.name || 'Character'}
                {c.role ? (
                  <span className="sf-review-body-muted font-normal"> — {c.role}</span>
                ) : null}
              </div>
              {c.description ? (
                <p className="sf-review-body mt-1">{c.description}</p>
              ) : null}
              {(c as { externalGoal?: string }).externalGoal ? (
                <p className="sf-review-body-muted mt-2">
                  <span className="sf-review-field-label normal-case tracking-normal">
                    Goal:{' '}
                  </span>
                  {(c as { externalGoal?: string }).externalGoal}
                </p>
              ) : null}
              {(c as { internalNeed?: string }).internalNeed ? (
                <p className="sf-review-body-muted">
                  <span className="sf-review-field-label normal-case tracking-normal">
                    Need:{' '}
                  </span>
                  {(c as { internalNeed?: string }).internalNeed}
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
        return <p className="sf-review-body-muted">No beats listed.</p>
      }
      return (
        <div className="space-y-3">
          {beats.map((b, i) => (
            <div
              key={i}
              className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-3"
            >
              <div className="text-base font-semibold text-white flex items-center gap-2">
                {b.title || `Beat ${i + 1}`}
                {b.minutes != null && b.minutes !== '' ? (
                  <span className="sf-review-body-muted font-normal">{b.minutes} min</span>
                ) : null}
              </div>
              {b.intent ? <p className="sf-review-body-muted mt-1">{b.intent}</p> : null}
              {b.synopsis ? <p className="sf-review-body mt-1">{b.synopsis}</p> : null}
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
        <div className={fieldStack}>
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
        </div>
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
  audioPlayerStatus?: BlueprintSectionAudioPlayerStatus
  allowTts?: boolean
  canFeedback: boolean
  feedback?: BlueprintFeedbackSection
  onFeedbackChange?: (next: BlueprintFeedbackSection) => void
  omitLoglineInCore?: boolean
  translationNarration?: string
}

export function BlueprintReviewSection({
  sectionId,
  title,
  variant,
  expanded,
  onToggle,
  audio,
  audioPlayerStatus,
  allowTts = true,
  canFeedback,
  feedback = {},
  onFeedbackChange,
  omitLoglineInCore,
  translationNarration,
}: Props) {
  const theme = BLUEPRINT_REVIEW_SECTION_THEME[sectionId]
  const SectionIcon = theme.Icon
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
      className={cn(
        'rounded-xl border border-slate-700/40 bg-slate-900/50 overflow-hidden scroll-mt-28',
        'border-l-4 shadow-lg shadow-black/20',
        theme.borderL
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r to-transparent',
          theme.headerGradient,
          theme.headerBorder
        )}
      >
        <button
          type="button"
          className="flex-1 flex items-center gap-2.5 text-left hover:bg-white/5 -mx-1 px-1 py-0.5 rounded-lg transition-colors"
          onClick={onToggle}
        >
          {expanded ? (
            <ChevronDown className={cn('h-5 w-5 shrink-0', theme.iconClass)} />
          ) : (
            <ChevronRight className={cn('h-5 w-5 shrink-0', theme.iconClass)} />
          )}
          <SectionIcon className={cn('h-4 w-4 shrink-0', theme.iconClass)} aria-hidden />
          <span className="sf-section-title">{title}</span>
          {canFeedback && feedback.score ? (
            <span className="text-xs font-medium text-amber-400/90 ml-1">{feedback.score}/5</span>
          ) : null}
        </button>
        {allowTts && (
          <BlueprintSectionAudioPlayer
            sectionId={sectionId}
            label="Listen"
            audio={audio}
            status={audioPlayerStatus}
            compact
          />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-4">
          {translationNarration?.trim() ? (
            <div className="rounded-lg border border-purple-500/25 bg-purple-500/8 px-3 py-3">
              <div className="sf-review-field-label text-purple-300/90 mb-1">
                Narration ({title})
              </div>
              <p className="sf-review-body">{translationNarration}</p>
            </div>
          ) : null}
          <SectionContent
            sectionId={sectionId}
            variant={variant}
            omitLoglineInCore={omitLoglineInCore}
          />

          {canFeedback && onFeedbackChange && (
            <div className="rounded-lg border border-purple-500/25 bg-purple-500/8 p-4 space-y-3">
              <p className="sf-section-title text-base text-purple-200/95">
                Your feedback on {title}
              </p>
              <div>
                <span className="sf-review-field-label">Rating</span>
                <div className="flex gap-1.5 mt-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScore(n)}
                      className={cn(
                        'w-9 h-9 rounded-md text-sm font-medium transition-colors',
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
