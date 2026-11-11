/**
 * Package & Ship units: a scene, a Blueprint chapter, a stitched Pre-Vis, the master, or a promo.
 * A chapter is the scenes that share one blueprintBeatIndex.
 */

import type { DeliveryAspectRatio } from '@/lib/video/renderTypes'
import { deliveryFrameSize } from '@/lib/video/renderTypes'

export type PublishAspectRatio = DeliveryAspectRatio
export type PublishUnitKind = 'scene' | 'chapter' | 'previs' | 'master' | 'promo'
export type PublishDestinationId = 'youtube' | 'facebook' | 'tiktok' | 'download'

export interface PublishDestinationStatus {
  status: 'draft' | 'ready' | 'published' | 'error'
  url?: string
  publishedAt?: string
  error?: string
}

export interface PublishUnitRecord {
  id: string
  kind: PublishUnitKind
  aspectRatio: PublishAspectRatio
  language: string
  title: string
  description?: string
  mp4Url?: string
  sceneId?: string
  blueprintBeatIndex?: number
  privacyStatus?: 'private' | 'unlisted' | 'public'
  destinations?: Partial<Record<PublishDestinationId, PublishDestinationStatus>>
  renderedAt?: string
}

export interface PublishSceneInput {
  id: string
  index: number
  sceneNumber: number
  title: string
  blueprintBeatIndex?: number
  blueprintBeatTitle?: string
  mp4Url?: string
  duration?: number
}

export interface PublishStreamInput {
  language: string
  mp4Url?: string
  status?: string
}

export interface PublishPromoInput {
  mp4Url?: string
  durationSec?: number
  status?: string
  /** Frame the promo was rendered in. Missing values are legacy vertical trailers. */
  aspect?: '16:9' | '9:16'
}

export interface PublishPreVisInput {
  mp4Url?: string
  durationSec?: number
  sceneCount?: number
  status?: string
}

export interface PublishStitchClip {
  sceneId: string
  sceneNumber: number
  url: string
  duration: number
  heading?: string
}

export interface PublishDeliveryPlan {
  id: string
  kind: PublishUnitKind
  aspectRatio: PublishAspectRatio
  language: string
  title: string
  mp4Url?: string
  sceneId?: string
  blueprintBeatIndex?: number
  clips: PublishStitchClip[]
  needsRender: boolean
  blockedReason?: string
  /** Shown when the delivery frame is padded rather than generated natively. */
  aspectNote?: string
}

export interface PublishChapterOption {
  beatIndex: number
  title: string
  sceneIds: string[]
}

const PAD_NOTE =
  'This delivery fits the picture inside the frame and pads the rest. A project generated in that aspect looks better than a padded file.'

export function publishUnitId(
  kind: PublishUnitKind,
  aspectRatio: PublishAspectRatio,
  language: string,
  sceneId?: string,
  beatIndex?: number
): string {
  if (kind === 'scene') return `scene:${sceneId || 'unknown'}:${language}:${aspectRatio}`
  if (kind === 'chapter') return `chapter:${beatIndex ?? 'unknown'}:${language}:${aspectRatio}`
  if (kind === 'previs') return `previs:${language}:${aspectRatio}`
  if (kind === 'promo') return `promo:${aspectRatio}`
  return `master:${language}:${aspectRatio}`
}

export function listPublishChapters(scenes: PublishSceneInput[]): PublishChapterOption[] {
  const order: number[] = []
  const groups = new Map<number, PublishChapterOption>()
  for (const scene of scenes) {
    if (typeof scene.blueprintBeatIndex !== 'number') continue
    let group = groups.get(scene.blueprintBeatIndex)
    if (!group) {
      group = {
        beatIndex: scene.blueprintBeatIndex,
        title: scene.blueprintBeatTitle || `Chapter ${scene.blueprintBeatIndex + 1}`,
        sceneIds: [],
      }
      groups.set(scene.blueprintBeatIndex, group)
      order.push(scene.blueprintBeatIndex)
    }
    group.sceneIds.push(scene.id)
  }
  return order.map((beatIndex) => groups.get(beatIndex)!)
}

function sceneHeading(scene: Record<string, unknown>, index: number): string {
  const heading = scene.heading
  if (typeof heading === 'string' && heading.trim()) return heading.trim()
  if (heading && typeof heading === 'object' && typeof (heading as { text?: unknown }).text === 'string') {
    const text = (heading as { text: string }).text.trim()
    if (text) return text
  }
  if (typeof scene.title === 'string' && scene.title.trim()) return scene.title.trim()
  const sceneNumber = typeof scene.sceneNumber === 'number' ? scene.sceneNumber : index + 1
  return `Scene ${sceneNumber}`
}

