'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/Button"
import { Sparkles, DownloadIcon, Clapperboard, MessageSquare } from "lucide-react"
import { useCue } from "@/store/useCueStore"

export default function NewProjectPage() {
  const { toggleSidebar } = useCue()
  const [activeTab, setActiveTab] = useState('treatment')

  // Mock generated content - in real implementation, this would come from Cue's response
  const [generatedContent, setGeneratedContent] = useState({
    filmTreatment: `<h1>CRISPR Gene Editing Debate</h1>
<p><strong>Logline:</strong> A compelling video that tackles the profound technological and ethical challenges of CRISPR gene editing through a debate between an optimistic technologist and his cautious, experienced father.</p>
<p><strong>Synopsis:</strong> This video explores the complex intersection of innovation and caution in biotechnology through a personal family dynamic, making the complex subject matter accessible and relatable.</p>
<p><strong>Target Audience:</strong> Science enthusiasts, students, general public interested in biotechnology and ethics</p>
<p><strong>Genre:</strong> Educational/Documentary</p>
<p><strong>Tone:</strong> Thoughtful, balanced, engaging</p>
<p><strong>Duration:</strong> 15-20 minutes</p>
<h2>Story Structure</h2>
<p>The video follows a structured debate format that mirrors the three-act structure of traditional storytelling. Act I establishes the context and introduces the central conflict between technological optimism and ethical caution. Act II explores both perspectives in depth, with each character presenting their case. Act III finds common ground and presents a balanced conclusion.</p>
<h2>Key Themes</h2>
<p>The narrative explores several interconnected themes: the tension between progress and responsibility, the role of family dynamics in complex discussions, the importance of balanced perspectives in scientific advancement, and the need for thoughtful consideration of new technologies.</p>`,
    characterBreakdowns: `<h1>Character Breakdowns</h1>
<h2>Dr. Sarah Chen - The Optimistic Technologist</h2>
<p><strong>Age:</strong> 32</p>
<p><strong>Background:</strong> PhD in Molecular Biology, leading researcher at a cutting-edge biotech startup</p>
<p><strong>Motivation:</strong> Driven by the potential to cure genetic diseases and improve human health</p>
<p><strong>Personality:</strong> Enthusiastic, confident, believes in the power of technology to solve problems</p>
<p><strong>Key Conflict:</strong> Sometimes overlooks ethical implications in pursuit of scientific advancement</p>
<h2>Dr. Robert Chen - The Cautious Father</h2>
<p><strong>Age:</strong> 65</p>
<p><strong>Background:</strong> Retired medical researcher with 30+ years in clinical trials and drug development</p>
<p><strong>Motivation:</strong> Concerned about the long-term consequences and ethical implications of genetic manipulation</p>
<p><strong>Personality:</strong> Thoughtful, experienced, values caution and thorough consideration</p>
<p><strong>Key Conflict:</strong> May be overly cautious and resistant to new approaches</p>`,
    beatSheet: `<h1>Interactive Beat Sheet</h1>
<h2>Act I: The Setup (5-6 minutes)</h2>
<h3>Scene 1: Introduction</h3>
<p><strong>Duration:</strong> 1 minute</p>
<p><strong>Action:</strong> Establish the setting - a modern research laboratory</p>
<p><strong>Dialogue:</strong> Brief overview of CRISPR technology and its potential</p>
<h3>Scene 2: The Challenge</h3>
<p><strong>Duration:</strong> 2 minutes</p>
<p><strong>Action:</strong> Sarah presents her latest breakthrough to her father</p>
<p><strong>Dialogue:</strong> Sarah explains the potential benefits, Robert raises concerns</p>
<h3>Scene 3: The Debate Begins</h3>
<p><strong>Duration:</strong> 2-3 minutes</p>
<p><strong>Action:</strong> Initial exchange of perspectives</p>
<p><strong>Dialogue:</strong> First arguments from both sides</p>
<h2>Act II: The Exploration (8-10 minutes)</h2>
<h3>Scene 4: Sarah's Case</h3>
<p><strong>Duration:</strong> 4-5 minutes</p>
<p><strong>Action:</strong> Sarah presents detailed evidence and examples</p>
<p><strong>Dialogue:</strong> Scientific data, success stories, future possibilities</p>
<h3>Scene 5: Robert's Response</h3>
<p><strong>Duration:</strong> 4-5 minutes</p>
<p><strong>Action:</strong> Robert counters with ethical considerations</p>
<p><strong>Dialogue:</strong> Historical examples, potential risks, moral implications</p>
<h2>Act III: Resolution (2-4 minutes)</h2>
<h3>Scene 6: Finding Common Ground</h3>
<p><strong>Duration:</strong> 2-3 minutes</p>
<p><strong>Action:</strong> Both characters acknowledge valid points</p>
<p><strong>Dialogue:</strong> Compromise and balanced perspective</p>
<h3>Scene 7: Conclusion</h3>
<p><strong>Duration:</strong> 1 minute</p>
<p><strong>Action:</strong> Call to action for thoughtful consideration</p>
<p><strong>Dialogue:</strong> Final thoughts on responsible innovation</p>`
  })

  const handleExport = () => {
    console.log("Exporting project...")
  }

  const handleRefineWithCue = (content: string) => {
    // Open Cue sidebar with the content for refinement
    toggleSidebar()
    // TODO: Pass content to Cue for refinement
  }

  const renderContent = (htmlContent: string) => {
    // Simple HTML rendering without DOM manipulation for SSR compatibility
    const createMarkup = () => ({ __html: htmlContent })
    
    return (
      <div 
        className="prose prose-invert max-w-none"
        dangerouslySetInnerHTML={createMarkup()}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-4 sm:p-6 border-b border-gray-800 flex items-center justify-between shadow-md">
          {/* Page Title */}
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">The Spark Studio</h1>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Ask Cue Button */}
            <Button 
              onClick={toggleSidebar}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Clapperboard className="w-4 h-4" />
              <span className="hidden sm:inline">Ask Cue</span>
            </Button>
            
            <Button 
              onClick={handleExport} 
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" /> 
              <span className="hidden sm:inline">Export Project</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {/* The Tabs container needs to manage its own height/overflow */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
            <div className="border-b border-gray-700">
              <TabsList className="flex w-full bg-transparent m-0 p-0 h-auto">
                <TabsTrigger value="treatment" className="flex-1 h-12 px-4 text-base font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-gray-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 bg-transparent rounded-none transition-all duration-200">Film Treatment</TabsTrigger>
                <TabsTrigger value="characters" className="flex-1 h-12 px-4 text-base font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-gray-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 bg-transparent rounded-none transition-all duration-200">Character Breakdowns</TabsTrigger>
                <TabsTrigger value="beat-sheet" className="flex-1 h-12 px-4 text-base font-semibold text-gray-200 border-b-4 border-transparent hover:text-white hover:border-gray-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:border-blue-500 bg-transparent rounded-none transition-all duration-200">Interactive Beat Sheet</TabsTrigger>
              </TabsList>
            </div>
            
            {/* TabContent needs overflow-auto to scroll if content is too long */}
            <div className="flex-1 overflow-auto p-3 sm:p-6 pt-4">
              <TabsContent value="treatment" className="h-full">
                <div className="py-3 sm:py-6 flex justify-center">
                  <div className="w-full max-w-4xl bg-gray-800 p-4 sm:p-6 lg:p-10 shadow-2xl rounded-lg min-h-[60vh] sm:min-h-[80vh]">
                    {/* Header with AI Refine button */}
                    <div className="flex justify-between items-center mb-6">
                      <h1 className="text-2xl font-bold text-white">Film Treatment</h1>
                      <Button 
                        onClick={() => handleRefineWithCue(generatedContent.filmTreatment)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Refine with Cue
                      </Button>
                    </div>
                    
                    {/* Content Display */}
                    <div className="prose prose-invert max-w-none">
                      {renderContent(generatedContent.filmTreatment)}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="characters" className="h-full">
                <div className="py-3 sm:py-6 flex justify-center">
                  <div className="w-full max-w-4xl bg-gray-800 p-4 sm:p-6 lg:p-10 shadow-2xl rounded-lg min-h-[60vh] sm:min-h-[80vh]">
                    {/* Header with AI Refine button */}
                    <div className="flex justify-between items-center mb-6">
                      <h1 className="text-2xl font-bold text-white">Character Breakdowns</h1>
                      <Button 
                        onClick={() => handleRefineWithCue(generatedContent.characterBreakdowns)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Refine with Cue
                      </Button>
                    </div>
                    
                    {/* Content Display */}
                    <div className="prose prose-invert max-w-none">
                      {renderContent(generatedContent.characterBreakdowns)}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="beat-sheet" className="h-full">
                <div className="py-3 sm:py-6 flex justify-center">
                  <div className="w-full max-w-4xl bg-gray-800 p-4 sm:p-6 lg:p-10 shadow-2xl rounded-lg min-h-[60vh] sm:min-h-[80vh]">
                    {/* Header with AI Refine button */}
                    <div className="flex justify-between items-center mb-6">
                      <h1 className="text-2xl font-bold text-white">Interactive Beat Sheet</h1>
                      <Button 
                        onClick={() => handleRefineWithCue(generatedContent.beatSheet)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Refine with Cue
                      </Button>
                    </div>
                    
                    {/* Content Display */}
                    <div className="prose prose-invert max-w-none">
                      {renderContent(generatedContent.beatSheet)}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
