'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Wand2, Play, Pause, Loader, Sparkles, RefreshCw, Check, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { generateVoiceDesignPrompt, CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'

interface VoicePreview {
  generatedVoiceId: string
  audioBase64: string
}

interface VoiceDesignPanelProps {
  onVoiceCreated: (voiceId: string, voiceName: string) => void
  characterContext?: CharacterContext
  screenplayContext?: ScreenplayContext
}

export function VoiceDesignPanel({ 
  onVoiceCreated, 
  characterContext,
  screenplayContext 
}: VoiceDesignPanelProps) {
  const [voiceDescription, setVoiceDescription] = useState('')
  const [voiceName, setVoiceName] = useState(characterContext?.name ? `${characterContext.name}'s Voice` : '')
  const [previewText, setPreviewText] = useState("Hello, this is a preview of my voice. I'm excited to be part of your project!")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [previews, setPreviews] = useState<VoicePreview[]>([])
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)
  const [playingPreview, setPlayingPreview] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Auto-generate description from character context
  useEffect(() => {
    if (characterContext && !voiceDescription) {
      const autoDescription = generateVoiceDesignPrompt(characterContext, screenplayContext)
      setVoiceDescription(autoDescription)
    }
  }, [characterContext, screenplayContext])

  const handleGeneratePreviews = async () => {
    if (!voiceDescription.trim()) {
      toast.error('Please describe the voice you want to create')
      return
    }

    if (voiceDescription.length < 20) {
      toast.error('Please provide a more detailed description (at least 20 characters)')
      return
    }

    setIsGenerating(true)
    setPreviews([])
    setSelectedPreview(null)

    try {
      const response = await fetch('/api/tts/elevenlabs/voice-design/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceDescription: voiceDescription.trim(),
          previewText: previewText.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate voice previews')
      }

      setPreviews(data.previews || [])
      
      if (data.previews?.length > 0) {
        toast.success(`Generated ${data.previews.length} voice preview(s)! Listen and select one.`)
      } else {
        toast.warning('No previews generated. Try a different description.')
      }
    } catch (error) {
      console.error('[Voice Design] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate previews')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePlayPreview = (preview: VoicePreview) => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (playingPreview === preview.generatedVoiceId) {
      setPlayingPreview(null)
      return
    }

    // Create new audio from base64
    const audio = new Audio(`data:audio/mpeg;base64,${preview.audioBase64}`)
    audio.onended = () => {
      setPlayingPreview(null)
      audioRef.current = null
    }
    audio.onerror = () => {
      setPlayingPreview(null)
      audioRef.current = null
      toast.error('Failed to play audio')
    }
    
    audioRef.current = audio
    setPlayingPreview(preview.generatedVoiceId)
    audio.play()
  }

  const handleCreateVoice = async () => {
    if (!selectedPreview) {
      toast.error('Please select a voice preview first')
      return
    }

    if (!voiceName.trim()) {
      toast.error('Please enter a name for your voice')
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/tts/elevenlabs/voice-design/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceName: voiceName.trim(),
          voiceDescription: voiceDescription.trim(),
          generatedVoiceId: selectedPreview,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create voice')
      }

      toast.success(`Voice "${voiceName}" created successfully!`)
      onVoiceCreated(data.voice.id, data.voice.name)
    } catch (error) {
      console.error('[Voice Design] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create voice')
    } finally {
      setIsCreating(false)
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
        <div className="text-sm text-purple-300">
          <p className="font-medium mb-1">Design a Voice with AI</p>
          <p className="text-purple-400/80">
            Describe the voice you want to create and our AI will generate unique voice options for you to choose from.
          </p>
        </div>
      </div>

      {/* Voice Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Voice Name</label>
        <input
          type="text"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="Enter a name for this voice..."
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Voice Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">Voice Description</label>
          {characterContext && (
            <button
              onClick={() => {
                const autoDesc = generateVoiceDesignPrompt(characterContext, screenplayContext)
                setVoiceDescription(autoDesc)
              }}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <Wand2 className="w-3 h-3" />
              Auto-generate from character
            </button>
          )}
        </div>
        <textarea
          value={voiceDescription}
          onChange={(e) => setVoiceDescription(e.target.value)}
          placeholder="Describe the voice: gender, age, tone, accent, personality...&#10;e.g., 'A warm, mature female voice with a slight British accent, calm and reassuring'"
          rows={4}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>{voiceDescription.length}/1000 characters</span>
          <span>Minimum 20 characters</span>
        </div>
      </div>

      {/* Preview Text (Optional) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Preview Text <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Text to speak in the preview..."
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGeneratePreviews}
        disabled={isGenerating || voiceDescription.length < 20}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      >
        {isGenerating ? (
          <>
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Generating Voice Options...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Voice Previews
          </>
        )}
      </Button>

      {/* Voice Previews */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Select a Voice</label>
            <button
              onClick={handleGeneratePreviews}
              disabled={isGenerating}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>
          
          <div className="grid gap-2">
            {previews.map((preview, index) => (
              <div
                key={preview.generatedVoiceId}
                onClick={() => setSelectedPreview(preview.generatedVoiceId)}
                className={`
                  flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-all
                  ${selectedPreview === preview.generatedVoiceId
                    ? 'bg-purple-600/20 border border-purple-500/50 ring-1 ring-purple-500'
                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {selectedPreview === preview.generatedVoiceId ? (
                    <Check className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-gray-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    selectedPreview === preview.generatedVoiceId ? 'text-purple-300' : 'text-gray-300'
                  }`}>
                    Voice Option {index + 1}
                  </span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePlayPreview(preview)
                  }}
                  className={`
                    p-2 rounded-full transition-colors
                    ${playingPreview === preview.generatedVoiceId
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }
                  `}
                >
                  {playingPreview === preview.generatedVoiceId ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Voice Button */}
      {previews.length > 0 && (
        <Button
          onClick={handleCreateVoice}
          disabled={isCreating || !selectedPreview || !voiceName.trim()}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {isCreating ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Creating Voice...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Create This Voice
            </>
          )}
        </Button>
      )}
    </div>
  )
}
