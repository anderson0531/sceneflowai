'use client'

import React from 'react'
import { Loader, CheckCircle } from 'lucide-react'

interface GenerationProgressProps {
  progress: {
    script: { complete: boolean; progress: number }
    characters: { complete: boolean; progress: number; total: number }
    scenes: { complete: boolean; progress: number; total: number }
  }
}

export function GenerationProgress({ progress }: GenerationProgressProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center gap-2 mb-3">
        <Loader className="w-4 h-4 animate-spin text-sf-primary" />
        <span className="font-semibold text-gray-900 dark:text-gray-100">Generating Vision...</span>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          {progress.script.complete ? (
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : (
            <Loader className="w-4 h-4 animate-spin text-sf-primary flex-shrink-0" />
          )}
          <span className="text-gray-700 dark:text-gray-300">Script generation</span>
        </div>
        
        <div className="flex items-center gap-2">
          {progress.characters.complete ? (
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : (
            <Loader className="w-4 h-4 animate-spin text-sf-primary flex-shrink-0" />
          )}
          <span className="text-gray-700 dark:text-gray-300">
            Character references 
            {progress.characters.total > 0 && (
              <span className="text-gray-500 dark:text-gray-400"> ({progress.characters.progress}/{progress.characters.total})</span>
            )}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {progress.scenes.complete ? (
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : (
            <Loader className="w-4 h-4 animate-spin text-sf-primary flex-shrink-0" />
          )}
          <span className="text-gray-700 dark:text-gray-300">
            Scene images
            {progress.scenes.total > 0 && (
              <span className="text-gray-500 dark:text-gray-400"> ({progress.scenes.progress}/{progress.scenes.total})</span>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

