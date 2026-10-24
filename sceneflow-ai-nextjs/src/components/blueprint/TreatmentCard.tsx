'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'
import { useGuideStore } from '@/store/useGuideStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronDown, MessageSquare, Loader2, Wand2, X, Users, MapPin, Package, Film, ExternalLink, Lightbulb, SparklesIcon, Award, RotateCcw, FileText, ArrowRight, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
import { BLUEPRINT_COPY, VOICE_DIRECTION_COPY } from '@/lib/blueprint/blueprintGlossary'
import { BlueprintListenButton } from '@/components/blueprint/BlueprintListenButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  SCRIPT_CRAFT_PRIORITIES,
  parseScriptCraftPriorities,
  type ScriptCraftPriority,
} from '@/lib/script/scriptCraftPrompt'
import { EMPTY_ENTITY_I18N, type EntityI18n } from '@/i18n/content/entityI18n'
import { useContentTranslation } from '@/i18n/content/useContentTranslation'
import {
  buildTreatmentVariantDisplayFields,
  treatmentVariantPathPrefix,
} from '@/i18n/content/buildBlueprintDisplayFields'
import { TranslationNotice } from '@/components/i18n/LocalizedField'
import {
  blueprintNeedsEnglishRewrite,
  REWRITE_BLUEPRINT_ENGLISH_INTENT,
} from '@/lib/blueprint/rewriteBlueprintEnglish'
import {
  resolveBlueprintContinuity,
  type BlueprintContinuitySubSection,
  type SharedContinuitySource,
} from '@/lib/blueprint/blueprintContinuity'

/**
 * Blueprint body sections, in tab order. Labels resolve through the catalog.
 *
 * The order matches BLUEPRINT_REVIEW_SECTION_THEME and the share viewer's nav,
 * so a reviewer reading the shared link and the author editing in the studio
 * move through the treatment in the same sequence.
 */
