'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { Check, Eye, Loader, Shield, Wand2 } from 'lucide-react'
import { ASSISTANT } from '@/lib/constants/assistant'
import { ASSISTANT_ICON as AssistantIcon } from '@/lib/constants/assistantIcon'
import { countInstructions, MAX_INSTRUCTIONS } from '@/lib/constants/scene-optimization'
import {
  SCRIPT_DURATION_PRESETS,
  SCRIPT_REWRITE_TEMPLATES,
  scriptDirectionRecommendations,
  type ScriptRevisionDepth,
} from '@/lib/script/directScript'
import { runWithAgentDock } from '@/store/useAgentRunStore'
import { toast } from 'sonner'

type ScriptScene = {
  heading?: string | { text?: string }
  sceneNumber?: number
}

type AudienceReviewInput = {
  recommendations?: Array<string | { text?: string; priority?: string; category?: string }>
  improvements?: unknown[]
} | null

const REVISION_DEPTHS: Array<{ value: ScriptRevisionDepth; label: string; hint: string }> = [
  { value: 'polish', label: 'Polish', hint: 'Refine wording. Keep scenes, shots, and runtime.' },
  { value: 'rewrite', label: 'Rewrite', hint: 'Revise scenes in place. Add, cut, or reorder shots when needed.' },
  { value: 'refactor', label: 'Refactor', hint: 'Merge, cut, or add scenes to hit the direction and duration.' },
]

function sceneHeading(scene: ScriptScene, index: number): string {
  const heading = scene?.heading
  const text = typeof heading === 'string' ? heading : heading?.text
  return text?.trim() || `Scene ${scene?.sceneNumber || index + 1}`
}

function scriptScenes(script: { scenes?: ScriptScene[]; script?: { scenes?: ScriptScene[] } } | null | undefined): ScriptScene[] {
  if (Array.isArray(script?.scenes)) return script.scenes
  if (Array.isArray(script?.script?.scenes)) return script.script.scenes
  return []
}

