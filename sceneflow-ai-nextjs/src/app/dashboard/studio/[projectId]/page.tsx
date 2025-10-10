'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
// Removed Tabs for single-phase view
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/Input";
import { DownloadIcon } from "lucide-react";
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
  const [rigor, setRigor] = useState<'fast'|'balanced'|'thorough'>('balanced')
  const [beatStructure, setBeatStructure] = useState<'three_act'|'save_the_cat'|'heros_journey'|'mini_doc'|'instructional'>(()=>{
    if (format==='documentary' || format==='youtube') return 'mini_doc'
    if (format==='education' || format==='training') return 'instructional'
    return 'three_act'
  })

  // Store last input to enable quick re-generate
  const lastInputRef = React.useRef<string>('')

  // Result: duration-aware beats
  const [beatsView, setBeatsView] = useState<Array<{ title: string; intent?: string; minutes: number }>>([])
  const [estimatedRuntime, setEstimatedRuntime] = useState<number | null>(null)

  const onGenerate = async (text: string, opts?: { persona?: 'Narrator'|'Director'; model?: string; rigor?: 'fast'|'balanced'|'thorough' }) => {
    if (!text?.trim()) return
    try {
      setIsGen(true)
      startProgress()
      lastInputRef.current = text.trim()
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
            character_descriptions: v.character_descriptions
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
          />
          <div className="flex-1 overflow-auto p-3 sm:p-6 pt-4" style={{ scrollMarginTop: 'calc(var(--app-bar-h) + var(--context-bar-h))' }}>
            {/* Duration controls */}
            <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Format</div>
                <Select value={format} onValueChange={(v)=>setFormat(v as any)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select format" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="short_film">Short Film</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Beat Structure</div>
                <Select value={beatStructure} onValueChange={(v)=>setBeatStructure(v as any)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select structure" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="three_act">Three‑Act</SelectItem>
                    <SelectItem value="save_the_cat">Save the Cat</SelectItem>
                    <SelectItem value="heros_journey">Hero’s Journey</SelectItem>
                    <SelectItem value="mini_doc">Mini‑Doc</SelectItem>
                    <SelectItem value="instructional">Instructional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Target Minutes</div>
                <Input type="number" value={targetMinutes} onChange={(e)=> setTargetMinutes(() => {
                  const v = Number(e.target.value); if (!Number.isFinite(v)) return 20; return Math.max(5, Math.min(60, Math.floor(v)))
                })} className="w-full" />
                <div className="text-[11px] text-gray-500 mt-1">Default 10–30; explicit values allowed.</div>
              </div>
              {/* Rigor moved next to Generate in composer */}
            </div>
            <BlueprintComposer onGenerate={onGenerate} rigor={rigor} onChangeRigor={setRigor} />
            <TreatmentCard />
            {/* Beats panel */}
            {beatsView.length > 0 && (
              <div className="mt-6 p-4 rounded border border-gray-800 bg-gray-900/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-semibold text-white">Beats (≈ {estimatedRuntime ?? beatsView.reduce((s,b)=>s + (b.minutes||0),0)} min)</div>
                  <div className="flex items-center gap-2">
                    {[10,15,20,25,30,45,60,90,240].map(m => (
                      <button key={m} type="button" onClick={()=>quickAdjust(m)} className={`text-xs px-2 py-1 rounded border ${m===targetMinutes?'border-blue-500 text-blue-300':'border-gray-700 text-gray-300'} hover:bg-gray-800`}>Adjust to {m}m</button>
                    ))}
                    <button type="button" onClick={()=>quickAdjust(targetMinutes)} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-800">Use {targetMinutes}m</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {beatsView.map((b,i)=> (
                    <div key={`${b.title}-${i}`} className="flex items-start justify-between gap-3 p-2 rounded border border-gray-800 bg-gray-900/40">
                      <div>
                        <div className="text-sm text-white font-medium">{b.title}</div>
                        {b.intent && <div className="text-xs text-gray-400 mt-0.5">{b.intent}</div>}
                      </div>
                      <div className="shrink-0 text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-200 border border-gray-700">{Number(b.minutes||0).toFixed(2)} m</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <a href="/dashboard/workflow/storyboard" className="text-sm text-blue-300 hover:text-blue-200">Go to Vision →</a>
            </div>
          </div>
          <GeneratingOverlay visible={isGen} title="Generating treatment variants…" progress={genProgress} />
        </main>
      </div>
    </div>
  );
}