const SECTION_TABS: Array<{ id: BlueprintFixSection; labelKey: string }> = [
  { id: 'core', labelKey: 'tabs.core' },
  { id: 'story', labelKey: 'tabs.story' },
  { id: 'characters', labelKey: 'tabs.characters' },
  { id: 'beats', labelKey: 'tabs.beats' },
  { id: 'tone', labelKey: 'tabs.tone' },
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
  /** Existing project id so Regenerate receives series continuity and the library lock. */
  projectId?: string
  /** Series context when this project is an episode in a Series. */
  seriesContext?: {
    seriesId: string
    seriesTitle?: string | null
    episodeNumber?: number | null
  } | null
  /** Shared continuity assets from Series Bible / episode library / Vision references. */
  sharedContinuitySource?: SharedContinuitySource | null
  /** Series values used when the current Blueprint left a required field empty. */
  regenerateFallback?: {
    synopsis?: string
    genre?: string
    tone?: string
    contentIntent?: 'fiction' | 'informational' | 'commercial' | 'conversational'
  }
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
  projectId: projectIdProp,
  seriesContext,
  sharedContinuitySource,
  regenerateFallback,
  contentI18n,
}: TreatmentCardProps = {}) {
  const t = useTranslations('blueprint')
  const router = useRouter()
  const { data: session } = useSession()
  const { profile: creatorProfile, loading: creatorProfileLoading } = useCreatorProfile()
  const {
    guide,
    selectTreatmentVariant,
    setTreatmentVariants,
    updateTreatmentVariant,
    lastEdit,
    justAppliedVariantId,
    appliedAt,
  } = useGuideStore(
    useShallow((s: any) => ({
      guide: s.guide,
      selectTreatmentVariant: s.selectTreatmentVariant,
      setTreatmentVariants: s.setTreatmentVariants,
      updateTreatmentVariant: s.updateTreatmentVariant,
      lastEdit: s.lastEdit,
      justAppliedVariantId: s.justAppliedVariantId,
      appliedAt: s.appliedAt,
    }))
  )
  const projectId = projectIdProp || guide.projectId
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
  }>; scene_descriptions?: Array<{
    name: string;
    type?: string;
    location?: string;
    description?: string;
    atmosphere?: string;
    furniture_props?: string;
    referenceImage?: string | null;
    libraryLocationId?: string;
    libraryAssetId?: string;
    isNew?: boolean;
  }>; prop_descriptions?: Array<{
    name: string;
    category?: string;
    description?: string;
    significance?: string;
    importance?: string;
    referenceImage?: string | null;
    libraryPropId?: string;
    libraryAssetId?: string;
    isNew?: boolean;
  }>; beats?: Array<{ title: string; intent?: string; minutes: number; synopsis?: string }>; total_duration_seconds?: number; estimatedDurationMinutes?: number; scriptCraft?: Array<'characterDepth' | 'actionClarity' | 'subtext' | 'dialogueRichness' | 'visualFirst'>; scriptCraftNotes?: string; narrative_reasoning?: { character_focus: string; key_decisions: Array<{ decision: string; why: string; impact: string }>; story_strengths: string; user_adjustments: string }; }> | undefined
  const selectedId = (guide as any)?.selectedTreatmentId as string | undefined

  // Top-level hooks (must not be conditional)
  const tts = useBlueprintTtsContext()
  const [reimaginOpen, setReimaginOpen] = useState(false)
  const openRefine = (opts?: OpenBlueprintRefineOptions) => onOpenBlueprintRefine?.(opts)
  const [activeSection, setActiveSection] = useState<BlueprintFixSection>('core')
  const [continuitySubTab, setContinuitySubTab] = useState<BlueprintContinuitySubSection>('all')
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
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false)
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
        'setting','protagonist','antagonist','tone','tone_description','style','artStyle','aspectRatio','visual_style','synopsis','content','themes','beats','scriptCraft','scriptCraftNotes',
        'character_descriptions','scene_descriptions','prop_descriptions'
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
    // The studio shell already supplies the bordered, padded surface, so this
    // renders bare rather than nesting another card inside it.
    return (
      <>
        <div className="w-full">
            <div className="border-b border-white/10 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {t('toolbar.documentLabel')}
                </span>
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
                        {blueprintNeedsEnglishRewrite({
                          sourceLocale: contentI18n?.contentStamped
                            ? contentI18n.sourceLocale
                            : undefined,
                          title: String(activeVariant.title || ''),
                          logline: String(activeVariant.logline || ''),
                          synopsis: String(activeVariant.synopsis || ''),
                          genre: String(activeVariant.genre || ''),
                        }) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10"
                            onClick={() =>
                              openRefine({
                                rewriteToEnglish: true,
                                storyLocale: 'en',
                                initialIntent: REWRITE_BLUEPRINT_ENGLISH_INTENT,
                                initialScope: 'all',
                              })
                            }
                          >
                            {t('toolbar.rewriteInEnglish')}
                          </Button>
                        )}

                        {/* Separates the labelled primary action from the icon-only
                            secondary group, which otherwise read as one undifferentiated
                            strip of six buttons. */}
                        <span aria-hidden className="mx-1 h-5 w-px bg-white/10" />

                        {/* Audio controls: Listen + settings popover chevron */}
                        <div className="flex items-center gap-1">
                          <BlueprintListenButton
                            isPlaying={
                              tts.loadingId === active &&
                              (!tts.generationProgress ||
                                tts.generationProgress.phase === 'playing')
                            }
                            isLoading={
                              tts.loadingId === active &&
                              tts.generationProgress != null &&
                              tts.generationProgress.phase !== 'playing'
                            }
                            disabled={!tts.enabled || tts.voices.length === 0}
                            onPlay={() => {
                              const currentId =
                                ((guide as any)?.selectedTreatmentId as string) || active
                              if (currentId) playVariant(currentId)
                            }}
                            onStop={tts.stopAny}
                          />

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
              // Genre, format and audience are peer metadata, so they share one
              // neutral chip. Three separate hues implied a distinction that does
              // not exist and pulled three more colours into the header.
              const badge =
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs border-slate-700 bg-slate-800/60 text-gray-300'
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
              const continuity = resolveBlueprintContinuity(v as any, sharedContinuitySource)
              const characterCount = continuity.counts.cast
              const continuityCount = continuity.counts.total
              return (
                <div className="space-y-5 text-sm">
                  {/* Callout */}
                  <div className="p-4 rounded-lg border border-slate-700/60 border-l-4 border-l-sf-primary bg-slate-800/50">
                    <div className={`text-lg font-bold text-gray-100 ${v.id===activeVariant.id ? flashIf('title') : ''}`}>{titleText || t('fields.treatmentFallback')}</div>
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
                    {/* One scrolling row, like the Vision toolbar. Full-width
                        wrapping split five tabs across two ragged rows at medium
                        widths. */}
                    <TabsList className="h-auto max-w-full justify-start overflow-x-auto">
                      {SECTION_TABS.map((tab) => (
                        <TabsTrigger key={tab.id} value={tab.id}>
                          {tab.id === 'beats' && beatCount > 0
                            ? formatBeatsTabLabel(
                                beatCount,
                                beatsRuntime.minutes,
                                beatsRuntime.display,
                                t('tabs.beats')
                              )
                            : tab.id === 'characters' && (continuityCount > 0 || characterCount > 0)
                              ? t('tabs.charactersWithCount', { count: continuityCount })
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
                        <span className={cn(badge, v.id === activeVariant.id ? flashIf('genre') : '')}>
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
                          className={cn(badge, v.id === activeVariant.id ? flashIf('format') : '')}
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
                            badge,
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
                                  className="px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-200 text-xs"
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
                      <BlueprintFieldCard
                        sectionId="tone"
                        variant="studio"
                        label={t('fields.scriptCraft')}
                        hideWhenEmpty={false}
                        className="md:col-span-2"
                        valueClassName={
                          v.id === activeVariant.id
                            ? flashIf('scriptCraft') || flashIf('scriptCraftNotes')
                            : undefined
                        }
                      >
                        <p className="text-xs text-gray-400 mb-2">{t('fields.scriptCraftHint')}</p>
                        <div
                          className={cn(
                            'flex flex-wrap gap-2',
                            v.id === activeVariant.id ? flashIf('scriptCraft') : ''
                          )}
                        >
                          {SCRIPT_CRAFT_PRIORITIES.map((priority) => {
                            const selected = parseScriptCraftPriorities(v.scriptCraft).includes(
                              priority
                            )
                            return (
                              <button
                                key={priority}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => {
                                  const current = parseScriptCraftPriorities(v.scriptCraft)
                                  const next: ScriptCraftPriority[] = selected
                                    ? current.filter((item) => item !== priority)
                                    : [...current, priority]
                                  updateTreatmentVariant(v.id, { scriptCraft: next })
                                }}
                                className={cn(
                                  'px-2 py-0.5 rounded-full border text-xs transition-colors',
                                  selected
                                    ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                                    : 'bg-slate-900/40 border-slate-600 text-gray-400 hover:border-violet-500/60 hover:text-gray-200'
                                )}
                              >
                                {t(`fields.scriptCraftPriorities.${priority}`)}
                              </button>
                            )
                          })}
                        </div>
                        <textarea
                          value={typeof v.scriptCraftNotes === 'string' ? v.scriptCraftNotes : ''}
                          onChange={(e) =>
                            updateTreatmentVariant(v.id, { scriptCraftNotes: e.target.value })
                          }
                          placeholder={t('fields.scriptCraftNotesPlaceholder')}
                          rows={2}
                          className={cn(
                            'mt-3 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500',
                            v.id === activeVariant.id ? flashIf('scriptCraftNotes') : ''
                          )}
                          aria-label={t('fields.scriptCraftNotes')}
                        />
                      </BlueprintFieldCard>
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
                              badge,
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
                            <div key={idx} className={`p-3 rounded-lg border border-slate-700/60 bg-slate-800/50 ${v.id===activeVariant.id ? flashIf('beats') : ''}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm text-gray-100 font-medium">{beatTitle || t('fields.beat', { number: idx + 1 })}</div>
                                  {beatIntent && <div className="text-xs text-gray-400 mt-0.5">{beatIntent}</div>}
                                </div>
                                <div className="shrink-0 text-xs px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-medium">{t('fields.minutesSuffix', { value: Number(b.minutes||0).toFixed(2) })}</div>
                              </div>
                              {beatSynopsis && <div className="text-sm text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed">{beatSynopsis}</div>}
                            </div>
                          )})}
                        </div>
                      )}
                    </div>
                  </BlueprintSubsectionHeading>
                  </TabsContent>

                  <TabsContent value="characters" className="mt-4">
                  {/* Continuity — Cast, Locations, and Props (consistent with Series Room and Production Stage). */}
                  <BlueprintSubsectionHeading
                    sectionId="characters"
                    variant="studio"
                    title={
                      continuityCount > 0 || characterCount > 0
                        ? t('sections.charactersWithCount', { count: continuityCount })
                        : t('sections.characters')
                    }
                    data-blueprint-section="characters"
                    actions={
                      <AssistantButton
                        onClick={() => openGuidedForSection('characters')}
                        scopeLabel={t('sections.characters')}
                      />
                    }
                  >
                    <div className="space-y-4">
                      {/* Shared Series Continuity Library Banner (for Series episodes) */}
                      {(continuity.isSeriesShared || Boolean(seriesContext?.seriesId)) && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
                          <div className="flex items-start gap-2.5">
                            <Film className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-semibold text-cyan-200">
                                {t('continuity.sharedSeriesBannerTitle')}
                              </div>
                              <div className="text-xs text-cyan-100/80 mt-0.5">
                                {(seriesContext?.seriesTitle || continuity.seriesTitle)
                                  ? t('continuity.sharedSeriesBannerDesc', {
                                      series: String(seriesContext?.seriesTitle || continuity.seriesTitle),
                                    })
                                  : t('continuity.sharedSeriesBannerGeneric')}
                              </div>
                            </div>
                          </div>
                          {(seriesContext?.seriesId || continuity.seriesId) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/15"
                              onClick={() =>
                                router.push(
                                  `/dashboard/series/${seriesContext?.seriesId || continuity.seriesId}`
                                )
                              }
                            >
                              {t('continuity.openSeriesContinuity')}
                              <ExternalLink className="w-3 h-3 ml-1.5" />
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Sub-section Filter Pills (All | Cast | Locations | Props) */}
                      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-700/60 pb-2.5">
                        {(
                          [
                            { id: 'all' as const, label: t('continuity.subTabs.all', { count: continuity.counts.total }), icon: null },
                            { id: 'cast' as const, label: t('continuity.subTabs.cast', { count: continuity.counts.cast }), icon: Users },
                            { id: 'locations' as const, label: t('continuity.subTabs.locations', { count: continuity.counts.locations }), icon: MapPin },
                            { id: 'props' as const, label: t('continuity.subTabs.props', { count: continuity.counts.props }), icon: Package },
                          ]
                        ).map((sub) => {
                          const Icon = sub.icon
                          const isSelected = continuitySubTab === sub.id
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => setContinuitySubTab(sub.id)}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                                isSelected
                                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                                  : 'border-slate-700/70 bg-slate-800/40 text-gray-400 hover:text-gray-200 hover:border-slate-600'
                              )}
                            >
                              {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                              {sub.label}
                            </button>
                          )
                        })}
                      </div>

                      {/* Sub-section 1: Cast */}
                      {(continuitySubTab === 'all' || continuitySubTab === 'cast') && (
                        <div className={cn('space-y-3', v.id === activeVariant.id ? flashIf('character_descriptions') : '')}>
                          <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                              <Users className="w-3.5 h-3.5" />
                              <span>{t('continuity.castTitle')}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px]">
                                {continuity.counts.cast}
                              </span>
                            </div>
                          </div>
                          {characterCount === 0 ? (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
                              {t('empty.noCharactersCast', { assistant: ASSISTANT.short })}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {continuity.cast.map((c, idx) => {
                                const vIdx = c.variantIndex ?? idx
                                const charBase = `${prefix}.character_descriptions[${vIdx}]`
                                const description =
                                  c.variantIndex != null
                                    ? localized(`${charBase}.description`, c.description || '')
                                    : c.description || ''
                                const externalGoal =
                                  c.variantIndex != null
                                    ? localized(`${charBase}.externalGoal`, c.externalGoal || '')
                                    : c.externalGoal || ''
                                const internalNeed =
                                  c.variantIndex != null
                                    ? localized(`${charBase}.internalNeed`, c.internalNeed || '')
                                    : c.internalNeed || ''
                                const fatalFlaw =
                                  c.variantIndex != null
                                    ? localized(`${charBase}.fatalFlaw`, c.fatalFlaw || '')
                                    : c.fatalFlaw || ''
                                const arcStarting =
                                  c.variantIndex != null
                                    ? localized(`${charBase}.arcStartingState`, c.arcStartingState || '')
                                    : c.arcStartingState || ''
                                const arcShift =
                                  c.variantIndex != null
                                    ? localized(`${charBase}.arcShift`, c.arcShift || '')
                                    : c.arcShift || ''
                                const arcEnding =
                                  c.variantIndex != null
                                    ? localized(`${charBase}.arcEndingState`, c.arcEndingState || '')
                                    : c.arcEndingState || ''
                                return (
                                  <details
                                    key={`${c.name}-${idx}`}
                                    className="group rounded-lg border border-slate-700/60 bg-slate-800/50 overflow-hidden"
                                  >
                                    <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/40 transition-colors">
                                      <div className="flex items-center gap-3 min-w-0">
                                        {c.referenceImage ? (
                                          <img
                                            src={c.referenceImage}
                                            alt={c.name}
                                            className="w-9 h-9 rounded-full object-cover border border-amber-500/40 shrink-0"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                            <span className="text-amber-300 text-sm font-bold">
                                              {c.name?.charAt(0) || '?'}
                                            </span>
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-gray-100">{c.name}</span>
                                            {c.isSharedFromSeries && (
                                              <span className="px-1.5 py-0.5 rounded border border-cyan-500/35 bg-cyan-500/10 text-[10px] text-cyan-300">
                                                {t('continuity.seriesAssetBadge')}
                                              </span>
                                            )}
                                            {!c.isSharedFromSeries && c.isNew && (
                                              <span className="px-1.5 py-0.5 rounded border border-violet-500/35 bg-violet-500/10 text-[10px] text-violet-300">
                                                {t('continuity.newEpisodeAssetBadge')}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-xs text-amber-400">{c.role || 'Character'}</div>
                                        </div>
                                      </div>
                                      <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
                                    </summary>
                                    <div className="px-4 pb-4 pt-2 border-t border-slate-700/60 space-y-3">
                                      {description && (
                                        <div className="text-sm text-gray-300">{description}</div>
                                      )}
                                      {(externalGoal || internalNeed || fatalFlaw) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                          {externalGoal && (
                                            <div className="p-2.5 rounded-lg border border-sky-500/25 bg-sky-500/10">
                                              <div className="text-[10px] font-semibold text-sky-400 uppercase tracking-wide mb-1">
                                                {t('character.externalGoal')}
                                              </div>
                                              <div className="text-xs text-sky-100">{externalGoal}</div>
                                            </div>
                                          )}
                                          {internalNeed && (
                                            <div className="p-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10">
                                              <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-1">
                                                {t('character.internalNeed')}
                                              </div>
                                              <div className="text-xs text-amber-100">{internalNeed}</div>
                                            </div>
                                          )}
                                          {fatalFlaw && (
                                            <div className="p-2.5 rounded-lg border border-red-500/25 bg-red-500/10">
                                              <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-1">
                                                {t('character.fatalFlaw')}
                                              </div>
                                              <div className="text-xs text-red-100">{fatalFlaw}</div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {(arcStarting || arcShift || arcEnding) && (
                                        <div className="p-3 rounded-lg border border-amber-500/25 bg-amber-500/5">
                                          <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-2">
                                            {t('character.arc')}
                                          </div>
                                          <div className="flex items-center gap-2 text-xs">
                                            {arcStarting && (
                                              <div className="flex-1 p-2 rounded bg-slate-900/60">
                                                <div className="text-[9px] text-gray-400 uppercase">
                                                  {t('character.arcStarting')}
                                                </div>
                                                <div className="text-gray-300">{arcStarting}</div>
                                              </div>
                                            )}
                                            {arcShift && (
                                              <>
                                                <ArrowRight className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                                <div className="flex-1 p-2 rounded bg-slate-900/60">
                                                  <div className="text-[9px] text-gray-400 uppercase">
                                                    {t('character.arcShift')}
                                                  </div>
                                                  <div className="text-gray-300">{arcShift}</div>
                                                </div>
                                              </>
                                            )}
                                            {arcEnding && (
                                              <>
                                                <ArrowRight className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                                                <div className="flex-1 p-2 rounded bg-slate-900/60">
                                                  <div className="text-[9px] text-gray-400 uppercase">
                                                    {t('character.arcEnding')}
                                                  </div>
                                                  <div className="text-gray-300">{arcEnding}</div>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-section 2: Locations */}
                      {(continuitySubTab === 'all' || continuitySubTab === 'locations') && (
                        <div className={cn('space-y-3', v.id === activeVariant.id ? flashIf('scene_descriptions') : '')}>
                          <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{t('continuity.locationsTitle')}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px]">
                                {continuity.counts.locations}
                              </span>
                            </div>
                          </div>
                          {continuity.locations.length === 0 ? (
                            <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-3 text-xs text-gray-400">
                              {t('continuity.emptyLocations', { assistant: ASSISTANT.short })}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {continuity.locations.map((loc, idx) => {
                                const vIdx = loc.variantIndex
                                const locBase =
                                  vIdx != null ? `${prefix}.scene_descriptions[${vIdx}]` : null
                                const locDescription = locBase
                                  ? localized(
                                      `${locBase}.location`,
                                      localized(`${locBase}.description`, loc.location || loc.description || '')
                                    )
                                  : loc.location || loc.description || ''
                                const locAtmosphere = locBase
                                  ? localized(`${locBase}.atmosphere`, loc.atmosphere || '')
                                  : loc.atmosphere || ''
                                const locProps = locBase
                                  ? localized(`${locBase}.furniture_props`, loc.furniture_props || '')
                                  : loc.furniture_props || ''
                                return (
                                  <div
                                    key={`${loc.name}-${idx}`}
                                    className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-3.5 space-y-2.5"
                                  >
                                    <div className="flex items-start justify-between gap-2.5">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {loc.referenceImage ? (
                                          <img
                                            src={loc.referenceImage}
                                            alt={loc.name}
                                            className="w-10 h-10 rounded-md object-cover border border-emerald-500/40 shrink-0"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                            <MapPin className="w-4 h-4 text-emerald-300" />
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <div className="font-medium text-gray-100 truncate">{loc.name}</div>
                                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                            {loc.type && (
                                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold uppercase">
                                                {loc.type}
                                              </span>
                                            )}
                                            {loc.isSharedFromSeries && (
                                              <span className="px-1.5 py-0.5 rounded border border-cyan-500/35 bg-cyan-500/10 text-[10px] text-cyan-300">
                                                {t('continuity.seriesAssetBadge')}
                                              </span>
                                            )}
                                            {!loc.isSharedFromSeries && loc.isNew && (
                                              <span className="px-1.5 py-0.5 rounded border border-violet-500/35 bg-violet-500/10 text-[10px] text-violet-300">
                                                {t('continuity.newEpisodeAssetBadge')}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {locDescription && (
                                      <p className="text-xs text-gray-300 leading-relaxed">{locDescription}</p>
                                    )}
                                    {(locAtmosphere || locProps) && (
                                      <div className="space-y-1.5 pt-1.5 border-t border-slate-700/50 text-xs">
                                        {locAtmosphere && (
                                          <div>
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90 mr-1.5">
                                              {t('continuity.locationAtmosphere')}:
                                            </span>
                                            <span className="text-gray-300">{locAtmosphere}</span>
                                          </div>
                                        )}
                                        {locProps && (
                                          <div>
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-400/90 mr-1.5">
                                              {t('continuity.locationProps')}:
                                            </span>
                                            <span className="text-gray-300">{locProps}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-section 3: Props */}
                      {(continuitySubTab === 'all' || continuitySubTab === 'props') && (
                        <div className={cn('space-y-3', v.id === activeVariant.id ? flashIf('prop_descriptions') : '')}>
                          <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                              <Package className="w-3.5 h-3.5" />
                              <span>{t('continuity.propsTitle')}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px]">
                                {continuity.counts.props}
                              </span>
                            </div>
                          </div>
                          {continuity.props.length === 0 ? (
                            <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-3 text-xs text-gray-400">
                              {t('continuity.emptyProps', { assistant: ASSISTANT.short })}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {continuity.props.map((prop, idx) => {
                                const vIdx = prop.variantIndex
                                const propBase =
                                  vIdx != null ? `${prefix}.prop_descriptions[${vIdx}]` : null
                                const propDesc = propBase
                                  ? localized(`${propBase}.description`, prop.description || '')
                                  : prop.description || ''
                                const propSig = propBase
                                  ? localized(`${propBase}.significance`, prop.significance || '')
                                  : prop.significance || ''
                                return (
                                  <div
                                    key={`${prop.name}-${idx}`}
                                    className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-3.5 space-y-2"
                                  >
                                    <div className="flex items-start justify-between gap-2.5">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {prop.referenceImage ? (
                                          <img
                                            src={prop.referenceImage}
                                            alt={prop.name}
                                            className="w-10 h-10 rounded-md object-cover border border-cyan-500/40 shrink-0"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-md bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                            <Package className="w-4 h-4 text-cyan-300" />
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <div className="font-medium text-gray-100 truncate">{prop.name}</div>
                                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                            {prop.category && (
                                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-medium capitalize">
                                                {prop.category}
                                              </span>
                                            )}
                                            {prop.importance && (
                                              <span className="px-1.5 py-0.5 rounded bg-slate-700/80 text-gray-300 text-[10px] capitalize">
                                                {prop.importance}
                                              </span>
                                            )}
                                            {prop.isSharedFromSeries && (
                                              <span className="px-1.5 py-0.5 rounded border border-cyan-500/35 bg-cyan-500/10 text-[10px] text-cyan-300">
                                                {t('continuity.seriesAssetBadge')}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {propDesc && (
                                      <p className="text-xs text-gray-300 leading-relaxed">{propDesc}</p>
                                    )}
                                    {propSig && (
                                      <div className="pt-1.5 border-t border-slate-700/50 text-xs">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-400/90 mr-1.5">
                                          {t('continuity.propSignificance')}:
                                        </span>
                                        <span className="text-gray-300">{propSig}</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-gray-400 italic mt-2 px-1">
                        {t('character.refineNote')}
                      </div>
                    </div>
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

              {/* Regenerate — separated from daily toolbar actions */}
              {activeVariant && (
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-300">{t('regenerate.sectionTitle')}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 max-w-xl">
                      {t('regenerate.sectionHint')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 border-amber-500/40 text-amber-200 hover:bg-amber-500/10 shrink-0"
                    onClick={() => setRegenerateConfirmOpen(true)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('menu.reimagine')}
                  </Button>
                </div>
              )}
            </div>
        </div>
        <Dialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('regenerate.confirmTitle')}</DialogTitle>
              <DialogDescription>{t('regenerate.confirmDescription')}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setRegenerateConfirmOpen(false)}>
                {t('regenerate.cancel')}
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-500 text-white"
                onClick={() => {
                  setRegenerateConfirmOpen(false)
                  setReimaginOpen(true)
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('regenerate.confirmAction')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Blueprint Reimagine Dialog - Major story changes */}
        <BlueprintReimaginDialog
          open={reimaginOpen}
          onClose={() => setReimaginOpen(false)}
          existingVariant={activeVariant as any}
          projectId={projectId}
          fallback={regenerateFallback}
          onGenerate={async (input, opts) => {
            // Call the film-treatment API to regenerate
            const response = await fetch('/api/ideation/film-treatment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                input,
                projectId,
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
      </>
    )
  }

  return null
}

export default TreatmentCard


