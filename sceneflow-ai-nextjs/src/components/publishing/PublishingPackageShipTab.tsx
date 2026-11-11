'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Check,
  CheckCircle2,
  Clapperboard,
  Download,
  ExternalLink,
  Facebook,
  Globe,
  Image as ImageIcon,
  Languages,
  Link2,
  Loader2,
  Music2,
  Plus,
  RefreshCw,
  Sparkles,
  Unlink,
  Youtube,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PreVisRenderDialog } from '@/components/vision/PreVisRenderDialog'
import { collectPreVisLanguages } from '@/lib/storyboard/preVisSceneRender'
import { cn } from '@/lib/utils'
import {
  buildLanguageAudioTrack,
  getAvailablePublishLanguages,
  getLanguageDisplayName,
} from '@/lib/publish/buildLanguageAudioTrack'
import {
  AudioTrackTooLongError,
  stitchAudioTrack,
  uploadAudioTrackBlob,
} from '@/lib/publish/stitchAudioTrack'
import { promoAssetForLanguage } from '@/lib/publish/promoLanguage'
import { resolvePromoFrameAspect } from '@/lib/publish/promoFrame'
import {
  getPublishingState,
  upsertPreVisMaster,
  upsertPublishUnit,
  upsertYoutubeBundle,
  upsertYoutubeBundles,
} from '@/lib/publish/publishingState'
import { resolvePromoScreeningVideoUrl } from '@/lib/final-cut/resolveScreeningVideoStreamUrl'
import { readFinalCutSelection } from '@/hooks/final-cut/useFinalCutSelection'
import {
  collectPublishPreVisScenes,
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
import type {
  ProductionStream,
  SceneProductionData,
} from '@/components/vision/scene-production/types'
import type { ProjectStream } from '@/lib/streams/projectStreams'
import { getSceneProductionStateFromMetadata } from '@/lib/final-cut/projectProductionState'
import { SCENE_RENDER_APPENDED_EVENT } from '@/lib/projects/appendSceneRenderClient'
import {
  PREVIS_MASTER_SAVED_EVENT,
  savePreVisMasterClient,
} from '@/lib/projects/savePreVisMasterClient'
import type { PreVisMasterAsset, YoutubePublishBundle } from '@/types/publishingAssets'
import type { AudioTrackResult } from '@/app/api/publish/youtube/upload/route'

const KINDS: Array<{ id: PublishUnitKind; label: string }> = [
  { id: 'scene', label: 'Scene' },
  { id: 'chapter', label: 'Chapter' },
  { id: 'previs', label: 'Pre-Vis' },
  { id: 'master', label: 'Master' },
  { id: 'promo', label: 'Promo' },
]

const KIND_HINTS: Record<PublishUnitKind, string> = {
  scene: 'Single rendered scene',
  chapter: 'Scenes sharing a Blueprint beat',
  previs: 'Stitched multi-scene Pre-Vis render',
  master: 'Final production master stream',
  promo: 'Rendered promo trailer',
}

const ASPECTS: PublishAspectRatio[] = ['16:9', '9:16']

const DESTINATIONS: Array<{ id: PublishDestinationId; label: string }> = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'download', label: 'Download' },
]

const YOUTUBE_CATEGORIES: Array<{ id: string; label: string }> = [
  { id: '1', label: 'Film & Animation' },
  { id: '24', label: 'Entertainment' },
  { id: '22', label: 'People & Blogs' },
  { id: '27', label: 'Education' },
  { id: '28', label: 'Science & Technology' },
  { id: '10', label: 'Music' },
]

const COMMON_TRANSLATION_LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'it',
  'ja',
  'ko',
  'zh',
  'hi',
  'ar',
  'th',
  'vi',
  'id',
  'nl',
  'pl',
  'tr',
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
  initialKind?: PublishUnitKind
  initialLanguage?: string
  initialSceneId?: string
  initialBeatIndex?: number
  initialAspectRatio?: PublishAspectRatio
}

interface YouTubeChannelInfo {
  id: string
  title: string
  customUrl?: string
  thumbnailUrl?: string
}

