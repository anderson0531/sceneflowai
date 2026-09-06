'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ChevronDown, ChevronUp, Mic } from 'lucide-react'
import { VoiceClonePanel } from './VoiceClonePanel'
import { VoiceDirectionEditor } from './VoiceDirectionEditor'
import { toast } from 'sonner'
import type { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'
import {
  CINEMATIC_NARRATOR_PRESETS,
  DEFAULT_CINEMATIC_NARRATOR,
  getCinematicNarratorPreset,
  type CinematicNarratorPreset,
} from '@/lib/tts/cinematicNarratorPresets'
import { pickGeminiBaseVoice } from '@/lib/tts/pickGeminiBaseVoice'

export type VoiceSelectionMode = 'character' | 'narrator' | 'browse'

export interface VoiceHistoryEntry {
  voiceId: string
  voiceName: string
  characterName: string
  timestamp: number
}

interface VoiceSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ignored — this dialog is Gemini-only. Kept so existing call sites compile. */
  provider?: 'elevenlabs' | 'google'
  selectedVoiceId?: string
  onSelectVoice: (voiceId: string, voiceName: string, prompt?: string) => void
  mode?: VoiceSelectionMode
  characterContext?: CharacterContext
  screenplayContext?: ScreenplayContext
  apiKey?: string
  defaultUseCaseFilter?: string
  onVoiceDescriptionGenerated?: (description: string) => void
  characterAudioSampleUrl?: string
  onVoiceTrainingAudioSaved?: (audioUrl: string) => void
}

const PRESET_OVERRIDES_KEY = 'sceneflow-cinematic-narrator-overrides'

function loadPresetOverrides(): Record<string, string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PRESET_OVERRIDES_KEY) : null
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function savePresetOverride(presetId: string, profile: string) {
  try {
    const next = { ...loadPresetOverrides(), [presetId]: profile }
    localStorage.setItem(PRESET_OVERRIDES_KEY, JSON.stringify(next))
  } catch {
    // Silent fail
  }
}

function resolvePreset(preset: CinematicNarratorPreset, overrides: Record<string, string>): CinematicNarratorPreset {
  const override = overrides[preset.id]?.trim()
  return override ? { ...preset, profile: override } : preset
}

export function VoiceSelectionDialog({
  open,
  onOpenChange,
  selectedVoiceId,
  onSelectVoice,
  mode = 'character',
  characterContext,
  screenplayContext,
  onVoiceDescriptionGenerated,
  characterAudioSampleUrl,
  onVoiceTrainingAudioSaved,
}: VoiceSelectionDialogProps) {
  const isNarrator = mode === 'narrator' || characterContext?.role === 'narrator'
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [activePresetId, setActivePresetId] = useState<string>(DEFAULT_CINEMATIC_NARRATOR.id)
  const [profile, setProfile] = useState('')
  const [showClone, setShowClone] = useState(false)

  const presets = useMemo(
    () => CINEMATIC_NARRATOR_PRESETS.map((preset) => resolvePreset(preset, overrides)),
    [overrides]
  )

  const activePreset = presets.find((preset) => preset.id === activePresetId) ?? presets[0]

  const hiddenBase = useMemo(() => {
    if (isNarrator && activePreset) {
      return { voiceId: activePreset.voiceId, voiceName: activePreset.displayName }
    }
    return pickGeminiBaseVoice(profile, {
      gender: characterContext?.gender,
      name: characterContext?.name,
      age: characterContext?.age,
      role: characterContext?.role,
      screenplayContext,
    })
  }, [isNarrator, activePreset, profile, characterContext, screenplayContext])

  useEffect(() => {
    if (!open) return
    setOverrides(loadPresetOverrides())
    setShowClone(false)

    if (isNarrator) {
      const matched =
        getCinematicNarratorPreset(selectedVoiceId) ||
        CINEMATIC_NARRATOR_PRESETS[0]
      setActivePresetId(matched.id)
      const stored = loadPresetOverrides()[matched.id]
      setProfile((stored || matched.profile).trim())
      return
    }

    setProfile(
      characterContext?.voiceDescription?.trim() ||
        ''
    )
  }, [open, isNarrator, selectedVoiceId, characterContext?.voiceDescription])

  const title = isNarrator
    ? 'Narrator voice'
    : `Voice for ${characterContext?.name || 'character'}`

  const handleSave = (prompt: string) => {
    const nextProfile = prompt.trim()
    const pick = isNarrator && activePreset
      ? { voiceId: activePreset.voiceId, voiceName: activePreset.displayName }
      : pickGeminiBaseVoice(nextProfile, {
          gender: characterContext?.gender,
          name: characterContext?.name,
          age: characterContext?.age,
          role: characterContext?.role,
          screenplayContext,
          displayName: characterContext?.name
            ? `${characterContext.name}`
            : undefined,
        })

    if (isNarrator && activePreset) {
      savePresetOverride(activePreset.id, nextProfile)
      setOverrides(loadPresetOverrides())
    }

    if (nextProfile) {
      onVoiceDescriptionGenerated?.(nextProfile)
    }

    onSelectVoice(pick.voiceId, pick.voiceName, nextProfile)
    onOpenChange(false)
    toast.success(isNarrator ? `${pick.voiceName} saved` : 'Voice profile saved')
  }

  const handlePresetClick = (preset: CinematicNarratorPreset) => {
    const resolved = resolvePreset(preset, overrides)
    setActivePresetId(preset.id)
    setProfile(resolved.profile)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-950 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Describe the voice. SceneFlow chooses the engine voice for you. You can edit the
            profile or optionally clone a voice.
          </DialogDescription>
        </DialogHeader>

        {isNarrator ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {presets.map((preset) => {
              const selected = preset.id === activePresetId
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`text-left rounded-xl border px-3 py-3 transition-colors ${
                    selected
                      ? 'border-cyan-500/60 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-900/60 hover:border-gray-500'
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{preset.displayName}</div>
                  <div className="text-xs text-gray-400 mt-0.5 capitalize">{preset.gender}</div>
                </button>
              )
            })}
          </div>
        ) : null}

        <VoiceDirectionEditor
          key={`${isNarrator ? activePresetId : 'character'}-${open}`}
          voiceId={hiddenBase.voiceId}
          voiceName={isNarrator ? activePreset.displayName : hiddenBase.voiceName}
          initialPrompt={profile}
          characterContext={characterContext}
          screenplayContext={screenplayContext}
          onSave={handleSave}
          onCancel={() => onOpenChange(false)}
        />

        <div className="mt-4 border-t border-gray-800 pt-3">
          <button
            type="button"
            onClick={() => setShowClone((openClone) => !openClone)}
            className="flex w-full items-center justify-between text-sm text-gray-300 hover:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Optional: clone a voice
            </span>
            {showClone ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showClone ? (
            <div className="mt-3">
              <VoiceClonePanel
                provider="google"
                characterName={characterContext?.name}
                characterContext={characterContext}
                screenplayContext={screenplayContext}
                characterAudioSampleUrl={characterAudioSampleUrl}
                onVoiceCreated={(voiceId, voiceName) => {
                  onSelectVoice(voiceId, voiceName, profile.trim() || undefined)
                  onVoiceTrainingAudioSaved?.(characterAudioSampleUrl || '')
                  onOpenChange(false)
                  toast.success('Cloned voice saved')
                }}
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Leave this closed unless you want to clone from a recording or upload.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default VoiceSelectionDialog
