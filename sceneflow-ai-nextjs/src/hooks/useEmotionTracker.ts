/**
 * Emotion Tracker Hook
 * 
 * Client-side facial analysis using MediaPipe Face Mesh.
 * Detects emotions locally and outputs only sanitized JSON data.
 * 
 * PRIVACY ARCHITECTURE:
 * - Webcam stream is NEVER rendered to an exportable canvas
 * - Video data stays in memory only
 * - Only emotion scores (0-1) are output
 * - MediaPipe is lazy-loaded only when consent is granted
 * 
 * Detection Capabilities:
 * - Happy (smile detection via mouth landmarks)
 * - Confused (brow furrow detection)
 * - Engaged (gaze on screen center)
 * - Bored (gaze away from screen)
 * - Surprised (eye/mouth opening)
 * 
 * @see /src/lib/types/behavioralAnalytics.ts for types
 */

'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { DetectedEmotion } from '@/lib/types/behavioralAnalytics'

// ============================================================================
// Types
// ============================================================================

export interface EmotionData {
  emotion: DetectedEmotion
  intensity: number    // 0.0 - 1.0
  confidence: number   // 0.0 - 1.0
  gazeOnScreen: boolean
  timestamp: number    // Video timestamp when detected
}

export interface UseEmotionTrackerOptions {
  /** Reference to the video element (to sync timestamps) */
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** Whether emotion tracking is enabled */
  enabled: boolean
  /** Sample rate in Hz (default: 2) */
  sampleRate?: number
  /** Callback when emotion is detected */
  onEmotionDetected: (data: EmotionData) => void
}

export interface UseEmotionTrackerResult {
  /** Whether the tracker is initializing */
  isInitializing: boolean
  /** Whether the tracker is active */
  isActive: boolean
  /** Error message if initialization failed */
  error: string | null
  /** Current detected emotion */
  currentEmotion: DetectedEmotion | null
  /** Start tracking */
  startTracking: () => Promise<void>
  /** Stop tracking */
  stopTracking: () => void
  /** Whether webcam access was granted */
  hasWebcamAccess: boolean
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SAMPLE_RATE = 2 // 2 Hz = 2 samples per second

// Landmark indices for emotion detection (MediaPipe Face Mesh 468 landmarks)
const LANDMARKS = {
  // Mouth corners
  leftMouthCorner: 61,
  rightMouthCorner: 291,
  // Upper and lower lip
  upperLip: 13,
  lowerLip: 14,
  // Eyebrows
  leftEyebrowInner: 107,
  leftEyebrowOuter: 66,
  rightEyebrowInner: 336,
  rightEyebrowOuter: 296,
  // Eyes
  leftEyeUpper: 159,
  leftEyeLower: 145,
  rightEyeUpper: 386,
  rightEyeLower: 374,
  // Nose bridge (for gaze reference)
  noseBridge: 6,
  // Iris centers (for gaze tracking)
  leftIris: 468,
  rightIris: 473,
}

// ============================================================================
// Hook
// ============================================================================

export function useEmotionTracker({
  videoRef,
  enabled,
  sampleRate = DEFAULT_SAMPLE_RATE,
  onEmotionDetected,
}: UseEmotionTrackerOptions): UseEmotionTrackerResult {
  // State
  const [isInitializing, setIsInitializing] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentEmotion, setCurrentEmotion] = useState<DetectedEmotion | null>(null)
  const [hasWebcamAccess, setHasWebcamAccess] = useState(false)
  
  // Refs
  const webcamStreamRef = useRef<MediaStream | null>(null)
  const faceMeshRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastLandmarksRef = useRef<any>(null)
  
  // ============================================================================
  // Get Current Video Time
  // ============================================================================
  
  const getCurrentVideoTime = useCallback((): number => {
    return videoRef.current?.currentTime ?? 0
  }, [videoRef])
  
  // ============================================================================
  // Emotion Analysis (from landmarks)
  // ============================================================================
  
