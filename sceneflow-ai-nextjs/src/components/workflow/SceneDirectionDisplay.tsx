'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, 
  Lightbulb, 
  Music, 
  Clock, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Play,
  Pause,
  Volume2,
  Settings,
  Edit3,
  Eye,
  Download,
  Share2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface SceneDirection {
  scene_number: number
  detailed_script: string
  camera_direction: string
  lighting_mood: string
  video_clip_prompt: string
  performance_notes: string
  props_set_design: string
  sound_design: string
  pacing_notes: string
  technical_requirements: string
  strength_rating: number
  quality_indicators: {
    visual_impact: number
    narrative_clarity: number
    technical_feasibility: number
    emotional_resonance: number
  }
}

interface SceneDirectionDisplayProps {
  directions: SceneDirection[]
  onDirectionEdit: (direction: SceneDirection) => void
  onDirectionUpdate: (updatedDirection: SceneDirection) => void
  projectContext: {
    title: string
    genre: string
    tone: string
    targetAudience: string
  }
}

export function SceneDirectionDisplay({
  directions,
  onDirectionEdit,
  onDirectionUpdate,
  projectContext
}: SceneDirectionDisplayProps) {
  const [expandedScene, setExpandedScene] = useState<number | null>(null)
  const [showQualityDetails, setShowQualityDetails] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<'scene' | 'rating' | 'quality'>('scene')
  const [filterRating, setFilterRating] = useState<number>(0)

  const toggleQualityDetails = (sceneNumber: number) => {
    const newSet = new Set(showQualityDetails)
    if (newSet.has(sceneNumber)) {
      newSet.delete(sceneNumber)
    } else {
      newSet.add(sceneNumber)
    }
    setShowQualityDetails(newSet)
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

  const getQualityColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
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

  const sortedDirections = [...directions].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.strength_rating - a.strength_rating
      case 'quality':
        const aAvg = Object.values(a.quality_indicators).reduce((sum, val) => sum + val, 0) / 4
        const bAvg = Object.values(b.quality_indicators).reduce((sum, val) => sum + val, 0) / 4
        return bAvg - aAvg
      default:
        return a.scene_number - b.scene_number
    }
  }).filter(direction => direction.strength_rating >= filterRating)

  const totalScenes = directions.length
  const averageRating = directions.reduce((sum, dir) => sum + dir.strength_rating, 0) / totalScenes
  const highQualityScenes = directions.filter(dir => dir.strength_rating >= 8).length
  const needsWorkScenes = directions.filter(dir => dir.strength_rating < 6).length

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalScenes}</div>
            <div className="text-sm text-blue-700">Total Scenes</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{averageRating.toFixed(1)}</div>
            <div className="text-sm text-green-700">Avg Rating</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{highQualityScenes}</div>
            <div className="text-sm text-yellow-700">High Quality</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{needsWorkScenes}</div>
            <div className="text-sm text-red-700">Need Work</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="scene">Scene Number</option>
                <option value="rating">Rating</option>
                <option value="quality">Overall Quality</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter Rating</label>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(parseInt(e.target.value))}
                className="p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={0}>All Ratings</option>
                <option value={5}>5+ Stars</option>
                <option value={6}>6+ Stars</option>
                <option value={7}>7+ Stars</option>
                <option value={8}>8+ Stars</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQualityDetails(new Set())}
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              Hide All Details
            </Button>
          </div>
        </div>
      </div>

      {/* Scene Directions */}
      <div className="space-y-4">
        {sortedDirections.map((direction) => (
          <motion.div
            key={direction.scene_number}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* Scene Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{direction.scene_number}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Scene {direction.scene_number}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {renderStars(direction.strength_rating)}
                        <span className={`ml-2 text-sm font-medium ${getRatingColor(direction.strength_rating)}`}>
                          {direction.strength_rating}/5.0
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        direction.strength_rating >= 8.5 ? 'bg-green-100 text-green-800' :
                        direction.strength_rating >= 7.5 ? 'bg-blue-100 text-blue-800' :
                        direction.strength_rating >= 6.5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getRatingLabel(direction.strength_rating)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleQualityDetails(direction.scene_number)}
                    className="text-gray-600 hover:text-blue-600"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDirectionEdit(direction)}
                    className="text-gray-600 hover:text-blue-600"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Scene Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Script & Direction */}
                <div className="space-y-4">
                  {/* Detailed Script */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Detailed Script
                    </h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {direction.detailed_script}
                      </p>
                    </div>
                  </div>

                  {/* Camera Direction */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Camera Direction
                    </h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {direction.camera_direction}
                    </p>
                  </div>

                  {/* Lighting & Mood */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Lighting & Mood
                    </h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {direction.lighting_mood}
                    </p>
                  </div>

                  {/* Performance Notes */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Performance Notes</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {direction.performance_notes}
                    </p>
                  </div>
                </div>

                {/* Right Column - Technical & Quality */}
                <div className="space-y-4">
                  {/* Video Clip Prompt */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">AI Video Prompt</h4>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        {direction.video_clip_prompt}
                      </p>
                    </div>
                  </div>

                  {/* Props & Set Design */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Props & Set Design</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {direction.props_set_design}
                    </p>
                  </div>

                  {/* Sound Design */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      Sound Design
                    </h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {direction.sound_design}
                    </p>
                  </div>

                  {/* Technical Requirements */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Technical Requirements
                    </h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {direction.technical_requirements}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pacing Notes */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pacing Notes
                </h4>
                <p className="text-sm text-yellow-700">
                  {direction.pacing_notes}
                </p>
              </div>

              {/* Quality Indicators */}
              <AnimatePresence>
                {showQualityDetails.has(direction.scene_number) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <h4 className="font-medium text-gray-900 mb-4">Quality Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderQualityBar(direction.quality_indicators.visual_impact, 'Visual Impact')}
                      {renderQualityBar(direction.quality_indicators.narrative_clarity, 'Narrative Clarity')}
                      {renderQualityBar(direction.quality_indicators.technical_feasibility, 'Technical Feasibility')}
                      {renderQualityBar(direction.quality_indicators.emotional_resonance, 'Emotional Resonance')}
                    </div>
                    
                    {/* Quality Insights */}
                    <div className="mt-4 p-3 bg-white rounded border">
                      <h5 className="font-medium text-gray-900 mb-2">Quality Insights</h5>
                      <div className="space-y-2 text-sm">
                        {direction.quality_indicators.visual_impact < 7 && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Visual impact could be enhanced with stronger imagery</span>
                          </div>
                        )}
                        {direction.quality_indicators.narrative_clarity < 7 && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Narrative clarity needs improvement for better audience understanding</span>
                          </div>
                        )}
                        {direction.quality_indicators.technical_feasibility < 7 && (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Technical requirements may exceed current production capabilities</span>
                          </div>
                        )}
                        {direction.quality_indicators.emotional_resonance < 7 && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Emotional resonance could be strengthened</span>
                          </div>
                        )}
                        {Object.values(direction.quality_indicators).every(score => score >= 8) && (
                          <div className="flex items-center gap-2 text-green-600">
                            <TrendingUp className="w-4 h-4" />
                            <span>Excellent quality across all metrics!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {sortedDirections.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No scene directions found</h3>
          <p className="text-gray-600">
            {filterRating > 0 
              ? `No scenes meet the ${filterRating}+ star rating requirement.`
              : 'Generate scene directions to get started.'
            }
          </p>
        </div>
      )}
    </div>
  )
}
