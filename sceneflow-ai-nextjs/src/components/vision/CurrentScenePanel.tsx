'use client'

import { Badge } from '@/components/ui/badge'
import { Clock, Users, Music, Volume2 } from 'lucide-react'

interface CurrentScenePanelProps {
  scene: any
}

export function CurrentScenePanel({ scene }: CurrentScenePanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-3">Current Scene</h3>
        
        {/* Scene Header */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-1">SCENE HEADING</h4>
          <p className="text-sm font-semibold">{scene.heading || 'Untitled Scene'}</p>
        </div>

        {/* Action Description */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-1">ACTION</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {scene.action || 'No action description'}
          </p>
        </div>

        {/* Narration */}
        {scene.narration && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              NARRATION
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {scene.narration}
            </p>
          </div>
        )}

        {/* Dialogue */}
        {scene.dialogue && scene.dialogue.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              DIALOGUE
            </h4>
            <div className="space-y-2">
              {scene.dialogue.map((line: any, index: number) => (
                <div key={index} className="text-sm">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {line.character}:
                  </span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Music */}
        {scene.music && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Music className="w-3 h-3" />
              MUSIC
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {scene.music}
            </p>
          </div>
        )}

        {/* Sound Effects */}
        {scene.sfx && scene.sfx.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              SOUND EFFECTS
            </h4>
            <div className="flex flex-wrap gap-1">
              {scene.sfx.map((effect: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {effect}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Duration Info */}
        {scene.duration && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Duration:</span>
              <span className="text-gray-600 dark:text-gray-400">
                {Math.round(scene.duration / 8) * 8}s
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
