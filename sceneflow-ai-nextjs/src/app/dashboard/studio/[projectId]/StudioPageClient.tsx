'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/Input";
import { DownloadIcon, Edit, ChevronUp, Save, Settings, FileText, BarChart3, ChevronRight, Check, HelpCircle, Sparkles, Film, Lightbulb } from "lucide-react";
import { useGuideStore } from "@/store/useGuideStore";
import { useStore } from '@/store/useStore'
import { useCue } from "@/store/useCueStore";
import ProjectIdeaTab from "@/components/studio/ProjectIdeaTab";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
import { BlueprintComposer } from '@/components/blueprint/BlueprintComposer'
import { TreatmentHeroImage } from '@/components/treatment/TreatmentHeroImage'
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

  const isProjectCreated = !!(guide.filmTreatment && guide.filmTreatment.trim() !== '' && guide.title && guide.title !== 'Untitled Project');

  // Duration and beat state
  const [beatsView, setBeatsView] = useState<any[]>([])
  const [estimatedRuntime, setEstimatedRuntime] = useState<number | null>(null)

  // Store last input
  const [lastInput, setLastInput] = useState('')

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
        
        if (variants[0]) {
          updateTitle(variants[0].title || 'Untitled Project')
          updateTreatment(variants[0].synopsis || variants[0].content || '')
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
          const projectData = await res.json()
          loadedProjectRef.current = projectId
          setCurrentProject(projectData)
          
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
            console.log('[StudioPage] Restored approved filmTreatmentVariant from project:', approvedVariant.id || 'approved-treatment')
          } else if (hasTreatmentVariants) {
            // Restore from treatmentVariants array
            setTreatmentVariants(metadata.treatmentVariants)
            if (metadata.treatmentVariants[0]) {
              const first = metadata.treatmentVariants[0]
              updateTreatment(first.content || first.synopsis || '')
            }
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
        }
      } catch (err) {
        console.error('[StudioPage] Failed to load project:', err)
      }
    }
    load()
  }, [projectId, setCurrentProject, setBeats, updateTreatment, setTreatmentVariants, updateTitle])

  useEffect(() => { console.debug('[StudioPage] outline autogen disabled; relying on OutlineV2') }, [guide?.filmTreatment, currentProject?.id])

  const [isGen, setIsGen] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
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
    <div className="min-h-screen p-4 lg:p-6 max-w-7xl mx-auto">
      <TopProgressBar progress={genProgress} />
      <GeneratingOverlay visible={isGen} message="Creating your Film Concept..." progress={genProgress} />
      
      {/* Vision-Style Premium Container */}
      <div className="relative rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/60 overflow-hidden shadow-[0_25px_80px_rgba(8,8,20,0.55)]">
        {/* Left accent border - signature SceneFlow styling */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sf-primary via-fuchsia-500 to-cyan-400 opacity-80" />
        
        {/* Header with backdrop blur */}
        <div className="px-6 py-4 border-b border-white/10 bg-slate-900/70 backdrop-blur rounded-t-3xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/30">
                <Lightbulb className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">The Blueprint</h1>
                <p className="text-xs text-gray-400">Step 1: Ideation & Development</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">Phase 1 of 3</span>
              <Button onClick={handleSaveProject} variant="outline" className="text-gray-300 hover:text-white border-gray-700">
                <Save className="w-4 h-4 mr-2" />
                Save
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
            />
          )}

          {/* Blueprint Composer */}
          <div className="rounded-2xl p-5 border border-slate-700/50 bg-gradient-to-b from-slate-900/80 to-slate-900/40">
            <div className="flex items-center gap-2 mb-3">
              <Film className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-gray-200">Your Creative Vision</span>
            </div>
            <BlueprintComposer
              onGenerate={handleGenerateBlueprint}
            />
          </div>

          {/* Treatment Card */}
          <TreatmentCard />
        </div>
      </div>
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
    </div>
  );
}
