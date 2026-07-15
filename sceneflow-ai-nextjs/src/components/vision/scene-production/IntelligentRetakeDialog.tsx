'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/Input'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronUp,
  Film,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react'
import type { SceneSegment } from './types'
import type { RetakePlan, RetakeAnomalyOrigin } from '@/lib/video/retakeIntelligence'
import type { FrameEditCharacterReference } from '@/lib/vision/resolveFrameEditCharacterReferences'

export interface IntelligentRetakeSubmitOptions {
  fixFrame: boolean
  applyPromptChanges: boolean
  frameEditInstruction?: string
}

interface IntelligentRetakeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: SceneSegment
  negativePrompt?: string
  sceneDescription?: string
  characterReferences?: FrameEditCharacterReference[]
  aspectRatio?: '16:9' | '9:16'
  onSubmitRetake: (plan: RetakePlan, opts: IntelligentRetakeSubmitOptions) => Promise<void>
}

const anomalyBadgeConfig: Record<
  RetakeAnomalyOrigin,
  { label: string; className: string }
> = {
  frame: {
    label: 'In the starting frame',
    className: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  },
  motion: {
    label: 'Introduced in motion',
    className: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  },
  both: {
    label: 'Frame and motion',
    className: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
  },
  unknown: {
    label: 'Origin unclear',
    className: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  },
}

