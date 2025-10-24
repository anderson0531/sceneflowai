'use client'

import React from 'react'
import { Loader } from 'lucide-react'

interface SceneDisplayProps {
  scene: any
  sceneNumber: number
  totalScenes: number
  isLoading: boolean
  showCaptions: boolean
}

export function SceneDisplay({ scene, sceneNumber, totalScenes, isLoading, showCaptions }: SceneDisplayProps) {
  if (!scene) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl">No scene data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Full-Screen Background Image */}
      {scene.imageUrl ? (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${scene.imageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
      )}

      {/* Caption Overlay */}
      {showCaptions && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Narration Caption */}
            {scene.narration && (
              <div className="text-xl md:text-2xl text-white leading-relaxed mb-6 opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]">
                {scene.narration}
              </div>
            )}

            {/* Dialogue Captions */}
            {scene.dialogue && scene.dialogue.length > 0 && (
              <div className="space-y-4">
                {scene.dialogue.slice(0, 2).map((d: any, idx: number) => (
                  <div key={idx} className="opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]" style={{ animationDelay: `${idx * 0.5}s` }}>
                    <div className="text-xl md:text-2xl text-white font-light italic leading-relaxed mb-2">
                      "{d.line}"
                    </div>
                    <div className="text-sm text-gray-300">
                      — {d.character}
                    </div>
                  </div>
                ))}
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
  )
}