function sceneRecordId(scene: Record<string, unknown>, index: number): string {
  if (typeof scene.id === 'string' && scene.id) return scene.id
  if (typeof scene.sceneId === 'string' && scene.sceneId) return scene.sceneId
  return `scene-${index}`
}

interface StreamLike {
  status?: string
  mp4Url?: string | null
  language?: string
  streamType?: string
  streamVersion?: number
  duration?: number
  completedAt?: string
}

function compareStreamFreshness(a: StreamLike, b: StreamLike): number {
  const versionDiff = (b.streamVersion ?? 1) - (a.streamVersion ?? 1)
  if (versionDiff !== 0) return versionDiff
  const timeB = b.completedAt ? Date.parse(b.completedAt) || 0 : 0
  const timeA = a.completedAt ? Date.parse(a.completedAt) || 0 : 0
  return timeB - timeA
}

function pickReadyStream(streams: StreamLike[] | undefined, language: string): StreamLike | undefined {
  const ready = (streams || []).filter(
    (stream) => (stream.status === 'ready' || stream.status === 'complete') && stream.mp4Url
  )
  const inLanguage = ready.filter((stream) => stream.language === language)
  const pool = inLanguage.length > 0 ? inLanguage : ready
  const video = pool.filter((stream) => stream.streamType === 'video')
  const chosen = (video.length > 0 ? video : pool).slice().sort(compareStreamFreshness)
  return chosen[0]
}

function pickReadyAnimaticStream(
  streams: StreamLike[] | undefined,
  language: string
): StreamLike | undefined {
  const ready = (streams || []).filter(
    (stream) =>
      (stream.status === 'ready' || stream.status === 'complete') &&
      stream.streamType === 'animatic' &&
      Boolean(stream.mp4Url)
  )
  const matching = ready.filter(
    (stream) => stream.language === language || (!stream.language && language === 'en')
  )
  return matching.slice().sort(compareStreamFreshness)[0]
}

function estimateFallbackSceneDuration(scene: Record<string, unknown>): number | undefined {
  if (typeof scene.duration === 'number' && Number.isFinite(scene.duration) && scene.duration > 0) {
    return scene.duration
  }
  if (
    typeof scene.estimatedDuration === 'number' &&
    Number.isFinite(scene.estimatedDuration) &&
    scene.estimatedDuration > 0
  ) {
    return scene.estimatedDuration
  }
  return undefined
}

export function collectPublishScenes(
  scenes: Array<Record<string, unknown>>,
  production: Record<string, { productionStreams?: StreamLike[]; renderedSceneUrl?: string | null } | undefined>,
  language: string
): PublishSceneInput[] {
  return scenes.map((scene, index) => {
    const id = sceneRecordId(scene, index)
    const stream = pickReadyStream(production[id]?.productionStreams, language)
    const fallbackUrl =
      typeof production[id]?.renderedSceneUrl === 'string' ? production[id]?.renderedSceneUrl : undefined
    const mp4Url = stream?.mp4Url || fallbackUrl || undefined
    const beatIndex = scene.blueprintBeatIndex
    const beatTitle = scene.blueprintBeatTitle
    return {
      id,
      index,
      sceneNumber: typeof scene.sceneNumber === 'number' ? scene.sceneNumber : index + 1,
      title: sceneHeading(scene, index),
      blueprintBeatIndex: typeof beatIndex === 'number' ? beatIndex : undefined,
      blueprintBeatTitle: typeof beatTitle === 'string' ? beatTitle : undefined,
      mp4Url: mp4Url || undefined,
      duration: typeof stream?.duration === 'number' && stream.duration > 0 ? stream.duration : undefined,
    }
  })
}

/**
 * Collect per-scene Pre-Vis (`streamType === 'animatic'`) renders strictly for the target language.
 * Keeps Pre-Vis packaging cleanly separated from final `video` streams while supporting server-side
 * stitching of individual Pre-Vis scene renders in Package & Ship.
 */
