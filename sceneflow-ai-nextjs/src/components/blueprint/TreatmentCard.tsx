'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useGuideStore } from '@/store/useGuideStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Square, Volume2, PencilLine, MoreHorizontal, ChevronDown, MessageSquare, ArrowRight, Loader2, Wand2, X, Users, Lightbulb, SparklesIcon, Award, RefreshCw, FileText, Printer } from 'lucide-react'
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
import { useBlueprintTts } from '@/hooks/useBlueprintTts'
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'
import { ReportType } from '@/lib/types/reports'
import { BLUEPRINT_COPY } from '@/lib/blueprint/blueprintGlossary'
import { formatBlueprintRuntime } from '@/lib/blueprint/formatBlueprintCore'
import { BlueprintFieldCard, BlueprintSubsectionHeading } from '@/components/blueprint/BlueprintFieldCard'
import { resolveAuthorWriterDisplay } from '@/lib/user/displayName'
import { cn } from '@/lib/utils'
import {
  getArtStylePresetName,
  resolveVariantArtStyle,
  resolveVariantAspectRatio,
} from '@/lib/treatment/blueprintFoundation'

export type TreatmentCardProps = {
  onOpenBlueprintRefine?: (opts?: OpenBlueprintRefineOptions) => void
  onShareBlueprint?: () => void
  isSharingBlueprint?: boolean
  shareUrl?: string | null
  onStartProduction?: () => void
  isStartingProduction?: boolean
  startProductionEnabled?: boolean
  onOpenCollaborate?: () => void
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
}: TreatmentCardProps = {}) {
  const router = useRouter()
  const { data: session } = useSession()
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
  const tts = useBlueprintTts()
  const [reimaginOpen, setReimaginOpen] = useState(false)
  const openRefine = (opts?: OpenBlueprintRefineOptions) => onOpenBlueprintRefine?.(opts)
  const openGuidedForSection = (scope: BlueprintFixSection) =>
    onOpenBlueprintRefine?.({ initialScope: scope })
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showReasoning, setShowReasoning] = useState(false)
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
  const [narrationMode, setNarrationMode] = useState<'synopsis'|'full'|'beats'>('synopsis')
  // Character state removed - all character management moved to Vision phase

  const active = useMemo(() => {
    if (selectedId) return selectedId
    if (Array.isArray(variants) && variants.length > 0) return variants[0].id
    return null
  }, [selectedId, variants])

  function buildNarrationText(v: any, mode: 'synopsis'|'full'|'beats'): string {
    if (mode === 'beats' && Array.isArray(v.beats) && v.beats.length) {
      const parts = v.beats.map((b: any, i: number) => `${i + 1}. ${b.title || 'Beat'} — ${b.synopsis || b.intent || ''}`)
      return parts.join('\n')
    }
    const baseSynopsis = String(v.synopsis || v.content || '')
    const log = v.logline ? `${v.logline}. ` : ''
    if (mode === 'synopsis') return `${log}${baseSynopsis}`
    const full = [v.title ? `${v.title}.` : '', log, baseSynopsis, (Array.isArray(v.themes) ? ` Themes: ${v.themes.join(', ')}` : '')].join(' ').trim()
    return full
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
                  const v = variants.find(x => x.id === active) || variants[0]
                  const accent = v?.id === 'A' ? 'text-blue-300 border-blue-500 hover:bg-blue-500/10' : v?.id === 'B' ? 'text-purple-300 border-purple-500 hover:bg-purple-500/10' : 'text-emerald-300 border-emerald-500 hover:bg-emerald-500/10'

                  const handleStartProductionClick = () => {
                    if (onStartProduction) {
                      onStartProduction()
                      return
                    }
                  }

                  return (
                    <TooltipProvider>
                      <div className="flex items-center gap-1">

                        {/* Edit Blueprint - precise section editing */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Edit blueprint"
                              title="Edit Blueprint (E)"
                              onClick={() => openRefine({})}
                              className="h-8 w-8 border border-gray-700 text-gray-200 hover:bg-gray-800"
                              variant="outline"
                              size="icon"
                            >
                              <PencilLine className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{BLUEPRINT_COPY.editBlueprint} (E)</TooltipContent>
                        </Tooltip>

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
                                aria-label="Preview and print"
                                title="Preview & Print"
                                onClick={() => setReportPreviewOpen(true)}
                                className="h-8 w-8 border border-gray-700 text-gray-200 hover:bg-gray-800"
                                variant="outline"
                                size="icon"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview & Print</TooltipContent>
                          </Tooltip>
                        )}

                        {/* Overflow on small screens only (Edit) */}
                        <div className="md:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-label="More actions" className="h-8 w-8" size="icon" variant="outline">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onSelect={(e)=>{e.preventDefault(); openRefine({});}} onClick={(e)=>{e.preventDefault();}}>
                                <PencilLine className="h-4 w-4 mr-2" /> Refine
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e)=>{e.preventDefault(); setReimaginOpen(true);}} onClick={(e)=>{e.preventDefault();}}>
                                <RefreshCw className="h-4 w-4 mr-2" /> Reimagine
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
                                    aria-label="Stop playback"
                                    title="Stop (P)"
                                    onClick={tts.stopAny}
                                    className="h-8 w-8 border border-gray-700 text-gray-300 hover:bg-gray-800"
                                    variant="outline"
                                    size="icon"
                                  >
                                    <Square className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Stop (P)</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    aria-label="Play variant narration"
                                    title="Play (P)"
                                    onClick={() => { const currentId = ((guide as any)?.selectedTreatmentId as string) || active; if (currentId) playVariant(currentId) }}
                                    className="h-8 w-8 border border-gray-700 text-gray-300 hover:bg-gray-800"
                                    variant="outline"
                                    size="icon"
                                  >
                                    <Play className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Play (P)</TooltipContent>
                              </Tooltip>
                            )
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  aria-label="Audio preview unavailable"
                                  title="Audio preview unavailable"
                                  disabled
                                  className="h-8 w-8 border border-gray-800 text-gray-500"
                                  variant="outline"
                                  size="icon"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Configure Google TTS (GOOGLE_API_KEY or Vertex) to enable audio previews
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Audio settings chevron */}
                          <DropdownMenu open={tts.audioMenuOpen} onOpenChange={tts.setAudioMenuOpen}>
                            <DropdownMenuTrigger asChild>
                              <Button aria-label="Audio settings" aria-expanded={tts.audioMenuOpen} className="h-8 w-8" size="icon" variant="outline">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-72">
                              <div className="px-1 py-1.5 text-xs text-gray-400">Voice</div>
                              {tts.enabled ? (
                                <Button 
                                  variant="outline" 
                                  className="h-8 mx-1 w-[calc(100%-8px)] justify-between text-left font-normal"
                                  onClick={() => {
                                    tts.setAudioMenuOpen(false)
                                    tts.setVoiceDialogOpen(true)
                                  }}
                                >
                                  <span className="truncate">{tts.selectedVoiceName || 'Select voice...'}</span>
                                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                                </Button>
                              ) : (
                                <div className="mx-2 my-1 text-xs text-amber-300">Audio not configured</div>
                              )}
                              <div className="px-1 pt-2 pb-1 text-xs text-gray-400">Director&apos;s notes</div>
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
                                  {tts.directorNotes.trim() ? 'Notes set' : "Add director's notes"}
                                </span>
                              </Button>
                              <div className="px-1 pt-2 pb-1 text-xs text-gray-400">Language</div>
                              <GroupedLanguageSelector
                                value={tts.selectedLanguage}
                                onValueChange={(code) => tts.setSelectedLanguage(code)}
                                size="xs"
                                intent="generate"
                              />
                              <div className="px-1 pt-2 pb-1 text-xs text-gray-400">Narration</div>
                              <Select value={narrationMode} onValueChange={(val)=>setNarrationMode(val as any)}>
                                <SelectTrigger className="h-8 mx-1">
                                  <SelectValue placeholder="Narration mode" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="synopsis">Logline + Synopsis</SelectItem>
                                  <SelectItem value="full">Full Treatment</SelectItem>
                                  <SelectItem value="beats">Beat‑by‑Beat</SelectItem>
                                </SelectContent>
                              </Select>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Start Production - moved to end */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-busy={isStartingProduction}
                              aria-label={BLUEPRINT_COPY.startProduction}
                              onClick={handleStartProductionClick}
                              disabled={!startProductionEnabled || isStartingProduction}
                              className="h-8 px-2 bg-sf-primary text-white hover:bg-sf-accent disabled:opacity-50"
                              size="sm"
                            >
                              {isStartingProduction ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ArrowRight className="h-4 w-4" />
                              )}
                              <span className="hidden md:inline ml-1.5">
                                {isStartingProduction ? BLUEPRINT_COPY.startingProduction : BLUEPRINT_COPY.startProduction}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{BLUEPRINT_COPY.startProductionTooltip}</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  )
                })()}
              </div>
            </div>
            {/* Display single treatment content */}
            <div className="mt-3">
            {(() => {
              const v = variants[0]
              if (!v) return null
              const accent = v.id === 'A' ? 'border-blue-500' : v.id === 'B' ? 'border-purple-500' : 'border-emerald-500'
              const badge = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs'
              const badgeGenre = `${badge} border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300`
              const badgeFormat = `${badge} border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300`
              const badgeAudience = `${badge} border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300`
              return (
                <div className="space-y-5 text-sm">
                  {/* Callout */}
                  <div className={`p-4 rounded-lg border-l-4 ${accent} bg-gray-50 dark:bg-gray-800/50`}> 
                    <div className={`text-lg font-bold text-gray-900 dark:text-gray-100 ${v.id===activeVariant.id ? flashIf('title') : ''}`}>{v.title || 'Treatment'}</div>
                    {v.logline ? (
                      <div className={`mt-2 text-base text-gray-700 dark:text-gray-300 leading-relaxed ${v.id===activeVariant.id ? flashIf('logline') : ''}`}>{v.logline}</div>
                    ) : null}
                    {!tts.enabled && (
                      <div className="mt-2 text-xs text-gray-400 inline-flex items-center gap-1" title="Configure Google TTS to enable audio previews">
                        <Volume2 size={14} /> Audio preview unavailable
                      </div>
                    )}
                  </div>
                  {/* Core Identifying Information */}
                  <BlueprintSubsectionHeading
                    sectionId="core"
                    variant="studio"
                    title="Core Identifying Information"
                    data-blueprint-section="core"
                    actions={
                      <Button
                        onClick={() => openGuidedForSection('core')}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-slate-700/50"
                      >
                        <PencilLine className="w-3 h-3 text-gray-400 hover:text-cyan-400" />
                      </Button>
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label="Title"
                        value={v.title || ''}
                        emphasis="prominent"
                        valueClassName={v.id === activeVariant.id ? flashIf('title') : undefined}
                      />
                      <BlueprintFieldCard sectionId="core" variant="studio" label="Genre" hideWhenEmpty={!v.genre}>
                        <span className={cn(badgeGenre, v.id === activeVariant.id ? flashIf('genre') : '')}>
                          {v.genre}
                        </span>
                      </BlueprintFieldCard>
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label="Format"
                        hideWhenEmpty={!v.format_length}
                      >
                        <span
                          className={cn(badgeFormat, v.id === activeVariant.id ? flashIf('format_length') : '')}
                          title={v.format_length || undefined}
                        >
                          {v.format_length
                            ? formatBlueprintRuntime(String(v.format_length)).display
                            : null}
                        </span>
                      </BlueprintFieldCard>
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label="Target audience"
                        hideWhenEmpty={!v.target_audience}
                      >
                        <span
                          className={cn(
                            badgeAudience,
                            v.id === activeVariant.id ? flashIf('target_audience') : ''
                          )}
                        >
                          {v.target_audience}
                        </span>
                      </BlueprintFieldCard>
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label="Logline"
                        value={v.logline || ''}
                        valueClassName={v.id === activeVariant.id ? flashIf('logline') : undefined}
                        className="md:col-span-2"
                      />
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label="Created by"
                        value={resolveAuthorWriterDisplay(v.author_writer, session?.user)}
                        valueClassName={v.id === activeVariant.id ? flashIf('author_writer') : undefined}
                      />
                      <BlueprintFieldCard
                        sectionId="core"
                        variant="studio"
                        label="Date"
                        value={v.date || ''}
                        valueClassName={cn(
                          'font-mono',
                          v.id === activeVariant.id ? flashIf('date') : undefined
                        )}
                      />
                    </div>
                  </BlueprintSubsectionHeading>

                  {/* Narrative Structure & Plot */}
                  <BlueprintSubsectionHeading
                    sectionId="story"
                    variant="studio"
                    title="Story Setup"
                    data-blueprint-section="story"
                    actions={
                      <Button
                        onClick={() => openGuidedForSection('story')}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-slate-700/50"
                      >
                        <PencilLine className="w-3 h-3 text-gray-400 hover:text-cyan-400" />
                      </Button>
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <BlueprintFieldCard
                        sectionId="story"
                        variant="studio"
                        label="Setting"
                        value={v.setting || ''}
                        valueClassName={v.id === activeVariant.id ? flashIf('setting') : undefined}
                      />
                      <BlueprintFieldCard
                        sectionId="story"
                        variant="studio"
                        label="Protagonist"
                        value={v.protagonist || ''}
                        valueClassName={v.id === activeVariant.id ? flashIf('protagonist') : undefined}
                      />
                      <BlueprintFieldCard
                        sectionId="story"
                        variant="studio"
                        label="Antagonist / Conflict"
                        value={v.antagonist || ''}
                        valueClassName={v.id === activeVariant.id ? flashIf('antagonist') : undefined}
                        className="md:col-span-2"
                      />
                    </div>
                  </BlueprintSubsectionHeading>

                  {/* Tone, Style, & Themes */}
                  <BlueprintSubsectionHeading
                    sectionId="tone"
                    variant="studio"
                    title="Tone, Style, & Themes"
                    data-blueprint-section="tone"
                    actions={
                      <Button
                        onClick={() => openGuidedForSection('tone')}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-slate-700/50"
                      >
                        <PencilLine className="w-3 h-3 text-gray-400 hover:text-cyan-400" />
                      </Button>
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <BlueprintFieldCard
                        sectionId="tone"
                        variant="studio"
                        label="Tone"
                        value={v.tone_description || v.tone || ''}
                        valueClassName={
                          v.id === activeVariant.id ? flashIf('tone_description') || flashIf('tone') : undefined
                        }
                      />
                      <BlueprintFieldCard
                        sectionId="tone"
                        variant="studio"
                        label="Art style"
                        value={getArtStylePresetName(resolveVariantArtStyle(v))}
                        valueClassName={
                          v.id === activeVariant.id ? flashIf('artStyle') || flashIf('visual_style') : undefined
                        }
                      />
                      <BlueprintFieldCard
                        sectionId="tone"
                        variant="studio"
                        label="Aspect ratio"
                        value={resolveVariantAspectRatio(v)}
                        valueClassName={
                          v.id === activeVariant.id ? flashIf('aspectRatio') : undefined
                        }
                      />
                      <BlueprintFieldCard
                        sectionId="tone"
                        variant="studio"
                        label="Themes"
                        hideWhenEmpty={!v.themes || (Array.isArray(v.themes) && v.themes.length === 0)}
                        className="md:col-span-2"
                      >
                        <div
                          className={cn(
                            'flex flex-wrap gap-2',
                            v.id === activeVariant.id ? flashIf('themes') : ''
                          )}
                        >
                          {Array.isArray(v.themes)
                            ? v.themes.map((t: string, i: number) => (
                                <span
                                  key={`${t}-${i}`}
                                  className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs"
                                >
                                  {t}
                                </span>
                              ))
                            : String(v.themes)}
                        </div>
                      </BlueprintFieldCard>
                      {Array.isArray(v.mood_references) && v.mood_references.length > 0 ? (
                        <BlueprintFieldCard
                          sectionId="tone"
                          variant="studio"
                          label="Mood / References"
                          value={v.mood_references.join(', ')}
                          className="md:col-span-2"
                        />
                      ) : null}
                    </div>
                  </BlueprintSubsectionHeading>

                  {/* Beats & Runtime */}
                  <BlueprintSubsectionHeading
                    sectionId="beats"
                    variant="studio"
                    title="Beats & Runtime"
                    data-blueprint-section="beats"
                    actions={
                      <Button
                        onClick={() => openGuidedForSection('beats')}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-slate-700/50"
                      >
                        <PencilLine className="w-3 h-3 text-gray-400 hover:text-cyan-400" />
                      </Button>
                    }
                  >
                    <div className="space-y-3">
                      <BlueprintFieldCard
                        sectionId="beats"
                        variant="studio"
                        label="Synopsis"
                        value={v.synopsis || v.content || ''}
                        valueClassName={
                          v.id === activeVariant.id ? flashIf('synopsis') || flashIf('content') : undefined
                        }
                      />
                      {Array.isArray((v as any).beats) && (v as any).beats.length > 0 ? (
                        <div className="space-y-2">
                          {(v as any).beats.map((b: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 ${v.id===activeVariant.id ? flashIf('beats') : ''}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{b.title || `Beat ${idx+1}`}</div>
                                  {b.intent && <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{b.intent}</div>}
                                </div>
                                <div className="shrink-0 text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-medium">{Number(b.minutes||0).toFixed(2)} m</div>
                              </div>
                              {b.synopsis && <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed">{b.synopsis}</div>}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </BlueprintSubsectionHeading>

                  {/* Characters - Expanded View with Psychological Depth */}
                  {Array.isArray(v.character_descriptions) && v.character_descriptions.length > 0 ? (
                    <BlueprintSubsectionHeading
                      sectionId="characters"
                      variant="studio"
                      title={`Characters (${v.character_descriptions.length})`}
                      data-blueprint-section="characters"
                      actions={
                        <Button
                          onClick={() => openGuidedForSection('characters')}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-slate-700/50"
                        >
                          <PencilLine className="w-3 h-3 text-gray-400 hover:text-cyan-400" />
                        </Button>
                      }
                    >
                      <div className="space-y-3">
                        {v.character_descriptions.map((c, idx) => (
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
                              {c.description && (
                                <div className="text-sm text-gray-700 dark:text-gray-300">{c.description}</div>
                              )}
                              
                              {/* Goals & Flaws Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {c.externalGoal && (
                                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900">
                                    <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">External Goal</div>
                                    <div className="text-xs text-blue-800 dark:text-blue-200">{c.externalGoal}</div>
                                  </div>
                                )}
                                {c.internalNeed && (
                                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900">
                                    <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Internal Need</div>
                                    <div className="text-xs text-amber-800 dark:text-amber-200">{c.internalNeed}</div>
                                  </div>
                                )}
                                {c.fatalFlaw && (
                                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900">
                                    <div className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Fatal Flaw</div>
                                    <div className="text-xs text-red-800 dark:text-red-200">{c.fatalFlaw}</div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Character Arc */}
                              {(c.arcStartingState || c.arcShift || c.arcEndingState) && (
                                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 via-indigo-50 to-cyan-50 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-cyan-950/30 border border-purple-100 dark:border-purple-800">
                                  <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">Character Arc</div>
                                  <div className="flex items-center gap-2 text-xs">
                                    {c.arcStartingState && (
                                      <div className="flex-1 p-2 rounded bg-slate-900/60">
                                        <div className="text-[9px] text-gray-400 uppercase">Starting</div>
                                        <div className="text-gray-300">{c.arcStartingState}</div>
                                      </div>
                                    )}
                                    {c.arcShift && (
                                      <>
                                        <ArrowRight className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                        <div className="flex-1 p-2 rounded bg-slate-900/60">
                                          <div className="text-[9px] text-gray-400 uppercase">Shift</div>
                                          <div className="text-gray-300">{c.arcShift}</div>
                                        </div>
                                      </>
                                    )}
                                    {c.arcEndingState && (
                                      <>
                                        <ArrowRight className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                                        <div className="flex-1 p-2 rounded bg-slate-900/60">
                                          <div className="text-[9px] text-gray-400 uppercase">Ending</div>
                                          <div className="text-gray-300">{c.arcEndingState}</div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>
                        ))}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 italic mt-2 px-3">
                        💡 Characters will be refined with images and detailed attributes in Production
                      </div>
                    </BlueprintSubsectionHeading>
                  ) : null}

                  {/* Narrative Reasoning */}
                  {(() => {
                    console.log('[TreatmentCard] Checking narrative_reasoning for variant:', v.id)
                    console.log('[TreatmentCard] narrative_reasoning exists:', !!(v as any).narrative_reasoning)
                    if ((v as any).narrative_reasoning) {
                      console.log('[TreatmentCard] narrative_reasoning data:', (v as any).narrative_reasoning)
                    }
                    return null
                  })()}
                  {(v as any).narrative_reasoning && (
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                      <button
                        onClick={() => setShowReasoning(!showReasoning)}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-amber-500" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Narrative Reasoning
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Why the AI made these storytelling choices
                          </span>
                        </div>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showReasoning && (
                        <div className="mt-4 space-y-4">
                          {/* Show message if reasoning is empty */}
                          {!(v as any).narrative_reasoning.character_focus && !(v as any).narrative_reasoning.story_strengths ? (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                              <p className="text-sm text-amber-800 dark:text-amber-200">
                                The AI did not provide narrative reasoning for this treatment. Try regenerating to see the AI's creative decisions.
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Character Focus */}
                              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  Character Focus
                                </h4>
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                  {(v as any).narrative_reasoning.character_focus}
                                </p>
                              </div>
                              
                              {/* Key Decisions */}
                              {(v as any).narrative_reasoning.key_decisions && Array.isArray((v as any).narrative_reasoning.key_decisions) && (v as any).narrative_reasoning.key_decisions.length > 0 && (
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <SparklesIcon className="w-4 h-4 text-purple-500" />
                                    Key Creative Decisions
                                  </h4>
                                  {(v as any).narrative_reasoning.key_decisions.map((decision: any, idx: number) => (
                                    <div key={idx} className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border-l-4 border-purple-500">
                                      <div className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                                        {decision.decision}
                                      </div>
                                      <div className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                                        <strong>Why:</strong> {decision.why}
                                      </div>
                                      <div className="text-sm text-purple-700 dark:text-purple-300 italic">
                                        <strong>Impact:</strong> {decision.impact}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Story Strengths */}
                              {(v as any).narrative_reasoning.story_strengths && (
                                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                                    <Award className="w-4 h-4" />
                                    Story Strengths
                                  </h4>
                                  <p className="text-sm text-green-800 dark:text-green-200">
                                    {(v as any).narrative_reasoning.story_strengths}
                                  </p>
                                </div>
                              )}
                              
                              {/* User Adjustments */}
                              {(v as any).narrative_reasoning.user_adjustments && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4" />
                                    Want Different Emphasis?
                                  </h4>
                                  <p className="text-sm text-amber-800 dark:text-amber-200">
                                    {(v as any).narrative_reasoning.user_adjustments}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
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


