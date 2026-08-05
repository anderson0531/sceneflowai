'use client'

import React, { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Award, Lightbulb, RefreshCw, Sparkles, Users } from 'lucide-react'
import { BlueprintNarrationSection } from '@/components/blueprint/BlueprintNarrationSection'
import type { NarrativeReasoningNarrationInput } from '@/lib/blueprint/buildNarrativeReasoningNarrationText'
import { useContentTranslation } from '@/i18n/content/useContentTranslation'
import { buildNarrativeReasoningDisplayFields } from '@/i18n/content/buildBlueprintDisplayFields'
import { EMPTY_ENTITY_I18N, type EntityI18n } from '@/i18n/content/entityI18n'

export type NarrativeReasoning = NarrativeReasoningNarrationInput

/**
 * The AI's account of the choices it made. Lives in the side panel's Reasoning
 * tab so the blueprint body stays about the blueprint itself.
 */
export function NarrativeReasoningPanel({
  reasoning,
  contentI18n,
}: {
  reasoning?: NarrativeReasoning | null
  contentI18n?: EntityI18n
}) {
  const t = useTranslations('blueprint.reasoning')

  const fields = useMemo(
    () => buildNarrativeReasoningDisplayFields(reasoning),
    [reasoning]
  )
  const resolvedI18n = contentI18n ?? EMPTY_ENTITY_I18N
  const { resolve } = useContentTranslation({
    fields,
    i18n: resolvedI18n,
    enabled: Boolean(reasoning),
  })
  const text = useCallback(
    (path: string, fallback = '') => resolve(path).text || fallback,
    [resolve]
  )

  if (!reasoning) {
    return (
      <div className="p-4 space-y-4">
        <BlueprintNarrationSection reasoning={null} playId="reasoning-narration" />
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
          <p className="text-xs text-gray-400">{t('noneRecorded')}</p>
        </div>
      </div>
    )
  }

  const decisions = Array.isArray(reasoning.key_decisions) ? reasoning.key_decisions : []
  const characterFocus = text(
    'narrativeReasoning.character_focus',
    reasoning.character_focus || ''
  )
  const storyStrengths = text(
    'narrativeReasoning.story_strengths',
    reasoning.story_strengths || ''
  )
  const userAdjustments = text(
    'narrativeReasoning.user_adjustments',
    reasoning.user_adjustments || ''
  )
  const isEmpty = !characterFocus && !storyStrengths

  return (
    <div className="p-4 space-y-4">
      <BlueprintNarrationSection reasoning={reasoning} playId="reasoning-narration" />

      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-white">{t('title')}</h3>
          <p className="text-[11px] text-gray-500">{t('subtitle')}</p>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-200/90">{t('notProvided')}</p>
        </div>
      ) : (
        <>
          {characterFocus && (
            <section className="rounded-lg border border-blue-500/25 bg-blue-500/10 p-3">
              <h4 className="text-xs font-semibold text-blue-100 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {t('characterFocus')}
              </h4>
              <p className="text-xs text-blue-100/90 leading-relaxed">{characterFocus}</p>
            </section>
          )}

          {decisions.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                {t('keyDecisions')}
              </h4>
              {decisions.map((decision, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border-l-2 border-purple-500 bg-purple-500/10 p-3"
                >
                  <div className="text-xs font-medium text-purple-100 mb-1">
                    {text(
                      `narrativeReasoning.key_decisions[${idx}].decision`,
                      decision.decision || ''
                    )}
                  </div>
                  {decision.why && (
                    <p className="text-[11px] text-purple-100/90 mb-1">
                      <strong className="font-semibold">{t('why')}</strong>{' '}
                      {text(
                        `narrativeReasoning.key_decisions[${idx}].why`,
                        decision.why
                      )}
                    </p>
                  )}
                  {decision.impact && (
                    <p className="text-[11px] text-purple-200/80 italic">
                      <strong className="font-semibold not-italic">{t('impact')}</strong>{' '}
                      {text(
                        `narrativeReasoning.key_decisions[${idx}].impact`,
                        decision.impact
                      )}
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}

          {storyStrengths && (
            <section className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3">
              <h4 className="text-xs font-semibold text-emerald-100 mb-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                {t('storyStrengths')}
              </h4>
              <p className="text-xs text-emerald-100/90 leading-relaxed">{storyStrengths}</p>
            </section>
          )}

          {userAdjustments && (
            <section className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
              <h4 className="text-xs font-semibold text-amber-100 mb-1.5 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {t('wantDifferentEmphasis')}
              </h4>
              <p className="text-xs text-amber-100/90 leading-relaxed">{userAdjustments}</p>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default NarrativeReasoningPanel
