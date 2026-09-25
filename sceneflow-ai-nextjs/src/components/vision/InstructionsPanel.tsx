'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { Wand2, Edit, Zap, Heart, Eye, Target, Lightbulb, Trash2, Sparkles, ChevronDown, ChevronRight, Shield } from 'lucide-react'
import { 
  SCENE_OPTIMIZATION_TEMPLATES, 
  countInstructions,
  MAX_INSTRUCTIONS,
  normalizeRecommendation,
  type SceneRecommendation,
} from '@/lib/constants/scene-optimization'
import type { PolishRecommendation, ScenePolishAnalysis } from '@/lib/script/scenePolish/types'

export interface InstructionsPanelAudienceAnalysis {
  score?: number
  notes?: string
  recommendations?: Array<string | SceneRecommendation | Record<string, unknown>>
}

export interface InstructionsPanelPreserveElements {
  dialogueBeats: boolean
  actionBeats: boolean
  music: boolean
  sceneDirection: boolean
  beatDirection: boolean
  beatFrames: boolean
  onDialogueBeatsChange: (checked: boolean) => void
  onActionBeatsChange: (checked: boolean) => void
  onMusicChange: (checked: boolean) => void
  onSceneDirectionChange: (checked: boolean) => void
  onBeatDirectionChange: (checked: boolean) => void
  onBeatFramesChange: (checked: boolean) => void
}

interface InstructionsPanelProps {
  instruction: string
  onInstructionChange: (instruction: string) => void
  maxInstructions?: number
  /** @deprecated Prefer audienceAnalysis.recommendations */
  recommendations?: string[]
  audienceAnalysis?: InstructionsPanelAudienceAnalysis | null
  polishAnalysis?: ScenePolishAnalysis | null
  appliedRecommendationIds?: string[]
  onApplyRecommendation?: (recText: string, recId: string) => void
  canAddMoreInstructions?: boolean
  preserveElements?: InstructionsPanelPreserveElements
}

type MergedRecommendation =
  | { source: 'polish'; id: string; rec: PolishRecommendation }
  | { source: 'audience'; id: string; rec: SceneRecommendation }

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

function instructionKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function priorityClass(priority: string | undefined): string {
  if (priority === 'high' || priority === 'critical') {
    return 'bg-red-500/20 text-red-300 border border-red-500/30'
  }
  if (priority === 'medium') {
    return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
  }
  return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
}

function SectionToggle({
  title,
  icon,
  open,
  onToggle,
  meta,
}: {
  title: string
  icon: React.ReactNode
  open: boolean
  onToggle: () => void
  meta?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-2 text-left"
    >
      <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        {icon}
        {title}
      </span>
      {meta}
    </button>
  )
}

