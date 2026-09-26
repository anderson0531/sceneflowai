'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download, Facebook, Loader2, Music2, Youtube } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { getPublishingState, upsertPublishUnit } from '@/lib/publish/publishingState'
import {
  collectPublishScenes,
  listPublishChapters,
  resolvePublishDelivery,
  scriptScenesFromMetadata,
  type PublishAspectRatio,
  type PublishDestinationId,
  type PublishUnitKind,
} from '@/lib/publish/publishUnits'
import { stitchFinalCutClips } from '@/lib/streams/stitchFinalCutMaster'
import type { FinalCutSceneClip } from '@/lib/types/finalCut'
import type { SceneProductionData } from '@/components/vision/scene-production/types'
import type { ProjectStream } from '@/lib/streams/projectStreams'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import { ProductionPublishPanel } from '@/components/production/ProductionPublishPanel'

const KINDS: Array<{ id: PublishUnitKind; label: string }> = [
  { id: 'scene', label: 'Scene' },
  { id: 'chapter', label: 'Chapter' },
  { id: 'master', label: 'Master' },
  { id: 'promo', label: 'Promo' },
]

const ASPECTS: PublishAspectRatio[] = ['16:9', '9:16']

const DESTINATIONS: Array<{ id: PublishDestinationId; label: string }> = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'download', label: 'Download' },
]

export interface PublishingPackageShipTabProps {
  projectId: string
  projectTitle?: string
  metadata: unknown
  script?: unknown
  userId?: string
  streams: ProjectStream[]
  sceneProductionState?: Record<string, SceneProductionData>
  onSaveMetadata?: (metadata: Record<string, unknown>) => Promise<void>
}

function scenesFromProps(script: unknown, metadata: unknown): Array<Record<string, unknown>> {
  if (script && typeof script === 'object') {
    const direct = (script as { scenes?: unknown }).scenes
    if (Array.isArray(direct)) return direct as Array<Record<string, unknown>>
    const nested = (script as { script?: { scenes?: unknown } }).script?.scenes
    if (Array.isArray(nested)) return nested as Array<Record<string, unknown>>
  }
  return scriptScenesFromMetadata(metadata)
}