export function collectPublishPreVisScenes(
  scenes: Array<Record<string, unknown>>,
  production: Record<string, { productionStreams?: StreamLike[]; renderedSceneUrl?: string | null } | undefined>,
  language: string
): PublishSceneInput[] {
  return scenes.map((scene, index) => {
    const id = sceneRecordId(scene, index)
    const stream = pickReadyAnimaticStream(production[id]?.productionStreams, language)
    const beatIndex = scene.blueprintBeatIndex
    const beatTitle = scene.blueprintBeatTitle
    const resolvedDuration =
      typeof stream?.duration === 'number' && stream.duration > 0
        ? stream.duration
        : stream?.mp4Url
          ? estimateFallbackSceneDuration(scene)
          : undefined
    return {
      id,
      index,
      sceneNumber: typeof scene.sceneNumber === 'number' ? scene.sceneNumber : index + 1,
      title: sceneHeading(scene, index),
      blueprintBeatIndex: typeof beatIndex === 'number' ? beatIndex : undefined,
      blueprintBeatTitle: typeof beatTitle === 'string' ? beatTitle : undefined,
      mp4Url: stream?.mp4Url || undefined,
      duration: resolvedDuration,
    }
  })
}

export function scriptScenesFromMetadata(metadata: unknown): Array<Record<string, unknown>> {
  if (!metadata || typeof metadata !== 'object') return []
  const visionPhase = (metadata as { visionPhase?: { script?: unknown } }).visionPhase
  const script = visionPhase?.script
  if (!script || typeof script !== 'object') return []
  const direct = (script as { scenes?: unknown }).scenes
  if (Array.isArray(direct)) return direct as Array<Record<string, unknown>>
  const nested = (script as { script?: { scenes?: unknown } }).script?.scenes
  return Array.isArray(nested) ? (nested as Array<Record<string, unknown>>) : []
}

function clipsFromScenes(scenes: PublishSceneInput[]): { clips: PublishStitchClip[]; missingDuration: string[] } {
  const clips: PublishStitchClip[] = []
  const missingDuration: string[] = []
  for (const scene of scenes) {
    if (!scene.mp4Url) continue
    if (typeof scene.duration !== 'number') {
      missingDuration.push(scene.title)
      continue
    }
    clips.push({
      sceneId: scene.id,
      sceneNumber: scene.sceneNumber,
      url: scene.mp4Url,
      duration: scene.duration,
      heading: scene.title,
    })
  }
  return { clips, missingDuration }
}

function directOrRender(
  plan: Omit<PublishDeliveryPlan, 'needsRender' | 'clips' | 'aspectNote' | 'blockedReason'> & {
    mp4Url?: string
    clips: PublishStitchClip[]
    missingDuration: string[]
  }
): PublishDeliveryPlan {
  const vertical = plan.aspectRatio === '9:16'
  if (!plan.mp4Url && plan.clips.length === 0) {
    return {
      ...plan,
      clips: [],
      needsRender: false,
      blockedReason: 'Nothing is rendered for this package yet.',
    }
  }
  if (!vertical && plan.mp4Url && plan.clips.length <= 1) {
    return {
      ...plan,
      mp4Url: plan.mp4Url,
      clips: [],
      needsRender: false,
    }
  }
  if (plan.missingDuration.length > 0 && (vertical || plan.clips.length !== 1 || !plan.mp4Url)) {
    return {
      ...plan,
      clips: plan.clips,
      needsRender: true,
      blockedReason: `Scene length is unknown for ${plan.missingDuration.join(', ')}. Render those scenes in Streams, then ship.`,
    }
  }
  if (!vertical && plan.clips.length === 1) {
    return {
      ...plan,
      mp4Url: plan.clips[0]?.url,
      clips: [],
      needsRender: false,
    }
  }
  return {
    ...plan,
    mp4Url: undefined,
    clips: plan.clips,
    needsRender: true,
    aspectNote: vertical ? PAD_NOTE : undefined,
  }
}

