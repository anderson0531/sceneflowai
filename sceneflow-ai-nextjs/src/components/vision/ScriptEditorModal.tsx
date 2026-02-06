'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'

import { Loader, Edit, Wand2, Check, Eye, Mic, Square } from 'lucide-react'
import { toast } from 'sonner'
import { useProcessWithOverlay } from '../../hooks/useProcessWithOverlay'
import { detectCharacterChanges } from '@/lib/character/detection'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface ScriptEditorModalProps {
  isOpen: boolean
  onClose: () => void
  script: any  // Full script object with scenes array
  projectId: string
  characters: any[]
  onApplyChanges: (revisedScript: any) => void
  initialInstruction?: string
}

const SCRIPT_INSTRUCTION_TEMPLATES = [
  {
    id: 'improve-pacing',
    label: 'Improve Overall Pacing',
    text: 'Improve the pacing across all scenes. Tighten slow sections and expand rushed moments.'
  },
  {
    id: 'strengthen-arc',
    label: 'Strengthen Narrative Arc',
    text: 'Strengthen the overall narrative arc. Ensure clear setup, conflict escalation, and satisfying resolution.'
  },
  {
    id: 'character-consistency',
    label: 'Character Consistency',
    text: 'Ensure character voices and behaviors are consistent throughout the script.'
  },
  {
    id: 'tone-coherence',
    label: 'Unify Tone',
    text: 'Unify the tone and mood across all scenes to create a cohesive viewing experience.'
  },
  {
    id: 'visual-cohesion',
    label: 'Visual Cohesion',
    text: 'Improve visual storytelling consistency and create a unified visual style.'
  },
  {
    id: 'dialogue-polish',
    label: 'Polish All Dialogue',
    text: 'Polish dialogue throughout the script for naturalness, subtext, and character voice.'
  },
  {
    id: 'emotional-beats',
    label: 'Emotional Beats',
    text: 'Strengthen emotional beats and ensure proper build-up to key moments.'
  },
  {
    id: 'scene-transitions',
    label: 'Scene Transitions',
    text: 'Improve transitions between scenes for better flow and continuity.'
  }
]

