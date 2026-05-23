'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AudioGalleryPlayer } from '@/components/vision/AudioGalleryPlayer'
import { cn } from '@/lib/utils'
import { resolveStoryboardScenes } from '@/lib/storyboard/resolveStoryboardScenes'

function deriveAvailableLanguages(scenes: any[]): string[] {
  const langs = new Set<string>()
  for (const scene of scenes) {
    if (scene.narrationAudio) {
      Object.keys(scene.narrationAudio).forEach((lang) => {
        if (scene.narrationAudio[lang]?.url) langs.add(lang)
      })
    }
    if (scene.dialogueAudio) {
      Object.keys(scene.dialogueAudio).forEach((lang) => {
        if (Array.isArray(scene.dialogueAudio[lang]) && scene.dialogueAudio[lang].length > 0) {
          langs.add(lang)
        }
      })
    }
  }
  if (langs.size === 0) langs.add('en')
  return Array.from(langs).sort()
}

function StoryboardPlayerSkeleton({ minHeight }: { minHeight: string }) {
  return (
    <div className={cn('flex flex-col h-full bg-slate-900/80 animate-pulse', minHeight)}>
      <div className="flex-1 bg-slate-800/60 m-2 rounded-lg" />
      <div className="px-3 pb-3 space-y-2">
        <div className="h-1.5 bg-slate-700 rounded-full w-full" />
        <div className="flex justify-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-700" />
          <div className="h-8 w-8 rounded-full bg-slate-700" />
          <div className="h-8 w-8 rounded-full bg-slate-700" />
        </div>
      </div>
    </div>
  )
}

export interface StoryboardEmbedPlayerProps {
  slug: string
  className?: string
  minHeight?: string
  /** Called when the shared-project API returns 404 (embed page uses this for notFound()). */
  onNotFound?: () => void
  /** Show link to full /embed/storyboard route (landing card only). */
  showExpandLink?: boolean
  /** Landing full-width embed: widen scene image and controls to fill the pane. */
  fullWidthEmbed?: boolean
}

export function StoryboardEmbedPlayer({
  slug,
  className,
  minHeight = 'min-h-[280px]',
  onNotFound,
  showExpandLink = true,
  fullWidthEmbed = false,
}: StoryboardEmbedPlayerProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [projectData, setProjectData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const onNotFoundRef = useRef(onNotFound)
  onNotFoundRef.current = onNotFound

  useEffect(() => {
    if (!slug.trim()) return

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/vision/shared-project/${encodeURIComponent(slug)}`)
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 404 && onNotFoundRef.current) {
            if (!cancelled) onNotFoundRef.current()
            return
          }
          throw new Error(data.error || 'Failed to load storyboard')
        }
        if (!cancelled) setProjectData(data.project)
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load storyboard')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [slug])

  const scenes = useMemo(() => {
    if (!projectData) return []
    return resolveStoryboardScenes({
      script: projectData.script,
      visionPhaseScenes: projectData.visionPhaseScenes,
    })
  }, [projectData])

  const availableLanguages = useMemo(() => deriveAvailableLanguages(scenes), [scenes])

  if (loading) {
    return (
      <div className={cn('h-full flex items-center justify-center bg-slate-900/50', minHeight, className)}>
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (error || scenes.length === 0) {
    return (
      <div className={cn('h-full flex items-center justify-center bg-slate-900/50 p-4', minHeight, className)}>
        <p className="text-sm text-slate-400 text-center">{error || 'No scenes in this storyboard'}</p>
      </div>
    )
  }

  return (
    <div className={cn('h-full storyboard-embed-player [&>div]:rounded-lg', minHeight, className)}>
      <AudioGalleryPlayer
        scenes={scenes}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        availableLanguages={availableLanguages}
        isSharedView
        embedMode
        fullWidthEmbed={fullWidthEmbed}
        expandHref={
          showExpandLink && slug.trim()
            ? `/embed/storyboard/${encodeURIComponent(slug.trim())}`
            : undefined
        }
      />
    </div>
  )
}

export { StoryboardPlayerSkeleton }
