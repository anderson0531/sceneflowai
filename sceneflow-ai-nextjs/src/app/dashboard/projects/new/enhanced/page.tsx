'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ProjectTypeSelector } from '@/components/project/ProjectTypeSelector'
import { ChapterManager } from '@/components/project/ChapterManager'
import { AIStoryGenerator } from '@/components/project/AIStoryGenerator'
import { ArrowLeft, Save, Play, Film, Video, Zap } from 'lucide-react'
import type { ProjectType, StoryStructure, Act, EnhancedProject } from '@/types/SceneFlow'

export default function EnhancedNewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState<'type' | 'details' | 'chapters' | 'review'>('type')
  const [showStoryGenerator, setShowStoryGenerator] = useState(false)
  const [projectData, setProjectData] = useState<Partial<EnhancedProject>>({
    type: null,
    structure: 'three-act',
    title: '',
    description: '',
    genre: '',
    targetRuntime: 0,
    targetAudience: '',
    budget: undefined,
    acts: [],
    globalElements: {
      characters: [],
      locations: [],
      props: [],
      visualStyle: {
        colorPalette: [],
        lighting: '',
        cameraStyle: '',
        editing: '',
        references: []
      },
      tone: '',
      theme: ''
    }
  })

  const handleTypeSelect = (type: ProjectType) => {
    setProjectData(prev => ({ ...prev, type }))
    
    // Auto-generate acts for long projects
    if (type === 'long') {
      const defaultActs: Act[] = [
        {
          id: 'act-1',
          number: 1,
          title: 'Act 1: Setup',
          description: 'Introduce characters, setting, and the inciting incident',
          chapters: [],
          estimatedDuration: 0,
          purpose: 'Setup'
        },
        {
          id: 'act-2',
          number: 2,
          title: 'Act 2: Development',
          description: 'Explore conflicts, character development, and rising action',
          chapters: [],
          estimatedDuration: 0,
          purpose: 'Development'
        },
        {
          id: 'act-3',
          number: 3,
          title: 'Act 3: Resolution',
          description: 'Climax, falling action, and resolution',
          chapters: [],
          estimatedDuration: 0,
          purpose: 'Resolution'
        }
      ]
      setProjectData(prev => ({ ...prev, acts: defaultActs }))
    } else {
      setProjectData(prev => ({ ...prev, acts: [] }))
    }
  }

  const handleStructureSelect = (structure: StoryStructure) => {
    setProjectData(prev => ({ ...prev, structure }))
  }

  const handleActsChange = (acts: Act[]) => {
    setProjectData(prev => ({ ...prev, acts }))
  }

  const handleStoryGenerated = (acts: Act[]) => {
    setProjectData(prev => ({ ...prev, acts }))
  }

  const canProceed = () => {
    switch (step) {
      case 'type':
        return projectData.type !== null
      case 'details':
        return projectData.title && projectData.genre && projectData.targetRuntime > 0
      case 'chapters':
        return projectData.type !== 'long' || projectData.acts.some(act => act.chapters.length > 0)
      default:
        return true
    }
  }

  const nextStep = () => {
    if (step === 'type') setStep('details')
    else if (step === 'details') setStep('chapters')
    else if (step === 'chapters') setStep('review')
  }

  const prevStep = () => {
    if (step === 'details') setStep('type')
    else if (step === 'chapters') setStep('details')
    else if (step === 'review') setStep('chapters')
  }

  const createProject = async () => {
    // Here you would save the project to your database
    console.log('Creating project:', projectData)
    
    // For now, just redirect to the dashboard
    router.push('/dashboard')
  }

  const getStepIcon = () => {
    switch (projectData.type) {
      case 'short':
        return <Zap className="w-6 h-6" />
      case 'medium':
        return <Video className="w-6 h-6" />
      case 'long':
        return <Film className="w-6 h-6" />
      default:
        return <Film className="w-6 h-6" />
    }
  }

  return (
    <div className="min-h-screen bg-sf-background">
      {/* Header */}
      <div className="border-b border-sf-border bg-sf-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-sf-text-secondary hover:text-sf-text-primary"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-3">
                {getStepIcon()}
                <div>
                  <h1 className="text-xl font-bold text-sf-text-primary">Create New Project</h1>
                  <p className="text-sm text-sf-text-secondary">
                    {projectData.type ? `Building a ${projectData.type} video project` : 'Choose your project type'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-sf-border bg-sf-surface-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-center space-x-8">
              {[
                { id: 'type', label: 'Project Type', icon: '🎯' },
                { id: 'details', label: 'Project Details', icon: '📝' },
                { id: 'chapters', label: 'Structure', icon: '🏗️' },
                { id: 'review', label: 'Review', icon: '✅' }
              ].map((stepItem, index) => (
                <div key={stepItem.id} className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    step === stepItem.id 
                      ? 'bg-sf-primary text-sf-background' 
                      : index < ['type', 'details', 'chapters', 'review'].indexOf(step)
                        ? 'bg-green-500 text-white'
                        : 'bg-sf-surface border border-sf-border text-sf-text-secondary'
                  }`}>
                    {index < ['type', 'details', 'chapters', 'review'].indexOf(step) ? '✓' : stepItem.icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    step === stepItem.id ? 'text-sf-text-primary' : 'text-sf-text-secondary'
                  }`}>
                    {stepItem.label}
                  </span>
                  {index < 3 && (
                    <div className={`w-16 h-0.5 ${
                      index < ['type', 'details', 'chapters', 'review'].indexOf(step) ? 'bg-green-500' : 'bg-sf-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Project Type */}
        {step === 'type' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-sf-text-primary mb-4">What are you creating today?</h2>
              <p className="text-lg text-sf-text-secondary">
                Choose the type of video project that best fits your creative vision
              </p>
            </div>
            
            <ProjectTypeSelector
              selectedType={projectData.type}
              onTypeSelect={handleTypeSelect}
              selectedStructure={projectData.structure}
              onStructureSelect={handleStructureSelect}
              showStructureSelector={projectData.type === 'long'}
            />
          </div>
        )}

        {/* Step 2: Project Details */}
        {step === 'details' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-sf-text-primary mb-4">Tell us about your project</h2>
              <p className="text-lg text-sf-text-secondary">
                Fill in the essential details to get started
              </p>
            </div>

            <Card className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-sf-text-primary mb-2">Project Title</label>
                  <Input
                    value={projectData.title}
                    onChange={(e) => setProjectData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter your project title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-sf-text-primary mb-2">Genre</label>
                  <Input
                    value={projectData.genre}
                    onChange={(e) => setProjectData(prev => ({ ...prev, genre: e.target.value }))}
                    placeholder="e.g., Drama, Comedy, Documentary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-sf-text-primary mb-2">
                    Target Runtime ({projectData.type === 'short' ? 'minutes' : projectData.type === 'medium' ? 'minutes' : 'minutes'})
                  </label>
                  <Input
                    type="number"
                    value={projectData.targetRuntime || ''}
                    onChange={(e) => setProjectData(prev => ({ ...prev, targetRuntime: parseInt(e.target.value) || 0 }))}
                    placeholder={projectData.type === 'short' ? '1-5' : projectData.type === 'medium' ? '5-20' : '20+'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-sf-text-primary mb-2">Target Audience</label>
                  <Input
                    value={projectData.targetAudience}
                    onChange={(e) => setProjectData(prev => ({ ...prev, targetAudience: e.target.value }))}
                    placeholder="e.g., Young adults, Professionals, Students"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-sf-text-primary mb-2">Description</label>
                  <textarea
                    value={projectData.description}
                    onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your project concept, goals, and vision..."
                    className="w-full p-3 border border-sf-border rounded-lg bg-sf-surface-light text-sf-text-primary placeholder-sf-text-secondary resize-none"
                    rows={4}
                  />
                </div>

                {projectData.type === 'long' && (
                  <div>
                    <label className="block text-sm font-medium text-sf-text-primary mb-2">Budget (optional)</label>
                    <Input
                      type="number"
                      value={projectData.budget || ''}
                      onChange={(e) => setProjectData(prev => ({ ...prev, budget: parseInt(e.target.value) || undefined }))}
                      placeholder="Estimated budget in USD"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Step 3: Chapter Structure (for long projects) */}
        {step === 'chapters' && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-sf-text-primary mb-4">Plan Your Story Structure</h2>
              <p className="text-lg text-sf-text-secondary">
                {projectData.type === 'long' 
                  ? 'Organize your story into acts and chapters for better planning and execution'
                  : 'Your project structure will be automatically organized'
                }
              </p>
            </div>

            {projectData.type === 'long' ? (
              <>
                <div className="flex items-center justify-end mb-4">
                  <Button
                    variant="secondary"
                    onClick={() => setShowStoryGenerator(true)}
                  >
                    <span className="mr-2">✨</span>
                    Generate story from idea
                  </Button>
                </div>
                <ChapterManager
                  projectType={projectData.type}
                  acts={projectData.acts || []}
                  onActsChange={handleActsChange}
                />
              </>
            ) : (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sf-primary/20 flex items-center justify-center">
                  {projectData.type === 'short' ? <Zap className="w-8 h-8 text-sf-primary" /> : <Video className="w-8 h-8 text-sf-primary" />}
                </div>
                <h3 className="text-lg font-semibold text-sf-text-primary mb-2">
                  {projectData.type === 'short' ? 'Short Video Structure' : 'Medium Video Structure'}
                </h3>
                <p className="text-sf-text-secondary">
                  {projectData.type === 'short' 
                    ? 'Short videos use a simple linear structure that we\'ll help you plan automatically.'
                    : 'Medium videos follow a streamlined narrative structure that we\'ll optimize for you.'
                  }
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-sf-text-primary mb-4">Review Your Project</h2>
              <p className="text-lg text-sf-text-secondary">
                Double-check everything before we create your project
              </p>
            </div>

            <Card className="p-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-sf-text-secondary mb-2">Project Type</h4>
                    <p className="text-sf-text-primary capitalize">{projectData.type}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-sf-text-secondary mb-2">Title</h4>
                    <p className="text-sf-text-primary">{projectData.title}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-sf-text-secondary mb-2">Genre</h4>
                    <p className="text-sf-text-primary">{projectData.genre}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-sf-text-secondary mb-2">Runtime</h4>
                    <p className="text-sf-text-primary">{projectData.targetRuntime} minutes</p>
                  </div>
                </div>

                {projectData.description && (
                  <div>
                    <h4 className="text-sm font-medium text-sf-text-secondary mb-2">Description</h4>
                    <p className="text-sf-text-primary">{projectData.description}</p>
                  </div>
                )}

                {projectData.type === 'long' && (
                  <div>
                    <h4 className="text-sm font-medium text-sf-text-secondary mb-2">Story Structure</h4>
                    <p className="text-sf-text-primary capitalize">{projectData.structure?.replace('-', ' ')}</p>
                    <div className="mt-2">
                      <p className="text-sm text-sf-text-secondary">
                        {projectData.acts?.length || 0} acts, {projectData.acts?.reduce((total, act) => total + act.chapters.length, 0) || 0} chapters
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 'type'}
            className="text-sf-text-secondary hover:text-sf-text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center space-x-4">
            {step === 'review' ? (
              <Button
                onClick={createProject}
                className="bg-sf-primary hover:shadow-sf-glow"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="bg-sf-primary hover:shadow-sf-glow"
                size="lg"
              >
                Next
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* AI Story Generator Modal */}
      {showStoryGenerator && projectData.type && (
        <AIStoryGenerator
          projectType={projectData.type}
          onStoryGenerated={handleStoryGenerated}
          onClose={() => setShowStoryGenerator(false)}
        />
      )}
    </div>
  )
}
