'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Clock,
  Film,
  Image as ImageIcon,
  MapPin,
  Pause,
  Play,
  Sparkles,
  User,
  Volume2,
} from 'lucide-react'
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
  BlueprintBeatAudioMap,
  BlueprintFeedbackSection,
  BlueprintSectionAudioEntry,
} from '@/lib/blueprint/shareTypes'
import { BLUEPRINT_REVIEW_SECTION_THEME } from '@/lib/blueprint/blueprintReviewTheme'
import { BlueprintCoreContent } from '@/components/blueprint/BlueprintCoreContent'
import { BlueprintFieldCard } from '@/components/blueprint/BlueprintFieldCard'

interface NormalizedReviewBeat {
  title?: string
  eraOrAge?: string
  characters?: string[]
  synopsis?: string
  intent?: string
  impact?: string
  minutes?: number | string
  imageUrl?: string
  storyboardStillUrl?: string
  stillUrl?: string
  deliveryFormat?: string
  deliveryFormatHint?: string
  settingHint?: string
}

function normalizeBeats(variant: Record<string, unknown>): NormalizedReviewBeat[] {
  const beats = variant.beats as NormalizedReviewBeat[]
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
    impact?: string
    externalGoal?: string
    internalNeed?: string
    referenceImage?: string
    imageUrl?: string
    needsClientPhoto?: boolean
  }>
  if (Array.isArray(rich) && rich.length > 0) return rich
  const simple = variant.characters as Array<{
    name?: string
    role?: string
    description?: string
    impact?: string
    needsClientPhoto?: boolean
  }>
  return Array.isArray(simple) ? simple : []
}

