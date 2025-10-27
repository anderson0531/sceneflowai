'use client'

import { Badge } from '@/components/ui/badge'

interface ScriptComparisonPanelProps {
  originalScript: any
  optimizedScript: any
  changesSummary: Array<{
    category: string
    changes: string
    rationale: string
  }>
}

export function ScriptComparisonPanel({
  originalScript,
  optimizedScript,
  changesSummary
}: ScriptComparisonPanelProps) {
  return (
    <div className="space-y-6">
      {/* Changes Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Optimization Summary
        </h3>
        <div className="space-y-3">
          {changesSummary.map((change, idx) => (
            <div key={idx} className="text-sm">
              <div className="font-medium text-blue-800 dark:text-blue-200">
                {change.category}
              </div>
              <div className="text-gray-700 dark:text-gray-300 mt-1">
                {change.changes}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-xs mt-1 italic">
                {change.rationale}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Scene-by-Scene Comparison */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Scene-by-Scene Changes
        </h3>
        {optimizedScript.scenes?.map((scene: any, idx: number) => {
          const originalScene = originalScript.scenes?.[idx]
          if (!originalScene) return null
          
          return (
            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
              <div className="font-medium mb-2 text-gray-900 dark:text-gray-100">
                Scene {idx + 1}: {scene.heading || 'Untitled'}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1 font-medium">Original</div>
                  <div className="text-gray-700 dark:text-gray-300 line-clamp-3">
                    {originalScene.narration || originalScene.action || 'No content'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-500 mb-1 font-medium">Optimized</div>
                  <div className="text-gray-900 dark:text-gray-100 line-clamp-3">
                    {scene.narration || scene.action || 'No content'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

