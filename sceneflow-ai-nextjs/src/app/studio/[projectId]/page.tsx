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
  const { toggleSidebar } = useCue();

  const handleExport = () => {
    console.log("Exporting PDF...");
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-4 sm:p-6 border-b border-gray-800 flex items-center justify-between shadow-md">
          {/* Page Title */}
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-sf-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">The Spark Studio</h1>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Ask Cue Button */}
            <Button 
              onClick={toggleSidebar}
              className="bg-sf-primary-dark hover:bg-blue-700 text-white border-sf-primary-dark hover:border-blue-700 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Clapperboard className="w-4 h-4" />
              <span className="hidden sm:inline">Ask Cue</span>
            </Button>
            
            <Button 
              onClick={handleExport} 
              className="bg-sf-primary-dark hover:bg-blue-700 text-white border-sf-primary-dark hover:border-blue-700 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
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
