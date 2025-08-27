'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/Button";
import { DownloadIcon, Sparkles, Clapperboard, User } from "lucide-react";
import { useGuideStore } from "@/store/useGuideStore";
import { useCue } from "@/store/useCueStore";
// Import Tab Components (placeholders for now)
import { TreatmentTab } from "@/components/studio/TreatmentTab";
import { CharactersTab } from "@/components/studio/CharactersTab";
import { BeatSheetTab } from "@/components/studio/BeatSheetTab";
import { SeriesBiblePanel } from "@/components/studio/SeriesBiblePanel";
import { cn } from "@/lib/utils";

export default function SparkStudioPage() {
  const { guide } = useGuideStore();

  const handleExport = () => {
    console.log("Exporting PDF...");
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-4 sm:p-6 border-b border-gray-800 flex items-center justify-between shadow-md">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {/* Enhanced Logo */}
              <div className="relative">
                <div className="w-12 h-12 bg-sf-surface-light rounded-xl flex items-center justify-center">
                  <div className="w-7 h-7 bg-sf-primary rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-sf-background rounded-sm"></div>
                  </div>
                </div>
                {/* Connector triangle */}
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-3 border-l-sf-primary border-t-3 border-t-transparent border-b-3 border-b-transparent"></div>
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                  <span>SceneFlow </span>
                  <span className="text-sf-primary">AI</span>
                </h1>
              </div>
            </div>
          </div>
          
          {/* Workflow Progress Section */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
                <Sparkles className="w-5 h-5 text-sf-primary" />
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">The Spark Studio</span>
                  <span className="text-xs text-sf-text-secondary">Ideation & Story Development</span>
                </div>
              </div>
              
              {/* Progress Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-sf-primary rounded-full transition-all duration-300" style={{width: '75%'}}></div>
                </div>
                <span className="text-sm font-medium text-sf-primary">75%</span>
              </div>
            </div>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center gap-3">
            {/* User Profile */}
            <div className="flex items-center gap-2 text-sf-text-primary">
              <div className="w-10 h-10 bg-sf-primary rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="hidden sm:inline text-sm font-medium text-white">Demo User</span>
            </div>
            
            <Button 
              onClick={handleExport} 
              className="bg-sf-primary hover:bg-sf-primary-dark text-white border-sf-primary hover:border-sf-primary-dark px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" /> 
              <span className="hidden sm:inline">Export Guide</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {/* The Tabs container needs to manage its own height/overflow */}
          <Tabs defaultValue="beat-sheet" className="w-full h-full flex flex-col">
            <div className="border-b border-gray-700">
              <TabsList className="flex w-full bg-transparent m-0 p-0 h-auto">
                <TabsTrigger value="treatment" className="flex-1 h-12 px-4 text-base font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-gray-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 bg-transparent rounded-none transition-all duration-200">Film Treatment</TabsTrigger>
                <TabsTrigger value="characters" className="flex-1 h-12 px-4 text-base font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-gray-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 bg-transparent rounded-none transition-all duration-200">Character Breakdowns</TabsTrigger>
                <TabsTrigger value="beat-sheet" className="flex-1 h-12 px-4 text-base font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-gray-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 bg-transparent rounded-none transition-all duration-200">Interactive Beat Sheet</TabsTrigger>
                <TabsTrigger value="series-bible" className="flex-1 h-12 px-4 text-base font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-gray-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 bg-transparent rounded-none transition-all duration-200">Series Bible</TabsTrigger>
              </TabsList>
            </div>
            
            {/* TabContent needs overflow-auto to scroll if content is too long */}
            <div className="flex-1 overflow-auto p-3 sm:p-6 pt-4">
                <TabsContent value="treatment"><TreatmentTab /></TabsContent>
                <TabsContent value="characters"><CharactersTab /></TabsContent>
                <TabsContent value="beat-sheet" className="h-full"><BeatSheetTab /></TabsContent>
                <TabsContent value="series-bible"><SeriesBiblePanel /></TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
