/**
 * Package & Ship units: a scene, a Blueprint chapter, the master, or a promo.
 * A chapter is the scenes that share one blueprintBeatIndex.
 */

import type { DeliveryAspectRatio } from '@/lib/video/renderTypes'
import { deliveryFrameSize } from '@/lib/video/renderTypes'

export type PublishAspectRatio = DeliveryAspectRatio
export type PublishUnitKind = 'scene' | 'chapter' | 'master' | 'promo'
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
}

function pickReadyStream(streams: StreamLike[] | undefined, language: string): StreamLike | undefined {
  const ready = (streams || []).filter((stream) => stream.status === 'ready' && stream.mp4Url)
  const inLanguage = ready.filter((stream) => stream.language === language)
  const pool = inLanguage.length > 0 ? inLanguage : ready
  const video = pool.filter((stream) => stream.streamType === 'video')
  const chosen = (video.length > 0 ? video : pool).slice().sort(
    (a, b) => (b.streamVersion ?? 1) - (a.streamVersion ?? 1)
  )
  return chosen[0]
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
  streams: PublishStreamInput[]
  promo?: PublishPromoInput
  projectTitle?: string
}): PublishDeliveryPlan {
  const { kind, aspectRatio, language, scenes, streams, promo, projectTitle } = args
  const base = {
    kind,
    aspectRatio,
    language,
  }

  if (kind === 'promo') {
    const ready = promo?.status === 'ready' || Boolean(promo?.mp4Url)
    const id = publishUnitId('promo', aspectRatio, language)
    if (!ready || !promo?.mp4Url) {
      return {
        id,
        ...base,
        title: `${projectTitle || 'Promo'} · Promo`,
        clips: [],
        needsRender: false,
        blockedReason: 'Render a promo trailer before shipping it.',
      }
    }
    if (aspectRatio === '9:16') {
      return {
        id,
        ...base,
        title: `${projectTitle || 'Promo'} · Promo`,
        mp4Url: promo.mp4Url,
        clips: [],
        needsRender: false,
      }
    }
    if (typeof promo.durationSec !== 'number' || promo.durationSec <= 0) {
      return {
        id,
        ...base,
        title: `${projectTitle || 'Promo'} · Promo`,
        clips: [],
        needsRender: true,
        blockedReason: 'Promo length is unknown, so it cannot be padded to 16:9 yet.',
      }
    }
    return {
      id,
      ...base,
      title: `${projectTitle || 'Promo'} · Promo`,
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
