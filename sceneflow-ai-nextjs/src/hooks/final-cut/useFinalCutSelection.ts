'use client'

import { useCallback, useState } from 'react'
import type {
  FinalCutAssemblyPresetId,
  FinalCutSceneOverride,
  FinalCutSelection,
  ProductionFormat,
  ProductionLanguage,
} from '@/lib/types/finalCut'
import { applyAssemblyPreset } from '@/lib/final-cut/finalCutPresets'
import { getAvailableLanguagesForFormat } from '@/lib/final-cut/resolveSegmentMedia'

const DEFAULT_SELECTION: FinalCutSelection = {
  format: 'full-video',
  language: 'en',
  presetId: 'all-video',
  perSceneOverrides: {},
}

function migrateLegacySelection(metadata: unknown): FinalCutSelection | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  const legacy = m.finalCutStreams
  if (!Array.isArray(legacy) || legacy.length === 0) return null

  const sortedLegacy = [...legacy].sort((a: unknown, b: unknown) => {
    const ad = new Date((a as { updatedAt?: string })?.updatedAt ?? 0).getTime()
    const bd = new Date((b as { updatedAt?: string })?.updatedAt ?? 0).getTime()
    return bd - ad
  })

  const first = sortedLegacy[0] as { language?: string; format?: string } | undefined
  if (!first) return null

  const format = (first.format === 'animatic' ? 'animatic' : 'full-video') as ProductionFormat
  const language = (typeof first.language === 'string' && first.language ? first.language : 'en') as ProductionLanguage

  return { format, language, presetId: 'all-video', perSceneOverrides: {} }
}

export function readFinalCutSelection(metadata: unknown): FinalCutSelection {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as { finalCut?: Partial<FinalCutSelection> }
    if (m.finalCut && typeof m.finalCut === 'object') {
      const format = (m.finalCut.format === 'animatic' ? 'animatic' : 'full-video') as ProductionFormat
      const language = (typeof m.finalCut.language === 'string' && m.finalCut.language
        ? m.finalCut.language
        : 'en') as ProductionLanguage
      const presetId = (m.finalCut.presetId ?? 'all-video') as FinalCutAssemblyPresetId
      const overridesRaw =
        m.finalCut.perSceneOverrides && typeof m.finalCut.perSceneOverrides === 'object'
          ? (m.finalCut.perSceneOverrides as Record<string, Partial<FinalCutSceneOverride>>)
          : {}
      const overrides: NonNullable<FinalCutSelection['perSceneOverrides']> = {}
      for (const k of Object.keys(overridesRaw)) {
        const raw = overridesRaw[k]
        if (!raw || typeof raw !== 'object') continue
        const entry: FinalCutSceneOverride = {}
        if (raw.streamType === 'animatic' || raw.streamType === 'video') {
          entry.streamType = raw.streamType
        }
        if (typeof raw.language === 'string' && raw.language) {
          entry.language = raw.language as ProductionLanguage
        }
        const v = Number(raw.streamVersion)
        if (Number.isFinite(v) && v > 0) entry.streamVersion = v
        if (Object.keys(entry).length > 0) overrides[k] = entry
      }
      return { format, language, presetId, perSceneOverrides: overrides }
    }
  }
  const migrated = migrateLegacySelection(metadata)
  return migrated ?? { ...DEFAULT_SELECTION }
}

export function useFinalCutSelection(sceneState: Record<string, unknown>) {
  const [selection, setSelection] = useState<FinalCutSelection>(DEFAULT_SELECTION)

  const handleApplyPreset = useCallback(
    (presetId: FinalCutAssemblyPresetId, metadata: unknown, sceneIds: string[]) => {
      const baselineLanguage = selection.language
      const next = applyAssemblyPreset({
        presetId,
        sceneIds,
        metadata,
        baselineLanguage,
      })
      setSelection(next)
    },
    [selection.language]
  )

  const handleChangeSceneOverride = useCallback(
    (
      sceneId: string,
      patch: {
        streamType?: 'animatic' | 'video' | null
        language?: ProductionLanguage | null
        streamVersion?: number | null
      }
    ) => {
      setSelection((prev) => {
        const next: FinalCutSelection = {
          ...prev,
          presetId: 'custom',
          perSceneOverrides: { ...(prev.perSceneOverrides ?? {}) },
        }
        const current = { ...(next.perSceneOverrides![sceneId] ?? {}) }

        if (patch.streamType === null) delete current.streamType
        else if (patch.streamType) current.streamType = patch.streamType

        if (patch.language === null) delete current.language
        else if (patch.language) current.language = patch.language

        if (patch.streamVersion === null) delete current.streamVersion
        else if (patch.streamVersion != null) current.streamVersion = patch.streamVersion

        if (Object.keys(current).length === 0) {
          delete next.perSceneOverrides![sceneId]
        } else {
          next.perSceneOverrides![sceneId] = current
        }
        return next
      })
    },
    []
  )

  const normalizeLanguage = useCallback(
    (initial: FinalCutSelection) => {
      const langs = getAvailableLanguagesForFormat(sceneState, initial.format)
      if (langs.length > 0 && !langs.includes(initial.language)) {
        return { ...initial, language: (langs[0] || 'en') as ProductionLanguage }
      }
      return initial
    },
    [sceneState]
  )

  return {
    selection,
    setSelection,
    handleApplyPreset,
    handleChangeSceneOverride,
    normalizeLanguage,
    DEFAULT_SELECTION,
  }
}
