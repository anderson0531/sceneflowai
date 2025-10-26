'use client'

import { Badge } from '@/components/ui/badge'
import { Loader, Eye, CheckCircle, AlertCircle, Clock, Users, Music, Volume2 } from 'lucide-react'

interface PreviewPanelProps {
  originalScene: any
  previewScene: any | null
  isGenerating: boolean
  changes: string[]
}

export function PreviewPanel({ originalScene, previewScene, isGenerating, changes }: PreviewPanelProps) {
  if (isGenerating) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Preview Changes</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Generating preview...</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">This may take a few moments</p>
          </div>
        </div>
      </div>
    )
  }

  if (!previewScene) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Preview Changes</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Eye className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">No preview available</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Select recommendations or add instructions to generate a preview
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Preview Changes</h3>
        {changes.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {changes.length} changes
          </Badge>
        )}
      </div>

      {/* Changes Summary */}
      {changes.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
            <CheckCircle className="w-3 h-3 inline mr-1" />
            Applied Changes
          </h4>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {changes.length} recommendation{changes.length !== 1 ? 's' : ''} selected
          </div>
        </div>
      )}

      {/* Preview Scene */}
      <div className="space-y-4">
        {/* Scene Header */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">SCENE HEADING</h4>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">
              {typeof previewScene.heading === 'string' ? previewScene.heading : previewScene.heading?.text || 'Untitled Scene'}
            </p>
            {originalScene.heading !== previewScene.heading && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                Changed
              </Badge>
            )}
          </div>
        </div>

        {/* Action Description */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">ACTION</h4>
          <div className="relative">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">
              {previewScene.action || 'No action description'}
            </p>
            {originalScene.action !== previewScene.action && (
              <Badge variant="outline" className="absolute -top-1 -right-1 text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                Changed
              </Badge>
            )}
          </div>
        </div>

        {/* Narration */}
        {previewScene.narration && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              NARRATION
            </h4>
            <div className="relative">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                {previewScene.narration}
              </p>
              {originalScene.narration !== previewScene.narration && (
                <Badge variant="outline" className="absolute -top-1 -right-1 text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                  Changed
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Dialogue */}
        {previewScene.dialogue && previewScene.dialogue.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              DIALOGUE
            </h4>
            <div className="space-y-2">
              {previewScene.dialogue.map((line: any, index: number) => {
                const originalLine = originalScene.dialogue?.[index]
                const originalText = originalLine?.line || originalLine?.text || ''
                const newText = line.line || line.text || ''
                const isChanged = !originalLine || originalText !== newText
                
                return (
                  <div key={index} className="text-sm relative">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {line.character}:
                    </span>
                    <span className="ml-2 text-gray-700 dark:text-gray-300 break-words">
                      {line.line || line.text || ''}
                    </span>
                    {isChanged && (
                      <Badge variant="outline" className="ml-2 text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                        Changed
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Music */}
        {previewScene.music && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Music className="w-3 h-3" />
              MUSIC
            </h4>
            <div className="relative">
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                {typeof previewScene.music === 'string' ? previewScene.music : previewScene.music?.description || ''}
              </p>
              {originalScene.music !== previewScene.music && (
                <Badge variant="outline" className="absolute -top-1 -right-1 text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                  Changed
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Sound Effects */}
        {previewScene.sfx && previewScene.sfx.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              SOUND EFFECTS
            </h4>
            <div className="flex flex-wrap gap-1 relative">
              {previewScene.sfx.map((effect: any, index: number) => {
                const effectText = typeof effect === 'string' ? effect : effect?.description || ''
                return (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {effectText}
                  </Badge>
                )
              })}
              {JSON.stringify(originalScene.sfx) !== JSON.stringify(previewScene.sfx) && (
                <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                  Changed
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Duration Info */}
        {previewScene.duration && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Duration:</span>
              <span className="text-gray-600 dark:text-gray-400">
                {Math.round(previewScene.duration / 8) * 8}s
              </span>
              {originalScene.duration !== previewScene.duration && (
                <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                  Updated
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comparison Note */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium">Preview Mode</p>
            <p>This is a preview of your changes. Click "Apply Changes" to save them to your script.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
