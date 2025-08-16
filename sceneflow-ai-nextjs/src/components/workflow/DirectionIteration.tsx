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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CueChatInterface } from './CueChatInterface'
import { SceneDirection } from './SceneDirectionDisplay'

interface DirectionIterationProps {
  direction: SceneDirection
  onDirectionUpdate: (updatedDirection: SceneDirection) => void
  onClose: () => void
  projectContext: {
    title: string
    genre: string
    tone: string
    targetAudience: string
  }
}

export function DirectionIteration({
  direction,
  onDirectionUpdate,
  onClose,
  projectContext
}: DirectionIterationProps) {
  const [isIterating, setIsIterating] = useState(false)
  const [iterationHistory, setIterationHistory] = useState<Array<{
    feedback: string
    previousRating: number
    newRating: number
    quality: 'improved' | 'degraded' | 'maintained'
    timestamp: Date
  }>>([])
  const [currentRating, setCurrentRating] = useState<number>(direction.strength_rating)
  const [showCueInterface, setShowCueInterface] = useState(false)
  const [showQualityAnalysis, setShowQualityAnalysis] = useState(false)
  const [degradationWarnings, setDegradationWarnings] = useState<string[]>([])

  const handleIterateWithCue = () => {
    setShowCueInterface(true)
    setIsIterating(true)
  }

  const handleCueFeedback = async (feedback: string) => {
    // Add feedback to iteration history
    const previousRating = currentRating
    
    // In production, this would call the LLM to regenerate the direction
    // For now, we'll simulate the process
    setIsIterating(true)
    
    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate direction regeneration with improved content
      const improvedDirection = await regenerateDirectionWithAI(direction, feedback)
      
      // Calculate quality change
      const qualityChange = improvedDirection.strength_rating - previousRating
      const quality: 'improved' | 'degraded' | 'maintained' = 
        qualityChange > 0.1 ? 'improved' : 
        qualityChange < -0.1 ? 'degraded' : 'maintained'
      
      // Add to iteration history
      setIterationHistory(prev => [...prev, {
        feedback,
        previousRating,
        newRating: improvedDirection.strength_rating,
        quality,
        timestamp: new Date()
      }])
      
      // Update the direction
      onDirectionUpdate(improvedDirection)
      
      // Update current rating
      setCurrentRating(improvedDirection.strength_rating)
      
      // Check for degradation warnings
      if (quality === 'degraded') {
        const warnings = generateDegradationWarnings(improvedDirection, previousRating)
        setDegradationWarnings(warnings)
      } else {
        setDegradationWarnings([])
      }
      
    } catch (error) {
      console.error('Error regenerating direction:', error)
    } finally {
      setIsIterating(false)
    }
  }

  const regenerateDirectionWithAI = async (originalDirection: SceneDirection, feedback: string): Promise<SceneDirection> => {
    // In production, this would call the LLM API
    // For now, we'll simulate improvements with some randomness
    
    const feedbackImpact = Math.random() > 0.3 ? 0.5 : -0.3 // 70% chance of improvement
    const newRating = Math.max(1, Math.min(10, originalDirection.strength_rating + feedbackImpact))
    
    const improvements = {
      detailed_script: `${originalDirection.detailed_script} (Enhanced: ${feedback})`,
      camera_direction: `${originalDirection.camera_direction} (Refined based on feedback)`,
      lighting_mood: `${originalDirection.lighting_mood} (Improved mood and atmosphere)`,
      video_clip_prompt: `${originalDirection.video_clip_prompt} (Optimized for better AI generation)`,
      performance_notes: `${originalDirection.performance_notes} (Enhanced actor guidance)`,
      props_set_design: `${originalDirection.props_set_design} (Improved production design)`,
      sound_design: `${originalDirection.sound_design} (Enhanced audio direction)`,
      pacing_notes: `${originalDirection.pacing_notes} (Refined timing considerations)`,
      technical_requirements: `${originalDirection.technical_requirements} (Updated technical specs)`,
      strength_rating: newRating,
      quality_indicators: {
        visual_impact: Math.max(1, Math.min(10, originalDirection.quality_indicators.visual_impact + (Math.random() - 0.5) * 2)),
        narrative_clarity: Math.max(1, Math.min(10, originalDirection.quality_indicators.narrative_clarity + (Math.random() - 0.5) * 2)),
        technical_feasibility: Math.max(1, Math.min(10, originalDirection.quality_indicators.technical_feasibility + (Math.random() - 0.5) * 2)),
        emotional_resonance: Math.max(1, Math.min(10, originalDirection.quality_indicators.emotional_resonance + (Math.random() - 0.5) * 2))
      }
    }
    
    return {
      ...originalDirection,
      ...improvements
    }
  }

  const generateDegradationWarnings = (direction: SceneDirection, previousRating: number): string[] => {
    const warnings: string[] = []
    
    if (direction.strength_rating < previousRating) {
      warnings.push(`⚠️ Overall quality decreased from ${previousRating.toFixed(1)} to ${direction.strength_rating.toFixed(1)}`)
    }
    
    if (direction.quality_indicators.visual_impact < 6) {
      warnings.push("🎬 Visual impact is below optimal levels - consider stronger imagery")
    }
    
    if (direction.quality_indicators.narrative_clarity < 6) {
      warnings.push("📖 Narrative clarity needs improvement - audience may struggle to follow")
    }
    
    if (direction.quality_indicators.technical_feasibility < 6) {
      warnings.push("⚙️ Technical requirements may be too complex for current production capabilities")
    }
    
    if (direction.quality_indicators.emotional_resonance < 6) {
      warnings.push("💝 Emotional resonance could be stronger - consider more engaging elements")
    }
    
    return warnings
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 8.5) return 'text-yellow-500'
    if (rating >= 7.5) return 'text-orange-500'
    if (rating >= 6.5) return 'text-blue-500'
    if (rating >= 5.5) return 'text-green-500'
    return 'text-red-500'
  }

  const getRatingLabel = (rating: number) => {
    if (rating >= 8.5) return 'Exceptional'
    if (rating >= 7.5) return 'Strong'
    if (rating >= 6.5) return 'Good'
    if (rating >= 5.5) return 'Fair'
    return 'Needs Work'
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

  const getQualityColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const renderQualityBar = (score: number, label: string) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className={`font-medium ${getQualityColor(score)}`}>{score}/10</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score * 10}%` }}
        ></div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Scene {direction.scene_number} - Direction Refinement
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
          {/* Left Panel - Direction Details */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="space-y-6">
              {/* Direction Overview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Direction Overview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Rating:</span>
                    <div className="flex items-center gap-1 ml-2">
                      {renderStars(currentRating)}
                      <span className={`ml-1 text-sm font-medium ${getRatingColor(currentRating)}`}>
                        {currentRating.toFixed(1)}/5.0
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Quality:</span>
                    <span className={`ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium`}>
                      {getRatingLabel(currentRating)}
                    </span>
                  </div>
                </div>
                
                {/* Degradation Warnings */}
                {degradationWarnings.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Quality Degradation Detected
                    </h4>
                    <div className="space-y-1">
                      {degradationWarnings.map((warning, index) => (
                        <p key={index} className="text-sm text-red-700">{warning}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Current Direction Content */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Current Direction</h3>
                
                {/* Detailed Script */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Detailed Script
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {direction.detailed_script}
                  </p>
                </div>

                {/* Camera Direction */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Camera Direction
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {direction.camera_direction}
                  </p>
                </div>

                {/* Lighting & Mood */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Lighting & Mood
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {direction.lighting_mood}
                  </p>
                </div>

                {/* Video Clip Prompt */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">AI Video Prompt</h4>
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                    <p className="text-sm text-blue-800 font-medium">
                      {direction.video_clip_prompt}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quality Indicators */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Quality Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  {renderQualityBar(direction.quality_indicators.visual_impact, 'Visual Impact')}
                  {renderQualityBar(direction.quality_indicators.narrative_clarity, 'Narrative Clarity')}
                  {renderQualityBar(direction.quality_indicators.technical_feasibility, 'Technical Feasibility')}
                  {renderQualityBar(direction.quality_indicators.emotional_resonance, 'Emotional Resonance')}
                </div>
              </div>

              {/* Iteration History */}
              {iterationHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Iteration History</h3>
                  <div className="space-y-2">
                    {iterationHistory.map((iteration, index) => (
                      <div key={index} className={`border rounded-lg p-3 ${
                        iteration.quality === 'improved' ? 'bg-green-50 border-green-200' :
                        iteration.quality === 'degraded' ? 'bg-red-50 border-red-200' :
                        'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {iteration.quality === 'improved' ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : iteration.quality === 'degraded' ? (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-yellow-600" />
                          )}
                          <span className={`text-sm font-medium ${
                            iteration.quality === 'improved' ? 'text-green-800' :
                            iteration.quality === 'degraded' ? 'text-red-800' :
                            'text-yellow-800'
                          }`}>
                            Iteration {index + 1} - {iteration.quality.charAt(0).toUpperCase() + iteration.quality.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{iteration.feedback}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-gray-500">
                            Rating: {iteration.previousRating.toFixed(1)} → {iteration.newRating.toFixed(1)}
                          </span>
                          <span className="text-gray-500">
                            {iteration.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
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
                    currentConcept={direction.detailed_script}
                    targetAudience={projectContext.targetAudience}
                    keyMessage={direction.camera_direction}
                    tone={projectContext.tone}
                    onGenerateIdeas={() => {}} // Not used for direction iteration
                    onConceptUpdate={(updatedConcept) => {
                      // Handle concept updates from Cue
                      console.log('Concept updated:', updatedConcept)
                    }}
                    initialConcept={`Scene ${direction.scene_number} Direction: ${direction.detailed_script}`}
                    isStoryboardMode={false}
                    sceneContext={direction}
                    onSceneIteration={handleCueFeedback}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Ready for Professional Direction?
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Get AI-powered director insights to improve your scene's technical execution, pacing, and production value.
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
                    onClick={() => setShowQualityAnalysis(!showQualityAnalysis)}
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Quality Analysis
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Reset to original version
                      onDirectionUpdate({
                        ...direction,
                        strength_rating: direction.strength_rating
                      })
                      setCurrentRating(direction.strength_rating)
                      setIterationHistory([])
                      setDegradationWarnings([])
                    }}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Changes
                  </Button>
                </div>
              </div>

              {/* Quality Analysis Panel */}
              <AnimatePresence>
                {showQualityAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <h4 className="font-medium text-gray-900 mb-3">Quality Insights</h4>
                    <div className="space-y-3">
                      {direction.quality_indicators.visual_impact < 7 && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">Visual impact could be enhanced with stronger imagery</span>
                        </div>
                      )}
                      {direction.quality_indicators.narrative_clarity < 7 && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">Narrative clarity needs improvement for better audience understanding</span>
                        </div>
                      )}
                      {direction.quality_indicators.technical_feasibility < 7 && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">Technical requirements may exceed current production capabilities</span>
                        </div>
                      )}
                      {direction.quality_indicators.emotional_resonance < 7 && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">Emotional resonance could be strengthened</span>
                        </div>
                      )}
                      {Object.values(direction.quality_indicators).every(score => score >= 8) && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Excellent quality across all metrics!</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