export function IntelligentRetakeDialog({
  open,
  onOpenChange,
  segment,
  negativePrompt = '',
  sceneDescription,
  onSubmitRetake,
}: IntelligentRetakeDialogProps) {
  const [instruction, setInstruction] = useState('')
  const [plan, setPlan] = useState<RetakePlan | null>(null)
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fixFrame, setFixFrame] = useState(false)
  const [applyPromptChanges, setApplyPromptChanges] = useState(true)
  const [frameEditInstruction, setFrameEditInstruction] = useState('')
  const [showFullPrompt, setShowFullPrompt] = useState(false)

  const currentPrompt = useMemo(
    () => segment.userEditedPrompt || segment.generatedPrompt || '',
    [segment.userEditedPrompt, segment.generatedPrompt]
  )

  const startFrameUrl =
    segment.references?.startFrameUrl?.trim() ||
    (segment as { startFrameUrl?: string }).startFrameUrl?.trim() ||
    ''

  const previewUrl = segment.activeAssetUrl || startFrameUrl || null
  const generationMode = segment.generationMethod ?? 'I2V'

  const resetState = useCallback(() => {
    setInstruction('')
    setPlan(null)
    setOriginalPrompt('')
    setIsAnalyzing(false)
    setIsSubmitting(false)
    setFixFrame(false)
    setApplyPromptChanges(true)
    setFrameEditInstruction('')
    setShowFullPrompt(false)
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  const handleAnalyze = async () => {
    if (!instruction.trim()) {
      toast.error('Describe what to fix before analyzing.')
      return
    }

    setIsAnalyzing(true)
    setPlan(null)

    try {
      const response = await fetch('/api/segments/retake-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt,
          negativePrompt,
          instruction: instruction.trim(),
          mode: generationMode,
          context: {
            hasStartFrame: !!startFrameUrl,
            hasEndFrame: !!segment.references?.endFrameUrl,
            sceneDescription,
          },
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      const analyzedPlan: RetakePlan = {
        anomalyOrigin: data.anomalyOrigin,
        revisedPrompt: data.revisedPrompt,
        negativePromptAdditions: data.negativePromptAdditions ?? '',
        frameEditRecommended: data.frameEditRecommended === true,
        frameEditInstruction: data.frameEditInstruction,
        changesSummary: Array.isArray(data.changesSummary) ? data.changesSummary : [],
        retakeSummary: data.retakeSummary ?? 'Retake plan ready.',
      }

      setPlan(analyzedPlan)
      setOriginalPrompt(currentPrompt)
      setFixFrame(analyzedPlan.frameEditRecommended && !!startFrameUrl)
      setApplyPromptChanges(
        analyzedPlan.revisedPrompt.trim() !== currentPrompt.trim() ||
          !!analyzedPlan.negativePromptAdditions.trim()
      )
      setFrameEditInstruction(analyzedPlan.frameEditInstruction ?? '')
      toast.success('Retake plan ready for review')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to analyze retake')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleApprove = async () => {
    if (!plan) return

    if (!fixFrame && !applyPromptChanges) {
      toast.error('Enable at least one fix option before retaking.')
      return
    }

    if (fixFrame && !startFrameUrl) {
      toast.error('No start frame available to edit.')
      return
    }

    if (fixFrame && !frameEditInstruction.trim()) {
      toast.error('Provide a frame edit instruction.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmitRetake(plan, {
        fixFrame,
        applyPromptChanges,
        frameEditInstruction: frameEditInstruction.trim() || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Retake failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const promptChanged =
    !!plan && plan.revisedPrompt.trim() !== (originalPrompt || currentPrompt).trim()

  const anomalyConfig = plan ? anomalyBadgeConfig[plan.anomalyOrigin] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto border-slate-700 bg-slate-950 text-slate-100">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-indigo-500/40">
              <Wand2 className="h-5 w-5 text-indigo-300" />
            </div>
            <div className="space-y-1 text-left">
              <DialogTitle className="text-lg text-white">Intelligent Retake</DialogTitle>
              <DialogDescription className="text-sm text-slate-400">
                Describe the correction. We will route a frame edit, prompt rewrite, or both.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {previewUrl && (
          <div className="rounded-lg border border-slate-700/80 bg-slate-900/60 overflow-hidden">
            {segment.activeAssetUrl && segment.assetType === 'video' ? (
              <video
                src={segment.activeAssetUrl}
                className="w-full max-h-40 object-cover bg-black"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Clip reference"
                className="w-full max-h-40 object-cover bg-black"
              />
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300">What should we fix?</label>
          <DictationTextarea
            value={instruction}
            onChange={setInstruction}
            placeholder="Describe what to fix, e.g. 'remove the coffee cup on the table'"
            rows={3}
            className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full border-indigo-500/40 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
          onClick={handleAnalyze}
          disabled={isAnalyzing || isSubmitting || !instruction.trim()}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze
            </>
          )}
        </Button>

        {plan && (
          <div className="space-y-3 rounded-lg border border-slate-700/80 bg-slate-900/50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {anomalyConfig && (
                <Badge variant="outline" className={`text-[10px] ${anomalyConfig.className}`}>
                  {anomalyConfig.label}
                </Badge>
              )}
              <span className="text-sm font-medium text-slate-100">{plan.retakeSummary}</span>
            </div>

            {plan.changesSummary.length > 0 && (
              <div className="space-y-1.5">
                {plan.changesSummary.map((item, idx) => (
                  <div
                    key={`${item.category}-${idx}`}
                    className="rounded-md border border-slate-700/60 bg-slate-950/60 px-2.5 py-2"
                  >
                    <div className="flex items-center gap-2 text-[11px]">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-slate-600 text-slate-300"
                      >
                        {item.category}
                      </Badge>
                      <span className="text-slate-200">{item.change}</span>
                    </div>
                    {item.rationale && (
                      <p className="mt-1 text-[10px] text-slate-500 leading-snug">
                        {item.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowFullPrompt((v) => !v)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
            >
              {showFullPrompt ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              View full prompt
            </button>
            {showFullPrompt && (
              <pre className="max-h-36 overflow-y-auto rounded-md border border-slate-700 bg-slate-950 p-2 text-[11px] text-slate-300 whitespace-pre-wrap">
                {plan.revisedPrompt}
              </pre>
            )}

            <div className="space-y-2 border-t border-slate-700/60 pt-3">
              {plan.frameEditRecommended && startFrameUrl && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={fixFrame}
                    onCheckedChange={(checked) => setFixFrame(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <span className="text-sm text-slate-200">Fix the starting frame</span>
                    <p className="text-[11px] text-slate-500">
                      Edit the frame-locked start image before regenerating.
                    </p>
                  </div>
                </label>
              )}

              {fixFrame && (
                <Input
                  value={frameEditInstruction}
                  onChange={(e) => setFrameEditInstruction(e.target.value)}
                  placeholder="Frame edit instruction"
                  className="bg-slate-950 border-slate-700 text-slate-100 text-sm"
                />
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={applyPromptChanges}
                  onCheckedChange={(checked) => setApplyPromptChanges(checked === true)}
                  disabled={!promptChanged && !plan.negativePromptAdditions.trim()}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="text-sm text-slate-200">Apply prompt changes</span>
                  <p className="text-[11px] text-slate-500">
                    {promptChanged || plan.negativePromptAdditions.trim()
                      ? 'Use the revised prompt and negative additions.'
                      : 'No prompt changes suggested.'}
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={!plan || isAnalyzing || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retaking…
              </>
            ) : (
              <>
                <Film className="mr-2 h-4 w-4" />
                Approve & Retake
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
