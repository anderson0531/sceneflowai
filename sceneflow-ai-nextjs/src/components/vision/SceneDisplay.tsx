'use client'

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { Loader } from 'lucide-react'
import { getKenBurnsConfig, generateKenBurnsKeyframes, getKenBurnsConfigFromKeyframes } from '@/lib/animation/kenBurns'
import type { KenBurnsIntensity } from '@/lib/animation/kenBurns'
import type { SceneSegment, SceneProductionData } from '@/components/vision/scene-production/types'

interface KeyframeImage {
  url: string
  duration: number // seconds for this keyframe
  segmentIndex: number
  isStartFrame: boolean // true = startFrame, false = endFrame
}

interface SceneDisplayProps {
  scene: any
  sceneNumber: number
  sceneIndex: number // Added for alternating direction calculations
  totalScenes: number
  isLoading: boolean
  showCaptions: boolean
  translatedNarration?: string
  translatedDialogue?: string[]
  kenBurnsIntensity?: KenBurnsIntensity
  // New: Production data for keyframe images
  productionData?: SceneProductionData
  // New: Scene audio duration for timing sync
  sceneDuration?: number
}

/**
 * Build an array of keyframe images from segments with timing
 * Falls back to scene.imageUrl if no segment keyframes exist
 * 
 * NOTE: Only uses START frame images (not end frames) for cleaner
 * visual progression through the animatic.
 */
function buildKeyframeSequence(
  scene: any,
  productionData?: SceneProductionData,
  fallbackDuration: number = 4
): KeyframeImage[] {
  const keyframes: KeyframeImage[] = []
  
  if (!productionData?.isSegmented || !productionData?.segments?.length) {
    // No segments - use scene image as single keyframe
    if (scene.imageUrl) {
      return [{
        url: scene.imageUrl,
        duration: fallbackDuration,
        segmentIndex: 0,
        isStartFrame: true
      }]
    }
    return []
  }
  
  // Build keyframes from segments based on frameSelection and imageDuration settings
  productionData.segments.forEach((segment, idx) => {
    const segmentDuration = (segment.endTime || 0) - (segment.startTime || 0)
    
    // Get frame URLs from multiple possible locations
    const startUrl = segment.startFrameUrl || segment.references?.startFrameUrl
    const endUrl = segment.endFrameUrl || segment.references?.endFrameUrl
    
    // Use imageDuration if set, otherwise default to segmentDuration * 2
    const totalDuration = segment.imageDuration ?? (segmentDuration || fallbackDuration) * 2
    const frameSelection = segment.frameSelection ?? 'start'
    
    if (frameSelection === 'start') {
      // Start frame only - use full duration
      if (startUrl) {
        keyframes.push({
          url: startUrl,
          duration: totalDuration,
          segmentIndex: idx,
          isStartFrame: true
        })
      }
    } else if (frameSelection === 'end') {
      // End frame only - use full duration, fall back to start if end unavailable
      const url = endUrl || startUrl
      if (url) {
        keyframes.push({
          url: url,
          duration: totalDuration,
          segmentIndex: idx,
          isStartFrame: !endUrl
        })
      }
    } else if (frameSelection === 'both') {
      // Both frames - split duration evenly
      const halfDuration = totalDuration / 2
      if (startUrl) {
        keyframes.push({
          url: startUrl,
          duration: halfDuration,
          segmentIndex: idx,
          isStartFrame: true
        })
      }
      if (endUrl) {
        keyframes.push({
          url: endUrl,
          duration: halfDuration,
          segmentIndex: idx,
          isStartFrame: false
        })
      } else if (startUrl && !endUrl) {
        // If end frame missing, extend start frame to full duration
        keyframes[keyframes.length - 1].duration = totalDuration
      }
    }
  })
  
  // Fallback to scene image if no keyframes found
  if (keyframes.length === 0 && scene.imageUrl) {
    return [{
      url: scene.imageUrl,
      duration: fallbackDuration,
      segmentIndex: 0,
      isStartFrame: true
    }]
  }
  
  return keyframes
}

