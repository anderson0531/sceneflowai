'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/Button";
import { DownloadIcon, Sparkles, Clapperboard, User, Lock } from "lucide-react";
import { useGuideStore } from "@/store/useGuideStore";
import { useCue } from "@/store/useCueStore";
// Import Tab Components (placeholders for now)
import ProjectIdeaTab from "@/components/studio/ProjectIdeaTab";
import { TreatmentTab } from "@/components/studio/TreatmentTab";
// Characters and Beat Sheet removed in favor of Outline
import { SeriesBiblePanel } from "@/components/studio/SeriesBiblePanel";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';

// Load Flow sidebar on client only to avoid hydration errors
const FlowSidebar = dynamic(() => import('@/components/cue/CueSidebar').then(m => m.CueSidebar), { ssr: false });

export default function SparkStudioPage({ params }: { params: { projectId: string } }) {
  const { guide } = useGuideStore();
  const { toggleSidebar, invokeCue, isSidebarOpen } = useCue();
  const [isNewProject, setIsNewProject] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'project-idea' | 'treatment' | 'series-bible'>('project-idea');
  
  // Check if project has been created (has content beyond basic initialization)
  const isProjectCreated = guide.filmTreatment && guide.filmTreatment.trim() !== '' && 
                          guide.title && guide.title !== 'Untitled Project';

  const handleExport = () => {
    console.log("Exporting PDF...");
  };

  // Check if this is a new project and initialize with Cue
  useEffect(() => {
    if (params.projectId.startsWith('new-project') && !isNewProject) {
      setIsNewProject(true);
      setIsInitializing(true);
      
      // Check if we already have content in the store
      if (guide.filmTreatment && guide.filmTreatment.trim() !== '') {
        console.log('🎯 Studio: Found existing content in store, skipping re-initialization');
        setIsInitializing(false);
      } else {
        console.log('🎯 Studio: No existing content, initializing with Cue');
        // Trigger Cue to generate initial story content
        invokeCue({
          type: 'text',
          content: `Initialize new project "${params.projectId}" with baseline Film Treatment, Character Breakdowns, and Interactive Beat Sheet following the No Blank Canvas principle. Generate comprehensive content for a new video project.`
        });
        
        // Set initialization complete after a delay
        setTimeout(() => {
          setIsInitializing(false);
        }, 2000);
      }
    }
  }, [params.projectId, isNewProject, invokeCue, guide.filmTreatment]);

  // Auto-switch to Treatment when project content exists
  useEffect(() => {
    const isCreated = guide.filmTreatment && guide.filmTreatment.trim() !== '' && guide.title && guide.title !== 'Untitled Project';
    if (isCreated && activeTab === 'project-idea') {
      setActiveTab('treatment');
    }
  }, [guide.filmTreatment, guide.title, activeTab]);

  // Listen for programmatic navigation events from tabs/components
  useEffect(() => {
    const toTreatment = () => setActiveTab('treatment');
    const toCharacters = () => setActiveTab('characters');
    const toBeatSheet = () => setActiveTab('beat-sheet');
    window.addEventListener('studio.goto.treatment', toTreatment as EventListener);
    window.addEventListener('studio.goto.characters', toCharacters as EventListener);
    window.addEventListener('studio.goto.beats', toBeatSheet as EventListener);
    return () => {
      window.removeEventListener('studio.goto.treatment', toTreatment as EventListener);
      window.removeEventListener('studio.goto.characters', toCharacters as EventListener);
      window.removeEventListener('studio.goto.beats', toBeatSheet as EventListener);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="studio-header px-4 sm:px-6 lg:px-8 py-5 border-b border-gray-800 grid grid-cols-3 items-center shadow-md">
          {/* Left spacer to allow perfect centering */}
          <div className="hidden sm:block" />

          {/* Centered Page Title removed per request (global header shows context) */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-center min-w-0" />

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <Button 
              onClick={handleExport} 
              className="bg-sf-primary-dark hover:bg-blue-700 text-white border-sf-primary-dark hover:border-blue-700 px-4 py-3 rounded-lg text-base font-medium flex items-center gap-2"
            >
              <DownloadIcon className="w-5 h-5" /> 
              <span className="hidden md:inline">Export Guide</span>
            </Button>
          </div>
        </header>

        <main className={cn("flex-1 overflow-hidden", "mr-0") }>
          {/* The Tabs container needs to manage its own height/overflow */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full h-full flex flex-col">
            <div className="border border-gray-700/50 bg-gray-900/50 rounded-t-lg">
              <TabsList className="flex w-full bg-gradient-to-r from-gray-900/60 to-gray-800/50 m-0 p-0 h-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700/60 scrollbar-track-transparent">
                <TabsTrigger 
                  value="project-idea" 
                  disabled={false}
                  className="flex-shrink-0 h-16 px-5 sm:px-7 text-sm sm:text-lg font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-blue-400/60 hover:bg-gray-800/40 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 data-[state=active]:bg-gray-800/70 bg-transparent rounded-none transition-all duration-200"
                >
                  Film Concept
                </TabsTrigger>
                <TabsTrigger 
                  value="treatment" 
                  disabled={!isProjectCreated}
                  className={`flex-shrink-0 h-16 px-5 sm:px-7 text-sm sm:text-lg font-semibold border-b-4 border-transparent transition-all duration-200 ${
                    isProjectCreated 
                      ? 'text-gray-200 hover:text-white hover:border-blue-400/60 hover:bg-gray-800/40 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 data-[state=active]:bg-gray-800/70 bg-transparent rounded-none' 
                      : 'text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                  title={!isProjectCreated ? "Complete Project Idea first to unlock this tab" : ""}
                >
                  {!isProjectCreated && <Lock className="w-4 h-4 mr-2 inline" />}
                  Film Treatment
                </TabsTrigger>
                <TabsTrigger 
                  value="series-bible" 
                  disabled={!isProjectCreated}
                  className={`flex-shrink-0 h-16 px-5 sm:px-7 text-sm sm:text-lg font-semibold border-b-4 border-transparent transition-all duration-200 ${
                    isProjectCreated 
                      ? 'text-gray-200 hover:text-white hover:border-blue-400/60 hover:bg-gray-800/40 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 data-[state=active]:bg-gray-800/70 bg-transparent rounded-none' 
                      : 'text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                  title={!isProjectCreated ? "Complete Project Idea first to unlock this tab" : ""}
                >
                  {!isProjectCreated && <Lock className="w-4 h-4 mr-2 inline" />}
                  Series Bible
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* TabContent needs overflow-auto to scroll if content is too long */}
            <div className="flex-1 overflow-auto p-3 sm:p-6 pt-4">
                <TabsContent value="project-idea"><ProjectIdeaTab /></TabsContent>
                <TabsContent value="treatment"><TreatmentTab /></TabsContent>
                <TabsContent value="series-bible"><SeriesBiblePanel /></TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
