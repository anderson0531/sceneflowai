'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader, Edit, Wand2, Check, AlertTriangle, Eye } from 'lucide-react'
import { ScriptComparisonPanel } from './ScriptComparisonPanel'
import { toast } from 'sonner'

interface ScriptEditorModalProps {
  isOpen: boolean
  onClose: () => void
  script: any  // Full script object with scenes array
  projectId: string
  characters: any[]
  onApplyChanges: (revisedScript: any) => void
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
  onApplyChanges
}: ScriptEditorModalProps) {
  const [tab, setTab] = useState<'instructions' | 'flow'>('instructions')
  const [customInstruction, setCustomInstruction] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizedScript, setOptimizedScript] = useState<any | null>(null)
  const [changesSummary, setChangesSummary] = useState<any[]>([])
  const [showComparison, setShowComparison] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab('instructions')
      setCustomInstruction('')
      setIsOptimizing(false)
      setOptimizedScript(null)
      setChangesSummary([])
      setShowComparison(false)
    }
  }, [isOpen])

  const handleOptimize = async () => {
    if (!customInstruction.trim()) {
      toast.error('Please enter an instruction')
      return
    }
    
    setIsOptimizing(true)
    try {
      const response = await fetch('/api/vision/optimize-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          script,
          instruction: customInstruction,
          characters
        })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Optimization failed' }))
        throw new Error(error.error || 'Optimization failed')
      }
      
      const data = await response.json()
      setOptimizedScript(data.optimizedScript)
      setChangesSummary(data.changesSummary || [])
      setShowComparison(true)
      setTab('instructions') // Show comparison on instructions tab
      toast.success('Script optimized successfully')
    } catch (error: any) {
      console.error('[Script Optimization] Error:', error)
      toast.error(error.message || 'Failed to optimize script')
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleApply = () => {
    if (optimizedScript) {
      onApplyChanges(optimizedScript)
      toast.success('Script updated successfully')
      onClose()
    }
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

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instructions">
              <Edit className="w-4 h-4 mr-2" />
              Instructions
            </TabsTrigger>
            <TabsTrigger value="flow">
              <Wand2 className="w-4 h-4 mr-2" />
              Flow Assist
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'instructions' && (
              <div className="space-y-6">
                {showComparison && optimizedScript ? (
                  <ScriptComparisonPanel
                    originalScript={script}
                    optimizedScript={optimizedScript}
                    changesSummary={changesSummary}
                  />
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
                            variant="outline"
                            onClick={() => setCustomInstruction(template.text)}
                            className="justify-start text-left h-auto py-3 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <div className="flex items-start gap-2 w-full">
                              <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                              <div className="text-left">
                                <div className="font-medium text-xs text-gray-900 dark:text-gray-100">
                                  {template.label}
                                </div>
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        💡 Be specific about what to optimize. The more detailed your instructions, the better the results.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        💡 Pro Tips
                      </h4>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Focus on the overall narrative structure, not individual scenes</li>
                        <li>• Mention the specific tone or mood you want to achieve</li>
                        <li>• Reference character arcs or plot points that need strengthening</li>
                        <li>• Consider the viewing experience as a whole</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'flow' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Wand2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">AI-Powered Script Optimization</h3>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Describe what you'd like to optimize and our AI will holistically improve your entire script while preserving its essence.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-300 mb-2 block">Optimization Instructions</label>
                  <Textarea
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                    rows={6}
                    placeholder="Examples:
• Optimize the pacing to eliminate lag and improve flow
• Strengthen character arcs and ensure consistent development
• Unify visual style and improve visual storytelling
• Polish all dialogue for authenticity and subtext"
                  />
                  <div className="mt-2 text-xs text-gray-400">
                    💡 Tip: Be specific about what to optimize and what to preserve
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    onClick={handleOptimize}
                    disabled={isOptimizing || !customInstruction.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed px-6"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Optimize Script
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!optimizedScript || isOptimizing}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply Changes
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

