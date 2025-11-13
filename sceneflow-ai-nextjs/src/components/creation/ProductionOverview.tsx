import React from 'react'
import { creditsToUsd } from '@/lib/cost/creditUtils'

export interface ProductionOverviewMetrics {
  sequencedScenes: number
  totalScenes: number
  generatedDurationSec: number
  estimatedDurationSec: number
  totalAssets: number
  generationQueueLabel?: string
  generationQueueCount?: number
  creditsUsed?: number
  creditsForecast?: number
  totalCreditsEstimate?: number
}

interface ProductionOverviewProps {
  projectTitle?: string
  metrics: ProductionOverviewMetrics
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatCredits(value?: number): string {
  if (!Number.isFinite(value) || value === undefined) {
    return '—'
  }
  return `${Math.max(0, Math.round(value)).toLocaleString()} credits`
}

function formatUsd(credits?: number): string {
  if (!Number.isFinite(credits) || credits === undefined) {
    return '—'
  }
  const usd = creditsToUsd(credits)
  if (!Number.isFinite(usd) || usd <= 0) {
    return '—'
  }
  return `$${usd.toFixed(2)}`
}

export function ProductionOverview({ projectTitle, metrics }: ProductionOverviewProps) {
  const {
    sequencedScenes,
    totalScenes,
    generatedDurationSec,
    estimatedDurationSec,
    totalAssets,
    generationQueueLabel,
    generationQueueCount,
    creditsUsed,
    creditsForecast,
    totalCreditsEstimate,
  } = metrics

  const progress = estimatedDurationSec > 0
    ? Math.min(100, Math.round((generatedDurationSec / estimatedDurationSec) * 100))
    : 0

  const totalCredits = Math.max(0, (creditsUsed ?? 0) + (creditsForecast ?? 0))

  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Production Overview</h2>
          {projectTitle ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{projectTitle}</p>
          ) : null}
        </div>
        {generationQueueLabel ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
            {generationQueueLabel}
            {Number.isFinite(generationQueueCount) && generationQueueCount !== undefined ? (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px]">
                {generationQueueCount}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Scenes Sequenced</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{sequencedScenes}/{totalScenes}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Scenes with at least one visual asset on the timeline</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Video Generated</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{formatDuration(generatedDurationSec)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">/ {formatDuration(estimatedDurationSec)}</p>
          </div>
          <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{progress}% of target runtime sequenced</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Assets</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{totalAssets}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Video clips, uploads, and supplemental audio</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-4 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cost Snapshot</p>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Actual</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCredits(creditsUsed)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Forecast</span>
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">{formatCredits(creditsForecast)}</span>
          </div>
          <div className="flex items-baseline justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Total Estimate</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCredits(totalCreditsEstimate ?? totalCredits)}</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
            ≈ {formatUsd(totalCreditsEstimate ?? totalCredits)} cumulative spend
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Production Pace</h3>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Keep the timeline sequencing ahead of narration to maintain continuity. Remaining runtime will update as clips are generated or uploaded.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cost Guidance</h3>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Forecast assumes Veo 3.1 standard quality at current credit rates. Update video settings in the Studio panel to adjust pricing.
          </p>
        </div>
      </div>
    </section>
  )
}

export default ProductionOverview
