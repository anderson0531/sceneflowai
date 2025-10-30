'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader, Edit, Wand2, Check, Eye, Sparkles } from 'lucide-react'
import ScriptRecommendationCard from './ScriptRecommendationCard'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
  
  // Multi-select state
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [filterCategory, setFilterCategory] = useState<'all' | 'pacing' | 'dialogue' | 'visual' | 'character' | 'clarity' | 'emotion'>('all')

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab('instructions')
      setCustomInstruction('')
      setIsOptimizing(false)
      setOptimizedScript(null)
      setChangesSummary([])
      setShowComparison(false)
      setSelectedOptimizations([])
      setRecommendations([])
      setSelectedRecommendations([])
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

  // Auto-trigger analysis when user opens Flow Assist tab, if not already analyzed
  useEffect(() => {
    if (tab === 'flow' && !isAnalyzing && (recommendations?.length || 0) === 0) {
      // Trigger once per open
      handleAnalyze()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/vision/analyze-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          script,
          characters
        })
      })
      
      if (!response.ok) throw new Error('Analysis failed')
      
      const data = await response.json()
      setRecommendations(data.recommendations || [])
      toast.success('Script analysis complete')
    } catch (error: any) {
      console.error('[Script Analysis] Error:', error)
      toast.error(error.message || 'Failed to analyze script')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleGeneratePreview = async () => {
    let instruction = customInstruction.trim()
    
    if (!instruction && selectedOptimizations.length === 0) {
      toast.error('Please select optimizations or enter custom instructions')
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
          instruction,
          characters
        })
      })
      
      if (!response.ok) throw new Error('Optimization failed')
      
      const data = await response.json()
      setOptimizedScript(data.optimizedScript)
      setChangesSummary(data.changesSummary || [])
      setShowComparison(true)
      
      // Auto-select all scenes initially
      if (data.optimizedScript?.scenes) {
        setSelectedScenes(data.optimizedScript.scenes.map((_: any, idx: number) => idx))
      }
      
      toast.success('Preview generated successfully')
    } catch (error: any) {
      console.error('[Script Optimization] Error:', error)
      toast.error(error.message || 'Failed to generate preview')
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleGeneratePreviewFromRecommendations = async () => {
    if (selectedRecommendations.length === 0) {
      toast.error('Please select at least one recommendation')
      return
    }
    
    // Build instruction from selected recommendations
    const instruction = recommendations
      .filter(r => selectedRecommendations.includes(r.id))
      .map(r => `${r.title}: ${r.description}`)
      .join('\n\n')
    
    setCustomInstruction(instruction)
    await handleGeneratePreview()
  }

  const handleApply = () => {
    if (!optimizedScript || selectedScenes.length === 0) {
      toast.error('Please select at least one scene to apply')
      return
    }
    
    // Merge optimized scenes with original, only for selected indices
    const mergedScenes = script.scenes.map((originalScene: any, idx: number) => {
      if (selectedScenes.includes(idx) && optimizedScript.scenes[idx]) {
        return optimizedScript.scenes[idx]
      }
      return originalScene
    })
    
    const updatedScript = {
      scenes: mergedScenes
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
                    
                    {/* Select/Deselect All */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Scene Changes ({selectedScenes.length} selected)
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedScenes(optimizedScript.scenes.map((_: any, idx: number) => idx))}
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
                                <div className="font-medium mb-2 text-gray-900 dark:text-gray-100">
                                  Scene {idx + 1}: {optimizedScene.heading || 'Untitled'}
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
            )}

            {tab === 'flow' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Wand2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">AI-Powered Script Analysis</h3>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Let AI analyze your script and provide specific optimization recommendations.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg disabled:opacity-50 px-6"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Recommending...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Recommend
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Recommendations Controls + List */}
                {recommendations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recommendations</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => {
                            if (selectedRecommendations.length === recommendations.length) {
                              setSelectedRecommendations([])
                            } else {
                              setSelectedRecommendations(recommendations.map((r: any) => r.id))
                            }
                          }}
                        >
                          {selectedRecommendations.length === recommendations.length ? 'Clear All' : 'Select All'}
                        </Button>
                        <select
                          className="text-xs bg-transparent border rounded px-2 py-1"
                          value={filterPriority}
                          onChange={(e) => setFilterPriority(e.target.value as any)}
                        >
                          <option value="all">All Priorities</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                        <select
                          className="text-xs bg-transparent border rounded px-2 py-1"
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value as any)}
                        >
                          <option value="all">All Categories</option>
                          <option value="pacing">Pacing</option>
                          <option value="dialogue">Dialogue</option>
                          <option value="visual">Visual</option>
                          <option value="character">Character</option>
                          <option value="clarity">Clarity</option>
                          <option value="emotion">Emotion</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {recommendations
                        .filter((r: any) => filterPriority === 'all' || (r.priority || '').toLowerCase() === filterPriority)
                        .filter((r: any) => filterCategory === 'all' || (r.category || '').toLowerCase() === filterCategory)
                        .map((rec: any) => (
                          <ScriptRecommendationCard
                            key={rec.id}
                            rec={rec}
                            selected={selectedRecommendations.includes(rec.id)}
                            onToggle={() => {
                              if (selectedRecommendations.includes(rec.id)) {
                                setSelectedRecommendations(prev => prev.filter(id => id !== rec.id))
                              } else {
                                setSelectedRecommendations(prev => [...prev, rec.id])
                              }
                            }}
                          />
                      ))}
                    </div>
                  </div>
                )}

                {selectedRecommendations.length > 0 && (
                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      onClick={handleGeneratePreviewFromRecommendations}
                      disabled={isOptimizing}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-6"
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
                )}
              </div>
            )}
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
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
