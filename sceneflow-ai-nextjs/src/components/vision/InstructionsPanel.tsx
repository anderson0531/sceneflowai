'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Wand2, Edit, Zap, Heart, Eye, Target, Lightbulb, Trash2, Sparkles, AlertTriangle, ChevronDown, ChevronUp, CheckSquare, Square, Loader } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { 
  SCENE_OPTIMIZATION_TEMPLATES, 
  SceneRecommendation,
  SceneAnalysis,
  normalizeRecommendation,
  countInstructions,
  MAX_INSTRUCTIONS,
  PRIORITY_BADGES,
  getScoreColor,
  getScoreBgColor
} from '@/lib/constants/scene-optimization'

interface InstructionsPanelProps {
  instruction: string
  onInstructionChange: (instruction: string) => void
  // Optional: for multi-instruction support
  maxInstructions?: number
  // AI Recommendations support
  sceneAnalysis?: SceneAnalysis | null
  recommendations?: SceneRecommendation[]
  isLoadingRecommendations?: boolean
  onFetchRecommendations?: () => void
  // Callback when recommendation is added (for tracking)
  onRecommendationAdded?: (recommendationId: string) => void
}

// Map template IDs to Lucide icons
const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'increase-tension': <Zap className="w-3 h-3" />,
  'improve-pacing': <Target className="w-3 h-3" />,
  'enhance-dialogue': <Edit className="w-3 h-3" />,
  'add-emotion': <Heart className="w-3 h-3" />,
  'clarify-action': <Eye className="w-3 h-3" />,
  'visual-storytelling': <Wand2 className="w-3 h-3" />,
  'add-humor': <Lightbulb className="w-3 h-3" />,
  'deepen-character': <Heart className="w-3 h-3" />
}

