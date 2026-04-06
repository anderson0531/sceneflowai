'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Loader, Sparkles, ChevronDown, ChevronUp, Wand2, Mic, MicOff } from 'lucide-react'
import { toast } from 'sonner'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { VOICE_TRAIT_CATEGORIES } from '@/lib/constants/director-note-templates'

interface DirectorNoteBuilderDialogProps {
  isOpen: boolean
  onClose: () => void
  initialPrompt?: string
  characterContext?: any
  screenplayContext?: any
  onSave: (prompt: string) => void
}

export function DirectorNoteBuilderDialog({
  isOpen,
  onClose,
  initialPrompt = '',
  characterContext,
  screenplayContext,
  onSave,
}: DirectorNoteBuilderDialogProps) {
  // Selected templates (store IDs)
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  
  // Custom instruction text
  const [customInstruction, setCustomInstruction] = useState(initialPrompt)
  
  // Expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(VOICE_TRAIT_CATEGORIES.map(c => c.id))
  )
  
  const [isGenerating, setIsGenerating] = useState(false)
  
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

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplates(new Set())
      setCustomInstruction(initialPrompt)
    }
  }, [isOpen, initialPrompt])

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
      
      // If turning on, we should probably turn off other templates in the same category
      // to avoid conflicting instructions like "young adult" AND "elderly".
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

  const handleAutoFill = async () => {
    if (!characterContext) {
      toast.error('Character context is required to auto-fill.')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/tts/google/director-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterContext, screenplayContext }),
      })

      if (!response.ok) throw new Error('Failed to generate prompt')
      const data = await response.json()
      
      if (data.script) {
        setCustomInstruction(data.script)
        setSelectedTemplates(new Set()) // Clear templates since we just generated a full text
        toast.success("Auto-filled Director's Note!")
      }
    } catch (error) {
      console.error('[DirectorNoteBuilder] Error:', error)
      toast.error('Failed to auto-fill prompt')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = () => {
    // Build instruction from templates
    const selectedInstructions: string[] = []
    
    VOICE_TRAIT_CATEGORIES.forEach(category => {
      category.templates.forEach(template => {
        if (selectedTemplates.has(template.id)) {
          selectedInstructions.push(template.instruction)
        }
      })
    })
    
    // Combine template instructions with custom text
    let finalPrompt = customInstruction.trim()
    
    if (selectedInstructions.length > 0) {
      const builtPrompt = `A voice that is ${selectedInstructions.join(', ')}.`
      
      if (finalPrompt) {
        finalPrompt = `${builtPrompt}\n\n${finalPrompt}`
      } else {
        finalPrompt = builtPrompt
      }
    }
    
    onSave(finalPrompt)
    onClose()
  }

  const hasSelections = selectedTemplates.size > 0 || customInstruction.trim().length > 0
  const name = characterContext?.name || 'the speaker'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Director's Note (Audio Profile)
          </DialogTitle>
          <DialogDescription>
            Shape the exact vocal characteristics, tone, and pacing for {name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2 custom-scrollbar">
          
          <div className="flex items-center justify-between bg-cyan-950/20 p-3 rounded-lg border border-cyan-900/30">
            <div>
              <h4 className="text-sm font-medium text-cyan-400 flex items-center gap-1.5">
                <Wand2 className="w-4 h-4" />
                AI Assistant
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Automatically generate a profile based on {name}'s character sheet.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFill}
              disabled={isGenerating || !characterContext}
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
                    className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
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
                                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750'
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

          <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                ✏️ Custom Instructions & Refinements
              </label>
              {sttSupported && sttSecure && (
                <Button
                  variant={isMicRecording ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleVoiceToggle}
                  className={`h-7 ${isMicRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
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
            <Textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g., Make the speaker sound like a 50-year-old professor from London, slightly raspy, speaking with a gentle, scholarly authority."
              className="min-h-[100px] text-sm bg-white dark:bg-gray-900 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              Save Profile
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
