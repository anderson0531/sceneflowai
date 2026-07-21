'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/Input";
import { DownloadIcon, Edit, Settings, BarChart3, ChevronRight, Check, HelpCircle, Sparkles, PanelRight, PanelRightClose, RefreshCw, Wand2, Clapperboard } from "lucide-react";
import { useGuideStore } from "@/store/useGuideStore";
import { useStore } from '@/store/useStore'
import { useCue } from "@/store/useCueStore";
import ProjectIdeaTab from "@/components/studio/ProjectIdeaTab";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
import { getUserDisplayName } from '@/lib/user/displayName';
import { BlueprintReimaginDialog } from '@/components/blueprint/BlueprintReimaginDialog'
import {
  resolveContentIntentFromMetadata,
  defaultFormatForIntent,
} from '@/lib/content/contentIntent'
import { TreatmentHeroImage } from '@/components/treatment/TreatmentHeroImage'
import { HeroImagePromptBuilder } from '@/components/treatment/HeroImagePromptBuilder'
import { ImageEditModal } from '@/components/vision/ImageEditModal'
import { SidePanelTabs } from '@/components/blueprint/SidePanelTabs'
import BlueprintRefineDialog from '@/components/blueprint/BlueprintRefineDialog'
import type {
  AudienceDefinition,
  BlueprintAudienceRecommendation,
  PersistedBlueprintAudienceResonance,
  AudienceIntent,
} from '@/lib/types/audienceResonance'
import type { OpenBlueprintRefineOptions } from '@/lib/blueprint/openBlueprintRefine'
import {
  createBlueprintShare,
  fetchActiveBlueprintShare,
} from '@/lib/blueprint/createBlueprintShare'
import { resolveBlueprintHeroImageUrl } from '@/lib/blueprint/resolveBlueprintHeroImage'
import type { ReimagineFoundationField } from '@/components/vision/ReimagineFoundationDialog'
import { normalizeVariantFoundation } from '@/lib/treatment/blueprintFoundation'
import { toast } from 'sonner'
import {
  createPersistedBlueprintAR,
  loadBlueprintARFromMetadata,
} from '@/lib/types/audienceResonance'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useProcessWithOverlay } from '@/hooks/useProcessWithOverlay'
import ThumbnailPromptDrawer from '@/components/project/ThumbnailPromptDrawer'
const TreatmentCard = dynamic(
  () => import('@/components/blueprint/TreatmentCard').then((mod) => mod.TreatmentCard),
  { ssr: false }
)
import TopProgressBar from '@/components/ui/TopProgressBar'
import GeneratingOverlay from '@/components/ui/GeneratingOverlay'
import { BlueprintOnboarding } from '@/components/blueprint/BlueprintOnboarding'
import { ProductEmptyState } from '@/components/product'
import { BlueprintResonanceStrip } from '@/components/blueprint/BlueprintResonanceStrip'
import { BlueprintNextStepBanner } from '@/components/blueprint/BlueprintNextStepBanner'
import { BlueprintReadyBanner } from '@/components/blueprint/BlueprintReadyBanner'
import { StartProductionDialog } from '@/components/blueprint/StartProductionDialog'
import {
  BlueprintRefineDiffBanner,
  type RefineDiffSummary,
} from '@/components/blueprint/BlueprintRefineDiffBanner'
import { BLUEPRINT_COPY } from '@/lib/blueprint/blueprintGlossary'
import { useBlueprintProgress } from '@/hooks/studio/useBlueprintProgress'
import { useBlueprintReadiness } from '@/hooks/studio/useBlueprintReadiness'
import { useStartProduction } from '@/hooks/studio/useStartProduction'
import {
  useStudioBlueprintEvents,
  useBlueprintGuideStatus,
  useCueBlueprintMode,
} from '@/hooks/studio/useStudioBlueprintEvents'
import { scrollToBlueprintSection } from '@/lib/blueprint/blueprintProgress'

interface StudioPageClientProps {
  projectId: string;
}

