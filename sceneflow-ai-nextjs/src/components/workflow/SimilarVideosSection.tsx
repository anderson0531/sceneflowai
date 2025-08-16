'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  ExternalLink, 
  Eye, 
  Clock, 
  Users, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { YouTubeVideo, YouTubeIntegrationService } from '@/services/YouTubeIntegrationService'

interface SimilarVideosSectionProps {
  idea: {
    id: string
    title: string
    synopsis: string
    targetAudience?: string
    genre?: string
  }
  youtubeApiKey?: string
  maxResults?: number
}

export function SimilarVideosSection({ 
  idea, 
  youtubeApiKey, 
  maxResults = 6 
}: SimilarVideosSectionProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null)
  const [showAllVideos, setShowAllVideos] = useState(false)
  const [totalResults, setTotalResults] = useState(0)

  useEffect(() => {
    if (youtubeApiKey && idea) {
      loadSimilarVideos()
    }
  }, [youtubeApiKey, idea])

  const loadSimilarVideos = async () => {
    if (!youtubeApiKey) {
      setError('YouTube API key not configured')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await YouTubeIntegrationService.findSimilarVideos(
        youtubeApiKey,
        idea,
        maxResults
      )

      if (result.success) {
        setVideos(result.videos)
        setTotalResults(result.totalResults)
      } else {
        setError(result.error || 'Failed to load similar videos')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVideoSelect = (video: YouTubeVideo) => {
    setSelectedVideo(video)
  }

  const handleVideoClose = () => {
    setSelectedVideo(null)
  }

  const formatDuration = (duration: string) => {
    return YouTubeIntegrationService.formatDuration(duration)
  }

  const formatViewCount = (viewCount: string) => {
    return YouTubeIntegrationService.formatViewCount(viewCount)
  }

  const formatPublishedDate = (publishedAt: string) => {
    const date = new Date(publishedAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  const getRelevanceScore = (video: YouTubeVideo) => {
    // Calculate a simple relevance score based on title and description matches
    const ideaText = `${idea.title} ${idea.synopsis}`.toLowerCase()
    const videoText = `${video.title} ${video.description}`.toLowerCase()
    
    let score = 0
    const ideaWords = ideaText.split(/\s+/).filter(word => word.length > 3)
    
    ideaWords.forEach(word => {
      if (videoText.includes(word)) score += 1
    })
    
    return Math.min(score, 5)
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 4) return 'text-green-600'
    if (score >= 3) return 'text-blue-600'
    if (score >= 2) return 'text-yellow-600'
    return 'text-gray-500'
  }

  const getRelevanceLabel = (score: number) => {
    if (score >= 4) return 'Very Relevant'
    if (score >= 3) return 'Relevant'
    if (score >= 2) return 'Somewhat Relevant'
    return 'Low Relevance'
  }

  if (!youtubeApiKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">YouTube Integration</h3>
        </div>
        <p className="text-yellow-700 text-sm">
          YouTube API key not configured. Configure your YouTube API key in settings to see similar videos.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
        >
          Configure YouTube API
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-500" />
            Similar Videos on YouTube
          </h3>
          <p className="text-sm text-gray-600">
            Discover related content and trends for your video idea
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={loadSimilarVideos}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Finding similar videos...</span>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {!isLoading && videos.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Found {videos.length} similar videos from {totalResults.toLocaleString()} total results
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {videos.slice(0, showAllVideos ? videos.length : 3).map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
                  onClick={() => handleVideoSelect(video)}
                >
                  {/* Thumbnail */}
                  <div className="relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-32 object-cover group-hover:brightness-75 transition-all duration-200"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                    
                    {/* Duration Badge */}
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    {/* Title */}
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                      {video.title}
                    </h4>

                    {/* Channel */}
                    <p className="text-xs text-gray-600 mb-2">
                      {video.channelTitle}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatViewCount(video.viewCount)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatPublishedDate(video.publishedAt)}
                      </div>
                    </div>

                    {/* Relevance Score */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <div className={`text-xs font-medium ${getRelevanceColor(getRelevanceScore(video))}`}>
                          {getRelevanceLabel(getRelevanceScore(video))}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank')
                        }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Watch
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Show More/Less Toggle */}
          {videos.length > 3 && (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllVideos(!showAllVideos)}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                {showAllVideos ? 'Show Less' : `Show ${videos.length - 3} More`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No Videos State */}
      {!isLoading && videos.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No similar videos found for this idea.</p>
          <p className="text-sm">Try refining your concept or check back later.</p>
        </div>
      )}

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={handleVideoClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{selectedVideo.title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVideoClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>

              {/* Video Player */}
              <div className="p-4">
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <p className="text-gray-600 mb-2">YouTube Video Player</p>
                    <p className="text-sm text-gray-500">
                      In production, this would embed the actual YouTube player
                    </p>
                    <Button
                      className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${selectedVideo.id}`, '_blank')}
                    >
                      Watch on YouTube
                    </Button>
                  </div>
                </div>

                {/* Video Info */}
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-gray-900">{selectedVideo.title}</h4>
                  <p className="text-sm text-gray-600">{selectedVideo.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{selectedVideo.channelTitle}</span>
                    <span>{formatViewCount(selectedVideo.viewCount)}</span>
                    <span>{formatPublishedDate(selectedVideo.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