export function DirectScriptDialog({
  isOpen,
  onClose,
  projectId,
  script,
  characters = [],
  audienceReview,
  currentDurationMinutes,
  onApply,
  onOpenAudienceAnalysis,
}: {
  isOpen: boolean
  onClose: () => void
  projectId?: string
  script?: { scenes?: ScriptScene[]; script?: { scenes?: ScriptScene[] }; title?: string } | null
  characters?: unknown[]
  audienceReview?: AudienceReviewInput
  currentDurationMinutes?: number | null
  onApply: (optimizedScript: { scenes: unknown[] }) => Promise<void> | void
  onOpenAudienceAnalysis?: () => void
}) {
  const scenes = scriptScenes(script)
  const recommendations = useMemo(
    () => scriptDirectionRecommendations(audienceReview),
    [audienceReview]
  )

  const [instruction, setInstruction] = useState('')
  const [preserved, setPreserved] = useState<Set<number>>(() => new Set())
  const [depth, setDepth] = useState<ScriptRevisionDepth>('rewrite')
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null)
  const [preserveOpen, setPreserveOpen] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [previewScript, setPreviewScript] = useState<{ scenes: unknown[] } | null>(null)
  const [changesSummary, setChangesSummary] = useState<Array<{ category?: string; changes?: string; rationale?: string }>>([])

  useEffect(() => {
    if (!isOpen) return
    setInstruction('')
    setPreserved(new Set())
    setDepth('rewrite')
    setTargetMinutes(null)
    setPreserveOpen(false)
    setShowPreview(false)
    setPreviewScript(null)
    setChangesSummary([])
  }, [isOpen])

  const instructionCount = countInstructions(instruction)
  const canAddMore = instructionCount < MAX_INSTRUCTIONS

  const appendInstruction = (text: string) => {
    const next = text.trim()
    if (!next || !canAddMore) return
    setInstruction((current) => {
      if (!current.trim()) return `1. ${next}`
      const count = countInstructions(current)
      return `${current.trim()}\n\n${count + 1}. ${next}`
    })
  }

  const togglePreserved = (index: number) => {
    setPreserved((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const effectiveTarget =
    depth === 'polish' ? null : targetMinutes

  const handleGeneratePreview = async () => {
    if (!instruction.trim()) {
      toast.error('Add direction before generating a preview')
      return
    }
    if (!projectId || !script) {
      toast.error('Script optimization is not available')
      return
    }

    const payloadScript = Array.isArray((script as { scenes?: unknown[] }).scenes)
      ? script
      : (script as { script?: unknown }).script

    setIsGenerating(true)
    try {
      await runWithAgentDock(
        {
          id: 'script-optimize',
          title: 'Script Agent',
          subtitle: 'you can keep editing',
          itemLabel: 'Script Director',
        },
        async () => {
          let response = await fetch('/api/vision/optimize-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              script: payloadScript,
              instruction: instruction.trim(),
              characters,
              audienceReview,
              revisionDepth: depth,
              targetDurationMinutes: effectiveTarget,
              preserveSceneIndices: [...preserved],
            }),
          })
          if (!response.ok && response.status === 422) {
            toast.message('Preview was large; retrying compact version...')
            response = await fetch('/api/vision/optimize-script', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                script: payloadScript,
                instruction: instruction.trim(),
                characters,
                audienceReview,
                compact: true,
                revisionDepth: depth,
                targetDurationMinutes: effectiveTarget,
                preserveSceneIndices: [...preserved],
              }),
            })
          }
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(
              typeof errorData.error === 'string' ? errorData.error : 'Failed to revise script'
            )
          }
          const data = await response.json()
          if (!data.optimizedScript?.scenes) {
            throw new Error('No revised script was returned')
          }
          setPreviewScript(data.optimizedScript)
          setChangesSummary(Array.isArray(data.changesSummary) ? data.changesSummary : [])
          setShowPreview(true)
        }
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revise script'
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = async () => {
    if (!previewScript || isApplying) return
    setIsApplying(true)
    try {
      await onApply(previewScript)
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply script'
      toast.error(message)
    } finally {
      setIsApplying(false)
    }
  }

  const previewScenes = scriptScenes(previewScript)
  const durationLabel =
    typeof currentDurationMinutes === 'number' && currentDurationMinutes > 0
      ? `${currentDurationMinutes} min`
      : 'current length'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AssistantIcon className="w-5 h-5 text-cyan-400" />
            Script Director
          </DialogTitle>
          <DialogDescription>
            Revise the whole script. {ASSISTANT.full}
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            <section>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Areas for Improvement
              </h3>
              {recommendations.length > 0 ? (
                <ul className="space-y-2">
                  {recommendations.map((rec) => (
                    <li
                      key={rec.id}
                      className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-2.5 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block leading-relaxed text-gray-800 dark:text-gray-200">
                          {rec.text}
                        </span>
                        {(rec.priority || rec.category) && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {rec.priority && (
                              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                {rec.priority}
                              </span>
                            )}
                            {rec.category && (
                              <span className="rounded border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 text-[9px] text-gray-500">
                                {rec.category}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 flex-shrink-0 px-2 text-[10px]"
                        disabled={!canAddMore}
                        onClick={() => appendInstruction(rec.text)}
                      >
                        + Add
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3">
                  <p className="text-xs text-gray-500 flex-1">
                    Run Audience Resonance to turn issues into recommendations you can apply.
                  </p>
                  {onOpenAudienceAnalysis && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => {
                        onClose()
                        onOpenAudienceAnalysis()
                      }}
                    >
                      Audience Analysis
                    </Button>
                  )}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-blue-600" />
                Common Rewrites
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SCRIPT_REWRITE_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    size="sm"
                    variant="outline"
                    disabled={!canAddMore}
                    onClick={() => appendInstruction(template.text)}
                    className="h-auto justify-start px-3 py-2 text-left"
                  >
                    <span className="text-xs font-medium">+ {template.label}</span>
                  </Button>
                ))}
              </div>
            </section>

            <section>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-semibold"
                onClick={() => setPreserveOpen((open) => !open)}
              >
                <Shield className="h-4 w-4 text-gray-500" />
                Preserve Scenes
                {preserved.size > 0 && (
                  <span className="text-xs font-normal text-gray-500">{preserved.size} locked</span>
                )}
              </button>
              {preserveOpen && (
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {scenes.map((scene, index) => (
                    <label
                      key={`${index}-${sceneHeading(scene, index)}`}
                      className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={preserved.has(index)}
                        onChange={() => togglePreserved(index)}
                      />
                      <span className="truncate">
                        Scene {index + 1} · {sceneHeading(scene, index)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Direction</h3>
                <span className="text-xs text-gray-500">
                  {instructionCount}/{MAX_INSTRUCTIONS}
                </span>
              </div>
              <DictationTextarea
                value={instruction}
                onChange={setInstruction}
                placeholder="Describe how to revise the whole script."
                className="min-h-[140px] text-sm"
                rows={6}
              />
            </section>

            <section className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                How detailed should changes be?
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {REVISION_DEPTHS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDepth(option.value)}
                    aria-pressed={depth === option.value}
                    className={`rounded-lg border p-2 text-left transition-colors ${
                      depth === option.value
                        ? 'border-purple-500/60 bg-purple-500/10'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-[11px] text-gray-500">{option.hint}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                What is the target duration?
              </h4>
              <p className="mb-3 text-xs text-gray-500">
                {depth === 'polish'
                  ? 'Polish keeps the current runtime.'
                  : `Blueprint runtime is ${durationLabel}. Choose a target, or keep the current length.`}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                <button
                  type="button"
                  disabled={depth === 'polish'}
                  onClick={() => setTargetMinutes(null)}
                  aria-pressed={effectiveTarget == null}
                  className={`rounded-lg border p-2 text-left text-sm ${
                    effectiveTarget == null
                      ? 'border-purple-500/60 bg-purple-500/10'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  Keep current
                </button>
                {SCRIPT_DURATION_PRESETS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    disabled={depth === 'polish'}
                    onClick={() => setTargetMinutes(minutes)}
                    aria-pressed={effectiveTarget === minutes}
                    className={`rounded-lg border p-2 text-left text-sm ${
                      effectiveTarget === minutes
                        ? 'border-purple-500/60 bg-purple-500/10'
                        : 'border-gray-200 dark:border-gray-700'
                    } ${depth === 'polish' ? 'opacity-50' : ''}`}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              ← Back to Edit
            </Button>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {previewScenes.length} scene{previewScenes.length === 1 ? '' : 's'} in the revised script
              {preserved.size > 0 ? ` · ${preserved.size} preserved` : ''}.
            </p>
            {changesSummary.length > 0 ? (
              <ul className="space-y-2">
                {changesSummary.map((change, index) => (
                  <li key={`${change.category}-${index}`} className="rounded-lg border p-3 text-sm">
                    {change.category && (
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {change.category}
                      </div>
                    )}
                    <div>{change.changes}</div>
                    {change.rationale && (
                      <div className="mt-1 text-xs text-gray-500">{change.rationale}</div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No change summary was returned.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <div className="flex w-full items-center justify-end gap-2">
            {!showPreview ? (
              <Button onClick={() => void handleGeneratePreview()} disabled={!instruction.trim() || isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Generate Preview
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => void handleApply()} disabled={!previewScript || isApplying} className="bg-sf-primary">
                {isApplying ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Apply Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
