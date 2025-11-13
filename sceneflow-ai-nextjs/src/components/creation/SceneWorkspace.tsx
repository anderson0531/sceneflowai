'use client'

import React from 'react'
import SceneTimeline from './SceneTimeline'
import VideoGenerationStudio from './VideoGenerationStudio'
import SceneAssets from './SceneAssets'
import {
  CreationSceneData,
  SceneTimelineData,
  CreationSceneAsset,
  VideoGenerationRequest,
  CreationAssetType,
  VideoModelKey,
} from './types'

interface CharacterSummary {
  id: string
  name: string
  referenceImage?: string
}

interface SceneWorkspaceProps {
  scenes: CreationSceneData[]
  projectId: string
  characters: CharacterSummary[]
  costConfig: {
    providerKey: VideoModelKey
    markupPercent: number
    fixedFeePerClip: number
  }
  onTimelineChange: (sceneId: string, timeline: SceneTimelineData) => void
  onAddAssetToTimeline: (sceneId: string, assetId: string) => void
  onUploadAsset: (sceneId: string, file: File, type: CreationAssetType) => Promise<CreationSceneAsset>
  onDeleteAsset: (sceneId: string, assetId: string) => void
  onGenerateVideo: (sceneId: string, request: VideoGenerationRequest) => Promise<void>
}

export function SceneWorkspace({
  scenes,
  projectId,
  characters,
  costConfig,
  onTimelineChange,
  onAddAssetToTimeline,
  onUploadAsset,
  onDeleteAsset,
  onGenerateVideo,
}: SceneWorkspaceProps) {
  if (scenes.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center text-gray-500 dark:text-gray-400">
        Scenes from the Vision phase will appear here once script data is available.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {scenes.map((scene) => {
        const timeline: SceneTimelineData = scene.timeline ?? {
          videoTrack: [],
          userAudioTrack: [],
          narrationTrackUrl: scene.narrationUrl,
          musicTrackUrl: scene.musicUrl,
          dialogueTrack: scene.dialogueClips,
        }

        return (
          <article
            key={scene.sceneId}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden"
          >
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-gray-200 dark:border-gray-800 p-4 md:p-6">
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Scene {scene.sceneNumber}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {scene.heading || 'Untitled Scene'}
                </h3>
                {scene.description ? (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{scene.description}</p>
                ) : null}
              </div>
            </header>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 p-4 md:p-6">
              <div className="md:col-span-2 xl:col-span-2">
                <SceneTimeline
                  sceneId={scene.sceneId}
                  clips={timeline.videoTrack}
                  onClipsChange={(next) => onTimelineChange(scene.sceneId, { ...timeline, videoTrack: next })}
                  narrationUrl={timeline.narrationTrackUrl}
                  musicUrl={timeline.musicTrackUrl}
                  dialogueClips={timeline.dialogueTrack}
                />
              </div>
              <div>
                <VideoGenerationStudio
                  scene={scene}
                  projectId={projectId}
                  characters={characters}
                  onSubmit={(request) => onGenerateVideo(scene.sceneId, request)}
                  costConfig={costConfig}
                  existingAssets={scene.assets}
                />
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <SceneAssets
                  scene={scene}
                  onUploadAsset={(file, type) => onUploadAsset(scene.sceneId, file, type)}
                  onDeleteAsset={(assetId) => onDeleteAsset(scene.sceneId, assetId)}
                  onAddToTimeline={(assetId) => onAddAssetToTimeline(scene.sceneId, assetId)}
                />
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default SceneWorkspace
