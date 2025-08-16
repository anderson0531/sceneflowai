'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { CueChatInterface } from '@/components/workflow/CueChatInterface'
import { IdeaDisplayCards } from '@/components/workflow/IdeaDisplayCards'
import { SimilarVideosSection } from '@/components/workflow/SimilarVideosSection'
import { 
  Lightbulb, 
  Sparkles, 
  ArrowRight,
  Target,
  MessageCircle,
  Save,
  Image,
  Share2,
  Download,
  Eye,
  EyeOff,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CollaborationService } from '@/services/CollaborationService'
import { ExportService } from '@/services/ExportService'


export default function IdeationPage() {
  const router = useRouter()
  const { currentProject, updateProject, updateStepProgress, stepProgress } = useStore()
  const [concept, setConcept] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyMessage, setKeyMessage] = useState('')
  const [tone, setTone] = useState('')
  
  // Enhanced features state
  const [generatedIdeas, setGeneratedIdeas] = useState<any[]>([])
  const [showIdeas, setShowIdeas] = useState(false)
  const [selectedIdea, setSelectedIdea] = useState<any>(null)
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false)
  const [collaborationSession, setCollaborationSession] = useState<any>(null)
  const [showCollaboration, setShowCollaboration] = useState(false)
  const [youtubeApiKey, setYoutubeApiKey] = useState<string>('')
  const [showSimilarVideos, setShowSimilarVideos] = useState(false)

  const handleSave = () => {
    if (currentProject) {
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          concept,
          targetAudience,
          keyMessage,
          tone
        }
      })
      updateStepProgress('ideation', 100)
    }
  }

  const handleNextStep = () => {
    handleSave()
    router.push('/dashboard/workflow/storyboard')
  }

  // Enhanced feature handlers
  const handleGenerateIdeas = async (ideas: any[]) => {
    setGeneratedIdeas(ideas)
    setShowIdeas(true)
    
    // Auto-generate thumbnails
    handleGenerateThumbnails(ideas)
  }

  const handleGenerateThumbnails = async (ideas: any[]) => {
    setIsGeneratingThumbnails(true)
    
    try {
      const response = await fetch('/api/thumbnails/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'demo_user_001',
          ideas: ideas.map(idea => ({ id: idea.id, thumbnail_prompt: idea.thumbnail_prompt }))
        })
      })
      
      const results = await response.json()
      
      if (results.success && results.thumbnails) {
        // Update ideas with thumbnail URLs
        const updatedIdeas = ideas.map(idea => {
          const result = results.thumbnails[idea.id]
          if (result?.success && result.imageUrl) {
            return { ...idea, thumbnail_url: result.imageUrl }
          }
          return idea
        })
        
        setGeneratedIdeas(updatedIdeas)
      }
    } catch (error) {
      console.error('Error generating thumbnails:', error)
    } finally {
      setIsGeneratingThumbnails(false)
    }
  }

  const handleSelectAndIterate = (idea: any) => {
    setSelectedIdea(idea)
    setShowIdeas(false)
    // Return to Cue interface with selected idea context
    // This would update the Cue conversation with the selected idea
  }

  const handleShareIdeas = async () => {
    if (!currentProject) return
    
    try {
      const session = await CollaborationService.createSession(
        currentProject.id,
        'demo_user_001',
        `Collaboration: ${currentProject.title}`,
        `Review and vote on video ideas for ${currentProject.title}`,
        generatedIdeas
      )
      
      setCollaborationSession(session)
      setShowCollaboration(true)
      
      // Generate shareable link
      const shareLink = CollaborationService.generateShareLink(session.id)
      navigator.clipboard.writeText(shareLink)
      
      alert('Collaboration link copied to clipboard!')
    } catch (error) {
      console.error('Error creating collaboration session:', error)
    }
  }

  const handleExportIdeas = async () => {
    if (!collaborationSession) return
    
    try {
      const stats = await CollaborationService.getSessionStats(collaborationSession.id)
      if (!stats) return
      
      const exportOptions = {
        format: 'pdf' as const,
        includeThumbnails: true,
        includeFeedback: true,
        includeVotes: true,
        includeCollaborators: true
      }
      
      const result = await ExportService.exportSession(
        collaborationSession,
        stats,
        exportOptions
      )
      
      if (result.success && result.data) {
        // Create download link
        const url = URL.createObjectURL(result.data as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting ideas:', error)
    }
  }

  const handleShowSimilarVideos = (idea: any) => {
    setSelectedIdea(idea)
    setShowSimilarVideos(true)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">The Spark Studio</h1>
        <p className="text-xl text-gray-600">Step 1: Ideation & Brainstorming</p>
        <p className="text-gray-500 mt-2">Develop your video concept and creative direction</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Progress</h2>
          <span className="text-sm text-gray-500">Step 1 of 4</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${stepProgress?.ideation || 0}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {stepProgress?.ideation || 0}% Complete
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Concept Development */}
        <div className="lg:col-span-2 space-y-6">
          {/* Concept Statement */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
              Core Concept
            </h3>
            <textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Describe your video concept in 2-3 sentences. What story are you telling? What's the main message?"
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              Be specific about what you want to achieve and how you want your audience to feel.
            </p>
          </div>

          {/* Target Audience & Key Message */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-red-500" />
                Target Audience
              </h3>
              <input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Who is this video for?"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-2">
                Consider demographics, interests, and pain points.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-green-500" />
                Key Message
              </h3>
              <input
                value={keyMessage}
                onChange={(e) => setKeyMessage(e.target.value)}
                placeholder="What should viewers remember?"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-2">
                The one thing you want your audience to take away.
              </p>
            </div>
          </div>

          {/* Tone & Style */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tone & Style</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Professional', 'Friendly', 'Inspirational', 'Educational', 'Humorous', 'Serious', 'Dynamic', 'Calm'].map(style => (
                <button
                  key={style}
                  onClick={() => setTone(style)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    tone === style
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - AI Assistant & Tools */}
        <div className="space-y-6">
          {/* AI Suggestions */}
          <CueChatInterface 
            currentConcept={concept}
            targetAudience={targetAudience}
            keyMessage={keyMessage}
            tone={tone}
            onGenerateIdeas={handleGenerateIdeas}
          />

          {/* Project Info */}
          {currentProject && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Title:</span>
                  <span className="font-medium text-gray-900">{currentProject.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Genre:</span>
                  <span className="font-medium text-gray-900">{currentProject.metadata.genre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium text-gray-900">{currentProject.metadata.duration}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Style:</span>
                  <span className="font-medium text-gray-900">{currentProject.metadata.style}</span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Ready for the Next Step?</h3>
            <p className="text-blue-700 text-sm mb-4">
              Once you&apos;re satisfied with your concept, move to the Vision Board to start storyboarding.
            </p>
            <Button 
              onClick={handleNextStep}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Continue to Vision Board
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Features Section */}
      <AnimatePresence>
        {showIdeas && generatedIdeas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Ideas Display */}
            <IdeaDisplayCards
              ideas={generatedIdeas.map(idea => ({
                ...idea,
                generated_at: new Date().toISOString(),
                selected: selectedIdea?.id === idea.id
              }))}
              onSelectAndIterate={handleSelectAndIterate}
              onExportIdeas={handleExportIdeas}
              onShareIdeas={handleShareIdeas}
              isCollaborationMode={showCollaboration}
              collaborationData={collaborationSession ? {
                totalVotes: 0, // Would come from collaboration service
                averageRating: 0,
                feedbackCount: 0
              } : undefined}
            />

            {/* Thumbnail Generation Status */}
            {isGeneratingThumbnails && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-800">Generating AI thumbnails for your ideas...</span>
                </div>
              </div>
            )}

            {/* Similar Videos Section */}
            {selectedIdea && showSimilarVideos && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <SimilarVideosSection
                  idea={selectedIdea}
                  youtubeApiKey={youtubeApiKey}
                  maxResults={6}
                />
              </div>
            )}

            {/* Collaboration Controls */}
            {showCollaboration && collaborationSession && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      Collaboration Session Active
                    </h3>
                    <p className="text-green-700 text-sm">
                      Share this link with your team to collect feedback and votes on your ideas.
                    </p>
                    <p className="text-green-600 text-xs mt-1">
                      Session ID: {collaborationSession.id}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCollaboration(false)}
                      className="text-green-700 border-green-300 hover:bg-green-100"
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleExportIdeas}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Progress
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost">
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Progress: 25%</span>
            <Button 
              onClick={handleNextStep}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next Step
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
