'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Type, ChevronDown, ChevronUp } from 'lucide-react'
import type { SceneBeat, BeatOverlayType } from '@/lib/script/segmentTypes'
import {
  defaultBeatOverlayType,
  isBeatCaptionManuallyEdited,
} from '@/lib/storyboard/playerTranslations'
import { autoTranslateBeatCaption } from '@/lib/storyboard/beatCaptionTranslations'
import type { SceneTranslation } from '@/lib/storyboard/playerTranslations'

type ProjectTranslations = Record<string, Record<number, SceneTranslation>>

const OVERLAY_TYPE_OPTIONS: { value: BeatOverlayType; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'signage', label: 'Signage' },
  { value: 'lower_third', label: 'Lower-third' },
]

interface BeatCaptionControlProps {
  beat: SceneBeat
  sceneIdx: number
  selectedLanguage: string
  scenes: any[]
  script: any
  storedTranslations?: ProjectTranslations
  onScriptChange?: (script: any) => void
  onSaveTranslations?: (
    langCode: string,
    translations: Record<number, SceneTranslation>
  ) => Promise<void>
}

function collectCaptionTargetLanguages(
  scenes: any[],
  storedTranslations?: ProjectTranslations
): string[] {
  const langs = new Set<string>()
  Object.keys(storedTranslations || {}).forEach((lang) => {
    if (lang !== 'en') langs.add(lang)
  })
  scenes.forEach((scene) => {
    if (scene?.dialogueAudio && typeof scene.dialogueAudio === 'object') {
      Object.keys(scene.dialogueAudio).forEach((lang) => {
        if (lang !== 'en') langs.add(lang)
      })
    }
    if (scene?.narrationAudio && typeof scene.narrationAudio === 'object') {
      Object.keys(scene.narrationAudio).forEach((lang) => {
        if (lang !== 'en') langs.add(lang)
      })
    }
  })
  return Array.from(langs)
}

export function BeatCaptionControl({
  beat,
  sceneIdx,
  selectedLanguage,
  scenes,
  script,
  storedTranslations,
  onScriptChange,
  onSaveTranslations,
}: BeatCaptionControlProps) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const previousEnglishRef = useRef(beat.overlayText?.trim() || '')

  const isEnglish = selectedLanguage === 'en'
  const sceneTranslation = storedTranslations?.[selectedLanguage]?.[sceneIdx]
  const translatedEntry = sceneTranslation?.beatsByBeatId?.[beat.beatId]

  const displayText = useMemo(() => {
    if (isEnglish) return beat.overlayText?.trim() || ''
    return translatedEntry?.overlayText?.trim() || beat.overlayText?.trim() || ''
  }, [isEnglish, beat.overlayText, translatedEntry?.overlayText])

  const displayType = beat.overlayType || defaultBeatOverlayType(beat.beatRole)

  const [draftText, setDraftText] = useState(displayText)
  const [draftType, setDraftType] = useState<BeatOverlayType>(displayType)

  useEffect(() => {
    setDraftText(displayText)
    setDraftType(beat.overlayType || defaultBeatOverlayType(beat.beatRole))
  }, [displayText, beat.overlayType, beat.beatRole])

  const statusLabel = useMemo(() => {
    if (isEnglish) {
      return beat.overlayText?.trim() ? 'Caption set' : null
    }
    if (isBeatCaptionManuallyEdited(sceneTranslation, beat.beatId)) return 'Edited'
    if (translatedEntry?.overlayText?.trim()) return 'Auto-translated'
    if (beat.overlayText?.trim()) return 'Using English'
    return null
  }, [isEnglish, beat.overlayText, sceneTranslation, beat.beatId, translatedEntry?.overlayText])

  const commitCaption = useCallback(
    async (overrides?: { text?: string; overlayType?: BeatOverlayType }) => {
      const text = (overrides?.text ?? draftText).trim()
      const overlayType = overrides?.overlayType ?? draftType

      if (isEnglish) {
        if (!onScriptChange) return
        setSaving(true)
        try {
          const updatedScenes = [...scenes]
          const scene = { ...updatedScenes[sceneIdx] }
          scene.beats = (scene.beats || []).map((entry: SceneBeat) =>
            entry.beatId === beat.beatId
              ? {
                  ...entry,
                  overlayText: text || undefined,
                  overlayType: text ? overlayType : undefined,
                }
              : entry
          )
          updatedScenes[sceneIdx] = scene
          onScriptChange({ ...script, script: { ...script.script, scenes: updatedScenes } })

          if (text && onSaveTranslations) {
            const targetLanguages = collectCaptionTargetLanguages(scenes, storedTranslations)
            await autoTranslateBeatCaption({
              englishText: text,
              beatId: beat.beatId,
              sceneIdx,
              targetLanguages,
              storedTranslations: storedTranslations || {},
              previousEnglishText: previousEnglishRef.current,
              onSaveTranslations,
            })
          }
          previousEnglishRef.current = text
        } finally {
          setSaving(false)
        }
        return
      }

      if (!onSaveTranslations) return
      setSaving(true)
      try {
        const langMap = { ...(storedTranslations?.[selectedLanguage] || {}) }
        const sceneTrans = { ...(langMap[sceneIdx] || {}) }
        const beatsByBeatId = { ...(sceneTrans.beatsByBeatId || {}) }

        if (!text) {
          delete beatsByBeatId[beat.beatId]
        } else {
          beatsByBeatId[beat.beatId] = {
            overlayText: text,
            overlayEdited: true,
          }
        }

        langMap[sceneIdx] = {
          ...sceneTrans,
          beatsByBeatId: Object.keys(beatsByBeatId).length > 0 ? beatsByBeatId : undefined,
        }
        await onSaveTranslations(selectedLanguage, langMap)
      } finally {
        setSaving(false)
      }
    },
    [
      draftText,
      draftType,
      isEnglish,
      onScriptChange,
      scenes,
      sceneIdx,
      beat.beatId,
      script,
      onSaveTranslations,
      storedTranslations,
      selectedLanguage,
    ]
  )

  const hasCaption = Boolean(displayText.trim())

  return (
    <div className="mt-2 border-t border-slate-600/30 pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-[11px] text-slate-300 hover:text-slate-100"
      >
        <Type className="h-3.5 w-3.5 shrink-0 text-violet-300" />
        <span className="font-medium">Caption</span>
        {hasCaption && (
          <span className="truncate text-slate-400 max-w-[12rem]">— {displayText}</span>
        )}
        {statusLabel && (
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] text-violet-200">
            {statusLabel}
          </span>
        )}
        <span className="ml-auto">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onBlur={() => void commitCaption()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void commitCaption()
              }
            }}
            disabled={saving}
            placeholder={
              isEnglish
                ? 'On-screen title or signage text…'
                : 'Translated caption override…'
            }
            className="w-full rounded-md border border-slate-600/50 bg-slate-900/60 px-2 py-1.5 text-xs text-gray-100 placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
          />
          {isEnglish && (
            <div className="flex flex-wrap items-center gap-1.5">
              {OVERLAY_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setDraftType(opt.value)
                    void commitCaption({ overlayType: opt.value })
                  }}
                  className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                    draftType === opt.value
                      ? 'border-violet-400/60 bg-violet-500/20 text-violet-100'
                      : 'border-slate-600/50 bg-slate-800/40 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {!isEnglish && (
            <p className="text-[10px] text-slate-500">
              Editing the {selectedLanguage.toUpperCase()} stream. English source caption is unchanged.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
