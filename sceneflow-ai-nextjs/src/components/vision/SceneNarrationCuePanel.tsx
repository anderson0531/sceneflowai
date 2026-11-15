'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Film,
  Globe,
  Loader2,
  MessageSquare,
  Mic,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  User,
  Volume2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import {
  resolveDialogueTtsVoice,
  type DialogueTtsCharacter,
} from '@/lib/character/dialogueTtsVoice'
import {
  applySceneNarrationCues,
  beatHasOnCameraDialogue,
  buildNarrationCueId,
  estimateNarrationWordsDurationSec,
  formatNarrationCueRange,
  getNarrationCueLanguages,
  getSceneNarrationCues,
  isNarrationCueAudioStale,
} from '@/lib/script/sceneNarrationCues'
import {
  NARRATOR_CHARACTER,
  type NarrationAlignmentMode,
  type SceneBeat,
  type SceneNarrationCue,
} from '@/lib/script/segmentTypes'
import { cn } from '@/lib/utils'

export interface SceneNarrationCuePanelProps {
  projectId?: string
  sceneId?: string
  sceneIndex?: number
  isPromo?: boolean
  scene: Record<string, unknown>
  beats: SceneBeat[]
  characters?: DialogueTtsCharacter[]
  narrationVoice?: unknown
  activeLanguage?: string
  onActiveLanguageChange?: (lang: string) => void
  availableLanguages?: string[]
  onSceneUpdated?: (updatedScene: Record<string, unknown>) => void | Promise<void>
  compact?: boolean
}

const ALIGNMENT_MODE_OPTIONS: Array<{
  value: NarrationAlignmentMode
  label: string
  hint: string
}> = [
  {
    value: 'flow',
    label: 'Natural Flow',
    hint: 'Plays across the shot span; holds final frame if VO runs longer',
  },
  {
    value: 'intro-freeze',
    label: 'Intro Freeze',
    hint: 'Freezes Frame 0 during opening narration before clip motion begins',
  },
  {
    value: 'outro-freeze',
    label: 'Close Freeze',
    hint: 'Holds the closing frame with a subtle push while narration concludes',
  },
  {
    value: 'slow-mo-fit',
    label: 'Slow-Mo Fit',
    hint: 'Stretches clip motion smoothly (down to 0.6x) to match narration length',
  },
  {
    value: 'manual',
    label: 'Manual (Mixer)',
    hint: 'Controlled solely by per-shot pacing sliders in the Mixer',
  },
]

function languageDisplayName(code: string): string {
  const clean = code.trim().toLowerCase()
  const match = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === clean)
  return match?.name || clean.toUpperCase()
}

function extractVoiceIdFromConfig(voiceConfig: unknown): string | undefined {
  if (!voiceConfig || typeof voiceConfig !== 'object') return undefined
  const rec = voiceConfig as Record<string, unknown>
  for (const key of ['voiceId', 'googleVoiceId', 'providerVoiceId', 'id']) {
    if (typeof rec[key] === 'string' && (rec[key] as string).trim()) {
      return (rec[key] as string).trim()
    }
  }
  return undefined
}

function resolveSpanDurationSec(beats: SceneBeat[], beatStart: number, beatEnd: number): number {
  if (beats.length === 0) return 5
  let sum = 0
  const s = Math.max(0, Math.min(beats.length - 1, beatStart))
  const e = Math.max(s, Math.min(beats.length - 1, beatEnd))
  for (let i = s; i <= e; i++) {
    sum += Math.max(1, beats[i]?.durationSeconds ?? 5)
  }
  return Math.round(sum * 10) / 10
}

