'use client'

import React, { useMemo } from 'react'
import { Loader } from 'lucide-react'
import { getKenBurnsConfig, generateKenBurnsKeyframes } from '@/lib/animation/kenBurns'
import type { KenBurnsIntensity } from '@/lib/animation/kenBurns'

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
  kenBurnsIntensity = 'medium' 
}: SceneDisplayProps) {        
  if (!scene) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">                                              
        <div className="text-center text-white">
          <p className="text-xl">No scene data available</p>
        </div>
      </div>
    )
  }

  // Get scene-aware Ken Burns configuration
  // Memoize to prevent recalculation on every render
  const kenBurnsConfig = useMemo(() => {
    return getKenBurnsConfig(scene, sceneIndex, kenBurnsIntensity)
  }, [scene, sceneIndex, kenBurnsIntensity])
  
  // Generate unique animation name per scene to allow different directions
  const animationName = `kenBurns-${sceneIndex}`
  
  // Generate keyframes CSS for this scene
  const keyframesCSS = useMemo(() => {
    return generateKenBurnsKeyframes(animationName, kenBurnsConfig)
  }, [animationName, kenBurnsConfig])

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
      `}</style>

      <div className="absolute inset-0 w-full h-full">
        {/* Full-Screen Background Image with Scene-Aware Ken Burns Effect */}
        {scene.imageUrl ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat ken-burns-animated"
            style={{ 
              backgroundImage: `url(${scene.imageUrl})`,
              // Ensure image is larger than container to allow pan effect
              backgroundSize: '115%'
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />                                                                           
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

