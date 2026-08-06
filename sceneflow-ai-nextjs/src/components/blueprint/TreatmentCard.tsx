'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useGuideStore } from '@/store/useGuideStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Square, Volume2, MoreHorizontal, ChevronDown, MessageSquare, Loader2, Wand2, X, Users, Lightbulb, SparklesIcon, Award, RefreshCw, FileText, Printer, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import BlueprintReimaginDialog from './BlueprintReimaginDialog'
import type { OpenBlueprintRefineOptions } from '@/lib/blueprint/openBlueprintRefine'
import type { BlueprintFixSection } from '@/lib/types/audienceResonance'
import { BlueprintGeminiVoicePicker } from '@/components/blueprint/BlueprintGeminiVoicePicker'
import { DirectorNoteBuilderDialog } from '@/components/tts/DirectorNoteBuilderDialog'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { useBlueprintTtsContext } from '@/contexts/BlueprintTtsContext'
import {
  buildBlueprintNarrationText,
  type BlueprintNarrationMode,
} from '@/lib/blueprint/buildBlueprintNarrationText'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { ReportType } from '@/lib/types/reports'
import { BLUEPRINT_COPY, VOICE_DIRECTION_COPY } from '@/lib/blueprint/blueprintGlossary'
import { ASSISTANT } from '@/lib/constants/assistant'
import { ASSISTANT_ICON as AssistantIcon } from '@/lib/constants/assistantIcon'
import { AssistantButton } from '@/components/blueprint/AssistantButton'
import {
  formatBeatsTabLabel,
  resolveBlueprintFormatLabel,
  summariseBeatsRuntime,
} from '@/lib/blueprint/formatBlueprintCore'
import { BlueprintFieldCard, BlueprintSubsectionHeading } from '@/components/blueprint/BlueprintFieldCard'
import { resolveCreatorCredit } from '@/lib/user/displayName'
import { useCreatorProfile } from '@/hooks/useCreatorProfile'
import { cn } from '@/lib/utils'
import { BLUEPRINT_ACTIVATE_SECTION_EVENT } from '@/lib/blueprint/blueprintProgress'
import {
  getArtStylePresetName,
  resolveVariantArtStyle,
  resolveVariantAspectRatio,
} from '@/lib/treatment/blueprintFoundation'
import { EMPTY_ENTITY_I18N, type EntityI18n } from '@/i18n/content/entityI18n'
import { useContentTranslation } from '@/i18n/content/useContentTranslation'
import {
  buildTreatmentVariantDisplayFields,
  treatmentVariantPathPrefix,
} from '@/i18n/content/buildBlueprintDisplayFields'
import { TranslationNotice } from '@/components/i18n/LocalizedField'

/** Blueprint body sections, in tab order. Labels resolve through the catalog. */
const SECTION_TABS: Array<{ id: BlueprintFixSection; labelKey: string }> = [
  { id: 'core', labelKey: 'tabs.core' },
  { id: 'story', labelKey: 'tabs.story' },
  { id: 'tone', labelKey: 'tabs.tone' },
  { id: 'beats', labelKey: 'tabs.beats' },
  { id: 'characters', labelKey: 'tabs.characters' },
]

const SECTION_TAB_IDS: BlueprintFixSection[] = SECTION_TABS.map((t) => t.id)

export type TreatmentCardProps = {
  onOpenBlueprintRefine?: (opts?: OpenBlueprintRefineOptions) => void
  onShareBlueprint?: () => void
  isSharingBlueprint?: boolean
  shareUrl?: string | null
  onStartProduction?: () => void
  isStartingProduction?: boolean
  startProductionEnabled?: boolean
  onOpenCollaborate?: () => void
  /** Opens the side panel on Foundation, where Narrative Reasoning now lives. */
  onOpenFoundation?: () => void
  /** Project's production format, used when the variant predates storing its own. */
  projectFormat?: string | null
  /**
   * Language the stored creative text was written in (`metadata.i18n`).
   * Defaults to English when unset so existing projects still content-MT into
   * the reader's interface language. Distinct from the story-language badge,
   * which tracks generation preference / account default.
   */
  contentI18n?: EntityI18n
}

