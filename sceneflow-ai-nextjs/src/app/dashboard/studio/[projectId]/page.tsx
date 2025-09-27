'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/Button";
import { DownloadIcon } from "lucide-react";
import { useGuideStore } from "@/store/useGuideStore";
import { useStore } from '@/store/useStore'
import { useCue } from "@/store/useCueStore";
import ProjectIdeaTab from "@/components/studio/ProjectIdeaTab";
import dynamic from 'next/dynamic';
const ScriptViewer = dynamic(() => import('@/components/studio/ScriptViewer'), { ssr: false });
import { SeriesBiblePanel } from "@/components/studio/SeriesBiblePanel";
import { cn } from "@/lib/utils";

// Client-only components
const OutlineEditor = dynamic(() => import('@/components/studio/OutlineEditor').then(m => m.OutlineEditor), { ssr: false });

export default function SparkStudioPage({ params }: { params: { projectId: string } }) {
  const searchParams = useSearchParams();
  const { guide } = useGuideStore();
  const { invokeCue } = useCue();
  const { currentProject, setCurrentProject, setBeats } = useStore();
  const [isNewProject, setIsNewProject] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'project-idea' | 'outline' | 'script' | 'series-bible'>('project-idea');

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

  // If no acts exist yet but we have a film treatment, generate an outline once
  useEffect(() => {
    const run = async () => {
      if (!guide?.filmTreatment) return
      const hasActs = Array.isArray(currentProject?.metadata?.acts) && currentProject!.metadata!.acts!.length > 0
      if (hasActs) return
      try {
        const resp = await fetch('/api/generate/outline', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ treatment: guide.filmTreatment })
        })
        const data = await resp.json()
        const scenes = data?.scenes || []
        if (Array.isArray(scenes) && scenes.length) {
          setBeats(scenes)
          if (currentProject?.id) {
            const updated = { ...(currentProject.metadata || {}), acts: scenes }
            await fetch('/api/projects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: currentProject.id, metadata: updated }) })
            setCurrentProject({ ...currentProject, metadata: updated })
          }
        }
      } catch {}
    }
    run()
  }, [guide?.filmTreatment, currentProject?.id])

  // Read ?tab= from URL
  useEffect(() => {
    const t = (searchParams?.get('tab') || '').toLowerCase();
    const allowed = ['project-idea', 'outline', 'script', 'series-bible'] as const;
    if (allowed.includes(t as any)) {
      setActiveTab(t as typeof activeTab);
    }
  }, [searchParams]);

  // Auto-unlock next tab when created
  useEffect(() => {
    if (isProjectCreated && activeTab === 'project-idea') {
      setActiveTab('outline');
    }
  }, [isProjectCreated, activeTab]);

  // Programmatic navigation events
  useEffect(() => {
    const toOutline = () => setActiveTab('outline');
    const toScript = () => setActiveTab('script');
    window.addEventListener('studio.goto.beats', toOutline as EventListener);
    window.addEventListener('studio.goto.script', toScript as EventListener);
    return () => {
      window.removeEventListener('studio.goto.beats', toOutline as EventListener);
      window.removeEventListener('studio.goto.script', toScript as EventListener);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <main className={cn("flex-1 overflow-hidden", "mr-0") }>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full h-full flex flex-col">
            <div className="border border-gray-700/50 bg-gray-900/50 rounded-t-lg">
              <TabsList className="flex w-full bg-gradient-to-r from-gray-900/60 to-gray-800/50 m-0 p-0 h-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700/60 scrollbar-track-transparent">
                <TabsTrigger 
                  value="project-idea" 
                  className="flex-shrink-0 h-16 px-5 sm:px-7 text-sm sm:text-lg font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-blue-400/60 hover:bg-gray-800/40 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 data-[state=active]:bg-gray-800/70 bg-transparent rounded-none transition-all duration-200"
                >
                  Film Concept
                </TabsTrigger>
                <TabsTrigger 
                  value="outline"
                  className="flex-shrink-0 h-16 px-5 sm:px-7 text-sm sm:text-lg font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-blue-400/60 hover:bg-gray-800/40 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 data-[state=active]:bg-gray-800/70 bg-transparent rounded-none transition-all duration-200"
                >
                  Scene Outline
                </TabsTrigger>
                <TabsTrigger 
                  value="script"
                  className="flex-shrink-0 h-16 px-5 sm:px-7 text-sm sm:text-lg font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-blue-400/60 hover:bg-gray-800/40 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 data-[state=active]:bg-gray-800/70 bg-transparent rounded-none transition-all duration-200"
                >
                  Film Script
                </TabsTrigger>
                <TabsTrigger 
                  value="series-bible"
                  className="flex-shrink-0 h-16 px-5 sm:px-7 text-sm sm:text-lg font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-blue-400/60 hover:bg-gray-800/40 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 data-[state=active]:bg-gray-800/70 bg-transparent rounded-none transition-all duration-200"
                >
                  Series Bible
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto p-3 sm:p-6 pt-4">
              <TabsContent value="project-idea"><ProjectIdeaTab /></TabsContent>
              <TabsContent value="outline"><OutlineEditor /></TabsContent>
                    <TabsContent value="script">
                      <div className="bg-gray-900/30 rounded-xl p-6 border border-gray-700/50">
                        { (currentProject?.metadata as any)?.fountain ? (
                          <ScriptViewer fountainText={(currentProject?.metadata as any)?.fountain as string} />
                        ) : guide.fullScriptText ? (
                          <ScriptViewer fountainText={guide.fullScriptText} />
                        ) : (
                          <div className="text-gray-400">Generate script from the Scene Outline to view it here.</div>
                        ) }
                      </div>
                    </TabsContent>
              <TabsContent value="series-bible"><SeriesBiblePanel /></TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
