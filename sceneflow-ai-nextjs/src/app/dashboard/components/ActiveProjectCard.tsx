'use client'

import { motion } from 'framer-motion'
import {
  Play,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  X,
  Film,
  Users,
  Maximize2,
  Sparkles,
  Edit3,
  Coins,
  Layers,
  Clock,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ThumbnailPromptDrawer from '@/components/project/ThumbnailPromptDrawer'
import { ImageEditModal } from '@/components/vision/ImageEditModal'
import { AdjustCreditsUsedDialog } from '@/components/credits/AdjustCreditsUsedDialog'

interface NextStep {
  name: string
  description: string
  estimatedCredits: number
  actionLabel: string
  actionUrl: string
  isComplete?: boolean
}

interface CueTip {
  message: string
  primaryAction?: {
    label: string
    url?: string
    onClick?: () => void
  }
  type: 'tip' | 'alert'
}

interface ActiveProjectCardProps {
  id: string | number
  title: string
  description?: string
  thumbnailUrl?: string
  currentStep: number
  totalSteps: number
  phaseName: string
  progressPercent: number
  audienceResonanceScore: number | null
  nextStep: NextStep
  cueTip?: CueTip
  estimatedCredits: number
  creditsUsed?: number
  sceneCount?: number
  isStarred?: boolean
  lastActive: string
  budgetStatus: 'on-track' | 'near-limit' | 'over-budget'
  collaborators?: number
  index?: number
  genre?: string
  metadata?: any
  onThumbnailUpdated?: (newUrl: string) => void
  onBudgetUpdated?: () => void
}

function NextStepPanel({ nextStep }: { nextStep: NextStep }) {
  if (nextStep.isComplete) {
    return (
      <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-lg p-3.5 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-300 font-semibold text-sm">Production Complete</span>
          </div>
          <p className="text-xs text-gray-300 mb-3 leading-relaxed">{nextStep.description}</p>
        </div>
        <Link href={nextStep.actionUrl}>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white w-full">
            {nextStep.actionLabel}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-3.5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Play className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-indigo-300 font-semibold text-sm">{nextStep.name}</span>
        </div>
        <p className="text-xs text-gray-300 mb-2 line-clamp-2 leading-relaxed">{nextStep.description}</p>
        <p className="text-[11px] text-gray-400 mb-3">
          Est. remaining: <span className="text-gray-200 font-medium">{nextStep.estimatedCredits.toLocaleString()} credits</span>
        </p>
      </div>
      <Link href={nextStep.actionUrl}>
        <Button size="sm" variant="primary" className="w-full shadow-md shadow-indigo-500/20">
          {nextStep.actionLabel}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </Link>
    </div>
  )
}

export function ActiveProjectCard({
  id,
  title,
  description,
  thumbnailUrl,
  currentStep,
  totalSteps,
  phaseName,
  progressPercent,
  audienceResonanceScore,
  nextStep,
  cueTip,
  estimatedCredits,
  creditsUsed: creditsUsedProp = 0,
  sceneCount = 0,
  isStarred = false,
  lastActive,
  budgetStatus,
  collaborators,
  index = 0,
  genre,
  metadata,
  onThumbnailUpdated,
  onBudgetUpdated,
}: ActiveProjectCardProps) {
  const [tipDismissed, setTipDismissed] = useState(false)
  const [expandedImageOpen, setExpandedImageOpen] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [adjustCreditsOpen, setAdjustCreditsOpen] = useState(false)
  const [displayCreditsUsed, setDisplayCreditsUsed] = useState(creditsUsedProp)

  useEffect(() => {
    setDisplayCreditsUsed(creditsUsedProp)
  }, [creditsUsedProp])

  const getBudgetBadge = () => {
    switch (budgetStatus) {
      case 'on-track':
        return { label: 'On track', dot: 'bg-emerald-400', className: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' }
      case 'near-limit':
        return { label: 'Near limit', dot: 'bg-amber-400', className: 'text-amber-300 bg-amber-500/15 border-amber-500/30' }
      case 'over-budget':
        return { label: 'Over budget', dot: 'bg-red-400', className: 'text-red-300 bg-red-500/15 border-red-500/30' }
    }
  }

  const budgetBadge = getBudgetBadge()
  const creditsUsed = Number.isFinite(Number(displayCreditsUsed)) ? Number(displayCreditsUsed) : 0
  const creditsBudget = Number(metadata?.creditsBudget ?? 0)
  const hasBudgetTarget = creditsBudget > 0
  const remainingCredits = hasBudgetTarget ? Math.max(creditsBudget - creditsUsed, 0) : null
  const budgetUtilizationPercent = hasBudgetTarget
    ? Math.min(100, Math.round((creditsUsed / creditsBudget) * 100))
    : null

  const clampedProgress = Math.max(5, Math.min(100, Math.round(progressPercent || 0)))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/60 shadow-2xl overflow-hidden hover:border-gray-600/70 transition-all duration-200"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Compact 16:9 / Studio Visual Preview */}
        <div className="relative group lg:col-span-5 min-h-[220px] sm:min-h-[240px] lg:min-h-full bg-gray-950 overflow-hidden">
          {thumbnailUrl && thumbnailUrl.startsWith('http') ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 1024px) 100vw, 480px"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-gray-900 to-gray-950 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mb-2">
                <Film className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-xs text-gray-400">No billboard artwork yet</p>
              <button
                type="button"
                onClick={() => setGenerateDialogOpen(true)}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-xs font-medium text-indigo-200 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Billboard
              </button>
            </div>
          )}

          {/* Subtle gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/20 to-transparent" />

          {/* Top Left Badges: Stage + Starred */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-900/85 backdrop-blur-md text-indigo-300 border border-indigo-500/40 shadow-sm">
              Stage {currentStep}/{totalSteps} · {phaseName}
            </span>
            {isStarred && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-yellow-500/20 backdrop-blur-md text-yellow-300 border border-yellow-500/40"
                title="Pinned as current project on Projects page"
              >
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                Pinned
              </span>
            )}
          </div>

          {/* Top Right Image Actions: Visible on touch / subtle on desktop until hover */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-95 lg:opacity-75 lg:group-hover:opacity-100 transition-opacity duration-200">
            {thumbnailUrl && thumbnailUrl.startsWith('http') && (
              <button
                type="button"
                onClick={() => setExpandedImageOpen(true)}
                className="p-2 bg-gray-900/80 backdrop-blur-md rounded-lg border border-white/15 text-gray-200 hover:text-white hover:bg-gray-900 transition-colors"
                title="View full image"
                aria-label="View full image"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setGenerateDialogOpen(true)}
              className="p-2 bg-indigo-600/85 backdrop-blur-md rounded-lg border border-indigo-400/30 text-white hover:bg-indigo-500 transition-colors"
              title="Generate billboard image"
              aria-label="Generate billboard image"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            {thumbnailUrl && thumbnailUrl.startsWith('http') && (
              <button
                type="button"
                onClick={() => setEditDialogOpen(true)}
                className="p-2 bg-purple-600/85 backdrop-blur-md rounded-lg border border-purple-400/30 text-white hover:bg-purple-500 transition-colors"
                title="Edit billboard image"
                aria-label="Edit billboard image"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Bottom Metadata Overlay on Image */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-xs text-gray-300">
            <div className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-gray-700/60">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {lastActive}
              </span>
              {sceneCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
                </span>
              )}
              {collaborators ? (
                <span>· {collaborators} collaborators</span>
              ) : null}
            </div>
            {genre && (
              <span className="px-2.5 py-1 rounded-md bg-gray-900/80 backdrop-blur-md border border-gray-700/60 text-gray-300 font-medium">
                {genre}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Project Details, Progress & 3-Column Metrics */}
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between gap-5">
          {/* Header + Progress Bar */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <Link href={nextStep.actionUrl} className="group/title inline-block">
                  <h3 className="text-xl font-bold text-white group-hover/title:text-indigo-300 transition-colors truncate">
                    {title}
                  </h3>
                </Link>
                {description && (
                  <p className="text-sm text-gray-400 line-clamp-1 mt-0.5">{description}</p>
                )}
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${budgetBadge.className}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${budgetBadge.dot}`} />
                Budget: {budgetBadge.label}
              </span>
            </div>

            {/* Workflow Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-400">
                  Current phase: <strong className="text-gray-200 font-medium">{phaseName}</strong>
                </span>
                <span className="text-indigo-300 font-medium">{clampedProgress}% complete</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3-Column Action & Health Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Column 1: Project Budget */}
            <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-3.5 flex flex-col justify-between">
              <div>
                <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2.5">
                  Project Budget
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Used</span>
                    <span className="text-white font-semibold inline-flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-indigo-400" />
                      {creditsUsed.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Target</span>
                    <span className="text-gray-200 font-medium">
                      {hasBudgetTarget ? creditsBudget.toLocaleString() : 'Not set'}
                    </span>
                  </div>
                  {hasBudgetTarget ? (
                    <>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            budgetStatus === 'over-budget'
                              ? 'bg-red-500'
                              : budgetStatus === 'near-limit'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${budgetUtilizationPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>{budgetUtilizationPercent}% used</span>
                        <span>{remainingCredits?.toLocaleString()} left</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Est. {estimatedCredits.toLocaleString()} credits to finish
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustCreditsOpen(true)}
                className="mt-2.5 text-left text-[11px] text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
              >
                Adjust used credits
              </button>
            </div>

            {/* Column 2: Audience Resonance (Truthful state) */}
            <div className="bg-gray-950/60 border border-gray-800 rounded-lg p-3.5 flex flex-col justify-between">
              <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                Audience Resonance
              </h4>
              {audienceResonanceScore !== null ? (
                <div className="flex flex-col items-center justify-center my-auto py-1">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <span className="text-3xl font-bold text-white">{audienceResonanceScore}</span>
                    <span className="text-xs text-gray-500">/100</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        audienceResonanceScore >= 85
                          ? 'bg-emerald-500'
                          : audienceResonanceScore >= 75
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${audienceResonanceScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    {audienceResonanceScore >= 85
                      ? '🟢 Greenlight Ready (85+)'
                      : audienceResonanceScore >= 75
                        ? '🟡 Solid Foundation'
                        : '🔴 Needs Refinement'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col justify-between flex-1">
                  <div className="flex items-center gap-2 text-gray-400 my-1">
                    <Users className="w-5 h-5 text-gray-600 shrink-0" />
                    <span className="text-xs text-gray-400 leading-snug">
                      Not analyzed yet
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2.5 leading-snug">
                    Score your treatment in Blueprint Room before generating scenes.
                  </p>
                  <Link
                    href={`/dashboard/studio/${id}`}
                    className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                  >
                    Run Resonance Analysis
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* Column 3: Next Step / Resume Action */}
            <div>
              <NextStepPanel nextStep={nextStep} />
            </div>
          </div>

          {/* Optional Cue Tip */}
          {cueTip && !tipDismissed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-lg p-3 flex items-start justify-between gap-3 ${
                cueTip.type === 'alert'
                  ? 'bg-orange-900/20 border border-orange-700/30'
                  : 'bg-indigo-900/20 border border-indigo-700/30'
              }`}
            >
              <div className="flex items-start gap-2.5 flex-1">
                {cueTip.type === 'alert' ? (
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                ) : (
                  <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                )}
                <p className={`text-xs ${cueTip.type === 'alert' ? 'text-orange-200' : 'text-indigo-200'}`}>
                  {cueTip.message}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {cueTip.primaryAction &&
                  (cueTip.primaryAction.url ? (
                    <Link href={cueTip.primaryAction.url}>
                      <Button size="sm" variant="outline" className="text-xs border-gray-600 text-gray-300 hover:text-white">
                        {cueTip.primaryAction.label}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-gray-600 text-gray-300 hover:text-white"
                      onClick={cueTip.primaryAction.onClick}
                    >
                      {cueTip.primaryAction.label}
                    </Button>
                  ))}
                <button
                  type="button"
                  onClick={() => setTipDismissed(true)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label="Dismiss tip"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Expanded Image Dialog */}
      <Dialog open={expandedImageOpen} onOpenChange={setExpandedImageOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-black">
          <DialogTitle className="sr-only">{title} Billboard</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center">
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={title}
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Image Dialog */}
      <ThumbnailPromptDrawer
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        project={{
          id: String(id),
          title,
          description: description || '',
          genre,
          metadata,
        }}
        currentThumbnail={thumbnailUrl}
        onThumbnailGenerated={(newUrl) => {
          setGenerateDialogOpen(false)
          onThumbnailUpdated?.(newUrl)
        }}
      />

      {/* Edit Image Dialog */}
      {thumbnailUrl && (
        <ImageEditModal
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          imageUrl={thumbnailUrl}
          imageType="scene"
          onSave={(newUrl) => {
            setEditDialogOpen(false)
            onThumbnailUpdated?.(newUrl)
          }}
          title="Edit Billboard Image"
        />
      )}

      <AdjustCreditsUsedDialog
        open={adjustCreditsOpen}
        onOpenChange={setAdjustCreditsOpen}
        projectId={String(id)}
        projectTitle={title}
        currentCreditsUsed={creditsUsed}
        onSaved={(next) => {
          setDisplayCreditsUsed(next)
          onBudgetUpdated?.()
        }}
      />
    </motion.div>
  )
}
