'use client'

import React, { useCallback, useState } from 'react'
import { Download, Film, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { FinalCutSceneClip } from '@/lib/types/finalCut'

type RenderStatus = 'idle' | 'rendering' | 'uploading' | 'ready' | 'error'

export interface RenderFinalCutButtonProps {
  /** Resolved clip list — one playable URL per scene. */
  clips: FinalCutSceneClip[]
  /** Project id (for filename + Vercel Blob path). */
  projectId: string | undefined
  /** Optional output URL filename label. */
  filenameLabel?: string
  /** Persist the rendered URL to project metadata, e.g. `metadata.exportedVideoUrl`. */
  onRendered?: (url: string) => Promise<void> | void
  /** Disabled state (no project, demo). */
  disabled?: boolean
  /** Render only when all clips are ready. */
  className?: string
}

/**
 * Single "Render Final Cut" button.
 *
 * Stitches the resolved scene videos end-to-end via `LocalRenderService`
 * (browser canvas + MediaRecorder), saves the file to the user's Downloads
 * folder, uploads a public copy to Vercel Blob for screening, and notifies the
 * caller via `onRendered`. There are intentionally no per-clip options —
 * editing happens in the Production Scene Mixer.
 */
export function RenderFinalCutButton({
  clips,
  projectId,
  filenameLabel,
  onRendered,
  disabled = false,
  className,
}: RenderFinalCutButtonProps) {
  const [status, setStatus] = useState<RenderStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)

  const readyClips = clips.filter((c) => c.status === 'ready' && !!c.url)
  const allReady = clips.length > 0 && readyClips.length === clips.length
  const canRender = !disabled && allReady && !!projectId && status !== 'rendering' && status !== 'uploading'

  const handleRender = useCallback(async () => {
    if (!projectId || readyClips.length === 0) return

    setStatus('rendering')
    setProgress(0)
    setOutputUrl(null)

    const toastId = toast.loading(`Rendering Final Cut (1080p, ${readyClips.length} scenes)…`)

    try {
      const [{ LocalRenderService }, { upload }] = await Promise.all([
        import('@/lib/video/LocalRenderService'),
        import('@vercel/blob/client'),
      ])

      let cursor = 0
      const segments = readyClips.map((clip) => {
        const segment = {
          segmentId: `scene-${clip.sceneId}`,
          assetUrl: clip.url as string,
          assetType: 'video' as const,
          startTime: cursor,
          duration: clip.duration,
          includeVideoAudio: true,
          volume: 1,
        }
        cursor += clip.duration
        return segment
      })

      const result = await new LocalRenderService().render(
        {
          segments,
          audioClips: [],
          textOverlays: [],
          resolution: '1080p',
          fps: 30,
          totalDuration: cursor,
          exportFormat: 'mp4',
        },
        (p) => {
          if (p.phase === 'rendering' || p.phase === 'encoding') {
            setProgress(p.progress)
            toast.loading(`Rendering Final Cut: ${Math.round(p.progress)}%`, { id: toastId })
          }
        }
      )

      if (!result.success || !result.blob || !result.blobUrl) {
        throw new Error(result.error || 'Unknown render error')
      }

      const ext =
        result.containerUsed === 'mp4' || (result.mimeType && result.mimeType.includes('mp4'))
          ? 'mp4'
          : 'webm'
      const safeLabel = (filenameLabel || projectId).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40)
      const filename = `final-cut-${safeLabel}-${Date.now()}.${ext}`

      // Save to Downloads first
      const a = document.createElement('a')
      const downloadUrl = URL.createObjectURL(result.blob)
      a.href = downloadUrl
      a.download = filename
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(downloadUrl)

      setStatus('uploading')
      toast.loading('Render complete. Uploading copy for screening…', { id: toastId })

      const file = new File([result.blob], filename, { type: result.mimeType || 'video/webm' })
      const uploaded = await upload(`renders/${filename}`, file, {
        access: 'public',
        handleUploadUrl: '/api/segments/upload-video-url',
      })

      LocalRenderService.revokeBlobUrl(result.blobUrl)
      setOutputUrl(uploaded.url)
      setStatus('ready')

      if (onRendered) {
        try {
          await onRendered(uploaded.url)
        } catch (err) {
          console.error('[FinalCut] onRendered handler failed', err)
        }
      }

      toast.success(`Saved to Downloads as ${filename}.`, {
        id: toastId,
        duration: 14000,
        action: {
          label: 'Open hosted copy',
          onClick: () => window.open(uploaded.url, '_blank', 'noopener,noreferrer'),
        },
      })
    } catch (err) {
      console.error('[FinalCut] Render error', err)
      setStatus('error')
      toast.error(`Render failed: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        id: toastId,
        duration: 8000,
      })
    }
  }, [filenameLabel, onRendered, projectId, readyClips])

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button
        size="sm"
        type="button"
        onClick={handleRender}
        disabled={!canRender}
        className="bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-950/40"
      >
        {status === 'rendering' || status === 'uploading' ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {status === 'rendering' ? `Rendering ${Math.round(progress)}%` : 'Uploading…'}
          </>
        ) : (
          <>
            <Film className="w-4 h-4 mr-2" />
            Render Final Cut
          </>
        )}
      </Button>

      {!allReady && clips.length > 0 ? (
        <p className="text-[11px] text-amber-300/90 leading-snug">
          {readyClips.length} of {clips.length} scenes ready. Render the missing scenes in the Production
          Scene Mixer to enable Final Cut export.
        </p>
      ) : null}

      {status === 'ready' && outputUrl ? (
        <a
          href={outputUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 hover:text-emerald-200"
        >
          <Download className="w-3.5 h-3.5" />
          Download last render
        </a>
      ) : null}
    </div>
  )
}
