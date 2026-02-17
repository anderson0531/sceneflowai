'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Loader, Sparkles, CheckCircle2, ChevronDown, ChevronUp, Wand2, Mic, MicOff, CheckSquare, Square, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { 
  SCENE_OPTIMIZATION_TEMPLATES,
  SceneAnalysis,
  getScoreColor,
  getScoreBgColor
} from '@/lib/constants/scene-optimization'

interface OptimizeSceneDialogProps {
  isOpen: boolean
  onClose: () => void
  sceneNumber: number
  sceneHeading: string
  sceneAnalysis?: SceneAnalysis
  onOptimize: (instruction: string, selectedRecommendations: string[]) => Promise<void>
  isOptimizing?: boolean
}

export function OptimizeSceneDialog({
  isOpen,
  onClose,
  sceneNumber,
  sceneHeading,
  sceneAnalysis,
  onOptimize,
  isOptimizing = false
}: OptimizeSceneDialogProps) {
  // Selected optimization templates
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  
  // Selected recommendations from analysis
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<number>>(new Set())
  
  // Custom instruction text
  const [customInstruction, setCustomInstruction] = useState('')
  
  // Expanded sections
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [showTemplates, setShowTemplates] = useState(true)
  
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

  // Reset state when dialog opens with new scene
  useEffect(() => {
    if (isOpen) {
      // Pre-select all recommendations by default
      if (sceneAnalysis?.recommendations) {
        setSelectedRecommendations(new Set(sceneAnalysis.recommendations.map((_, i) => i)))
      } else {
        setSelectedRecommendations(new Set())
      }
      setSelectedTemplates(new Set())
      setCustomInstruction('')
    }
  }, [isOpen, sceneNumber, sceneAnalysis])

  // Update custom instruction with speech transcript
  useEffect(() => {
    if (isMicRecording && micTranscript) {
      setCustomInstruction(prev => prev ? `${prev} ${micTranscript}` : micTranscript)
    }
  }, [isMicRecording, micTranscript])

  const handleVoiceToggle = () => {
    if (!sttSupported || !sttSecure) {
      toast.error('Voice input not available')
      return
    }
    if (isMicRecording) {
      stopMic()
      setMicTranscript('')
    } else {
      setMicTranscript('')
      startMic()
    }
  }

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return next
    })
  }

  const toggleRecommendation = (index: number) => {
    setSelectedRecommendations(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleOptimize = async () => {
    // Build instruction from templates
    const templateInstructions = SCENE_OPTIMIZATION_TEMPLATES
      .filter(t => selectedTemplates.has(t.id))
      .map(t => t.instruction)
    
    // Combine with custom instruction
    const allInstructions = [
      ...templateInstructions,
      customInstruction.trim()
    ].filter(Boolean)
    
    const combinedInstruction = allInstructions.join('\n\n')
    
    // Get selected recommendation texts (handle both string and object formats)
    const selectedRecTexts = sceneAnalysis?.recommendations
      ?.filter((_, i) => selectedRecommendations.has(i))
      ?.map(rec => typeof rec === 'string' ? rec : (rec as any)?.text || String(rec)) || []
    
    // Validate we have something to do
    if (!combinedInstruction && selectedRecTexts.length === 0) {
      toast.error('Please select optimizations or enter custom instructions')
      return
    }
    
    await onOptimize(combinedInstruction, selectedRecTexts)
  }

  const hasSelections = selectedTemplates.size > 0 || 
                        selectedRecommendations.size > 0 || 
                        customInstruction.trim().length > 0

  const totalSelections = selectedTemplates.size + selectedRecommendations.size + 
                          (customInstruction.trim() ? 1 : 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Optimize Scene {sceneNumber}
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span className="truncate max-w-[400px]">{sceneHeading}</span>
            {sceneAnalysis && (
              <div className={`flex items-center gap-2 px-2 py-1 rounded ${getScoreBgColor(sceneAnalysis.score)}`}>
                <span className="text-xs text-gray-500 dark:text-gray-400">Score:</span>
                <span className={`font-bold ${getScoreColor(sceneAnalysis.score)}`}>
                  {sceneAnalysis.score}
                </span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Scene Analysis Summary */}
          {sceneAnalysis && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  Pacing: {sceneAnalysis.pacing}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Tension: {sceneAnalysis.tension}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Character: {sceneAnalysis.characterDevelopment}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Visual: {sceneAnalysis.visualPotential}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {sceneAnalysis.notes}
              </p>
            </div>
          )}

          {/* AI Recommendations Section */}
          {sceneAnalysis?.recommendations && sceneAnalysis.recommendations.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowRecommendations(!showRecommendations)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  AI Recommendations ({sceneAnalysis.recommendations.length})
                </span>
                {showRecommendations ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {showRecommendations && (
                <div className="space-y-1.5 pl-1">
                  {sceneAnalysis.recommendations.map((rec, idx) => {
                    const isSelected = selectedRecommendations.has(idx)
                    const recText = typeof rec === 'string' ? rec : (rec as any)?.text || String(rec)
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleRecommendation(idx)}
                        className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700' 
                            : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                        }`}
                      >
                        <button
                          type="button"
                          className="mt-0.5 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRecommendation(idx)
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <span className={`text-sm ${isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                          {recText}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Common Optimizations Grid */}
          <div className="space-y-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <span className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-blue-500" />
                Common Optimizations
              </span>
              {showTemplates ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {showTemplates && (
              <div className="grid grid-cols-2 gap-2">
                {SCENE_OPTIMIZATION_TEMPLATES.map((template) => {
                  const isSelected = selectedTemplates.has(template.id)
                  return (
                    <button
                      key={template.id}
                      onClick={() => toggleTemplate(template.id)}
                      className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                      }`}
                    >
                      <span className="text-lg">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {isSelected && '+ '}{template.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {template.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                ✏️ Custom Instructions
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
              placeholder="Add any specific instructions for improving this scene..."
              className="min-h-[80px] text-sm"
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {hasSelections ? (
                <span>{totalSelections} optimization{totalSelections !== 1 ? 's' : ''} selected</span>
              ) : (
                <span>Select optimizations or add instructions</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isOptimizing}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleOptimize}
                disabled={!hasSelections || isOptimizing}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isOptimizing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Apply Recommendations
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
