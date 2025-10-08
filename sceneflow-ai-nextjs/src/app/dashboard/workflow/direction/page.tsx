'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, 
  Sparkles, 
  ArrowRight,
  ArrowLeft,
  Film,
  Share2,
  Download,
  Settings,
  Play,
  Clock,
  Star,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { SceneDirectionDisplay } from '@/components/workflow/SceneDirectionDisplay'
import { DirectionIteration } from '@/components/workflow/DirectionIteration'
import { CollaborationService } from '@/services/CollaborationService'
import { ExportService } from '@/services/ExportService'
import { SceneDirection } from '@/components/workflow/SceneDirectionDisplay'

export default function DirectionPage() {
  const router = useRouter()
  const { currentProject, updateProject, updateStepProgress, stepProgress } = useStore()
  
  // Scene direction state
  const [directions, setDirections] = useState<SceneDirection[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDirection, setSelectedDirection] = useState<SceneDirection | null>(null)
  const [showIteration, setShowIteration] = useState(false)
  const [directionSettings, setDirectionSettings] = useState({
    directionStyle: 'cinematic' as const,
    technicalLevel: 'intermediate' as const
  })
  
  // Collaboration state
  const [collaborationSession, setCollaborationSession] = useState<any>(null)
  const [showCollaboration, setShowCollaboration] = useState(false)
  
  // UI state
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    // Check if we have a storyboard from the previous step
    if (currentProject?.metadata?.storyboard) {
      // Auto-generate directions if not already present
      if (directions.length === 0) {
        handleGenerateDirections()
      }
    }
  }, [currentProject, directions.length])

  const handleGenerateDirections = async () => {
    if (!currentProject?.metadata?.storyboard) {
      alert('Please complete the storyboard step first')
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/direction/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyboard: {
            id: currentProject.id,
            scenes: currentProject.metadata.storyboard,
            metadata: currentProject.metadata.storyboardMetadata || {
              totalScenes: currentProject.metadata.storyboard.length,
              estimatedDuration: 60,
              style: 'cinematic',
              aspectRatio: '16:9'
            }
          },
          userId: 'demo_user_001', // In production, get from auth context
          projectId: currentProject.id,
          projectContext: {
            title: currentProject.title,
            genre: currentProject.metadata?.genre || 'General',
            tone: currentProject.metadata?.tone || 'Professional',
            targetAudience: currentProject.metadata?.targetAudience || 'General',
            keyMessage: currentProject.metadata?.keyMessage || ''
          },
          directionStyle: directionSettings.directionStyle,
          technicalLevel: directionSettings.technicalLevel
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.directions) {
          setDirections(data.directions)
          
          // Update project metadata
          if (currentProject) {
            updateProject(currentProject.id, {
              metadata: {
                ...currentProject.metadata,
                directions: data.directions as any
              }
            })
          }
          
          // Update progress
          updateStepProgress('scene-direction', 100)
        }
      } else {
        const errorData = await response.json()
        alert(`Failed to generate directions: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error generating directions:', error)
      alert('Failed to generate directions. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDirectionsUpdate = (updatedDirections: SceneDirection[]) => {
    setDirections(updatedDirections)
    
    // Update project metadata
    if (currentProject) {
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          directions: updatedDirections as any
        }
      })
    }
  }

  const handleDirectionEdit = (direction: SceneDirection) => {
    setSelectedDirection(direction)
    setShowIteration(true)
  }

  const handleDirectionUpdate = (updatedDirection: SceneDirection) => {
    const updatedDirections = directions.map(d => 
      d.scene_number === updatedDirection.scene_number ? updatedDirection : d
    )
    setDirections(updatedDirections)
    setSelectedDirection(updatedDirection)
    
    // Update project metadata
    if (currentProject) {
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          directions: updatedDirections as any
        }
      })
    }
  }

  const handleShareDirections = async () => {
    if (!currentProject) return
    
    try {
      const session = await CollaborationService.createSession(
        currentProject.id,
        'demo_user_001',
        `Scene Direction Review: ${currentProject.title}`,
        `Review and provide feedback on the scene directions for ${currentProject.title}`,
        directions.map(direction => ({
          id: direction.scene_number.toString(),
          title: `Scene ${direction.scene_number}`,
          synopsis: direction.detailed_script,
          scene_outline: [direction.detailed_script],
          thumbnail_prompt: direction.video_clip_prompt,
          strength_rating: direction.strength_rating
        }))
      )
      
      setCollaborationSession(session)
      setShowCollaboration(true)
      
      // Generate shareable link
      const shareLink = CollaborationService.generateShareLink(session.id)
      navigator.clipboard.writeText(shareLink)
      
      alert('Scene direction collaboration link copied to clipboard!')
    } catch (error) {
      console.error('Error creating collaboration session:', error)
    }
  }

  const handleExportDirections = async () => {
    if (!collaborationSession) return
    
    try {
      const stats = await CollaborationService.getSessionStats(collaborationSession.id)
      if (!stats) return
      
      const exportOptions = {
        format: 'pdf' as const,
        includeThumbnails: false,
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
      console.error('Error exporting directions:', error)
    }
  }

  const handleNextStep = () => {
    if (currentProject) {
      updateStepProgress('scene-direction', 100)
    }
    router.push('/dashboard/workflow/generation')
  }

  const totalScenes = directions.length
  const averageRating = directions.length > 0 ? 
    directions.reduce((sum, dir) => sum + dir.strength_rating, 0) / totalScenes : 0
  const highQualityScenes = directions.filter(dir => dir.strength_rating >= 8).length
  const needsWorkScenes = directions.filter(dir => dir.strength_rating < 6).length

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Camera className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">The Director's Chair</h1>
        <p className="text-xl text-gray-600">Step 3: Scene Direction & Production Script</p>
        <p className="text-gray-500 mt-2">Transform your storyboard into detailed production scripts with professional direction</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Progress</h2>
          <span className="text-sm text-gray-500">Step 3 of 4</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${stepProgress?.['scene-direction'] || 0}%` }}
          ></div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
                      {stepProgress?.['scene-direction'] || 0}% Complete
        </div>
      </div>

      {/* Direction Generation */}
      {directions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-8 text-center"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to Take the Director's Chair?
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Transform your storyboard into detailed production scripts with professional cinematography guidance and technical specifications.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleGenerateDirections}
              disabled={isGenerating || !currentProject?.metadata?.storyboard}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              Generate Directions
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
          
          {!currentProject?.metadata?.storyboard && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ Please complete the Vision Board (Storyboard) step before generating scene directions.
              </p>
              <Link href="/dashboard/workflow/storyboard">
                <Button variant="outline" size="sm" className="mt-2 text-yellow-700 border-yellow-300 hover:bg-yellow-100">
                  Go to Vision Board
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      )}

      {/* Scene Directions Content */}
      {directions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Directions Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Scene Directions</h2>
                <p className="text-gray-600">
                  {totalScenes} scenes • {averageRating.toFixed(1)} avg rating • {highQualityScenes} high quality
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareDirections}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDirections}
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
                <div className="text-2xl font-bold text-purple-600">{totalScenes}</div>
                <div className="text-sm text-purple-700">Total Scenes</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{averageRating.toFixed(1)}</div>
                <div className="text-sm text-green-700">Avg Rating</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{highQualityScenes}</div>
                <div className="text-sm text-yellow-700">High Quality</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{needsWorkScenes}</div>
                <div className="text-sm text-red-700">Need Work</div>
              </div>
            </div>
          </div>

          {/* Scene Direction Display */}
          <SceneDirectionDisplay
            directions={directions}
            onDirectionEdit={handleDirectionEdit}
            onDirectionUpdate={handleDirectionUpdate}
            projectContext={{
              title: currentProject?.title || '',
              genre: currentProject?.metadata?.genre || '',
              tone: currentProject?.metadata?.tone || '',
              targetAudience: currentProject?.metadata?.targetAudience || ''
            }}
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
                  Share this link with your team to collect feedback on your scene directions.
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
                  onClick={handleExportDirections}
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
            <Link href="/dashboard/workflow/storyboard">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Vision Board
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
              Progress: {directions.length > 0 ? '75%' : '50%'}
            </span>
            
            {directions.length > 0 && (
              <Button 
                onClick={handleNextStep}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Next Step: AI Video Generation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Direction Iteration Modal */}
      <AnimatePresence>
        {showIteration && selectedDirection && (
          <DirectionIteration
            direction={selectedDirection}
            onDirectionUpdate={handleDirectionUpdate}
            onClose={() => {
              setShowIteration(false)
              setSelectedDirection(null)
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Direction Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Direction Style</label>
                  <select
                    value={directionSettings.directionStyle}
                    onChange={(e) => setDirectionSettings(prev => ({ ...prev, directionStyle: e.target.value as any }))}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Technical Level</label>
                  <select
                    value={directionSettings.technicalLevel}
                    onChange={(e) => setDirectionSettings(prev => ({ ...prev, technicalLevel: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="professional">Professional</option>
                  </select>
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
