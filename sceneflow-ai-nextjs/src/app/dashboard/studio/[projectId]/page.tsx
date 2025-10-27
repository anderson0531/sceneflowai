'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
// Removed Tabs for single-phase view
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/Input";
import { DownloadIcon, Edit, ChevronUp, Save, Settings, FileText, BarChart3, ChevronRight, Check } from "lucide-react";
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
  const [targetMinutes, setTargetMinutes] = useState<number>(20)
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
      const res = await fetch('/api/ideation/film-treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, variants: 3, provider: 'gemini', format, targetMinutes, rigor: opts?.rigor ?? rigor, beatStructure, persona: opts?.persona })
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
            estimatedDurationMinutes: v.estimatedDurationMinutes  // CRITICAL: Include estimate!
          })))
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

  const quickAdjust = async (mins: number) => {
    const m = Math.max(5, Math.min(60, Math.floor(mins)))
    setTargetMinutes(m)
    if (!lastInputRef.current) return
    await onGenerate(lastInputRef.current)
  }

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
                    <div className="flex items-center gap-3 mb-4">
                      <Settings className="w-5 h-5 text-blue-500" />
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Project Configuration</h3>
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
                      
                      {/* Target Minutes */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                          Target Duration (minutes)
                        </label>
                        <Input 
                          type="number" 
                          value={targetMinutes} 
                          onChange={(e)=> setTargetMinutes(() => {
                            const v = Number(e.target.value)
                            if (!Number.isFinite(v)) return 20
                            return Math.max(5, Math.min(60, Math.floor(v)))
                          })} 
                          className="w-full"
                          min={5}
                          max={60}
                        />
                      </div>
                    </div>
                    
                    {/* Quick Duration Presets */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Quick presets:</span>
                        {[5, 10, 15, 20, 30, 45, 60].map(m => (
                          <button 
                            key={m} 
                            type="button" 
                            onClick={()=>setTargetMinutes(m)} 
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              m===targetMinutes
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-medium' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
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
            
            {/* Beats Panel - Vision style */}
            {beatsView.length > 0 && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Story Beats</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
                    ≈ {estimatedRuntime ?? beatsView.reduce((s,b)=>s + (b.minutes||0),0)} min
                  </span>
                </div>
                
                {/* Duration Adjustment Controls */}
                <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Adjust to:</span>
                    {[10,15,20,25,30,45,60,90,120].map(m => (
                      <button 
                        key={m} 
                        type="button" 
                        onClick={()=>quickAdjust(m)} 
                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                          m===targetMinutes
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Beats List */}
                <div className="space-y-2">
                  {beatsView.map((b,i)=> (
                    <div 
                      key={`${b.title}-${i}`} 
                      className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.title}</div>
                        {b.intent && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.intent}</div>}
                      </div>
                      <div className="shrink-0 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/30">
                        {Number(b.minutes||0).toFixed(1)} min
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
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
          <GeneratingOverlay visible={isGen} title="Generating treatment variants…" progress={genProgress} />
        </main>
      </div>
    </div>
  );
}
