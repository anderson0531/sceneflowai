'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { Wand2, Edit, Zap, Heart, Eye, Target, Lightbulb, Trash2, Sparkles, Check } from 'lucide-react'
import { 
  SCENE_OPTIMIZATION_TEMPLATES, 
  countInstructions,
  MAX_INSTRUCTIONS,
  normalizeRecommendation,
  type SceneRecommendation,
} from '@/lib/constants/scene-optimization'

export interface InstructionsPanelAudienceAnalysis {
  score?: number
  notes?: string
  recommendations?: Array<string | SceneRecommendation | Record<string, unknown>>
}

interface InstructionsPanelProps {
  instruction: string
  onInstructionChange: (instruction: string) => void
  maxInstructions?: number
  /** @deprecated Prefer audienceAnalysis.recommendations */
  recommendations?: string[]
  audienceAnalysis?: InstructionsPanelAudienceAnalysis | null
  appliedRecommendationIds?: string[]
  onApplyRecommendation?: (recText: string, recId: string) => void
  canAddMoreInstructions?: boolean
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

function coerceRecommendationInput(
  rec: string | SceneRecommendation | Record<string, unknown>
): string | SceneRecommendation {
  if (typeof rec === 'string') return rec
  if (rec && typeof rec === 'object' && typeof rec.text === 'string') {
    return rec as SceneRecommendation
  }
  if (rec && typeof rec === 'object') {
    const text =
      typeof rec.description === 'string'
        ? rec.description
        : typeof rec.title === 'string'
          ? rec.title
          : ''
    return { text, ...(rec as object) } as SceneRecommendation
  }
  return String(rec)
}

export function InstructionsPanel({ 
  instruction, 
  onInstructionChange,
  maxInstructions = MAX_INSTRUCTIONS,
  recommendations = [],
  audienceAnalysis,
  appliedRecommendationIds = [],
  onApplyRecommendation,
  canAddMoreInstructions: canAddMoreProp
}: InstructionsPanelProps) {
  const instructionCount = countInstructions(instruction)
  const canAddMore = canAddMoreProp !== undefined ? canAddMoreProp : instructionCount < maxInstructions

  const normalizedRecs = useMemo(() => {
    const raw =
      audienceAnalysis?.recommendations?.length
        ? audienceAnalysis.recommendations
        : recommendations
    return raw
      .map((rec) => normalizeRecommendation(coerceRecommendationInput(rec)))
      .filter((rec) => rec.text.trim().length > 0)
  }, [audienceAnalysis?.recommendations, recommendations])

  // Append instruction with numbered format
  const appendInstruction = (newText: string) => {
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
      {/* Audience Resonance recommendations */}
      {normalizedRecs.length > 0 && (
        <div className="rounded-lg p-3 border border-gray-700/30 bg-gray-800/40">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-violet-300">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Audience Resonance Recommendations
            {typeof audienceAnalysis?.score === 'number' && (
              <span className="text-xs font-normal text-gray-400">
                Score {audienceAnalysis.score}
              </span>
            )}
            <span className="text-xs font-normal text-violet-400/80">
              ({normalizedRecs.length})
            </span>
          </h3>
          {audienceAnalysis?.notes && (
            <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">
              {audienceAnalysis.notes}
            </p>
          )}
          <ul className="space-y-2">
            {normalizedRecs.map((rec, idx) => {
              const recId = rec.id || `rec-${idx}`
              const isApplied = appliedRecommendationIds.includes(recId)
              const recPriority = rec.priority
              const recCategory = rec.category
              const recImpact = (rec as SceneRecommendation & { impact?: string }).impact
              const recPointsDeducted = (rec as SceneRecommendation & { pointsDeducted?: number }).pointsDeducted
              
              return (
                <li 
                  key={recId} 
                  className={`flex items-start gap-2 text-xs p-2.5 rounded-lg transition-colors ${
                    isApplied 
                      ? 'bg-green-900/30 border border-green-700/50' 
                      : 'bg-gray-800/40 border border-gray-700/30 hover:bg-gray-800/60'
                  }`}
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-gray-300 leading-relaxed block ${isApplied ? 'line-through opacity-60' : ''}`}>
                      {rec.text}
                    </span>
                    {(recPriority || recCategory || recImpact || recPointsDeducted) && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {recPriority && (
                          <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            recPriority === 'high' || recPriority === 'critical'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : recPriority === 'medium'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {recPriority}
                          </span>
                        )}
                        {recPointsDeducted != null && recPointsDeducted > 0 && (
                          <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                            -{recPointsDeducted} pts
                          </span>
                        )}
                        {recImpact && (
                          <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            recImpact === 'structural'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {recImpact}
                          </span>
                        )}
                        {recCategory && (
                          <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400 border border-gray-600/30">
                            {recCategory}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {isApplied ? (
                    <span className="flex items-center gap-1 text-green-400 text-[10px] font-medium flex-shrink-0">
                      <Check className="w-3 h-3" />
                      Added
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-900/30 flex-shrink-0"
                      disabled={!canAddMore}
                      onClick={() => onApplyRecommendation?.(rec.text, recId)}
                    >
                      + Add
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
          {!canAddMore && (
            <p className="text-xs text-amber-400 mt-2">
              Maximum {maxInstructions} instructions reached.
            </p>
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
            {instructionCount}/{maxInstructions} directions
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

      {/* Direction */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <Edit className="w-4 h-4 text-green-600" />
            Direction
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
        <DictationTextarea
          value={instruction}
          onChange={onInstructionChange}
          placeholder="Describe how to revise this scene — dialogue, pacing, narration, visuals, music...

Use the buttons above to add direction, or speak using the microphone.

Numbered directions are supported:
1. First change
2. Second change"
          className="min-h-[180px] text-sm"
          rows={8}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Combine up to {maxInstructions} directions per revision. More specific = better results.
        </p>
      </div>
    </div>
  )
}
