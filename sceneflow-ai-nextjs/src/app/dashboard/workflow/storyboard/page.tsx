'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { getCurrentTemplate, getCurrentStructuredTemplate } from '@/services/TemplateService'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Film, 
  Sparkles, 
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Share2,
  Download,
  Settings,
  Play,
  Clock,
  Camera,
  Lightbulb
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { InteractiveStoryboard } from '@/components/workflow/InteractiveStoryboard'
import { StoryboardIteration } from '@/components/workflow/StoryboardIteration'
import { CollaborationService } from '@/services/CollaborationService'
import { ExportService } from '@/services/ExportService'

export default function StoryboardPage() {
  const router = useRouter()
  const { currentProject, updateProject, updateStepProgress, stepProgress } = useStore()
  
  // Storyboard state
  const [scenes, setScenes] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedScene, setSelectedScene] = useState<any>(null)
  const [showIteration, setShowIteration] = useState(false)
  const [storyboardSettings, setStoryboardSettings] = useState({
    style: 'cinematic' as const,
    aspectRatio: '16:9' as const,
    targetDuration: 60
  })
  
  // Collaboration state
  const [collaborationSession, setCollaborationSession] = useState<any>(null)
  const [showCollaboration, setShowCollaboration] = useState(false)
  
  // UI state
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    // Check if we have a selected idea from the previous step
    if (currentProject?.metadata?.selectedIdea) {
      // Auto-generate storyboard if not already present
      if (scenes.length === 0) {
        handleGenerateStoryboard()
      }
    }
  }, [currentProject, scenes.length])

  const handleGenerateStoryboard = async () => {
    if (!currentProject?.metadata?.selectedIdea) {
      alert('Please select an idea from the Spark Studio first')
      return
    }

    setIsGenerating(true)
    
    try {
      // Get the structured template if available
      const structuredTemplate = getCurrentStructuredTemplate()
      
      const response = await fetch('/api/storyboard/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idea: currentProject.metadata.selectedIdea,
          userId: 'demo_user_001', // In production, get from auth context
          projectId: currentProject.id,
          style: storyboardSettings.style,
          aspectRatio: storyboardSettings.aspectRatio,
          targetDuration: storyboardSettings.targetDuration,
          creatorTemplate: structuredTemplate ? JSON.stringify(structuredTemplate) : getCurrentTemplate()
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.storyboard) {
          // Add unique IDs to scenes
          const scenesWithIds = data.storyboard.map((scene: any, index: number) => ({
            ...scene,
            id: `scene_${Date.now()}_${index}`,
            strength_rating: scene.strength_rating || 3.0
          }))
          
          setScenes(scenesWithIds)
          
          // Update project metadata
          if (currentProject) {
            updateProject(currentProject.id, {
              metadata: {
                ...currentProject.metadata,
                storyboard: scenesWithIds,
                storyboardMetadata: data.metadata
              }
            })
          }
          
          // Update progress
          updateStepProgress('storyboard', 100)
        }
      } else {
        const errorData = await response.json()
        alert(`Failed to generate storyboard: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error generating storyboard:', error)
      alert('Failed to generate storyboard. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleScenesUpdate = (updatedScenes: any[]) => {
    setScenes(updatedScenes)
    
    // Update project metadata
    if (currentProject) {
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          storyboard: updatedScenes
        }
      })
    }
  }

  const handleSceneEdit = (scene: any) => {
    setSelectedScene(scene)
    setShowIteration(true)
  }

  const handleSceneUpdate = (updatedScene: any) => {
    const updatedScenes = scenes.map(s => 
      s.id === updatedScene.id ? updatedScene : s
    )
    setScenes(updatedScenes)
    setSelectedScene(updatedScene)
    
    // Update project metadata
    if (currentProject) {
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          storyboard: updatedScenes
        }
      })
    }
  }

  const handleShareStoryboard = async () => {
    if (!currentProject) return
    
    try {
      const session = await CollaborationService.createSession(
        currentProject.id,
        'demo_user_001',
        `Storyboard Review: ${currentProject.title}`,
        `Review and provide feedback on the storyboard for ${currentProject.title}`,
        scenes.map(scene => ({
          id: scene.id,
          title: `Scene ${scene.scene_number}`,
          synopsis: scene.description,
          scene_outline: [scene.description],
          thumbnail_prompt: scene.image_prompt,
          strength_rating: scene.strength_rating || 3.0
        }))
      )
      
      setCollaborationSession(session)
      setShowCollaboration(true)
      
      // Generate shareable link
      const shareLink = CollaborationService.generateShareLink(session.id)
      navigator.clipboard.writeText(shareLink)
      
      alert('Storyboard collaboration link copied to clipboard!')
    } catch (error) {
      console.error('Error creating collaboration session:', error)
    }
  }

  const handleExportStoryboard = async () => {
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
      console.error('Error exporting storyboard:', error)
    }
  }

  const handleNextStep = () => {
    if (currentProject) {
      updateStepProgress('storyboard', 100)
    }
    router.push('/dashboard/workflow/direction')
  }

  const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0)
  const scenesWithImages = scenes.filter(scene => scene.image_url).length

  return (
    <div className="max-w-7xl mx-auto space-y-8" style={{ scrollMarginTop: 'calc(var(--app-bar-h) + var(--context-bar-h))' }}>
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Film className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Production</h1>
        <p className="text-xl text-gray-600">Step 2: Storyboard & Visual Planning</p>
        <p className="text-gray-500 mt-2">Transform your idea into a visual storyboard with AI-powered insights</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Progress</h2>
          <span className="text-sm text-gray-500">Step 2 of 4</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${stepProgress?.storyboard || 0}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {stepProgress?.storyboard || 0}% Complete
        </div>
      </div>

      {/* Storyboard Generation */}
      {scenes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-8 text-center"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to Create Your Storyboard?
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Transform your selected idea into a detailed, scene-by-scene storyboard with professional cinematography guidance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleGenerateStoryboard}
              disabled={isGenerating || !currentProject?.metadata?.selectedIdea}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Film className="w-4 h-4 mr-2" />
              )}
              Generate Storyboard
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Customize Settings
            </Button>
          </div>
          
          {!currentProject?.metadata?.selectedIdea && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ Please return to The Blueprint and select an idea before generating a storyboard.
              </p>
              <Link href="/dashboard/studio/new-project">
                <Button variant="outline" size="sm" className="mt-2 text-yellow-700 border-yellow-300 hover:bg-yellow-100">
                  Go to The Blueprint
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      )}

      {/* Storyboard Content */}
      {scenes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Storyboard Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Storyboard</h2>
                <p className="text-gray-600">
                  {scenes.length} scenes • {totalDuration}s total duration • {scenesWithImages} with visuals
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'timeline' ? 'grid' : 'timeline')}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  {viewMode === 'timeline' ? 'Grid View' : 'Timeline View'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareStoryboard}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportStoryboard}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            
            {/* Progress Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{scenes.length}</div>
                <div className="text-sm text-purple-700">Total Scenes</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalDuration}s</div>
                <div className="text-sm text-blue-700">Duration</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{scenesWithImages}</div>
                <div className="text-sm text-green-700">With Visuals</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {scenes.length > 0 ? (scenesWithImages / scenes.length * 100).toFixed(0) : 0}%
                </div>
                <div className="text-sm text-yellow-700">Complete</div>
              </div>
            </div>
          </div>

          {/* Interactive Storyboard */}
          <InteractiveStoryboard
            scenes={scenes}
            onScenesUpdate={handleScenesUpdate}
            onSceneEdit={handleSceneEdit}
            userId="demo_user_001"
            projectId={currentProject?.id || ''}
            style={viewMode}
            aspectRatio={storyboardSettings.aspectRatio}
          />
        </motion.div>
      )}

      {/* Collaboration Panel */}
      <AnimatePresence>
        {showCollaboration && collaborationSession && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 border border-green-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-800 mb-2">
                  Collaboration Session Active
                </h3>
                <p className="text-green-700 text-sm">
                  Share this link with your team to collect feedback on your storyboard.
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
                  Hide
                </Button>
                <Button
                  size="sm"
                  onClick={handleExportStoryboard}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/studio/new-project">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to The Blueprint
              </Button>
            </Link>
            
            <Link href="/dashboard">
              <Button variant="ghost">
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Progress: {scenes.length > 0 ? '50%' : '25%'}
            </span>
            
            {scenes.length > 0 && (
              <Button 
                onClick={handleNextStep}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Next Step: Director's Chair
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Storyboard Iteration Modal */}
      <AnimatePresence>
        {showIteration && selectedScene && (
          <StoryboardIteration
            scene={selectedScene}
            onSceneUpdate={handleSceneUpdate}
            onClose={() => {
              setShowIteration(false)
              setSelectedScene(null)
            }}
            projectContext={{
              title: currentProject?.title || '',
              genre: currentProject?.metadata?.genre || '',
              tone: currentProject?.metadata?.tone || '',
              targetAudience: currentProject?.metadata?.targetAudience || ''
            }}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Storyboard Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                  <select
                    value={storyboardSettings.style}
                    onChange={(e) => setStoryboardSettings(prev => ({ ...prev, style: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="cinematic">Cinematic</option>
                    <option value="documentary">Documentary</option>
                    <option value="commercial">Commercial</option>
                    <option value="educational">Educational</option>
                    <option value="artistic">Artistic</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                  <select
                    value={storyboardSettings.aspectRatio}
                    onChange={(e) => setStoryboardSettings(prev => ({ ...prev, aspectRatio: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:3">4:3 (Traditional)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Duration (seconds)</label>
                  <input
                    type="number"
                    value={storyboardSettings.targetDuration}
                    onChange={(e) => setStoryboardSettings(prev => ({ ...prev, targetDuration: parseInt(e.target.value) || 60 }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="15"
                    max="300"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowSettings(false)}
                  className="flex-1"
                >
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