export function PublishingPackageShipTab({
  projectId,
  projectTitle,
  metadata,
  script,
  userId,
  streams,
  sceneProductionState,
  onSaveMetadata,
}: PublishingPackageShipTabProps) {
  const [kind, setKind] = useState<PublishUnitKind>('master')
  const [aspect, setAspect] = useState<PublishAspectRatio>('16:9')
  const [destination, setDestination] = useState<PublishDestinationId>('youtube')
  const [language, setLanguage] = useState('en')
  const [sceneId, setSceneId] = useState<string>('')
  const [beatIndex, setBeatIndex] = useState<number | undefined>(undefined)
  const [title, setTitle] = useState(projectTitle || '')
  const [description, setDescription] = useState('')
  const [privacyStatus, setPrivacyStatus] = useState<'private' | 'unlisted' | 'public'>('private')
  const [pageId, setPageId] = useState<string>('')
  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([])
  const [youtubeConnected, setYoutubeConnected] = useState(false)
  const [facebookConnected, setFacebookConnected] = useState(false)
  const [tiktokConnected, setTiktokConnected] = useState(false)
  const [busy, setBusy] = useState<'prepare' | 'ship' | 'meta' | null>(null)
  const [statusText, setStatusText] = useState('')

  const production = useMemo(() => {
    if (sceneProductionState && Object.keys(sceneProductionState).length > 0) {
      return sceneProductionState as Record<string, { productionStreams?: unknown[]; renderedSceneUrl?: string | null }>
    }
    return getSceneProductionStateFromMetadata(metadata) as Record<
      string,
      { productionStreams?: unknown[]; renderedSceneUrl?: string | null }
    >
  }, [sceneProductionState, metadata])

  const scenes = useMemo(
    () => collectPublishScenes(scenesFromProps(script, metadata), production as never, language),
    [script, metadata, production, language]
  )
  const chapters = useMemo(() => listPublishChapters(scenes), [scenes])
  const languages = useMemo(() => {
    const fromStreams = streams.map((stream) => stream.language).filter(Boolean)
    return fromStreams.length > 0 ? Array.from(new Set(fromStreams)) : ['en']
  }, [streams])

  useEffect(() => {
    if (!languages.includes(language)) setLanguage(languages[0] || 'en')
  }, [languages, language])

  useEffect(() => {
    if (kind === 'promo') setAspect('9:16')
  }, [kind])

  useEffect(() => {
    if (!sceneId && scenes[0]) setSceneId(scenes[0].id)
  }, [sceneId, scenes])

  useEffect(() => {
    if (beatIndex == null && chapters[0]) setBeatIndex(chapters[0].beatIndex)
  }, [beatIndex, chapters])

  const publishingState = useMemo(() => getPublishingState(metadata), [metadata])
  const promo = publishingState.promo?.trailer

  const plan = useMemo(
    () =>
      resolvePublishDelivery({
        kind,
        aspectRatio: aspect,
        language,
        sceneId,
        beatIndex,
        scenes,
        streams: streams.map((stream) => ({
          language: stream.language,
          mp4Url: stream.mp4Url || undefined,
          status: stream.status,
        })),
        promo: promo
          ? { mp4Url: promo.mp4Url, durationSec: promo.durationSec, status: promo.status }
          : undefined,
        projectTitle,
      }),
    [kind, aspect, language, sceneId, beatIndex, scenes, streams, promo, projectTitle]
  )

  const savedUnit = publishingState.units?.find((unit) => unit.id === plan.id)
  const readyUrl = savedUnit?.mp4Url || (!plan.needsRender ? plan.mp4Url : undefined)

  useEffect(() => {
    setTitle(savedUnit?.title || plan.title)
    setDescription(savedUnit?.description || '')
  }, [plan.id, plan.title, savedUnit?.title, savedUnit?.description])

  const refreshConnections = useCallback(async () => {
    if (!userId) return
    const [youtube, facebook, tiktok] = await Promise.all([
      fetch(`/api/publish/youtube/upload?userId=${encodeURIComponent(userId)}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/publish/facebook/upload?userId=${encodeURIComponent(userId)}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/publish/tiktok/upload?userId=${encodeURIComponent(userId)}`).then((r) => r.json()).catch(() => ({})),
    ])
    setYoutubeConnected(!!youtube.connected)
    setFacebookConnected(!!facebook.connected)
    setTiktokConnected(!!tiktok.connected)
    setPages(Array.isArray(facebook.pages) ? facebook.pages : [])
    if (facebook.pageId) setPageId(facebook.pageId)
  }, [userId])

  useEffect(() => {
    void refreshConnections()
  }, [refreshConnections])

  const suggestMetadata = async () => {
    setBusy('meta')
    try {
      const res = await fetch('/api/inspiration/descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: title || projectTitle,
          locale: language,
          includeSceneFlowCta: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not suggest metadata')
      if (data.title) setTitle(data.title)
      if (data.description) setDescription(data.description)
      toast.success('Title and description suggested')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not suggest metadata')
    } finally {
      setBusy(null)
    }
  }

  const connect = (platform: 'youtube' | 'facebook' | 'tiktok') => {
    if (!userId) {
      toast.error('Sign in to connect an account')
      return
    }
    const returnTo = `${window.location.pathname}${window.location.search}`
    window.location.href = `/api/publish/${platform}/auth?userId=${encodeURIComponent(userId)}&returnTo=${encodeURIComponent(returnTo)}`
  }

  const persistUnit = useCallback(
    async (mp4Url: string, destinationPatch?: PublishDestinationId, url?: string, error?: string) => {
      if (!onSaveMetadata) return
      const next = upsertPublishUnit((metadata as Record<string, unknown>) || {}, {
        id: plan.id,
        kind: plan.kind,
        aspectRatio: plan.aspectRatio,
        language: plan.language,
        title,
        description,
        mp4Url,
        sceneId: plan.sceneId,
        blueprintBeatIndex: plan.blueprintBeatIndex,
        privacyStatus,
        renderedAt: new Date().toISOString(),
        destinations: destinationPatch
          ? {
              ...(savedUnit?.destinations || {}),
              [destinationPatch]: error
                ? { status: 'error', error }
                : {
                    status: destinationPatch === 'download' ? 'ready' : 'published',
                    url,
                    publishedAt: new Date().toISOString(),
                  },
            }
          : savedUnit?.destinations,
      })
      await onSaveMetadata(next)
    },
    [onSaveMetadata, metadata, plan, title, description, privacyStatus, savedUnit?.destinations]
  )

  const prepare = async () => {
    if (plan.blockedReason) {
      toast.error(plan.blockedReason)
      return
    }
    if (!plan.needsRender && plan.mp4Url) {
      await persistUnit(plan.mp4Url)
      toast.success('Package is ready')
      return
    }
    if (plan.clips.length === 0) {
      toast.error(plan.blockedReason || 'Nothing to render')
      return
    }
    setBusy('prepare')
    try {
      let cursor = 0
      const clips: FinalCutSceneClip[] = plan.clips.map((clip) => {
        const start = cursor
        cursor += clip.duration
        return {
          sceneId: clip.sceneId,
          sceneNumber: clip.sceneNumber,
          heading: clip.heading,
          startTime: start,
          endTime: cursor,
          duration: clip.duration,
          url: clip.url,
          availableVersions: [1],
          status: 'ready',
        }
      })
      const url = await stitchFinalCutClips({
        projectId,
        filenameLabel: plan.id,
        clips,
        resolution: '1080p',
        aspectRatio: plan.aspectRatio,
        onProgress: setStatusText,
      })
      await persistUnit(url)
      toast.success('Delivery file is ready')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Prepare failed')
    } finally {
      setBusy(null)
      setStatusText('')
    }
  }

  const ship = async () => {
    const videoUrl = readyUrl
    if (!videoUrl) {
      toast.error('Prepare the package before shipping it.')
      return
    }
    if (!title.trim()) {
      toast.error('Add a title')
      return
    }
    if (destination === 'download') {
      const anchor = document.createElement('a')
      anchor.href = videoUrl
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      anchor.download = ''
      anchor.click()
      await persistUnit(videoUrl, 'download', videoUrl)
      toast.success('Download started')
      return
    }
    if (!userId) {
      toast.error('Sign in to publish')
      return
    }
    setBusy('ship')
    try {
      const endpoint =
        destination === 'youtube'
          ? '/api/publish/youtube/upload'
          : destination === 'facebook'
            ? '/api/publish/facebook/upload'
            : '/api/publish/tiktok/upload'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          videoUrl,
          title,
          description,
          privacyStatus,
          language,
          pageId: destination === 'facebook' ? pageId : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')
      const url = data.url || data.youtubeUrl || (data.publishId ? `tiktok:${data.publishId}` : videoUrl)
      await persistUnit(videoUrl, destination, url)
      toast.success(
        destination === 'tiktok'
          ? data.note || 'Sent to TikTok'
          : `Shipped to ${DESTINATIONS.find((item) => item.id === destination)?.label}`
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publish failed'
      await persistUnit(videoUrl, destination, undefined, message).catch(() => undefined)
      toast.error(message)
    } finally {
      setBusy(null)
    }
  }

  const connected =
    destination === 'youtube' ? youtubeConnected : destination === 'facebook' ? facebookConnected : destination === 'tiktok' ? tiktokConnected : true

  return (
    <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 pr-1">
      <div>
        <h3 className="text-sm font-semibold text-white">Package & Ship</h3>
        <p className="mt-1 text-xs text-zinc-400">
          Ship a Scene, Chapter, Master, or Promo to YouTube, Facebook, or TikTok — in 16:9 or 9:16 — or download it.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {KINDS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setKind(item.id)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium',
              kind === item.id
                ? 'border-violet-500/40 bg-violet-500/15 text-violet-100'
                : 'border-zinc-700 text-zinc-400'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {languages.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs',
              language === lang ? 'border-zinc-400 text-white' : 'border-zinc-700 text-zinc-400'
            )}
          >
            {getLanguageDisplayName(lang)}
          </button>
        ))}
        {ASPECTS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setAspect(item)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs',
              aspect === item ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-zinc-700 text-zinc-400'
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {kind === 'scene' ? (
        <select
          value={sceneId}
          onChange={(event) => setSceneId(event.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          {scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.title}
              {scene.mp4Url ? '' : ' (not rendered)'}
            </option>
          ))}
        </select>
      ) : null}

      {kind === 'chapter' ? (
        <select
          value={beatIndex ?? ''}
          onChange={(event) => setBeatIndex(Number(event.target.value))}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          {chapters.length === 0 ? <option value="">No Blueprint chapters linked</option> : null}
          {chapters.map((chapter) => (
            <option key={chapter.beatIndex} value={chapter.beatIndex}>
              {chapter.title}
            </option>
          ))}
        </select>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {DESTINATIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setDestination(item.id)}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium',
              destination === item.id
                ? 'border-red-500/40 bg-red-500/10 text-red-100'
                : 'border-zinc-700 text-zinc-400'
            )}
          >
            {item.id === 'youtube' ? <Youtube className="h-3.5 w-3.5" /> : null}
            {item.id === 'facebook' ? <Facebook className="h-3.5 w-3.5" /> : null}
            {item.id === 'tiktok' ? <Music2 className="h-3.5 w-3.5" /> : null}
            {item.id === 'download' ? <Download className="h-3.5 w-3.5" /> : null}
            {item.label}
          </button>
        ))}
      </div>

      {plan.blockedReason ? (
        <p className="text-xs text-amber-300">{plan.blockedReason}</p>
      ) : null}
      {plan.aspectNote ? <p className="text-xs text-zinc-400">{plan.aspectNote}</p> : null}
      {destination === 'tiktok' ? (
        <p className="text-xs text-zinc-500">
          Unaudited TikTok apps can only post as private. Public posting needs an approved TikTok app.
        </p>
      ) : null}

      <div className="grid gap-2">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white"
        />
        <Button size="sm" variant="outline" onClick={() => void suggestMetadata()} disabled={busy != null}>
          {busy === 'meta' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          Suggest title and description
        </Button>
        <select
          value={privacyStatus}
          onChange={(event) => setPrivacyStatus(event.target.value as 'private' | 'unlisted' | 'public')}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
      </div>

      {destination === 'facebook' && facebookConnected ? (
        <select
          value={pageId}
          onChange={(event) => setPageId(event.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Choose a Facebook Page</option>
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name}
            </option>
          ))}
        </select>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {destination !== 'download' && destination !== 'youtube' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => connect(destination)}
            disabled={!userId}
          >
            {connected ? 'Reconnect' : 'Connect'} {DESTINATIONS.find((item) => item.id === destination)?.label}
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => void prepare()} disabled={busy != null || !!plan.blockedReason}>
          {busy === 'prepare' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          {plan.needsRender ? 'Prepare delivery' : 'Use ready file'}
        </Button>
        {destination !== 'youtube' ? (
          <Button size="sm" onClick={() => void ship()} disabled={busy != null || !readyUrl}>
            {busy === 'ship' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {destination === 'download' ? 'Download' : 'Ship'}
          </Button>
        ) : null}
      </div>
      {destination === 'youtube' && readyUrl ? (
        <ProductionPublishPanel
          projectId={projectId}
          userId={userId}
          videoUrl={readyUrl}
          title={title}
          projectTitle={projectTitle}
          metadata={metadata}
          masterLanguage={language}
          onYoutubePublished={async (result) => {
            await persistUnit(readyUrl, 'youtube', result.youtubeUrl)
          }}
        />
      ) : null}
      {destination === 'youtube' && !readyUrl ? (
        <p className="text-xs text-zinc-500">Prepare the package, then upload it to YouTube. Language audio tracks stay available on that upload.</p>
      ) : null}
      {statusText ? <p className="text-xs text-zinc-400">{statusText}</p> : null}
      {readyUrl ? <p className="truncate text-[11px] text-emerald-300">Ready · {readyUrl}</p> : null}
    </div>
  )
}
