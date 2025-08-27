'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Sparkles,
  ArrowLeft,
  Play
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamically import CueChat to avoid SSR issues
const CueChat = dynamic(() => import('@/components/chat/CueChat'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-sf-surface-light border border-sf-border rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-sf-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sf-text-secondary">Loading Cue Assistant...</p>
      </div>
    </div>
  )
})

export default function NewProjectPage() {
  const [selectedConcept, setSelectedConcept] = useState<any>(null)
  const [showCueChat, setShowCueChat] = useState(true)

  const handleStartProject = () => {
    if (!selectedConcept) return
    
    // Here you would typically create the project and navigate to the next step
    console.log('Starting project with concept:', selectedConcept)
    // For now, just show a success message
    alert('Project created successfully! This would navigate to the next workflow step.')
  }

  return (
    <div className="min-h-screen bg-sf-background">
      {/* Header */}
      <div className="border-b border-sf-border bg-sf-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/projects"
                className="flex items-center text-sf-text-secondary hover:text-sf-text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Link>
            </div>
            <div className="text-right">
              <p className="text-sm text-sf-text-secondary">
                Let AI guide you through the creative process.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center space-y-6 py-8">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <Sparkles className="w-8 h-8 text-sf-primary" />
            <h1 className="text-4xl font-bold text-sf-text-primary">The Spark Studio</h1>
          </div>
          <p className="text-xl text-sf-text-secondary max-w-3xl mx-auto">
            Start a conversation with Cue to transform your ideas into compelling video projects.
            From initial concept to final refinement, Cue guides you through every step.
          </p>
        </div>

        {/* Cue AI Assistant - The Main Interface */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-sf-text-primary mb-3">Cue - AI Assistant</h2>
            <p className="text-base text-sf-text-secondary leading-relaxed">
              Begin by telling Cue about your video idea. Cue will help you develop concepts, refine your vision, and prepare to start your project.
            </p>
          </div>
          
          <div className="h-[600px] bg-sf-surface-light border border-sf-border rounded-xl p-6">
            <CueChat
              concept={selectedConcept}
              onRefinementComplete={(refinedConcept: any) => {
                console.log('Refined concept:', refinedConcept)
                setSelectedConcept(refinedConcept)
              }}
            />
          </div>

          {/* Start Project Button - Only show when concept is refined */}
          {selectedConcept && (
            <div className="text-center">
              <Button
                onClick={handleStartProject}
                size="lg"
                className="px-8 text-base"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Project
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
