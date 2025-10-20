'use client'

import React from 'react'
import { Loader } from 'lucide-react'

interface SceneDisplayProps {
  scene: any
  sceneNumber: number
  totalScenes: number
  isLoading: boolean
}

export function SceneDisplay({ scene, sceneNumber, totalScenes, isLoading }: SceneDisplayProps) {
  if (!scene) {
    return (
      <div className="text-center text-white">
        <p className="text-xl">No scene data available</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl w-full px-8">
      {/* Scene Image Background */}
      {scene.imageUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
          style={{ backgroundImage: `url(${scene.imageUrl})` }}
        />
      )}

      {/* Scene Content */}
      <div className="relative z-10 text-center space-y-8">
        {/* Progress Indicator */}
        <div className="text-sm text-gray-400 font-medium">
          Scene {sceneNumber} of {totalScenes}
        </div>

        {/* Scene Heading */}
        <div className="text-2xl md:text-3xl font-bold text-white mb-6 tracking-wide">
          {scene.heading}
        </div>

        {/* Scene Image (if available) */}
        {scene.imageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden shadow-2xl max-w-2xl mx-auto">
            <img 
              src={scene.imageUrl} 
              alt={scene.heading}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Action/Narration */}
        {scene.action && (
          <div className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto whitespace-pre-wrap mb-6">
            {scene.action.split('\n').slice(0, 3).join('\n')}
          </div>
        )}

        {/* Dialogue */}
        {scene.dialogue && scene.dialogue.length > 0 && (
          <div className="space-y-4 max-w-xl mx-auto">
            {scene.dialogue.slice(0, 3).map((d: any, idx: number) => (
              <div key={idx} className="text-center">
                <div className="text-xl md:text-2xl text-white font-light italic leading-relaxed mb-2">
                  "{d.line}"
                </div>
                <div className="text-sm text-gray-400">
                  — {d.character}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-blue-400">
            <Loader className="w-5 h-5 animate-spin" />
            <span className="text-sm">Generating audio...</span>
          </div>
        )}

        {/* Visual Indicator for Scene Duration */}
        {scene.duration && (
          <div className="text-xs text-gray-500 mt-4">
            Duration: ~{scene.duration}s
          </div>
        )}
      </div>
    </div>
  )
}

