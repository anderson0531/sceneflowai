'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Lightbulb,
  Loader2,
  AlertCircle,
  Lock,
  Send,
  Clock
} from 'lucide-react'
import type {
  ScreeningSession,
  TimestampedComment,
  ScreeningReaction,
  ReactionType
} from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

interface ScreeningViewerState {
  isLoading: boolean
  error: string | null
  requiresPassword: boolean
  screening: ScreeningSession | null
  videoUrl: string | null
}

// ============================================================================
// ScreeningViewerPage Component
// ============================================================================

export default function ScreeningViewerPage() {
  const params = useParams()
  const screeningId = params.screeningId as string
  
  // State
  const [state, setState] = useState<ScreeningViewerState>({
    isLoading: true,
    error: null,
    requiresPassword: false,
    screening: null,
    videoUrl: null
  })
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  
  // Video state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Comment state
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [viewerName, setViewerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Local feedback
  const [localComments, setLocalComments] = useState<TimestampedComment[]>([])
  const [localReactions, setLocalReactions] = useState<ScreeningReaction[]>([])
  
  // ============================================================================
  // Load screening data
  // ============================================================================
  
  useEffect(() => {
    const loadScreening = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      try {
        // In production, fetch from API
        // For demo, simulate loading
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock screening data
        const mockScreening: ScreeningSession = {
          id: screeningId,
          projectId: 'demo-project',
          streamId: 'stream-1',
          title: 'Sample Film - Test Screening',
          description: 'Please watch and provide your feedback. We value your input!',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          accessType: 'public',
          shareUrl: window.location.href,
          viewerCount: 0,
          viewers: [],
          feedbackEnabled: true,
          comments: [],
          reactions: [],
          status: 'active'
        }
        
        setState({
          isLoading: false,
          error: null,
          requiresPassword: false,
          screening: mockScreening,
          videoUrl: '/sample-video.mp4' // Would be real video URL
        })
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load screening. It may have expired or been removed.'
        }))
      }
    }
    
    loadScreening()
  }, [screeningId])
  
  // ============================================================================
  // Password verification
  // ============================================================================
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(false)
    
    // In production, verify password with API
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Simulate password check
    if (password === 'demo') {
      setState(prev => ({ ...prev, requiresPassword: false }))
    } else {
      setPasswordError(true)
    }
  }
  
  // ============================================================================
  // Video controls
  // ============================================================================
  
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])
  
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)
  }, [])
  
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return
    setDuration(videoRef.current.duration)
  }, [])
  
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const time = parseFloat(e.target.value)
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }, [])
  
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])
  
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const vol = parseFloat(e.target.value)
    videoRef.current.volume = vol
    setVolume(vol)
    setIsMuted(vol === 0)
  }, [])
  
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])
  
  // ============================================================================
  // Feedback
  // ============================================================================
  
  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || !viewerName.trim()) return
    
    setSubmitting(true)
    
    const newComment: TimestampedComment = {
      id: `comment-${Date.now()}`,
      viewerId: `viewer-${Date.now()}`,
      viewerName: viewerName.trim(),
      timestamp: currentTime,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
      isResolved: false
    }
    
    // In production, submit to API
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setLocalComments(prev => [...prev, newComment])
    setCommentText('')
    setShowCommentInput(false)
    setSubmitting(false)
  }, [commentText, viewerName, currentTime])
  
  const handleAddReaction = useCallback((type: ReactionType) => {
    const newReaction: ScreeningReaction = {
      id: `reaction-${Date.now()}`,
      viewerId: 'viewer-anon',
      timestamp: currentTime,
      type,
      createdAt: new Date().toISOString()
    }
    
    setLocalReactions(prev => [...prev, newReaction])
  }, [currentTime])
  
  // ============================================================================
  // Helpers
  // ============================================================================
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // ============================================================================
  // Render: Loading
  // ============================================================================
  
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading screening...</p>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Render: Error
  // ============================================================================
  
  if (state.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">
            Screening Unavailable
          </h1>
          <p className="text-gray-400">{state.error}</p>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Render: Password Required
  // ============================================================================
  
  if (state.requiresPassword) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="text-center mb-6">
            <Lock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-white">
              Protected Screening
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Enter the password to view this screening
            </p>
          </div>
          
          <form onSubmit={handlePasswordSubmit}>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mb-4 ${passwordError ? 'border-red-500' : ''}`}
            />
            
            {passwordError && (
              <p className="text-sm text-red-400 mb-4">
                Incorrect password. Please try again.
              </p>
            )}
            
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Enter Screening
            </Button>
          </form>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Render: Screening Viewer
  // ============================================================================
  
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">
              {state.screening?.title}
            </h1>
            {state.screening?.description && (
              <p className="text-sm text-gray-400">{state.screening.description}</p>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            Test Screening
          </div>
        </div>
      </header>
      
      {/* Video Player */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">
        <div className="flex-1">
          {/* Video Container */}
          <div className="relative bg-gray-950 rounded-lg overflow-hidden aspect-video">
            {/* Placeholder video (would be real video in production) */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="text-center">
                <p className="text-gray-400 mb-2">Video Preview</p>
                <p className="text-xs text-gray-600">
                  (Video playback would appear here)
                </p>
              </div>
            </div>
            
            {/* Video element (hidden for demo) */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain hidden"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              <source src={state.videoUrl || ''} type="video/mp4" />
            </video>
            
            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 300} // Default 5 min for demo
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 ${(currentTime / (duration || 300)) * 100}%, #4b5563 ${(currentTime / (duration || 300)) * 100}%)`
                  }}
                />
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-blue-400 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </button>
                  
                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-gray-600 rounded appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Time Display */}
                  <div className="text-sm text-gray-300">
                    {formatTime(currentTime)} / {formatTime(duration || 300)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-blue-400 transition-colors"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reaction Bar */}
          {state.screening?.feedbackEnabled && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-400 mr-2">React:</span>
              
              <button
                onClick={() => handleAddReaction('like')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{localReactions.filter(r => r.type === 'like').length}</span>
              </button>
              
              <button
                onClick={() => handleAddReaction('love')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
              >
                <Heart className="w-4 h-4" />
                <span>{localReactions.filter(r => r.type === 'love').length}</span>
              </button>
              
              <button
                onClick={() => handleAddReaction('confused')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
              >
                <Lightbulb className="w-4 h-4" />
                <span>{localReactions.filter(r => r.type === 'confused').length}</span>
              </button>
              
              <div className="flex-1" />
              
              <button
                onClick={() => setShowCommentInput(!showCommentInput)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment at {formatTime(currentTime)}
              </button>
            </div>
          )}
          
          {/* Comment Input */}
          {showCommentInput && (
            <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">
                  Comment at {formatTime(currentTime)}
                </span>
              </div>
              
              <div className="space-y-3">
                <Input
                  placeholder="Your name"
                  value={viewerName}
                  onChange={(e) => setViewerName(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
                
                <textarea
                  placeholder="Share your feedback..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 resize-none"
                  rows={3}
                />
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCommentInput(false)}
                    className="text-gray-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || !viewerName.trim() || submitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Comments Panel */}
        {state.screening?.feedbackEnabled && (
          <aside className="w-full lg:w-80 bg-gray-900/50 rounded-lg border border-gray-800 p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Feedback
              <span className="ml-auto text-sm text-gray-500">
                {localComments.length}
              </span>
            </h2>
            
            {localComments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No comments yet. Be the first to share your feedback!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-auto">
                {localComments
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white">
                          {comment.viewerName[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white">
                          {comment.viewerName}
                        </span>
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = comment.timestamp
                            }
                            setCurrentTime(comment.timestamp)
                          }}
                          className="ml-auto text-xs text-blue-400 hover:text-blue-300"
                        >
                          {formatTime(comment.timestamp)}
                        </button>
                      </div>
                      <p className="text-sm text-gray-300">{comment.text}</p>
                    </div>
                  ))}
              </div>
            )}
          </aside>
        )}
      </main>
      
      {/* Footer */}
      <footer className="px-4 py-3 bg-gray-900/50 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-500">
          This is a private test screening. Please do not share or distribute.
        </p>
      </footer>
    </div>
  )
}
