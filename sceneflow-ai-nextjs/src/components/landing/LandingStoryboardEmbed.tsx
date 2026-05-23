'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AudioGalleryPlayer } from '@/components/vision/AudioGalleryPlayer'
import { LANDING_SAMPLE } from '@/config/landingSamples'

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

function StoryboardPlayerSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-[280px] bg-slate-900/80 animate-pulse">
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

export function LandingStoryboardEmbed() {
  const slug = LANDING_SAMPLE.storyboardShareSlug.trim()
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [projectData, setProjectData] = useState<any>(null)
  const [loading, setLoading] = useState(!!slug)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/vision/shared-project/${encodeURIComponent(slug)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load storyboard')
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
    return (
      projectData.script?.script?.scenes ||
      projectData.script?.scenes ||
      projectData.sceneProductionState ||
      []
    )
  }, [projectData])

  const availableLanguages = useMemo(() => deriveAvailableLanguages(scenes), [scenes])

  if (!slug) {
    return (
      <div className="h-full min-h-[280px] flex flex-col">
        <StoryboardPlayerSkeleton />
        <p className="text-center text-xs text-slate-500 py-2 px-3">
          Sample storyboard — set <code className="text-slate-400">storyboardShareSlug</code> in config
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full min-h-[280px] flex items-center justify-center bg-slate-900/50">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (error || scenes.length === 0) {
    return (
      <div className="h-full min-h-[280px] flex items-center justify-center bg-slate-900/50 p-4">
        <p className="text-sm text-slate-400 text-center">{error || 'No scenes in sample project'}</p>
      </div>
    )
  }

  return (
    <div className="h-full landing-storyboard-embed [&>div]:rounded-lg">
      <AudioGalleryPlayer
        scenes={scenes}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        availableLanguages={availableLanguages}
        isSharedView
        embedMode
      />
    </div>
  )
}