  const analyzeEmotion = useCallback((landmarks: any[]): EmotionData => {
    if (!landmarks || landmarks.length === 0) {
      return {
        emotion: 'unknown',
        intensity: 0,
        confidence: 0,
        gazeOnScreen: false,
        timestamp: getCurrentVideoTime(),
      }
    }
    
    // Get key landmarks
    const leftMouth = landmarks[LANDMARKS.leftMouthCorner]
    const rightMouth = landmarks[LANDMARKS.rightMouthCorner]
    const upperLip = landmarks[LANDMARKS.upperLip]
    const lowerLip = landmarks[LANDMARKS.lowerLip]
    const leftBrowInner = landmarks[LANDMARKS.leftEyebrowInner]
    const rightBrowInner = landmarks[LANDMARKS.rightEyebrowInner]
    const leftEyeUpper = landmarks[LANDMARKS.leftEyeUpper]
    const leftEyeLower = landmarks[LANDMARKS.leftEyeLower]
    const noseBridge = landmarks[LANDMARKS.noseBridge]
    
    // Calculate metrics
    
    // Smile: Distance between mouth corners relative to face width
    const mouthWidth = Math.sqrt(
      Math.pow(rightMouth.x - leftMouth.x, 2) +
      Math.pow(rightMouth.y - leftMouth.y, 2)
    )
    
    // Mouth opening: vertical distance between lips
    const mouthOpening = Math.abs(lowerLip.y - upperLip.y)
    
    // Brow furrow: distance between inner brow points (closer = furrowed)
    const browDistance = Math.sqrt(
      Math.pow(rightBrowInner.x - leftBrowInner.x, 2) +
      Math.pow(rightBrowInner.y - leftBrowInner.y, 2)
    )
    
    // Eye opening
    const eyeOpening = Math.abs(leftEyeLower.y - leftEyeUpper.y)
    
    // Gaze: Is nose bridge roughly centered? (simple approximation)
    const gazeOnScreen = noseBridge.x > 0.3 && noseBridge.x < 0.7 &&
                         noseBridge.y > 0.2 && noseBridge.y < 0.8
    
    // Normalize scores (these thresholds are approximate and may need tuning)
    const smileScore = Math.min(1, Math.max(0, (mouthWidth - 0.15) / 0.1))
    const furrowScore = Math.min(1, Math.max(0, (0.15 - browDistance) / 0.05))
    const surpriseScore = Math.min(1, Math.max(0, (mouthOpening - 0.02) / 0.03))
    const engagementScore = gazeOnScreen ? 0.7 + (1 - Math.abs(noseBridge.x - 0.5)) * 0.3 : 0.2
    
    // Determine dominant emotion
    let emotion: DetectedEmotion = 'neutral'
    let intensity = 0.5
    let confidence = 0.7
    
    if (smileScore > 0.6) {
      emotion = 'happy'
      intensity = smileScore
      confidence = 0.8
    } else if (furrowScore > 0.5) {
      emotion = 'confused'
      intensity = furrowScore
      confidence = 0.7
    } else if (surpriseScore > 0.6) {
      emotion = 'surprised'
      intensity = surpriseScore
      confidence = 0.75
    } else if (engagementScore > 0.7) {
      emotion = 'engaged'
      intensity = engagementScore
      confidence = 0.65
    } else if (!gazeOnScreen) {
      emotion = 'bored'
      intensity = 1 - engagementScore
      confidence = 0.6
    }
    
    return {
      emotion,
      intensity,
      confidence,
      gazeOnScreen,
      timestamp: getCurrentVideoTime(),
    }
  }, [getCurrentVideoTime])
  
  // ============================================================================
  // Start Tracking
  // ============================================================================
  
  const startTracking = useCallback(async () => {
    if (isActive || isInitializing) return
    
    setIsInitializing(true)
    setError(null)
    
    try {
      // Request webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      })
      
      webcamStreamRef.current = stream
      setHasWebcamAccess(true)
      
      // Dynamically import MediaPipe (lazy loading)
      const { FaceMesh } = await import('@mediapipe/face_mesh')
      const { Camera } = await import('@mediapipe/camera_utils')
      
      // Create hidden video element for webcam (never rendered to screen)
      const webcamVideo = document.createElement('video')
      webcamVideo.srcObject = stream
      webcamVideo.autoplay = true
      webcamVideo.playsInline = true
      webcamVideo.muted = true
      
      // Initialize FaceMesh
      const faceMesh = new FaceMesh({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        },
      })
      
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      
      faceMesh.onResults((results: any) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          lastLandmarksRef.current = results.multiFaceLandmarks[0]
        }
      })
      
      faceMeshRef.current = faceMesh
      
      // Create camera handler
      const camera = new Camera(webcamVideo, {
        onFrame: async () => {
          if (faceMeshRef.current && webcamVideo.readyState === 4) {
            await faceMeshRef.current.send({ image: webcamVideo })
          }
        },
        width: 640,
        height: 480,
      })
      
      cameraRef.current = camera
      await camera.start()
      
      // Start sampling at specified rate
      const sampleIntervalMs = 1000 / sampleRate
      
      intervalRef.current = setInterval(() => {
        if (lastLandmarksRef.current) {
          const emotionData = analyzeEmotion(lastLandmarksRef.current)
          setCurrentEmotion(emotionData.emotion)
          onEmotionDetected(emotionData)
        }
      }, sampleIntervalMs)
      
      setIsActive(true)
      setIsInitializing(false)
      
    } catch (err: any) {
      console.error('[EmotionTracker] Failed to start:', err)
      
      let errorMessage = 'Failed to initialize emotion tracking'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access was denied. Please allow camera access to enable emotion tracking.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a webcam.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      setIsInitializing(false)
    }
  }, [isActive, isInitializing, sampleRate, analyzeEmotion, onEmotionDetected])
  
  // ============================================================================
  // Stop Tracking
  // ============================================================================
  
  const stopTracking = useCallback(() => {
    // Stop interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Stop camera
    if (cameraRef.current) {
      cameraRef.current.stop()
      cameraRef.current = null
    }
    
    // Close face mesh
    if (faceMeshRef.current) {
      faceMeshRef.current.close()
      faceMeshRef.current = null
    }
    
    // Stop webcam stream
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop())
      webcamStreamRef.current = null
    }
    
    setIsActive(false)
    setCurrentEmotion(null)
  }, [])
  
  // ============================================================================
  // Auto-start when enabled
  // ============================================================================
  
  useEffect(() => {
    if (enabled && !isActive && !isInitializing) {
      startTracking()
    }
    
    return () => {
      if (isActive) {
        stopTracking()
      }
    }
  }, [enabled, isActive, isInitializing, startTracking, stopTracking])
  
  // ============================================================================
  // Cleanup on unmount
  // ============================================================================
  
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])
  
  return {
    isInitializing,
    isActive,
    error,
    currentEmotion,
    startTracking,
    stopTracking,
    hasWebcamAccess,
  }
}

export default useEmotionTracker
