'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Lightbulb, 
  Camera, 
  Clock, 
  Star, 
  Edit3,
  RotateCcw,
  Save,
  Play,
  Pause
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CueChatInterface } from './CueChatInterface'
import { StoryboardScene } from './InteractiveStoryboard'

interface StoryboardIterationProps {
  scene: StoryboardScene
  onSceneUpdate: (updatedScene: StoryboardScene) => void
  onClose: () => void
  projectContext: {
    title: string
    genre: string
    tone: string
    targetAudience: string
  }
}

export function StoryboardIteration({
  scene,
  onSceneUpdate,
  onClose,
  projectContext
}: StoryboardIterationProps) {
  const [isIterating, setIsIterating] = useState(false)
  const [iterationHistory, setIterationHistory] = useState<string[]>([])
  const [currentRating, setCurrentRating] = useState<number>(scene.strength_rating || 0)
  const [showCueInterface, setShowCueInterface] = useState(false)

  const handleIterateWithCue = () => {
    setShowCueInterface(true)
    setIsIterating(true)
  }

  const handleCueFeedback = async (feedback: string) => {
    // Add feedback to iteration history
    setIterationHistory(prev => [...prev, feedback])
    
    // In production, this would call the LLM to regenerate the scene
    // For now, we'll simulate the process
    setIsIterating(true)
    
    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate scene regeneration with improved content
      const improvedScene = await regenerateSceneWithAI(scene, feedback)
      
      // Update the scene
      onSceneUpdate(improvedScene)
      
      // Update rating based on improvements
      const newRating = Math.min(5, currentRating + 0.5)
      setCurrentRating(newRating)
      
    } catch (error) {
      console.error('Error regenerating scene:', error)
    } finally {
      setIsIterating(false)
    }
  }

  const regenerateSceneWithAI = async (originalScene: StoryboardScene, feedback: string): Promise<StoryboardScene> => {
    // In production, this would call the LLM API
    // For now, we'll simulate improvements
    
    const improvements = {
      description: `${originalScene.description} (Enhanced: ${feedback})`,
      audio_cues: `${originalScene.audio_cues} (Refined based on feedback)`,
      image_prompt: `${originalScene.image_prompt} (Improved visual direction)`,
      camera_angle: originalScene.camera_angle ? `${originalScene.camera_angle} (Optimized)` : 'Medium close-up (Optimized)',
      lighting: originalScene.lighting ? `${originalScene.lighting} (Enhanced)` : 'Professional lighting (Enhanced)',
      mood: originalScene.mood ? `${originalScene.mood} (Refined)` : 'Engaging (Refined)'
    }
    
    return {
      ...originalScene,
      ...improvements,
      strength_rating: Math.min(5, (originalScene.strength_rating || 0) + 0.5)
    }
  }

  const handleSceneEdit = () => {
    // Toggle edit mode for the scene
    onSceneUpdate({
      ...scene,
      isEditing: !scene.isEditing
    })
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-yellow-500'
    if (rating >= 4.0) return 'text-orange-500'
    if (rating >= 3.5) return 'text-blue-500'
    return 'text-gray-500'
  }

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return 'Exceptional'
    if (rating >= 4.0) return 'Strong'
    if (rating >= 3.5) return 'Good'
    if (rating >= 3.0) return 'Fair'
    return 'Basic'
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        )
      } else {
        stars.push(
          <Star key={i} className="w-4 h-4 text-gray-300" />
        )
      }
    }
    return stars
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Scene {scene.scene_number} - Iteration & Refinement
            </h2>
            <p className="text-gray-600">
              Professional director feedback and AI-powered improvements
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="text-gray-600 hover:text-gray-700"
            >
              Close
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Scene Details */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="space-y-6">
              {/* Scene Overview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Scene Overview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Duration:</span>
                    <span className="ml-2 text-blue-800">{scene.duration || 'Not set'}s</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Rating:</span>
                    <div className="flex items-center gap-1 ml-2">
                      {renderStars(currentRating)}
                      <span className={`ml-1 text-sm font-medium ${getRatingColor(currentRating)}`}>
                        {currentRating.toFixed(1)}/5.0
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-blue-700 font-medium">Quality:</span>
                  <span className={`ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium`}>
                    {getRatingLabel(currentRating)}
                  </span>
                </div>
              </div>

              {/* Current Scene Content */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Current Scene Content</h3>
                
                {/* Visual Description */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Visual Description
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {scene.description}
                  </p>
                </div>

                {/* Audio Cues */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Audio Cues
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {scene.audio_cues}
                  </p>
                </div>

                {/* Technical Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Camera Angle</h5>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {scene.camera_angle || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Lighting</h5>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {scene.lighting || 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Mood */}
                {scene.mood && (
                  <div>
                    <h5 className="font-medium text-gray-700 mb-1">Mood & Tone</h5>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {scene.mood}
                    </span>
                  </div>
                )}
              </div>

              {/* Iteration History */}
              {iterationHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Iteration History</h3>
                  <div className="space-y-2">
                    {iterationHistory.map((feedback, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Lightbulb className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            Iteration {index + 1}
                          </span>
                        </div>
                        <p className="text-sm text-yellow-700">{feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Cue Interface */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">AI Director Feedback</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCueInterface(!showCueInterface)}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  {showCueInterface ? 'Hide Cue' : 'Show Cue'}
                </Button>
              </div>

              {showCueInterface ? (
                <div className="border border-gray-200 rounded-lg">
                  <CueChatInterface
                    currentConcept={scene.description}
                    targetAudience={projectContext.targetAudience}
                    keyMessage={scene.audio_cues}
                    tone={projectContext.tone}
                    onGenerateIdeas={() => {}} // Not used for storyboard iteration
                    onConceptUpdate={(updatedConcept) => {
                      // Handle concept updates from Cue
                      console.log('Concept updated:', updatedConcept)
                    }}
                    initialConcept={`Scene ${scene.scene_number}: ${scene.description}`}
                    isStoryboardMode={true}
                    sceneContext={scene}
                    onSceneIteration={handleCueFeedback}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Ready for Professional Feedback?
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Get AI-powered director insights to improve your scene's visual flow, pacing, and impact.
                  </p>
                  <Button
                    onClick={handleIterateWithCue}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isIterating}
                  >
                    {isIterating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Lightbulb className="w-4 h-4 mr-2" />
                    )}
                    Start Iteration
                  </Button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSceneEdit}
                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Scene
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Reset to original version
                      onSceneUpdate({
                        ...scene,
                        strength_rating: scene.strength_rating || 0
                      })
                      setCurrentRating(scene.strength_rating || 0)
                      setIterationHistory([])
                    }}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
