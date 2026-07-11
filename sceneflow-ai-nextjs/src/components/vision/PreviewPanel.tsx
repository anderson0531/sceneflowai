'use client'

import { Badge } from '@/components/ui/badge'
import {
  Loader,
  Eye,
  AlertCircle,
  Clock,
  Music,
  Clapperboard,
  ImageIcon,
  Sparkles,
} from 'lucide-react'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { beatsWithChangedFingerprints } from '@/lib/script/structuredSceneRevision'
import {
  beatChangeSummary,
  beatDisplayText,
  countSelectedChanges,
  diffSceneChanges,
  directionDescriptionText,
  directionFacetSummary,
  isStructuredBeatPreview,
  type SceneChangeKey,
} from '@/lib/script/sceneDiffChanges'

interface PreviewPanelProps {
  originalScene: any
  previewScene: any | null
  isGenerating: boolean
  changes: string[]
  deselectedChanges?: Set<string>
  onToggleChange?: (key: SceneChangeKey) => void
  preserveSceneDirection?: boolean
  preserveBeatFrames?: boolean
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

function StructuredBeatPreview({
  originalScene,
  previewScene,
  changeSet,
  deselectedChanges,
  onToggleChange,
}: {
  originalScene: any
  previewScene: any
  changeSet: Set<string>
  deselectedChanges?: Set<string>
  onToggleChange?: (key: SceneChangeKey) => void
}) {
  const candidateBeats = getSceneBeats(previewScene)
  const originalBeats = getSceneBeats(originalScene)
  const allBeatIds = new Set([
    ...originalBeats.map((b) => b.beatId),
    ...candidateBeats.map((b) => b.beatId),
  ])

  return (
    <div className="space-y-2">
      {Array.from(allBeatIds).map((beatId) => {
        const summary = beatChangeSummary(originalScene, previewScene, beatId)
        if (summary.status === 'unchanged') return null

        const changeKey =
          summary.status === 'added'
            ? (`beat-added:${beatId}` as SceneChangeKey)
            : summary.status === 'removed'
              ? (`beat-removed:${beatId}` as SceneChangeKey)
              : (`beat:${beatId}` as SceneChangeKey)

        const label =
          summary.status === 'added'
            ? 'New beat'
            : summary.status === 'removed'
              ? 'Removed beat'
              : summary.candidate?.kind === 'action'
                ? 'Action beat'
                : summary.candidate?.kind === 'narration'
                  ? 'Narration'
                  : `Dialogue: ${summary.candidate?.character ?? ''}`

        return (
          <div
            key={beatId}
            className={`rounded-lg border p-3 ${
              deselectedChanges?.has(changeKey) ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Clapperboard className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  {label}
                </span>
                {summary.status === 'added' && (
                  <Badge variant="secondary" className="text-xs">Added</Badge>
                )}
                {summary.status === 'removed' && (
                  <Badge variant="secondary" className="text-xs">Removed</Badge>
                )}
              </div>
              <ChangeControl
                changeKey={changeKey}
                changed={changeSet.has(changeKey)}
                deselectedChanges={deselectedChanges}
                onToggleChange={onToggleChange}
              />
            </div>
            {summary.status === 'changed' && summary.original && summary.candidate && (
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Before</p>
                  <p className="text-gray-600 dark:text-gray-400 line-through break-words">
                    {beatDisplayText(summary.original) || '(empty)'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">After</p>
                  <p className="text-gray-800 dark:text-gray-200 break-words">
                    {beatDisplayText(summary.candidate) || '(empty)'}
                  </p>
                </div>
              </div>
            )}
            {summary.status === 'added' && summary.candidate && (
              <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
                {beatDisplayText(summary.candidate)}
              </p>
            )}
            {summary.status === 'removed' && summary.original && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-through break-words">
                {beatDisplayText(summary.original)}
              </p>
            )}
          </div>
        )
      })}
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
  preserveSceneDirection = false,
  preserveBeatFrames = false,
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
              Enter direction to generate a preview
            </p>
          </div>
        </div>
      </div>
    )
  }

  const changeKeys = diffSceneChanges(originalScene, previewScene)
  const changeSet = new Set(changeKeys)
  const { selected, total } = countSelectedChanges(changeKeys, deselectedChanges ?? new Set())
  const structured = isStructuredBeatPreview(originalScene, previewScene)
  const dimIfSkipped = (key: SceneChangeKey) =>
    deselectedChanges?.has(key) ? 'opacity-50' : ''

  const framesToRegenerate = preserveBeatFrames
    ? []
    : beatsWithChangedFingerprints(
        originalScene,
        previewScene,
        deselectedChanges ?? new Set()
      )

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

      {structured ? (
        <div className="space-y-6">
          <section>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Clapperboard className="w-4 h-4" />
              Beats
            </h4>
            <StructuredBeatPreview
              originalScene={originalScene}
              previewScene={previewScene}
              changeSet={changeSet}
              deselectedChanges={deselectedChanges}
              onToggleChange={onToggleChange}
            />
            {!changeKeys.some((k) => k.startsWith('beat')) && (
              <p className="text-xs text-gray-500">No beat changes in this revision.</p>
            )}
          </section>

          {(previewScene.music || changeSet.has('music')) && (
            <section className={dimIfSkipped('music')}>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Music className="w-4 h-4" />
                Music
              </h4>
              <div className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 break-words flex-1">
                  {typeof previewScene.music === 'string'
                    ? previewScene.music
                    : previewScene.music?.description || '(no music)'}
                </p>
                <ChangeControl
                  changeKey="music"
                  changed={changeSet.has('music')}
                  deselectedChanges={deselectedChanges}
                  onToggleChange={onToggleChange}
                />
              </div>
            </section>
          )}

          <section>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Frames
            </h4>
            <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-800/50">
              {preserveBeatFrames ? (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Beat frames preserved — existing storyboard images will be kept.
                </p>
              ) : framesToRegenerate.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {framesToRegenerate.length} beat frame
                    {framesToRegenerate.length !== 1 ? 's' : ''} will be cleared for regeneration
                    after apply.
                  </p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc pl-4">
                    {framesToRegenerate.slice(0, 6).map((beat) => (
                      <li key={beat.beatId}>
                        {beat.kind === 'action'
                          ? `Action: ${(beat.actionDescription ?? '').slice(0, 60)}`
                          : `${beat.character}: ${(beat.line ?? '').slice(0, 60)}`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  No beat frames need regeneration for the selected changes.
                </p>
              )}
            </div>
          </section>

          <section className={dimIfSkipped('sceneDirection')}>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Direction
            </h4>
            <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-900/20">
              {preserveSceneDirection ? (
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Scene direction preserved — existing direction will not change.
                </p>
              ) : changeSet.has('sceneDirection') ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-blue-800 dark:text-blue-200 flex-1">
                      Direction is co-generated with the revised beats. Deselect individual beats
                      without also skipping Direction if you want the old summary.
                    </p>
                    <ChangeControl
                      changeKey="sceneDirection"
                      changed={changeSet.has('sceneDirection')}
                      deselectedChanges={deselectedChanges}
                      onToggleChange={onToggleChange}
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Before</p>
                      <p className="text-gray-600 dark:text-gray-400 line-through break-words">
                        {directionDescriptionText(originalScene) || '(no scene description)'}
                      </p>
                      {directionFacetSummary(originalScene).length > 0 && (
                        <ul className="text-xs text-gray-500 mt-1 list-disc pl-4">
                          {directionFacetSummary(originalScene).map((facet) => (
                            <li key={facet}>{facet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">After</p>
                      <p className="text-gray-800 dark:text-gray-200 break-words">
                        {directionDescriptionText(previewScene) || '(no scene description)'}
                      </p>
                      {directionFacetSummary(previewScene).length > 0 && (
                        <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 list-disc pl-4">
                          {directionFacetSummary(previewScene).map((facet) => (
                            <li key={facet}>{facet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Scene direction unchanged in this revision.
                </p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
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
          </div>
        </div>
      )}

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
