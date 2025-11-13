'use client'

import React, { useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { CreationSceneData, CreationSceneAsset, CreationAssetType } from './types'
import { Button } from '@/components/ui/Button'
import { Loader2, Plus, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SceneAssetsProps {
  scene: CreationSceneData
  onUploadAsset: (file: File, type: CreationAssetType) => Promise<CreationSceneAsset>
  onDeleteAsset: (assetId: string) => void
  onAddToTimeline: (assetId: string) => void
}

function detectAssetType(file: File): CreationAssetType {
  if (file.type.startsWith('video/')) return 'uploaded_video'
  if (file.type.startsWith('audio/')) return 'user_audio'
  if (file.type.startsWith('image/')) return 'uploaded_image'
  return 'uploaded_video'
}

function formatDuration(durationSec?: number): string {
  if (!durationSec || durationSec <= 0) return '—'
  if (durationSec < 60) return `${durationSec.toFixed(1)}s`
  const minutes = Math.floor(durationSec / 60)
  const seconds = Math.round(durationSec % 60)
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export function SceneAssets({ scene, onUploadAsset, onDeleteAsset, onAddToTimeline }: SceneAssetsProps) {
  const [isUploading, setIsUploading] = useState(false)

  const assets = useMemo(() => scene.assets ?? [], [scene.assets])

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return
    setIsUploading(true)
    try {
      for (const file of acceptedFiles) {
        const type = detectAssetType(file)
        await onUploadAsset(file, type)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true })

  return (
    <section className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scene Assets &amp; Takes</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Manage generated takes, uploads, and supplementary audio.</p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{assets.length} item{assets.length === 1 ? '' : 's'}</div>
      </header>

      <div
        {...getRootProps()}
        className={cn(
          'relative border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center transition-colors',
          isDragActive ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400' : 'bg-gray-50 dark:bg-gray-800/50'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          ) : (
            <Upload className="w-6 h-6 text-gray-400" />
          )}
          <span>{isUploading ? 'Uploading assets…' : 'Drop video, audio, or image files here'}</span>
          <span className="text-xs">Files will be stored with your project for reuse.</span>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Generated takes and uploads will appear here. Upload clips or generate from the studio to populate the timeline.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => {
            const isReady = !asset.status || asset.status === 'ready'
            return (
              <div key={asset.id} className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 p-3 space-y-3 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{asset.type.replace(/_/g, ' ')}</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {asset.name || asset.id}
                    </div>
                  </div>
                  {asset.status === 'processing' || asset.status === 'queued' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  ) : null}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Duration {formatDuration(asset.durationSec)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={!isReady}
                    onClick={() => onAddToTimeline(asset.id)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Timeline
                  </Button>
                  {asset.sourceUrl ? (
                    <a
                      href={asset.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Download
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onDeleteAsset(asset.id)}
                    className="ml-auto text-xs text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default SceneAssets
