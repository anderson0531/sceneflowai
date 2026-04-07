'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Loader, Sparkles, ChevronDown, ChevronUp, Wand2, Mic, MicOff, Play, Square, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { VOICE_TRAIT_CATEGORIES } from '@/lib/constants/director-note-templates'

interface VoiceDirectionEditorProps {
  voiceId: string
  voiceName: string
  initialPrompt?: string
  characterContext?: any
  screenplayContext?: any
  onSave: (prompt: string) => void
  onCancel: () => void
}

export function VoiceDirectionEditor({
  voiceId,
  voiceName,
  initialPrompt = '',
  characterContext,
  screenplayContext,
  onSave,
  onCancel
}: VoiceDirectionEditorProps) {
  // Selected templates (store IDs)
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  
  // Custom instruction text
  const [customInstruction, setCustomInstruction] = useState(initialPrompt)
  
  // Expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(VOICE_TRAIT_CATEGORIES.map(c => c.id))
  )
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Speech recognition for voice input
  const {
    supported: sttSupported,
    isSecure: sttSecure,
    isRecording: isMicRecording,
    transcript: micTranscript,
    start: startMic,
    stop: stopMic,
    setTranscript: setMicTranscript
  } = useSpeechRecognition()

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Update custom instruction with speech transcript
  const baseInstructionRef = useRef('')
  
  useEffect(() => {
    if (isMicRecording && !baseInstructionRef.current) {
      baseInstructionRef.current = customInstruction
    }
  }, [isMicRecording, customInstruction])
  
  useEffect(() => {
    if (!micTranscript) return
    const base = baseInstructionRef.current.trim()
    setCustomInstruction(base ? `${base} ${micTranscript}` : micTranscript)
  }, [micTranscript])

  const handleVoiceToggle = () => {
    if (!sttSupported || !sttSecure) {
      toast.error('Voice input not available')
      return
    }
    if (isMicRecording) {
      stopMic()
      baseInstructionRef.current = customInstruction
      setMicTranscript('')
    } else {
      baseInstructionRef.current = customInstruction
      setMicTranscript('')
      startMic()
    }
  }

  const toggleTemplate = (categoryId: string, templateId: string) => {
    setSelectedTemplates(prev => {
      const next = new Set(prev)
      
      // If turning on, turn off other templates in the same category
      if (!next.has(templateId)) {
        const category = VOICE_TRAIT_CATEGORIES.find(c => c.id === categoryId)
        if (category) {
          category.templates.forEach(t => next.delete(t.id))
        }
        next.add(templateId)
      } else {
        next.delete(templateId)
      }
      return next
    })
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const getCombinedPrompt = () => {
    const selectedInstructions: string[] = []
    
    VOICE_TRAIT_CATEGORIES.forEach(category => {
      category.templates.forEach(template => {
        if (selectedTemplates.has(template.id)) {
          selectedInstructions.push(template.instruction)
        }
      })
    })
    
    let finalPrompt = customInstruction.trim()
    
    if (selectedInstructions.length > 0) {
      const builtPrompt = `A voice that is ${selectedInstructions.join(', ')}.`
      
      if (finalPrompt) {
        finalPrompt = `${builtPrompt}\n\n${finalPrompt}`
      } else {
        finalPrompt = builtPrompt
      }
    }
    return finalPrompt
  }

  const handleAutoFill = async () => {
    if (!characterContext && !screenplayContext) {
      toast.error('Character context is required to auto-fill.')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/tts/google/director-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          characterContext: characterContext || { name: 'the speaker', role: 'narrator' }, 
          screenplayContext 
        }),
      })

      if (!response.ok) throw new Error('Failed to generate prompt')
      const data = await response.json()
      
      if (data.script) {
        setCustomInstruction(data.script)
        setSelectedTemplates(new Set()) // Clear templates since we just generated a full text
        toast.success("Auto-filled Director's Note!")
      }
    } catch (error) {
      console.error('[VoiceDirectionEditor] Error:', error)
      toast.error('Failed to auto-fill prompt')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleTestVoice = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsPlaying(false)
      return
    }

    setIsTesting(true)
    try {
      const currentPrompt = getCombinedPrompt()
      
      // A generic but evocative test sentence to hear range and emotion
      const sampleText = characterContext?.name 
        ? `"This is how I sound right now. [pause] Let's see if this direction captures my true character."`
        : `"Welcome to the scene. This is a quick test of the voice direction and audio profile."`

      const response = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voiceId,
          ...(currentPrompt ? { prompt: currentPrompt } : {})
        })
      })

      if (!response.ok) throw new Error('TTS failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => setIsPlaying(false)
      audioRef.current.onerror = () => setIsPlaying(false)
      
      await audioRef.current.play()
      setIsPlaying(true)
    } catch (err) {
      console.error('TTS test error:', err)
      toast.error('Failed to generate test audio.')
      setIsPlaying(false)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = () => {
    onSave(getCombinedPrompt())
  }

  const name = characterContext?.name || 'the speaker'

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Voice Direction
            </h3>
            <p className="text-xs text-gray-400">
              Shaping <span className="text-gray-300 font-medium">{voiceName}</span> for {name}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="flex items-center justify-between bg-cyan-950/20 p-3 rounded-lg border border-cyan-900/30">
          <div>
            <h4 className="text-sm font-medium text-cyan-400 flex items-center gap-1.5">
              <Wand2 className="w-4 h-4" />
              AI Assistant
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Automatically generate a profile based on {name}'s context.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoFill}
            disabled={isGenerating}
            className="border-cyan-700/50 hover:bg-cyan-900/30 text-cyan-300"
          >
            {isGenerating ? (
              <Loader className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Auto-fill
          </Button>
        </div>

        <div className="space-y-4">
          {VOICE_TRAIT_CATEGORIES.map((category) => {
            const isExpanded = expandedCategories.has(category.id)
            return (
              <div key={category.id} className="space-y-2">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    {category.label}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="flex flex-wrap gap-2 pl-1">
                    {category.templates.map((template) => {
                      const isSelected = selectedTemplates.has(template.id)
                      return (
                        <button
                          key={template.id}
                          onClick={() => toggleTemplate(category.id, template.id)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-750 text-gray-300'
                          }`}
                        >
                          {template.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="space-y-2 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              ✏️ Custom Instructions & Refinements
            </label>
            <div className="flex items-center gap-2">
              {sttSupported && sttSecure && (
                <Button
                  variant={isMicRecording ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleVoiceToggle}
                  className={`h-7 ${isMicRecording ? 'bg-red-500 hover:bg-red-600 border-transparent text-white' : 'border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800'}`}
                >
                  {isMicRecording ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 mr-1" />
                      Voice
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          <Textarea
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            placeholder="e.g., Make the speaker sound like a 50-year-old professor from London, slightly raspy, speaking with a gentle, scholarly authority."
            className="min-h-[100px] text-sm bg-gray-900 border-gray-700 text-gray-200 resize-none focus:border-cyan-500/50 focus:ring-cyan-500/20"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 flex items-center justify-between bg-gray-900/50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestVoice}
          disabled={isTesting}
          className={`border-cyan-700/50 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 ${isPlaying ? 'bg-cyan-900/40 border-cyan-500' : ''}`}
        >
          {isTesting ? (
            <Loader className="w-4 h-4 animate-spin mr-2" />
          ) : isPlaying ? (
            <Square className="w-4 h-4 mr-2 fill-current" />
          ) : (
            <Play className="w-4 h-4 mr-2 fill-current" />
          )}
          {isPlaying ? 'Stop Test' : 'Test Voice'}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="text-gray-400 hover:text-white">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white">
            Save Voice & Profile
          </Button>
        </div>
      </div>
    </div>
  )
}
