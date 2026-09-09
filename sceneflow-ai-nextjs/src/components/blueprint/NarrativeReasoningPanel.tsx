'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Award, Lightbulb, RefreshCw, Sparkles, Users } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BlueprintListenButton } from '@/components/blueprint/BlueprintListenButton'
import { useBlueprintTtsContext } from '@/contexts/BlueprintTtsContext'
import type { NarrativeReasoningNarrationInput } from '@/lib/blueprint/buildNarrativeReasoningNarrationText'
import { buildNarrativeReasoningNarrationText } from '@/lib/blueprint/buildNarrativeReasoningNarrationText'
import { useContentTranslation } from '@/i18n/content/useContentTranslation'
import { buildNarrativeReasoningDisplayFields } from '@/i18n/content/buildBlueprintDisplayFields'
import { EMPTY_ENTITY_I18N, type EntityI18n } from '@/i18n/content/entityI18n'
import { TranslationNotice } from '@/components/i18n/LocalizedField'

export type NarrativeReasoning = NarrativeReasoningNarrationInput

const TAB_IDS = ['characterFocus', 'keyDecisions', 'storyStrengths', 'emphasis'] as const
type ReasoningTabId = (typeof TAB_IDS)[number]

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
  const tts = useBlueprintTtsContext()
  const playId = 'reasoning-narration'

  const fields = useMemo(
    () => buildNarrativeReasoningDisplayFields(reasoning),
    [reasoning]
  )
  const resolvedI18n = contentI18n ?? EMPTY_ENTITY_I18N
  const {
    resolve,
    needsTranslation,
    isLoading: contentTranslating,
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

  const narrationText = useMemo(
    () => buildNarrativeReasoningNarrationText(localizedReasoning),
    [localizedReasoning]
  )

  const isActive = tts.loadingId === playId
  const isLoading =
    isActive &&
    tts.generationProgress != null &&
    tts.generationProgress.phase !== 'playing'

  const availableTabs = useMemo(() => {
    if (!localizedReasoning) return [] as ReasoningTabId[]
    const tabs: ReasoningTabId[] = []
    if (localizedReasoning.character_focus?.trim()) tabs.push('characterFocus')
    const decisions = localizedReasoning.key_decisions || []
    if (decisions.length > 0) tabs.push('keyDecisions')
    if (localizedReasoning.story_strengths?.trim()) tabs.push('storyStrengths')
    if (localizedReasoning.user_adjustments?.trim()) tabs.push('emphasis')
    return tabs
  }, [localizedReasoning])

  const [activeTab, setActiveTab] = useState<ReasoningTabId>('characterFocus')

  React.useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0])
    }
  }, [availableTabs, activeTab])

  if (!reasoning || !localizedReasoning) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">{t('title')}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
          </div>
          <BlueprintListenButton
            variant="purple"
            disabled
            isPlaying={false}
            onPlay={() => {}}
            onStop={() => {}}
          />
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-4">
          <p className="text-sm text-gray-400">{t('noneRecorded')}</p>
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
  const isEmpty = availableTabs.length === 0

  const tabLabel: Record<ReasoningTabId, string> = {
    characterFocus: t('characterFocus'),
    keyDecisions: t('keyDecisions'),
    storyStrengths: t('storyStrengths'),
    emphasis: t('wantDifferentEmphasis'),
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
            {t('title')}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
        </div>
        <BlueprintListenButton
          variant="purple"
          isPlaying={isActive && !isLoading}
          isLoading={isLoading}
          disabled={!tts.enabled || tts.voices.length === 0 || !narrationText.trim()}
          onPlay={() => void tts.playText(narrationText, playId)}
          onStop={tts.stopAny}
        />
      </div>

      {needsTranslation ? (
        <TranslationNotice
          sourceLocale={sourceLocale}
          uiLocale={uiLocale}
          isLoading={contentTranslating}
          pendingCount={pendingCount}
        />
      ) : null}

      {isEmpty ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-200/90">{t('notProvided')}</p>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ReasoningTabId)}
          className="w-full"
        >
          <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-900/60 p-1">
            {availableTabs.map((tabId) => (
              <TabsTrigger
                key={tabId}
                value={tabId}
                className="text-xs sm:text-sm data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-100"
              >
                {tabLabel[tabId]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="characterFocus" className="mt-4">
            {characterFocus ? (
              <section className="rounded-lg border border-blue-500/25 bg-blue-500/10 p-4">
                <h4 className="text-sm font-semibold text-blue-100 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('characterFocus')}
                </h4>
                <p className="text-sm text-gray-200 leading-7">{characterFocus}</p>
              </section>
            ) : null}
          </TabsContent>

          <TabsContent value="keyDecisions" className="mt-4 space-y-3">
            {decisions.map((decision, idx) => (
              <div
                key={idx}
                className="rounded-lg border-l-2 border-purple-500 bg-purple-500/10 p-4"
              >
                <div className="text-sm font-medium text-purple-100 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  {decision.decision}
                </div>
                {decision.why ? (
                  <p className="text-sm text-gray-200 leading-7 mb-2">
                    <strong className="font-semibold text-purple-200">{t('why')}</strong>{' '}
                    {decision.why}
                  </p>
                ) : null}
                {decision.impact ? (
                  <p className="text-sm text-gray-300 leading-7 italic">
                    <strong className="font-semibold not-italic text-purple-200">
                      {t('impact')}
                    </strong>{' '}
                    {decision.impact}
                  </p>
                ) : null}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="storyStrengths" className="mt-4">
            {storyStrengths ? (
              <section className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4">
                <h4 className="text-sm font-semibold text-emerald-100 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  {t('storyStrengths')}
                </h4>
                <p className="text-sm text-gray-200 leading-7">{storyStrengths}</p>
              </section>
            ) : null}
          </TabsContent>

          <TabsContent value="emphasis" className="mt-4">
            {userAdjustments ? (
              <section className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4">
                <h4 className="text-sm font-semibold text-amber-100 mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {t('wantDifferentEmphasis')}
                </h4>
                <p className="text-sm text-gray-200 leading-7">{userAdjustments}</p>
              </section>
            ) : null}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default NarrativeReasoningPanel
