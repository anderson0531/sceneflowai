'use client'

/**
 * Audience Screening Viewer Page
 * 
 * Public page for test audience to watch screenings with:
 * - Password protection (if enabled)
 * - Consent modal for biometrics
 * - Emoji reactions and comments
 * - Full behavioral analytics tracking
 * 
 * Supports two modes:
 * 1. Premiere mode: Single video with AudiencePlayer
 * 2. Storyboard mode: Scene-based with ScreeningRoomV2
 * 
 * @route /s/[screeningId]
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AudiencePlayer } from '@/components/screening-room/AudiencePlayer'
import { ScreeningRoomV2 } from '@/components/vision/ScreeningRoomV2'
import type { AudienceFeedbackEvent } from '@/components/vision/FullscreenPlayer'
import {
  Loader2,
  AlertCircle,
  Lock,
  Film,
  Clock,
  Eye,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface ScreeningData {
  id: string
  projectId: string
  title: string
  description?: string
  accessType: string
  requiresPassword: boolean
  feedbackEnabled: boolean
  collectBiometrics: boolean
  collectDemographics: boolean
}

interface VideoData {
  screeningType: 'premiere' | 'storyboard' | 'scenes'
  videoUrl?: string
  scenes?: any[]
  productionScenes?: Record<string, any>
  script?: any
  characters?: any[]
  title: string
  description?: string
  feedbackEnabled: boolean
  collectBiometrics: boolean
  collectDemographics: boolean
}

interface PageState {
  phase: 'loading' | 'password' | 'error' | 'expired' | 'ready'
  error?: string
  screening?: ScreeningData
  videoData?: VideoData
  sessionId?: string
}

// ============================================================================
// Component
// ============================================================================

export default function AudienceScreeningPage() {
  const params = useParams()
  const screeningId = params.screeningId as string
  
  const [state, setState] = useState<PageState>({ phase: 'loading' })
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  
  // ============================================================================
  // Load screening metadata
  // ============================================================================
  
  useEffect(() => {
    const loadScreening = async () => {
      try {
        const response = await fetch(`/api/screening/${screeningId}`)
        
        if (response.status === 404) {
          setState({ phase: 'error', error: 'Screening not found' })
          return
        }
        
        if (response.status === 410) {
          setState({ phase: 'expired' })
          return
        }
        
        if (!response.ok) {
          setState({ phase: 'error', error: 'Failed to load screening' })
          return
        }
        
        const data = await response.json()
        
        if (data.screening.requiresPassword) {
          setState({ 
            phase: 'password', 
            screening: data.screening 
          })
        } else {
          // Load video data directly
          await loadVideoData()
        }
      } catch (error) {
        console.error('Failed to load screening:', error)
        setState({ phase: 'error', error: 'Failed to load screening' })
      }
    }
    
    loadScreening()
  }, [screeningId])
  
  // ============================================================================
  // Load video data after access is granted
  // ============================================================================
  
  const loadVideoData = useCallback(async (accessToken?: string) => {
    try {
      const url = accessToken 
        ? `/api/screening/${screeningId}/video?token=${accessToken}`
        : `/api/screening/${screeningId}/video`
        
      const response = await fetch(url)
      
      if (!response.ok) {
        const data = await response.json()
        setState({ phase: 'error', error: data.error || 'Failed to load video' })
        return
      }
      
      const data = await response.json()
      
      // Generate session ID for this viewing
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      
      setState({
        phase: 'ready',
        screening: state.screening,
        videoData: data,
        sessionId,
      })
    } catch (error) {
      console.error('Failed to load video:', error)
      setState({ phase: 'error', error: 'Failed to load video' })
    }
  }, [screeningId, state.screening])
  
  // ============================================================================
  // Password validation
  // ============================================================================
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(false)
    setIsValidating(true)
    
    try {
      const response = await fetch(`/api/screening/${screeningId}/validate-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      
      if (!response.ok) {
        setPasswordError(true)
        return
      }
      
      const data = await response.json()
      await loadVideoData(data.accessToken)
    } catch (error) {
      console.error('Password validation failed:', error)
      setPasswordError(true)
    } finally {
      setIsValidating(false)
    }
  }
  
  // ============================================================================
  // Handle feedback events
  // ============================================================================
  
  const handleAudienceFeedback = useCallback(async (event: AudienceFeedbackEvent) => {
    if (!state.videoData?.feedbackEnabled) return
    
    try {
      if (event.type === 'emoji') {
        await fetch(`/api/screening/${screeningId}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reaction',
            sessionId: state.sessionId,
            timestamp: event.videoTime,
            reactionType: event.data.reactionType,
            emoji: event.data.emoji,
          }),
        })
      }
      // Biometric and behavior events are handled by the analytics service
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }, [screeningId, state.sessionId, state.videoData?.feedbackEnabled])
  
  // ============================================================================
  // Handle session events
  // ============================================================================
  
  const handleSessionStart = useCallback((sessionId: string, cameraConsent: boolean) => {
    console.log('[Screening] Session started:', sessionId, 'Camera:', cameraConsent)
  }, [])
  
  const handleComplete = useCallback((sessionId: string) => {
    console.log('[Screening] Session completed:', sessionId)
  }, [])
  
  // ============================================================================
  // Render: Loading
  // ============================================================================
  
  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading screening...</p>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Render: Expired
  // ============================================================================
  
  if (state.phase === 'expired') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Screening Expired</h1>
          <p className="text-gray-400">
            This screening link has expired. Please contact the creator for a new link.
          </p>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Render: Error
  // ============================================================================
  
  if (state.phase === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Unable to Load</h1>
          <p className="text-gray-400">{state.error}</p>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Render: Password Required
  // ============================================================================
  
  if (state.phase === 'password') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-full max-w-md px-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {state.screening?.title || 'Private Screening'}
              </h1>
              <p className="text-gray-400">
                This screening is password protected
              </p>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-gray-800 border-gray-700 text-white ${
                    passwordError ? 'border-red-500' : ''
                  }`}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-400 text-sm mt-2">Incorrect password</p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={!password || isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Watch Screening
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // Render: Ready - Show Player
  // ============================================================================
  
  if (state.phase === 'ready' && state.videoData) {
    const { videoData, sessionId } = state
    
    // Premiere mode: Single video with AudiencePlayer
    if (videoData.screeningType === 'premiere' && videoData.videoUrl) {
      return (
        <AudiencePlayer
          screeningId={screeningId}
          videoUrl={videoData.videoUrl}
          title={videoData.title}
          description={videoData.description}
          collectDemographics={videoData.collectDemographics}
          onSessionStart={handleSessionStart}
          onComplete={handleComplete}
        />
      )
    }
    
    // Storyboard mode: Scene-based with ScreeningRoomV2
    if (videoData.screeningType === 'storyboard' && videoData.script) {
      return (
        <ScreeningRoomV2
          script={videoData.script}
          characters={videoData.characters || []}
          onClose={() => window.close()}
          sceneProductionState={videoData.productionScenes}
          enableAudienceFeedback={videoData.feedbackEnabled}
          screeningId={screeningId}
          sessionId={sessionId}
          onAudienceFeedback={handleAudienceFeedback}
        />
      )
    }
    
    // Fallback: No playable content
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <Film className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Content Not Ready</h1>
          <p className="text-gray-400">
            This screening doesn&apos;t have playable content yet. 
            Please contact the creator.
          </p>
        </div>
      </div>
    )
  }
  
  return null
}
