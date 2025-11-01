'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
// Removed Tabs for single-phase view
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/Input";
import { DownloadIcon, Edit, ChevronUp, Save, Settings, FileText, BarChart3, ChevronRight, Check, HelpCircle } from "lucide-react";
import { useGuideStore } from "@/store/useGuideStore";
import { useStore } from '@/store/useStore'
import { useCue } from "@/store/useCueStore";
import ProjectIdeaTab from "@/components/studio/ProjectIdeaTab";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
// Topbar credit chip removed to reduce redundancy
// import { BlueprintTopbar } from '@/components/blueprint/BlueprintTopbar'
import { BlueprintComposer } from '@/components/blueprint/BlueprintComposer'
import { TreatmentCard } from '@/components/blueprint/TreatmentCard'
// Bottom ActionBar removed (duplicate of composer actions)
import { ContextBar } from '@/components/layout/ContextBar'
import TopProgressBar from '@/components/ui/TopProgressBar'
import GeneratingOverlay from '@/components/ui/GeneratingOverlay'

// Client-only components (outline tab removed)

export default function SparkStudioPage({ params }: { params: { projectId: string } }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { guide } = useGuideStore();
  const { invokeCue } = useCue();
  const { currentProject, setCurrentProject, setBeats } = useStore();
  const [isNewProject, setIsNewProject] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showStructureHelp, setShowStructureHelp] = useState(false);
  // Single-phase view (Film Concept) – Vision exists as its own page

  const isProjectCreated = !!(guide.filmTreatment && guide.filmTreatment.trim() !== '' && guide.title && guide.title !== 'Untitled Project');

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
      
      if (params.projectId && !params.projectId.startsWith('new-project')) {
        // Update existing project
        const res = await fetch(`/api/projects`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: params.projectId,
            ...blueprintData
          })
        })
        
        if (res.ok) {
          try { const { toast } = require('sonner'); toast.success('Project saved!') } catch {}
        }
      } else {
        // Create new project
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

  // Set default userName in localStorage for testing
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('userName')) {
      localStorage.setItem('userName', 'Brian Anderson')
    }
  }, [])

  // Init with Cue for new projects
  useEffect(() => {
    if (params.projectId.startsWith('new-project') && !isNewProject) {
      setIsNewProject(true);
      setIsInitializing(true);
      if (guide.filmTreatment && guide.filmTreatment.trim() !== '') {
        setIsInitializing(false);
      } else {
        invokeCue({
          type: 'text',
          content: `Initialize new project "${params.projectId}" with baseline Film Treatment, Character Breakdowns, and Interactive Beat Sheet following the No Blank Canvas principle. Generate comprehensive content for a new video project.`
        });
        setTimeout(() => setIsInitializing(false), 2000);
      }
    }
  }, [params.projectId, isNewProject, invokeCue, guide.filmTreatment]);

  // Ensure current project is loaded for Outline/Script tabs
  useEffect(() => {
    const load = async () => {
      if (!params.projectId || params.projectId.startsWith('new-project')) return
      if (currentProject && currentProject.id === params.projectId) return
      try {
        const res = await fetch(`/api/projects?id=${params.projectId}`, { cache: 'no-store' })
        const json = await res.json().catch(() => null)
        if (json?.success && json?.project) {
          setCurrentProject(json.project)
          // If acts exist, hydrate beats immediately
          if (Array.isArray(json.project?.metadata?.acts) && json.project.metadata.acts.length) {
            setBeats(json.project.metadata.acts)
          }
        }
      } catch {}
    }
    load()
  }, [params.projectId, currentProject, setCurrentProject, setBeats])

  // Disable duplicate autogeneration here
  useEffect(() => { console.debug('[StudioPage] outline autogen disabled; relying on OutlineV2') }, [guide?.filmTreatment, currentProject?.id])

  // Legacy tab code removed (single-phase page)

  const { updateTreatment } = useGuideStore()
  const { setTreatmentVariants } = useGuideStore() as any

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

  // Duration controls state
  const [format, setFormat] = useState<'youtube'|'short_film'|'documentary'|'education'|'training'>('documentary')
  const [filmType, setFilmType] = useState<'short_film'|'featurette'|'feature_length'|'micro_short'|'epic'>('short_film')
  const [rigor] = useState<'fast'|'balanced'|'thorough'>('thorough')
  const [beatStructure, setBeatStructure] = useState<'three_act'|'save_the_cat'|'heros_journey'|'mini_doc'|'instructional'>(()=>{
    if (format==='documentary' || format==='youtube') return 'mini_doc'
    if (format==='education' || format==='training') return 'instructional'
    return 'three_act'
  })

  // Store last input to enable quick re-generate
  const lastInputRef = React.useRef<string>('')

  // Input visibility state
  const [isInputExpanded, setIsInputExpanded] = useState(true)
  const [lastInput, setLastInput] = useState('')

  // Result: duration-aware beats
  const [beatsView, setBeatsView] = useState<Array<{ title: string; intent?: string; minutes: number }>>([])
  const [estimatedRuntime, setEstimatedRuntime] = useState<number | null>(null)

  const onGenerate = async (text: string, opts?: { persona?: 'Narrator'|'Director'; model?: string; rigor?: 'fast'|'balanced'|'thorough' }) => {
    if (!text?.trim()) return
    try {
      setIsGen(true)
      startProgress()
      lastInputRef.current = text.trim()
      setLastInput(text.trim()) // Store for collapsed view
      console.log('[Blueprint Studio] Generating 1 variant with model: gemini')
      const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') || 'User' : 'User'
      const res = await fetch('/api/ideation/film-treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, variants: 1, provider: 'gemini', format, filmType, rigor: opts?.rigor ?? rigor, beatStructure, persona: opts?.persona, userName })
      })
      const json = await res.json().catch(() => null)
      if (json?.success) {
        const variants = Array.isArray(json?.variants) ? json.variants : []
        if (variants.length) {
          setTreatmentVariants(variants.map((v: any) => ({
            id: v.id,
            label: v.label,
            content: v.film_treatment,
            visual_style: v.visual_style,
            tone_description: v.tone_description,
            target_audience: v.target_audience,
            title: v.title,
            logline: v.logline,
            genre: v.genre,
            format_length: v.format_length,
            author_writer: v.author_writer,
            date: v.date,
            synopsis: v.synopsis,
            setting: v.setting,
            protagonist: v.protagonist,
            antagonist: v.antagonist,
            act_breakdown: v.act_breakdown,
            tone: v.tone,
            style: v.style,
            themes: v.themes,
            mood_references: v.mood_references,
            character_descriptions: v.character_descriptions,
            beats: v.beats,  // CRITICAL: Include beats array!
            total_duration_seconds: v.total_duration_seconds,  // CRITICAL: Include duration!
            estimatedDurationMinutes: v.estimatedDurationMinutes,  // CRITICAL: Include estimate!
            narrative_reasoning: v.narrative_reasoning  // Include narrative reasoning
          })))
          
          // Log narrative reasoning for each variant
          variants.forEach((v: any) => {
            console.log('[Blueprint] Variant narrative_reasoning:', v.narrative_reasoning ? 'Present' : 'Missing')
            if (v.narrative_reasoning) {
              console.log('[Blueprint] narrative_reasoning data:', v.narrative_reasoning)
            }
          })
        }
        const treatment = json?.data?.film_treatment || ''
        if (treatment) updateTreatment(String(treatment))
        // Capture beats/estimated runtime from primary variant if available
        const primary = (Array.isArray(json?.variants) && json.variants[0]) || json?.data
        if (primary?.beats && Array.isArray(primary.beats)) {
          setBeatsView(primary.beats.map((b: any) => ({ title: b.title || 'Segment', intent: b.intent, minutes: Number(b.minutes) || 1 })))
          setEstimatedRuntime(Number(primary.estimatedDurationMinutes) || primary.beats.reduce((s: number, b: any)=> s + (Number(b.minutes)||0), 0))
        } else {
          setBeatsView([])
          setEstimatedRuntime(null)
        }
        
        // Auto-collapse input after successful generation
        setIsInputExpanded(false)
      } else {
        console.error('Generation failed:', json?.message || 'Unknown error')
      }
    } catch (e) {
      console.error('Generate Treatment failed', e)
    } finally {
      stopProgress()
      setIsGen(false)
    }
  }

  const quickFilmType = async (type: 'short_film'|'featurette'|'feature_length'|'micro_short'|'epic') => {
    setFilmType(type)
    if (!lastInputRef.current) return
    await onGenerate(lastInputRef.current)
  }

  // Listen for regenerate events from TreatmentCard
  useEffect(() => {
    const handleRegenerate = (e: CustomEvent) => {
      const newFilmType = e.detail?.filmType
      if (newFilmType && lastInput) {
        setFilmType(newFilmType)
        // Trigger regeneration
        onGenerate(lastInput)
      }
    }
    window.addEventListener('sf:regenerate-treatment' as any, handleRegenerate as any)
    return () => window.removeEventListener('sf:regenerate-treatment' as any, handleRegenerate as any)
  }, [lastInput])

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <main className={cn("flex-1 overflow-hidden", "mr-0") }>
          <TopProgressBar visible={isGen} progress={genProgress} />
          <ContextBar
            title="The Blueprint"
            titleVariant="page"
            emphasis
            secondaryActions={
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={handleSaveProject}
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            }
          />
          <div className="flex-1 overflow-auto p-3 sm:p-6 pt-20 md:pt-24" style={{ scrollMarginTop: 'calc(var(--app-bar-h) + var(--context-bar-h))' }}>
            {/* Collapsible Input Section */}
            <div className="space-y-4">
              {/* Compact header when collapsed */}
              {!isInputExpanded && lastInput && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Your Input</div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {lastInput?.slice(0, 120) || 'No input'}
                          {lastInput && lastInput.length > 120 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setIsInputExpanded(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Full input area when expanded */}
              {isInputExpanded && (
                <>
                  {/* Configuration Section - Vision page style */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-blue-500" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Film Structure</h3>
                      </div>
                      <button
                        onClick={() => setShowStructureHelp(true)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Learn about Film Structure options"
                      >
                        <HelpCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Format */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                          Format
                        </label>
                        <Select value={format} onValueChange={(v)=>setFormat(v as any)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="short_film">Short Film</SelectItem>
                            <SelectItem value="documentary">Documentary</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Beat Structure */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                          Beat Structure
                        </label>
                        <Select value={beatStructure} onValueChange={(v)=>setBeatStructure(v as any)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select structure" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="three_act">Three-Act</SelectItem>
                            <SelectItem value="save_the_cat">Save the Cat</SelectItem>
                            <SelectItem value="heros_journey">Hero's Journey</SelectItem>
                            <SelectItem value="mini_doc">Mini-Doc</SelectItem>
                            <SelectItem value="instructional">Instructional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Film Type */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                          Film Type
                        </label>
                        <Select value={filmType} onValueChange={(v)=>setFilmType(v as any)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select film type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="micro_short">Micro Short (1-5 min)</SelectItem>
                            <SelectItem value="short_film">Short Film (5-15 min)</SelectItem>
                            <SelectItem value="featurette">Featurette (15-40 min)</SelectItem>
                            <SelectItem value="feature_length">Feature Length (40-90 min)</SelectItem>
                            <SelectItem value="epic">Epic (90+ min)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Blueprint Input - Vision page style */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="w-5 h-5 text-purple-500" />
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Project Description</h3>
                    </div>
                    
                    <BlueprintComposer onGenerate={onGenerate} rigor={rigor} />
                  </div>
                  
                  {/* Collapse button - only show after variants exist */}
                  {(guide as any).treatmentVariants && Array.isArray((guide as any).treatmentVariants) && (guide as any).treatmentVariants.length > 0 && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => setIsInputExpanded(false)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-200"
                      >
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Hide Input
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <TreatmentCard />
            
            {/* Continue to Vision CTA - Only show after treatment is generated */}
            {(guide as any).treatmentVariants && Array.isArray((guide as any).treatmentVariants) && (guide as any).treatmentVariants.length > 0 && (
              <div className="mt-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Blueprint Complete!</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Continue to Vision to generate your production script
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/dashboard/workflow/vision/${params.projectId}`)}
                    size="default"
                    className="bg-sf-primary text-white hover:bg-sf-accent flex items-center gap-2"
                  >
                    <span>Continue to Vision</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <GeneratingOverlay visible={isGen} title="Crafting Film Treatment..." progress={genProgress} />
        </main>
      </div>

      {/* Film Structure Help Overlay */}
      {showStructureHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowStructureHelp(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Film Structure Guide</h2>
              </div>
              <button
                onClick={() => setShowStructureHelp(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-2xl text-gray-500 dark:text-gray-400">×</span>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Introduction */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Film Structure settings guide the AI in generating your Film Treatment. These choices determine the narrative framework, pacing, and overall approach to your story.
                </p>
              </div>

              {/* Format Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Format
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Defines the delivery platform and content style, which influences tone, pacing, and structural priorities.
                </p>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">YouTube</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Optimized for retention and engagement. Includes strong opening hooks, clear segments, and calls-to-action. Best for educational content, vlogs, and tutorials.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Short Film</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Cinematic three-act structure with character tension and emotional arcs. Focuses on visual storytelling and dramatic pacing.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Documentary</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Compelling narrative arc with strong voiceover plan and visual motifs. Emphasizes real-world storytelling and audience engagement cues.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Education</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Clear learning objectives with scaffolded sections. Includes recaps and quick assessments. Ideal for instructional content.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Training</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Task-oriented modules with demonstrations, checkpoints, and practice prompts. Designed for skill-building and procedural content.
                    </div>
                  </div>
                </div>
              </div>

              {/* Beat Structure Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Beat Structure
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  The narrative framework that shapes your story's progression. Each structure provides specific beats (story milestones) that guide the AI's treatment generation.
                </p>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Three-Act</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Classic structure: Setup → Confrontation → Resolution. Universal framework suitable for most narrative content. Includes 8 beats from opening hook to final resolution.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Save the Cat</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Blake Snyder's 15-beat structure. Highly detailed with specific emotional beats (Opening Image, Theme Stated, Break into Two, All Is Lost, etc.). Ideal for character-driven stories.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Hero's Journey</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Joseph Campbell's mythic structure with 12 stages (Ordinary World, Call to Adventure, Trials, Return with Elixir). Perfect for transformation and adventure narratives.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Mini-Doc</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Streamlined 6-beat documentary structure: Hook → Context → Journey → Climax → Reflection → CTA. Optimized for short-form non-fiction content.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Instructional</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Learning-focused 7-beat structure: Introduction → Learning Objectives → Core Content → Practice → Assessment → Summary → Next Steps. Best for educational and training content.
                    </div>
                  </div>
                </div>
              </div>

              {/* Film Type Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Film Type
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Defines the target length category, which influences pacing, depth, and narrative scope. The AI prioritizes storytelling quality over rigid duration constraints.
                </p>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Micro Short (1-5 min)</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Ultra-concise storytelling. Single concept or moment. Ideal for social media, quick tutorials, or impactful vignettes.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Short Film (5-15 min)</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Focused narrative with clear beginning, middle, and end. Room for character development and emotional arc. Festival-standard length.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Featurette (15-40 min)</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Extended storytelling with subplots and deeper character exploration. Suitable for documentaries, educational series episodes, or mini-features.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Feature Length (40-90 min)</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Full cinematic experience with complex narrative, multiple character arcs, and thematic depth. Standard theatrical or streaming length.
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">Epic (90+ min)</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Expansive storytelling with multiple storylines, ensemble casts, and rich world-building. Requires substantial narrative scope and production resources.
                    </div>
                  </div>
                </div>
              </div>

              {/* How It Affects Treatment */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">How This Affects Your Film Treatment</h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Format</strong> determines the tone, pacing style, and whether to include CTAs or learning objectives.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Beat Structure</strong> provides the narrative skeleton—the AI generates story beats matching your chosen framework.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Film Type</strong> guides pacing and narrative scope. The AI prioritizes storytelling strength over exact duration.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>The AI may make <strong>creative decisions</strong> (combining characters, emphasizing themes) to strengthen the narrative—check the "Narrative Reasoning" section in your treatment to understand these choices.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
