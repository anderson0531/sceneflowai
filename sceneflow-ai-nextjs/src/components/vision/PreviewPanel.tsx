'use client'

import { Badge } from '@/components/ui/badge'
import { Loader, Eye, CheckCircle, AlertCircle, Clock, Users, Music, Volume2 } from 'lucide-react'
import {
  countSelectedChanges,
  diffSceneChanges,
  type SceneChangeKey,
} from '@/lib/script/sceneDiffChanges'

interface PreviewPanelProps {
  originalScene: any
  previewScene: any | null
  isGenerating: boolean
  changes: string[]
  deselectedChanges?: Set<string>
  onToggleChange?: (key: SceneChangeKey) => void
}

function headingText(scene: any): string {
  if (!scene?.heading) return ''
  if (typeof scene.heading === 'string') return scene.heading.trim()
  return String(scene.heading?.text ?? '').trim()
}

function ChangeControl({
  changeKey,
  changed,
  deselectedChanges,
  onToggleChange,
}: {
  changeKey: SceneChangeKey
  changed: boolean
  deselectedChanges?: Set<string>
  onToggleChange?: (key: SceneChangeKey) => void
}) {
  if (!changed) return null

  const showCheckbox = Boolean(onToggleChange)
  const isSelected = !deselectedChanges?.has(changeKey)

  return (
    <div className="flex items-center gap-2 shrink-0">
      {showCheckbox && (
        <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleChange?.(changeKey)}
            className="rounded"
            aria-label={`Include ${changeKey} change`}
          />
          Apply
        </label>
      )}
      <Badge
        variant="outline"
        className={`text-xs ${
          isSelected
            ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
            : 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
        }`}
      >
        {isSelected ? 'Changed' : 'Skipped'}
      </Badge>
    </div>
  )
}

export function PreviewPanel({
  originalScene,
  previewScene,
  isGenerating,
  changes,
  deselectedChanges,
  onToggleChange,
}: PreviewPanelProps) {
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

  const changeKeys = diffSceneChanges(originalScene, previewScene)
  const changeSet = new Set(changeKeys)
  const { selected, total } = countSelectedChanges(changeKeys, deselectedChanges ?? new Set())
  const dimIfSkipped = (key: SceneChangeKey) =>
    deselectedChanges?.has(key) ? 'opacity-50' : ''

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">Preview Changes</h3>
        <div className="flex items-center gap-2">
          {onToggleChange && total > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selected} of {total} changes selected
            </Badge>
          )}
          {changes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {changes.length} changes
            </Badge>
          )}
        </div>
      </div>

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

      <div className="space-y-4">
        <div className={dimIfSkipped('heading')}>
          <h4 className="text-sm font-medium text-gray-500 mb-1">SCENE HEADING</h4>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {headingText(previewScene) || 'Untitled Scene'}
            </p>
            <ChangeControl
              changeKey="heading"
              changed={changeSet.has('heading')}
              deselectedChanges={deselectedChanges}
              onToggleChange={onToggleChange}
            />
          </div>
        </div>

        <div className={dimIfSkipped('visualDescription')}>
          <h4 className="text-sm font-medium text-gray-500 mb-1">SCENE DESCRIPTION</h4>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words flex-1">
              {previewScene.visualDescription || 'No scene description'}
            </p>
            <ChangeControl
              changeKey="visualDescription"
              changed={changeSet.has('visualDescription')}
              deselectedChanges={deselectedChanges}
              onToggleChange={onToggleChange}
            />
          </div>
        </div>

        <div className={dimIfSkipped('action')}>
          <h4 className="text-sm font-medium text-gray-500 mb-1">ACTION</h4>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words flex-1">
              {previewScene.action || 'No action description'}
            </p>
            <ChangeControl
              changeKey="action"
              changed={changeSet.has('action')}
              deselectedChanges={deselectedChanges}
              onToggleChange={onToggleChange}
            />
          </div>
        </div>

        {(previewScene.narration || changeSet.has('narration')) && (
          <div className={dimIfSkipped('narration')}>
            <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              NARRATION
            </h4>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words flex-1">
                {previewScene.narration}
              </p>
              <ChangeControl
                changeKey="narration"
                changed={changeSet.has('narration')}
                deselectedChanges={deselectedChanges}
                onToggleChange={onToggleChange}
              />
            </div>
          </div>
        )}

        {previewScene.dialogue && previewScene.dialogue.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              DIALOGUE
            </h4>
            <div className="space-y-2">
              {previewScene.dialogue.map((line: any, index: number) => {
                const changeKey = `dialogue:${index}` as SceneChangeKey
                const isChanged = changeSet.has(changeKey)

                return (
                  <div
                    key={index}
                    className={`text-sm flex items-start justify-between gap-2 ${dimIfSkipped(changeKey)}`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {line.character}:
                      </span>
                      <span className="ml-2 text-gray-700 dark:text-gray-300 break-words">
                        {line.line || line.text || ''}
                      </span>
                    </div>
                    <ChangeControl
                      changeKey={changeKey}
                      changed={isChanged}
                      deselectedChanges={deselectedChanges}
                      onToggleChange={onToggleChange}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {(previewScene.music || changeSet.has('music')) && (
          <div className={dimIfSkipped('music')}>
            <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Music className="w-3 h-3" />
              MUSIC
            </h4>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words flex-1">
                {typeof previewScene.music === 'string'
                  ? previewScene.music
                  : previewScene.music?.description || ''}
              </p>
              <ChangeControl
                changeKey="music"
                changed={changeSet.has('music')}
                deselectedChanges={deselectedChanges}
                onToggleChange={onToggleChange}
              />
            </div>
          </div>
        )}

        {((Array.isArray(previewScene.sfx) && previewScene.sfx.length > 0) ||
          changeSet.has('sfx')) && (
          <div className={dimIfSkipped('sfx')}>
            <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              SOUND EFFECTS
            </h4>
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1 flex-1">
                {(Array.isArray(previewScene.sfx) ? previewScene.sfx : []).map(
                  (effect: any, index: number) => {
                    const effectText =
                      typeof effect === 'string' ? effect : effect?.description || ''
                    return (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {effectText}
                      </Badge>
                    )
                  }
                )}
              </div>
              <ChangeControl
                changeKey="sfx"
                changed={changeSet.has('sfx')}
                deselectedChanges={deselectedChanges}
                onToggleChange={onToggleChange}
              />
            </div>
          </div>
        )}

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

      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium">Preview Mode</p>
            <p>
              Uncheck any change you do not want to keep. Click &quot;Apply Changes&quot; to save
              only the selected updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