export function SceneNarrationCuePanel({
  projectId,
  sceneId,
  sceneIndex,
  isPromo = false,
  scene,
  beats,
  characters = [],
  narrationVoice,
  activeLanguage,
  onActiveLanguageChange,
  availableLanguages = [],
  onSceneUpdated,
  compact = false,
}: SceneNarrationCuePanelProps) {
  const derivedCues = useMemo(
    () =>
      getSceneNarrationCues({
        ...scene,
        beats,
      }),
    [scene, beats]
  )

  const [draftCues, setDraftCues] = useState<SceneNarrationCue[]>(derivedCues)
  const [isDirty, setIsDirty] = useState(false)
  const [internalLang, setInternalLang] = useState<string>(
    () => activeLanguage?.trim().toLowerCase() || 'en'
  )
  const [extraLanguages, setExtraLanguages] = useState<string[]>([])
  const [directorSpeakerKey, setDirectorSpeakerKey] = useState<string>('narrator')
  const [directorNotes, setDirectorNotes] = useState<string>('')
  const [showDirectorOptions, setShowDirectorOptions] = useState<boolean>(false)
  const [isDirecting, setIsDirecting] = useState<boolean>(false)
  const [isSynthesizingAll, setIsSynthesizingAll] = useState<boolean>(false)
  const [synthesizingCueId, setSynthesizingCueId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null)
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null)
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null)

  const currentLang = (activeLanguage?.trim().toLowerCase() || internalLang || 'en')

  useEffect(() => {
    if (activeLanguage && activeLanguage.trim().toLowerCase() !== internalLang) {
      setInternalLang(activeLanguage.trim().toLowerCase())
    }
  }, [activeLanguage, internalLang])

  // Sync draft cues from scene when external updates arrive (unless user is mid-edit)
  const serializedServerCues = useMemo(() => JSON.stringify(derivedCues), [derivedCues])
  const lastServerSnapshotRef = useRef<string>(serializedServerCues)
  useEffect(() => {
    if (serializedServerCues !== lastServerSnapshotRef.current) {
      lastServerSnapshotRef.current = serializedServerCues
      setDraftCues(derivedCues)
      setIsDirty(false)
    }
  }, [derivedCues, serializedServerCues])

  useEffect(() => {
    return () => {
      audioPreviewRef.current?.pause()
      audioPreviewRef.current = null
    }
  }, [])

  const languageTabs = useMemo(() => {
    const cueLangs = getNarrationCueLanguages(
      { ...scene, sceneNarrationCues: draftCues, beats },
      { requireAudio: false }
    )
    const merged = Array.from(
      new Set(
        [
          'en',
          currentLang,
          ...availableLanguages.map((l) => l.trim().toLowerCase()),
          ...cueLangs,
          ...extraLanguages,
        ].filter(Boolean)
      )
    )
    return merged
  }, [scene, draftCues, beats, currentLang, availableLanguages, extraLanguages])

  const castSpeakers = useMemo(() => {
    const list: Array<{
      key: string
      speakerType: 'narrator' | 'character'
      characterId?: string
      characterName: string
      voiceBadge?: string
    }> = [
      {
        key: 'narrator',
        speakerType: 'narrator',
        characterName: NARRATOR_CHARACTER,
        voiceBadge: extractVoiceIdFromConfig(narrationVoice) || 'Narrator Voice',
      },
    ]

    for (const c of characters) {
      const name = typeof c?.name === 'string' ? c.name.trim() : ''
      if (!name || name.toUpperCase() === 'NARRATOR') continue
      const id = typeof c?.id === 'string' && c.id.trim() ? c.id.trim() : name.toLowerCase()
      const resolved = resolveDialogueTtsVoice({
        characters,
        characterId: id,
        characterName: name,
        kind: 'dialogue',
        narrationVoice: narrationVoice as DialogueTtsCharacter['voiceConfig'],
      })
      const vId = extractVoiceIdFromConfig(resolved.voiceConfig)
      list.push({
        key: `char:${id}`,
        speakerType: 'character',
        characterId: id,
        characterName: name,
        voiceBadge: vId ? 'Matched Voice' : 'Auto Voice',
      })
    }
    return list
  }, [characters, narrationVoice])

  const handleSelectLanguage = useCallback(
    (lang: string) => {
      const normalized = lang.trim().toLowerCase() || 'en'
      setInternalLang(normalized)
      onActiveLanguageChange?.(normalized)
    },
    [onActiveLanguageChange]
  )

  const handleTogglePlay = useCallback((url?: string) => {
    if (!url) return
    if (playingAudioUrl === url && audioPreviewRef.current) {
      audioPreviewRef.current.pause()
      audioPreviewRef.current = null
      setPlayingAudioUrl(null)
      return
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause()
    }
    const audio = new Audio(url)
    audioPreviewRef.current = audio
    setPlayingAudioUrl(url)
    audio.onended = () => {
      setPlayingAudioUrl(null)
    }
    audio.onerror = () => {
      setPlayingAudioUrl(null)
      toast.error('Could not play narration cue audio')
    }
    void audio.play().catch(() => {
      setPlayingAudioUrl(null)
    })
  }, [playingAudioUrl])

  const commitUpdatedCuesLocally = useCallback(
    async (nextCues: SceneNarrationCue[], serverSavedScene?: Record<string, unknown>) => {
      setDraftCues(nextCues)
      setIsDirty(false)
      const nextScene = serverSavedScene
        ? {
            ...scene,
            ...serverSavedScene,
            sceneNarrationCues: nextCues,
            narrationCuesAuthoritative: true,
          }
        : applySceneNarrationCues(scene, nextCues)
      lastServerSnapshotRef.current = JSON.stringify(nextCues)
      await onSceneUpdated?.(nextScene)
    },
    [scene, onSceneUpdated]
  )

  const updateCueAt = useCallback(
    (cueId: string, updater: (prev: SceneNarrationCue) => SceneNarrationCue) => {
      setDraftCues((prev) =>
        prev.map((c) => {
          if (c.cueId !== cueId) return c
          const updated = updater(c)
          const clampedStart = Math.max(
            0,
            Math.min(Math.max(0, beats.length - 1), updated.beatStart)
          )
          const clampedEnd = Math.max(
            clampedStart,
            Math.min(Math.max(0, beats.length - 1), updated.beatEnd)
          )
          const anchorBeatIds = beats
            .slice(clampedStart, clampedEnd + 1)
            .map((b) => b.beatId)
            .filter(Boolean)
          return {
            ...updated,
            beatStart: clampedStart,
            beatEnd: clampedEnd,
            anchorBeatIds,
            updatedAt: new Date().toISOString(),
          }
        })
      )
      setIsDirty(true)
    },
    [beats]
  )

  const handleAddCue = useCallback(() => {
    const maxBeatIdx = Math.max(0, beats.length - 1)
    const covered = new Set<number>()
    for (const c of draftCues) {
      for (let i = c.beatStart; i <= c.beatEnd; i++) covered.add(i)
    }
    let nextStart = 0
    let foundUncovered = false
    for (let i = 0; i <= maxBeatIdx; i++) {
      if (!covered.has(i) && !beatHasOnCameraDialogue(beats[i])) {
        nextStart = i
        foundUncovered = true
        break
      }
    }
    if (!foundUncovered) {
      for (let i = 0; i <= maxBeatIdx; i++) {
        if (!covered.has(i)) {
          nextStart = i
          break
        }
      }
    }
    const chosenSpeaker =
      castSpeakers.find((s) => s.key === directorSpeakerKey) || castSpeakers[0]!
    const newCue: SceneNarrationCue = {
      cueId: buildNarrationCueId(nextStart, nextStart, Date.now() % 10000),
      beatStart: nextStart,
      beatEnd: nextStart,
      anchorBeatIds: beats[nextStart]?.beatId ? [beats[nextStart]!.beatId] : [],
      speakerType: chosenSpeaker.speakerType,
      ...(chosenSpeaker.characterId ? { characterId: chosenSpeaker.characterId } : {}),
      characterName: chosenSpeaker.characterName,
      alignmentMode: 'flow',
      volume: 1,
      byLanguage: {
        [currentLang]: {
          text: '',
        },
      },
      generatedBy: 'user',
      updatedAt: new Date().toISOString(),
    }
    const next = [...draftCues, newCue].sort((a, b) => a.beatStart - b.beatStart)
    setDraftCues(next)
    setSelectedCueId(newCue.cueId)
    setIsDirty(true)
  }, [beats, draftCues, castSpeakers, directorSpeakerKey, currentLang])

  const handleDeleteCue = useCallback(
    async (cueId: string) => {
      const next = draftCues.filter((c) => c.cueId !== cueId)
      if (!projectId) {
        await commitUpdatedCuesLocally(next)
        return
      }
      setIsSaving(true)
      try {
        const res = await fetch('/api/scene/generate-narration-cue-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            sceneId: sceneId || String(scene.id || scene.sceneId || ''),
            sceneIndex,
            cues: next,
            saveOnly: true,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to save narration cues')
        await commitUpdatedCuesLocally(data.cues || next, data.scene)
        toast.success('Narration cue removed')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove cue')
      } finally {
        setIsSaving(false)
      }
    },
    [draftCues, projectId, sceneId, scene, sceneIndex, commitUpdatedCuesLocally]
  )

  const handleSaveDrafts = useCallback(async () => {
    if (!projectId) {
      await commitUpdatedCuesLocally(draftCues)
      toast.success('Narration cues updated')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/scene/generate-narration-cue-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneId: sceneId || String(scene.id || scene.sceneId || ''),
          sceneIndex,
          cues: draftCues,
          saveOnly: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save narration cues')
      await commitUpdatedCuesLocally(data.cues || draftCues, data.scene)
      toast.success('Narration cues saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save narration cues')
    } finally {
      setIsSaving(false)
    }
  }, [projectId, sceneId, scene, sceneIndex, draftCues, commitUpdatedCuesLocally])

  const handleAiDirectCues = useCallback(async () => {
    if (!projectId) {
      toast.error('Save project before running AI Narration Director')
      return
    }
    if (beats.length === 0) {
      toast.error('Add shots to this scene before planning shot-aligned narration')
      return
    }
    const chosenSpeaker =
      castSpeakers.find((s) => s.key === directorSpeakerKey) || castSpeakers[0]!
    setIsDirecting(true)
    try {
      const res = await fetch('/api/scene/direct-narration-cues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneId: sceneId || String(scene.id || scene.sceneId || ''),
          sceneIndex,
          language: currentLang,
          targetLanguages: [currentLang],
          speakerType: chosenSpeaker.speakerType,
          characterId: chosenSpeaker.characterId,
          characterName: chosenSpeaker.characterName,
          directorNotes: directorNotes.trim() || undefined,
          generateAudio: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'AI Narration Director failed')
      const nextCues: SceneNarrationCue[] = Array.isArray(data.cues) ? data.cues : []
      await commitUpdatedCuesLocally(nextCues, data.scene)
      toast.success(
        `Planned & synthesized ${nextCues.length} shot-aligned narration cue${nextCues.length === 1 ? '' : 's'}`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI Narration Director failed')
    } finally {
      setIsDirecting(false)
    }
  }, [
    projectId,
    beats.length,
    castSpeakers,
    directorSpeakerKey,
    sceneId,
    scene,
    sceneIndex,
    currentLang,
    directorNotes,
    commitUpdatedCuesLocally,
  ])

  const handleSynthesizeCues = useCallback(
    async (options?: { targetCueId?: string; forceRegenerate?: boolean; translateOnly?: boolean }) => {
      if (!projectId) {
        toast.error('Project ID is required to synthesize narration audio')
        return
      }
      if (draftCues.length === 0) {
        toast.error('Add or AI-direct at least one narration cue first')
        return
      }
      if (options?.targetCueId) {
        setSynthesizingCueId(options.targetCueId)
      } else {
        setIsSynthesizingAll(true)
      }
      try {
        const res = await fetch('/api/scene/generate-narration-cue-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            sceneId: sceneId || String(scene.id || scene.sceneId || ''),
            sceneIndex,
            cues: draftCues,
            targetCueIds: options?.targetCueId ? [options.targetCueId] : undefined,
            language: currentLang,
            targetLanguages: [currentLang],
            translateOnly: options?.translateOnly === true,
            forceRegenerate: options?.forceRegenerate ?? true,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Narration audio synthesis failed')
        const nextCues: SceneNarrationCue[] = Array.isArray(data.cues) ? data.cues : draftCues
        await commitUpdatedCuesLocally(nextCues, data.scene)
        toast.success(
          options?.translateOnly
            ? `Translated cues to ${languageDisplayName(currentLang)}`
            : options?.targetCueId
              ? 'Synthesized narration cue audio'
              : `Synthesized ${languageDisplayName(currentLang)} narration cues`
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Narration synthesis failed')
      } finally {
        setSynthesizingCueId(null)
        setIsSynthesizingAll(false)
      }
    },
    [projectId, draftCues, sceneId, scene, sceneIndex, currentLang, commitUpdatedCuesLocally]
  )

  const shotCoverageByBeat = useMemo(() => {
    const map = new Map<number, { cueIndex: number; cue: SceneNarrationCue }>()
    draftCues.forEach((cue, cueIndex) => {
      for (let b = cue.beatStart; b <= cue.beatEnd; b++) {
        if (!map.has(b)) {
          map.set(b, { cueIndex, cue })
        }
      }
    })
    return map
  }, [draftCues])

  const readyCountInLang = useMemo(() => {
    return draftCues.filter((c) => Boolean(c.byLanguage?.[currentLang]?.audioUrl?.trim())).length
  }, [draftCues, currentLang])

  const missingTranslationCount = useMemo(() => {
    if (currentLang === 'en') return 0
    return draftCues.filter(
      (c) =>
        !c.byLanguage?.[currentLang]?.text?.trim() &&
        Boolean(c.byLanguage?.en?.text?.trim() || Object.values(c.byLanguage || {})[0]?.text?.trim())
    ).length
  }, [draftCues, currentLang])

  return (
    <div
      data-testid="scene-narration-cue-panel"
      className={cn(
        'rounded-xl border border-indigo-500/25 bg-slate-950/85 text-slate-100 shadow-sm',
        compact ? 'p-3 space-y-3' : 'p-4 space-y-4'
      )}
    >
      {/* Top Header & Multi-Language Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-500/40 bg-indigo-500/15 text-indigo-300">
            <Mic className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                {isPromo ? 'Promo Voiceover Cues' : 'Shot-Aligned Narration Overlay'}
              </h3>
              <span className="rounded-full border border-slate-700/80 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                {draftCues.length === 0
                  ? 'No cues'
                  : `${readyCountInLang}/${draftCues.length} audio ready (${currentLang.toUpperCase()})`}
              </span>
              {isDirty && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                  Unsaved edits
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {isPromo
                ? 'Overlay narration spans single or multiple shots cleanly without altering shared scene scripts — synced directly to the Mixer.'
                : 'Align voiceover cues across one or more shots, assign Cast voices, localize languages, and control freeze/slow-mo pacing.'}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isDirty && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleSaveDrafts()}
              disabled={isSaving}
              className="h-7 px-2.5 text-xs border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1" />
              )}
              Save Cues
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => void handleAiDirectCues()}
            disabled={isDirecting || isSynthesizingAll || beats.length === 0}
            className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
          >
            {isDirecting ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            AI Write & Sync Cues
          </Button>

          {draftCues.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleSynthesizeCues({ forceRegenerate: missingTranslationCount === 0 })}
              disabled={isSynthesizingAll || isDirecting}
              className="h-7 px-2.5 text-xs border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            >
              {isSynthesizingAll ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              {missingTranslationCount > 0
                ? `Translate & Synthesize (${currentLang.toUpperCase()})`
                : `Synthesize All (${currentLang.toUpperCase()})`}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleAddCue}
            disabled={beats.length === 0}
            className="h-7 px-2.5 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Cue
          </Button>

          <button
            type="button"
            onClick={() => setShowDirectorOptions((v) => !v)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-800 bg-slate-900/90 px-2 text-[11px] text-slate-400 hover:text-slate-200"
            title="AI Voice & Direction Settings"
          >
            <Sliders className="h-3 w-3" />
            {showDirectorOptions ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Multi-Language Stream Selector & Optional AI Director Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
            <Globe className="h-3 w-3 text-indigo-400" />
            Language
          </span>
          {languageTabs.map((langCode) => {
            const isSelected = langCode === currentLang
            const allReady =
              draftCues.length > 0 &&
              draftCues.every((c) => Boolean(c.byLanguage?.[langCode]?.audioUrl?.trim()))
            const someText = draftCues.some((c) => Boolean(c.byLanguage?.[langCode]?.text?.trim()))
            return (
              <button
                key={langCode}
                type="button"
                onClick={() => handleSelectLanguage(langCode)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  isSelected
                    ? 'border-indigo-400/70 bg-indigo-500/25 text-white'
                    : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    allReady
                      ? 'bg-emerald-400'
                      : someText
                        ? 'bg-amber-400'
                        : 'bg-slate-600'
                  )}
                />
                {languageDisplayName(langCode)}
                <span className="text-[9px] uppercase opacity-70">{langCode}</span>
              </button>
            )
          })}

          <select
            aria-label="Add narration language"
            value=""
            onChange={(e) => {
              const code = e.target.value.trim().toLowerCase()
              if (!code) return
              setExtraLanguages((prev) => (prev.includes(code) ? prev : [...prev, code]))
              handleSelectLanguage(code)
            }}
            className="h-6 rounded-full border border-slate-800 bg-slate-900/90 px-2 text-[10px] text-slate-300 focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="">+ Language...</option>
            {SUPPORTED_LANGUAGES.filter((l) => !languageTabs.includes(l.code.toLowerCase())).map(
              (lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code.toUpperCase()})
                </option>
              )
            )}
          </select>
        </div>

        {/* Default Speaker Picker for New / AI Cues */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Default Voice:</span>
          <select
            aria-label="Default narration speaker"
            value={directorSpeakerKey}
            onChange={(e) => setDirectorSpeakerKey(e.target.value)}
            className="h-6 rounded-md border border-slate-700/80 bg-slate-900 px-2 text-[11px] text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            {castSpeakers.map((sp) => (
              <option key={sp.key} value={sp.key}>
                {sp.speakerType === 'narrator'
                  ? `Narrator (${sp.voiceBadge})`
                  : `${sp.characterName} · Cast V.O.`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showDirectorOptions && (
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/20 p-2.5 space-y-1.5">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
            AI Narration Director Notes (Optional)
          </label>
          <input
            type="text"
            value={directorNotes}
            onChange={(e) => setDirectorNotes(e.target.value)}
            placeholder={
              isPromo
                ? 'e.g., Build suspense across shots 1–2, pause over shot 3 dialogue, close with a bold question...'
                : 'e.g., First-person reflective memoir tone, introduce location on Shot 1 with freeze frame...'
            }
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      {/* Visual Shot-Span Coverage Ribbon */}
      {beats.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
              <Film className="h-3 w-3 text-slate-400" />
              Shot Span Alignment ({beats.length} shots)
            </span>
            <span>Click any cue card or adjust Start/End Shot to span multiple cuts</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {beats.map((beat, idx) => {
              const coverage = shotCoverageByBeat.get(idx)
              const hasDialogue = beatHasOnCameraDialogue(beat)
              const isSelectedCue =
                coverage && selectedCueId && coverage.cue.cueId === selectedCueId
              const dur = Math.max(1, Math.round(beat.durationSeconds ?? 5))
              return (
                <button
                  key={beat.beatId || idx}
                  type="button"
                  onClick={() => {
                    if (coverage) {
                      setSelectedCueId(coverage.cue.cueId)
                    }
                  }}
                  className={cn(
                    'group relative flex min-w-[92px] max-w-[130px] flex-1 flex-col justify-between rounded-lg border p-1.5 text-left transition-all',
                    isSelectedCue
                      ? 'border-indigo-400 bg-indigo-500/20 ring-1 ring-indigo-400/50'
                      : coverage
                        ? 'border-indigo-500/40 bg-indigo-950/30 hover:border-indigo-400/60'
                        : hasDialogue
                          ? 'border-amber-500/30 bg-amber-950/15'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  )}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-[10px] font-semibold text-slate-200">
                      Shot {idx + 1}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">{dur}s</span>
                  </div>
                  {beat.storyboardImageUrl ? (
                    <div className="my-1 h-9 w-full overflow-hidden rounded bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={beat.storyboardImageUrl}
                        alt={`Shot ${idx + 1}`}
                        className="h-full w-full object-cover opacity-85 group-hover:opacity-100"
                      />
                    </div>
                  ) : (
                    <p className="my-1 line-clamp-2 text-[9px] leading-tight text-slate-400">
                      {beat.actionDescription || beat.line || 'Visual shot'}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-1">
                    {coverage ? (
                      <span className="truncate rounded bg-indigo-500/25 px-1.5 py-0.5 text-[9px] font-medium text-indigo-200">
                        Cue {coverage.cueIndex + 1}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500">Uncovered</span>
                    )}
                    {hasDialogue && (
                      <span
                        title={`On-camera dialogue: ${beat.character || 'Character'}`}
                        className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1 py-0.5 text-[8px] font-medium text-amber-300"
                      >
                        <MessageSquare className="h-2.5 w-2.5" />
                        Dial
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Cue Cards List */}
      {draftCues.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 px-4 py-6 text-center space-y-2">
          <p className="text-xs font-medium text-slate-300">
            No shot-aligned narration cues yet
          </p>
          <p className="text-[11px] text-slate-500 max-w-lg mx-auto">
            Click <strong className="text-indigo-300">AI Write &amp; Sync Cues</strong> to automatically compose voiceover cues timed to your non-dialogue shots, or click <strong className="text-slate-300">Add Cue</strong> to write custom narration over any single shot or multi-shot span.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {draftCues.map((cue, cueIdx) => {
            const langEntry = cue.byLanguage?.[currentLang]
            const currentText = langEntry?.text ?? ''
            const englishRefText =
              currentLang !== 'en' ? cue.byLanguage?.en?.text?.trim() : undefined
            const audioUrl = langEntry?.audioUrl?.trim()
            const spanSec = resolveSpanDurationSec(beats, cue.beatStart, cue.beatEnd)
            const actualOrEstSec =
              typeof langEntry?.durationSec === 'number' && langEntry.durationSec > 0
                ? langEntry.durationSec
                : estimateNarrationWordsDurationSec(currentText)
            const overrunSec = Math.round((actualOrEstSec - spanSec) * 10) / 10

            // Resolve voiceId for staleness check
            const resolvedSpeaker = resolveDialogueTtsVoice({
              characters,
              characterId: cue.characterId,
              characterName: cue.characterName,
              kind: cue.speakerType === 'character' ? 'dialogue' : 'narration',
              narrationVoice: narrationVoice as DialogueTtsCharacter['voiceConfig'],
            })
            const expectedVoiceId = extractVoiceIdFromConfig(resolvedSpeaker.voiceConfig)
            const isStale = isNarrationCueAudioStale(cue, currentLang, expectedVoiceId)
            const speakerSelectValue =
              cue.speakerType === 'character' && cue.characterId
                ? `char:${cue.characterId}`
                : 'narrator'

            const hasDialogueCollision = (() => {
              for (let b = cue.beatStart; b <= cue.beatEnd; b++) {
                if (beatHasOnCameraDialogue(beats[b])) return true
              }
              return false
            })()

            const isPlayingThis = Boolean(audioUrl && playingAudioUrl === audioUrl)
            const isSynthesizingThis = synthesizingCueId === cue.cueId

            return (
              <div
                key={cue.cueId}
                onClick={() => setSelectedCueId(cue.cueId)}
                className={cn(
                  'rounded-lg border bg-slate-900/75 p-3 transition-colors space-y-2.5',
                  selectedCueId === cue.cueId
                    ? 'border-indigo-500/60 shadow-sm shadow-indigo-950/40'
                    : 'border-slate-800 hover:border-slate-700'
                )}
              >
                {/* Cue Card Top Metadata Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[11px] font-semibold text-indigo-200">
                      Cue {cueIdx + 1} · {formatNarrationCueRange(cue)}
                    </span>

                    {/* Start / End Shot Span Selectors */}
                    <div className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[10px] text-slate-400">
                      <span>Span:</span>
                      <select
                        aria-label={`Cue ${cueIdx + 1} start shot`}
                        value={cue.beatStart}
                        onChange={(e) => {
                          const nextStart = Number(e.target.value)
                          updateCueAt(cue.cueId, (prev) => ({
                            ...prev,
                            beatStart: nextStart,
                            beatEnd: Math.max(nextStart, prev.beatEnd),
                          }))
                        }}
                        className="bg-transparent font-medium text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {beats.map((_, bIdx) => (
                          <option key={bIdx} value={bIdx} className="bg-slate-900">
                            Shot {bIdx + 1}
                          </option>
                        ))}
                      </select>
                      <span>→</span>
                      <select
                        aria-label={`Cue ${cueIdx + 1} end shot`}
                        value={cue.beatEnd}
                        onChange={(e) => {
                          const nextEnd = Number(e.target.value)
                          updateCueAt(cue.cueId, (prev) => ({
                            ...prev,
                            beatStart: Math.min(prev.beatStart, nextEnd),
                            beatEnd: nextEnd,
                          }))
                        }}
                        className="bg-transparent font-medium text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {beats.map((_, bIdx) => (
                          <option key={bIdx} value={bIdx} className="bg-slate-900">
                            Shot {bIdx + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cast Speaker Assignment */}
                    <div className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300">
                      <User className="h-3 w-3 text-indigo-400 shrink-0" />
                      <select
                        aria-label={`Cue ${cueIdx + 1} speaker`}
                        value={
                          castSpeakers.some((s) => s.key === speakerSelectValue)
                            ? speakerSelectValue
                            : 'narrator'
                        }
                        onChange={(e) => {
                          const picked =
                            castSpeakers.find((s) => s.key === e.target.value) || castSpeakers[0]!
                          updateCueAt(cue.cueId, (prev) => ({
                            ...prev,
                            speakerType: picked.speakerType,
                            characterId: picked.characterId,
                            characterName: picked.characterName,
                          }))
                        }}
                        className="bg-transparent font-medium text-slate-100 focus:outline-none cursor-pointer"
                      >
                        {castSpeakers.map((sp) => (
                          <option key={sp.key} value={sp.key} className="bg-slate-900">
                            {sp.speakerType === 'narrator'
                              ? 'Narrator'
                              : `${sp.characterName} (V.O.)`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Duration Fit Meter */}
                    <span
                      title="Spoken narration duration vs covered visual shot span"
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        !currentText.trim()
                          ? 'border-slate-800 text-slate-500'
                          : overrunSec <= 0.3
                            ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                      )}
                    >
                      {!currentText.trim()
                        ? `0.0s / ${spanSec}s`
                        : overrunSec <= 0.3
                          ? `✓ ${actualOrEstSec.toFixed(1)}s / ${spanSec.toFixed(1)}s`
                          : `${actualOrEstSec.toFixed(1)}s / ${spanSec.toFixed(1)}s (+${overrunSec.toFixed(1)}s → Auto-Fit)`}
                    </span>

                    {hasDialogueCollision && (
                      <span
                        title="This span covers a shot with on-camera dialogue. Consider ending the cue before the dialogue shot."
                        className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300"
                      >
                        <AlertCircle className="h-3 w-3" />
                        Overlaps Dialogue Shot
                      </span>
                    )}
                  </div>

                  {/* Right Status & Delete */}
                  <div className="flex items-center gap-1.5">
                    {audioUrl && !isStale ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Ready
                      </span>
                    ) : audioUrl && isStale ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        <AlertCircle className="h-3 w-3" />
                        Text/Voice Edited
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                        No Audio
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDeleteCue(cue.cueId)
                      }}
                      title="Delete narration cue"
                      className="rounded p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Spoken Script Textarea */}
                <div className="space-y-1">
                  <textarea
                    rows={compact ? 2 : 2}
                    value={currentText}
                    onChange={(e) => {
                      const val = e.target.value
                      updateCueAt(cue.cueId, (prev) => ({
                        ...prev,
                        byLanguage: {
                          ...(prev.byLanguage || {}),
                          [currentLang]: {
                            ...(prev.byLanguage?.[currentLang] || {}),
                            text: val,
                          },
                        },
                      }))
                    }}
                    placeholder={`Write ${languageDisplayName(currentLang)} voiceover for ${formatNarrationCueRange(cue)} (~${Math.max(4, Math.round(spanSec * 2.1))} words fits ${spanSec}s cleanly)...`}
                    className="w-full rounded-md border border-slate-800 bg-slate-950/90 px-2.5 py-1.5 text-xs leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  {englishRefText && (
                    <p className="text-[10px] text-slate-400 pl-1">
                      <span className="font-semibold text-slate-500">EN Reference:</span>{' '}
                      {englishRefText}
                    </p>
                  )}
                </div>

                {/* Bottom Controls: Vocal Delivery + Alignment Mode + Audio Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                    <input
                      type="text"
                      value={cue.deliveryCue ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        updateCueAt(cue.cueId, (prev) => ({
                          ...prev,
                          deliveryCue: val || undefined,
                        }))
                      }}
                      placeholder="Vocal tone (e.g., Warm reflective, Urgent trailer gravitas)"
                      className="h-7 min-w-[180px] flex-1 rounded-md border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />

                    {/* Shot Alignment / Freeze Preset */}
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950 px-2 h-7">
                      <span className="text-[10px] text-slate-400">Pacing:</span>
                      <select
                        aria-label={`Cue ${cueIdx + 1} alignment mode`}
                        value={cue.alignmentMode || 'flow'}
                        onChange={(e) => {
                          const mode = e.target.value as NarrationAlignmentMode
                          updateCueAt(cue.cueId, (prev) => ({
                            ...prev,
                            alignmentMode: mode,
                            ...(mode === 'intro-freeze' && !prev.introNarrationSec
                              ? { introNarrationSec: 2.5 }
                              : {}),
                          }))
                        }}
                        title={
                          ALIGNMENT_MODE_OPTIONS.find(
                            (o) => o.value === (cue.alignmentMode || 'flow')
                          )?.hint
                        }
                        className="bg-transparent text-[11px] font-medium text-indigo-200 focus:outline-none cursor-pointer"
                      >
                        {ALIGNMENT_MODE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-slate-900">
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {cue.alignmentMode === 'intro-freeze' && (
                        <label className="inline-flex items-center gap-1 border-l border-slate-800 pl-1.5 text-[10px] text-sky-300">
                          <span>Freeze</span>
                          <input
                            type="number"
                            min={0.5}
                            max={10}
                            step={0.5}
                            value={cue.introNarrationSec ?? 2.5}
                            onChange={(e) => {
                              const sec = Math.max(0.5, Math.min(10, Number(e.target.value) || 2.5))
                              updateCueAt(cue.cueId, (prev) => ({
                                ...prev,
                                introNarrationSec: sec,
                              }))
                            }}
                            className="w-11 rounded bg-slate-900 px-1 py-0.5 text-center text-[10px] text-white"
                          />
                          <span>s</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Cue Audio Playback & Synthesis */}
                  <div className="flex items-center gap-1.5">
                    {audioUrl && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTogglePlay(audioUrl)
                          }}
                          className="h-7 px-2 text-xs border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
                        >
                          {isPlayingThis ? (
                            <Pause className="h-3 w-3 mr-1 text-indigo-400" />
                          ) : (
                            <Play className="h-3 w-3 mr-1 text-emerald-400" />
                          )}
                          {isPlayingThis ? 'Stop' : 'Play'}
                        </Button>
                        <a
                          href={audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          onClick={(e) => e.stopPropagation()}
                          title="Download cue MP3"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSynthesizingThis || isSynthesizingAll || (!currentText.trim() && currentLang === 'en')}
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleSynthesizeCues({
                          targetCueId: cue.cueId,
                          forceRegenerate: true,
                        })
                      }}
                      className={cn(
                        'h-7 px-2.5 text-xs',
                        !audioUrl || isStale
                          ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                      )}
                    >
                      {isSynthesizingThis ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : audioUrl ? (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      ) : (
                        <Volume2 className="h-3 w-3 mr-1" />
                      )}
                      {audioUrl ? 'Regen' : 'Synthesize'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
