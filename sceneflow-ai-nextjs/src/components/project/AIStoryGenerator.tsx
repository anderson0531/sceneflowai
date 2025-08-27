'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { 
  Sparkles, 
  Lightbulb, 
  Film, 
  Video, 
  Zap, 
  RefreshCw, 
  CheckCircle2,
  ArrowRight,
  Play,
  Target,
  Users,
  BookOpen
} from 'lucide-react'
import type { ProjectType, StoryStructure, Act, Chapter } from '@/types/SceneFlow'

interface AIStoryGeneratorProps {
  projectType: ProjectType
  onStoryGenerated: (acts: Act[]) => void
  onClose: () => void
}

interface StoryVariant {
  id: string
  title: string
  logline: string
  acts: Act[]
  genre: string
  tone: string
  targetAudience: string
  estimatedRuntime: number
}

export function AIStoryGenerator({
  projectType,
  onStoryGenerated,
  onClose
}: AIStoryGeneratorProps) {
  const [creativeIdea, setCreativeIdea] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVariants, setGeneratedVariants] = useState<StoryVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)

  const generateStory = async () => {
    if (!creativeIdea.trim()) return

    setIsGenerating(true)
    setGenerationProgress(0)
    setGeneratedVariants([])

    // Simulate AI generation progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 10
      })
    }, 200)

    try {
      // Generate story variants based on project type
      const variants = await generateStoryVariants(creativeIdea, projectType)
      setGeneratedVariants(variants)
      setSelectedVariant(variants[0]?.id || null)
    } catch (error) {
      console.error('Failed to generate story:', error)
      // Fallback to generated variants
      const fallbackVariants = generateFallbackVariants(creativeIdea, projectType)
      setGeneratedVariants(fallbackVariants)
      setSelectedVariant(fallbackVariants[0]?.id || null)
    } finally {
      setIsGenerating(false)
      setGenerationProgress(100)
      clearInterval(progressInterval)
    }
  }

  const generateStoryVariants = async (idea: string, type: ProjectType): Promise<StoryVariant[]> => {
    // This would call your AI API in production
    // For now, we'll generate structured variants locally
    
    const baseStructure = type === 'long' ? 'three-act' : 'linear'
    const runtime = type === 'short' ? 3 : type === 'medium' ? 12 : 90
    
    return [
      {
        id: 'variant-1',
        title: `The ${idea.split(' ')[0]} Journey`,
        logline: `A compelling exploration of ${idea} that challenges assumptions and reveals unexpected truths.`,
        genre: 'Documentary/Drama',
        tone: 'Thoughtful and engaging',
        targetAudience: 'Curious minds and industry professionals',
        estimatedRuntime: runtime,
        acts: generateActsForType(idea, type, 'variant-1')
      },
      {
        id: 'variant-2',
        title: `Beyond ${idea.split(' ')[0]}`,
        logline: `An innovative take on ${idea} that pushes boundaries and explores new possibilities.`,
        genre: 'Innovation/Inspiration',
        tone: 'Optimistic and forward-thinking',
        targetAudience: 'Visionaries and change-makers',
        estimatedRuntime: runtime,
        acts: generateActsForType(idea, type, 'variant-2')
      },
      {
        id: 'variant-3',
        title: `${idea.split(' ')[0]} Uncovered`,
        logline: `A deep dive into the hidden aspects of ${idea} that most people never see.`,
        genre: 'Investigation/Revelation',
        tone: 'Intriguing and revealing',
        targetAudience: 'Detail-oriented viewers and experts',
        estimatedRuntime: runtime,
        acts: generateActsForType(idea, type, 'variant-3')
      }
    ]
  }

  const generateFallbackVariants = (idea: string, type: ProjectType): StoryVariant[] => {
    const runtime = type === 'short' ? 3 : type === 'medium' ? 12 : 90
    
    return [
      {
        id: 'fallback-1',
        title: `The ${idea.split(' ')[0]} Story`,
        logline: `A comprehensive exploration of ${idea} that educates and inspires.`,
        genre: 'Educational/Inspirational',
        tone: 'Informative and engaging',
        targetAudience: 'General audience',
        estimatedRuntime: runtime,
        acts: generateActsForType(idea, type, 'fallback-1')
      }
    ]
  }

  const generateActsForType = (idea: string, type: ProjectType, variantId: string): Act[] => {
    if (type === 'short') {
      return [
        {
          id: `act-1-${variantId}`,
          number: 1,
          title: 'The Hook',
          description: `Introduce ${idea} with a compelling opening that grabs attention`,
          chapters: [
            {
              id: `chapter-1-${variantId}`,
              title: 'Opening Impact',
              act: 1,
              order: 1,
              description: 'Start with a powerful statement or question about the topic',
              estimatedDuration: 1,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            },
            {
              id: `chapter-2-${variantId}`,
              title: 'Core Message',
              act: 1,
              order: 2,
              description: 'Present the main idea or argument clearly',
              estimatedDuration: 1.5,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            },
            {
              id: `chapter-3-${variantId}`,
              title: 'Call to Action',
              act: 1,
              order: 3,
              description: 'End with a compelling call to action or thought-provoking conclusion',
              estimatedDuration: 0.5,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            }
          ],
          estimatedDuration: 3,
          purpose: 'Complete Story'
        }
      ]
    } else if (type === 'medium') {
      return [
        {
          id: `act-1-${variantId}`,
          number: 1,
          title: 'Setup & Introduction',
          description: `Establish context and introduce ${idea} to the audience`,
          chapters: [
            {
              id: `chapter-1-${variantId}`,
              title: 'The Hook',
              act: 1,
              order: 1,
              description: 'Grab attention with a compelling opening',
              estimatedDuration: 2,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            },
            {
              id: `chapter-2-${variantId}`,
              title: 'Context & Background',
              act: 1,
              order: 2,
              description: 'Provide necessary background information',
              estimatedDuration: 3,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            },
            {
              id: `chapter-3-${variantId}`,
              title: 'The Challenge',
              act: 1,
              order: 3,
              description: 'Present the main problem or question',
              estimatedDuration: 2,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            }
          ],
          estimatedDuration: 7,
          purpose: 'Setup'
        },
        {
          id: `act-2-${variantId}`,
          number: 2,
          title: 'Development & Exploration',
          description: `Deep dive into ${idea} with examples and analysis`,
          chapters: [
            {
              id: `chapter-4-${variantId}`,
              title: 'Deep Dive',
              act: 2,
              order: 1,
              description: 'Explore the topic in detail with examples',
              estimatedDuration: 3,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            },
            {
              id: `chapter-5-${variantId}`,
              title: 'Resolution',
              act: 2,
              order: 2,
              description: 'Present solutions or conclusions',
              estimatedDuration: 2,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            }
          ],
          estimatedDuration: 5,
          purpose: 'Development'
        }
      ]
    } else {
      // Long form - three act structure
      return [
        {
          id: `act-1-${variantId}`,
          number: 1,
          title: 'Act 1: The Setup',
          description: `Introduce the world of ${idea} and establish the foundation`,
          chapters: [
            {
              id: `chapter-1-${variantId}`,
              title: 'Opening & Hook',
              act: 1,
              order: 1,
              description: 'Compelling opening that establishes the premise',
              estimatedDuration: 8,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            },
            {
              id: `chapter-2-${variantId}`,
              title: 'World Building',
              act: 1,
              order: 2,
              description: 'Establish the context and rules of the world',
              estimatedDuration: 12,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            },
            {
              id: `chapter-3-${variantId}`,
              title: 'Inciting Incident',
              act: 1,
              order: 3,
              description: 'The event that sets the story in motion',
              estimatedDuration: 10,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            }
          ],
          estimatedDuration: 30,
          purpose: 'Setup'
        },
        {
          id: `act-2-${variantId}`,
          number: 2,
          title: 'Act 2: The Journey',
          description: `Explore the complexities and challenges of ${idea}`,
          chapters: [
            {
              id: `chapter-4-${variantId}`,
              title: 'Rising Action',
              act: 2,
              order: 1,
              description: 'Build tension and explore complications',
              estimatedDuration: 20,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            },
            {
              id: `chapter-5-${variantId}`,
              title: 'Midpoint Twist',
              act: 2,
              order: 2,
              description: 'A revelation that changes everything',
              estimatedDuration: 15,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            },
            {
              id: `chapter-6-${variantId}`,
              title: 'Crisis Point',
              act: 2,
              order: 3,
              description: 'The lowest point and greatest challenge',
              estimatedDuration: 20,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            }
          ],
          estimatedDuration: 55,
          purpose: 'Development'
        },
        {
          id: `act-3-${variantId}`,
          number: 3,
          title: 'Act 3: The Resolution',
          description: `Bring the story of ${idea} to its conclusion`,
          chapters: [
            {
              id: `chapter-7-${variantId}`,
              title: 'Climax',
              act: 3,
              order: 1,
              description: 'The ultimate confrontation or revelation',
              estimatedDuration: 15,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            },
            {
              id: `chapter-8-${variantId}`,
              title: 'Resolution',
              act: 3,
              order: 2,
              description: 'Tie up loose ends and show the new normal',
              estimatedDuration: 10,
              status: 'planned',
              progress: { ideation: 0, storyboard: 0, direction: 0, video: 0 },
              content: {},
              metadata: {}
            }
          ],
          estimatedDuration: 25,
          purpose: 'Resolution'
        }
      ]
    }
  }

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariant(variantId)
  }

  const handleUseStory = () => {
    if (selectedVariant) {
      const variant = generatedVariants.find(v => v.id === selectedVariant)
      if (variant) {
        onStoryGenerated(variant.acts)
        onClose()
      }
    }
  }

  const getProjectTypeIcon = () => {
    switch (projectType) {
      case 'short':
        return <Zap className="w-6 h-6 text-yellow-400" />
      case 'medium':
        return <Video className="w-6 h-6 text-blue-400" />
      case 'long':
        return <Film className="w-6 h-6 text-orange-400" />
      default:
        return <Lightbulb className="w-6 h-6 text-sf-primary" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-sf-background rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-sf-surface border-b border-sf-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-sf-primary/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-sf-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-sf-text-primary">AI Story Generator</h2>
                <p className="text-sf-text-secondary">Transform your idea into a complete story structure</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose} size="sm">
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!isGenerating && generatedVariants.length === 0 ? (
            /* Input Phase */
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-sf-gradient rounded-full flex items-center justify-center">
                  {getProjectTypeIcon()}
                </div>
                <h3 className="text-xl font-semibold text-sf-text-primary mb-2">
                  Start with Your Creative Spark
                </h3>
                <p className="text-sf-text-secondary">
                  Describe your idea, concept, or topic, and AI will generate a complete story structure
                </p>
              </div>

              <Card className="p-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-sf-text-primary">
                    What's your creative idea?
                  </label>
                  <textarea
                    value={creativeIdea}
                    onChange={(e) => setCreativeIdea(e.target.value)}
                    placeholder="e.g., 'The future of artificial intelligence', 'Climate change solutions', 'A day in the life of a startup founder', 'The psychology of decision making'..."
                    className="w-full p-4 border border-sf-border rounded-lg bg-sf-surface-light text-sf-text-primary placeholder-sf-text-secondary resize-none"
                    rows={4}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-sf-text-secondary">
                      {projectType === 'short' && 'Perfect for social media and quick concepts'}
                      {projectType === 'medium' && 'Great for educational content and detailed exploration'}
                      {projectType === 'long' && 'Ideal for documentaries and feature-length content'}
                    </div>
                    <Button
                      onClick={generateStory}
                      disabled={!creativeIdea.trim()}
                      className="bg-sf-primary hover:shadow-sf-glow"
                      size="lg"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Story
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Examples */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-sf-surface-light border-dashed border-sf-border">
                  <div className="text-center">
                    <Lightbulb className="w-8 h-8 text-sf-accent mx-auto mb-2" />
                    <h4 className="text-sm font-medium text-sf-text-primary mb-1">Concept</h4>
                    <p className="text-xs text-sf-text-secondary">"The future of renewable energy"</p>
                  </div>
                </Card>
                <Card className="p-4 bg-sf-surface-light border-dashed border-sf-border">
                  <div className="text-center">
                    <Target className="w-8 h-8 text-sf-accent mx-auto mb-2" />
                    <h4 className="text-sm font-medium text-sf-text-primary mb-1">Question</h4>
                    <p className="text-xs text-sf-text-secondary">"How do we solve food insecurity?"</p>
                  </div>
                </Card>
                <Card className="p-4 bg-sf-surface-light border-dashed border-sf-border">
                  <div className="text-center">
                    <Users className="w-8 h-8 text-sf-accent mx-auto mb-2" />
                    <h4 className="text-sm font-medium text-sf-text-primary mb-1">Story</h4>
                    <p className="text-xs text-sf-text-secondary">"A day in the life of a nurse"</p>
                  </div>
                </Card>
              </div>
            </div>
          ) : isGenerating ? (
            /* Generation Phase */
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-sf-primary/20 rounded-full flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-sf-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-sf-text-primary mb-2">
                  Crafting Your Story
                </h3>
                <p className="text-sf-text-secondary">
                  AI is analyzing your idea and generating multiple story structures...
                </p>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-sf-surface-light rounded-full h-3">
                <div 
                  className="bg-sf-primary h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <p className="text-sm text-sf-text-secondary">{generationProgress}% complete</p>
            </div>
          ) : (
            /* Results Phase */
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-sf-text-primary mb-2">
                  Your Story Variants
                </h3>
                <p className="text-sf-text-secondary">
                  Choose the story structure that best fits your vision
                </p>
              </div>

              {/* Story Variants */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {generatedVariants.map((variant) => (
                  <Card
                    key={variant.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedVariant === variant.id 
                        ? 'ring-2 ring-sf-primary bg-sf-primary/5' 
                        : 'hover:ring-2 hover:ring-sf-primary/30'
                    }`}
                    onClick={() => handleVariantSelect(variant.id)}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-sf-text-primary">{variant.title}</h4>
                        {selectedVariant === variant.id && (
                          <CheckCircle2 className="w-5 h-5 text-sf-primary" />
                        )}
                      </div>
                      
                      <p className="text-sm text-sf-text-secondary mb-4">{variant.logline}</p>
                      
                      <div className="space-y-2 text-xs text-sf-text-secondary">
                        <div className="flex items-center justify-between">
                          <span>Genre:</span>
                          <span className="text-sf-text-primary">{variant.genre}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Tone:</span>
                          <span className="text-sf-text-primary">{variant.tone}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Runtime:</span>
                          <span className="text-sf-primary">{variant.estimatedRuntime}m</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Acts:</span>
                          <span className="text-sf-accent">{variant.acts.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Chapters:</span>
                          <span className="text-sf-accent">
                            {variant.acts.reduce((total, act) => total + act.chapters.length, 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Story Structure Preview */}
              {selectedVariant && (
                <Card className="p-6">
                  <h4 className="text-lg font-semibold text-sf-text-primary mb-4">
                    Story Structure Preview
                  </h4>
                  <div className="space-y-4">
                    {generatedVariants
                      .find(v => v.id === selectedVariant)
                      ?.acts.map((act) => (
                        <div key={act.id} className="border-l-4 border-sf-primary pl-4">
                          <h5 className="font-medium text-sf-text-primary mb-2">{act.title}</h5>
                          <p className="text-sm text-sf-text-secondary mb-2">{act.description}</p>
                          <div className="space-y-1">
                            {act.chapters.map((chapter) => (
                              <div key={chapter.id} className="flex items-center justify-between text-xs">
                                <span className="text-sf-text-secondary">{chapter.title}</span>
                                <span className="text-sf-accent">{chapter.estimatedDuration}m</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setGeneratedVariants([])
                    setSelectedVariant(null)
                  }}
                  className="text-sf-text-secondary hover:text-sf-text-primary"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New Variants
                </Button>
                
                <div className="flex items-center space-x-3">
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUseStory}
                    disabled={!selectedVariant}
                    className="bg-sf-primary hover:shadow-sf-glow"
                    size="lg"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Use This Story
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
