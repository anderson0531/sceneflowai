'use client'

import React, { useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Award, Lightbulb, RefreshCw, Sparkles, Users } from 'lucide-react'
import { BlueprintNarrationSection } from '@/components/blueprint/BlueprintNarrationSection'
import type { NarrativeReasoningNarrationInput } from '@/lib/blueprint/buildNarrativeReasoningNarrationText'
import { useContentTranslation } from '@/i18n/content/useContentTranslation'
import { buildNarrativeReasoningDisplayFields } from '@/i18n/content/buildBlueprintDisplayFields'
import { EMPTY_ENTITY_I18N, type EntityI18n } from '@/i18n/content/entityI18n'
import { TranslationNotice } from '@/components/i18n/LocalizedField'

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
  const {
    resolve,
    needsTranslation,
    isLoading,
    pendingCount,
    uiLocale,
    sourceLocale,
  } = useContentTranslation({
    fields,
    i18n: resolvedI18n,
    enabled: Boolean(reasoning),
  })
  const text = useCallback(
    (path: string, fallback = '') => resolve(path).text || fallback,
    [resolve]
  )

  const localizedReasoning = useMemo((): NarrativeReasoning | null => {
    if (!reasoning) return null
    const decisions = Array.isArray(reasoning.key_decisions)
      ? reasoning.key_decisions
      : []
    return {
      ...reasoning,
      character_focus: text(
        'narrativeReasoning.character_focus',
        reasoning.character_focus || ''
      ),
      story_strengths: text(
        'narrativeReasoning.story_strengths',
        reasoning.story_strengths || ''
      ),
      user_adjustments: text(
        'narrativeReasoning.user_adjustments',
        reasoning.user_adjustments || ''
      ),
      key_decisions: decisions.map((decision, idx) => ({
        ...decision,
        decision: text(
          `narrativeReasoning.key_decisions[${idx}].decision`,
          decision.decision || ''
        ),
        why: decision.why
          ? text(`narrativeReasoning.key_decisions[${idx}].why`, decision.why)
          : decision.why,
        impact: decision.impact
          ? text(
              `narrativeReasoning.key_decisions[${idx}].impact`,
              decision.impact
            )
          : decision.impact,
      })),
    }
  }, [reasoning, text])

  if (!reasoning || !localizedReasoning) {
    return (
      <div className="p-4 space-y-4">
        <BlueprintNarrationSection reasoning={null} playId="reasoning-narration" />
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
          <p className="text-xs text-gray-400">{t('noneRecorded')}</p>
        </div>
      </div>
    )
  }

  const decisions = Array.isArray(localizedReasoning.key_decisions)
    ? localizedReasoning.key_decisions
    : []
  const characterFocus = localizedReasoning.character_focus || ''
  const storyStrengths = localizedReasoning.story_strengths || ''
  const userAdjustments = localizedReasoning.user_adjustments || ''
  const isEmpty = !characterFocus && !storyStrengths

  return (
    <div className="p-4 space-y-4">
      <BlueprintNarrationSection
        reasoning={localizedReasoning}
        playId="reasoning-narration"
      />

      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-white">{t('title')}</h3>
          <p className="text-[11px] text-gray-500">{t('subtitle')}</p>
        </div>
      </div>

      {needsTranslation ? (
        <TranslationNotice
          sourceLocale={sourceLocale}
          uiLocale={uiLocale}
          isLoading={isLoading}
          pendingCount={pendingCount}
        />
      ) : null}

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
                    {decision.decision}
                  </div>
                  {decision.why && (
                    <p className="text-[11px] text-purple-100/90 mb-1">
                      <strong className="font-semibold">{t('why')}</strong> {decision.why}
                    </p>
                  )}
                  {decision.impact && (
                    <p className="text-[11px] text-purple-200/80 italic">
                      <strong className="font-semibold not-italic">{t('impact')}</strong>{' '}
                      {decision.impact}
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