export function ScriptEditorModal({
  isOpen,
  onClose,
  script,
  projectId,
  characters,
  onApplyChanges,
  initialInstruction
}: ScriptEditorModalProps) {
  const [customInstruction, setCustomInstruction] = useState(initialInstruction || '')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizedScript, setOptimizedScript] = useState<any | null>(null)
  const [changesSummary, setChangesSummary] = useState<any[]>([])
  const [showComparison, setShowComparison] = useState(false)
  
  // Update custom instruction when initialInstruction changes (e.g., from Revise Script button)
  useEffect(() => {
    if (initialInstruction) {
      setCustomInstruction(initialInstruction)
    }
  }, [initialInstruction])
  
  // Multi-select state
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>([])
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])
  const { execute } = useProcessWithOverlay()
  // Batch pass selector
  const [batchPriority, setBatchPriority] = useState<'high' | 'medium' | 'low'>('high')
  const [batchCategories, setBatchCategories] = useState<string[]>(['structure'])
  const {
    supported: sttSupported,
    isSecure: sttSecure,
    permission: micPermission,
    isRecording: isMicRecording,
    transcript: micTranscript,
    error: micError,
    start: startMic,
    stop: stopMic,
    setTranscript: setMicTranscript
  } = useSpeechRecognition()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomInstruction('')
      setIsOptimizing(false)
      setOptimizedScript(null)
      setChangesSummary([])
      setShowComparison(false)
      setSelectedOptimizations([])
      setSelectedScenes([])
    }
  }, [isOpen])

  // Auto-update custom instructions when selections change
  useEffect(() => {
    const selectedTexts = SCRIPT_INSTRUCTION_TEMPLATES
      .filter(t => selectedOptimizations.includes(t.id))
      .map(t => t.text)
    
    if (selectedTexts.length > 0) {
      setCustomInstruction(selectedTexts.join('\n\n'))
    }
  }, [selectedOptimizations])

  // Track the base instruction text (before voice input started)
  const baseInstructionRef = useRef<string>('')
  
  // When recording starts, save the current instruction as base
  useEffect(() => {
    if (isMicRecording) {
      baseInstructionRef.current = customInstruction
    }
  }, [isMicRecording])
  
  // Update instruction with voice transcript
  useEffect(() => {
    if (!isMicRecording) return
    if (!micTranscript) return
    
    // Combine base instruction with current transcript
    const base = baseInstructionRef.current.trim()
    const newInstruction = base ? `${base} ${micTranscript}` : micTranscript
    setCustomInstruction(newInstruction)
  }, [isMicRecording, micTranscript])

  const handleVoiceToggle = () => {
    if (!sttSupported || !sttSecure) return
    if (isMicRecording) {
      stopMic()
      // Keep the final transcript in the instruction
      baseInstructionRef.current = customInstruction
      setMicTranscript('')
      return
    }
    // Save current instruction as base before starting
    baseInstructionRef.current = customInstruction
    setMicTranscript('')
    startMic()
  }

  const handleGeneratePreview = async () => {
    let instruction = customInstruction.trim()
    
    if (!instruction && selectedOptimizations.length === 0) {
      toast.error('Please select optimizations or enter custom instructions')
      return
    }
    
    try {
      setIsOptimizing(true)
      await execute(async () => {
        let response = await fetch('/api/vision/optimize-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId, 
            script, 
            instruction, 
            characters
          })
        })
        if (!response.ok) {
          if (response.status === 422) {
            // Retry with compact response to avoid truncation/parse issues
            const msg = 'Preview was large; retrying compact version...'
            console.warn('[Script Optimization] 422 from server. ' + msg)
            toast.message(msg)
            response = await fetch('/api/vision/optimize-script', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                projectId, 
                script, 
                instruction, 
                characters, 
                compact: true
              })
            })
          }
          if (!response.ok) throw new Error('Optimization failed')
        }
        const data = await response.json()
        setOptimizedScript(data.optimizedScript)
        setChangesSummary(data.changesSummary || [])
        // Determine if any scene changed; if not, notify and keep comparison hidden
        const anyChanged = (() => {
          try {
            const original = script?.scenes || []
            const revised = data.optimizedScript?.scenes || []
            for (let i = 0; i < Math.min(original.length, revised.length); i++) {
              const o = original[i], r = revised[i]
              const n0 = (o?.narration || '').trim(), n1 = (r?.narration || '').trim()
              const a0 = (o?.action || '').trim(), a1 = (r?.action || '').trim()
              const d0 = Array.isArray(o?.dialogue) ? o.dialogue.length : 0
              const d1 = Array.isArray(r?.dialogue) ? r.dialogue.length : 0
              if (n0 !== n1 || a0 !== a1 || d0 !== d1 || (o?.heading || '') !== (r?.heading || '')) return true
            }
            return false
          } catch { return false }
        })()
        if (!anyChanged) {
          toast.message('No changes returned for the current instruction.')
          setShowComparison(false)
        } else {
          setShowComparison(true)
          setTab('instructions')
        }
        if (data.optimizedScript?.scenes) {
          setSelectedScenes(data.optimizedScript.scenes.map((_: any, idx: number) => idx))
        }
        toast.success('Preview generated successfully')
      }, { message: 'Generating your preview with optimized scenes...', estimatedDuration: 25 })
    } catch (error: any) {
      console.error('[Script Optimization] Error:', error)
      try {
        const body = await (error?.response?.json?.() || Promise.resolve(null))
        if (body?.diagnosticId) toast.error(`Failed to generate preview (id: ${body.diagnosticId})`)
        else toast.error(error.message || 'Failed to generate preview')
      } catch {
        toast.error(error.message || 'Failed to generate preview')
      }
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleBatchOptimize = async () => {
    setIsOptimizing(true)
    try {
      await execute(async () => {
        const startRes = await fetch('/api/vision/optimize-script/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, script, characters, pass: { priority: batchPriority, categories: batchCategories } })
        })
        if (!startRes.ok) throw new Error('Failed to start batch optimization')
        const { jobId } = await startRes.json()

        // Poll
        let done = false
        let attempts = 0
        while (!done && attempts < 300) { // up to ~5 minutes at 1s interval
          await new Promise(r => setTimeout(r, 1000))
          const st = await fetch(`/api/vision/optimize-script/batch/status?jobId=${encodeURIComponent(jobId)}`)
          if (!st.ok) throw new Error('Batch status failed')
          const data = await st.json()
          done = !!data.done
          attempts++
          if (data.error) throw new Error(data.error)
          if (done && data.result) {
            setOptimizedScript(data.result.optimizedScript)
            setChangesSummary(data.result.changesSummary || [])
            setShowComparison(true)
            setTab('instructions')
            if (data.result.optimizedScript?.scenes) {
              setSelectedScenes(data.result.optimizedScript.scenes.map((_: any, idx: number) => idx))
            }
            toast.success('Batch optimization complete')
            break
          }
        }
        if (!done) throw new Error('Batch optimization timed out')
      }, { message: 'Batch optimizing your script scene by scene...', estimatedDuration: 120 })
    } catch (e: any) {
      console.error('[Batch Optimize] Error:', e)
      toast.error(e?.message || 'Batch optimization failed')
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleApply = () => {
    if (!optimizedScript || selectedScenes.length === 0) {
      toast.error('Please select at least one scene to apply')
      return
    }
    
    // Defensive check for script.scenes
    const originalScenes = Array.isArray(script?.scenes) ? script.scenes : []
    const optimizedScenes = Array.isArray(optimizedScript?.scenes) ? optimizedScript.scenes : []
    
    if (originalScenes.length === 0) {
      toast.error('No scenes to apply changes to')
      return
    }
    
    // Merge optimized scenes with original, only for selected indices
    const mergedScenes = originalScenes.map((originalScene: any, idx: number) => {
      if (selectedScenes.includes(idx) && optimizedScenes[idx]) {
        const optimizedScene = optimizedScenes[idx]
        
        // CRITICAL FIX: Sync visualDescription with action when action changes
        // The visualDescription is used for image generation prompts
        // If action was updated but visualDescription wasn't returned, sync them
        const mergedScene = {
          ...originalScene,  // Preserve original metadata (imageUrl, etc.)
          ...optimizedScene, // Apply optimized content
        }
        
        // If the action changed and no visualDescription was returned, update visualDescription
        if (optimizedScene.action && !optimizedScene.visualDescription) {
          mergedScene.visualDescription = optimizedScene.action
        }
        
        return mergedScene
      }
      return originalScene
    })
    
    const updatedScript = {
      scenes: mergedScenes
    }
    
    // Detect character changes
    const characterChanges = detectCharacterChanges(mergedScenes, characters)
    
    // Notify about character changes
    if (characterChanges.new.length > 0) {
      toast.message(`Found ${characterChanges.new.length} new character(s): ${characterChanges.new.map(c => c.name).join(', ')}. Add them in the Character Library.`)
    }
    if (characterChanges.removed.length > 0) {
      toast.message(`${characterChanges.removed.length} character(s) no longer appear: ${characterChanges.removed.map(c => c.name).join(', ')}. Consider removing them.`)
    }
    
    onApplyChanges(updatedScript)
    toast.success(`Applied changes to ${selectedScenes.length} scene(s)`)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Edit Script</DialogTitle>
          <DialogDescription>
            Optimize your entire script with AI-powered Flow Assist
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
                {showComparison && optimizedScript ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                        Optimization Summary
                      </h3>
                      <div className="space-y-2">
                        {changesSummary.map((change, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="font-medium text-blue-800 dark:text-blue-200">
                              {change.category}
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 text-xs mt-1">
                              {change.changes}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Batch Pass Selector */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-600 dark:text-gray-400">Batch pass: apply only selected categories, ordered by priority.</div>
                      <div className="flex items-center gap-2">
                        <select
                          className="text-xs bg-transparent border rounded px-2 py-1"
                          value={batchPriority}
                          onChange={(e) => setBatchPriority(e.target.value as any)}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                        <select
                          multiple
                          className="text-xs bg-transparent border rounded px-2 py-1"
                          value={batchCategories}
                          onChange={(e) => {
                            const opts = Array.from(e.target.selectedOptions).map(o => o.value)
                            setBatchCategories(opts)
                          }}
                        >
                          <option value="structure">Structure</option>
                          <option value="character">Character</option>
                          <option value="dialogue">Dialogue</option>
                          <option value="tone">Tone</option>
                          <option value="visual">Visual</option>
                          <option value="clarity">Clarity</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Select/Deselect All */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Scene Changes ({selectedScenes.length} selected)
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedScenes((optimizedScript?.scenes || []).map((_: any, idx: number) => idx))}
                        >
                          Select All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedScenes([])}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    
                    {/* Scene Comparisons */}
                    <div className="space-y-4">
                      {optimizedScript.scenes?.map((optimizedScene: any, idx: number) => {
                        const originalScene = script.scenes?.[idx]
                        if (!originalScene) return null
                        
                        const isSelected = selectedScenes.includes(idx)
                        
                        return (
                          <div
                            key={idx}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedScenes(prev => prev.filter(i => i !== idx))
                              } else {
                                setSelectedScenes(prev => [...prev, idx])
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="font-medium mb-2 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                  <span>Scene {idx + 1}: {optimizedScene.heading || 'Untitled'}</span>
                                  {optimizedScene.effectSummary && (
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                      {optimizedScene.effectSummary}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Before/After Comparison */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 mb-1">Before</div>
                                    <div className="text-gray-700 dark:text-gray-300 text-xs">
                                      <div className="mb-1">
                                        <span className="font-medium">Narration:</span>{' '}
                                        {originalScene.narration?.substring(0, 100) || 'None'}...
                                      </div>
                                      <div>
                                        <span className="font-medium">Dialogue:</span>{' '}
                                        {originalScene.dialogue?.length || 0} lines
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-blue-500 mb-1">After</div>
                                    <div className="text-gray-900 dark:text-gray-100 text-xs">
                                      <div className="mb-1">
                                        <span className="font-medium">Narration:</span>{' '}
                                        {optimizedScene.narration?.substring(0, 100) || 'None'}...
                                      </div>
                                      <div>
                                        <span className="font-medium">Dialogue:</span>{' '}
                                        {optimizedScene.dialogue?.length || 0} lines
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Template Instructions */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-blue-600" />
                        Common Optimizations
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {SCRIPT_INSTRUCTION_TEMPLATES.map(template => (
                          <Button
                            key={template.id}
                            size="sm"
                            variant={selectedOptimizations.includes(template.id) ? "default" : "outline"}
                            onClick={() => {
                              if (selectedOptimizations.includes(template.id)) {
                                setSelectedOptimizations(prev => prev.filter(id => id !== template.id))
                              } else {
                                setSelectedOptimizations(prev => [...prev, template.id])
                              }
                            }}
                            className={`justify-start text-left h-auto py-3 px-3 ${
                              selectedOptimizations.includes(template.id) 
                                ? 'bg-blue-600 text-white hover:bg-blue-500' 
                                : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                            }`}
                          >
                            <div className="flex items-start gap-2 w-full">
                              {selectedOptimizations.includes(template.id) && (
                                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              )}
                              <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                              <div className="text-left">
                                <div className="font-medium text-xs">{template.label}</div>
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Instruction */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Edit className="w-4 h-4 text-green-600" />
                        Custom Instructions
                      </h3>
                      <div className="space-y-2">
                        <div className="flex flex-col gap-2">
                          <Textarea
                            value={customInstruction}
                            onChange={(e) => setCustomInstruction(e.target.value)}
                            placeholder="Describe how you want to optimize your script...
Examples:
• Make the pacing more dynamic and cut unnecessary scenes
• Strengthen the emotional arc and character development
• Unify the visual style across all scenes
• Polish dialogue for more natural, subtext-rich conversations"
                            className="min-h-[200px] text-sm"
                          />
                          <div className="flex items-center justify-between gap-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleVoiceToggle}
                              disabled={!sttSupported || !sttSecure}
                              className={`flex items-center gap-2 ${isMicRecording ? 'border-red-500 text-red-400' : ''}`}
                              aria-label={isMicRecording ? 'Stop voice input' : 'Start voice input'}
                            >
                              {isMicRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                              <span>
                                {isMicRecording ? 'Stop Recording' : 'Voice Input'}
                              </span>
                            </Button>
                            {isMicRecording && (
                              <span className="text-xs text-red-400 animate-pulse">Listening...</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          💡 Be specific about what to optimize. The more detailed your instructions, the better the results.
                        </p>
                        {!sttSupported && (
                          <p className="text-xs text-amber-500">
                            Voice input is unavailable in this browser. Try Chrome on HTTPS or localhost.
                          </p>
                        )}
                        {sttSupported && !sttSecure && (
                          <p className="text-xs text-amber-500">
                            Voice input requires a secure context (HTTPS or localhost).
                          </p>
                        )}
                        {micError && (
                          <p className="text-xs text-red-500">
                            Mic error: {micError}
                          </p>
                        )}
                        {micPermission && micPermission !== 'granted' && (
                          <p className="text-xs text-amber-400">
                            Microphone permission: {micPermission}. Update browser settings to enable voice input.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <Button
                        onClick={handleGeneratePreview}
                        disabled={isOptimizing || (!customInstruction.trim() && selectedOptimizations.length === 0)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6"
                      >
                        {isOptimizing ? (
                          <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            Generating Preview...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Generate Preview
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {showComparison && (
              <Button
                onClick={handleApply}
                disabled={!optimizedScript || isOptimizing || selectedScenes.length === 0}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply {selectedScenes.length} Scene(s)
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