export function TreatmentCard({
  onOpenBlueprintRefine,
  onShareBlueprint,
  isSharingBlueprint = false,
  shareUrl: shareUrlFromParent,
  onStartProduction,
  isStartingProduction = false,
  startProductionEnabled = true,
  onOpenCollaborate,
  onOpenFoundation,
  projectFormat,
  contentI18n,
}: TreatmentCardProps = {}) {
  const t = useTranslations('blueprint')
  const router = useRouter()
  const { data: session } = useSession()
  const { profile: creatorProfile, loading: creatorProfileLoading } = useCreatorProfile()
  const { guide } = useGuideStore()
  const { selectTreatmentVariant } = useGuideStore() as any
  const { setTreatmentVariants } = useGuideStore() as any
  const { lastEdit, justAppliedVariantId, appliedAt } = useGuideStore() as any
  const variants = (guide as any)?.treatmentVariants as Array<{ id: string; label?: string; content: string; visual_style?: string; tone_description?: string; target_audience?: string; title?: string; logline?: string; genre?: string; format_length?: string; author_writer?: string; date?: string; synopsis?: string; setting?: string; protagonist?: string; antagonist?: string; act_breakdown?: any; tone?: string; style?: string; themes?: any; mood_references?: string[]; character_descriptions?: Array<{
    name: string;
    role: string;
    subject: string;
    ethnicity: string;
    keyFeature: string;
    hairStyle: string;
    hairColor: string;
    eyeColor: string;
    expression: string;
    build: string;
    description: string;
    // Psychological depth fields
    externalGoal?: string;
    internalNeed?: string;
    fatalFlaw?: string;
    arcStartingState?: string;
    arcShift?: string;
    arcEndingState?: string;
    // Existing optional fields
    imagePrompt?: string;
    referenceImage?: string | null;
    generating?: boolean;
    version?: number;
    lastModified?: string;
  }>; beats?: Array<{ title: string; intent?: string; minutes: number; synopsis?: string }>; total_duration_seconds?: number; estimatedDurationMinutes?: number; narrative_reasoning?: { character_focus: string; key_decisions: Array<{ decision: string; why: string; impact: string }>; story_strengths: string; user_adjustments: string }; }> | undefined
  const selectedId = (guide as any)?.selectedTreatmentId as string | undefined

  // Top-level hooks (must not be conditional)
  const tts = useBlueprintTtsContext()
  const [reimaginOpen, setReimaginOpen] = useState(false)
  const openRefine = (opts?: OpenBlueprintRefineOptions) => onOpenBlueprintRefine?.(opts)
  const [activeSection, setActiveSection] = useState<BlueprintFixSection>('core')
  const openGuidedForSection = (scope: BlueprintFixSection) => {
    // Keep the card on the section being edited so the applied diff is visible.
    setActiveSection(scope)
    onOpenBlueprintRefine?.({ initialScope: scope })
  }

  // Audience Resonance, the Cue events and the readiness banner all jump to a
  // section. Their target may live in a tab that is not mounted, so they ask for
  // it by event and scrollToBlueprintSection scrolls once this render commits.
  useEffect(() => {
    const onActivate = (e: Event) => {
      const section = (e as CustomEvent<{ section?: string }>).detail?.section
      if (section && SECTION_TAB_IDS.includes(section as BlueprintFixSection)) {
        setActiveSection(section as BlueprintFixSection)
      }
    }
    window.addEventListener(BLUEPRINT_ACTIVATE_SECTION_EVENT, onActivate)
    return () => window.removeEventListener(BLUEPRINT_ACTIVATE_SECTION_EVENT, onActivate)
  }, [])
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  // Client-side only state for flash highlight (avoids hydration mismatch from Date.now())
  const [isClient, setIsClient] = useState(false)
  useEffect(() => { setIsClient(true) }, [])
  // zoomedImage removed - now in Vision phase
  function mapVariantToInputText(v: any): string {
    const title = v?.title ? `${v.title}\n\n` : ''
    const logline = v?.logline ? `Logline: ${v.logline}\n\n` : ''
    const body = String(v?.synopsis || v?.content || '')
    return `${title}${logline}${body}`.trim()
  }
  function sendToComposer(text: string, opts?: { generate?: boolean }) {
    const detail = { text, focus: true, generate: Boolean(opts?.generate) }
    window.dispatchEvent(new CustomEvent('sf:set-composer', { detail }))
  }
  const [narrationMode, setNarrationMode] = useState<BlueprintNarrationMode>('synopsis')
  // Character state removed - all character management moved to Vision phase

  const active = useMemo(() => {
    if (selectedId) return selectedId
    if (Array.isArray(variants) && variants.length > 0) return variants[0].id
    return null
  }, [selectedId, variants])

  // Content MT must run as a top-level hook (this card has an early return).
  // Source locale comes from project metadata, defaulting to English — not from
  // the account story preference, which tracks the header after a locale switch.
  const contentFields = useMemo(() => {
    if (!Array.isArray(variants) || !active) return {}
    const variant = variants.find((x) => x.id === active) || variants[0]
    return buildTreatmentVariantDisplayFields(variant)
  }, [variants, active])

  const resolvedContentI18n = contentI18n ?? EMPTY_ENTITY_I18N

  const {
    resolve: resolveContent,
    needsTranslation,
    isLoading: contentTranslating,
    pendingCount,
    uiLocale,
    sourceLocale,
  } = useContentTranslation({
    fields: contentFields,
    i18n: resolvedContentI18n,
    enabled: Boolean(active),
  })

  const localized = useCallback(
    (path: string, fallback = '') => resolveContent(path).text || fallback,
    [resolveContent]
  )

  function buildNarrationText(v: Record<string, unknown>, mode: BlueprintNarrationMode): string {
    return buildBlueprintNarrationText(v, mode)
  }

  const playVariant = async (variantId: string) => {
    if (!Array.isArray(variants) || variants.length === 0) return
    const v = variants.find((x) => x.id === variantId) || variants[0]
    const fullText = buildNarrationText(v, narrationMode)
    await tts.playText(fullText, variantId)
  }

  // Character image generation removed - all character management moved to Vision phase

  // Keyboard shortcuts scoped to this card when variants exist
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName || ''
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return
      if ((document as any).body?.classList?.contains('modal-open')) return
      if (e.key.toLowerCase() === 's') { e.preventDefault(); (async()=>{ try{ const btn = document.activeElement as HTMLElement; }catch{} })(); (async()=>{ try{ }catch{} })(); }
      if (e.key === 'Enter') { e.preventDefault(); try { const v = (Array.isArray(variants) ? variants.find(x=>x.id===active) : null) || (variants||[])[0]; if (v) (useGuideStore.getState() as any).useTreatmentVariant(v.id) } catch {} }
      if (e.key.toLowerCase() === 'e') { e.preventDefault(); openRefine({}) }
      if (e.key.toLowerCase() === 'i') { e.preventDefault(); try { const v = (variants||[]).find(x=>x.id===active) || (variants||[])[0]; if (v) { const t = mapVariantToInputText(v); sendToComposer(t, { generate: false }) } } catch {} }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); try { const v = (variants||[]).find(x=>x.id===active) || (variants||[])[0]; if (v) { const t = mapVariantToInputText(v); sendToComposer(t, { generate: true }) } } catch {} }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, variants])

  // If variants exist, render treatment; else show single treatment
  if (Array.isArray(variants) && variants.length > 0 && active) {
    const activeVariant = variants.find(v => v.id === active) || variants[0]
    // Flash highlight logic - only run on client to avoid hydration mismatch from Date.now()
    const withinWindow = isClient ? Date.now() - (appliedAt || 0) < 2000 : false
    const wasJustAppliedActive = isClient && justAppliedVariantId === activeVariant.id && withinWindow
    const changedKeys = (() => {
      if (!wasJustAppliedActive || !lastEdit || lastEdit.variantId !== activeVariant.id) return new Set<string>()
      const before = lastEdit.before || {}
      const after = activeVariant as any
      const keys: string[] = [
        'title','logline','genre','format_length','target_audience','author_writer','date',
        'setting','protagonist','antagonist','tone','tone_description','style','artStyle','aspectRatio','visual_style','synopsis','content','themes','beats'
      ]
      const changed = new Set<string>()
      for (const k of keys) {
        const bv = (before as any)?.[k]
        const av = (after as any)?.[k]
        const differs = Array.isArray(bv) || Array.isArray(av) ? JSON.stringify(bv||[]) !== JSON.stringify(av||[]) : bv !== av
        if (differs) changed.add(k)
      }
      return changed
    })()
    const flashIf = (key: string) => (wasJustAppliedActive && changedKeys.has(key) ? 'flash-highlight' : '')
    return (
      <Card className="mt-4 border-slate-700/60 bg-slate-900/40">
        <CardContent className="pt-6">
          <div className="w-full">
            <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 rounded-md">
              <div className="flex items-center justify-end gap-3 py-2">
                {/* Variant Actions Toolbar */}
                {(() => {
                  return (
                    <TooltipProvider>
                      <div className="flex items-center gap-1">

                        {/* Assistant — scoped AI edits across the whole blueprint */}
                        <AssistantButton
                          onClick={() => openRefine({})}
                          size="toolbar"
                          scopeLabel={t('sections.wholeBlueprint')}
                        />

                        {/* Reimagine - major story changes */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label={BLUEPRINT_COPY.reimagine}
                              title={BLUEPRINT_COPY.reimagine}
                              onClick={() => setReimaginOpen(true)}
                              className="h-8 w-8 border border-gray-700 text-gray-200 hover:bg-gray-800"
                              variant="outline"
                              size="icon"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{BLUEPRINT_COPY.reimagine}</TooltipContent>
                        </Tooltip>

                        {/* Preview/Print */}
                        {activeVariant && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                aria-label={t('audio.previewPrint')}
                                title={t('audio.previewPrint')}
                                onClick={() => setReportPreviewOpen(true)}
                                className="h-8 w-8 border border-gray-700 text-gray-200 hover:bg-gray-800"
                                variant="outline"
                                size="icon"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('audio.previewPrint')}</TooltipContent>
                          </Tooltip>
                        )}

                        {/* Overflow on small screens only (Edit) */}
                        <div className="md:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-label={t('audio.moreActions')} className="h-8 w-8" size="icon" variant="outline">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onSelect={(e)=>{e.preventDefault(); openRefine({});}} onClick={(e)=>{e.preventDefault();}}>
                                <AssistantIcon className="h-4 w-4 mr-2" /> {ASSISTANT.short}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e)=>{e.preventDefault(); setReimaginOpen(true);}} onClick={(e)=>{e.preventDefault();}}>
                                <RefreshCw className="h-4 w-4 mr-2" /> {t('menu.reimagine')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {/* Audio controls: Play/Stop + settings popover chevron */}
                        <div className="flex items-center gap-1">
                          {tts.enabled && tts.voices.length > 0 ? (
                            tts.loadingId === active ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    aria-label={t('audio.stop')}
                                    title={t('audio.stop')}
                                    onClick={tts.stopAny}
                                    className="h-8 w-8 border border-gray-700 text-gray-300 hover:bg-gray-800"
                                    variant="outline"
                                    size="icon"
                                  >
                                    <Square className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('audio.stop')}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    aria-label={t('audio.play')}
                                    title={t('audio.play')}
                                    onClick={() => { const currentId = ((guide as any)?.selectedTreatmentId as string) || active; if (currentId) playVariant(currentId) }}
                                    className="h-8 w-8 border border-gray-700 text-gray-300 hover:bg-gray-800"
                                    variant="outline"
                                    size="icon"
                                  >
                                    <Play className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('audio.play')}</TooltipContent>
                              </Tooltip>
                            )
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  aria-label={t('audio.unavailable')}
                                  title={t('audio.unavailable')}
                                  disabled
                                  className="h-8 w-8 border border-gray-800 text-gray-500"
                                  variant="outline"
                                  size="icon"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('audio.configureTtsDetailed')}</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Audio settings chevron */}
                          <DropdownMenu open={tts.audioMenuOpen} onOpenChange={tts.setAudioMenuOpen}>
                            <DropdownMenuTrigger asChild>
                              <Button aria-label={t('audio.settings')} aria-expanded={tts.audioMenuOpen} className="h-8 w-8" size="icon" variant="outline">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-72">
                              <div className="px-1 py-1.5 text-xs text-gray-400">{t('audio.voice')}</div>
                              {tts.enabled ? (
                                <Button 
                                  variant="outline" 
                                  className="h-8 mx-1 w-[calc(100%-8px)] justify-between text-left font-normal"
                                  onClick={() => {
                                    tts.setAudioMenuOpen(false)
                                    tts.setVoiceDialogOpen(true)
                                  }}
                                >
                                  <span className="truncate">{tts.selectedVoiceName || t('audio.selectVoice')}</span>
                                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                                </Button>
                              ) : (
                                <div className="mx-2 my-1 text-xs text-amber-300">{t('audio.notConfigured')}</div>
                              )}
                              <div className="px-1 pt-2 pb-1 text-xs text-gray-400">{VOICE_DIRECTION_COPY.sectionLabel}</div>
                              <Button
                                variant="outline"
                                className="h-8 mx-1 w-[calc(100%-8px)] justify-start gap-2 text-left font-normal"
                                onClick={() => {
                                  tts.setAudioMenuOpen(false)
                                  tts.setDirectorNotesDialogOpen(true)
                                }}
                              >
                                <SparklesIcon className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                <span className="truncate text-xs">
                                  {tts.directorNotes.trim() ? VOICE_DIRECTION_COPY.set : VOICE_DIRECTION_COPY.add}
                                </span>
                              </Button>
                              <div className="px-1 pt-2 pb-1 text-xs text-gray-400">{t('audio.language')}</div>
                              <GroupedLanguageSelector
                                value={tts.selectedLanguage}
                                onValueChange={(code) => tts.setSelectedLanguage(code)}
                                size="xs"
                                intent="generate"
                              />
                              <div className="px-1 pt-2 pb-1 text-xs text-gray-400">{t('audio.narration')}</div>
                              <Select value={narrationMode} onValueChange={(val)=>setNarrationMode(val as any)}>
                                <SelectTrigger className="h-8 mx-1">
                                  <SelectValue placeholder={t('audio.narrationMode')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="synopsis">{t('audio.modeSynopsis')}</SelectItem>
                                  <SelectItem value="full">{t('audio.modeFull')}</SelectItem>
                                  <SelectItem value="beats">{t('audio.modeBeats')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </TooltipProvider>
                  )
                })()}
              </div>
              {tts.loadingId === active && tts.generationProgress ? (
                <div className="px-1 pb-2 space-y-1" aria-live="polite">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-cyan-200/90">
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      {tts.generationProgress.phase === 'playing'
                        ? t('audio.playing')
                        : t('audio.generating')}
                      {tts.generationProgress.total > 1
                        ? ` (${tts.generationProgress.current}/${tts.generationProgress.total})`
                        : ''}
                      …
                    </span>
                    <span>
                      {Math.round(
                        (tts.generationProgress.current / tts.generationProgress.total) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-[width] duration-300 ease-out"
                      style={{
                        width: `${Math.round(
                          (tts.generationProgress.current / tts.generationProgress.total) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            {/* Display single treatment content */}
            <div className="mt-3">
            {needsTranslation ? (
              <div className="mb-3">
                <TranslationNotice
                  sourceLocale={sourceLocale}
                  uiLocale={uiLocale}
                  isLoading={contentTranslating}
                  pendingCount={pendingCount}
                />
              </div>
            ) : null}
            {(() => {
              // Render the selected variant: edits and refinements are applied to
              // activeVariant, so pinning this to variants[0] showed stale content
              // (and no updated beats) whenever another variant was selected.
              const v = activeVariant
              if (!v) return null
              const prefix = treatmentVariantPathPrefix(String(v.id))
              const titleText = localized(`${prefix}.title`)
              const loglineText = localized(`${prefix}.logline`)
              const synopsisText = localized(`${prefix}.synopsis`)
              const genreText = localized(`${prefix}.genre`, v.genre || '')
              const audienceText = localized(`${prefix}.target_audience`, v.target_audience || '')
              const settingText = localized(`${prefix}.setting`, v.setting || '')
              const protagonistText = localized(`${prefix}.protagonist`, v.protagonist || '')
              const antagonistText = localized(`${prefix}.antagonist`, v.antagonist || '')
              const toneText = localized(
                `${prefix}.tone_description`,
                localized(`${prefix}.tone`, v.tone_description || v.tone || '')
              )
              const themeTexts = Array.isArray(v.themes)
                ? v.themes.map((theme: string, index: number) =>
                    typeof theme === 'string'
                      ? localized(`${prefix}.themes[${index}]`, theme)
                      : String(theme)
                  )
                : v.themes
                  ? [localized(`${prefix}.themes`, String(v.themes))]
                  : []
              const moodText = Array.isArray(v.mood_references)
                ? v.mood_references
                    .map((mood: string, index: number) =>
                      localized(`${prefix}.mood_references[${index}]`, mood)
                    )
                    .join(', ')
                : ''
              const accent = v.id === 'A' ? 'border-blue-500' : v.id === 'B' ? 'border-purple-500' : 'border-emerald-500'
              const badge = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs'
              const badgeGenre = `${badge} border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300`
              const badgeFormat = `${badge} border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300`
              const badgeAudience = `${badge} border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300`
              // The database row wins over session?.user, whose name fields are
              // frozen at sign-in and so miss any profile edit.
              const creatorCredit = resolveCreatorCredit(
                v.author_writer,
                creatorProfile ?? session?.user
              )
              const beatsRuntime = summariseBeatsRuntime((v as any).beats)
              const beatCount = beatsRuntime.count
              const productionFormatLabel = resolveBlueprintFormatLabel(
                v as Record<string, unknown>,
                projectFormat
              )
              const characterCount = Array.isArray(v.character_descriptions)
                ? v.character_descriptions.length
                : 0
              return (
                <div className="space-y-5 text-sm">
                  {/* Callout */}
                  <div className={`p-4 rounded-lg border-l-4 ${accent} bg-gray-50 dark:bg-gray-800/50`}> 
                    <div className={`text-lg font-bold text-gray-900 dark:text-gray-100 ${v.id===activeVariant.id ? flashIf('title') : ''}`}>{titleText || t('fields.treatmentFallback')}</div>
                    {/* Logline lives in the hero overlay and the Core field; a third
                        copy here pushed the blueprint body further down the page. */}
                    {!tts.enabled && (
                      <div className="mt-2 text-xs text-gray-400 inline-flex items-center gap-1" title={t('audio.configureTts')}>
                        <Volume2 size={14} /> {t('audio.unavailable')}
                      </div>
                    )}
                  </div>
                  <Tabs
                    value={activeSection}
                    onValueChange={(next) => setActiveSection(next as BlueprintFixSection)}
                    className="w-full"
                  >
                    <TabsList className="flex w-full flex-wrap h-auto justify-start">
                      {SECTION_TABS.map((tab) => (
                        <TabsTrigger key={tab.id} value={tab.id}>
                          {tab.id === 'beats' && beatCount > 0
                            ? formatBeatsTabLabel(
                                beatCount,
                                beatsRuntime.minutes,
                                beatsRuntime.display,
                                t('tabs.beats')
                              )
                            : tab.id === 'characters' && characterCount > 0
                              ? t('tabs.charactersWithCount', { count: characterCount })
                              : t(tab.labelKey)}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                  <TabsContent value="core" className="mt-4">
                  {/* Core Identifying Information */}
                  <BlueprintSubsectionHeading
                    sectionId="core"
                    variant="studio"
                    title={t('sections.coreInfoTitle')}
                    data-blueprint-section="core"
                    actions={
                      <AssistantButton
                        onClick={() => openGuidedForSection('core')}
                        scopeLabel={t('sections.coreInfoTitle')}
                      />
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label={t('fields.title')}
                        value={titleText}
                        emphasis="prominent"
                        valueClassName={v.id === activeVariant.id ? flashIf('title') : undefined}
                      />
                      <BlueprintFieldCard sectionId="core" variant="studio" label={t('fields.genre')} hideWhenEmpty={!genreText}>
                        <span className={cn(badgeGenre, v.id === activeVariant.id ? flashIf('genre') : '')}>
                          {genreText}
                        </span>
                      </BlueprintFieldCard>
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label={t('fields.format')}
                        hideWhenEmpty={!productionFormatLabel}
                      >
                        {/* The production format, not a runtime. This chip used to
                            render format_length, which holds a duration despite its
                            name, so Format showed the runtime. */}
                        <span
                          className={cn(badgeFormat, v.id === activeVariant.id ? flashIf('format') : '')}
                          title={productionFormatLabel || undefined}
                        >
                          {productionFormatLabel}
                        </span>
                      </BlueprintFieldCard>
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label={t('fields.audience')}
                        hideWhenEmpty={!audienceText}
                      >
                        <span
                          className={cn(
                            badgeAudience,
                            v.id === activeVariant.id ? flashIf('target_audience') : ''
                          )}
                        >
                          {audienceText}
                        </span>
                      </BlueprintFieldCard>
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label={t('fields.logline')}
                        value={loglineText}
                        valueClassName={v.id === activeVariant.id ? flashIf('logline') : undefined}
                        className="md:col-span-2"
                      />
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label={t('fields.createdBy')}
                        hideWhenEmpty={false}
                      >
                        {creatorCredit ? (
                          <p
                            className={cn(
                              'text-sm text-gray-100 leading-relaxed',
                              v.id === activeVariant.id ? flashIf('author_writer') : undefined
                            )}
                          >
                            {creatorCredit}
                          </p>
                        ) : creatorProfileLoading ? (
                          // The profile decides this, so stay quiet until it lands
                          // rather than flashing the prompt on every load.
                          <p className="text-sm text-gray-500">&nbsp;</p>
                        ) : (
                          // Nothing presentable on file. Prompt instead of hiding the
                          // row, so the gap is visible and fixable in one click.
                          <a
                            href="/dashboard/settings/profile"
                            className="text-sm text-cyan-300 hover:text-cyan-200 underline decoration-cyan-500/40"
                          >
                            {t('credit.addYourName')}
                          </a>
                        )}
                      </BlueprintFieldCard>
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label={t('fields.date')}
                        value={v.date || ''}
                        valueClassName={cn(
                          'font-mono',
                          v.id === activeVariant.id ? flashIf('date') : undefined
                        )}
                      />
                    </div>
                  </BlueprintSubsectionHeading>
                  </TabsContent>

                  <TabsContent value="story" className="mt-4">
                  {/* Narrative Structure & Plot */}
                  <BlueprintSubsectionHeading
                    sectionId="story"
                    variant="studio"
                    title={t('sections.storySetup')}
                    data-blueprint-section="story"
                    actions={
                      <AssistantButton
                        onClick={() => openGuidedForSection('story')}
                        scopeLabel={t('sections.storySetup')}
                      />
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <BlueprintFieldCard
                        sectionId="story"
                        variant="studio"
                        label={t('fields.setting')}
                        value={settingText}
                        valueClassName={v.id === activeVariant.id ? flashIf('setting') : undefined}
                      />
                      <BlueprintFieldCard
                        sectionId="story"
                        variant="studio"
                        label={t('fields.protagonist')}
                        value={protagonistText}
                        valueClassName={v.id === activeVariant.id ? flashIf('protagonist') : undefined}
                      />
                      <BlueprintFieldCard
                        sectionId="story"
                        variant="studio"
                        label={t('fields.antagonist')}
                        value={antagonistText}
                        valueClassName={v.id === activeVariant.id ? flashIf('antagonist') : undefined}
                        className="md:col-span-2"
                      />
                    </div>
                  </BlueprintSubsectionHeading>
                  </TabsContent>

                  <TabsContent value="tone" className="mt-4">
                  {/* Tone, Style, & Themes */}
                  <BlueprintSubsectionHeading
                    sectionId="tone"
                    variant="studio"
                    title={t('sections.toneStyleThemes')}
                    data-blueprint-section="tone"
                    actions={
                      <AssistantButton
                        onClick={() => openGuidedForSection('tone')}
                        scopeLabel={t('sections.toneStyleThemes')}
                      />
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <BlueprintFieldCard
                        sectionId="tone"
                        variant="studio"
                        label={t('fields.tone')}
                        value={toneText}
                        valueClassName={
                          v.id === activeVariant.id ? flashIf('tone_description') || flashIf('tone') : undefined
                        }
                      />
                      <BlueprintFieldCard
                        sectionId="tone"
                        variant="studio"
                        label={t('fields.artStyle')}
                        value={getArtStylePresetName(resolveVariantArtStyle(v))}
                        valueClassName={
                          v.id === activeVariant.id ? flashIf('artStyle') || flashIf('visual_style') : undefined
                        }
                      />
                      <BlueprintFieldCard
                        sectionId="tone"
                        variant="studio"
                        label={t('fields.aspectRatio')}
                        value={resolveVariantAspectRatio(v)}
                        valueClassName={
                          v.id === activeVariant.id ? flashIf('aspectRatio') : undefined
                        }
                      />
                      <BlueprintFieldCard
                        sectionId="tone"
                        variant="studio"
                        label={t('fields.themesPlain')}
                        hideWhenEmpty={themeTexts.length === 0}
                        className="md:col-span-2"
                      >
                        <div
                          className={cn(
                            'flex flex-wrap gap-2',
                            v.id === activeVariant.id ? flashIf('themes') : ''
                          )}
                        >
                          {themeTexts.map((themeLabel: string, i: number) => (
                                <span
                                  key={`${themeLabel}-${i}`}
                                  className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs"
                                >
                                  {themeLabel}
                                </span>
                              ))}
                        </div>
                      </BlueprintFieldCard>
                      {moodText ? (
                        <BlueprintFieldCard
                          sectionId="tone"
                          variant="studio"
                          label={t('fields.moodReferences')}
                          value={moodText}
                          className="md:col-span-2"
                        />
                      ) : null}
                    </div>
                  </BlueprintSubsectionHeading>
                  </TabsContent>

                  <TabsContent value="beats" className="mt-4">
                  {/* Beats & Runtime */}
                  <BlueprintSubsectionHeading
                    sectionId="beats"
                    variant="studio"
                    title={t('sections.beatsRuntime')}
                    data-blueprint-section="beats"
                    actions={
                      <div className="flex items-center gap-2">
                        {/* Runtime belongs to the beats that produce it, and is summed
                            from the list below rather than read from a stored field. */}
                        {beatsRuntime.display && (
                          <span
                            className={cn(
                              badgeFormat,
                              v.id === activeVariant.id ? flashIf('beats') : ''
                            )}
                            title={t('sections.beatsTotalling', { count: beatsRuntime.count, display: beatsRuntime.display })}
                          >
                            {t('sections.runtimeTotal', { display: beatsRuntime.display })}
                          </span>
                        )}
                        <AssistantButton
                          onClick={() => openGuidedForSection('beats')}
                          scopeLabel={t('sections.beatsRuntime')}
                        />
                      </div>
                    }
                  >
                    <div className="space-y-3">
                      <BlueprintFieldCard
                        sectionId="beats"
                        variant="studio"
                        label={t('fields.synopsis')}
                        value={synopsisText}
                        valueClassName={
                          v.id === activeVariant.id ? flashIf('synopsis') || flashIf('content') : undefined
                        }
                      />
                      {!Array.isArray((v as any).beats) || (v as any).beats.length === 0 ? (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
                          {t('empty.noBeats')}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(v as any).beats.map((b: any, idx: number) => {
                            const beatTitle = localized(
                              `${prefix}.beats[${idx}].title`,
                              b.title || ''
                            )
                            const beatIntent = localized(
                              `${prefix}.beats[${idx}].intent`,
                              b.intent || ''
                            )
                            const beatSynopsis = localized(
                              `${prefix}.beats[${idx}].synopsis`,
                              b.synopsis || ''
                            )
                            return (
                            <div key={idx} className={`p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 ${v.id===activeVariant.id ? flashIf('beats') : ''}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{beatTitle || t('fields.beat', { number: idx + 1 })}</div>
                                  {beatIntent && <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{beatIntent}</div>}
                                </div>
                                <div className="shrink-0 text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-medium">{t('fields.minutesSuffix', { value: Number(b.minutes||0).toFixed(2) })}</div>
                              </div>
                              {beatSynopsis && <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed">{beatSynopsis}</div>}
                            </div>
                          )})}
                        </div>
                      )}
                    </div>
                  </BlueprintSubsectionHeading>
                  </TabsContent>

                  <TabsContent value="characters" className="mt-4">
                  {/* Characters - Expanded View with Psychological Depth. The heading
                      always renders now that it owns a tab, so an empty cast shows a
                      prompt rather than an unexplained blank panel. */}
                  <BlueprintSubsectionHeading
                    sectionId="characters"
                    variant="studio"
                    title={characterCount > 0 ? t('sections.charactersWithCount', { count: characterCount }) : t('sections.characters')}
                    data-blueprint-section="characters"
                    actions={
                      <AssistantButton
                        onClick={() => openGuidedForSection('characters')}
                        scopeLabel={t('sections.characters')}
                      />
                    }
                  >
                  {characterCount === 0 ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
                      {t('empty.noCharactersCast', { assistant: ASSISTANT.short })}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {(v.character_descriptions ?? []).map((c, idx) => {
                          const charBase = `${prefix}.character_descriptions[${idx}]`
                          const description = localized(`${charBase}.description`, c.description || '')
                          const externalGoal = localized(`${charBase}.externalGoal`, c.externalGoal || '')
                          const internalNeed = localized(`${charBase}.internalNeed`, c.internalNeed || '')
                          const fatalFlaw = localized(`${charBase}.fatalFlaw`, c.fatalFlaw || '')
                          const arcStarting = localized(`${charBase}.arcStartingState`, c.arcStartingState || '')
                          const arcShift = localized(`${charBase}.arcShift`, c.arcShift || '')
                          const arcEnding = localized(`${charBase}.arcEndingState`, c.arcEndingState || '')
                          return (
                          <details 
                            key={idx}
                            className="group rounded-lg border border-slate-700/60 bg-slate-800/50 overflow-hidden"
                          >
                            <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/40 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                  <span className="text-purple-300 text-sm font-bold">{c.name?.charAt(0) || '?'}</span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-100">{c.name}</div>
                                  <div className="text-xs text-purple-400">{c.role || 'Character'}</div>
                                </div>
                              </div>
                              <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                            </summary>
                            <div className="px-4 pb-4 pt-2 border-t border-slate-700/60 space-y-3">
                              {/* Description */}
                              {description && (
                                <div className="text-sm text-gray-700 dark:text-gray-300">{description}</div>
                              )}
                              
                              {/* Goals & Flaws Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {externalGoal && (
                                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900">
                                    <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">{t('character.externalGoal')}</div>
                                    <div className="text-xs text-blue-800 dark:text-blue-200">{externalGoal}</div>
                                  </div>
                                )}
                                {internalNeed && (
                                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900">
                                    <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">{t('character.internalNeed')}</div>
                                    <div className="text-xs text-amber-800 dark:text-amber-200">{internalNeed}</div>
                                  </div>
                                )}
                                {fatalFlaw && (
                                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900">
                                    <div className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">{t('character.fatalFlaw')}</div>
                                    <div className="text-xs text-red-800 dark:text-red-200">{fatalFlaw}</div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Character Arc */}
                              {(arcStarting || arcShift || arcEnding) && (
                                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 via-indigo-50 to-cyan-50 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-cyan-950/30 border border-purple-100 dark:border-purple-800">
                                  <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">{t('character.arc')}</div>
                                  <div className="flex items-center gap-2 text-xs">
                                    {arcStarting && (
                                      <div className="flex-1 p-2 rounded bg-slate-900/60">
                                        <div className="text-[9px] text-gray-400 uppercase">{t('character.arcStarting')}</div>
                                        <div className="text-gray-300">{arcStarting}</div>
                                      </div>
                                    )}
                                    {arcShift && (
                                      <>
                                        <ArrowRight className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                        <div className="flex-1 p-2 rounded bg-slate-900/60">
                                          <div className="text-[9px] text-gray-400 uppercase">{t('character.arcShift')}</div>
                                          <div className="text-gray-300">{arcShift}</div>
                                        </div>
                                      </>
                                    )}
                                    {arcEnding && (
                                      <>
                                        <ArrowRight className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                                        <div className="flex-1 p-2 rounded bg-slate-900/60">
                                          <div className="text-[9px] text-gray-400 uppercase">{t('character.arcEnding')}</div>
                                          <div className="text-gray-300">{arcEnding}</div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>
                        )})}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 italic mt-2 px-3">
                        {t('character.refineNote')}
                      </div>
                    </>
                  )}
                  </BlueprintSubsectionHeading>
                  </TabsContent>
                  </Tabs>

                  {/* Narrative Reasoning now lives in the side panel's Reasoning
                      tab, so the body stays about the blueprint itself. */}
                  {(v as any).narrative_reasoning && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={onOpenFoundation}
                        className="inline-flex items-center gap-1.5 text-xs text-amber-300/90 hover:text-amber-200"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        {t('reasoning.whyChoices')}
                      </button>
                    </div>
                  )}

                  </div>
                  )
                })()}
            </div>
          </div>
        </CardContent>
        {/* Blueprint Reimagine Dialog - Major story changes */}
        <BlueprintReimaginDialog
          open={reimaginOpen}
          onClose={() => setReimaginOpen(false)}
          existingVariant={activeVariant as any}
          onGenerate={async (input, opts) => {
            // Call the film-treatment API to regenerate
            const response = await fetch('/api/ideation/film-treatment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                input,
                format: opts?.format || 'short_film',
                filmType: opts?.duration || 'auto',
                genre: opts?.genre,
                tone: opts?.tone,
                contentIntent: opts?.contentIntent,
                artStyle: opts?.artStyle,
                aspectRatio: opts?.aspectRatio,
                targetAudience: opts?.targetAudience,
                rigor: 'thorough',
                variants: 1
              })
            })
            if (!response.ok) throw new Error('Generation failed')
            const data = await response.json()
            if (data.success && data.variants?.length > 0) {
              const newVariant = {
                id: `reimagined-${Date.now()}`,
                ...data.variants[0]
              }
              setTreatmentVariants([newVariant])
            }
          }}
        />
        {/* Report Preview Modal */}
        {activeVariant && (
          <ReportPreviewModal
            type={ReportType.FILM_TREATMENT}
            data={activeVariant as any}
            projectName={guide.title || 'Untitled Project'}
            open={reportPreviewOpen}
            onOpenChange={setReportPreviewOpen}
          />
        )}
        {/* Voice Selection Dialog */}
        <BlueprintGeminiVoicePicker
          open={tts.voiceDialogOpen}
          onOpenChange={tts.setVoiceDialogOpen}
          selectedVoiceId={tts.selectedVoiceId}
          onSelectVoice={tts.selectVoice}
        />
        <DirectorNoteBuilderDialog
          isOpen={tts.directorNotesDialogOpen}
          onClose={() => tts.setDirectorNotesDialogOpen(false)}
          initialPrompt={tts.directorNotes}
          onSave={tts.saveDirectorNotes}
        />
      </Card>
    )
  }

  return null
}

export default TreatmentCard


