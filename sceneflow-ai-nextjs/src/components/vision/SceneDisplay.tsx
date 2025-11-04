'use client'

import React from 'react'
import { Loader } from 'lucide-react'

interface SceneDisplayProps {
  scene: any
  sceneNumber: number
  totalScenes: number
  isLoading: boolean
  showCaptions: boolean
  translatedNarration?: string
  translatedDialogue?: string[]
  kenBurnsIntensity?: 'subtle' | 'medium' | 'dramatic'
}

export function SceneDisplay({ scene, sceneNumber, totalScenes, isLoading, showCaptions, translatedNarration, translatedDialogue, kenBurnsIntensity = 'medium' }: SceneDisplayProps) {        
  if (!scene) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">                                              
        <div className="text-center text-white">
          <p className="text-xl">No scene data available</p>
        </div>
      </div>
    )
  }

    // Fixed animation duration for consistent Ken Burns effect
  // Use shorter durations for more visible animation
  const animationDuration = kenBurnsIntensity === 'subtle' ? 15 : 
                           kenBurnsIntensity === 'dramatic' ? 10 : 12

  // Get animation class name based on intensity
  const animationClass = `ken-burns-${kenBurnsIntensity}`

  return (
    <>
      {/* Ken Burns Animation Keyframes */}
      <style jsx>{`
        @keyframes kenBurnsSubtle {
          from {
            transform: scale(1) translate(0, 0);
          }
          to {
            transform: scale(1.08) translate(-2%, -2%);
          }
        }

        @keyframes kenBurnsMedium {
          from {
            transform: scale(1) translate(0, 0);
          }
          to {
            transform: scale(1.12) translate(-3%, -3%);
          }
        }

        @keyframes kenBurnsDramatic {
          from {
            transform: scale(1) translate(0, 0);
          }
          to {
            transform: scale(1.2) translate(-5%, -5%);
          }
        }

        .ken-burns-subtle {
          animation: kenBurnsSubtle ${animationDuration}s ease-in-out infinite alternate;
        }

        .ken-burns-medium {
          animation: kenBurnsMedium ${animationDuration}s ease-in-out infinite alternate;
        }

        .ken-burns-dramatic {
          animation: kenBurnsDramatic ${animationDuration}s ease-in-out infinite alternate;
        }
      `}</style>

      <div className="absolute inset-0 w-full h-full">
        {/* Full-Screen Background Image with Ken Burns Effect */}
        {scene.imageUrl ? (
          <div 
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${animationClass}`}
            style={{ 
              backgroundImage: `url(${scene.imageUrl})`,
              // Ensure image is larger than container to allow zoom/pan effect
              backgroundSize: '120%'
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />                                                                           
        )}

        {/* Caption Overlay */}
        {showCaptions && (
          <div className="absolute bottom-20 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-8 pb-6">
            <div className="max-w-4xl mx-auto text-center">
              {/* Narration Caption - use translated if available */}
              {(translatedNarration || scene.narration) && (
                <div className="text-xl md:text-2xl text-white leading-relaxed mb-6 opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]">
                  {translatedNarration || scene.narration}
                </div>
              )}

              {/* Dialogue Captions - use translated if available */}
              {scene.dialogue && scene.dialogue.length > 0 && (
                <div className="space-y-4">
                  {scene.dialogue.slice(0, 2).map((d: any, idx: number) => {
                    const displayText = translatedDialogue?.[idx] || d.line
                    return (
                      <div key={idx} className="opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]" style={{ animationDelay: `${idx * 0.5}s` }}>
                        <div className="text-xl md:text-2xl text-white font-light italic leading-relaxed mb-2">
                          "{displayText}"
                        </div>
                        <div className="text-sm text-gray-300">
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

