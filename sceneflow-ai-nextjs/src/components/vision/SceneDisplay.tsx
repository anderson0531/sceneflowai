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

    // Fixed animation duration for consistent pan effect
  // Use shorter durations for more visible animation
  const animationDuration = kenBurnsIntensity === 'subtle' ? 15 : 
                           kenBurnsIntensity === 'dramatic' ? 10 : 12

  // Get animation class name based on intensity
  const animationClass = `pan-${kenBurnsIntensity}`

  return (
    <>
      {/* Pan Animation Keyframes */}
      <style jsx>{`
        @keyframes panSubtle {
          from {
            transform: translate(0, 0);
          }
          to {
            transform: translate(-3%, -3%);
          }
        }

        @keyframes panMedium {
          from {
            transform: translate(0, 0);
          }
          to {
            transform: translate(-5%, -5%);
          }
        }

        @keyframes panDramatic {
          from {
            transform: translate(0, 0);
          }
          to {
            transform: translate(-8%, -8%);
          }
        }

        .pan-subtle {
          animation: panSubtle ${animationDuration}s ease-in-out infinite alternate;
        }

        .pan-medium {
          animation: panMedium ${animationDuration}s ease-in-out infinite alternate;
        }

        .pan-dramatic {
          animation: panDramatic ${animationDuration}s ease-in-out infinite alternate;
        }
      `}</style>

      <div className="absolute inset-0 w-full h-full">
        {/* Full-Screen Background Image with Pan Effect */}
        {scene.imageUrl ? (
          <div 
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${animationClass}`}
            style={{ 
              backgroundImage: `url(${scene.imageUrl})`,
              // Ensure image is larger than container to allow pan effect
              backgroundSize: '110%'
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

