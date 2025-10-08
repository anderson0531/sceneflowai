'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
// Removed Tabs for single-phase view
import { Button } from "@/components/ui/Button";
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

  const onGenerate = async (text: string, opts?: { persona?: string; model?: string }) => {
    if (!text?.trim()) return
    try {
      const res = await fetch('/api/ideation/film-treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, variants: 3, provider: 'gemini' })
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
      } else {
        console.error('Generation failed:', json?.message || 'Unknown error')
      }
    } catch (e) {
      console.error('Generate Treatment failed', e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <main className={cn("flex-1 overflow-hidden", "mr-0") }>
          <ContextBar
            title="The Blueprint"
            titleVariant="page"
            emphasis
          />
          <div className="flex-1 overflow-auto p-3 sm:p-6 pt-4" style={{ scrollMarginTop: 'calc(var(--app-bar-h) + var(--context-bar-h))' }}>
            <BlueprintComposer onGenerate={onGenerate} />
            <TreatmentCard />
            <div className="mt-6 flex justify-end">
              <a href="/dashboard/workflow/storyboard" className="text-sm text-blue-300 hover:text-blue-200">Go to Vision →</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
