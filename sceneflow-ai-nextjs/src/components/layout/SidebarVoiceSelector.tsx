'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Volume2, VolumeX, Loader, ChevronDown, ChevronUp, Play, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DIRECTOR_ASSISTANTS, applyAssistantStyle } from '@/lib/tts/productionAssistants'
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
  const storeUserName = useStore(s => s.user?.name)

  const [firstName, setFirstName] = useState<string>('Director')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  // Try to determine user's first name
  useEffect(() => {
    if (storeUserName) {
      setFirstName(storeUserName.split(' ')[0])
    } else {
      try {
        const stored = localStorage.getItem('authUserName')
        if (stored && stored.trim()) {
          setFirstName(stored.split(' ')[0])
        }
      } catch (e) {}
    }
  }, [storeUserName])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
    setIsLoading(false)
  }

  const handleListen = async () => {
    if (isPlaying) {
      stopAudio()
      return
    }

    const selectedAssistant = DIRECTOR_ASSISTANTS.find(a => a.voiceId === selectedVoiceId) || DIRECTOR_ASSISTANTS[0]
    const message = `Hi ${firstName}. I'm ${selectedAssistant.name}, your ${selectedAssistant.title}. ${selectedAssistant.pitch} I will be your voice for this session.`
    
    // Add persona instructions
    const styledMessage = applyAssistantStyle(message, selectedAssistant.id)

    setIsLoading(true)
    try {
      const response = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: styledMessage,
          voiceId: selectedAssistant.voiceId,
          language: 'en'
        })
      })

      if (!response.ok) throw new Error('TTS failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      stopAudio() // ensure old is stopped
      
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => setIsPlaying(false)
      audioRef.current.onerror = () => setIsPlaying(false)
      
      await audioRef.current.play()
      setIsPlaying(true)
    } catch (error) {
      console.error('Failed to play preview:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
    stopAudio()
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
            <SelectTrigger className="w-full h-auto min-h-[44px] py-1.5 px-3 bg-gray-800/40 hover:bg-gray-800 transition-colors border border-gray-700/60 rounded-xl [&>span]:line-clamp-none [&>span]:w-full [&>span]:flex-1">
              <SelectValue placeholder="Select assistant...">
                {selectedAssistant && (
                  <div className="flex items-center gap-3 text-left w-full min-w-0">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm border border-white/10", selectedAssistant.avatar.color)}>
                      {selectedAssistant.avatar.initials}
                    </div>
                    <div className="flex flex-col min-w-0 overflow-hidden pr-2">
                      <span className="font-semibold text-[13px] text-gray-200 truncate">{selectedAssistant.name}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider truncate">{selectedAssistant.title}</span>
                    </div>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {DIRECTOR_ASSISTANTS.map((asst) => (
                <SelectItem key={asst.id} value={asst.voiceId} className="py-2.5 px-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm border border-white/10", asst.avatar.color)}>
                      {asst.avatar.initials}
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="font-medium text-[13px] text-gray-200 truncate">{asst.name}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{asst.title}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAssistant && (
            <div className="p-3.5 bg-gray-800/30 border border-gray-700/50 rounded-xl space-y-3 relative overflow-hidden">
              {/* Subtle colored glow in the background based on assistant color */}
              <div className={cn("absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none", selectedAssistant.avatar.color)} />
              
              <div className="flex items-center justify-between relative z-10">
                <p className="text-[11px] font-medium text-gray-400">
                  Voice Profile
                </p>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleListen}
                  disabled={isLoading}
                  className="h-7 px-3 text-[11px] bg-white/5 hover:bg-white/10 text-gray-200 border border-white/5 rounded-full"
                >
                  {isLoading ? (
                    <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : isPlaying ? (
                    <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  )}
                  {isPlaying ? 'Stop' : 'Listen'}
                </Button>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed relative z-10">
                {selectedAssistant.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
