'use client'

import { motion } from 'framer-motion'
import { FolderOpen, Play, ChevronRight, CheckCircle, AlertTriangle, Lightbulb, X, Film } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'

interface ReviewScores {
  director: number
  audience: number
  avgScene?: number
}

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
  scores: ReviewScores
  nextStep: NextStep
  cueTip?: CueTip
  estimatedCredits: number
  lastActive: string
  budgetStatus: 'on-track' | 'near-limit' | 'over-budget'
  collaborators?: number
  index?: number
}

function ReviewScoreBadge({ 
  label, 
  icon, 
  score 
}: { 
  label: string
  icon: React.ReactNode
  score: number 
}) {
  const getScoreStatus = (score: number) => {
    if (score >= 85) return { color: 'bg-green-500', status: '🟢', barColor: 'bg-green-500' }
    if (score >= 75) return { color: 'bg-yellow-500', status: '🟡', barColor: 'bg-yellow-500' }
    return { color: 'bg-red-500', status: '🔴', barColor: 'bg-red-500' }
  }

  const { status, barColor } = getScoreStatus(score)

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <span className="text-sm text-gray-300 w-16">{label}</span>
      <span className="text-sm font-bold text-white w-8">{score}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-2 max-w-[100px]">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs">{status}</span>
    </div>
  )
}

function NextStepPanel({ nextStep }: { nextStep: NextStep }) {
  if (nextStep.isComplete) {
    return (
      <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-semibold">All Steps Complete</span>
        </div>
        <p className="text-sm text-gray-400 mb-3">Ready to Export!</p>
        <p className="text-xs text-gray-500 mb-3">HD/4K available</p>
        <Link href={nextStep.actionUrl}>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full">
            {nextStep.actionLabel}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-4 h-4 text-blue-400" />
        <span className="text-blue-400 font-semibold text-sm">{nextStep.name}</span>
      </div>
      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{nextStep.description}</p>
      <p className="text-xs text-gray-500 mb-3">Est: {nextStep.estimatedCredits} credits</p>
      <Link href={nextStep.actionUrl}>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full">
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
  scores,
  nextStep,
  cueTip,
  estimatedCredits,
  lastActive,
  budgetStatus,
  collaborators,
  index = 0
}: ActiveProjectCardProps) {
  const [tipDismissed, setTipDismissed] = useState(false)

  const getBudgetBadge = () => {
    switch (budgetStatus) {
      case 'on-track':
        return { label: '🟢', className: 'text-green-400' }
      case 'near-limit':
        return { label: '🟡', className: 'text-yellow-400' }
      case 'over-budget':
        return { label: '🔴', className: 'text-red-400' }
    }
  }

  const budgetBadge = getBudgetBadge()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden hover:border-gray-600/50 transition-all duration-200"
    >
      {/* Cinematic Header with Thumbnail */}
      <div className="relative">
        {/* Thumbnail Image */}
        <div className="relative h-96 w-full overflow-hidden">
          {thumbnailUrl && thumbnailUrl.startsWith('http') ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center">
              <Film className="w-16 h-16 text-gray-700" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        </div>
        
        {/* Title overlay on thumbnail */}
        <div className="absolute bottom-0 left-0 right-0 px-6 py-4">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600/30 backdrop-blur-sm rounded-xl flex items-center justify-center border border-blue-500/30">
                <FolderOpen className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white drop-shadow-lg">{title}</h3>
                {description && (
                  <p className="text-sm text-gray-300 line-clamp-1 drop-shadow">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="text-sm text-gray-400">Budget:</span>
              <span className={budgetBadge.className}>{budgetBadge.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Column Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Progress */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Progress</h4>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                Step {currentStep}/{totalSteps}
              </div>
              <div className="text-sm text-gray-400 mb-4">{phaseName}</div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">{progressPercent}%</div>
            </div>
          </div>

          {/* Column 2: Review Scores */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Review Scores</h4>
            <div className="space-y-3">
              <ReviewScoreBadge 
                label="Director" 
                icon="🎬" 
                score={scores.director} 
              />
              <ReviewScoreBadge 
                label="Audience" 
                icon="👥" 
                score={scores.audience} 
              />
              {scores.avgScene && (
                <div className="pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-500">
                    Avg Scene: <span className="text-white font-medium">{scores.avgScene}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Next Step */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Next Step</h4>
            <NextStepPanel nextStep={nextStep} />
          </div>
        </div>

        {/* Cue Tip */}
        {cueTip && !tipDismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-4 rounded-lg p-4 flex items-start justify-between gap-4 ${
              cueTip.type === 'alert' 
                ? 'bg-orange-900/20 border border-orange-700/30' 
                : 'bg-indigo-900/20 border border-indigo-700/30'
            }`}
          >
            <div className="flex items-start gap-3 flex-1">
              {cueTip.type === 'alert' ? (
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm ${cueTip.type === 'alert' ? 'text-orange-200' : 'text-indigo-200'}`}>
                  {cueTip.type === 'alert' ? '⚠️ ALERT: ' : '💡 CUE: '}
                  {cueTip.message}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cueTip.primaryAction && (
                cueTip.primaryAction.url ? (
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
                )
              )}
              <button 
                onClick={() => setTipDismissed(true)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-700/50 bg-gray-900/30 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-gray-500">
          <span>Est. Credits: <span className="text-white">{estimatedCredits.toLocaleString()}</span></span>
          <span>•</span>
          <span>Last Active: {lastActive}</span>
          {collaborators && (
            <>
              <span>•</span>
              <span>Collaborators: {collaborators}</span>
            </>
          )}
        </div>
        <Link href={`/dashboard/workflow/vision/${id}`}>
          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
            Open Project
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}