export default function StudioPageClient({ projectId }: StudioPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { guide, updateTitle, updateTreatment, setTreatmentVariants, variantsLastModified } = useGuideStore();
  const { updateTreatmentVariant } = useGuideStore() as {
    updateTreatmentVariant: (id: string, patch: Record<string, unknown>) => void
  };
  const { invokeCue } = useCue();
  const currentProject = useStore((s) => s.currentProject);
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const setBeats = useStore((s) => s.setBeats);
  const [isNewProject, setIsNewProject] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showStructureHelp, setShowStructureHelp] = useState(false);
  const loadedProjectRef = useRef<string | null>(null);
  
  // Series episode state
  const [seriesContext, setSeriesContext] = useState<{
    seriesId: string
    seriesTitle: string
    episodeNumber: number
  } | null>(null)
  
  // Side panel visibility state
  const [showSidePanel, setShowSidePanel] = useState(true)

  const isProjectCreated = !!(guide.filmTreatment && guide.filmTreatment.trim() !== '' && guide.title && guide.title !== 'Untitled Project');

  // Duration and beat state
  const [beatsView, setBeatsView] = useState<any[]>([])
  const [estimatedRuntime, setEstimatedRuntime] = useState<number | null>(null)

  // Store last input
  const [lastInput, setLastInput] = useState('')
  
  // Auto-save debounce ref and saved indicator
  const autoSaveDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const [isSaved, setIsSaved] = useState(true)
  const [saveError, setSaveError] = useState(false)
  
  // Hero image error state
  const [heroImageError, setHeroImageError] = useState<string | null>(null)
  
  // Hero image prompt builder dialog state
  const [showHeroPromptBuilder, setShowHeroPromptBuilder] = useState(false)
  
  // Hero image edit modal state
  const [showHeroEditModal, setShowHeroEditModal] = useState(false)
  
  // Prompt drawer state for editing hero image prompt (legacy - keeping for compatibility)
  const [showPromptDrawer, setShowPromptDrawer] = useState(false)
  
  // Processing overlay hook for film production animation
  const { execute: executeWithOverlay } = useProcessWithOverlay()
  
  // Clear stale hero-gen flags on mount (in case previous generation failed without cleanup)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear all hero-gen flags from previous sessions
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('hero-gen-')) {
          sessionStorage.removeItem(key)
        }
      })
    }
  }, [])
  
  // Reimagine dialog state for initial generation
  const [showReimaginDialog, setShowReimaginDialog] = useState(false)
  const [showFoundationReimagineDialog, setShowFoundationReimagineDialog] = useState(false)
  const [foundationFocus, setFoundationFocus] = useState<ReimagineFoundationField | undefined>()
  const returnProductionProjectIdRef = useRef<string | null>(null)
  const autoOpenBlueprintRef = useRef(false)
  const [isGen, setIsGen] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [isGeneratingHeroImage, setIsGeneratingHeroImage] = useState(false)
  const [isUploadingHero, setIsUploadingHero] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Collaboration state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [collaborationTabSignal, setCollaborationTabSignal] = useState(0)
  const [resonanceTabSignal, setResonanceTabSignal] = useState(0)
  const [refineDiffSummary, setRefineDiffSummary] = useState<RefineDiffSummary[]>([])
  const hadBlueprintOnLoadRef = useRef(false)
  
  // Audience Resonance v3 persistence
  const [audienceDefinition, setAudienceDefinition] = useState<AudienceDefinition | null>(null)
  const [savedBlueprintAR, setSavedBlueprintAR] =
    useState<PersistedBlueprintAudienceResonance | null>(null)
  const [legacyARIntent, setLegacyARIntent] = useState<AudienceIntent | null>(null)

  const [blueprintRefineOpen, setBlueprintRefineOpen] = useState(false)
  const [blueprintRefineRecs, setBlueprintRefineRecs] = useState<
    BlueprintAudienceRecommendation[] | undefined
  >()
  const [blueprintRefineTab, setBlueprintRefineTab] = useState<string | undefined>()
  const blueprintRefineApplyExtraRef = useRef<
    ((patch: Record<string, unknown>) => void) | null
  >(null)

  const activeTreatmentVariant = useMemo(() => {
    const variants = (guide as { treatmentVariants?: Array<{ id: string }> })
      ?.treatmentVariants
    const selectedId = (guide as { selectedTreatmentId?: string })?.selectedTreatmentId
    const id = selectedId || variants?.[0]?.id
    return variants?.find((v) => v.id === id) ?? variants?.[0] ?? null
  }, [guide])

  const syncVariantToProductionProject = useCallback(
    async (variant: Record<string, unknown>, productionProjectId: string) => {
      try {
        const res = await fetch(`/api/projects/${productionProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              filmTreatmentVariant: normalizeVariantFoundation(variant),
            },
          }),
        })
        if (!res.ok) throw new Error('Failed to sync variant to Production')
        toast.success('Blueprint synced to Production — regenerate your script when ready.')
        router.push(`/dashboard/workflow/vision/${productionProjectId}`)
      } catch (error) {
        console.error('[StudioPage] Production sync failed:', error)
        toast.error('Blueprint updated, but Production sync failed')
      }
    },
    [router]
  )

  useEffect(() => {
    const reimagine = searchParams.get('reimagine')
    if (reimagine !== 'foundation') return
    const focus = searchParams.get('focus')
    const returnId = searchParams.get('returnProjectId')
    if (returnId) returnProductionProjectIdRef.current = returnId
    if (focus === 'artStyle' || focus === 'aspectRatio') {
      setFoundationFocus(focus)
    }
    if (activeTreatmentVariant) {
      setShowFoundationReimagineDialog(true)
      router.replace(`/dashboard/studio/${projectId}`, { scroll: false })
    }
  }, [searchParams, activeTreatmentVariant, projectId, router])

  // Route a fresh Start Project straight into the Blueprint (Start Project) dialog
  // instead of the intermediate empty-state card. The primeBlueprint auto-generate
  // path (series episodes) still bypasses the dialog and must not trigger this.
  useEffect(() => {
    if (autoOpenBlueprintRef.current) return
    const isNewProject = projectId === 'new-project' || projectId?.startsWith('new-project')
    if (!isNewProject) return
    if (isGen) return
    if (guide.treatmentVariants && guide.treatmentVariants.length > 0) return
    const primeInput = (currentProject?.metadata as Record<string, unknown> | undefined)?.blueprintPrimeInput
    if (primeInput) return
    if (searchParams.get('primeBlueprint') === 'true') return
    autoOpenBlueprintRef.current = true
    setShowReimaginDialog(true)
  }, [projectId, isGen, guide.treatmentVariants, currentProject, searchParams])

  const openBlueprintRefine = useCallback((opts?: OpenBlueprintRefineOptions) => {
    setBlueprintRefineRecs(opts?.resonanceRecommendations)
    setBlueprintRefineTab(opts?.initialScope ?? opts?.initialActiveTab)
    blueprintRefineApplyExtraRef.current = opts?.onApplyExtra ?? null
    setBlueprintRefineOpen(true)
  }, [])

  const requestBlueprintReanalyze = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sf:blueprint-reanalyze-ar'))
    }
  }, [])

  const handleBlueprintRefineApplied = useCallback((diff: Array<{ field?: string; label?: string; after?: unknown }>) => {
    setRefineDiffSummary(
      diff.map((d) => ({
        label: d.label || d.field || 'Section',
        after: d.after != null ? String(d.after) : undefined,
      }))
    )
  }, [])

  const handleBlueprintRefineApply = useCallback(
    (patch: Record<string, unknown>) => {
      if (activeTreatmentVariant?.id) {
        updateTreatmentVariant(activeTreatmentVariant.id, patch)
      }
      blueprintRefineApplyExtraRef.current?.(patch)
      blueprintRefineApplyExtraRef.current = null
      setBlueprintRefineOpen(false)
      setBlueprintRefineRecs(undefined)
      setBlueprintRefineTab(undefined)
    },
    [activeTreatmentVariant?.id, updateTreatmentVariant]
  )
  
  const applyShareResult = useCallback(
    (result: { token: string; sessionId: string; url: string }, copy = true) => {
      setSessionId(result.sessionId)
      setShareToken(result.token)
      setShareUrl(result.url)
      setCollaborationTabSignal((n) => n + 1)
      setShowSidePanel(true)
      if (copy) {
        navigator.clipboard.writeText(result.url).catch(() => {})
        toast.success('Share link ready — copied to clipboard')
      }
    },
    []
  )

  // Migrate projects from pre-login localStorage owner id to authenticated user
  useEffect(() => {
    if (authStatus !== 'authenticated' || !session?.user?.id) return
    const legacyId =
      typeof window !== 'undefined' ? localStorage.getItem('authUserId') : null
    if (!legacyId || legacyId === session.user.id) return

    ;(async () => {
      try {
        const res = await fetch('/api/projects/sync-ownership', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldUserId: legacyId,
            newUserId: session.user.id,
          }),
        })
        if (res.ok) {
          localStorage.removeItem('authUserId')
        }
      } catch {
        /* non-fatal */
      }
    })()
  }, [authStatus, session?.user?.id])

  // Restore active share link for this project
  useEffect(() => {
    if (!projectId || projectId.startsWith('new-project')) return
    let cancelled = false
    ;(async () => {
      const active = await fetchActiveBlueprintShare(projectId)
      if (!cancelled && active) {
        applyShareResult(active, false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, applyShareResult])

  const handleShare = async (opts?: { forceNew?: boolean }) => {
    if (!projectId || projectId.startsWith('new-project')) {
      toast.error('Save the project before sharing')
      return
    }

    const variants = (guide as any)?.treatmentVariants
    if (!variants?.length) {
      toast.error('Generate a blueprint before sharing')
      return
    }

    const selectedId = (guide as any)?.selectedTreatmentId
    const variant =
      variants.find((v: { id: string }) => v.id === selectedId) || variants[0]
    if (!variant) {
      toast.error('No treatment variant to share')
      return
    }

    setIsSharing(true)
    try {
      const heroImageUrl = resolveBlueprintHeroImageUrl(variant as Record<string, unknown>)

      const result = await createBlueprintShare({
        projectId,
        variantId: variant.id,
        treatment: variant,
        heroImageUrl,
        audienceDefinition: audienceDefinition ?? null,
        expiresInDays: 14,
        forceNew: opts?.forceNew === true,
      })

      if (result.success) {
        applyShareResult(result)
        toast.success(
          result.reused
            ? 'Share link ready — generate section audio in Collaborate when you are ready'
            : 'Share link created — generate section audio in Collaborate when you are ready'
        )
      } else {
        const msg =
          result.status === 401
            ? 'Sign in to create a share link'
            : result.status === 403
              ? result.error || 'You do not have permission to share this project'
              : result.error || 'Failed to create share link'
        toast.error(msg)
        console.error('[handleShare]', result)
      }
    } catch (error) {
      console.error('Share failed:', error)
      toast.error('Failed to create share link')
    } finally {
      setIsSharing(false)
    }
  }

  /** Push latest variant (e.g. new hero URL) into the active share payload without creating a new link. */
  const syncActiveBlueprintShare = useCallback(
    async (variant: Record<string, unknown>) => {
      if (!projectId || projectId.startsWith('new-project')) return

      const variantId = typeof variant.id === 'string' ? variant.id : ''
      if (!variantId) return

      const active = shareToken
        ? { token: shareToken }
        : await fetchActiveBlueprintShare(projectId)
      if (!active) return

      const heroImageUrl = resolveBlueprintHeroImageUrl(variant)
      const result = await createBlueprintShare({
        projectId,
        variantId,
        treatment: variant,
        heroImageUrl,
        audienceDefinition: audienceDefinition ?? null,
        expiresInDays: 14,
      })

      if (result.success) {
        applyShareResult(result, false)
      } else {
        console.warn('[syncActiveBlueprintShare]', result.error)
      }
    },
    [projectId, shareToken, audienceDefinition, applyShareResult]
  )

  // Unified Start Production handoff (shared gate for toolbar + AR panel)
  const {
    isStarting: isStartingProduction,
    showPreflight,
    pendingGate,
    requestStartProduction: openStartProductionFlow,
    confirmStartProduction,
    cancelStartProduction,
  } = useStartProduction(projectId)

  const { checklist, evaluateGate } = useBlueprintReadiness({
    hasBlueprint: !!((guide as any)?.treatmentVariants?.length),
    variant: (activeTreatmentVariant as Record<string, unknown> | null) ?? null,
    audienceDefinition,
    savedBlueprintAR,
    estimatedRuntimeMinutes: estimatedRuntime,
  })

  const handleRequestStartProduction = useCallback(() => {
    const variants = (guide as any)?.treatmentVariants
    const selectedId = (guide as any)?.selectedTreatmentId
    const v =
      variants?.find((variant: any) => variant.id === selectedId) || variants?.[0]
    if (!v) {
      toast.error('No Blueprint variant found')
      return
    }
    const gate = evaluateGate(false)
    openStartProductionFlow(v, gate)
  }, [guide, openStartProductionFlow, evaluateGate])

  const handleProceedToScripting = handleRequestStartProduction

  const persistBlueprintMetadata = async (
    extra: Record<string, unknown>
  ) => {
    if (!projectId || projectId.startsWith('new-project')) return false
    const mergedMetadata = {
      ...(currentProject?.metadata || {}),
      blueprintInput: lastInput,
      filmTreatment: guide.filmTreatment,
      treatmentVariants: (guide as any).treatmentVariants || [],
      beats: beatsView,
      estimatedRuntime: estimatedRuntime,
      audienceDefinition,
      blueprintAudienceResonance: savedBlueprintAR,
      ...extra,
    }
    const res = await fetch('/api/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        title: guide.title || 'Untitled Project',
        description: '',
        metadata: mergedMetadata,
      }),
    })
    if (res.ok && currentProject) {
      setCurrentProject({
        ...currentProject,
        metadata: mergedMetadata,
      })
    }
    return res.ok
  }

  const handleAudienceDefinitionSave = async (def: AudienceDefinition) => {
    setAudienceDefinition(def)
    try {
      const ok = await persistBlueprintMetadata({ audienceDefinition: def })
      if (!ok) throw new Error('Save failed')
    } catch (e) {
      console.error('[StudioPage] audienceDefinition save', e)
      throw e
    }
  }

  const handleAnalysisComplete = async (
    persisted: PersistedBlueprintAudienceResonance
  ) => {
    if (!projectId || projectId.startsWith('new-project')) return
    try {
      setSavedBlueprintAR(persisted)
      setAudienceDefinition(persisted.audienceDefinition)
      const ok = await persistBlueprintMetadata({
        audienceDefinition: persisted.audienceDefinition,
        blueprintAudienceResonance: persisted,
      })
      if (!ok) {
        const { toast } = await import('sonner')
        toast.error('Analysis completed but failed to save to project')
      }
    } catch (error) {
      console.error('[StudioPage] Error saving AR analysis:', error)
      try {
        const { toast } = await import('sonner')
        toast.error('Failed to save analysis to project')
      } catch {}
    }
  }

  /** Toolbar pencil: same editor as AR, with pending resonance recs when available. */
  const openBlueprintRefineFromToolbar = useCallback(() => {
    const applied = new Set(savedBlueprintAR?.appliedRecommendationIds ?? [])
    const pending =
      savedBlueprintAR?.analysis?.recommendations?.filter((r) => !applied.has(r.id)) ??
      []
    if (pending.length > 0) {
      openBlueprintRefine({
        resonanceRecommendations: pending,
        initialActiveTab: pending[0]?.fixSection || 'story',
        onApplyExtra: () => {
          if (!savedBlueprintAR?.analysis) return
          const audDef =
            audienceDefinition ?? savedBlueprintAR.audienceDefinition
          if (!audDef) return
          const newApplied = [
            ...(savedBlueprintAR.appliedRecommendationIds ?? []),
            ...pending.map((r) => r.id),
          ]
          void handleAnalysisComplete(
            createPersistedBlueprintAR(
              savedBlueprintAR.analysis,
              audDef,
              newApplied,
              savedBlueprintAR.iterationCount ?? 0
            )
          )
        },
      })
      return
    }
    openBlueprintRefine()
  }, [
    audienceDefinition,
    openBlueprintRefine,
    savedBlueprintAR,
    handleAnalysisComplete,
  ])

  // Auto-generate hero image for treatment variant
  // Uses sessionStorage to prevent duplicate generation across navigation
  const generateHeroImage = async (variant: any, force: boolean = false, customPrompt?: string) => {
    if (!variant?.title) return
    
    // Check if hero image already exists on the variant
    // Consider image ready if URL exists (status may be missing from database loads)
    const hasExistingImage = variant.heroImage?.url && (variant.heroImage?.status === 'ready' || !variant.heroImage?.status)
    if (hasExistingImage && !force) {
      console.log('[StudioPage] Hero image already exists, skipping generation')
      return
    }
    
    if (force) {
      console.log('[StudioPage] Force regenerating hero image...')
    }

    const heroBlockedKey = `hero-blocked-credits-${variant.id || variant.title}`
    if (!force && typeof window !== 'undefined' && sessionStorage.getItem(heroBlockedKey) === '1') {
      console.log('[StudioPage] Hero image auto-generation blocked for insufficient credits in this session')
      return
    }
    
    // Use sessionStorage to prevent duplicate generation during navigation
    const heroGenKey = `hero-gen-${variant.id || variant.title}`
    if (typeof window !== 'undefined' && sessionStorage.getItem(heroGenKey)) {
      console.log('[StudioPage] Hero image generation already in progress for this variant, skipping')
      return
    }
    
    // Mark as generating
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(heroGenKey, 'generating')
      if (force) sessionStorage.removeItem(heroBlockedKey)
    }
    
    setIsGeneratingHeroImage(true)
    setHeroImageError(null) // Clear previous error
    
    // Wrap in processing overlay for film production animation
    await executeWithOverlay(async () => {
      try {
        console.log('[StudioPage] Auto-generating hero image for:', variant.title)
        
        const response = await fetch('/api/treatment/generate-visual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: projectId,
            treatment: {
              // Core narrative fields
              title: variant.title,
              logline: variant.logline || '',
              synopsis: variant.synopsis || variant.content || '',
              genre: variant.genre || '',
              // Character data - CRITICAL for accurate hero image
              character_descriptions: variant.character_descriptions || [],
              protagonist: variant.protagonist || '',
              antagonist: variant.antagonist || '',
              // Setting and atmosphere
              setting: variant.setting || '',
              tone: variant.tone || '',
              themes: variant.themes || [],
              // Visual styling
              visual_style: variant.visual_style || variant.visualStyle || '',
              visualStyle: variant.visualStyle || variant.visual_style || ''
            },
            visualType: 'hero',
            mood: 'balanced',
            customPrompt: customPrompt // Pass custom prompt if provided
          })
        })
        
        if (!response.ok) {
          let errorPayload: any = null
          let errorText = 'Unknown error'
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            errorPayload = await response.json().catch(() => null)
            errorText = errorPayload?.error || JSON.stringify(errorPayload || {})
          } else {
            errorText = await response.text().catch(() => 'Unknown error')
          }

          const requestError = new Error(
            response.status === 402
              ? `Insufficient credits for hero image generation. Need ${errorPayload?.creditsRequired ?? 'more'} credits${typeof errorPayload?.creditsAvailable === 'number' ? ` (available: ${errorPayload.creditsAvailable})` : ''}.`
              : `Hero image generation failed: ${response.status} - ${errorText}`
          ) as Error & { status?: number; payload?: any }
          requestError.status = response.status
          requestError.payload = errorPayload
          throw requestError
        }
        
        const data = await response.json()
        
        // API returns visuals.heroImage as an object with { id, url, prompt, status, ... }
        if (data.success && data.visuals?.heroImage?.url) {
          // Get CURRENT variants from the store using getState() to avoid stale closure
          const currentVariants = useGuideStore.getState().guide.treatmentVariants || []
          console.log('[StudioPage] Current variants from store:', currentVariants.length)
          
          const updatedVariants = currentVariants.map((v: any, idx: number) => 
            idx === 0 ? { ...v, heroImage: data.visuals.heroImage } : v
          )
          setTreatmentVariants(updatedVariants)
          console.log('[StudioPage] Hero image generated successfully:', data.visuals.heroImage.url)
          
          // Clear the generation flag on success
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(`hero-gen-${variant.id || variant.title}`)
          }
        } else if (data.error) {
          const details = data.details ? `: ${data.details}` : ''
          throw new Error(`${data.error}${details}`)
        }
      } catch (error: any) {
        console.error('[StudioPage] Hero image generation error:', error)
        const errorMessage = error?.message || 'Failed to generate hero image'
        setHeroImageError(errorMessage)
        if (typeof window !== 'undefined' && error?.status === 402) {
          sessionStorage.setItem(heroBlockedKey, '1')
        }
        try {
          const { toast } = require('sonner')
          if (error?.status === 402) {
            toast.error(errorMessage)
          } else {
            toast.error('Hero image generation failed. Click the image to retry.')
          }
        } catch {}
        // Clear the generation flag on error so user can retry
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`hero-gen-${variant.id || variant.title}`)
        }
        throw error // Re-throw to let executeWithOverlay handle it
      } finally {
        setIsGeneratingHeroImage(false)
      }
    }, {
      message: 'Creating cinematic poster image...',
      estimatedDuration: 25,
      operationType: 'image-generation'
    }).catch(() => {
      // Error already handled above
      setIsGeneratingHeroImage(false)
    })
  }

  // Generate film treatment handler
  const handleGenerateBlueprint = async (text: string, opts?: { 
    persona?: 'Narrator'|'Director'; 
    model?: string; 
    rigor?: 'fast'|'balanced'|'thorough'; 
    variantCount?: number;
    // Blueprint dialog options - reduces memory by enabling optimizations
    genre?: string;
    tone?: string;
    duration?: string;
    targetAudience?: string;
    artStyle?: string;
    aspectRatio?: string;
    hasStoryDirections?: boolean;
    generateThreeDirections?: boolean;
    format?: string;
    contentIntent?: import('@/lib/content/contentIntent').ContentIntent;
  }) => {
    setLastInput(text)
    setIsGen(true)
    startProgress()
    
    // Smart variant count: when user provides explicit settings or story directions, they have clear intent - use 1 variant
    // OOM FIX: Story directions increase prompt complexity significantly, so always use optimized flow
    const hasExplicitSettings = !!(opts?.genre || opts?.tone || opts?.targetAudience || opts?.hasStoryDirections)
    const variantCount = opts?.variantCount ?? (opts?.generateThreeDirections ? 3 : 1)
    console.log('[StudioPage] Generating Blueprint with', variantCount, 'variant(s)', hasExplicitSettings ? '(explicit settings detected)' : '', opts?.hasStoryDirections ? '(story directions active)' : '')
    
    try {
      const response = await fetch('/api/ideation/film-treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          format: opts?.format || currentProject?.metadata?.format || 'short_film',
          filmType: opts?.duration || 'auto',
          rigor: opts?.rigor || 'thorough',
          variants: variantCount,
          // Pass user's name for "Created By" field
          userName: getUserDisplayName(session?.user),
          // Pass dialog settings to enable optimizations (skip core concept, reduce prompt size)
          ...(opts?.genre && { genre: opts.genre }),
          ...(opts?.tone && { tone: opts.tone }),
          ...(opts?.targetAudience && { targetAudience: opts.targetAudience }),
          ...(opts?.artStyle && { artStyle: opts.artStyle }),
          ...(opts?.aspectRatio && { aspectRatio: opts.aspectRatio }),
          ...(opts?.contentIntent && { contentIntent: opts.contentIntent }),
          ...(opts?.format && { format: opts.format }),
          hasExplicitSettings
        })
      })
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to generate film treatment')
      }
      
      const data = await response.json()
      
      // API returns 'variants' array (not 'treatments'), with fallback to data.data
      const rawVariants = Array.isArray(data.variants) ? data.variants : (data.data ? [data.data] : [])
      
      if (data.success && rawVariants.length > 0) {
        // Map API variants to format expected by TreatmentCard
        const variants = rawVariants.map((t: any, idx: number) => ({
          id: t.id || `treatment-${Date.now()}-${idx}`,
          label: t.label || t.title || `Variant ${idx + 1}`,
          content: t.synopsis || t.film_treatment || '',
          ...t
        }))
        
        console.log('[StudioPage] Film treatment variants received:', variants.length)
        setTreatmentVariants(variants)

        if (opts?.contentIntent || opts?.format || opts?.genre) {
          setCurrentProject({
            ...(currentProject || {}),
            metadata: {
              ...(currentProject?.metadata || {}),
              ...(opts.genre && { genre: opts.genre }),
              ...(opts.format && { format: opts.format }),
              ...(opts.contentIntent && { contentIntent: opts.contentIntent }),
            },
          } as any)
        }
        
        if (variants[0]) {
          updateTitle(variants[0].title || 'Untitled Project')
          updateTreatment(variants[0].synopsis || variants[0].content || '')
          
          if (!hadBlueprintOnLoadRef.current) {
            hadBlueprintOnLoadRef.current = true
            setShowSidePanel(true)
            setResonanceTabSignal((s) => s + 1)
            toast.message('Blueprint ready — save your audience, then run Audience Resonance', {
              duration: 6000,
            })
          }
          
          // Auto-generate hero image for the first variant
          if (!variants[0].heroImage) {
            generateHeroImage(variants[0]).catch(err => {
              console.warn('[StudioPage] Hero image generation failed (non-blocking):', err)
            })
          }
        }
        
        if (data.beats) {
          setBeatsView(data.beats)
          setBeats(data.beats)
        }
        
        if (data.estimatedRuntime) {
          setEstimatedRuntime(data.estimatedRuntime)
        }
        
        // Auto-create project after initial generation if on new-project URL
        // This ensures the project gets a real ID and enables auto-save for future changes
        if (projectId.startsWith('new-project')) {
          console.log('[StudioPage] Auto-creating project after initial generation...')
          const userId = typeof window !== 'undefined' ? localStorage.getItem('authUserId') || crypto.randomUUID() : 'anonymous'
          if (typeof window !== 'undefined' && !localStorage.getItem('authUserId')) {
            localStorage.setItem('authUserId', userId)
          }
          
          try {
            const createRes = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                title: variants[0]?.title || 'Untitled Project',
                description: '',
                metadata: {
                  blueprintInput: text,
                  filmTreatment: variants[0]?.synopsis || variants[0]?.content || '',
                  treatmentVariants: variants,
                  beats: data.beats || [],
                  estimatedRuntime: data.estimatedRuntime || null,
                  ...(opts?.genre && { genre: opts.genre }),
                  ...(opts?.format && { format: opts.format }),
                  ...(opts?.contentIntent && { contentIntent: opts.contentIntent }),
                },
                currentStep: 'ideation'
              })
            })
            
            const createData = await createRes.json()
            if (createData.success && createData.project) {
              console.log('[StudioPage] Project auto-created:', createData.project.id)
              // Navigate to the real project URL to enable future auto-saves
              router.replace(`/dashboard/studio/${createData.project.id}`)
            }
          } catch (createErr) {
            console.error('[StudioPage] Auto-create project failed (non-blocking):', createErr)
          }
        }
      } else {
        // Debug logging for when treatment display fails
        console.warn('[StudioPage] Film treatment not displayed. Response:', {
          success: data.success,
          hasVariants: Array.isArray(data.variants),
          variantsLength: data.variants?.length,
          hasData: !!data.data,
          responseKeys: Object.keys(data)
        })
      }
    } catch (error: any) {
      console.error('[StudioPage] Blueprint generation failed:', error)
      throw error // Re-throw so BlueprintComposer can show error
    } finally {
      setIsGen(false)
      stopProgress()
    }
  }

  const handleExport = () => {
    console.log("Exporting PDF...");
  };

  const handleSaveProject = async () => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('authUserId') || crypto.randomUUID() : 'anonymous'
      if (typeof window !== 'undefined' && !localStorage.getItem('authUserId')) {
        localStorage.setItem('authUserId', userId)
      }
      
      const blueprintData = {
        title: guide.title || 'Untitled Project',
        description: '',
        metadata: {
          ...(currentProject?.metadata || {}),
          blueprintInput: lastInput,
          filmTreatment: guide.filmTreatment,
          treatmentVariants: (guide as any).treatmentVariants || [],
          beats: beatsView,
          estimatedRuntime: estimatedRuntime,
          audienceDefinition,
          blueprintAudienceResonance: savedBlueprintAR,
        }
      }
      
      if (projectId && !projectId.startsWith('new-project')) {
        const res = await fetch(`/api/projects`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: projectId,
            ...blueprintData
          })
        })
        
        if (res.ok) {
          try { const { toast } = require('sonner'); toast.success('Project saved!') } catch {}
        }
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            ...blueprintData,
            currentStep: 'ideation'
          })
        })
        
        const data = await res.json()
        if (data.success && data.project) {
          try { const { toast } = require('sonner'); toast.success('Project created!') } catch {}
          router.push(`/dashboard/studio/${data.project.id}`)
        }
      }
    } catch (error) {
      console.error('Save failed:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to save project') } catch {}
    }
  };

  // Load project data
  useEffect(() => {
    if (!projectId || projectId.startsWith('new-project')) return
    // Prevent re-loading the same project
    if (loadedProjectRef.current === projectId) return
    
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        if (res.ok) {
          const responseData = await res.json()
          // API returns { success: true, project: { ... } } - unwrap the project object
          const projectData = responseData.project || responseData
          loadedProjectRef.current = projectId
          setCurrentProject(projectData)
          
          console.log('[StudioPage] Loading project data:', {
            projectId,
            hasProject: !!responseData.project,
            title: projectData?.title,
            metadataKeys: Object.keys(projectData?.metadata || {})
          })
          
          // Check multiple places where treatment data might be stored
          const metadata = projectData?.metadata || {}
          const hasFilmTreatmentVariant = metadata.filmTreatmentVariant
          const hasTreatmentVariants = Array.isArray(metadata.treatmentVariants) && metadata.treatmentVariants.length > 0
          const hasFilmTreatment = metadata.filmTreatment
          const hasApprovedTreatment = metadata.approvedTreatment
          
          // Check if this is a series episode and set context for badge
          if (metadata.seriesId && metadata.seriesTitle && metadata.episodeNumber) {
            setSeriesContext({
              seriesId: metadata.seriesId,
              seriesTitle: metadata.seriesTitle,
              episodeNumber: metadata.episodeNumber
            })
            console.log('[StudioPage] Series episode detected:', metadata.seriesTitle, 'Ep', metadata.episodeNumber)
          }
          
          if (hasFilmTreatmentVariant) {
            const approvedVariant = metadata.filmTreatmentVariant
            if (approvedVariant.content || approvedVariant.synopsis) {
              updateTreatment(approvedVariant.content || approvedVariant.synopsis || '')
            }
            setTreatmentVariants([{
              id: approvedVariant.id || 'approved-treatment',
              ...approvedVariant
            }])
            console.log('[StudioPage] Restored approved filmTreatmentVariant from project:', approvedVariant.id || 'approved-treatment')
          } else if (hasApprovedTreatment) {
            const approvedVariant = metadata.approvedTreatment
            if (approvedVariant.content || approvedVariant.synopsis) {
              updateTreatment(approvedVariant.content || approvedVariant.synopsis || '')
            }
            setTreatmentVariants([{
              id: approvedVariant.id || 'approved-treatment',
              ...approvedVariant
            }])
            console.log('[StudioPage] Restored approvedTreatment from project:', approvedVariant.id || 'approved-treatment')
          } else if (hasTreatmentVariants) {
            // Restore from treatmentVariants array
            setTreatmentVariants(metadata.treatmentVariants)
            if (metadata.treatmentVariants[0]) {
              const first = metadata.treatmentVariants[0]
              updateTreatment(first.content || first.synopsis || '')
            }
            console.log('[StudioPage] Restored treatmentVariants from project:', metadata.treatmentVariants.length)
            hadBlueprintOnLoadRef.current = true
          } else if (hasFilmTreatment) {
            // Restore from plain filmTreatment string
            updateTreatment(metadata.filmTreatment)
            setTreatmentVariants([{
              id: 'legacy-treatment',
              label: projectData.title || 'Film Treatment',
              content: metadata.filmTreatment,
              synopsis: metadata.filmTreatment
            }])
            console.log('[StudioPage] Restored legacy filmTreatment from project')
          }
          
          if (projectData.title) {
            updateTitle(projectData.title)
          }
          
          if (metadata.beats) {
            setBeats(metadata.beats)
            setBeatsView(metadata.beats)
          }
          
          if (!hasFilmTreatmentVariant && !hasApprovedTreatment && !hasTreatmentVariants && Array.isArray(metadata.beats)) {
            setBeatsView(metadata.beats)
          }
          
          if (!hasFilmTreatmentVariant && !hasApprovedTreatment && !hasTreatmentVariants && metadata.estimatedRuntime) {
            setEstimatedRuntime(metadata.estimatedRuntime)
          }
          
          const { audienceDefinition: loadedDef, persisted: loadedAR } =
            loadBlueprintARFromMetadata(metadata)
          if (loadedDef) setAudienceDefinition(loadedDef)
          if (loadedAR) setSavedBlueprintAR(loadedAR)
          if (metadata.audienceResonance?.intent && !loadedDef) {
            setLegacyARIntent(metadata.audienceResonance.intent as AudienceIntent)
          }
          
          console.log('[StudioPage] Project data loaded:', projectData.id)
          
          // Auto-generate hero image if treatment exists but hero image doesn't
          const loadedVariant = metadata.treatmentVariants?.[0] || metadata.filmTreatmentVariant
          if (loadedVariant?.title && !loadedVariant?.heroImage?.url) {
            console.log('[StudioPage] Treatment loaded without hero image, auto-generating...')
            // Use setTimeout to allow state to settle before generating
            setTimeout(() => generateHeroImage(loadedVariant), 500)
          }

          // Directly check URL for primeBlueprint bypasses hydration delays
          const urlParams = new URLSearchParams(window.location.search)
          const isPrimeBlueprint = urlParams.get('primeBlueprint') === 'true'
          const hasBlueprintPrimeInput = metadata.blueprintPrimeInput && !hasFilmTreatmentVariant && !hasTreatmentVariants

          if (isPrimeBlueprint && hasBlueprintPrimeInput) {
            console.log('[StudioPage] Series episode detected - auto-generating Blueprint directly from load()')
            router.replace(`/dashboard/studio/${projectId}`, { scroll: false })
            setTimeout(() => {
              // Honor the series/episode's stored intent instead of forcing a
              // fiction (Drama/Cinematic) storyline for every auto-generation.
              const primeIntent = resolveContentIntentFromMetadata({
                contentIntent: metadata.contentIntent,
                genre: metadata.genre || projectData.genre,
                format: metadata.format || projectData.metadata?.format,
              })
              handleGenerateBlueprint(metadata.blueprintPrimeInput, {
                genre: metadata.genre || projectData.genre || undefined,
                tone: metadata.tone || projectData.tone || undefined,
                targetAudience: metadata.targetAudience || 'General Audience',
                variantCount: 1,
                hasStoryDirections: true,
                contentIntent: primeIntent,
                format: metadata.format || projectData.metadata?.format || defaultFormatForIntent(primeIntent),
              }).catch((err) => {
                console.error('[StudioPage] Auto-generation failed:', err)
                toast.error('Failed to generate Blueprint automatically.')
              })
            }, 800)
          }
        }
      } catch (err) {
        console.error('[StudioPage] Failed to load project:', err)
      }
    }
    load()
  }, [projectId, setCurrentProject, setBeats, updateTreatment, setTreatmentVariants, updateTitle])

  // Auto-save effect - debounced to prevent excessive API calls
  // Access treatmentVariants with proper typing (not in ProductionGuide interface yet)
  const treatmentVariants = (guide as any)?.treatmentVariants || []
  const hasBlueprint = treatmentVariants.length > 0

  const blueprintProgress = useBlueprintProgress({
    hasBlueprint,
    isGenerating: isGen,
    hasConceptInput: !!(lastInput?.trim() || guide.filmTreatment?.trim()),
    audienceDefinition,
    savedBlueprintAR,
    shareUrl,
    hasShareLink: !!shareUrl,
  })

  useBlueprintGuideStatus(blueprintProgress)
  useCueBlueprintMode(projectId, hasBlueprint)

  const openResonancePanel = useCallback(() => {
    setShowSidePanel(true)
    setResonanceTabSignal((s) => s + 1)
  }, [])

  const openCollaboratePanel = useCallback(() => {
    setShowSidePanel(true)
    setCollaborationTabSignal((s) => s + 1)
  }, [])

  const studioEventHandlers = useMemo(
    () => ({
      openReimaginDialog: () => setShowReimaginDialog(true),
      openBlueprintRefine: openBlueprintRefineFromToolbar,
      openResonancePanel,
      openCollaboratePanel,
      handleSave: () => void handleSaveProject(),
      handleShare: () => void handleShare(),
      requestStartProduction: handleRequestStartProduction,
      hasBlueprint,
      hasConceptInput: !!(lastInput?.trim() || guide.filmTreatment?.trim()),
    }),
    [
      openBlueprintRefineFromToolbar,
      openResonancePanel,
      openCollaboratePanel,
      handleRequestStartProduction,
      hasBlueprint,
      lastInput,
      guide.filmTreatment,
    ]
  )

  useStudioBlueprintEvents(studioEventHandlers, blueprintProgress)

  const handleNextStepAction = useCallback(() => {
    if (blueprintProgress.nextStepEvent) {
      window.dispatchEvent(new CustomEvent(blueprintProgress.nextStepEvent))
    }
  }, [blueprintProgress.nextStepEvent])
  
  useEffect(() => {
    // Only auto-save for existing projects (not new-project-*)
    if (!projectId || projectId.startsWith('new-project')) return
    
    // Don't save if no meaningful data exists
    const hasData = treatmentVariants.length > 0 || guide.filmTreatment?.trim()
    if (!hasData) {
      console.debug('[StudioPage] Auto-save skipped: no data to save')
      return
    }
    
    // Debug: log when auto-save triggers
    console.debug('[StudioPage] Auto-save triggered:', { variantsLastModified, variantsCount: treatmentVariants.length })
    
    // Mark as unsaved when data changes
    setIsSaved(false)
    
    // Clear existing debounce timer
    if (autoSaveDebounceRef.current) {
      clearTimeout(autoSaveDebounceRef.current)
    }
    
    // Debounce auto-save by 1.5 seconds
    autoSaveDebounceRef.current = setTimeout(async () => {
      try {
        setSaveError(false)
        const blueprintData = {
          id: projectId,
          title: guide.title || 'Untitled Project',
          description: '',
          metadata: {
            ...(currentProject?.metadata || {}),
            blueprintInput: lastInput,
            filmTreatment: guide.filmTreatment,
            treatmentVariants: treatmentVariants,
            beats: beatsView,
            estimatedRuntime: estimatedRuntime,
            audienceDefinition,
            blueprintAudienceResonance: savedBlueprintAR,
            ...(currentProject?.metadata?.contentIntent && {
              contentIntent: currentProject.metadata.contentIntent,
            }),
          }
        }
        
        const res = await fetch(`/api/projects`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blueprintData)
        })
        
        if (res.ok) {
          setIsSaved(true)
          setSaveError(false)
          console.log('[StudioPage] Auto-saved project')
        } else {
          console.error('[StudioPage] Auto-save failed:', res.status)
          setSaveError(true)
        }
      } catch (error) {
        console.error('[StudioPage] Auto-save failed:', error)
        setSaveError(true)
      }
    }, 1500)
    
    // Cleanup on unmount
    return () => {
      if (autoSaveDebounceRef.current) {
        clearTimeout(autoSaveDebounceRef.current)
      }
    }
  }, [projectId, lastInput, variantsLastModified, guide.title, guide.filmTreatment, treatmentVariants, beatsView, estimatedRuntime, audienceDefinition, savedBlueprintAR, currentProject?.metadata])

  useEffect(() => { console.debug('[StudioPage] outline autogen disabled; relying on OutlineV2') }, [guide?.filmTreatment, currentProject?.id])

  const startProgress = () => {
    setGenProgress(5)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setGenProgress((p) => (p < 90 ? p + Math.ceil(Math.random() * 4) : p))
    }, 700)
  }

  const stopProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setGenProgress(100)
    setTimeout(() => setGenProgress(0), 600)
  }

  const [format, setFormat] = useState<'youtube'|'short_film'|'documentary'|'education'|'training'>('documentary')
  const [filmType, setFilmType] = useState<'short_film'|'featurette'|'feature_length'|'micro_short'|'epic'>('short_film')
  const [rigor] = useState<'fast'|'balanced'|'thorough'>('thorough')
  const [beatStructure, setBeatStructure] = useState<'three_act'|'save_the_cat'|'heros_journey'|'mini_doc'|'instructional'>(()=>{
    if (format==='documentary' || format==='youtube') return 'mini_doc'
    if (format==='education' || format==='training') return 'instructional'
    return 'three_act'
  })

  const lastInputRef = React.useRef<string>('')
  const beatsDataRef = React.useRef<any[]>([])

  return (
    <div className="min-h-full">
      <TopProgressBar progress={genProgress} />
      <GeneratingOverlay visible={isGen} message="Creating your Film Concept..." progress={genProgress} />
      
      <PanelGroup direction="horizontal" className="min-h-full">
        {/* Main Content Panel */}
        <Panel defaultSize={showSidePanel ? 75 : 100} minSize={50}>
          <div className="h-full p-4 lg:p-6 max-w-6xl mx-auto">
            {/* Vision-Style Premium Container */}
            <div className="relative rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/60 overflow-hidden shadow-[0_25px_80px_rgba(8,8,20,0.55)]">
              {/* Left accent border - signature SceneFlow styling */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sf-primary via-fuchsia-500 to-cyan-400 opacity-80" />
              
              {/* Header with backdrop blur */}
              <div className="px-6 py-4 border-b border-white/10 bg-slate-900/70 backdrop-blur rounded-t-3xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">Blueprint</h3>
                    {/* Series Episode Badge */}
                    {seriesContext && (
                      <a 
                        href={`/dashboard/series/${seriesContext.seriesId}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-xs font-medium text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                        title={`Part of ${seriesContext.seriesTitle}`}
                      >
                        <Clapperboard className="w-3 h-3" />
                        <span>Episode {seriesContext.episodeNumber}</span>
                      </a>
                    )}
                    {!isSaved && !saveError && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Saving...
                      </span>
                    )}
                    {saveError && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        Save failed
                      </span>
                    )}
                    {isSaved && !saveError && projectId && !projectId.startsWith('new-project') && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Saved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {hasBlueprint && (
                      <BlueprintResonanceStrip
                        progress={blueprintProgress}
                        onOpenResonance={openResonancePanel}
                        onImproveWeakest={() => {
                          window.dispatchEvent(new CustomEvent('blueprint:scroll-weakest'))
                        }}
                      />
                    )}
                    {hasBlueprint && (
                      <Button
                        onClick={handleRequestStartProduction}
                        disabled={isStartingProduction}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm h-9"
                        size="sm"
                      >
                        {isStartingProduction ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                        ) : (
                          <Clapperboard className="w-4 h-4 mr-1.5" />
                        )}
                        {BLUEPRINT_COPY.startProduction}
                      </Button>
                    )}
                    <Button 
                      onClick={() => setShowSidePanel(!showSidePanel)} 
                      variant="outline" 
                      className={cn(
                        "text-gray-300 hover:text-white border-gray-700 p-2",
                        showSidePanel && "bg-blue-500/10 border-blue-500/30 text-blue-300"
                      )}
                      title={showSidePanel ? "Hide Side Panel" : "Show Side Panel"}
                    >
                      {showSidePanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Content area with proper padding */}
              <div className="p-6 space-y-6">
                {hasBlueprint && (
                  <BlueprintNextStepBanner
                    progress={blueprintProgress}
                    onAction={handleNextStepAction}
                  />
                )}
                {hasBlueprint && !checklist.isBlueprintReady && (
                  <BlueprintReadyBanner checklist={checklist} />
                )}
                {refineDiffSummary.length > 0 && (
                  <BlueprintRefineDiffBanner
                    diffs={refineDiffSummary}
                    onDismiss={() => setRefineDiffSummary([])}
                  />
                )}
                {/* Billboard Hero Image - shows when treatment exists */}
                {guide.treatmentVariants && guide.treatmentVariants.length > 0 && guide.treatmentVariants[0]?.title && (
                  <div data-blueprint-section="hero-image">
                    <TreatmentHeroImage
                      image={guide.treatmentVariants[0]?.heroImage || null}
                      title={guide.treatmentVariants[0]?.title || guide.title || 'Untitled'}
                      subtitle={guide.treatmentVariants[0]?.logline}
                      genre={guide.treatmentVariants[0]?.genre}
                      aspectRatio="2.39:1"
                      className="mb-6"
                      onRegenerate={() => setShowHeroPromptBuilder(true)}
                      onEditPrompt={() => {
                        // Open edit modal if hero image exists, otherwise open prompt builder
                        if (guide.treatmentVariants[0]?.heroImage?.url) {
                          setShowHeroEditModal(true)
                        } else {
                          setShowHeroPromptBuilder(true)
                        }
                      }}
                      onUpload={async (file) => {
                        setIsUploadingHero(true)
                        try {
                          const formData = new FormData()
                          formData.append('file', file)
                          formData.append('projectId', projectId)
                          
                          const response = await fetch('/api/upload/image', {
                            method: 'POST',
                            body: formData
                          })
                          
                          if (!response.ok) throw new Error('Upload failed')
                          
                          const data = await response.json()
                          if (data.imageUrl) {
                            const currentVariants = useGuideStore.getState().guide.treatmentVariants || []
                            const selectedId = useGuideStore.getState().guide.selectedTreatmentId
                            const targetId = selectedId || currentVariants[0]?.id
                            const updatedVariants = currentVariants.map((v: any) =>
                              v.id === targetId
                                ? { ...v, heroImage: { url: data.imageUrl, status: 'ready' } }
                                : v
                            )
                            setTreatmentVariants(updatedVariants)
                            await persistBlueprintMetadata({ treatmentVariants: updatedVariants })
                            setHeroImageError(null)
                            const updatedVariant = updatedVariants.find((v: any) => v.id === targetId)
                            if (updatedVariant) {
                              await syncActiveBlueprintShare(updatedVariant as Record<string, unknown>)
                            }
                            const { toast } = await import('sonner')
                            toast.success('Hero image uploaded successfully')
                          }
                        } catch (error) {
                          console.error('Upload error:', error)
                          const { toast } = await import('sonner')
                          toast.error('Failed to upload image')
                        } finally {
                          setIsUploadingHero(false)
                        }
                      }}
                      isGenerating={isGeneratingHeroImage}
                      isUploading={isUploadingHero}
                      error={heroImageError}
                    />
                  </div>
                )}

                {/* Empty Blueprint State - the Start Project dialog opens automatically;
                    this slim CTA is the fallback to reopen it after dismissal. */}
                {(!guide.treatmentVariants || guide.treatmentVariants.length === 0) && !isGen && (
                  <ProductEmptyState
                    icon={<Wand2 className="h-8 w-8 text-cyan-400" />}
                    title="Start Your Project"
                    description="Describe your project and generate a professional Blueprint with AI-powered story structure, characters, and visual direction."
                    accent="product"
                    className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-purple-500/5"
                    actionLabel="Start Project"
                    onAction={() => setShowReimaginDialog(true)}
                  />
                )}

                {/* Treatment Card */}
                <TreatmentCard
                  onOpenBlueprintRefine={openBlueprintRefineFromToolbar}
                  onShareBlueprint={handleShare}
                  isSharingBlueprint={isSharing}
                  shareUrl={shareUrl}
                  onStartProduction={handleRequestStartProduction}
                  isStartingProduction={isStartingProduction}
                  startProductionEnabled={checklist.blueprintGenerated}
                  onOpenCollaborate={openCollaboratePanel}
                />
              </div>
            </div>
          </div>
        </Panel>
        
        {/* Resize Handle */}
        {showSidePanel && (
          <>
            <PanelResizeHandle className="w-1.5 bg-gray-800/50 hover:bg-blue-500/50 transition-colors cursor-col-resize" />
            
            {/* Side Panel with Resonance & Collaboration Tabs */}
            <Panel defaultSize={25} minSize={20} maxSize={40}>
              <SidePanelTabs 
                onClose={() => setShowSidePanel(false)}
                sessionId={sessionId}
                shareToken={shareToken}
                shareUrl={shareUrl}
                onShare={handleShare}
                isSharing={isSharing}
                collaborationTabSignal={collaborationTabSignal}
                resonanceTabSignal={resonanceTabSignal}
                projectId={projectId}
                audienceDefinition={audienceDefinition}
                onAudienceDefinitionSave={handleAudienceDefinitionSave}
                onProceedToScripting={handleProceedToScripting}
                onAnalysisComplete={handleAnalysisComplete}
                savedBlueprintAR={savedBlueprintAR}
                legacyIntent={legacyARIntent}
                contentIntent={currentProject?.metadata?.contentIntent}
                onOpenBlueprintRefine={openBlueprintRefine}
                onScrollToSection={(section) => scrollToBlueprintSection(section)}
              />
            </Panel>
          </>
        )}
      </PanelGroup>
      
      {/* Structure Help Modal */}
      {showStructureHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowStructureHelp(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                How Flow Creates Your Story
              </h3>
              <button onClick={() => setShowStructureHelp(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>Flow analyzes your concept and generates a professional film treatment using industry-standard techniques:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>AI Narrative Reasoning</strong>—Flow will explain <em>why</em> it chose specific protagonists, themes, and creative directions in the "Narrative Reasoning" section.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Three-Act Structure</strong>—Your story is automatically organized into Setup, Confrontation, and Resolution beats.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Character Development</strong>—Main and supporting characters with motivations, arcs, and relationships.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Visual Style Guide</strong>—Tone, mood, and cinematography recommendations tailored to your genre.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>The AI may make <strong>creative decisions</strong> (combining characters, emphasizing themes) to strengthen the narrative—check the "Narrative Reasoning" section in your treatment to understand these choices.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {activeTreatmentVariant && (
        <BlueprintRefineDialog
          open={blueprintRefineOpen}
          variant={activeTreatmentVariant as any}
          onClose={() => {
            setBlueprintRefineOpen(false)
            setBlueprintRefineRecs(undefined)
            setBlueprintRefineTab(undefined)
            blueprintRefineApplyExtraRef.current = null
          }}
          onApply={handleBlueprintRefineApply}
          onRefineApplied={handleBlueprintRefineApplied}
          projectId={projectId}
          resonanceRecommendations={blueprintRefineRecs}
          initialActiveTab={blueprintRefineTab}
          onRequestReanalyze={requestBlueprintReanalyze}
          contentIntent={currentProject?.metadata?.contentIntent}
        />
      )}

      {/* Blueprint Reimagine Dialog for initial generation */}
      <BlueprintReimaginDialog
        open={showFoundationReimagineDialog}
        onClose={() => {
          setShowFoundationReimagineDialog(false)
          setFoundationFocus(undefined)
          returnProductionProjectIdRef.current = null
        }}
        existingVariant={activeTreatmentVariant}
        focusField={foundationFocus}
        projectId={projectId}
        onGenerate={async (input, opts) => {
          setShowFoundationReimagineDialog(false)
          await handleGenerateBlueprint(input, {
            genre: opts?.genre,
            tone: opts?.tone,
            duration: opts?.duration,
            targetAudience: opts?.targetAudience,
            artStyle: opts?.artStyle,
            aspectRatio: opts?.aspectRatio,
            variantCount: 1,
            rigor: opts?.rigor,
            hasStoryDirections: opts?.hasStoryDirections,
            format: opts?.format,
            contentIntent: opts?.contentIntent,
          })
          const returnId = returnProductionProjectIdRef.current
          const latestVariant = useGuideStore.getState().guide.treatmentVariants?.[0]
          if (returnId && latestVariant) {
            await syncVariantToProductionProject(latestVariant as Record<string, unknown>, returnId)
          }
          returnProductionProjectIdRef.current = null
          setFoundationFocus(undefined)
        }}
      />

      <BlueprintReimaginDialog
        open={showReimaginDialog}
        onClose={() => setShowReimaginDialog(false)}
        existingVariant={null}
        initialIdea={
          currentProject?.metadata?.blueprintPrimeInput
            ? {
                logline: currentProject.metadata.blueprintPrimeInput,
                synopsis: currentProject.metadata.blueprintPrimeInput,
                genre: currentProject.genre || currentProject.metadata.genre,
              }
            : undefined
        }
        onGenerate={async (input, opts) => {
          setShowReimaginDialog(false)
          // Forward dialog options to enable API optimizations (reduced variants, skip core concept)
          await handleGenerateBlueprint(input, {
            genre: opts?.genre,
            tone: opts?.tone,
            duration: opts?.duration,
            targetAudience: opts?.targetAudience,
            artStyle: opts?.artStyle,
            aspectRatio: opts?.aspectRatio,
            variantCount: opts?.variantCount,
            rigor: opts?.rigor,
            hasStoryDirections: opts?.hasStoryDirections,
            generateThreeDirections: opts?.generateThreeDirections,
            format: opts?.format,
            contentIntent: opts?.contentIntent,
          })
        }}
      />

      {/* Hero Image Prompt Drawer (legacy) */}
      {guide.treatmentVariants && guide.treatmentVariants[0] && (
        <ThumbnailPromptDrawer
          open={showPromptDrawer}
          onClose={() => setShowPromptDrawer(false)}
          treatmentVariant={guide.treatmentVariants[0]}
          onThumbnailGenerated={async (customPrompt) => {
            setShowPromptDrawer(false)
            await generateHeroImage(guide.treatmentVariants[0], true, customPrompt)
          }}
        />
      )}
      
      {/* Hero Image Prompt Builder Dialog - with reference library integration */}
      {guide.treatmentVariants && guide.treatmentVariants[0] && (
        <HeroImagePromptBuilder
          open={showHeroPromptBuilder}
          onClose={() => setShowHeroPromptBuilder(false)}
          treatment={{
            title: guide.treatmentVariants[0]?.title || guide.title || 'Untitled',
            logline: guide.treatmentVariants[0]?.logline,
            synopsis: guide.treatmentVariants[0]?.synopsis || guide.treatmentVariants[0]?.content,
            genre: guide.treatmentVariants[0]?.genre,
            setting: guide.treatmentVariants[0]?.setting,
            tone: guide.treatmentVariants[0]?.tone,
            themes: guide.treatmentVariants[0]?.themes,
            visual_style: guide.treatmentVariants[0]?.visual_style || guide.treatmentVariants[0]?.visualStyle
          }}
          availableCharacters={((guide as any).characters || guide.treatmentVariants[0]?.character_descriptions || []).map((c: any) => ({
            name: c.name,
            description: c.description,
            referenceImage: c.referenceImage,
            appearanceDescription: c.appearanceDescription,
            ethnicity: c.ethnicity,
            role: c.role
          }))}
          sceneReferences={(guide as any).sceneReferences || []}
          objectReferences={(guide as any).objectReferences || []}
          onGenerateImage={async (promptData) => {
            setShowHeroPromptBuilder(false)
            // Generate hero image with the structured prompt data
            await generateHeroImage(guide.treatmentVariants[0], true, promptData.prompt)
          }}
          isGenerating={isGeneratingHeroImage}
        />
      )}
      
      {/* Hero Image Edit Modal - AI-powered editing with identity preservation */}
      {guide.treatmentVariants && guide.treatmentVariants[0]?.heroImage?.url && (
        <ImageEditModal
          open={showHeroEditModal}
          onOpenChange={setShowHeroEditModal}
          imageUrl={guide.treatmentVariants[0].heroImage.url}
          imageType="scene"
          title={`Edit Hero Image — ${guide.treatmentVariants[0]?.title || 'Untitled'}`}
          onSave={(newImageUrl) => {
            // Update the hero image with the edited version
            const currentVariants = useGuideStore.getState().guide.treatmentVariants || []
            const updatedVariants = currentVariants.map((v: any, idx: number) => 
              idx === 0 ? { ...v, heroImage: { ...v.heroImage, url: newImageUrl, status: 'ready' } } : v
            )
            setTreatmentVariants(updatedVariants)
            setShowHeroEditModal(false)
          }}
        />
      )}

      <StartProductionDialog
        open={showPreflight}
        onOpenChange={(open) => {
          if (!open) cancelStartProduction()
        }}
        gate={pendingGate}
        isStarting={isStartingProduction}
        onConfirm={confirmStartProduction}
        onCancel={cancelStartProduction}
      />

      <BlueprintOnboarding />
    </div>
  );
}