function IllustratedBeatsList({
  beats,
  beatAudioMap,
  beatTranslationMap,
  allowTts,
}: {
  beats: NormalizedReviewBeat[]
  beatAudioMap?: BlueprintBeatAudioMap
  beatTranslationMap?: Record<string, string>
  allowTts?: boolean
}) {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null)
  const [sequenceMode, setSequenceMode] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playableIndices = beats
    .map((_, idx) => idx)
    .filter((idx) => Boolean(beatAudioMap?.[String(idx)]?.url))

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setPlayingIdx(null)
    setSequenceMode(false)
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  const playBeatAtIndex = (idx: number, autoAdvance: boolean) => {
    const entry = beatAudioMap?.[String(idx)]
    if (!entry?.url) return

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const el = new Audio(entry.url)
    audioRef.current = el
    setPlayingIdx(idx)
    setSequenceMode(autoAdvance)

    document
      .getElementById(`share-beat-card-${idx}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    el.onended = () => {
      if (autoAdvance) {
        const nextIdx = playableIndices.find((candidate) => candidate > idx)
        if (nextIdx !== undefined) {
          playBeatAtIndex(nextIdx, true)
          return
        }
      }
      setPlayingIdx(null)
      setSequenceMode(false)
    }

    el.onerror = () => {
      setPlayingIdx(null)
      setSequenceMode(false)
    }

    void el.play().catch(() => {
      setPlayingIdx(null)
      setSequenceMode(false)
    })
  }

  const toggleSingleBeat = (idx: number) => {
    if (playingIdx === idx) {
      stopAudio()
      return
    }
    playBeatAtIndex(idx, false)
  }

  const toggleStoryboardSequence = () => {
    if (sequenceMode && playingIdx !== null) {
      stopAudio()
      return
    }
    if (playableIndices.length > 0) {
      playBeatAtIndex(playableIndices[0]!, true)
    }
  }

  if (beats.length === 0) {
    return <p className="sf-review-body-muted">No beats listed.</p>
  }

  return (
    <div className="space-y-4">
      {allowTts && playableIndices.length > 0 && (
        <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/40 via-slate-900/70 to-slate-900/70 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-emerald-200">
            <Volume2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Narrated Storyboard Ready ({playableIndices.length}/{beats.length}{' '}
              {beats.length === 1 ? 'chapter' : 'chapters'})
            </span>
          </div>
          <button
            type="button"
            onClick={toggleStoryboardSequence}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              sequenceMode && playingIdx !== null
                ? 'bg-amber-500 text-gray-950 hover:bg-amber-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            )}
          >
            {sequenceMode && playingIdx !== null ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                Stop Storyboard
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Play Narrated Storyboard
              </>
            )}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {beats.map((b, i) => {
          const beatEra = typeof b.eraOrAge === 'string' ? b.eraOrAge.trim() : ''
          const beatImpact = typeof b.impact === 'string' ? b.impact.trim() : ''
          const beatSetting = typeof b.settingHint === 'string' ? b.settingHint.trim() : ''
          const beatImage = b.imageUrl || b.storyboardStillUrl || b.stillUrl || ''
          const formatRaw = b.deliveryFormat || b.deliveryFormatHint || ''
          const isArchival = formatRaw === 'archival_photo'
          const isAiVideo = formatRaw === 'ai_reenactment'
          const beatChars = Array.isArray(b.characters)
            ? b.characters.map((ch) => String(ch || '').trim()).filter(Boolean)
            : []
          const beatAudio = beatAudioMap?.[String(i)]
          const beatTrans = beatTranslationMap?.[String(i)]
          const isPlayingThis = playingIdx === i

          return (
            <div
              key={i}
              id={`share-beat-card-${i}`}
              className={cn(
                'rounded-xl border overflow-hidden transition-all',
                isPlayingThis
                  ? 'border-emerald-400/60 bg-emerald-950/20 ring-1 ring-emerald-400/30 shadow-lg shadow-emerald-950/30'
                  : 'border-emerald-500/15 bg-emerald-500/5'
              )}
            >
              {beatImage ? (
                <div className="relative w-full aspect-[16/9] max-h-72 bg-gray-950 border-b border-emerald-500/15 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beatImage}
                    alt={b.title || `Chapter ${i + 1}`}
                    className="h-full w-full object-cover object-center"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="rounded-full bg-black/65 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                      Chapter {i + 1}
                    </span>
                    {isArchival && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/80 backdrop-blur-md border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
                        <ImageIcon className="h-3 w-3" />
                        Archival Photo
                      </span>
                    )}
                    {isAiVideo && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-950/80 backdrop-blur-md border border-purple-400/30 px-2.5 py-0.5 text-[11px] font-medium text-purple-200">
                        <Film className="h-3 w-3" />
                        Cinematic Scene
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="px-4 py-3.5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-base font-semibold text-white flex flex-wrap items-center gap-2">
                    {!beatImage && (
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                        Ch. {i + 1}
                      </span>
                    )}
                    <span>{b.title || `Beat ${i + 1}`}</span>
                    {beatEra ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                        <Clock className="h-3 w-3" />
                        {beatEra}
                      </span>
                    ) : null}
                    {!beatImage && isArchival ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-200">
                        <ImageIcon className="h-3 w-3" />
                        Archival Photo
                      </span>
                    ) : null}
                    {!beatImage && isAiVideo ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-200">
                        <Film className="h-3 w-3" />
                        Cinematic Scene
                      </span>
                    ) : null}
                    {b.minutes != null && b.minutes !== '' ? (
                      <span className="sf-review-body-muted font-normal text-xs">
                        {b.minutes} min
                      </span>
                    ) : null}
                  </div>

                  {allowTts && beatAudio?.url ? (
                    <button
                      type="button"
                      onClick={() => toggleSingleBeat(i)}
                      className={cn(
                        'shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                        isPlayingThis
                          ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                          : 'border-slate-700 bg-slate-800/80 text-gray-200 hover:border-emerald-500/40'
                      )}
                    >
                      {isPlayingThis ? (
                        <>
                          <Pause className="h-3.5 w-3.5 text-emerald-300" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 text-emerald-400" />
                          Listen
                        </>
                      )}
                    </button>
                  ) : null}
                </div>

                {b.intent ? <p className="sf-review-body-muted">{b.intent}</p> : null}
                {b.synopsis ? <p className="sf-review-body">{b.synopsis}</p> : null}

                {beatImpact ? (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-300 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-300">Impact: </span>
                      {beatImpact}
                    </div>
                  </div>
                ) : null}

                {beatSetting ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400/80 shrink-0" />
                    <span>{beatSetting}</span>
                  </div>
                ) : null}

                {isPlayingThis && beatTrans ? (
                  <p className="text-xs text-purple-200/90 italic pt-1 border-t border-emerald-500/15">
                    {beatTrans}
                  </p>
                ) : null}

                {beatChars.length > 0 ? (
                  <div className="pt-2 border-t border-emerald-500/15 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300/90 mr-1">
                      Key Characters:
                    </span>
                    {beatChars.map((charName, cIdx) => (
                      <span
                        key={`${charName}-${cIdx}`}
                        className="inline-flex items-center gap-1 rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-200"
                      >
                        <User className="h-3 w-3 text-cyan-400" />
                        {charName}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionContent({
  sectionId,
  variant,
  omitLoglineInCore,
  omitTitleInCore,
  beatAudioMap,
  beatTranslationMap,
  allowTts,
  clientMode,
}: {
  sectionId: BlueprintFixSection
  variant: Record<string, unknown>
  omitLoglineInCore?: boolean
  omitTitleInCore?: boolean
  beatAudioMap?: BlueprintBeatAudioMap
  beatTranslationMap?: Record<string, string>
  allowTts?: boolean
  clientMode?: boolean
}) {
  const fieldStack = sectionId === 'story' ? 'space-y-4' : 'space-y-3'

  switch (sectionId) {
    case 'core':
      return (
        <BlueprintCoreContent
          variant={variant}
          omitTitleInCore={omitTitleInCore}
          omitLoglineInCore={omitLoglineInCore}
        />
      )
    case 'story':
      return (
        <div className={fieldStack}>
          <BlueprintFieldCard
            sectionId="story"
            label="Synopsis"
            value={String(variant.synopsis || variant.content || '')}
          />
          <BlueprintFieldCard sectionId="story" label="Setting" value={String(variant.setting || '')} />
          <BlueprintFieldCard
            sectionId="story"
            label="Protagonist"
            value={String(variant.protagonist || '')}
          />
          <BlueprintFieldCard
            sectionId="story"
            label="Antagonist"
            value={String(variant.antagonist || '')}
          />
        </div>
      )
    case 'characters': {
      const chars = normalizeCharacters(variant)
      const scenes = Array.isArray(variant.scene_descriptions)
        ? (variant.scene_descriptions as Array<{
            name?: string
            type?: string
            location?: string
            description?: string
            atmosphere?: string
            furniture_props?: string
            needsClientPhoto?: boolean
          }>)
        : []
      const props = Array.isArray(variant.prop_descriptions)
        ? (variant.prop_descriptions as Array<{
            name?: string
            category?: string
            description?: string
            significance?: string
            needsClientPhoto?: boolean
          }>)
        : []
      if (chars.length === 0 && scenes.length === 0 && props.length === 0) {
        return <p className="sf-review-body-muted">No continuity assets listed.</p>
      }
      return (
        <div className="space-y-5">
          {chars.length > 0 && (
            <div className="space-y-3">
              <div className="sf-review-field-label text-amber-300/90">Cast ({chars.length})</div>
              {chars.map((c, i) => {
                const portrait =
                  (c as { referenceImage?: string; imageUrl?: string }).referenceImage ||
                  (c as { imageUrl?: string }).imageUrl
                const impact = (c as { impact?: string }).impact
                const needsPhoto = Boolean((c as { needsClientPhoto?: boolean }).needsClientPhoto)
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3.5 py-3 border-l-2 border-l-amber-500/40 flex items-start gap-3"
                  >
                    {portrait ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={portrait}
                        alt={c.name || 'Character'}
                        className="h-14 w-14 rounded-lg object-cover border border-amber-500/30 shrink-0"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="sf-review-body font-semibold text-white">
                          {c.name || 'Character'}
                          {c.role ? (
                            <span className="sf-review-body-muted font-normal"> — {c.role}</span>
                          ) : null}
                        </div>
                        {clientMode && needsPhoto && !portrait && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
                            <Camera className="h-3 w-3" />
                            Photo Requested After Approval
                          </span>
                        )}
                      </div>
                      {c.description ? (
                        <p className="sf-review-body mt-1">{c.description}</p>
                      ) : null}
                      {impact ? (
                        <p className="text-xs text-amber-200/90 mt-1.5">
                          <span className="font-semibold text-amber-300">Impact: </span>
                          {impact}
                        </p>
                      ) : null}
                      {(c as { externalGoal?: string }).externalGoal ? (
                        <p className="sf-review-body-muted mt-1.5">
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
                  </div>
                )
              })}
            </div>
          )}

          {scenes.length > 0 && (
            <div className="space-y-3">
              <div className="sf-review-field-label text-emerald-300/90">
                Locations ({scenes.length})
              </div>
              {scenes.map((loc, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3.5 py-3 border-l-2 border-l-emerald-500/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="sf-review-body font-semibold text-white">
                      {loc.name || 'Location'}
                      {loc.type ? (
                        <span className="sf-review-body-muted font-normal"> ({loc.type})</span>
                      ) : null}
                    </div>
                    {clientMode && loc.needsClientPhoto && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
                        <Camera className="h-3 w-3" />
                        Reference Photo Optional
                      </span>
                    )}
                  </div>
                  {loc.location || loc.description ? (
                    <p className="sf-review-body mt-1">{loc.location || loc.description}</p>
                  ) : null}
                  {loc.atmosphere ? (
                    <p className="sf-review-body-muted mt-1">
                      <span className="sf-review-field-label normal-case tracking-normal">
                        Atmosphere:{' '}
                      </span>
                      {loc.atmosphere}
                    </p>
                  ) : null}
                  {loc.furniture_props ? (
                    <p className="sf-review-body-muted">
                      <span className="sf-review-field-label normal-case tracking-normal">
                        Props:{' '}
                      </span>
                      {loc.furniture_props}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {props.length > 0 && (
            <div className="space-y-3">
              <div className="sf-review-field-label text-cyan-300/90">Props ({props.length})</div>
              {props.map((prop, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-3.5 py-3 border-l-2 border-l-cyan-500/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="sf-review-body font-semibold text-white">
                      {prop.name || 'Prop'}
                      {prop.category ? (
                        <span className="sf-review-body-muted font-normal"> — {prop.category}</span>
                      ) : null}
                    </div>
                    {clientMode && prop.needsClientPhoto && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-medium text-cyan-200">
                        <Camera className="h-3 w-3" />
                        Photo Requested After Approval
                      </span>
                    )}
                  </div>
                  {prop.description ? (
                    <p className="sf-review-body mt-1">{prop.description}</p>
                  ) : null}
                  {prop.significance ? (
                    <p className="sf-review-body-muted mt-1">
                      <span className="sf-review-field-label normal-case tracking-normal">
                        Significance:{' '}
                      </span>
                      {prop.significance}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    case 'beats': {
      const beats = normalizeBeats(variant)
      return (
        <IllustratedBeatsList
          beats={beats}
          beatAudioMap={beatAudioMap}
          beatTranslationMap={beatTranslationMap}
          allowTts={allowTts}
        />
      )
    }
    case 'tone': {
      const themes = Array.isArray(variant.themes)
        ? (variant.themes as string[]).join(', ')
        : String(variant.themes || '')
      return (
        <div className={fieldStack}>
          <BlueprintFieldCard sectionId="tone" label="Tone" value={String(variant.tone || '')} />
          <BlueprintFieldCard
            sectionId="tone"
            label="Tone description"
            value={String(variant.tone_description || '')}
          />
          <BlueprintFieldCard sectionId="tone" label="Style" value={String(variant.style || '')} />
          <BlueprintFieldCard
            sectionId="tone"
            label="Art style"
            value={String(variant.artStyle || variant.visual_style || '')}
          />
          <BlueprintFieldCard
            sectionId="tone"
            label="Aspect ratio"
            value={String(variant.aspectRatio || '16:9')}
          />
          <BlueprintFieldCard sectionId="tone" label="Themes" value={themes} />
          {Array.isArray(variant.mood_references) && variant.mood_references.length > 0 ? (
            <BlueprintFieldCard
              sectionId="tone"
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
  beatAudioMap?: BlueprintBeatAudioMap
  beatTranslationMap?: Record<string, string>
  audioPlayerStatus?: BlueprintSectionAudioPlayerStatus
  allowTts?: boolean
  clientMode?: boolean
  canFeedback: boolean
  feedback?: BlueprintFeedbackSection
  onFeedbackChange?: (next: BlueprintFeedbackSection) => void
  omitLoglineInCore?: boolean
  omitTitleInCore?: boolean
  translationNarration?: string
}

export function BlueprintReviewSection({
  sectionId,
  title,
  variant,
  expanded,
  onToggle,
  audio,
  beatAudioMap,
  beatTranslationMap,
  audioPlayerStatus,
  allowTts = true,
  clientMode = false,
  canFeedback,
  feedback = {},
  onFeedbackChange,
  omitLoglineInCore,
  omitTitleInCore,
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
          <span className={cn('sf-section-title', theme.iconClass)}>{title}</span>
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
            omitTitleInCore={omitTitleInCore}
            beatAudioMap={beatAudioMap}
            beatTranslationMap={beatTranslationMap}
            allowTts={allowTts}
            clientMode={clientMode}
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
