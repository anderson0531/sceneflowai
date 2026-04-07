'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Loader, Sparkles, ChevronDown, ChevronUp, Wand2, Play, Square, FileText } from 'lucide-react'
import { toast } from 'sonner'
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
  
  // Expanded categories (default to closed)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // Editor tab mode ('guided' vs 'character')
  const [editorTab, setEditorTab] = useState<'guided' | 'character'>('guided')
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

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
      toast.error('Character context is required to generate.')
      return
    }

    setIsGenerating(true)
    try {
      const selectedInstructions: string[] = []
      VOICE_TRAIT_CATEGORIES.forEach(category => {
        category.templates.forEach(template => {
          if (selectedTemplates.has(template.id)) {
            selectedInstructions.push(template.label) // use label for prompt context
          }
        })
      })

      const response = await fetch('/api/tts/google/director-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          characterContext: characterContext || { name: 'the speaker', role: 'narrator' }, 
          screenplayContext,
          selectedInstructions
        }),
      })

      if (!response.ok) throw new Error('Failed to generate prompt')
      const data = await response.json()
      
      if (data.script) {
        setCustomInstruction(data.script)
        toast.success("Generated Voice Direction!")
      }
    } catch (error) {
      console.error('[VoiceDirectionEditor] Error:', error)
      toast.error('Failed to generate Voice Direction')
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
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Voice Direction
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Shaping <span className="text-gray-300 font-medium">{voiceName.replace(/ \((Gemini|Studio)\)/i, '')}</span> for {name}
          </p>
        </div>
      </div>

      {/* Segmented Control */}
      <div className="px-4 pt-4 shrink-0">
        <div className="flex p-1 bg-gray-900 border border-gray-800 rounded-lg">
          <button
            onClick={() => setEditorTab('guided')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              editorTab === 'guided' 
                ? 'bg-cyan-900/40 text-cyan-300 shadow-sm' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Guided
          </button>
          <button
            onClick={() => setEditorTab('character')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              editorTab === 'character' 
                ? 'bg-cyan-900/40 text-cyan-300 shadow-sm' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Character Match
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col">
        {editorTab === 'guided' && (
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
        )}

        {editorTab === 'character' && (
          <div className="flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Text Direction
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoFill}
                disabled={isGenerating}
                className="border-cyan-700/50 hover:bg-cyan-900/30 text-cyan-300 h-7"
              >
                {isGenerating ? (
                  <Loader className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Generate
              </Button>
            </div>
            <p className="text-[11px] text-gray-400">
              The AI will generate a comprehensive voice direction based on the character's profile and any currently selected guides. You can test and refine the generated text below.
            </p>
            <Textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g., Make the speaker sound like a 50-year-old professor from London, slightly raspy, speaking with a gentle, scholarly authority."
              className="flex-1 min-h-[200px] text-sm bg-gray-900 border-gray-700 text-gray-200 resize-y focus:border-cyan-500/50 focus:ring-cyan-500/20"
            />
          </div>
        )}
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
            Close
          </Button>
          <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white">
            Confirm Selection
          </Button>
        </div>
      </div>
    </div>
  )
}
