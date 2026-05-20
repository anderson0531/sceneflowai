'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Loader2,
  CheckSquare,
  Square,
  AlertTriangle,
  Wand2,
  ChevronDown,
  ChevronUp,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ResonanceInsight } from '@/lib/types/audienceResonance'
import {
  BLUEPRINT_SECTION_TEMPLATES,
  FIX_SECTION_LABELS,
  type BlueprintSection,
} from '@/lib/constants/blueprint-optimization'
import { treatmentToRefineVariant, impactLabel } from '@/lib/treatment/resonanceScoring'

type FixSection = 'core' | 'story' | 'tone' | 'beats' | 'characters'

export interface BlueprintResonanceEditDialogProps {
  isOpen: boolean
  onClose: () => void
  insights: ResonanceInsight[]
  /** When set, dialog focuses on this issue's section */
  focusInsight?: ResonanceInsight | null
  treatment: Record<string, unknown>
  currentScore?: number
  targetScore?: number
  onApplied: (result: {
    updatedTreatment: Record<string, unknown>
    appliedInsightIds: string[]
    section: FixSection
  }) => void
}

function normalizeSection(section?: string): FixSection {
  const s = (section || 'story').toLowerCase()
  if (s === 'core' || s === 'story' || s === 'tone' || s === 'beats' || s === 'characters') {
    return s
  }
  return 'story'
}

