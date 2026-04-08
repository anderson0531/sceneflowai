'use client'

import React, { useEffect } from 'react'
import { Volume2, VolumeX, Loader, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DIRECTOR_ASSISTANTS } from '@/lib/tts/productionAssistants'
import { useStore } from '@/store/useStore'

interface SidebarVoiceSelectorProps {
  isOpen: boolean
  onToggle: () => void
  className?: string
}

const REVIEW_VOICE_STORAGE_KEY = 'sceneflow-audience-resonance-voice'

export function SidebarVoiceSelector({ isOpen, onToggle, className }: SidebarVoiceSelectorProps) {
  const selectedVoiceId = useStore(s => s.sidebarData.selectedVoiceId)
  const setSidebarVoiceSelection = useStore(s => s.setSidebarVoiceSelection)

  // Initialize from localStorage if null
  useEffect(() => {
    if (selectedVoiceId === null) {
      try {
        const stored = localStorage.getItem(REVIEW_VOICE_STORAGE_KEY)
        if (stored) {
          const { voiceId, voiceName } = JSON.parse(stored)
          if (voiceId && DIRECTOR_ASSISTANTS.find(a => a.voiceId === voiceId)) {
            setSidebarVoiceSelection(voiceId, voiceName)
            return
          }
        }
      } catch (e) {
        console.warn('Failed to load review voice from localStorage:', e)
      }
      // Fallback to first
      setSidebarVoiceSelection(DIRECTOR_ASSISTANTS[0].voiceId, DIRECTOR_ASSISTANTS[0].title)
    }
  }, [selectedVoiceId, setSidebarVoiceSelection])

  const handleVoiceSelect = (val: string) => {
    const asst = DIRECTOR_ASSISTANTS.find(a => a.voiceId === val)
    if (asst) {
      setSidebarVoiceSelection(asst.voiceId, asst.title)
      try {
        localStorage.setItem(REVIEW_VOICE_STORAGE_KEY, JSON.stringify({ voiceId: asst.voiceId, voiceName: asst.title }))
      } catch (e) {
        // Ignore
      }
    }
  }

  const selectedAssistant = DIRECTOR_ASSISTANTS.find(a => a.voiceId === selectedVoiceId) || DIRECTOR_ASSISTANTS[0]

  return (
    <div className={cn('p-4 border-b border-gray-200 dark:border-gray-700', className)}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider mb-2 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-blue-500" />
          <span>Production Assistant</span>
        </div>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="space-y-3 mt-3">
          <Select value={selectedVoiceId || ''} onValueChange={handleVoiceSelect}>
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Select assistant..." />
            </SelectTrigger>
            <SelectContent>
              {DIRECTOR_ASSISTANTS.map((asst) => (
                <SelectItem key={asst.id} value={asst.voiceId}>
                  {asst.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAssistant && (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 rounded-lg space-y-1.5">
              <p className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                Voice Profile
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {selectedAssistant.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