export function resolvePublishDelivery(args: {
  kind: PublishUnitKind
  aspectRatio: PublishAspectRatio
  language: string
  sceneId?: string
  beatIndex?: number
  scenes: PublishSceneInput[]
  previsScenes?: PublishSceneInput[]
  previs?: PublishPreVisInput
  streams: PublishStreamInput[]
  promo?: PublishPromoInput
  projectTitle?: string
}): PublishDeliveryPlan {
  const { kind, aspectRatio, language, scenes, previsScenes, previs, streams, promo, projectTitle } = args
  const base = {
    kind,
    aspectRatio,
    language,
  }

  if (kind === 'previs') {
    const id = publishUnitId('previs', aspectRatio, language)
    const title = projectTitle ? `${projectTitle} · Pre-Vis` : 'Pre-Vis'
    const stitchedReady = Boolean(previs?.mp4Url) && previs?.status !== 'error'
    if (aspectRatio === '16:9' && stitchedReady && previs?.mp4Url) {
      return {
        id,
        ...base,
        title,
        mp4Url: previs.mp4Url,
        clips: [],
        needsRender: false,
      }
    }
    if (
      aspectRatio === '9:16' &&
      stitchedReady &&
      previs?.mp4Url &&
      typeof previs.durationSec === 'number' &&
      previs.durationSec > 0
    ) {
      return {
        id,
        ...base,
        title,
        clips: [
          {
            sceneId: 'previs',
            sceneNumber: 0,
            url: previs.mp4Url,
            duration: previs.durationSec,
            heading: 'Pre-Vis',
          },
        ],
        needsRender: true,
        aspectNote: PAD_NOTE,
      }
    }

    const pool = previsScenes ?? scenes
    const readyMembers = pool.filter((scene) => Boolean(scene.mp4Url))
    if (readyMembers.length === 0) {
      return {
        id,
        ...base,
        title,
        clips: [],
        needsRender: false,
        blockedReason: stitchedReady
          ? 'Pre-Vis duration is unknown, so it cannot be fitted to 9:16 yet.'
          : 'Render & stitch your Pre-Vis scenes before shipping.',
      }
    }
    if (pool.length > 1 && readyMembers.length === 1) {
      return {
        id,
        ...base,
        title,
        clips: [],
        needsRender: false,
        blockedReason: `Only 1 of ${pool.length} scenes has a Pre-Vis render (${language.toUpperCase()}). Render & stitch at least 2 scenes to ship a combined Pre-Vis.`,
      }
    }
    const { clips, missingDuration } = clipsFromScenes(readyMembers)
    if (missingDuration.length > 0) {
      return {
        id,
        ...base,
        title,
        clips,
        needsRender: true,
        blockedReason: `Pre-Vis scene length is unknown for ${missingDuration.join(', ')}. Re-render those Pre-Vis scenes, then ship.`,
      }
    }
    if (aspectRatio === '16:9' && clips.length === 1 && pool.length === 1) {
      return {
        id,
        ...base,
        title,
        mp4Url: clips[0]?.url,
        clips: [],
        needsRender: false,
      }
    }
    const partialNote =
      readyMembers.length < pool.length
        ? `${readyMembers.length} of ${pool.length} scenes have Pre-Vis renders in ${language.toUpperCase()} and will be stitched.`
        : undefined
    return {
      id,
      ...base,
      title,
      clips,
      needsRender: true,
      aspectNote:
        aspectRatio === '9:16'
          ? partialNote
            ? `${partialNote} ${PAD_NOTE}`
            : PAD_NOTE
          : partialNote,
    }
  }

  if (kind === 'promo') {
    const ready = promo?.status === 'ready' || Boolean(promo?.mp4Url)
    const native: PublishAspectRatio = promo?.aspect === '16:9' ? '16:9' : '9:16'
    const id = publishUnitId('promo', aspectRatio, language)
    const title = `${projectTitle || 'Promo'} · Promo`
    if (!ready || !promo?.mp4Url) {
      return {
        id,
        ...base,
        title,
        clips: [],
        needsRender: false,
        blockedReason: 'Render a promo trailer before shipping it.',
      }
    }
    if (aspectRatio === native) {
      return {
        id,
        ...base,
        title,
        mp4Url: promo.mp4Url,
        clips: [],
        needsRender: false,
      }
    }
    if (typeof promo.durationSec !== 'number' || promo.durationSec <= 0) {
      return {
        id,
        ...base,
        title,
        clips: [],
        needsRender: true,
        blockedReason: 'Promo length is unknown, so it cannot be fitted to the other frame yet.',
      }
    }
    return {
      id,
      ...base,
      title,
      clips: [
        {
          sceneId: 'promo',
          sceneNumber: 0,
          url: promo.mp4Url,
          duration: promo.durationSec,
          heading: 'Promo',
        },
      ],
      needsRender: true,
      aspectNote: PAD_NOTE,
    }
  }

  if (kind === 'scene') {
    const scene = args.sceneId
      ? scenes.find((item) => item.id === args.sceneId)
      : scenes.find((item) => item.mp4Url) || scenes[0]
    const id = publishUnitId('scene', aspectRatio, language, scene?.id)
    if (!scene?.mp4Url) {
      return {
        id,
        ...base,
        title: scene?.title || 'Scene',
        sceneId: scene?.id,
        clips: [],
        needsRender: false,
        blockedReason: 'Render this scene before shipping it.',
      }
    }
    const planned = directOrRender({
      id,
      ...base,
      title: scene.title,
      mp4Url: scene.mp4Url,
      clips: [],
      missingDuration: typeof scene.duration === 'number' ? [] : [scene.title],
    })
    if (aspectRatio === '9:16' && typeof scene.duration === 'number') {
      return {
        ...planned,
        mp4Url: undefined,
        clips: [
          {
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            url: scene.mp4Url,
            duration: scene.duration,
            heading: scene.title,
          },
        ],
        needsRender: true,
        blockedReason: undefined,
        aspectNote: PAD_NOTE,
      }
    }
    return { ...planned, sceneId: scene.id }
  }

  if (kind === 'chapter') {
    const chapters = listPublishChapters(scenes)
    const chapter =
      chapters.find((item) => item.beatIndex === args.beatIndex) || chapters[0]
    const id = publishUnitId('chapter', aspectRatio, language, undefined, chapter?.beatIndex)
    if (!chapter) {
      return {
        id,
        ...base,
        title: 'Chapter',
        clips: [],
        needsRender: false,
        blockedReason: 'Link scenes to a Blueprint beat to ship a chapter.',
      }
    }
    const members = scenes.filter((scene) => chapter.sceneIds.includes(scene.id))
    const { clips, missingDuration } = clipsFromScenes(members)
    const readyMembers = members.filter((scene) => scene.mp4Url)
    if (readyMembers.length === 0) {
      return {
        id,
        ...base,
        title: chapter.title,
        blueprintBeatIndex: chapter.beatIndex,
        clips: [],
        needsRender: false,
        blockedReason: 'Render the scenes in this chapter before shipping it.',
      }
    }
    if (aspectRatio === '16:9' && clips.length === 1 && missingDuration.length === 0) {
      return {
        id,
        ...base,
        title: chapter.title,
        blueprintBeatIndex: chapter.beatIndex,
        mp4Url: clips[0]?.url,
        clips: [],
        needsRender: false,
      }
    }
    if (aspectRatio === '16:9' && readyMembers.length === 1 && missingDuration.length > 0) {
      return {
        id,
        ...base,
        title: chapter.title,
        blueprintBeatIndex: chapter.beatIndex,
        mp4Url: readyMembers[0]?.mp4Url,
        clips: [],
        needsRender: false,
      }
    }
    if (missingDuration.length > 0) {
      return {
        id,
        ...base,
        title: chapter.title,
        blueprintBeatIndex: chapter.beatIndex,
        clips,
        needsRender: true,
        blockedReason: `Scene length is unknown for ${missingDuration.join(', ')}. Render those scenes in Streams, then ship.`,
      }
    }
    return {
      id,
      ...base,
      title: chapter.title,
      blueprintBeatIndex: chapter.beatIndex,
      clips,
      needsRender: true,
      aspectNote: aspectRatio === '9:16' ? PAD_NOTE : undefined,
    }
  }

  const stream = streams.find((item) => item.language === language && item.status !== 'error' && item.mp4Url)
    || streams.find((item) => item.mp4Url)
  const id = publishUnitId('master', aspectRatio, language)
  const title = projectTitle ? `${projectTitle} · Master` : 'Master'
  if (aspectRatio === '16:9' && stream?.mp4Url) {
    return {
      id,
      ...base,
      title,
      mp4Url: stream.mp4Url,
      clips: [],
      needsRender: false,
    }
  }
  const { clips, missingDuration } = clipsFromScenes(scenes.filter((scene) => scene.mp4Url))
  if (clips.length === 0) {
    return {
      id,
      ...base,
      title,
      clips: [],
      needsRender: false,
      blockedReason: stream?.mp4Url
        ? 'Scene lengths are unknown, so this master cannot be padded to 9:16 yet.'
        : 'Render a master, or render the scenes that belong in it.',
    }
  }
  if (missingDuration.length > 0) {
    return {
      id,
      ...base,
      title,
      clips,
      needsRender: true,
      blockedReason: `Scene length is unknown for ${missingDuration.join(', ')}. Render those scenes in Streams, then ship.`,
    }
  }
  return {
    id,
    ...base,
    title,
    clips,
    needsRender: true,
    aspectNote: aspectRatio === '9:16' ? PAD_NOTE : undefined,
  }
}

export { deliveryFrameSize }