export function BlueprintResonanceEditDialog({
  isOpen,
  onClose,
  insights,
  focusInsight,
  treatment,
  currentScore = 0,
  targetScore = 80,
  onApplied,
}: BlueprintResonanceEditDialogProps) {
  const actionableInsights = useMemo(
    () =>
      insights.filter(
        (i) => i.status === 'weakness' && i.fixSuggestion && i.fixSection
      ),
    [insights]
  )

  const defaultSection = normalizeSection(
    focusInsight?.fixSection || actionableInsights[0]?.fixSection
  )

  const [section, setSection] = useState<FixSection>(defaultSection)
  const [selectedRecIds, setSelectedRecIds] = useState<Set<string>>(new Set())
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set())
  const [customInstruction, setCustomInstruction] = useState('')
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [showTemplates, setShowTemplates] = useState(true)
  const [isApplying, setIsApplying] = useState(false)

  const sectionInsights = useMemo(
    () =>
      actionableInsights.filter(
        (i) => normalizeSection(i.fixSection) === section
      ),
    [actionableInsights, section]
  )

  const templates = BLUEPRINT_SECTION_TEMPLATES[section as BlueprintSection] || []

  useEffect(() => {
    if (!isOpen) return
    const sec = normalizeSection(
      focusInsight?.fixSection || actionableInsights[0]?.fixSection
    )
    setSection(sec)
    setSelectedTemplateIds(new Set())
    setCustomInstruction('')
    setShowRecommendations(true)
    setShowTemplates(true)
  }, [isOpen, focusInsight?.id, actionableInsights.length])

  useEffect(() => {
    if (!isOpen) return
    const forSection = actionableInsights.filter(
      (i) => normalizeSection(i.fixSection) === section
    )
    if (focusInsight?.id && normalizeSection(focusInsight.fixSection) === section) {
      setSelectedRecIds(new Set([focusInsight.id]))
    } else {
      setSelectedRecIds(new Set(forSection.map((i) => i.id)))
    }
  }, [isOpen, section, focusInsight?.id, actionableInsights])

  const toggleRec = (id: string) => {
    setSelectedRecIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedRecTexts = sectionInsights
    .filter((i) => selectedRecIds.has(i.id))
    .map((i) => `${i.title}: ${i.fixSuggestion}`)

  const templateInstructions = templates
    .filter((t) => selectedTemplateIds.has(t.id))
    .map((t) => t.instruction)

  const hasSelections =
    selectedRecTexts.length > 0 ||
    templateInstructions.length > 0 ||
    customInstruction.trim().length > 0

  const handleApply = async () => {
    if (!hasSelections) {
      toast.error('Select recommendations, a common change, or add instructions')
      return
    }

    const combined = [
      ...selectedRecTexts,
      ...templateInstructions,
      customInstruction.trim(),
    ]
      .filter(Boolean)
      .join('\n\n')

    setIsApplying(true)
    try {
      const response = await fetch('/api/treatment/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          variant: treatmentToRefineVariant(treatment),
          section,
          instructions: combined,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Refinement failed')
      }

      const fieldsUpdated = data.fieldsUpdated as string[] | undefined
      if (
        !data.success ||
        !data.draft ||
        !fieldsUpdated ||
        fieldsUpdated.length === 0
      ) {
        throw new Error(
          data.message || 'No blueprint changes were returned. Try different instructions.'
        )
      }

      const updatedTreatment = { ...treatment, ...data.draft, updatedAt: Date.now() }
      const appliedIds = sectionInsights
        .filter((i) => selectedRecIds.has(i.id))
        .map((i) => i.id)

      onApplied({
        updatedTreatment,
        appliedInsightIds: appliedIds,
        section,
      })
      toast.success(`Updated ${FIX_SECTION_LABELS[section] || section}`)
      onClose()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to apply improvements'
      toast.error(message)
    } finally {
      setIsApplying(false)
    }
  }

  const pointsToReady = Math.max(0, targetScore - currentScore)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Improve Blueprint
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center justify-between gap-2 text-gray-400">
            <span>Guided edits from your resonance analysis</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Score</span>
              <span className="font-bold text-white tabular-nums">{currentScore}</span>
              <span className="text-gray-600">→</span>
              <span className="font-bold text-emerald-400 tabular-nums">{targetScore}+</span>
              {pointsToReady > 0 && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px]">
                  +{pointsToReady} pts to ready
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Section focus */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Focus area</label>
            <select
              value={section}
              onChange={(e) => {
                setSection(normalizeSection(e.target.value))
                setSelectedRecIds(new Set())
                setSelectedTemplateIds(new Set())
              }}
              className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
            >
              {(Object.keys(FIX_SECTION_LABELS) as FixSection[]).map((key) => (
                <option key={key} value={key}>
                  {FIX_SECTION_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Recommendations */}
          {sectionInsights.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowRecommendations(!showRecommendations)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Recommendations ({sectionInsights.length})
                </span>
                {showRecommendations ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showRecommendations && (
                <div className="space-y-1.5">
                  {sectionInsights.map((insight) => {
                    const selected = selectedRecIds.has(insight.id)
                    const impact = impactLabel(insight.impactScore ?? 0)
                    return (
                      <div
                        key={insight.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleRec(insight.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleRec(insight.id)
                          }
                        }}
                        className={cn(
                          'flex items-start gap-2 p-2.5 rounded-lg cursor-pointer border transition-colors',
                          selected
                            ? 'bg-cyan-500/10 border-cyan-500/40'
                            : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                        )}
                      >
                        <span className="mt-0.5 shrink-0">
                          {selected ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-500" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                'text-sm font-medium',
                                selected ? 'text-white' : 'text-gray-300'
                              )}
                            >
                              {insight.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] px-1 py-0 h-4 border-none uppercase',
                                impact === 'High'
                                  ? 'bg-red-500/20 text-red-300'
                                  : impact === 'Medium'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-600/50 text-gray-400'
                              )}
                            >
                              {impact}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {insight.insight}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Common changes */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-400" />
                Common changes
              </span>
              {showTemplates ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showTemplates && (
              <div className="grid grid-cols-2 gap-2">
                {templates.map((template) => {
                  const selected = selectedTemplateIds.has(template.id)
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => toggleTemplate(template.id)}
                      className={cn(
                        'flex items-start gap-2 p-3 rounded-lg border text-left transition-colors',
                        selected
                          ? 'bg-purple-500/15 border-purple-500/40'
                          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                      )}
                    >
                      <span className="text-lg">{template.icon}</span>
                      <div className="min-w-0">
                        <div
                          className={cn(
                            'text-sm font-medium',
                            selected ? 'text-purple-200' : 'text-gray-300'
                          )}
                        >
                          {template.label}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {template.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Custom instructions */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-500" />
              Custom instructions
            </label>
            <Textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="Add specific direction for this section (optional)..."
              className="min-h-[80px] text-sm bg-slate-800/50 border-slate-600 text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between w-full gap-3">
            <p className="text-xs text-gray-500">
              {hasSelections
                ? `${selectedRecIds.size + selectedTemplateIds.size + (customInstruction.trim() ? 1 : 0)} change(s) ready`
                : 'Select at least one improvement'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isApplying}
                className="border-slate-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={!hasSelections || isApplying}
                className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Apply improvements
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

export default BlueprintResonanceEditDialog