interface FrameCandidate {
  url: string
  label: string
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

function extractProjectStoryContext(
  metadata: unknown,
  rawScenes: Array<Record<string, unknown>>
): { synopsis: string; genre: string; sceneHeadings: string[] } {
  const meta = (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, unknown>
  const vision =
    meta.visionPhase && typeof meta.visionPhase === 'object'
      ? (meta.visionPhase as Record<string, unknown>)
      : {}
  const treatment =
    vision.treatment && typeof vision.treatment === 'object'
      ? (vision.treatment as Record<string, unknown>)
      : {}
  const scriptObj =
    vision.script && typeof vision.script === 'object'
      ? (vision.script as Record<string, unknown>)
      : {}

  const synopsisCandidates = [
    meta.synopsis,
    meta.logline,
    treatment.synopsis,
    treatment.logline,
    scriptObj.synopsis,
    scriptObj.logline,
  ]
  const synopsis =
    synopsisCandidates.find((v): v is string => typeof v === 'string' && v.trim().length > 0)?.trim() ||
    ''

  const genreCandidates = [meta.genre, treatment.genre, scriptObj.genre]
  const genre =
    genreCandidates.find((v): v is string => typeof v === 'string' && v.trim().length > 0)?.trim() ||
    ''

  const sceneHeadings = rawScenes
    .map((scene, idx) => {
      const h = scene.heading
      if (typeof h === 'string' && h.trim()) return h.trim()
      if (h && typeof h === 'object' && typeof (h as { text?: unknown }).text === 'string') {
        return (h as { text: string }).text.trim()
      }
      if (typeof scene.title === 'string' && scene.title.trim()) return scene.title.trim()
      return `Scene ${idx + 1}`
    })
    .filter(Boolean)
    .slice(0, 10)

  return { synopsis, genre, sceneHeadings }
}

function extractFrameCandidates(
  rawScenes: Array<Record<string, unknown>>,
  production: Record<string, unknown>,
  metadata: unknown
): FrameCandidate[] {
  const seen = new Set<string>()
  const out: FrameCandidate[] = []

  const add = (url: unknown, label: string) => {
    if (typeof url !== 'string') return
    const trimmed = url.trim()
    if (!trimmed || !/^https?:\/\//i.test(trimmed) || seen.has(trimmed)) return
    seen.add(trimmed)
    out.push({ url: trimmed, label })
  }

  if (metadata && typeof metadata === 'object') {
    const m = metadata as Record<string, unknown>
    add(m.thumbnailUrl, 'Project Cover')
    add(m.coverImageUrl, 'Project Cover')
  }

  rawScenes.forEach((scene, idx) => {
    const num = typeof scene.sceneNumber === 'number' ? scene.sceneNumber : idx + 1
    add(scene.imageUrl, `Scene ${num}`)
    const beats = Array.isArray(scene.beats) ? (scene.beats as Array<Record<string, unknown>>) : []
    beats.forEach((beat, bIdx) => {
      add(beat.imageUrl ?? beat.frameUrl, `Scene ${num} · Beat ${bIdx + 1}`)
    })
    const sid =
      (typeof scene.id === 'string' && scene.id) ||
      (typeof scene.sceneId === 'string' && scene.sceneId) ||
      `scene-${idx}`
    const prod = production[sid] as { segments?: Array<Record<string, unknown>> } | undefined
    prod?.segments?.forEach((seg, sIdx) => {
      add(seg.startFrameUrl ?? seg.imageUrl, `Scene ${num} · Shot ${sIdx + 1}`)
    })
  })

  return out.slice(0, 12)
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
  initialKind: initialKindProp,
  initialLanguage: initialLanguageProp,
  initialSceneId: initialSceneIdProp,
  initialBeatIndex: initialBeatIndexProp,
  initialAspectRatio: initialAspectRatioProp,
}: PublishingPackageShipTabProps) {
  const [liveSceneStreams, setLiveSceneStreams] = useState<Record<string, ProductionStream[]>>({})
  const [livePreVisMasters, setLivePreVisMasters] = useState<Record<string, PreVisMasterAsset>>({})
  const [extraLanguages, setExtraLanguages] = useState<string[]>([])
  const [localYoutubeBundles, setLocalYoutubeBundles] = useState<
    Record<string, YoutubePublishBundle>
  >({})

  const production = useMemo(() => {
    const fromMeta = getSceneProductionStateFromMetadata(metadata) as Record<
      string,
      { productionStreams?: ProductionStream[]; renderedSceneUrl?: string | null }
    >
    const merged: Record<
      string,
      { productionStreams?: ProductionStream[]; renderedSceneUrl?: string | null }
    > = {
      ...fromMeta,
      ...(sceneProductionState as Record<
        string,
        { productionStreams?: ProductionStream[]; renderedSceneUrl?: string | null }
      >),
    }
    for (const [sid, appendedList] of Object.entries(liveSceneStreams)) {
      const existing = merged[sid]?.productionStreams || []
      const byId = new Map<string, ProductionStream>()
      for (const s of existing) {
        if (s?.id) byId.set(s.id, s)
      }
      for (const s of appendedList) {
        if (s?.id) byId.set(s.id, s)
      }
      merged[sid] = {
        ...(merged[sid] || {}),
        productionStreams: Array.from(byId.values()),
      }
    }
    return merged
  }, [sceneProductionState, metadata, liveSceneStreams])

  const publishingState = useMemo(() => getPublishingState(metadata), [metadata])

  const effectivePreVisByLanguage = useMemo(
    () => ({
      ...(publishingState.previsByLanguage || {}),
      ...livePreVisMasters,
    }),
    [publishingState.previsByLanguage, livePreVisMasters]
  )

  const effectiveYoutubeByLanguage = useMemo(
    () => ({
      ...(publishingState.youtubeByLanguage || {}),
      ...localYoutubeBundles,
    }),
    [publishingState.youtubeByLanguage, localYoutubeBundles]
  )

  const rawScenes = useMemo(() => scenesFromProps(script, metadata), [script, metadata])

  // Default to explicit prop, or Pre-Vis when a Pre-Vis render is available and no final Master MP4 exists yet
  const defaultKind = useMemo<PublishUnitKind>(() => {
    if (initialKindProp) return initialKindProp
    const hasMasterReady = streams.some((s) => s.format !== 'animatic' && Boolean(s.mp4Url))
    if (hasMasterReady) return 'master'
    const hasStitchedPreVis = Object.values(effectivePreVisByLanguage).some((p) => Boolean(p?.mp4Url))
    if (hasStitchedPreVis) return 'previs'
    const enPreVis = collectPublishPreVisScenes(rawScenes, production as never, 'en')
    if (enPreVis.some((s) => Boolean(s.mp4Url))) return 'previs'
    return 'master'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [kind, setKind] = useState<PublishUnitKind>(defaultKind)
  const [aspect, setAspect] = useState<PublishAspectRatio>(initialAspectRatioProp || '16:9')
  const [destination, setDestination] = useState<PublishDestinationId>('youtube')
  const [language, setLanguage] = useState(initialLanguageProp || 'en')
  const [sceneId, setSceneId] = useState<string>(initialSceneIdProp || '')
  const [beatIndex, setBeatIndex] = useState<number | undefined>(initialBeatIndexProp)

  useEffect(() => {
    if (initialKindProp) setKind(initialKindProp)
  }, [initialKindProp])

  useEffect(() => {
    if (initialLanguageProp) setLanguage(initialLanguageProp)
  }, [initialLanguageProp])

  useEffect(() => {
    if (initialSceneIdProp) setSceneId(initialSceneIdProp)
  }, [initialSceneIdProp])

  useEffect(() => {
    if (typeof initialBeatIndexProp === 'number') setBeatIndex(initialBeatIndexProp)
  }, [initialBeatIndexProp])

  useEffect(() => {
    if (initialAspectRatioProp) setAspect(initialAspectRatioProp)
  }, [initialAspectRatioProp])

  const [title, setTitle] = useState(projectTitle || '')
  const [description, setDescription] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [categoryId, setCategoryId] = useState('1')
  const [privacyStatus, setPrivacyStatus] = useState<'private' | 'unlisted' | 'public'>('private')
  const [madeForKids, setMadeForKids] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [customThumbPrompt, setCustomThumbPrompt] = useState('')
  const [showThumbOptions, setShowThumbOptions] = useState(false)

  const [attachYoutubeLocalizations, setAttachYoutubeLocalizations] = useState(true)
  const [selectedMlaLanguages, setSelectedMlaLanguages] = useState<string[]>([])
  const [mlaTrackResults, setMlaTrackResults] = useState<AudioTrackResult[]>([])
  const [addingLangOpen, setAddingLangOpen] = useState(false)

  const [pageId, setPageId] = useState<string>('')
  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([])
  const [youtubeConnected, setYoutubeConnected] = useState(false)
  const [youtubeNeedsReconnect, setYoutubeNeedsReconnect] = useState(false)
  const [youtubeChannel, setYoutubeChannel] = useState<YouTubeChannelInfo | null>(null)
  const [oauthConfigured, setOauthConfigured] = useState(true)

  const [facebookConnected, setFacebookConnected] = useState(false)
  const [facebookOauthConfigured, setFacebookOauthConfigured] = useState(true)
  const [tiktokConnected, setTiktokConnected] = useState(false)
  const [tiktokOauthConfigured, setTiktokOauthConfigured] = useState(true)
  const [busy, setBusy] = useState<
    'prepare' | 'ship' | 'ship-all' | 'meta' | 'translate' | 'thumb' | 'disconnect' | null
  >(null)
  const [statusText, setStatusText] = useState('')
  const [preVisRenderOpen, setPreVisRenderOpen] = useState(false)
  const [previewVideoOpen, setPreviewVideoOpen] = useState(false)

  const latestMetadataRef = useRef<unknown>(metadata)
  useEffect(() => {
    latestMetadataRef.current = metadata
  }, [metadata])

  // Subscribe to live Pre-Vis scene & combined stitch renders from PreVisRenderDialog
  useEffect(() => {
    const onSceneAppended = (evt: Event) => {
      const detail = (evt as CustomEvent<{ sceneId?: string; stream?: ProductionStream }>).detail
      if (!detail?.sceneId || !detail.stream) return
      setLiveSceneStreams((prev) => ({
        ...prev,
        [detail.sceneId!]: [...(prev[detail.sceneId!] || []), detail.stream!],
      }))
    }
    const onPreVisMasterSaved = (
      evt: Event
    ) => {
      const detail = (
        evt as CustomEvent<{ projectId?: string; asset?: PreVisMasterAsset }>
      ).detail
      if (!detail?.asset?.language || !detail.asset.mp4Url) return
      if (detail.projectId && detail.projectId !== projectId) return
      setLivePreVisMasters((prev) => ({
        ...prev,
        [detail.asset!.language]: detail.asset!,
      }))
    }
    window.addEventListener(SCENE_RENDER_APPENDED_EVENT, onSceneAppended)
    window.addEventListener(PREVIS_MASTER_SAVED_EVENT, onPreVisMasterSaved)
    return () => {
      window.removeEventListener(SCENE_RENDER_APPENDED_EVENT, onSceneAppended)
      window.removeEventListener(PREVIS_MASTER_SAVED_EVENT, onPreVisMasterSaved)
    }
  }, [projectId])

  const scenes = useMemo(
    () => collectPublishScenes(rawScenes, production as never, language),
    [rawScenes, production, language]
  )
  const previsScenes = useMemo(
    () => collectPublishPreVisScenes(rawScenes, production as never, language),
    [rawScenes, production, language]
  )
  const chapters = useMemo(() => listPublishChapters(scenes), [scenes])

  const languages = useMemo(() => {
    const fromStreams = streams.map((stream) => stream.language).filter(Boolean)
    const fromPreVisMasters = Object.keys(effectivePreVisByLanguage)
    const fromYoutubeBundles = Object.keys(effectiveYoutubeByLanguage)
    const fromAudio = getAvailablePublishLanguages(metadata)
    const combined = collectPreVisLanguages(rawScenes, [
      ...fromStreams,
      ...fromPreVisMasters,
      ...fromYoutubeBundles,
      ...fromAudio,
      ...extraLanguages,
    ])
    return combined.length > 0 ? combined : ['en']
  }, [rawScenes, streams, effectivePreVisByLanguage, effectiveYoutubeByLanguage, metadata, extraLanguages])

  const mlaCandidateLanguages = useMemo(() => {
    const audioLangs = getAvailablePublishLanguages(metadata)
    return audioLangs.filter((l) => l !== language)
  }, [metadata, language])

  const frameCandidates = useMemo(
    () => extractFrameCandidates(rawScenes, production, metadata),
    [rawScenes, production, metadata]
  )
  const storyContext = useMemo(
    () => extractProjectStoryContext(metadata, rawScenes),
    [metadata, rawScenes]
  )

  useEffect(() => {
    if (!languages.includes(language)) setLanguage(languages[0] || 'en')
  }, [languages, language])

  useEffect(() => {
    if (!sceneId && scenes[0]) setSceneId(scenes[0].id)
  }, [sceneId, scenes])

  useEffect(() => {
    if (beatIndex == null && chapters[0]) setBeatIndex(chapters[0].beatIndex)
  }, [beatIndex, chapters])

  const promo = promoAssetForLanguage(publishingState.promo, language)
  const resolvedPromoStreamUrl = useMemo(
    () =>
      resolvePromoScreeningVideoUrl({
        scenes: rawScenes,
        sceneProductionState: production as Record<string, unknown>,
        language,
        finalCut: readFinalCutSelection(metadata),
        activePromoId: publishingState.promo?.activePromoId,
        fallbackPromoTrailerUrl: promo?.mp4Url || null,
      }),
    [rawScenes, production, language, metadata, publishingState.promo?.activePromoId, promo?.mp4Url]
  )

  useEffect(() => {
    if (kind !== 'promo') return
    if (promo?.aspect === '16:9' || promo?.aspect === '9:16') {
      setAspect(promo.aspect)
      return
    }
    setAspect(resolvePromoFrameAspect(metadata))
  }, [kind, promo, metadata])

  const resolvePlanForLanguage = useCallback(
    (targetLang: string) => {
      const langScenes =
        targetLang === language
          ? scenes
          : collectPublishScenes(rawScenes, production as never, targetLang)
      const langPrevisScenes =
        targetLang === language
          ? previsScenes
          : collectPublishPreVisScenes(rawScenes, production as never, targetLang)
      const langPrevisMaster = effectivePreVisByLanguage[targetLang]
      const langPromo = promoAssetForLanguage(publishingState.promo, targetLang)
      const langPromoUrl =
        targetLang === language
          ? resolvedPromoStreamUrl
          : resolvePromoScreeningVideoUrl({
              scenes: rawScenes,
              sceneProductionState: production as Record<string, unknown>,
              language: targetLang,
              finalCut: readFinalCutSelection(metadata),
              activePromoId: publishingState.promo?.activePromoId,
              fallbackPromoTrailerUrl: langPromo?.mp4Url || null,
            })

      return resolvePublishDelivery({
        kind,
        aspectRatio: aspect,
        language: targetLang,
        sceneId,
        beatIndex,
        scenes: langScenes,
        previsScenes: langPrevisScenes,
        previs: langPrevisMaster
          ? {
              mp4Url: langPrevisMaster.mp4Url,
              durationSec: langPrevisMaster.durationSec,
              sceneCount: langPrevisMaster.sceneCount,
              status: langPrevisMaster.status,
            }
          : undefined,
        streams: streams
          .filter((s) => s.format !== 'animatic')
          .map((stream) => ({
            language: stream.language,
            mp4Url: stream.mp4Url || undefined,
            status: stream.status,
          })),
        promo:
          langPromoUrl || langPromo
            ? {
                mp4Url: langPromoUrl || langPromo?.mp4Url,
                durationSec: langPromo?.durationSec,
                status: langPromoUrl ? 'ready' : langPromo?.status,
                aspect: langPromo?.aspect ?? resolvePromoFrameAspect(metadata),
              }
            : undefined,
        projectTitle,
      })
    },
    [
      kind,
      aspect,
      language,
      sceneId,
      beatIndex,
      scenes,
      previsScenes,
      rawScenes,
      production,
      effectivePreVisByLanguage,
      publishingState.promo,
      resolvedPromoStreamUrl,
      metadata,
      streams,
      projectTitle,
    ]
  )

  const plan = useMemo(() => resolvePlanForLanguage(language), [resolvePlanForLanguage, language])
  const savedUnit = publishingState.units?.find((unit) => unit.id === plan.id)
  const readyUrl = savedUnit?.mp4Url || (!plan.needsRender ? plan.mp4Url : undefined)

  // Compute ready URLs across all languages for batch multi-language video publishing & status dots
  const languageDeliveryStatus = useMemo(() => {
    const map: Record<string, { readyUrl?: string; needsRender: boolean; blocked: boolean }> = {}
    for (const lang of languages) {
      const p = resolvePlanForLanguage(lang)
      const u = publishingState.units?.find((unit) => unit.id === p.id)
      const rUrl = u?.mp4Url || (!p.needsRender ? p.mp4Url : undefined)
      map[lang] = {
        readyUrl: rUrl,
        needsRender: p.needsRender && !rUrl,
        blocked: Boolean(p.blockedReason) && !rUrl,
      }
    }
    return map
  }, [languages, resolvePlanForLanguage, publishingState.units])

  const readyLanguageCount = useMemo(
    () => languages.filter((lang) => Boolean(languageDeliveryStatus[lang]?.readyUrl)).length,
    [languages, languageDeliveryStatus]
  )

  // Hydrate form fields when switching unit / language
  const activeBundle = effectiveYoutubeByLanguage[language]
  useEffect(() => {
    const bundle = effectiveYoutubeByLanguage[language]
    setTitle(savedUnit?.title || bundle?.title || plan.title)
    setDescription(savedUnit?.description || bundle?.description || '')
    setTagsText(bundle?.tags?.join(', ') || '')
    if (bundle?.categoryId) setCategoryId(bundle.categoryId)
    setPrivacyStatus(savedUnit?.privacyStatus || bundle?.privacyStatus || 'private')
    setMadeForKids(Boolean(bundle?.madeForKids))
    setThumbnailUrl(bundle?.thumbnailUrl || frameCandidates[0]?.url || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, language])

  const refreshConnections = useCallback(async () => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : ''
    const [youtube, facebook, tiktok] = await Promise.all([
      fetch(`/api/publish/youtube/upload${query}`)
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(`/api/publish/facebook/upload${query}`)
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(`/api/publish/tiktok/upload${query}`)
        .then((r) => r.json())
        .catch(() => ({})),
    ])
    setYoutubeConnected(Boolean(youtube.connected))
    setYoutubeNeedsReconnect(Boolean(youtube.needsReconnect))
    setYoutubeChannel(youtube.channel || null)
    setOauthConfigured(youtube.oauthConfigured !== false)
    setFacebookConnected(Boolean(facebook.connected))
    setFacebookOauthConfigured(facebook.oauthConfigured !== false)
    setTiktokConnected(Boolean(tiktok.connected))
    setTiktokOauthConfigured(tiktok.oauthConfigured !== false)
    setPages(Array.isArray(facebook.pages) ? facebook.pages : [])
    if (facebook.pageId) setPageId(facebook.pageId)
  }, [userId])

  useEffect(() => {
    void refreshConnections()
  }, [refreshConnections])

  // Detect OAuth callback return query parameters (?youtube=connected, etc.)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const ytParam = url.searchParams.get('youtube')
    const fbParam = url.searchParams.get('facebook')
    const ttParam = url.searchParams.get('tiktok')
    if (!ytParam && !fbParam && !ttParam) return

    if (ytParam === 'connected') {
      toast.success('YouTube account connected!')
      setDestination('youtube')
      void refreshConnections()
    } else if (ytParam === 'not_configured') {
      toast.error('YouTube publishing is temporarily unavailable while platform authorization is being enabled.')
      setDestination('youtube')
    } else if (ytParam === 'error' || ytParam === 'callback_failed') {
      toast.error('YouTube authorization was cancelled or failed. Please try again.')
      setDestination('youtube')
    }

    if (fbParam === 'connected') {
      toast.success('Facebook account connected!')
      setDestination('facebook')
      void refreshConnections()
    } else if (fbParam === 'not_configured') {
      toast.error('Facebook publishing is temporarily unavailable while platform authorization is being enabled.')
      setDestination('facebook')
    }
    if (ttParam === 'connected') {
      toast.success('TikTok account connected!')
      setDestination('tiktok')
      void refreshConnections()
    } else if (ttParam === 'not_configured') {
      toast.error('TikTok publishing is temporarily unavailable while platform authorization is being enabled.')
      setDestination('tiktok')
    }

    url.searchParams.delete('youtube')
    url.searchParams.delete('facebook')
    url.searchParams.delete('tiktok')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [refreshConnections])

  const parsedTags = useMemo(
    () =>
      tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsText]
  )

  const saveLanguageMetadataDraft = useCallback(
    async (
      targetLang: string,
      patch: Partial<YoutubePublishBundle>,
      baseMeta?: Record<string, unknown>
    ): Promise<Record<string, unknown>> => {
      setLocalYoutubeBundles((prev) => {
        const existing = prev[targetLang] ||
          effectiveYoutubeByLanguage[targetLang] || {
            language: targetLang,
            title: '',
            description: '',
            privacyStatus: 'private' as const,
            status: 'draft' as const,
          }
        return {
          ...prev,
          [targetLang]: { ...existing, ...patch, language: targetLang },
        }
      })
      const currentMeta = (baseMeta || (latestMetadataRef.current as Record<string, unknown>) || {})
      const next = upsertYoutubeBundle(currentMeta, targetLang, patch)
      latestMetadataRef.current = next
      if (onSaveMetadata) {
        await onSaveMetadata(next)
      }
      return next
    },
    [effectiveYoutubeByLanguage, onSaveMetadata]
  )

  const connect = (platform: 'youtube' | 'facebook' | 'tiktok') => {
    const returnUrl = new URL(window.location.href)
    returnUrl.searchParams.set('view', 'streams')
    returnUrl.searchParams.set('shipKind', kind)
    returnUrl.searchParams.set('shipLang', language)
    if (kind === 'scene' && sceneId) returnUrl.searchParams.set('shipSceneId', sceneId)
    if (kind === 'chapter' && typeof beatIndex === 'number') {
      returnUrl.searchParams.set('shipBeatIndex', String(beatIndex))
    }
    const returnTo = `${returnUrl.pathname}${returnUrl.search}`
    const params = new URLSearchParams({ returnTo })
    if (userId) params.set('userId', userId)
    window.location.href = `/api/publish/${platform}/auth?${params.toString()}`
  }

  const disconnectYoutube = async () => {
    setBusy('disconnect')
    try {
      const ytQuery = userId ? `?userId=${encodeURIComponent(userId)}` : ''
      const res = await fetch(`/api/publish/youtube/upload${ytQuery}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to disconnect YouTube')
      }
      setYoutubeConnected(false)
      setYoutubeChannel(null)
      setYoutubeNeedsReconnect(false)
      toast.success('YouTube account disconnected')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect YouTube')
    } finally {
      setBusy(null)
    }
  }

  const suggestMetadata = async () => {
    setBusy('meta')
    try {
      const unitLabel =
        kind === 'scene'
          ? scenes.find((s) => s.id === sceneId)?.title
          : kind === 'chapter'
            ? chapters.find((c) => c.beatIndex === beatIndex)?.title
            : KINDS.find((k) => k.id === kind)?.label

      const res = await fetch('/api/inspiration/descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          projectTitle: projectTitle || title,
          synopsis: storyContext.synopsis,
          genre: storyContext.genre,
          sceneHeadings: storyContext.sceneHeadings,
          unitKind: kind,
          unitLabel,
          locale: language,
          platform: DESTINATIONS.find((d) => d.id === destination)?.label || 'YouTube',
          includeSceneFlowCta: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not generate metadata')
      const nextTitle = data.title || title
      const nextDesc = data.description || description
      const nextTags: string[] = Array.isArray(data.tags) ? data.tags : parsedTags

      setTitle(nextTitle)
      setDescription(nextDesc)
      setTagsText(nextTags.join(', '))

      await saveLanguageMetadataDraft(language, {
        title: nextTitle,
        description: nextDesc,
        tags: nextTags,
        categoryId,
        privacyStatus,
        madeForKids,
        thumbnailUrl: thumbnailUrl || undefined,
        status: 'ready',
      })

      toast.success(`Generated ${getLanguageDisplayName(language)} title, description & tags`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate metadata')
    } finally {
      setBusy(null)
    }
  }

  const translateMetadataToAllLanguages = async () => {
    if (!title.trim()) {
      toast.error('Enter or generate a title first before translating')
      return
    }
    const targetLanguages = languages.filter((l) => l !== language)
    if (targetLanguages.length === 0) {
      setAddingLangOpen(true)
      toast.info('Add at least one target language to translate metadata into')
      return
    }

    setBusy('translate')
    try {
      const res = await fetch('/api/inspiration/descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translate',
          sourceLanguage: language,
          sourceTitle: title,
          sourceDescription: description,
          sourceTags: parsedTags,
          targetLanguages: languages,
          includeSceneFlowCta: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Translation failed')

      const translations = (data.translations || {}) as Record<
        string,
        { title: string; description: string; tags?: string[] }
      >

      const bundlePatches: Record<string, Partial<YoutubePublishBundle>> = {}
      for (const [langCode, item] of Object.entries(translations)) {
        if (!item?.title) continue
        const existing = effectiveYoutubeByLanguage[langCode]
        bundlePatches[langCode] = {
          title: item.title,
          description: item.description || '',
          tags: item.tags || parsedTags,
          categoryId: existing?.categoryId || categoryId,
          privacyStatus: existing?.privacyStatus || privacyStatus,
          madeForKids: existing?.madeForKids ?? madeForKids,
          thumbnailUrl: existing?.thumbnailUrl || thumbnailUrl || undefined,
          status: existing?.status === 'published' ? 'published' : 'ready',
        }
      }

      setLocalYoutubeBundles((prev) => {
        const next = { ...prev }
        for (const [langCode, patch] of Object.entries(bundlePatches)) {
          const base = next[langCode] ||
            effectiveYoutubeByLanguage[langCode] || {
              language: langCode,
              title: '',
              description: '',
              privacyStatus: 'private' as const,
              status: 'draft' as const,
            }
          next[langCode] = { ...base, ...patch, language: langCode }
        }
        return next
      })

      if (onSaveMetadata) {
        const currentMeta = (latestMetadataRef.current as Record<string, unknown>) || {}
        const nextMeta = upsertYoutubeBundles(currentMeta, bundlePatches)
        latestMetadataRef.current = nextMeta
        await onSaveMetadata(nextMeta)
      }

      toast.success(
        `Translated YouTube metadata across ${Object.keys(bundlePatches).length} languages!`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to translate metadata')
    } finally {
      setBusy(null)
    }
  }

  const generateThumbnail = async () => {
    setBusy('thumb')
    try {
      const res = await fetch('/api/publish/youtube/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectTitle: projectTitle || title,
          videoTitle: title || projectTitle,
          synopsis: storyContext.synopsis,
          genre: storyContext.genre,
          unitKind: kind,
          language,
          aspectRatio: aspect,
          customPrompt: customThumbPrompt.trim() || undefined,
          referenceImageUrl: frameCandidates[0]?.url,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate thumbnail')
      const nextThumbUrl = data.thumbnailUrl as string
      setThumbnailUrl(nextThumbUrl)

      // Apply thumbnail across the current language and any language without a custom thumbnail yet
      const patches: Record<string, Partial<YoutubePublishBundle>> = {
        [language]: {
          title: title || plan.title,
          description,
          tags: parsedTags,
          privacyStatus,
          thumbnailUrl: nextThumbUrl,
          thumbnailPrompt: data.promptUsed,
        },
      }
      for (const lang of languages) {
        if (lang !== language && !effectiveYoutubeByLanguage[lang]?.thumbnailUrl) {
          patches[lang] = { thumbnailUrl: nextThumbUrl }
        }
      }

      setLocalYoutubeBundles((prev) => {
        const next = { ...prev }
        for (const [lang, patch] of Object.entries(patches)) {
          const base = next[lang] ||
            effectiveYoutubeByLanguage[lang] || {
              language: lang,
              title: '',
              description: '',
              privacyStatus: 'private' as const,
              status: 'draft' as const,
            }
          next[lang] = { ...base, ...patch, language: lang }
        }
        return next
      })

      if (onSaveMetadata) {
        const currentMeta = (latestMetadataRef.current as Record<string, unknown>) || {}
        const nextMeta = upsertYoutubeBundles(currentMeta, patches)
        latestMetadataRef.current = nextMeta
        await onSaveMetadata(nextMeta)
      }

      toast.success('Generated YouTube thumbnail!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thumbnail generation failed')
    } finally {
      setBusy(null)
    }
  }

  const persistUnit = useCallback(
    async (
      mp4Url: string,
      destinationPatch?: PublishDestinationId,
      url?: string,
      error?: string,
      overridePlan?: ReturnType<typeof resolvePublishDelivery>,
      overrideMeta?: { title?: string; description?: string }
    ) => {
      if (!onSaveMetadata) return
      const targetPlan = overridePlan || plan
      const currentMeta = (latestMetadataRef.current as Record<string, unknown>) || {}
      const existingUnit = getPublishingState(currentMeta).units?.find(
        (u) => u.id === targetPlan.id
      )
      const next = upsertPublishUnit(currentMeta, {
        id: targetPlan.id,
        kind: targetPlan.kind,
        aspectRatio: targetPlan.aspectRatio,
        language: targetPlan.language,
        title: overrideMeta?.title ?? title,
        description: overrideMeta?.description ?? description,
        mp4Url,
        sceneId: targetPlan.sceneId,
        blueprintBeatIndex: targetPlan.blueprintBeatIndex,
        privacyStatus,
        renderedAt: new Date().toISOString(),
        destinations: destinationPatch
          ? {
              ...(existingUnit?.destinations || {}),
              [destinationPatch]: error
                ? { status: 'error', error }
                : {
                    status: destinationPatch === 'download' ? 'ready' : 'published',
                    url,
                    publishedAt: new Date().toISOString(),
                  },
            }
          : existingUnit?.destinations,
      })
      latestMetadataRef.current = next
      await onSaveMetadata(next)
    },
    [onSaveMetadata, plan, title, description, privacyStatus]
  )

  const prepare = async () => {
    if (plan.blockedReason) {
      toast.error(plan.blockedReason)
      return
    }
    if (!plan.needsRender && plan.mp4Url) {
      await persistUnit(plan.mp4Url)
      toast.success('Package is ready to ship')
      return
    }
    if (plan.clips.length === 0) {
      toast.error(plan.blockedReason || 'Nothing to render')
      return
    }

    setBusy('prepare')
    try {
      // Fast server-side FFmpeg stitch path for 16:9 multi-scene Pre-Vis
      if (kind === 'previs' && aspect === '16:9' && plan.clips.length >= 2) {
        setStatusText(`Stitching ${plan.clips.length} Pre-Vis scenes (${getLanguageDisplayName(language)})…`)
        const stitchRes = await fetch('/api/export/previs-stitch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urls: plan.clips.map((c) => c.url),
            durations: plan.clips.map((c) => c.duration),
            projectId,
            language,
            container: 'mp4',
            resolution: '1080p',
          }),
        })
        const stitchData = await stitchRes.json()
        if (!stitchRes.ok || !stitchData.url) {
          throw new Error(stitchData.error || 'Failed to stitch Pre-Vis scenes')
        }
        const stitchedUrl = stitchData.url as string
        const totalDuration = plan.clips.reduce((acc, c) => acc + (c.duration || 0), 0)
        const masterAsset: PreVisMasterAsset = {
          mp4Url: stitchedUrl,
          language,
          durationSec: totalDuration,
          sceneCount: plan.clips.length,
          resolution: '1080p',
          renderedAt: new Date().toISOString(),
          status: 'ready',
        }
        setLivePreVisMasters((prev) => ({ ...prev, [language]: masterAsset }))
        await savePreVisMasterClient(projectId, masterAsset).catch(() => undefined)
        if (onSaveMetadata) {
          const currentMeta = (latestMetadataRef.current as Record<string, unknown>) || {}
          const withPreVis = upsertPreVisMaster(currentMeta, language, masterAsset)
          latestMetadataRef.current = withPreVis
          await onSaveMetadata(withPreVis)
        }
        await persistUnit(stitchedUrl)
        toast.success(`Stitched ${plan.clips.length} Pre-Vis scenes — package is ready!`)
        return
      }

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
        forceCloudRun: plan.aspectRatio === '9:16',
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

  const buildYoutubeLocalizationsPayload = useCallback(
    (primaryLang: string): Record<string, { title: string; description: string }> | undefined => {
      if (!attachYoutubeLocalizations) return undefined
      const out: Record<string, { title: string; description: string }> = {}
      for (const lang of languages) {
        if (lang === primaryLang) continue
        const b = effectiveYoutubeByLanguage[lang]
        if (b?.title?.trim()) {
          out[lang] = {
            title: b.title.trim(),
            description: b.description || '',
          }
        }
      }
      return Object.keys(out).length > 0 ? out : undefined
    },
    [attachYoutubeLocalizations, languages, effectiveYoutubeByLanguage]
  )

  const ship = async () => {
    const videoUrl = readyUrl
    if (!videoUrl) {
      toast.error('Prepare or render the video package before shipping it.')
      return
    }
    if (!title.trim()) {
      toast.error('Add a title before publishing.')
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

    if (destination === 'youtube' && !youtubeConnected) {
      toast.error('Connect your YouTube account first.')
      return
    }
    if (destination !== 'youtube' && !userId) {
      toast.error('Sign in to publish')
      return
    }

    setBusy('ship')
    setMlaTrackResults([])
    try {
      if (destination === 'youtube') {
        const preparedAudioTracks: Array<{ languageCode: string; audioUrl: string }> = []
        if (selectedMlaLanguages.length > 0) {
          const projectLike = { id: projectId, metadata: latestMetadataRef.current }
          for (let i = 0; i < selectedMlaLanguages.length; i++) {
            const mlaLang = selectedMlaLanguages[i]!
            const label = getLanguageDisplayName(mlaLang)
            setStatusText(`Stitching ${label} dubbed audio (${i + 1}/${selectedMlaLanguages.length})…`)
            const audioPlan = buildLanguageAudioTrack(projectLike, mlaLang)
            if (audioPlan.clips.length === 0) continue
            const blob = await stitchAudioTrack({
              clips: audioPlan.clips,
              totalDuration: audioPlan.totalDuration,
            })
            setStatusText(`Uploading ${label} audio track…`)
            const audioUrl = await uploadAudioTrackBlob(blob, projectId, mlaLang)
            preparedAudioTracks.push({ languageCode: mlaLang, audioUrl })
          }
        }

        const localizationsPayload = buildYoutubeLocalizationsPayload(language)
        setStatusText(
          `Uploading ${getLanguageDisplayName(language)} video${thumbnailUrl ? ' & thumbnail' : ''}${
            localizationsPayload ? ` + ${Object.keys(localizationsPayload).length} language translations` : ''
          } to YouTube…`
        )

        const res = await fetch('/api/publish/youtube/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            videoUrl,
            title,
            description,
            privacyStatus,
            language,
            thumbnailUrl: thumbnailUrl.trim() || undefined,
            tags: parsedTags.length > 0 ? parsedTags : undefined,
            categoryId,
            madeForKids,
            localizations: localizationsPayload,
            audioTracks: preparedAudioTracks,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'YouTube upload failed')

        const publishedUrl = data.url as string
        setMlaTrackResults(data.audioTracks || [])

        await saveLanguageMetadataDraft(language, {
          title,
          description,
          tags: parsedTags,
          categoryId,
          privacyStatus,
          madeForKids,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          videoId: data.videoId,
          youtubeUrl: publishedUrl,
          publishedAt: new Date().toISOString(),
          localizedLanguages: data.localizationsApplied || [],
          status: 'published',
          error: undefined,
        })
        await persistUnit(videoUrl, 'youtube', publishedUrl)

        const locCount = Array.isArray(data.localizationsApplied)
          ? data.localizationsApplied.length
          : 0
        toast.success(
          locCount > 0
            ? `Published to YouTube with ${locCount} translated language${locCount > 1 ? 's' : ''}!`
            : 'Published to YouTube!'
        )
        return
      }

      const endpoint =
        destination === 'facebook'
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
      const url =
        data.url || data.youtubeUrl || (data.publishId ? `tiktok:${data.publishId}` : videoUrl)
      await persistUnit(videoUrl, destination, url)
      toast.success(
        destination === 'tiktok'
          ? data.note || 'Sent to TikTok'
          : `Shipped to ${DESTINATIONS.find((item) => item.id === destination)?.label}`
      )
    } catch (err) {
      const message =
        err instanceof AudioTrackTooLongError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Publish failed'
      await persistUnit(videoUrl, destination, undefined, message).catch(() => undefined)
      toast.error(message)
    } finally {
      setBusy(null)
      setStatusText('')
    }
  }

  const shipAllReadyLanguagesToYoutube = async () => {
    if (!youtubeConnected) {
      toast.error('Connect your YouTube account first.')
      return
    }
    const readyLangs = languages.filter((lang) => Boolean(languageDeliveryStatus[lang]?.readyUrl))
    if (readyLangs.length === 0) {
      toast.error('No language deliverables are ready yet.')
      return
    }

    setBusy('ship-all')
    let publishedCount = 0
    try {
      // Auto-translate missing titles first so every language version publishes with localized metadata
      const missingMetaLangs = readyLangs.filter(
        (lang) => lang !== language && !effectiveYoutubeByLanguage[lang]?.title?.trim()
      )
      let latestBundles: Record<string, YoutubePublishBundle> = {
        ...effectiveYoutubeByLanguage,
        [language]: {
          ...(effectiveYoutubeByLanguage[language] || {
            language,
            privacyStatus,
            status: 'ready',
          }),
          title: title || plan.title,
          description,
          tags: parsedTags,
          categoryId,
          privacyStatus,
          madeForKids,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
        },
      }

      if (missingMetaLangs.length > 0 && title.trim()) {
        setStatusText(`Translating metadata for ${missingMetaLangs.length} language version(s)…`)
        const trRes = await fetch('/api/inspiration/descriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'translate',
            sourceLanguage: language,
            sourceTitle: title,
            sourceDescription: description,
            sourceTags: parsedTags,
            targetLanguages: missingMetaLangs,
            includeSceneFlowCta: true,
          }),
        })
        const trData = await trRes.json().catch(() => ({}))
        if (trRes.ok && trData.translations) {
          for (const lang of missingMetaLangs) {
            const tr = trData.translations[lang]
            if (tr?.title) {
              latestBundles[lang] = {
                language: lang,
                title: tr.title,
                description: tr.description || '',
                tags: tr.tags || parsedTags,
                categoryId,
                privacyStatus,
                madeForKids,
                thumbnailUrl: thumbnailUrl.trim() || undefined,
                status: 'ready',
              }
            }
          }
        }
      }

      for (let i = 0; i < readyLangs.length; i++) {
        const lang = readyLangs[i]!
        const langPlan = resolvePlanForLanguage(lang)
        const langVideoUrl = languageDeliveryStatus[lang]?.readyUrl
        if (!langVideoUrl) continue

        const bundle = latestBundles[lang]
        const langTitle = bundle?.title?.trim() || `${projectTitle || title} (${getLanguageDisplayName(lang)})`
        const langDesc = bundle?.description ?? description
        const langTags = bundle?.tags?.length ? bundle.tags : parsedTags
        const langThumb = bundle?.thumbnailUrl || thumbnailUrl.trim() || undefined

        setStatusText(
          `Publishing ${getLanguageDisplayName(lang)} version (${i + 1}/${readyLangs.length}) to YouTube…`
        )

        const res = await fetch('/api/publish/youtube/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            videoUrl: langVideoUrl,
            title: langTitle,
            description: langDesc,
            privacyStatus: bundle?.privacyStatus || privacyStatus,
            language: lang,
            thumbnailUrl: langThumb,
            tags: langTags.length > 0 ? langTags : undefined,
            categoryId: bundle?.categoryId || categoryId,
            madeForKids: bundle?.madeForKids ?? madeForKids,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(`${getLanguageDisplayName(lang)}: ${data.error || 'Upload failed'}`)
        }

        publishedCount += 1
        await saveLanguageMetadataDraft(lang, {
          title: langTitle,
          description: langDesc,
          tags: langTags,
          categoryId: bundle?.categoryId || categoryId,
          privacyStatus: bundle?.privacyStatus || privacyStatus,
          madeForKids: bundle?.madeForKids ?? madeForKids,
          thumbnailUrl: langThumb,
          videoId: data.videoId,
          youtubeUrl: data.url,
          publishedAt: new Date().toISOString(),
          status: 'published',
        })
        await persistUnit(langVideoUrl, 'youtube', data.url, undefined, langPlan, {
          title: langTitle,
          description: langDesc,
        })
      }

      toast.success(`Published ${publishedCount} language version(s) to YouTube!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Batch YouTube publish encountered an error')
    } finally {
      setBusy(null)
      setStatusText('')
    }
  }

  const publishedYoutubeUrl =
    savedUnit?.destinations?.youtube?.url || activeBundle?.youtubeUrl || undefined

  const translatedLangCount = useMemo(
    () =>
      languages.filter((l) => Boolean(effectiveYoutubeByLanguage[l]?.title?.trim())).length,
    [languages, effectiveYoutubeByLanguage]
  )

  const connected =
    destination === 'youtube'
      ? youtubeConnected
      : destination === 'facebook'
        ? facebookConnected
        : destination === 'tiktok'
          ? tiktokConnected
          : true

  const addableLanguages = useMemo(
    () => COMMON_TRANSLATION_LANGUAGES.filter((code) => !languages.includes(code)),
    [languages]
  )

  return (
    <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 pr-1">
      <div>
        <h3 className="text-sm font-semibold text-white">Package & Ship</h3>
        <p className="mt-1 text-xs text-zinc-400">
          Package a Scene, Chapter, stitched Pre-Vis, Master, or Promo — generate thumbnails &
          multi-language metadata — and publish directly to YouTube, Facebook, TikTok, or Download.
        </p>
      </div>

      {/* 1. Deliverable Kind + Frame + Language Selector */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((item) => (
              <button
                key={item.id}
                type="button"
                title={KIND_HINTS[item.id]}
                onClick={() => setKind(item.id)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  kind === item.id
                    ? item.id === 'previs'
                      ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100'
                      : 'border-violet-500/45 bg-violet-500/15 text-violet-100'
                    : 'border-zinc-700/80 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {ASPECTS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setAspect(item)}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                  aspect === item
                    ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-200'
                    : 'border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Language Pills + Add Translation Language */}
        <div className="flex flex-wrap items-center gap-1.5">
          {languages.map((lang) => {
            const delivery = languageDeliveryStatus[lang]
            const hasMeta = Boolean(effectiveYoutubeByLanguage[lang]?.title?.trim())
            const isPublished =
              effectiveYoutubeByLanguage[lang]?.status === 'published' ||
              Boolean(effectiveYoutubeByLanguage[lang]?.youtubeUrl)
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors',
                  language === lang
                    ? 'border-zinc-300 bg-zinc-800/90 text-white font-medium'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    delivery?.readyUrl
                      ? 'bg-emerald-400'
                      : delivery?.needsRender
                        ? 'bg-amber-400'
                        : 'bg-zinc-600'
                  )}
                  title={
                    delivery?.readyUrl
                      ? 'Video ready'
                      : delivery?.needsRender
                        ? 'Clips ready to stitch'
                        : 'Not rendered yet'
                  }
                />
                <span>{getLanguageDisplayName(lang)}</span>
                {hasMeta ? (
                  <span
                    className="text-[10px] text-cyan-300"
                    title="Localized title & description ready"
                  >
                    Aa
                  </span>
                ) : null}
                {isPublished ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : null}
              </button>
            )
          })}

          {addableLanguages.length > 0 ? (
            <div className="relative inline-flex items-center">
              {addingLangOpen ? (
                <select
                  autoFocus
                  value=""
                  onBlur={() => setAddingLangOpen(false)}
                  onChange={(e) => {
                    const code = e.target.value
                    if (code) {
                      setExtraLanguages((prev) =>
                        prev.includes(code) ? prev : [...prev, code]
                      )
                    }
                    setAddingLangOpen(false)
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                >
                  <option value="">Add language…</option>
                  {addableLanguages.map((code) => (
                    <option key={code} value={code}>
                      {getLanguageDisplayName(code)} ({code})
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingLangOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  title="Add target language for YouTube localization"
                >
                  <Plus className="h-3 w-3" />
                  Language
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Unit-specific Picker & Render Actions */}
        {kind === 'scene' ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select
              value={sceneId}
              onChange={(event) => setSceneId(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white"
            >
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.title}
                  {scene.mp4Url ? ' ✓' : ' (not rendered)'}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreVisRenderOpen(true)}
              className="h-8 text-xs border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50"
            >
              <Clapperboard className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
              Render Pre-Vis Scene
            </Button>
          </div>
        ) : null}

        {kind === 'chapter' ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select
              value={beatIndex ?? ''}
              onChange={(event) => setBeatIndex(Number(event.target.value))}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white"
            >
              {chapters.length === 0 ? (
                <option value="">No Blueprint chapters linked</option>
              ) : null}
              {chapters.map((chapter) => (
                <option key={chapter.beatIndex} value={chapter.beatIndex}>
                  {chapter.title} ({chapter.sceneIds.length} scene
                  {chapter.sceneIds.length === 1 ? '' : 's'})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreVisRenderOpen(true)}
              className="h-8 text-xs border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50"
            >
              <Clapperboard className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
              Render Chapter Pre-Vis
            </Button>
          </div>
        ) : null}

        {kind === 'previs' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-3 py-2">
            <div className="text-xs text-zinc-300">
              {effectivePreVisByLanguage[language]?.mp4Url ? (
                <span className="text-cyan-200">
                  Stitched Pre-Vis ready ({getLanguageDisplayName(language)})
                  {effectivePreVisByLanguage[language]?.sceneCount
                    ? ` · ${effectivePreVisByLanguage[language]?.sceneCount} scenes`
                    : ''}
                </span>
              ) : (
                <span>
                  {previsScenes.filter((s) => Boolean(s.mp4Url)).length}/{previsScenes.length} Pre-Vis
                  scenes rendered in {getLanguageDisplayName(language)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {plan.needsRender && !plan.blockedReason ? (
                <Button
                  size="sm"
                  onClick={() => void prepare()}
                  disabled={busy != null}
                  className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {busy === 'prepare' ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : null}
                  {aspect === '16:9' ? 'Stitch Pre-Vis Now' : 'Prepare 9:16 Pre-Vis'}
                </Button>
              ) : null}
              {rawScenes.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreVisRenderOpen(true)}
                  className="h-7 text-xs border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50"
                >
                  <Clapperboard className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
                  {effectivePreVisByLanguage[language]?.mp4Url
                    ? 'Re-render & Stitch Pre-Vis'
                    : 'Render & Stitch Pre-Vis'}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {kind === 'master' && rawScenes.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <span className="text-xs text-zinc-400">
              {readyUrl
                ? `${getLanguageDisplayName(language)} Master MP4 ready`
                : plan.needsRender && !plan.blockedReason
                  ? `${plan.clips.length} rendered scene(s) ready to stitch`
                  : 'Render final scene videos or switch to Pre-Vis above'}
            </span>
            <div className="flex items-center gap-2">
              {plan.needsRender && !plan.blockedReason ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void prepare()}
                  disabled={busy != null}
                  className="h-7 text-xs"
                >
                  {busy === 'prepare' ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Prepare Master Delivery
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Delivery Readiness Bar */}
        {plan.blockedReason && !readyUrl ? (
          <p className="text-xs text-amber-300">{plan.blockedReason}</p>
        ) : null}
        {plan.aspectNote ? <p className="text-xs text-zinc-400">{plan.aspectNote}</p> : null}

        {readyUrl ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-200 truncate">
                  Ready to ship · {getLanguageDisplayName(language)} ({aspect})
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewVideoOpen((v) => !v)}
                  className="text-[11px] text-emerald-300 hover:text-emerald-200 underline"
                >
                  {previewVideoOpen ? 'Hide preview' : 'Preview video'}
                </button>
              </div>
            </div>
            {previewVideoOpen ? (
              <video
                src={readyUrl}
                controls
                playsInline
                className="w-full max-h-56 rounded-lg border border-zinc-800 bg-black object-contain"
              />
            ) : null}
          </div>
        ) : kind !== 'previs' && kind !== 'master' && plan.needsRender && !plan.blockedReason ? (
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void prepare()}
              disabled={busy != null}
            >
              {busy === 'prepare' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Prepare Delivery ({aspect})
            </Button>
          </div>
        ) : null}
      </div>

      {/* 2. Destination Tabs & Account Connection Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {DESTINATIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDestination(item.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  destination === item.id
                    ? item.id === 'youtube'
                      ? 'border-red-500/45 bg-red-500/15 text-red-100'
                      : 'border-zinc-400 bg-zinc-800 text-white'
                    : 'border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                )}
              >
                {item.id === 'youtube' ? <Youtube className="h-3.5 w-3.5 text-red-400" /> : null}
                {item.id === 'facebook' ? <Facebook className="h-3.5 w-3.5 text-blue-400" /> : null}
                {item.id === 'tiktok' ? <Music2 className="h-3.5 w-3.5 text-pink-400" /> : null}
                {item.id === 'download' ? <Download className="h-3.5 w-3.5 text-emerald-400" /> : null}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* YouTube Account Connection Status (ALWAYS accessible) */}
        {destination === 'youtube' ? (
          <div className="rounded-lg border border-zinc-800/90 bg-zinc-900/40 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {youtubeConnected && youtubeChannel?.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={youtubeChannel.thumbnailUrl}
                    alt={youtubeChannel.title}
                    className="h-8 w-8 rounded-full border border-zinc-700 object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 shrink-0">
                    <Youtube
                      className={cn(
                        'h-4 w-4',
                        youtubeConnected ? 'text-red-400' : 'text-zinc-500'
                      )}
                    />
                  </div>
                )}

                <div className="min-w-0">
                  {youtubeConnected ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white truncate">
                          {youtubeChannel?.title || 'YouTube Account Connected'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Connected
                        </span>
                      </div>
                      {youtubeChannel?.customUrl ? (
                        <p className="text-[11px] text-zinc-400 truncate">
                          {youtubeChannel.customUrl}
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-500">
                          Authorized for video, thumbnail, localization & MLA uploads
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-zinc-200">
                        {youtubeNeedsReconnect
                          ? 'YouTube authorization expired — please reconnect'
                          : 'Authorize SceneFlow to publish to YouTube'}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {oauthConfigured
                          ? 'Sign in with Google once to grant SceneFlow permission to upload videos, thumbnails & localized metadata to your channel.'
                          : 'YouTube publishing is temporarily unavailable until SceneFlow platform authorization is enabled.'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {youtubeConnected ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => connect('youtube')}
                      className="h-7 text-xs border-zinc-700 text-zinc-300"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Switch Channel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void disconnectYoutube()}
                      disabled={busy === 'disconnect'}
                      className="h-7 text-xs border-zinc-700 text-zinc-400 hover:text-red-300"
                    >
                      {busy === 'disconnect' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Unlink className="h-3 w-3 mr-1" />
                      )}
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    disabled={!oauthConfigured}
                    onClick={() => connect('youtube')}
                    className="h-8 text-xs bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                  >
                    <Link2 className="h-3.5 w-3.5 mr-1.5" />
                    {youtubeNeedsReconnect ? 'Re-authorize YouTube' : 'Authorize YouTube'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {destination === 'facebook' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div>
              <p className="text-xs font-medium text-zinc-200">
                {facebookConnected ? 'Facebook Page connected' : 'Authorize SceneFlow to publish to Facebook'}
              </p>
              <p className="text-[11px] text-zinc-400">
                {facebookConnected
                  ? 'Select the Facebook Page to publish to.'
                  : facebookOauthConfigured
                    ? 'Sign in with Facebook once to grant SceneFlow permission to publish videos to your Page.'
                    : 'Facebook publishing is temporarily unavailable until SceneFlow platform authorization is enabled.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {facebookConnected && pages.length > 0 ? (
                <select
                  value={pageId}
                  onChange={(event) => setPageId(event.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-white"
                >
                  <option value="">Choose a Facebook Page</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button
                size="sm"
                variant={facebookConnected ? 'outline' : 'default'}
                onClick={() => connect('facebook')}
                disabled={!facebookConnected && !facebookOauthConfigured}
                className={cn(
                  'h-8 text-xs disabled:opacity-50',
                  !facebookConnected && 'bg-blue-600 hover:bg-blue-500 text-white'
                )}
              >
                <Link2 className="h-3.5 w-3.5 mr-1.5" />
                {facebookConnected ? 'Switch Account' : 'Authorize Facebook'}
              </Button>
            </div>
          </div>
        ) : null}

        {destination === 'tiktok' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div>
              <p className="text-xs font-medium text-zinc-200">
                {tiktokConnected ? 'TikTok account connected' : 'Authorize SceneFlow to publish to TikTok'}
              </p>
              <p className="text-[11px] text-zinc-400">
                {tiktokOauthConfigured
                  ? 'Sign in with TikTok once to grant SceneFlow permission to post videos to your account.'
                  : 'TikTok publishing is temporarily unavailable until SceneFlow platform authorization is enabled.'}
              </p>
            </div>
            <Button
              size="sm"
              variant={tiktokConnected ? 'outline' : 'default'}
              onClick={() => connect('tiktok')}
              disabled={!tiktokConnected && !tiktokOauthConfigured}
              className={cn(
                'h-8 text-xs disabled:opacity-50',
                !tiktokConnected && 'bg-zinc-100 hover:bg-white text-zinc-950'
              )}
            >
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              {tiktokConnected ? 'Switch Account' : 'Authorize TikTok'}
            </Button>
          </div>
        ) : null}
      </div>

      {/* 3. Thumbnail + Localized Metadata Editor */}
      {destination !== 'download' ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-white">
                Publishing Metadata · {getLanguageDisplayName(language)}
              </h4>
              <p className="text-[11px] text-zinc-400">
                Generate SEO copy & thumbnail, then translate across all {languages.length} language
                {languages.length === 1 ? '' : 's'}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void suggestMetadata()}
                disabled={busy != null}
                className="h-7 text-xs border-violet-500/40 bg-violet-950/30 text-violet-200 hover:bg-violet-900/40"
              >
                {busy === 'meta' ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-violet-300" />
                )}
                Generate with AI
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void translateMetadataToAllLanguages()}
                disabled={busy != null}
                className="h-7 text-xs border-cyan-500/40 bg-cyan-950/30 text-cyan-200 hover:bg-cyan-900/40"
              >
                {busy === 'translate' ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Languages className="mr-1.5 h-3.5 w-3.5 text-cyan-300" />
                )}
                Translate All Languages ({languages.length})
              </Button>
            </div>
          </div>

          {/* Thumbnail Studio (for YouTube) */}
          {destination === 'youtube' ? (
            <div className="rounded-lg border border-zinc-800/90 bg-zinc-900/35 p-3 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div
                  className={cn(
                    'relative overflow-hidden rounded-lg border border-zinc-700/80 bg-zinc-950 shrink-0 flex items-center justify-center',
                    aspect === '9:16' ? 'w-24 h-40' : 'w-44 h-24'
                  )}
                >
                  {thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailUrl}
                      alt="YouTube thumbnail preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-zinc-600 p-2 text-center">
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-[10px]">No thumbnail</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-200">
                      Video Thumbnail ({aspect === '9:16' ? '720×1280' : '1280×720'} JPEG)
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void generateThumbnail()}
                        disabled={busy != null}
                        className="h-7 text-xs border-amber-500/40 bg-amber-950/30 text-amber-200 hover:bg-amber-900/40"
                      >
                        {busy === 'thumb' ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
                        )}
                        Generate AI Thumbnail
                      </Button>
                      <button
                        type="button"
                        onClick={() => setShowThumbOptions((v) => !v)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 underline px-1"
                      >
                        {showThumbOptions ? 'Hide options' : 'Frames / Prompt'}
                      </button>
                    </div>
                  </div>

                  {frameCandidates.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {frameCandidates.slice(0, 6).map((frame) => (
                        <button
                          key={frame.url}
                          type="button"
                          onClick={() => setThumbnailUrl(frame.url)}
                          title={`Use ${frame.label}`}
                          className={cn(
                            'relative h-10 w-16 rounded border overflow-hidden shrink-0 transition-all',
                            thumbnailUrl === frame.url
                              ? 'border-amber-400 ring-1 ring-amber-400/50'
                              : 'border-zinc-700 opacity-75 hover:opacity-100'
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={frame.url}
                            alt={frame.label}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {showThumbOptions ? (
                    <div className="grid gap-1.5 pt-1">
                      <input
                        type="text"
                        value={customThumbPrompt}
                        onChange={(e) => setCustomThumbPrompt(e.target.value)}
                        placeholder="Optional custom AI thumbnail prompt…"
                        className="w-full rounded border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="url"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        placeholder="Or paste custom thumbnail HTTPS URL…"
                        className="w-full rounded border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* Title, Description, Tags, Category, Privacy */}
          <div className="grid gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-zinc-400">
                  Title ({getLanguageDisplayName(language)})
                </label>
                <span
                  className={cn(
                    'text-[10px]',
                    title.length > 100 ? 'text-amber-400' : 'text-zinc-500'
                  )}
                >
                  {title.length}/100
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  void saveLanguageMetadataDraft(language, {
                    title,
                    description,
                    tags: parsedTags,
                    categoryId,
                    privacyStatus,
                    madeForKids,
                    thumbnailUrl: thumbnailUrl || undefined,
                  })
                }}
                placeholder="Compelling video title"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-zinc-400">
                  Description ({getLanguageDisplayName(language)})
                </label>
                <span className="text-[10px] text-zinc-500">{description.length}/5000</span>
              </div>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={() => {
                  void saveLanguageMetadataDraft(language, {
                    title,
                    description,
                    tags: parsedTags,
                    categoryId,
                    privacyStatus,
                    madeForKids,
                    thumbnailUrl: thumbnailUrl || undefined,
                  })
                }}
                placeholder="Story hook, synopsis, credits, and links…"
                rows={4}
                className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-white"
              />
            </div>

            {destination === 'youtube' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="Sci-Fi, Short Film, SceneFlow, Pre-Vis"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
                  >
                    {YOUTUBE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-zinc-400">Visibility:</label>
                <select
                  value={privacyStatus}
                  onChange={(event) =>
                    setPrivacyStatus(event.target.value as 'private' | 'unlisted' | 'public')
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </div>

              {destination === 'youtube' ? (
                <label className="inline-flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={madeForKids}
                    onChange={(e) => setMadeForKids(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900"
                  />
                  Made for kids
                </label>
              ) : null}
            </div>
          </div>

          {/* Multi-Language YouTube Localizations & Optional Dubbed Audio (MLA) */}
          {destination === 'youtube' && languages.length > 1 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/35 p-3 space-y-2">
              <label className="flex items-start gap-2 text-xs text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachYoutubeLocalizations}
                  onChange={(e) => setAttachYoutubeLocalizations(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 bg-zinc-900"
                />
                <span>
                  <span className="font-medium">
                    Include multi-language YouTube title & description localizations
                  </span>
                  <span className="block text-[11px] text-zinc-400">
                    {translatedLangCount > 1
                      ? `${translatedLangCount}/${languages.length} languages translated — viewers automatically see your localized title & description in their YouTube language.`
                      : 'Click "Translate All Languages" above so YouTube shows localized titles & descriptions in every language.'}
                  </span>
                </span>
              </label>

              {mlaCandidateLanguages.length > 0 ? (
                <div className="pt-1 border-t border-zinc-800/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Globe className="h-3 w-3 text-cyan-400" />
                    <span>
                      Optional Multi-Language Audio (MLA) dubbed tracks on this upload:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mlaCandidateLanguages.map((lang) => {
                      const checked = selectedMlaLanguages.includes(lang)
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() =>
                            setSelectedMlaLanguages((prev) =>
                              checked ? prev.filter((l) => l !== lang) : [...prev, lang]
                            )
                          }
                          className={cn(
                            'rounded-md border px-2 py-0.5 text-[11px]',
                            checked
                              ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                              : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                          )}
                        >
                          {checked ? '✓ ' : '+ '}
                          {getLanguageDisplayName(lang)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 4. Final Ship / Publish Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
        <div className="min-w-0">
          {statusText ? (
            <p className="text-xs text-cyan-300 flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span className="truncate">{statusText}</span>
            </p>
          ) : publishedYoutubeUrl && destination === 'youtube' ? (
            <a
              href={publishedYoutubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 underline"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Published ({getLanguageDisplayName(language)}) · View on YouTube
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="text-xs text-zinc-400">
              {!readyUrl
                ? 'Render or stitch your deliverable above, then ship.'
                : destination === 'youtube' && !youtubeConnected
                  ? 'Connect your YouTube account above to publish.'
                  : `Ready to ship ${getLanguageDisplayName(language)} ${
                      KINDS.find((k) => k.id === kind)?.label
                    } (${aspect}).`}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {destination === 'youtube' && readyLanguageCount > 1 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void shipAllReadyLanguagesToYoutube()}
              disabled={busy != null || !youtubeConnected}
              className="border-red-500/35 bg-red-950/20 text-red-200 hover:bg-red-900/30 text-xs"
            >
              {busy === 'ship-all' ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="mr-1.5 h-3.5 w-3.5" />
              )}
              Publish All {readyLanguageCount} Language Videos
            </Button>
          ) : null}

          <Button
            size="sm"
            onClick={() => void ship()}
            disabled={
              busy != null ||
              !readyUrl ||
              (destination !== 'download' && !connected) ||
              (destination !== 'download' && !title.trim())
            }
            className={cn(
              'text-xs',
              destination === 'youtube' ? 'bg-red-600 hover:bg-red-500 text-white' : ''
            )}
          >
            {busy === 'ship' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {destination === 'download'
              ? `Download ${KINDS.find((k) => k.id === kind)?.label} MP4`
              : destination === 'youtube'
                ? `Publish ${getLanguageDisplayName(language)} to YouTube`
                : `Ship to ${DESTINATIONS.find((item) => item.id === destination)?.label}`}
          </Button>
        </div>
      </div>

      {/* MLA fallback download links if YouTube channel doesn't have MLA enabled */}
      {mlaTrackResults.some((t) => t.status === 'manual_required') ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 space-y-1.5">
          <p className="text-xs font-medium text-amber-200">
            Dubbed audio tracks ready for YouTube Studio Subtitles/Audio upload:
          </p>
          <div className="flex flex-wrap gap-2">
            {mlaTrackResults
              .filter((t) => t.status === 'manual_required')
              .map((t) => (
                <a
                  key={t.languageCode}
                  href={t.audioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-amber-500/40 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-900/40"
                >
                  <Download className="h-3 w-3" />
                  {getLanguageDisplayName(t.languageCode)} MP3
                </a>
              ))}
          </div>
        </div>
      ) : null}

      <PreVisRenderDialog
        open={preVisRenderOpen}
        onOpenChange={setPreVisRenderOpen}
        scenes={rawScenes}
        projectId={projectId}
        projectTitle={projectTitle}
        initialLanguage={language}
        initialCombineSelectedScenes={kind === 'previs' || kind === 'master'}
        initialSceneIndices={
          kind === 'scene'
            ? (() => {
                const idx = scenes.findIndex((s) => s.id === sceneId)
                return idx >= 0 ? [idx] : undefined
              })()
            : kind === 'chapter'
              ? scenes
                  .map((s, idx) => (s.blueprintBeatIndex === beatIndex ? idx : -1))
                  .filter((idx) => idx >= 0)
              : undefined
        }
        availableLanguages={languages}
        sceneProductionState={production as Record<string, SceneProductionData>}
        onSceneStreamRendered={(renderedSceneId, stream) => {
          setLiveSceneStreams((prev) => ({
            ...prev,
            [renderedSceneId]: [...(prev[renderedSceneId] || []), stream],
          }))
        }}
        onCombinedStreamRendered={(asset) => {
          setLivePreVisMasters((prev) => ({
            ...prev,
            [asset.language]: asset,
          }))
          if (onSaveMetadata) {
            const currentMeta = (latestMetadataRef.current as Record<string, unknown>) || {}
            const nextMeta = upsertPreVisMaster(currentMeta, asset.language, asset)
            latestMetadataRef.current = nextMeta
            void onSaveMetadata(nextMeta).catch(() => undefined)
          }
        }}
      />
    </div>
  )
}
