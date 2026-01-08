'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/Input";
import { DownloadIcon, Edit, ChevronUp, Settings, FileText, BarChart3, ChevronRight, Check, HelpCircle, Sparkles, Film, Lightbulb, PanelRight, PanelRightClose, RefreshCw, Wand2 } from "lucide-react";
import { useGuideStore } from "@/store/useGuideStore";
import { useStore } from '@/store/useStore'
import { useCue } from "@/store/useCueStore";
import ProjectIdeaTab from "@/components/studio/ProjectIdeaTab";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
import { BlueprintComposer } from '@/components/blueprint/BlueprintComposer'
import { BlueprintReimaginDialog } from '@/components/blueprint/BlueprintReimaginDialog'
import { TreatmentHeroImage } from '@/components/treatment/TreatmentHeroImage'
import { SidePanelTabs } from '@/components/blueprint/SidePanelTabs'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
const TreatmentCard = dynamic(() => import('@/components/blueprint/TreatmentCard').then(mod => mod.TreatmentCard), { ssr: false })
import TopProgressBar from '@/components/ui/TopProgressBar'
import GeneratingOverlay from '@/components/ui/GeneratingOverlay'

interface StudioPageClientProps {
  projectId: string;
}

export default function StudioPageClient({ projectId }: StudioPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { guide, updateTitle, updateTreatment, setTreatmentVariants } = useGuideStore();
  const { invokeCue } = useCue();
  const { currentProject, setCurrentProject, setBeats } = useStore();
  const [isNewProject, setIsNewProject] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showStructureHelp, setShowStructureHelp] = useState(false);
  const loadedProjectRef = useRef<string | null>(null);
  
  // Ideation panel state with localStorage persistence (migrated from inspiration-panel)
  const [showIdeationPanel, setShowIdeationPanel] = useState(() => {
    if (typeof window !== 'undefined') {
      // Migration: check for old key first, then new key
      const oldKey = localStorage.getItem('blueprint-inspiration-panel')
      const newKey = localStorage.getItem('blueprint-ideation-panel')
      if (oldKey !== null && newKey === null) {
        // Migrate old preference to new key
        localStorage.setItem('blueprint-ideation-panel', oldKey)
        localStorage.removeItem('blueprint-inspiration-panel')
        return oldKey === 'true'
      }
      return newKey !== null ? newKey === 'true' : true // Default to open
    }
    return true
  })
  
  // Persist panel state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('blueprint-ideation-panel', String(showIdeationPanel))
    }
  }, [showIdeationPanel])
  
  // Callback for inserting inspiration text into BlueprintComposer
  const insertTextRef = useRef<((text: string) => void) | null>(null)
  
  const handleInsertInspiration = (text: string) => {
    if (insertTextRef.current) {
      insertTextRef.current(text)
    }
  }
  
  const registerInsertText = (callback: (text: string) => void) => {
    insertTextRef.current = callback
  }

  const isProjectCreated = !!(guide.filmTreatment && guide.filmTreatment.trim() !== '' && guide.title && guide.title !== 'Untitled Project');

  // Duration and beat state
  const [beatsView, setBeatsView] = useState<any[]>([])
  const [estimatedRuntime, setEstimatedRuntime] = useState<number | null>(null)

  // Store last input
  const [lastInput, setLastInput] = useState('')
  
  // Auto-save debounce ref and saved indicator
  const autoSaveDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const [isSaved, setIsSaved] = useState(true)
  
  // Composer visibility - collapsed after generation when variants exist
  const [showComposer, setShowComposer] = useState(true)
  
  // Reimagine dialog state for initial generation
  const [showReimaginDialog, setShowReimaginDialog] = useState(false)
  
  // Collaboration state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  
  // Handle share/collaborate
  const handleShare = async () => {
    const variants = (guide as any)?.treatmentVariants
    if (!variants?.length) return
    
    setIsSharing(true)
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('authUserId') || crypto.randomUUID() : 'anonymous'
      if (typeof window !== 'undefined' && !localStorage.getItem('authUserId')) {
        localStorage.setItem('authUserId', userId)
      }
      
      const items = variants.map((v: any) => ({
        id: v.id,
        title: v.title,
        logline: v.logline,
        synopsis: v.synopsis
      }))
      
      const res = await fetch('/api/collab/session.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: userId, items })
      })
      
      const data = await res.json()
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId)
        const url = `${window.location.origin}/collaborate/${data.sessionId}`
        setShareUrl(url)
        await navigator.clipboard.writeText(url)
        try { const { toast } = require('sonner'); toast.success('Link copied to clipboard!') } catch {}
      }
    } catch (error) {
      console.error('Share failed:', error)
      try { const { toast } = require('sonner'); toast.error('Failed to create share link') } catch {}
    } finally {
      setIsSharing(false)
    }
  }

  // Auto-generate hero image for treatment variant
  const generateHeroImage = async (variant: any) => {
    if (!variant?.title) return
    
    setIsGeneratingHeroImage(true)
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
          mood: 'balanced'
        })
      })
      
      if (!response.ok) {
        throw new Error('Hero image generation failed')
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
      }
    } catch (error) {
      console.error('[StudioPage] Hero image generation error:', error)
      // Non-blocking - don't throw, just log
    } finally {
      setIsGeneratingHeroImage(false)
    }
  }

  // Generate film treatment handler
  const handleGenerateBlueprint = async (text: string, opts?: { persona?: 'Narrator'|'Director'; model?: string; rigor?: 'fast'|'balanced'|'thorough' }) => {
    setLastInput(text)
    setIsGen(true)
    startProgress()
    
    try {
      const response = await fetch('/api/ideation/film-treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          format: 'short_film',
          filmType: 'short_film',
          rigor: opts?.rigor || 'thorough',
          variants: 3
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
        
        // Auto-collapse composer after successful generation
        setShowComposer(false)
        
        if (variants[0]) {
          updateTitle(variants[0].title || 'Untitled Project')
          updateTreatment(variants[0].synopsis || variants[0].content || '')
          
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
          blueprintInput: lastInput,
          filmTreatment: guide.filmTreatment,
          treatmentVariants: (guide as any).treatmentVariants || [],
          beats: beatsView,
          estimatedRuntime: estimatedRuntime
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
          
          if (hasFilmTreatmentVariant) {
            const approvedVariant = metadata.filmTreatmentVariant
            if (approvedVariant.content || approvedVariant.synopsis) {
              updateTreatment(approvedVariant.content || approvedVariant.synopsis || '')
            }
            setTreatmentVariants([{
              id: approvedVariant.id || 'approved-treatment',
              ...approvedVariant
            }])
            setShowComposer(false) // Collapse composer when loading existing treatment
            console.log('[StudioPage] Restored approved filmTreatmentVariant from project:', approvedVariant.id || 'approved-treatment')
          } else if (hasTreatmentVariants) {
            // Restore from treatmentVariants array
            setTreatmentVariants(metadata.treatmentVariants)
            if (metadata.treatmentVariants[0]) {
              const first = metadata.treatmentVariants[0]
              updateTreatment(first.content || first.synopsis || '')
            }
            setShowComposer(false) // Collapse composer when loading existing treatment
            console.log('[StudioPage] Restored treatmentVariants from project:', metadata.treatmentVariants.length)
          } else if (hasFilmTreatment) {
            // Restore from plain filmTreatment string
            updateTreatment(metadata.filmTreatment)
            setTreatmentVariants([{
              id: 'legacy-treatment',
              label: projectData.title || 'Film Treatment',
              content: metadata.filmTreatment,
              synopsis: metadata.filmTreatment
            }])
            setShowComposer(false) // Collapse composer when loading existing treatment
            console.log('[StudioPage] Restored legacy filmTreatment from project')
          }
          
          if (projectData.title) {
            updateTitle(projectData.title)
          }
          
          if (metadata.beats) {
            setBeats(metadata.beats)
            setBeatsView(metadata.beats)
          }
          
          if (!hasFilmTreatmentVariant && !hasTreatmentVariants && Array.isArray(metadata.beats)) {
            setBeatsView(metadata.beats)
          }
          
          if (!hasFilmTreatmentVariant && !hasTreatmentVariants && metadata.estimatedRuntime) {
            setEstimatedRuntime(metadata.estimatedRuntime)
          }
          
          console.log('[StudioPage] Project data loaded:', projectData.id)
          
          // Auto-generate hero image if treatment exists but hero image doesn't
          const loadedVariant = metadata.treatmentVariants?.[0] || metadata.filmTreatmentVariant
          if (loadedVariant?.title && !loadedVariant?.heroImage?.url) {
            console.log('[StudioPage] Treatment loaded without hero image, auto-generating...')
            // Use setTimeout to allow state to settle before generating
            setTimeout(() => generateHeroImage(loadedVariant), 500)
          }
        }
      } catch (err) {
        console.error('[StudioPage] Failed to load project:', err)
      }
    }
    load()
  }, [projectId, setCurrentProject, setBeats, updateTreatment, setTreatmentVariants, updateTitle])

  // Auto-save effect - debounced to prevent excessive API calls
  useEffect(() => {
    // Only auto-save for existing projects (not new-project-*)
    if (!projectId || projectId.startsWith('new-project')) return
    
    // Don't save if no meaningful data exists
    const hasData = guide.treatmentVariants?.length > 0 || guide.filmTreatment?.trim()
    if (!hasData) return
    
    // Mark as unsaved when data changes
    setIsSaved(false)
    
    // Clear existing debounce timer
    if (autoSaveDebounceRef.current) {
      clearTimeout(autoSaveDebounceRef.current)
    }
    
    // Debounce auto-save by 1.5 seconds
    autoSaveDebounceRef.current = setTimeout(async () => {
      try {
        const blueprintData = {
          id: projectId,
          title: guide.title || 'Untitled Project',
          description: '',
          metadata: {
            blueprintInput: lastInput,
            filmTreatment: guide.filmTreatment,
            treatmentVariants: guide.treatmentVariants || [],
            beats: beatsView,
            estimatedRuntime: estimatedRuntime
          }
        }
        
        const res = await fetch(`/api/projects`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blueprintData)
        })
        
        if (res.ok) {
          setIsSaved(true)
          console.log('[StudioPage] Auto-saved project')
        }
      } catch (error) {
        console.error('[StudioPage] Auto-save failed:', error)
      }
    }, 1500)
    
    // Cleanup on unmount
    return () => {
      if (autoSaveDebounceRef.current) {
        clearTimeout(autoSaveDebounceRef.current)
      }
    }
  }, [projectId, lastInput, guide.treatmentVariants, guide.title, guide.filmTreatment, beatsView, estimatedRuntime])

  useEffect(() => { console.debug('[StudioPage] outline autogen disabled; relying on OutlineV2') }, [guide?.filmTreatment, currentProject?.id])

  const [isGen, setIsGen] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [isGeneratingHeroImage, setIsGeneratingHeroImage] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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
    <div className="min-h-screen">
      <TopProgressBar progress={genProgress} />
      <GeneratingOverlay visible={isGen} message="Creating your Film Concept..." progress={genProgress} />
      
      <PanelGroup direction="horizontal" className="min-h-screen">
        {/* Main Content Panel */}
        <Panel defaultSize={showIdeationPanel ? 75 : 100} minSize={50}>
          <div className="h-full p-4 lg:p-6 max-w-6xl mx-auto">
            {/* Vision-Style Premium Container */}
            <div className="relative rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/60 overflow-hidden shadow-[0_25px_80px_rgba(8,8,20,0.55)]">
              {/* Left accent border - signature SceneFlow styling */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sf-primary via-fuchsia-500 to-cyan-400 opacity-80" />
              
              {/* Header with backdrop blur */}
              <div className="px-6 py-4 border-b border-white/10 bg-slate-900/70 backdrop-blur rounded-t-3xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">The Blueprint</h3>
                    {!isSaved && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        Saving...
                      </span>
                    )}
                    {isSaved && projectId && !projectId.startsWith('new-project') && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Saved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => setShowIdeationPanel(!showIdeationPanel)} 
                      variant="outline" 
                      className={cn(
                        "text-gray-300 hover:text-white border-gray-700 p-2",
                        showIdeationPanel && "bg-blue-500/10 border-blue-500/30 text-blue-300"
                      )}
                      title={showIdeationPanel ? "Hide Ideation Panel" : "Show Ideation Panel"}
                    >
                      {showIdeationPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Content area with proper padding */}
              <div className="p-6 space-y-6">
                {/* Billboard Hero Image - shows when treatment exists */}
                {guide.treatmentVariants && guide.treatmentVariants.length > 0 && guide.treatmentVariants[0]?.title && (
                  <TreatmentHeroImage
                    image={guide.treatmentVariants[0]?.heroImage || null}
                    title={guide.treatmentVariants[0]?.title || guide.title || 'Untitled'}
                    subtitle={guide.treatmentVariants[0]?.logline}
                    genre={guide.treatmentVariants[0]?.genre}
                    aspectRatio="2.39:1"
                    className="mb-6"
                    onRegenerate={() => generateHeroImage(guide.treatmentVariants[0])}
                    isGenerating={isGeneratingHeroImage}
                  />
                )}

                {/* Blueprint Composer - Collapsible after generation */}
                <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-900/80 to-slate-900/40 overflow-hidden">
                  <button
                    onClick={() => setShowComposer(!showComposer)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-gray-200">Your Creative Vision</span>
                      {!showComposer && guide.treatmentVariants && guide.treatmentVariants.length > 0 && (
                        <span className="text-xs text-gray-500 ml-2">• Click to edit</span>
                      )}
                    </div>
                    <ChevronUp className={cn(
                      "w-4 h-4 text-gray-400 transition-transform duration-200",
                      !showComposer && "rotate-180"
                    )} />
                  </button>
                  
                  {showComposer && (
                    <div className="px-5 pb-5">
                      <BlueprintComposer
                        onGenerate={handleGenerateBlueprint}
                        onInsertText={registerInsertText}
                      />
                    </div>
                  )}
                </div>

                {/* Empty Blueprint State - Show prominent CTA when no Blueprint exists */}
                {(!guide.treatmentVariants || guide.treatmentVariants.length === 0) && !isGen && (
                  <div className="rounded-2xl border-2 border-dashed border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-cyan-500/30">
                      <Wand2 className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Create Your Blueprint</h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                      Generate a professional film treatment with AI-powered story structure, characters, and visual direction.
                    </p>
                    <Button
                      onClick={() => setShowReimaginDialog(true)}
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-6 py-3 text-base font-medium"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Blueprint
                    </Button>
                    <p className="text-xs text-gray-500 mt-3">
                      Or use the composer above for quick generation
                    </p>
                  </div>
                )}

                {/* Treatment Card */}
                <TreatmentCard />
              </div>
            </div>
          </div>
        </Panel>
        
        {/* Resize Handle */}
        {showIdeationPanel && (
          <>
            <PanelResizeHandle className="w-1.5 bg-gray-800/50 hover:bg-blue-500/50 transition-colors cursor-col-resize" />
            
            {/* Side Panel with Ideation & Collaboration Tabs */}
            <Panel defaultSize={25} minSize={20} maxSize={40}>
              <SidePanelTabs 
                onInsert={handleInsertInspiration}
                onClose={() => setShowIdeationPanel(false)}
                sessionId={sessionId}
                shareUrl={shareUrl}
                onShare={handleShare}
                isSharing={isSharing}
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
      
      {/* Blueprint Reimagine Dialog for initial generation */}
      <BlueprintReimaginDialog
        open={showReimaginDialog}
        onClose={() => setShowReimaginDialog(false)}
        existingVariant={null}
        onGenerate={async (input, opts) => {
          setShowReimaginDialog(false)
          // Use the existing handleGenerateBlueprint logic
          await handleGenerateBlueprint(input)
        }}
      />
    </div>
  );
}