export function InstructionsPanel({ 
  instruction, 
  onInstructionChange,
  maxInstructions = MAX_INSTRUCTIONS,
  recommendations = [],
  audienceAnalysis,
  polishAnalysis,
  appliedRecommendationIds = [],
  onApplyRecommendation,
  canAddMoreInstructions: canAddMoreProp,
  preserveElements,
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
      .filter((rec) => !appliedRecommendationIds.includes(rec.id || ''))
  }, [audienceAnalysis?.recommendations, recommendations, appliedRecommendationIds])

  const polishRecs = useMemo(
    () =>
      (polishAnalysis?.recommendations ?? []).filter(
        (rec) => rec.text.trim().length > 0 && !appliedRecommendationIds.includes(rec.id || '')
      ),
    [polishAnalysis?.recommendations, appliedRecommendationIds]
  )

  const mergedRecs = useMemo(() => {
    const polishKeys = new Set(polishRecs.map((rec) => instructionKey(rec.text)))
    const polishItems: MergedRecommendation[] = polishRecs.map((rec, idx) => ({
      source: 'polish',
      id: rec.id || `polish-${idx}`,
      rec,
    }))
    const audienceItems: MergedRecommendation[] = normalizedRecs
      .filter((rec) => !polishKeys.has(instructionKey(rec.text)))
      .map((rec, idx) => ({
        source: 'audience',
        id: rec.id || `rec-${idx}`,
        rec,
      }))
    return [...polishItems, ...audienceItems]
  }, [normalizedRecs, polishRecs])

  const [recommendationsOpen, setRecommendationsOpen] = useState(mergedRecs.length > 0)
  const [revisionsOpen, setRevisionsOpen] = useState(false)
  const [preserveOpen, setPreserveOpen] = useState(false)
  const recommendationsToggled = useRef(false)

  useEffect(() => {
    if (!recommendationsToggled.current && mergedRecs.length > 0) {
      setRecommendationsOpen(true)
    }
  }, [mergedRecs.length])

  const polishNotes = polishAnalysis?.notes?.trim()
  const showAudienceSummary = !polishNotes

  const appendInstruction = (newText: string) => {
    if (!canAddMore) return
    
    if (instruction.trim() === '') {
      onInstructionChange(`1. ${newText}`)
    } else {
      const nextNum = instructionCount + 1
      onInstructionChange(`${instruction}\n\n${nextNum}. ${newText}`)
    }
  }

  const clearInstructions = () => {
    onInstructionChange('')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-700/30 bg-gray-800/40 p-3">
        <SectionToggle
          title="Recommendations"
          icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
          open={recommendationsOpen}
          onToggle={() => {
            recommendationsToggled.current = true
            setRecommendationsOpen((open) => !open)
          }}
          meta={
            <span className="text-xs font-normal text-emerald-400/80">
              ({mergedRecs.length})
            </span>
          }
        />
        {recommendationsOpen && (
          <div className="mt-3">
            {polishNotes ? (
              <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-400">
                {polishNotes}
              </p>
            ) : showAudienceSummary && (audienceAnalysis?.notes || typeof audienceAnalysis?.score === 'number') ? (
              <div className="mb-3 space-y-1">
                {typeof audienceAnalysis?.score === 'number' && (
                  <p className="text-xs text-gray-400">Score {audienceAnalysis.score}</p>
                )}
                {audienceAnalysis?.notes && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-gray-400">
                    {audienceAnalysis.notes}
                  </p>
                )}
              </div>
            ) : null}
            {mergedRecs.length === 0 ? (
              <p className="text-xs text-gray-400">No recommendations for this scene yet.</p>
            ) : (
              <ul className="space-y-2">
                {mergedRecs.map((item, idx) => {
                  const text = item.rec.text
                  return (
                    <li
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg border border-gray-700/30 bg-gray-800/40 p-2.5 text-xs transition-colors hover:bg-gray-800/60"
                    >
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block leading-relaxed text-gray-300">
                          {text}
                        </span>
                        {item.source === 'polish' ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {item.rec.beatIndices.map((n) => (
                              <span
                                key={`${item.id}-beat-${n}`}
                                className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-200"
                              >
                                Shot {n}
                              </span>
                            ))}
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${priorityClass(item.rec.priority)}`}>
                              {item.rec.priority}
                            </span>
                            <span className="inline-flex items-center rounded border border-gray-600/30 bg-gray-700/50 px-1.5 py-0.5 text-[9px] font-medium text-gray-400">
                              {item.rec.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ) : (
                          <AudienceBadges rec={item.rec} />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 flex-shrink-0 px-2 text-[10px] text-emerald-400 hover:bg-emerald-900/30 hover:text-emerald-300"
                        disabled={!canAddMore}
                        onClick={() => onApplyRecommendation?.(text, item.id)}
                      >
                        + Add
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
            {!canAddMore && mergedRecs.length > 0 && (
              <p className="mt-2 text-xs text-amber-400">
                Maximum {maxInstructions} instructions reached.
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2">
          <SectionToggle
            title="Common Revisions"
            icon={<Wand2 className="h-4 w-4 text-blue-600" />}
            open={revisionsOpen}
            onToggle={() => setRevisionsOpen((open) => !open)}
            meta={
              <span className="shrink-0 text-xs font-normal text-gray-500 dark:text-gray-400">
                {instructionCount}/{maxInstructions} directions
              </span>
            }
          />
        </div>
        {revisionsOpen && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {SCENE_OPTIMIZATION_TEMPLATES.map(template => (
                <Button
                  key={template.id}
                  size="sm"
                  variant="outline"
                  onClick={() => appendInstruction(template.instruction)}
                  disabled={!canAddMore}
                  className={`h-auto justify-start px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                    !canAddMore ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <div className="flex w-full items-start gap-2">
                    <div className="mt-0.5 text-blue-600 dark:text-blue-400">
                      {TEMPLATE_ICONS[template.id] || <Wand2 className="h-3 w-3" />}
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        + {template.label}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                        {template.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            {!canAddMore && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Maximum {maxInstructions} instructions reached. Clear some to add more.
              </p>
            )}
          </>
        )}
      </div>

      {preserveElements && (
        <div>
          <SectionToggle
            title="Preserve Elements"
            icon={<Shield className="h-4 w-4 text-gray-500" />}
            open={preserveOpen}
            onToggle={() => setPreserveOpen((open) => !open)}
          />
          {preserveOpen && (
            <div className="mt-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <PreserveCheckbox
                  label="Dialogue shots (+ audio)"
                  checked={preserveElements.dialogueBeats}
                  onChange={preserveElements.onDialogueBeatsChange}
                />
                <PreserveCheckbox
                  label="Action shots (+ SFX audio)"
                  checked={preserveElements.actionBeats}
                  onChange={preserveElements.onActionBeatsChange}
                />
                <PreserveCheckbox
                  label="Music"
                  checked={preserveElements.music}
                  onChange={preserveElements.onMusicChange}
                />
                <PreserveCheckbox
                  label="Scene direction"
                  checked={preserveElements.sceneDirection}
                  onChange={preserveElements.onSceneDirectionChange}
                />
                <PreserveCheckbox
                  label="Shot direction (shot, blocking, emotion…)"
                  checked={preserveElements.beatDirection}
                  onChange={preserveElements.onBeatDirectionChange}
                />
                <PreserveCheckbox
                  label="Shot frames (start/end storyboard images)"
                  checked={preserveElements.beatFrames}
                  onChange={preserveElements.onBeatFramesChange}
                  wide
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Preserved items keep their script text, audio, direction, and frame images unchanged through the edit.
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1 text-sm font-semibold">
            <Edit className="h-4 w-4 text-green-600" />
            Direction
          </h3>
          {instructionCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearInstructions}
              className="h-6 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
            >
              <Trash2 className="mr-1 h-3 w-3" />
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
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Combine up to {maxInstructions} directions per revision. More specific = better results.
        </p>
      </div>
    </div>
  )
}

function AudienceBadges({ rec }: { rec: SceneRecommendation }) {
  const recPriority = rec.priority
  const recCategory = rec.category
  const recImpact = (rec as SceneRecommendation & { impact?: string }).impact
  const recPointsDeducted = (rec as SceneRecommendation & { pointsDeducted?: number }).pointsDeducted
  if (!recPriority && !recCategory && !recImpact && recPointsDeducted == null) return null
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {recPriority && (
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${priorityClass(recPriority)}`}>
          {recPriority}
        </span>
      )}
      {recPointsDeducted != null && recPointsDeducted > 0 && (
        <span className="inline-flex items-center rounded border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-red-300">
          -{recPointsDeducted} pts
        </span>
      )}
      {recImpact && (
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
          recImpact === 'structural'
            ? 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
            : 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
        }`}>
          {recImpact}
        </span>
      )}
      {recCategory && (
        <span className="inline-flex items-center rounded border border-gray-600/30 bg-gray-700/50 px-1.5 py-0.5 text-[9px] font-medium text-gray-400">
          {recCategory}
        </span>
      )}
    </div>
  )
}

function PreserveCheckbox({
  label,
  checked,
  onChange,
  wide,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  wide?: boolean
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 text-sm ${wide ? 'sm:col-span-2' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded"
      />
      {label}
    </label>
  )
}
