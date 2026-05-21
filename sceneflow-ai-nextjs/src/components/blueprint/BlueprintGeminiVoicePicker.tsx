'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check } from 'lucide-react'
import { DEFAULT_BLUEPRINT_GEMINI_VOICE } from '@/lib/tts/geminiFlashTts'

type GeminiVoice = { id: string; name: string; gender?: string }

interface BlueprintGeminiVoicePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedVoiceId?: string
  onSelectVoice: (voiceId: string, voiceName: string) => void
}

export function BlueprintGeminiVoicePicker({
  open,
  onOpenChange,
  selectedVoiceId,
  onSelectVoice,
}: BlueprintGeminiVoicePickerProps) {
  const [voices, setVoices] = useState<GeminiVoice[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch('/api/tts/blueprint/voices', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (!mounted) return
        const list = (data?.voices ?? []).map((v: { id: string; name: string; gender?: string }) => ({
            id: v.id,
            name: v.name,
            gender: v.gender,
          }))
        setVoices(list)
      } catch {
        if (mounted) setVoices([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [open])

  const sorted = useMemo(
    () => [...voices].sort((a, b) => a.name.localeCompare(b.name)),
    [voices]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gray-950 border-gray-800 text-gray-100">
        <DialogHeader>
          <DialogTitle>Narrator voice</DialogTitle>
          <DialogDescription className="text-gray-400">
            Gemini voices for Blueprint narration
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto space-y-1 custom-scrollbar">
          {loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">Loading voices…</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-amber-300/90 py-4 text-center">
              Google TTS not configured
            </p>
          ) : (
            sorted.map((v) => {
              const selected =
                (selectedVoiceId || DEFAULT_BLUEPRINT_GEMINI_VOICE) === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVoice(v.id, v.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    selected
                      ? 'bg-purple-600/30 border border-purple-500/40 text-white'
                      : 'hover:bg-gray-800/80 text-gray-200 border border-transparent'
                  }`}
                >
                  <span>{v.name}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-purple-300" /> : null}
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
