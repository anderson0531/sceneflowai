'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Star, 
  Play, 
  Share2, 
  Download, 
  Edit3, 
  Users, 
  MessageCircle,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store/useStore'

interface VideoIdea {
  id: string
  title: string
  synopsis: string
  scene_outline: string[]
  thumbnail_prompt: string
  strength_rating: number
  thumbnail_url?: string
  generated_at: string
  selected?: boolean
}

interface IdeaDisplayCardsProps {
  ideas: VideoIdea[]
  onSelectAndIterate: (idea: VideoIdea) => void
  onExportIdeas: () => void
  onShareIdeas: () => void
  isCollaborationMode?: boolean
  collaborationData?: {
    totalVotes: number
    averageRating: number
    feedbackCount: number
  }
}

export function IdeaDisplayCards({ 
  ideas, 
  onSelectAndIterate, 
  onExportIdeas, 
  onShareIdeas,
  isCollaborationMode = false,
  collaborationData
}: IdeaDisplayCardsProps) {
  const [selectedIdeas, setSelectedIdeas] = useState<Set<string>>(new Set())
  const [expandedIdea, setExpandedIdea] = useState<string | null>(null)
  const [showCollaborationStats, setShowCollaborationStats] = useState(false)
  const { currentProject } = useStore()

  const handleIdeaSelection = (ideaId: string) => {
    const newSelected = new Set(selectedIdeas)
    if (newSelected.has(ideaId)) {
      newSelected.delete(ideaId)
    } else {
      newSelected.add(ideaId)
    }
    setSelectedIdeas(newSelected)
  }

  const handleSelectAndIterate = (idea: VideoIdea) => {
    // Mark idea as selected in the store
    const updatedIdeas = ideas.map(i => ({
      ...i,
      selected: i.id === idea.id
    }))
    
    // Update project with selected idea
    if (currentProject) {
      // This would update the project state with the selected idea
      console.log('Selected idea for iteration:', idea)
    }
    
    onSelectAndIterate(idea)
  }

  const getStrengthRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-yellow-500'
    if (rating >= 4.0) return 'text-orange-500'
    if (rating >= 3.5) return 'text-blue-500'
    return 'text-gray-500'
  }

  const getStrengthRatingLabel = (rating: number) => {
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

  const renderThumbnail = (idea: VideoIdea) => {
    if (idea.thumbnail_url) {
      return (
        <div className="relative group">
          <img
            src={idea.thumbnail_url}
            alt={idea.title}
            className="w-full h-32 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
            <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        </div>
      )
    }

    // Placeholder thumbnail
    return (
      <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Play className="w-6 h-6 text-white" />
          </div>
          <p className="text-xs text-gray-600 font-medium">Thumbnail</p>
          <p className="text-xs text-gray-500">Generate with AI</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Generated Video Ideas
          </h2>
          <p className="text-gray-600">
            {ideas.length} distinct concepts based on your refined concept
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {isCollaborationMode && collaborationData && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCollaborationStats(!showCollaborationStats)}
              className="flex items-center gap-2"
            >
              {showCollaborationStats ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Collaboration Stats
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onShareIdeas}
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onExportIdeas}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Collaboration Stats */}
      {isCollaborationMode && collaborationData && showCollaborationStats && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Collaboration Summary</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{collaborationData.totalVotes}</div>
              <div className="text-sm text-blue-700">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{collaborationData.averageRating.toFixed(1)}</div>
              <div className="text-sm text-blue-700">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{collaborationData.feedbackCount}</div>
              <div className="text-sm text-blue-700">Feedback Comments</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {ideas.map((idea, index) => (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* Thumbnail */}
              {renderThumbnail(idea)}

              {/* Content */}
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {idea.title}
                  </h3>
                  <div className="flex items-center gap-1 ml-2">
                    {renderStars(idea.strength_rating)}
                  </div>
                </div>

                {/* Rating and Label */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`text-sm font-medium ${getStrengthRatingColor(idea.strength_rating)}`}>
                    {idea.strength_rating}/5.0
                  </div>
                  <div className="text-sm text-gray-500">
                    {getStrengthRatingLabel(idea.strength_rating)}
                  </div>
                  {idea.selected && (
                    <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                      Selected
                    </div>
                  )}
                </div>

                {/* Synopsis */}
                <div className="mb-4">
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {idea.synopsis}
                  </p>
                </div>

                {/* Scene Outline Preview */}
                <div className="mb-4">
                  <button
                    onClick={() => setExpandedIdea(expandedIdea === idea.id ? null : idea.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    {expandedIdea === idea.id ? 'Hide' : 'Show'} Scene Outline
                    <Edit3 className="w-3 h-3" />
                  </button>
                  
                  <AnimatePresence>
                    {expandedIdea === idea.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-1"
                      >
                        {idea.scene_outline.map((scene, sceneIndex) => (
                          <div key={sceneIndex} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            {sceneIndex + 1}. {scene}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => handleSelectAndIterate(idea)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Select & Iterate
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleIdeaSelection(idea.id)}
                  >
                    {selectedIdeas.has(idea.id) ? 'Deselect' : 'Select'}
                  </Button>
                </div>

                {/* Metadata */}
                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  Generated: {new Date(idea.generated_at).toLocaleDateString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bulk Actions */}
      {selectedIdeas.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="text-blue-900">
              <span className="font-medium">{selectedIdeas.size}</span> idea{selectedIdeas.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIdeas(new Set())}
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Compare Selected
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