export function SceneDisplay({ 
  scene, 
  sceneNumber, 
  sceneIndex,
  totalScenes, 
  isLoading, 
  showCaptions, 
  translatedNarration, 
  translatedDialogue, 
  kenBurnsIntensity = 'medium',
  productionData,
  sceneDuration
}: SceneDisplayProps) {
  // Build keyframe sequence
  const keyframes = useMemo(() => 
    buildKeyframeSequence(scene, productionData, sceneDuration || 4),
    [scene, productionData, sceneDuration]
  )
  
  // Current keyframe index for cycling
  const [currentKeyframeIndex, setCurrentKeyframeIndex] = useState(0)
  const [prevKeyframeIndex, setPrevKeyframeIndex] = useState(-1)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Reset keyframe index when scene changes
  useEffect(() => {
    setCurrentKeyframeIndex(0)
    setPrevKeyframeIndex(-1)
    setIsTransitioning(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }, [sceneIndex, keyframes.length])
  
  // Cycle through keyframes with timing
  useEffect(() => {
    if (keyframes.length <= 1) return
    
    const currentKeyframe = keyframes[currentKeyframeIndex]
    if (!currentKeyframe) return
    
    // Schedule next keyframe transition
    timerRef.current = setTimeout(() => {
      setPrevKeyframeIndex(currentKeyframeIndex)
      setIsTransitioning(true)
      
      // After crossfade starts, update index
      setTimeout(() => {
        setCurrentKeyframeIndex((prev) => (prev + 1) % keyframes.length)
        // Clear transition after fade completes
        setTimeout(() => {
          setIsTransitioning(false)
        }, 1000) // 1s crossfade
      }, 50)
    }, currentKeyframe.duration * 1000)
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [currentKeyframeIndex, keyframes])
  
  // Get current segment's keyframe settings for Ken Burns
  const currentKeyframe = keyframes[currentKeyframeIndex]
  const currentSegment = productionData?.segments?.[currentKeyframe?.segmentIndex || 0]
  
  // Get Ken Burns config - use segment settings if available, else scene-level
  const kenBurnsConfig = useMemo(() => {
    if (currentSegment?.keyframeSettings && !currentSegment.keyframeSettings.useAutoDetect) {
      const segmentDuration = currentKeyframe?.duration || 4
      return getKenBurnsConfigFromKeyframes(currentSegment.keyframeSettings as any, segmentDuration)
    }
    return getKenBurnsConfig(scene, sceneIndex, kenBurnsIntensity)
  }, [scene, sceneIndex, kenBurnsIntensity, currentSegment, currentKeyframe])
  
  // Generate unique animation name per keyframe
  const animationName = `kenBurns-${sceneIndex}-${currentKeyframeIndex}`
  
  // Generate keyframes CSS
  const keyframesCSS = useMemo(() => {
    return generateKenBurnsKeyframes(animationName, kenBurnsConfig)
  }, [animationName, kenBurnsConfig])
        
  if (!scene) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">                                              
        <div className="text-center text-white">
          <p className="text-xl">No scene data available</p>
        </div>
      </div>
    )
  }

  const currentImageUrl = currentKeyframe?.url || scene.imageUrl
  const prevImageUrl = prevKeyframeIndex >= 0 ? keyframes[prevKeyframeIndex]?.url : null

  return (
    <>
      {/* Scene-Aware Ken Burns Animation Keyframes */}
      <style jsx>{`
        ${keyframesCSS}
        
        .ken-burns-animated {
          animation: ${animationName} ${kenBurnsConfig.duration}s ${kenBurnsConfig.easing} infinite alternate;
          transform-origin: center center;
          will-change: transform;
        }
        
        .keyframe-crossfade-enter {
          opacity: 0;
          animation: fadeIn 1s ease-in-out forwards;
        }
        
        .keyframe-crossfade-exit {
          opacity: 1;
          animation: fadeOut 1s ease-in-out forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>

      <div className="absolute inset-0 w-full h-full">
        {/* Previous keyframe image (fading out during transition) */}
        {isTransitioning && prevImageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat keyframe-crossfade-exit"
            style={{ 
              backgroundImage: `url(${prevImageUrl})`,
              backgroundSize: '115%',
              zIndex: 1
            }}
          />
        )}
        
        {/* Current keyframe image with Ken Burns Effect */}
        {currentImageUrl ? (
          <div 
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat ken-burns-animated ${isTransitioning ? 'keyframe-crossfade-enter' : ''}`}
            style={{ 
              backgroundImage: `url(${currentImageUrl})`,
              backgroundSize: '115%',
              zIndex: isTransitioning ? 2 : 1
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />                                                                           
        )}

        {/* Keyframe indicator (debug - can be removed in production) */}
        {keyframes.length > 1 && (
          <div className="absolute top-4 right-4 z-50 bg-black/50 px-2 py-1 rounded text-xs text-white/70">
            Frame {currentKeyframeIndex + 1}/{keyframes.length}
          </div>
        )}

        {/* Caption Overlay - Responsive positioning */}
        {showCaptions && (
          <div className="absolute bottom-24 sm:bottom-20 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 sm:p-8 pb-4 sm:pb-6">
            <div className="max-w-4xl mx-auto text-center">
              {/* Narration Caption - use translated if available */}
              {(translatedNarration || scene.narration) && (
                <div className="text-sm sm:text-base md:text-xl lg:text-2xl text-white leading-relaxed mb-3 sm:mb-4 md:mb-6 opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]">
                  {translatedNarration || scene.narration}
                </div>
              )}

              {/* Dialogue Captions - use translated if available */}
              {scene.dialogue && scene.dialogue.length > 0 && (
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {scene.dialogue.slice(0, 2).map((d: any, idx: number) => {
                    const displayText = translatedDialogue?.[idx] || d.line
                    return (
                      <div key={idx} className="opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]" style={{ animationDelay: `${idx * 0.5}s` }}>
                        <div className="text-sm sm:text-base md:text-xl lg:text-2xl text-white font-light italic leading-relaxed mb-1 sm:mb-2">
                          "{displayText}"
                        </div>
                        <div className="text-xs sm:text-sm text-gray-300">
                          — {d.character}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-blue-400 mt-4">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Generating audio...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