export function InstructionsPanel({ 
  instruction, 
  onInstructionChange,
  maxInstructions = MAX_INSTRUCTIONS,
  sceneAnalysis,
  recommendations,
  isLoadingRecommendations = false,
  onFetchRecommendations,
  onRecommendationAdded
}: InstructionsPanelProps) {
  const instructionCount = countInstructions(instruction)
  const canAddMore = instructionCount < maxInstructions

  // State for AI recommendations section
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set())

  // Normalize recommendations from various sources
  const normalizedRecommendations = (
    recommendations || 
    sceneAnalysis?.recommendations || 
    []
  ).map(normalizeRecommendation)

  // Toggle recommendation selection
  const toggleRecommendation = (recId: string) => {
    setSelectedRecommendations(prev => {
      const next = new Set(prev)
      if (next.has(recId)) {
        next.delete(recId)
      } else {
        next.add(recId)
      }
      return next
    })
  }

  // Add selected recommendations as instructions
  const addSelectedRecommendations = () => {
    const selected = normalizedRecommendations.filter(rec => 
      rec.id && selectedRecommendations.has(rec.id)
    )
    
    selected.forEach(rec => {
      if (canAddMore) {
        appendInstruction(rec.text, rec.id)
        onRecommendationAdded?.(rec.id!)
      }
    })
    
    // Clear selections after adding
    setSelectedRecommendations(new Set())
  }

  // Add single recommendation
  const addRecommendation = (rec: SceneRecommendation) => {
    if (!canAddMore || !rec.text) return
    appendInstruction(rec.text, rec.id)
    onRecommendationAdded?.(rec.id!)
  }

  // Append instruction with numbered format
  const appendInstruction = (newText: string, recommendationId?: string) => {
    if (!canAddMore) return
    
    if (instruction.trim() === '') {
      onInstructionChange(`1. ${newText}`)
    } else {
      const nextNum = instructionCount + 1
      onInstructionChange(`${instruction}\n\n${nextNum}. ${newText}`)
    }
  }

  // Clear all instructions
  const clearInstructions = () => {
    onInstructionChange('')
  }

  return (
    <div className="space-y-4">
      {/* AI Recommendations Section */}
      {(normalizedRecommendations.length > 0 || onFetchRecommendations) && (
        <div className="space-y-2">
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              AI Recommendations 
              {normalizedRecommendations.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {normalizedRecommendations.length}
                </Badge>
              )}
              {sceneAnalysis?.score && (
                <span className={`ml-2 text-xs font-bold ${getScoreColor(sceneAnalysis.score)}`}>
                  Score: {sceneAnalysis.score}
                </span>
              )}
            </span>
            {showRecommendations ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {showRecommendations && (
            <div className="space-y-2">
              {/* Loading state */}
              {isLoadingRecommendations && (
                <div className="flex items-center justify-center py-4 text-gray-500">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-sm">Analyzing scene...</span>
                </div>
              )}

              {/* Fetch recommendations button */}
              {!isLoadingRecommendations && normalizedRecommendations.length === 0 && onFetchRecommendations && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFetchRecommendations}
                  className="w-full justify-center"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                  Get AI Recommendations
                </Button>
              )}

              {/* Recommendations list */}
              {normalizedRecommendations.length > 0 && (
                <>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {normalizedRecommendations.map((rec, idx) => {
                      const isSelected = rec.id ? selectedRecommendations.has(rec.id) : false
                      const priorityConfig = PRIORITY_BADGES[rec.priority || 'medium']
                      
                      return (
                        <div
                          key={rec.id || idx}
                          onClick={() => rec.id && toggleRecommendation(rec.id)}
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
                              rec.id && toggleRecommendation(rec.id)
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs">{priorityConfig.emoji}</span>
                              <Badge className={`text-xs ${priorityConfig.color}`}>
                                {priorityConfig.label}
                              </Badge>
                              {rec.category && (
                                <Badge variant="outline" className="text-xs">
                                  {rec.category}
                                </Badge>
                              )}
                            </div>
                            <span className={`text-sm ${isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                              {rec.text}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              addRecommendation(rec)
                            }}
                            disabled={!canAddMore}
                          >
                            + Add
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Add selected button */}
                  {selectedRecommendations.size > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={addSelectedRecommendations}
                      disabled={!canAddMore}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Apply {selectedRecommendations.size} Selected Recommendation{selectedRecommendations.size !== 1 ? 's' : ''}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instruction Templates */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <Wand2 className="w-4 h-4 text-blue-600" />
            Common Revisions
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {instructionCount}/{maxInstructions} instructions
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SCENE_OPTIMIZATION_TEMPLATES.map(template => (
            <Button
              key={template.id}
              size="sm"
              variant="outline"
              onClick={() => appendInstruction(template.instruction)}
              disabled={!canAddMore}
              className={`justify-start text-left h-auto py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                !canAddMore ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-start gap-2 w-full">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                  {TEMPLATE_ICONS[template.id] || <Wand2 className="w-3 h-3" />}
                </div>
                <div className="text-left">
                  <div className="font-medium text-xs text-gray-900 dark:text-gray-100">
                    + {template.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {template.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
        {!canAddMore && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Maximum {maxInstructions} instructions reached. Clear some to add more.
          </p>
        )}
      </div>

      {/* Custom Instruction */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <Edit className="w-4 h-4 text-green-600" />
            Custom Instructions
          </h3>
          {instructionCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearInstructions}
              className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
        <Textarea
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          placeholder="Click buttons above to add instructions, or type custom ones here...

Instructions are automatically numbered for clarity:
1. First instruction
2. Second instruction
3. Third instruction"
          className="min-h-[180px] text-sm"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Combine up to {maxInstructions} instructions per revision for efficient editing. More specific = better results.
        </p>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Multi-Instruction Tips
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Combine related changes in one revision</li>
          <li>• Use Common Revisions buttons to build instructions</li>
          <li>• Add AI recommendations above for scene-specific improvements</li>
          <li>• {maxInstructions} instructions per update is optimal for quality</li>
        </ul>
      </div>
    </div>
  )
}
