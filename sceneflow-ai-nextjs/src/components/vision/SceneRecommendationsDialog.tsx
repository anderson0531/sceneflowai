'use client'

import { ASSISTANT } from '@/lib/constants/assistant'
import { recommendationId } from '@/lib/script/audienceResonance/highImpact'
import { pendingPolishRecommendations } from '@/lib/script/scenePolish/formatPolishBeats'
import type { ScenePolishAnalysis } from '@/lib/script/scenePolish/types'
import { coerceDialogueLineText } from '@/lib/script/segmentScript'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  CheckSquare,
  Lightbulb,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Square,
  Users,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

type AudienceRecommendation =
  | string
  | {
      text?: string
      category?: string
      impact?: string
      priority?: string
      pointsDeducted?: number
      line?: unknown
      character?: string
    }

type AudienceAnalysis = {
  score?: number
  previousScore?: number
  pacing?: string
  tension?: string
  characterDevelopment?: string
  visualPotential?: string
  notes?: string
  recommendations?: AudienceRecommendation[]
  appliedRecommendationIds?: string[]
  optimizedAt?: string
  analyzedAt?: string
}

export function SceneRecommendationsDialog({
  open,
  onOpenChange,
  sceneNumber,
  sceneHeading,
  audienceAnalysis,
  polishAnalysis,
  sceneIndex,
  isAnalyzing,
  isPolishing,
  onAnalyze,
  onPolish,
  onToggleAudienceRecommendation,
  onTogglePolishRecommendation,
  onEditWithAudienceRecommendations,
  onEditWithPolishRecommendations,
  onEditScene,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sceneNumber?: number | string
  sceneHeading?: string
  audienceAnalysis?: AudienceAnalysis | null
  polishAnalysis?: ScenePolishAnalysis | null
  sceneIndex: number
  isAnalyzing?: boolean
  isPolishing?: boolean
  onAnalyze?: (sceneIndex: number) => void | Promise<void>
  onPolish?: (sceneIndex: number) => void | Promise<void>
  onToggleAudienceRecommendation?: (sceneIndex: number, recId: string, applied: boolean) => void
  onTogglePolishRecommendation?: (sceneIndex: number, recId: string, applied: boolean) => void
  onEditWithAudienceRecommendations?: (sceneIndex: number, recommendations: string[]) => void
  onEditWithPolishRecommendations?: (sceneIndex: number, recommendations: string[]) => void
  onEditScene?: (sceneIndex: number) => void
}) {
  const t = useTranslations('production.studio')
  const pendingPolish = polishAnalysis ? pendingPolishRecommendations(polishAnalysis) : []
  const audienceRecs = audienceAnalysis?.recommendations || []
  const pendingAudience = audienceRecs.filter(
    (rec, index) => !(audienceAnalysis?.appliedRecommendationIds || []).includes(recommendationId(rec, index))
  )
  const scoreOptimized =
    !!audienceAnalysis?.optimizedAt &&
    !!audienceAnalysis?.analyzedAt &&
    new Date(audienceAnalysis.optimizedAt) > new Date(audienceAnalysis.analyzedAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-slate-900 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Lightbulb className="h-5 w-5 text-violet-300" />
            {t('recommendationsDialogTitle')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {sceneNumber != null
              ? t('recommendationsDialogDescription', {
                  scene: `SCENE ${sceneNumber}${sceneHeading ? `: ${sceneHeading}` : ''}`,
                })
              : t('recommendationsTooltip')}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-300" />
              <h3 className="text-sm font-semibold text-cyan-200">{t('audienceResonance')}</h3>
              {audienceAnalysis?.score !== undefined && (
                <span className="text-xs font-semibold tabular-nums text-white">
                  {audienceAnalysis.score}/100
                </span>
              )}
            </div>

            {audienceAnalysis ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Pacing', value: audienceAnalysis.pacing, icon: '⚡' },
                    { label: 'Tension', value: audienceAnalysis.tension, icon: '🎭' },
                    { label: 'Character', value: audienceAnalysis.characterDevelopment, icon: '👤' },
                    { label: 'Visual', value: audienceAnalysis.visualPotential, icon: '🎬' },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="flex flex-col items-center p-2 bg-gray-800/50 rounded-lg border border-gray-700/40"
                    >
                      <span className="text-sm mb-1">{metric.icon}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{metric.label}</span>
                      <span className="text-xs font-medium text-gray-200 capitalize">{metric.value || '—'}</span>
                    </div>
                  ))}
                </div>

                {audienceAnalysis.notes && (
                  <div className="p-3 bg-gray-800/40 rounded-lg border-l-2 border-cyan-500/50">
                    <p className="text-xs text-gray-300 leading-relaxed italic">"{audienceAnalysis.notes}"</p>
                  </div>
                )}

                {scoreOptimized && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-amber-200 flex-1">
                      Scene optimized since last analysis - score may have changed
                    </span>
                    {onAnalyze && (
                      <Button
                        size="sm"
                        onClick={() => void onAnalyze(sceneIndex)}
                        disabled={isAnalyzing}
                        className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg"
                      >
                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Re-analyze'}
                      </Button>
                    )}
                  </div>
                )}

                {audienceRecs.length > 0 && (
                  <ul className="space-y-2">
                    {audienceRecs.map((rec, rIdx) => {
                      const recText = audienceRecommendationText(rec)
                      const recCategory = typeof rec === 'object' && rec?.category ? rec.category : null
                      const recImpact = typeof rec === 'object' && rec?.impact ? rec.impact : null
                      const recPriority = typeof rec === 'object' && rec?.priority ? rec.priority : null
                      const recPointsDeducted =
                        typeof rec === 'object' && rec?.pointsDeducted ? rec.pointsDeducted : null
                      const recId = recommendationId(rec, rIdx)
                      const isApplied = (audienceAnalysis.appliedRecommendationIds || []).includes(recId)
                      return (
                        <li
                          key={recId}
                          className={`text-xs text-gray-300 flex gap-3 p-2.5 rounded-lg border transition-colors ${
                            isApplied
                              ? 'bg-emerald-950/30 border-emerald-500/20'
                              : 'bg-gray-800/40 border-gray-700/30'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onToggleAudienceRecommendation?.(sceneIndex, recId, !isApplied)}
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
                              {recText}
                            </span>
                            {(recCategory || recImpact || recPriority || recPointsDeducted) && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {recPriority && (
                                  <span
                                    className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                      recPriority === 'high'
                                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                        : recPriority === 'medium'
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    }`}
                                  >
                                    {recPriority}
                                  </span>
                                )}
                                {recPointsDeducted && (
                                  <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                                    -{recPointsDeducted} pts
                                  </span>
                                )}
                                {recImpact && (
                                  <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider bg-gray-700/50 text-gray-300 border border-gray-600/30">
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
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="flex items-center gap-3 pt-1">
                  {onEditWithAudienceRecommendations && pendingAudience.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() =>
                        onEditWithAudienceRecommendations(
                          sceneIndex,
                          pendingAudience.map((rec) => audienceRecommendationText(rec))
                        )
                      }
                      className="h-8 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      {ASSISTANT.short} &amp; Apply
                    </Button>
                  )}
                  {onEditScene && pendingAudience.length === 0 && (
                    <Button
                      size="sm"
                      onClick={() => onEditScene(sceneIndex)}
                      className="h-8 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      {ASSISTANT.short}
                    </Button>
                  )}
                  {onAnalyze && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void onAnalyze(sceneIndex)}
                      disabled={isAnalyzing}
                      className="h-8 text-xs border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 rounded-lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Analyze
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 p-3 flex items-center gap-3">
                <p className="text-xs text-gray-400 flex-1">{t('recommendationsArEmpty')}</p>
                {onAnalyze && (
                  <Button
                    size="sm"
                    onClick={() => void onAnalyze(sceneIndex)}
                    disabled={isAnalyzing}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                  >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('audienceResonance')}
                  </Button>
                )}
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-gray-700/50 pt-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <h3 className="text-sm font-semibold text-emerald-200">{t('polishRecommendations')}</h3>
            </div>

            {isPolishing && (
              <p className="text-xs text-emerald-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('polishAnalyzing')}
              </p>
            )}

            {polishAnalysis ? (
              <>
                {polishAnalysis.notes && (
                  <div className="p-3 bg-gray-800/40 rounded-lg border-l-2 border-emerald-500/50">
                    <p className="text-xs text-gray-300 leading-relaxed italic">"{polishAnalysis.notes}"</p>
                  </div>
                )}

                {(polishAnalysis.recommendations?.length || 0) > 0 && (
                  <ul className="space-y-2">
                    {polishAnalysis.recommendations.map((rec, rIdx) => {
                      const recId = rec.id || recommendationId(rec, rIdx)
                      const isApplied = (polishAnalysis.appliedRecommendationIds || []).includes(recId)
                      return (
                        <li
                          key={recId}
                          className={`text-xs text-gray-300 flex gap-3 p-2.5 rounded-lg border ${
                            isApplied
                              ? 'bg-emerald-950/30 border-emerald-500/20'
                              : 'bg-gray-800/40 border-gray-700/30'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onTogglePolishRecommendation?.(sceneIndex, recId, !isApplied)}
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
                            {rec.reason && <p className="text-[11px] text-gray-500 mt-1.5">{rec.reason}</p>}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="flex items-center gap-3 pt-1">
                  {onEditWithPolishRecommendations && pendingPolish.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() =>
                        onEditWithPolishRecommendations(
                          sceneIndex,
                          pendingPolish.map((rec) => rec.text)
                        )
                      }
                      className="h-8 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      {ASSISTANT.short} &amp; Apply
                    </Button>
                  )}
                  {onEditScene && pendingPolish.length === 0 && (
                    <Button
                      size="sm"
                      onClick={() => onEditScene(sceneIndex)}
                      className="h-8 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      {ASSISTANT.short}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              !isPolishing && (
                <div className="rounded-lg border border-gray-700/50 bg-gray-800/40 p-3 flex items-center gap-3">
                  <p className="text-xs text-gray-400 flex-1">{t('recommendationsPolishEmpty')}</p>
                  {onPolish && (
                    <Button
                      size="sm"
                      onClick={() => void onPolish(sceneIndex)}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      {t('polish')}
                    </Button>
                  )}
                </div>
              )
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function audienceRecommendationText(rec: AudienceRecommendation): string {
  if (typeof rec === 'string') return rec
  if (rec && typeof rec.text === 'string') return rec.text
  const line = coerceDialogueLineText((rec as { line?: unknown })?.line)
  if (line && typeof rec?.character === 'string') return `${rec.character}: ${line}`
  return line || String(rec)
}

export function pendingRecommendationCount(
  audienceAnalysis?: AudienceAnalysis | null,
  polishAnalysis?: ScenePolishAnalysis | null
): number {
  const audience = (audienceAnalysis?.recommendations || []).filter(
    (rec, index) =>
      !(audienceAnalysis?.appliedRecommendationIds || []).includes(recommendationId(rec, index))
  ).length
  const polish = polishAnalysis ? pendingPolishRecommendations(polishAnalysis).length : 0
  return audience + polish
}
