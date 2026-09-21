'use client'

import { ASSISTANT } from '@/lib/constants/assistant'
import { recommendationId } from '@/lib/script/audienceResonance/highImpact'
import {
  isPolishAnalysisStale,
  pendingPolishRecommendations,
} from '@/lib/script/scenePolish/formatPolishBeats'
import type { ScenePolishAnalysis } from '@/lib/script/scenePolish/types'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertTriangle,
  CheckSquare,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Square,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'

export function ScenePolishBadge({
  analysis,
  isPolishing,
  onPolish,
  onToggleExpand,
  isExpanded,
}: {
  analysis?: ScenePolishAnalysis | null
  isPolishing?: boolean
  onPolish?: () => void
  onToggleExpand?: () => void
  isExpanded?: boolean
}) {
  const t = useTranslations('production.studio')

  if (isPolishing) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border bg-emerald-500/20 text-emerald-300 border-emerald-400/50 opacity-80"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>{t('polishAnalyzing')}</span>
      </button>
    )
  }

  if (!analysis) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPolish?.()
              }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all bg-emerald-500/20 text-emerald-300 border-emerald-400/50 hover:bg-emerald-500/30 hover:border-emerald-400/70 shadow-sm"
            >
              <Sparkles className="w-3 h-3" />
              <span>{t('polish')}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-gray-900 text-white border border-gray-700">
            <p className="text-xs">{t('polishRunTooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const pending = pendingPolishRecommendations(analysis).length
  const aligned = analysis.issueCount === 0 || pending === 0
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand?.()
            }}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all cursor-pointer hover:scale-105 shadow-sm ${
              aligned
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-200 border-amber-400/50 hover:bg-amber-500/30'
            }`}
            aria-expanded={isExpanded}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {aligned ? t('polishAligned') : t('polishIssueCount', { count: pending })}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-gray-900 text-white border border-gray-700">
          <p className="text-xs">{t('polishTooltip')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function ScenePolishPanel({
  scene,
  analysis,
  sceneIndex,
  isExpanded,
  isPolishing,
  onPolish,
  onToggleRecommendation,
  onEditWithRecommendations,
  onEditScene,
}: {
  scene: unknown
  analysis: ScenePolishAnalysis
  sceneIndex: number
  isExpanded: boolean
  isPolishing?: boolean
  onPolish?: (sceneIndex: number) => void | Promise<void>
  onToggleRecommendation?: (sceneIndex: number, recId: string, applied: boolean) => void
  onEditWithRecommendations?: (sceneIndex: number, recommendations: string[]) => void
  onEditScene?: (sceneIndex: number) => void
}) {
  const t = useTranslations('production.studio')
  const stale = isPolishAnalysisStale(analysis, scene as never)
  const pending = pendingPolishRecommendations(analysis)

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="mt-3 p-4 bg-gradient-to-br from-emerald-950/40 to-gray-900/80 border border-emerald-700/40 rounded-xl shadow-lg backdrop-blur-sm">
            {analysis.notes && (
              <div className="mb-4 p-3 bg-gray-800/40 rounded-lg border-l-2 border-emerald-500/50">
                <p className="text-xs text-gray-300 leading-relaxed italic">"{analysis.notes}"</p>
              </div>
            )}

            {stale && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xs text-amber-200 flex-1">{t('polishStale')}</span>
                {onPolish && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      void onPolish(sceneIndex)
                    }}
                    disabled={isPolishing}
                    className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg"
                  >
                    {isPolishing ? <Loader2 className="w-3 h-3 animate-spin" /> : t('polishReRun')}
                  </Button>
                )}
              </div>
            )}

            {(analysis.recommendations?.length || 0) > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-emerald-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t('polishRecommendations')}
                </p>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, rIdx) => {
                    const recId = rec.id || recommendationId(rec, rIdx)
                    const isApplied = (analysis.appliedRecommendationIds || []).includes(recId)
                    return (
                      <li
                        key={recId}
                        className={`text-xs text-gray-300 flex gap-3 p-2.5 rounded-lg border transition-colors ${
                          isApplied
                            ? 'bg-emerald-950/30 border-emerald-500/20'
                            : 'bg-gray-800/40 border-gray-700/30 hover:bg-gray-800/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleRecommendation?.(sceneIndex, recId, !isApplied)
                          }}
                          className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-white"
                          aria-label={isApplied ? 'Reopen fix' : 'Mark fix applied'}
                          aria-pressed={isApplied}
                        >
                          {isApplied ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={`leading-relaxed ${isApplied ? 'line-through opacity-60' : ''}`}>
                            {rec.text}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {rec.beatIndices.map((n) => (
                              <span
                                key={`${recId}-beat-${n}`}
                                className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                              >
                                {t('polishBeat', { number: n })}
                              </span>
                            ))}
                            <span
                              className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                rec.priority === 'high'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : rec.priority === 'medium'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {rec.priority}
                            </span>
                            <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400 border border-gray-600/30">
                              {t(`polishCategory.${rec.category}`)}
                            </span>
                          </div>
                          {rec.reason && (
                            <p className="text-[11px] text-gray-500 mt-1.5">{rec.reason}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-700/50">
              {onEditWithRecommendations && pending.length > 0 && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditWithRecommendations(
                      sceneIndex,
                      pending.map((rec) => rec.text)
                    )
                  }}
                  className="h-8 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg shadow-md"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  {ASSISTANT.short} & Apply
                </Button>
              )}
              {onEditScene && pending.length === 0 && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditScene(sceneIndex)
                  }}
                  className="h-8 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  {ASSISTANT.short}
                </Button>
              )}
              {onPolish && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    void onPolish(sceneIndex)
                  }}
                  disabled={isPolishing}
                  className="h-8 text-xs border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 rounded-lg"
                >
                  {isPolishing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      {t('polishAnalyzing')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      {t('polishReRun')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
