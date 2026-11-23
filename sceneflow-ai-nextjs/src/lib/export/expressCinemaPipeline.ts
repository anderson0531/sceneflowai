/**
 * Express 4K Cinema Film Pipeline
 *
 * Shared orchestration for SceneFlow's Same-Day Express 4K Cinema Film tier:
 * 1. Photorealistic Ken Burns storyboard cinema + cloned voices + SFX + music rendered at 4K.
 * 2. Guardrail #1: 10-Second Phonetic Pronunciation Guide captured at Continuity approval.
 * 3. Guardrail #2: Supervised 1-Tap PM Release (default) vs. Full Auto-Pilot Screening Room delivery.
 * 4. Guardrail #3: Screening Room client approval -> Auto-trigger 4K Cloud Run render -> Auto-email
 *    branded 4K master download link on completion (idempotent on duplicate callbacks).
 */

import { v4 as uuidv4 } from 'uuid'
import Project from '@/models/Project'
import RenderJob from '@/models/RenderJob'
import { uploadJobSpec, getOutputPath } from '@/lib/gcs/renderStorage'
import { triggerCloudRunJob, isCloudRunJobsEnabled } from '@/lib/video/CloudRunJobsService'
import type {
  RenderJobSpec,
  RenderSegment,
  RenderAudioClip,
  KenBurnsSettings,
} from '@/lib/video/renderTypes'
import type {
  AnimaticRenderSettings,
  KenBurnsIntensity,
} from '@/components/vision/scene-production/types'
import { calculateSourceHash } from '@/types/productionStreams'
import { buildProjectAnimaticTimeline } from '@/lib/storyboard/types'
import type { AnimaticAudioMode } from '@/lib/storyboard/animaticAudioMode'
import { rectToRenderKenBurns, resolveBeatKenBurnsSettings } from '@/lib/storyboard/kenBurnsFrame'
import { notifyUser } from '@/lib/jobs/jobService'
import {
  getOrCreateProducerProfile,
  toBrandProfileSnapshot,
} from '@/lib/producer/producerProfileService'
import { sendAutomatedClientPortalEmail } from '@/lib/intake/automatedClientBlueprint'

export type ExpressDeliveryTier = 'express_cinema_4k' | 'full_motion_cinema'
export type ExpressReleaseMode = 'supervised_pm_release' | 'full_autopilot'
export type ExpressPipelineStatus =
  | 'idle'
  | 'awaiting_continuity'
  | 'ready_for_pm_release'
  | 'screening_sent'
  | 'render_4k_queued'
  | 'delivered'

export interface PronunciationGuideEntry {
  term: string
  phonetic: string
}

export interface ProjectCinemaRenderInput {
  projectId: string
  userId: string
  projectTitle?: string
  language: string
  resolution: '720p' | '1080p' | '4K'
  scenes: Record<string, unknown>[]
  settings?: AnimaticRenderSettings
  audioMode?: AnimaticAudioMode
  clipAudioByBeatId?: Record<string, string>
}

export type ProjectCinemaRenderResult =
  | {
      ok: true
      jobId: string
      status: 'queued'
      estimatedDuration: number
      estimatedRenderTime: number
      sourceHash: string
      resolution: '720p' | '1080p' | '4K'
    }
  | {
      ok: false
      statusCode: number
      code: string
      error: string
      details?: string
    }

/**
 * Whether the deployed ffmpeg container can render dissolves and fades.
 *
 * A segment that hands over to the next one carries the overlap in its own
 * duration, so a container that still hard-concatenates would render a video
 * longer than its soundtrack. Keep this guarded by `ANIMATIC_RENDER_TRANSITIONS`.
 */
export function animaticTransitionsEnabled(): boolean {
  return process.env.ANIMATIC_RENDER_TRANSITIONS === 'true'
}

export function resolveExpressDeliveryTier(
  clientOrder?: Record<string, unknown> | null,
  preferredProductionStyle?: string | null
): ExpressDeliveryTier {
  const co = clientOrder || {}
  if (co.deliveryTier === 'express_cinema_4k') return 'express_cinema_4k'
  if (co.deliveryTier === 'full_motion_cinema') return 'full_motion_cinema'
  const style = preferredProductionStyle || (typeof co.preferredProductionStyle === 'string' ? co.preferredProductionStyle : null)
  if (style === 'voice_over_cinema') return 'express_cinema_4k'
  return 'full_motion_cinema'
}

export function resolveExpressReleaseMode(
  clientOrder?: Record<string, unknown> | null
): ExpressReleaseMode {
  return clientOrder?.expressReleaseMode === 'full_autopilot'
    ? 'full_autopilot'
    : 'supervised_pm_release'
}

/**
 * Parses free-text client phonetic notes like:
 *   "Kowalski = koh-VAHL-skee\nSiobhan: shih-VAWN"
 * into normalized text + structured pronunciation entries for voice synthesis prompts.
 */
export function parsePronunciationGuideNotes(raw?: string | null): {
  rawText: string
  entries: PronunciationGuideEntry[]
} {
  const cleaned = String(raw || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 1200)

  if (!cleaned) {
    return { rawText: '', entries: [] }
  }

  const lines = cleaned
    .split(/[\n;,]+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const entries: PronunciationGuideEntry[] = []
  for (const line of lines) {
    const match = line.match(/^([^=:\-–—]+?)\s*(?:=|:|\s+[-–—]\s+)\s*(.+)$/)
    if (match) {
      const term = match[1].trim().slice(0, 80)
      const phonetic = match[2].trim().slice(0, 120)
      if (term && phonetic) {
        entries.push({ term, phonetic })
      }
    }
  }

  return { rawText: cleaned, entries: entries.slice(0, 30) }
}

/**
 * Varied documentary Ken Burns motion profile across consecutive segments
 * (alternating push-in, gentle pull-out, and slow left/right drifts) so
 * Express 4K Cinema Films feel deliberately directed rather than static slides.
 */
export function computeDocumentaryKenBurns(
  index: number,
  intensity: KenBurnsIntensity
): KenBurnsSettings {
  if (intensity === 'off') {
    return { zoomStart: 1.0, zoomEnd: 1.0, panX: 0, panY: 0 }
  }

  const zoomDelta =
    intensity === 'dramatic' ? 0.16 : intensity === 'medium' ? 0.1 : 0.06
  const panStep =
    intensity === 'dramatic' ? 0.16 : intensity === 'medium' ? 0.12 : 0.08

  switch (index % 4) {
    case 0:
      // Gentle push-in centered slightly upward (flattering for portraits)
      return {
        zoomStart: 1.0,
        zoomEnd: Number((1.0 + zoomDelta).toFixed(3)),
        panX: 0,
        panY: Number((-panStep * 0.5).toFixed(3)),
      }
    case 1:
      // Subtle left-to-right drift with slow zoom-in
      return {
        zoomStart: 1.0,
        zoomEnd: Number((1.0 + zoomDelta * 0.85).toFixed(3)),
        panX: panStep,
        panY: 0,
      }
    case 2:
      // Subtle pull-back reveal
      return {
        zoomStart: Number((1.0 + zoomDelta).toFixed(3)),
        zoomEnd: 1.0,
        panX: 0,
        panY: Number((panStep * 0.4).toFixed(3)),
      }
    default:
      // Subtle right-to-left drift with slow zoom-in
      return {
        zoomStart: 1.0,
        zoomEnd: Number((1.0 + zoomDelta * 0.85).toFixed(3)),
        panX: -panStep,
        panY: 0,
      }
  }
}

export function buildProjectCinemaJobSpec(
  jobId: string,
  request: ProjectCinemaRenderInput,
  timeline: ReturnType<typeof buildProjectAnimaticTimeline>
): RenderJobSpec {
  const settings: AnimaticRenderSettings = request.settings ?? {
    kenBurnsIntensity: 'subtle',
    transitionStyle: 'crossfade',
    transitionDuration: 0.5,
    includeSubtitles: false,
    type: 'animatic',
  }

  const renderSegments: RenderSegment[] = timeline.segments.map((seg, index) => {
    const resolved = resolveBeatKenBurnsSettings(seg.kenBurns)
    const kenBurns = resolved
      ? rectToRenderKenBurns(resolved)
      : computeDocumentaryKenBurns(index, settings.kenBurnsIntensity)
    return {
      segmentId: seg.segmentId,
      imageUrl: seg.imageUrl,
      startTime: seg.startTime,
      duration: seg.duration,
      kenBurns,
      ...(seg.transitionIn && seg.transitionIn !== 'cut'
        ? { transitionIn: seg.transitionIn, transitionInSec: seg.transitionInSec }
        : {}),
    }
  })

  const renderAudioClips: RenderAudioClip[] = timeline.audioClips.map((clip) => ({
    url: clip.url,
    startTime: clip.startTime,
    duration: clip.duration,
    volume: clip.volume ?? 1.0,
    type: clip.type,
  }))

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'}/api/export/render-callback`

  return {
    jobId,
    projectId: request.projectId,
    projectTitle: request.projectTitle || 'Express 4K Cinema Film',
    renderType: 'project_animatic',
    streamType: 'animatic',
    resolution: request.resolution,
    fps: 24,
    segments: renderSegments,
    audioClips: renderAudioClips,
    outputPath: getOutputPath(jobId),
    callbackUrl,
    createdAt: new Date().toISOString(),
    language: request.language,
    includeSubtitles: settings.includeSubtitles,
    kenBurnsConfig: {
      intensity: settings.kenBurnsIntensity,
      transitionStyle: settings.transitionStyle,
      transitionDuration: settings.transitionDuration,
    },
  }
}

/**
 * Extracts renderable scenes array from a Project's `metadata` JSONB regardless
 * of whether scenes live at `visionPhase.script.script.scenes`, `visionPhase.scenes`,
 * or top-level `scenes`.
 */
export function extractRenderableScenesFromMetadata(
  metadata?: Record<string, unknown> | null
): Record<string, unknown>[] {
  if (!metadata || typeof metadata !== 'object') return []
  const md = metadata as Record<string, any>
  const candidates = [
    md?.visionPhase?.script?.script?.scenes,
    md?.visionPhase?.scenes,
    md?.script?.scenes,
    md?.scenes,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.filter(
        (s): s is Record<string, unknown> => Boolean(s && typeof s === 'object')
      )
    }
  }
  return []
}

export function hasRenderableStoryboardVisuals(scenes: Record<string, unknown>[]): boolean {
  for (const scene of scenes) {
    const s = scene as Record<string, any>
    if (typeof s.imageUrl === 'string' && s.imageUrl.trim().length > 0) return true
    if (typeof s.storyboardUrl === 'string' && s.storyboardUrl.trim().length > 0) return true
    const segments = Array.isArray(s.segments) ? s.segments : []
    for (const seg of segments) {
      if (
        seg &&
        typeof seg === 'object' &&
        (typeof (seg as any).imageUrl === 'string' ||
          typeof (seg as any).startFrameUrl === 'string' ||
          typeof (seg as any).activeAssetUrl === 'string')
      ) {
        return true
      }
    }
  }
  return false
}

export function shouldAutoTrigger4kRenderOnApproval(
  clientOrder?: Record<string, unknown> | null,
  metadata?: Record<string, unknown> | null
): boolean {
  const co = clientOrder || {}
  if (co.autoRender4kOnApproval === false) return false
  const tier = resolveExpressDeliveryTier(co)
  const optedIn = tier === 'express_cinema_4k' || co.autoRender4kOnApproval === true
  if (!optedIn) return false
  const scenes = extractRenderableScenesFromMetadata(metadata)
  return hasRenderableStoryboardVisuals(scenes)
}

/**
 * Shared Cloud Run 4K / 1080p / 720p project cinema render launcher.
 * Used both by the Studio Export API and automated Screening Room approvals.
 */
export async function enqueueProjectCinemaRender(
  input: ProjectCinemaRenderInput
): Promise<ProjectCinemaRenderResult> {
  if (!input.projectId || !Array.isArray(input.scenes) || input.scenes.length === 0) {
    return {
      ok: false,
      statusCode: 400,
      code: 'INVALID_SCENES',
      error: 'Missing required fields: projectId and non-empty scenes',
    }
  }

  const blackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'}/render/black-frame.png`
  const timeline = buildProjectAnimaticTimeline(input.scenes, input.language || 'en', {}, {
    preVisAnimatic: true,
    interSceneFadeUrl: blackUrl,
    transitions: animaticTransitionsEnabled(),
    audioMode: input.audioMode === 'hifi' ? 'hifi' : 'lofi',
    clipAudioByBeatId: input.clipAudioByBeatId,
  })

  if (timeline.segments.length === 0) {
    return {
      ok: false,
      statusCode: 400,
      code: 'NO_IMAGES',
      error: 'No scenes have storyboard images to render',
    }
  }

  if (!isCloudRunJobsEnabled()) {
    return {
      ok: false,
      statusCode: 503,
      code: 'RENDER_NOT_CONFIGURED',
      error: 'Cloud Run rendering not configured',
    }
  }

  const jobId = uuidv4()
  const audioUrls = timeline.audioClips.map((c) => c.url).filter(Boolean)
  const sourceHash = calculateSourceHash(
    timeline.segments.map((s) => ({
      segmentId: s.segmentId,
      imageUrl: s.imageUrl,
      startTime: s.startTime,
      duration: s.duration,
    })),
    audioUrls
  )

  const jobSpec = buildProjectCinemaJobSpec(jobId, input, timeline)
  const specPath = await uploadJobSpec(jobSpec)

  const totalDuration = timeline.totalDuration
  const estimatedRenderTime = 15 + totalDuration * 0.5

  try {
    await RenderJob.create({
      id: jobId,
      project_id: input.projectId,
      user_id: input.userId,
      status: 'QUEUED',
      progress: 0,
      resolution: input.resolution || '4K',
      language: input.language || 'en',
      include_subtitles: input.settings?.includeSubtitles ?? false,
      render_type: 'project_animatic',
      stream_type: 'animatic',
      estimated_duration: totalDuration,
    })
  } catch (dbError) {
    console.error('[ExpressCinemaPipeline] Failed to create RenderJob record:', dbError)
  }

  try {
    await triggerCloudRunJob(jobId, specPath)
  } catch (triggerError) {
    await RenderJob.update(
      { status: 'FAILED', error: String(triggerError) },
      { where: { id: jobId } }
    ).catch(() => {})
    return {
      ok: false,
      statusCode: 500,
      code: 'TRIGGER_FAILED',
      error: 'Failed to start render job',
      details: String(triggerError),
    }
  }

  return {
    ok: true,
    jobId,
    status: 'queued',
    estimatedDuration: totalDuration,
    estimatedRenderTime,
    sourceHash,
    resolution: input.resolution || '4K',
  }
}

/**
 * Ensures an active Screening Room share link exists on `project.metadata` and
 * returns the canonical share URL + token.
 */
export async function ensureScreeningRoomShareLinkForProject(
  project: Project,
  options?: { language?: string; baseUrl?: string }
): Promise<{ shareToken: string; slug: string; shareUrl: string }> {
  const baseUrl =
    options?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'
  const md = ((project.metadata || {}) as Record<string, any>)
  const existing = md.screeningRoomShareLink as Record<string, any> | undefined

  if (existing && existing.isActive !== false && (existing.slug || existing.shareToken)) {
    const slugOrToken = String(existing.slug || existing.shareToken)
    const shareUrl = `${baseUrl}/share/screening-room/${slugOrToken}`
    return {
      shareToken: String(existing.shareToken || slugOrToken),
      slug: slugOrToken,
      shareUrl,
    }
  }

  const shareToken = uuidv4()
  const cleanBase = String(project.title || 'CinemaFilm')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 32) || 'CinemaFilm'
  const suffix = shareToken.replace(/-/g, '').slice(0, 6)
  const slug = `${cleanBase}${suffix}`
  const shareUrl = `${baseUrl}/share/screening-room/${slug}`

  const shareLink = {
    id: uuidv4(),
    shareToken,
    slug,
    linkType: 'screening-room',
    language: options?.language || 'en',
    playbackMode: 'animatic',
    createdAt: new Date().toISOString(),
    isActive: true,
    viewCount: 0,
    allowedFeatures: {
      translation: true,
      download: false,
      captions: true,
    },
    allowFeedback: true,
  }

  const nextMetadata = {
    ...md,
    screeningRoomShareLink: shareLink,
    screeningRoomShareUrl: shareUrl,
  }
  await project.update({ metadata: nextMetadata })

  return { shareToken, slug, shareUrl }
}

/**
 * Called right after a client approves their Continuity Library.
 * - Persists normalized pronunciation notes into `project.metadata`.
 * - For Express 4K Cinema orders:
 *   - `supervised_pm_release` (default): marks `ready_for_pm_release`, pre-provisions a Screening Room
 *     preview URL, and pings the Producer/PM for a 1-tap client release.
 *   - `full_autopilot`: publishes the Screening Room link and automatically emails the customer.
 */
export async function handleExpressContinuityApproved(input: {
  project: Project
  ownerUserId: string
  reviewerName: string
  pronunciationNotes?: string
  preferredProductionStyle?: string | null
  baseUrl?: string
}): Promise<{
  deliveryTier: ExpressDeliveryTier
  releaseMode: ExpressReleaseMode
  pipelineStatus: ExpressPipelineStatus
  screeningRoomUrl?: string
  customerEmailSent: boolean
}> {
  const { project, ownerUserId, reviewerName } = input
  const md = { ...((project.metadata || {}) as Record<string, any>) }
  const co = { ...(md.clientOrder || {}) }

  const parsedPronunciation = parsePronunciationGuideNotes(input.pronunciationNotes)
  if (parsedPronunciation.rawText) {
    co.pronunciationNotes = parsedPronunciation.rawText
    md.pronunciationGuide = {
      rawText: parsedPronunciation.rawText,
      entries: parsedPronunciation.entries,
      updatedAt: new Date().toISOString(),
      updatedBy: reviewerName,
    }
  }

  const deliveryTier = resolveExpressDeliveryTier(co, input.preferredProductionStyle)
  const releaseMode = resolveExpressReleaseMode(co)
  co.deliveryTier = deliveryTier
  co.expressReleaseMode = releaseMode

  if (deliveryTier !== 'express_cinema_4k') {
    md.clientOrder = co
    await project.update({ metadata: md })
    return {
      deliveryTier,
      releaseMode,
      pipelineStatus: 'idle',
      customerEmailSent: false,
    }
  }

  const nowIso = new Date().toISOString()
  const locale = typeof co.locale === 'string' ? co.locale : 'en'
  const link = await ensureScreeningRoomShareLinkForProject(project, {
    language: locale,
    baseUrl: input.baseUrl,
  })

  // Reload merged metadata so we keep screeningRoomShareLink intact
  const refreshedMd = { ...((project.metadata || md) as Record<string, any>) }
  const nextCo: Record<string, unknown> = {
    ...(refreshedMd.clientOrder || co),
    deliveryTier: 'express_cinema_4k',
    expressReleaseMode: releaseMode,
    screeningRoomUrl: link.shareUrl,
    expressContinuityApprovedAt: nowIso,
    ...(parsedPronunciation.rawText ? { pronunciationNotes: parsedPronunciation.rawText } : {}),
  }

  let customerEmailSent = false
  let pipelineStatus: ExpressPipelineStatus = 'ready_for_pm_release'

  if (releaseMode === 'full_autopilot') {
    pipelineStatus = 'screening_sent'
    nextCo.expressPipelineStatus = 'screening_sent'
    nextCo.expressReleasedAt = nowIso
    nextCo.stage = 'screening_sent'
    nextCo.actionState = 'awaiting_client'

    const customerEmail = typeof nextCo.customerEmail === 'string' ? nextCo.customerEmail.trim() : ''
    if (customerEmail) {
      const profile = await getOrCreateProducerProfile(ownerUserId)
      const brand = toBrandProfileSnapshot(profile, 'Video Studio')
      const customerName = String(nextCo.customerName || nextCo.customerLabel || reviewerName || 'there')
      customerEmailSent = await sendAutomatedClientPortalEmail({
        toEmail: customerEmail,
        customerName,
        brandName: brand.brandName,
        subject: `${brand.brandName} — Your Express 4K Cinema Preview for "${project.title}" Is Ready`,
        heading: `Watch & Approve Your Cinema Film Preview`,
        paragraphs: [
          `Hi ${customerName},`,
          `Thank you for approving your Continuity Library! Your voiced, scored cinema cut of "${project.title}" is now ready in your private Screening Room.`,
          `Watch it end-to-end and click Approve whenever you're ready — your 4K master MP4 will render automatically and be delivered straight to your inbox.`,
        ],
        ctaLabel: 'Watch in Screening Room',
        ctaUrl: link.shareUrl,
      })
    }
  } else {
    pipelineStatus = 'ready_for_pm_release'
    nextCo.expressPipelineStatus = 'ready_for_pm_release'
    nextCo.stage = 'continuity_approved'
    nextCo.actionState = 'action_required'

    await notifyUser({
      userId: ownerUserId,
      projectId: project.id,
      type: 'client_stage_approved',
      title: `Express 4K Cinema Ready for 1-Tap Release: ${project.title}`,
      message: `${reviewerName} approved Continuity${parsedPronunciation.entries.length > 0 ? ` (${parsedPronunciation.entries.length} pronunciation note${parsedPronunciation.entries.length === 1 ? '' : 's'} saved)` : ''}. Skim the voiced cut and 1-tap Release to Client.`,
      sendEmail: true,
      metadata: {
        projectId: project.id,
        source: 'express_cinema',
        stage: 'ready_for_pm_release',
        screeningRoomUrl: link.shareUrl,
        openPath: `/dashboard/workflow/vision/${project.id}`,
      },
    }).catch((err) => {
      console.warn('[ExpressCinemaPipeline] PM release notify warning:', err)
    })
  }

  await project.update({
    metadata: {
      ...refreshedMd,
      ...(parsedPronunciation.rawText ? { pronunciationGuide: md.pronunciationGuide } : {}),
      clientOrder: nextCo,
    },
  })

  return {
    deliveryTier,
    releaseMode,
    pipelineStatus,
    screeningRoomUrl: link.shareUrl,
    customerEmailSent,
  }
}

/**
 * Producer 1-Tap Release for Supervised Express 4K Cinema orders.
 * Sends the white-label Screening Room link to the customer so they can watch
 * and trigger the automated 4K master render upon approval.
 */
export async function releaseExpressFilmToClient(input: {
  project: Project
  ownerUserId: string
  customNote?: string
  baseUrl?: string
}): Promise<
  | { ok: true; screeningRoomUrl: string; emailSent: boolean; releasedAt: string }
  | { ok: false; status: number; error: string }
> {
  const { project, ownerUserId, customNote, baseUrl } = input
  const md = { ...((project.metadata || {}) as Record<string, any>) }
  const co = { ...(md.clientOrder || {}) }
  const customerEmail = typeof co.customerEmail === 'string' ? co.customerEmail.trim() : ''
  const customerName = String(co.customerName || co.customerLabel || 'there').trim()
  const locale = typeof co.locale === 'string' ? co.locale : 'en'

  const link = await ensureScreeningRoomShareLinkForProject(project, {
    language: locale,
    baseUrl,
  })

  const profile = await getOrCreateProducerProfile(ownerUserId)
  const brand = toBrandProfileSnapshot(profile, 'Video Studio')
  const trimmedNote = (customNote || '').trim().slice(0, 500)

  const emailSent = customerEmail
    ? await sendAutomatedClientPortalEmail({
        toEmail: customerEmail,
        customerName,
        brandName: brand.brandName,
        subject: `${brand.brandName} — Watch & Approve Your Cinema Film "${project.title}"`,
        heading: `Your Private Screening Room Is Open`,
        paragraphs: [
          `Hi ${customerName},`,
          `Your voiced, scored cinema cut of "${project.title}" is ready to screen. Review it with family or stakeholders, leave frame-accurate notes if needed, or click Approve to automatically render and deliver your 4K master MP4.`,
          ...(trimmedNote ? [trimmedNote] : []),
        ],
        ctaLabel: 'Open Screening Room',
        ctaUrl: link.shareUrl,
      })
    : false

  const releasedAt = new Date().toISOString()
  const refreshedMd = { ...((project.metadata || md) as Record<string, any>) }
  await project.update({
    metadata: {
      ...refreshedMd,
      clientOrder: {
        ...(refreshedMd.clientOrder || co),
        deliveryTier: 'express_cinema_4k',
        screeningRoomUrl: link.shareUrl,
        expressPipelineStatus: 'screening_sent',
        expressReleasedAt: releasedAt,
        stage: 'screening_sent',
        actionState: 'awaiting_client',
      },
    },
  })

  return {
    ok: true,
    screeningRoomUrl: link.shareUrl,
    emailSent,
    releasedAt,
  }
}

/**
 * Called from Screening Room client approval (`decision === 'approved'`).
 * When the project is an Express 4K Cinema Film (or has `autoRender4kOnApproval`),
 * automatically queues a Cloud Run 4K MP4 render job and records status on `clientOrder`.
 */
export async function triggerExpress4kRenderOnScreeningApproval(input: {
  project: Project
  ownerUserId: string
}): Promise<{
  triggered: boolean
  reason?: string
  jobId?: string
  status?: 'queued' | 'skipped' | 'failed'
}> {
  const { project, ownerUserId } = input
  const md = { ...((project.metadata || {}) as Record<string, any>) }
  const co = { ...(md.clientOrder || {}) }

  if (!shouldAutoTrigger4kRenderOnApproval(co, md)) {
    return {
      triggered: false,
      status: 'skipped',
      reason: 'Project is not configured for automated Express 4K Cinema rendering or has no storyboard visuals yet.',
    }
  }

  const scenes = extractRenderableScenesFromMetadata(md)
  const language = typeof co.locale === 'string' && co.locale ? co.locale : 'en'

  const renderResult = await enqueueProjectCinemaRender({
    projectId: project.id,
    userId: ownerUserId || 'express-pipeline',
    projectTitle: project.title || 'Express 4K Cinema Film',
    language,
    resolution: '4K',
    scenes,
    settings: {
      kenBurnsIntensity: 'subtle',
      transitionStyle: 'crossfade',
      transitionDuration: 0.5,
      includeSubtitles: Boolean(co.includeSubtitles),
      type: 'animatic',
    },
    audioMode: 'hifi',
  })

  if (!renderResult.ok) {
    return {
      triggered: false,
      status: 'failed',
      reason: renderResult.error,
    }
  }

  const nowIso = new Date().toISOString()
  await project.update({
    metadata: {
      ...md,
      clientOrder: {
        ...co,
        expressRenderJobId: renderResult.jobId,
        expressRenderStatus: 'queued',
        expressPipelineStatus: 'render_4k_queued',
        expressRenderResolution: '4K',
        expressRenderTriggeredAt: nowIso,
      },
    },
  })

  return {
    triggered: true,
    status: 'queued',
    jobId: renderResult.jobId,
  }
}

/**
 * Called from `POST /api/export/render-callback` when a `project_animatic` job
 * finishes with `status === 'COMPLETED'` and a `downloadUrl`.
 * Persists `exportedMasterUrl` and sends a one-time branded 4K download email
 * to `clientOrder.customerEmail` (idempotent via `expressDownloadEmailSentAt`).
 */
export async function handleExpress4kRenderCompletedCallback(input: {
  project: Project
  jobId: string
  downloadUrl: string
  language?: string | null
  resolution?: string | null
}): Promise<{ emailSent: boolean; alreadyNotified: boolean }> {
  const { project, jobId, downloadUrl, language, resolution } = input
  const md = { ...((project.metadata || {}) as Record<string, any>) }
  const co = { ...(md.clientOrder || {}) }

  md.exportedAnimaticUrl = downloadUrl
  md.exportedAnimaticJobId = jobId
  md.exportedAnimaticLanguage = language || 'en'
  md.exportedMasterUrl = downloadUrl

  const isClientOrder = Boolean(co.isClientProject || co.customerEmail || co.deliveryTier === 'express_cinema_4k')
  const alreadyNotified = Boolean(co.expressDownloadEmailSentAt && co.expressRenderJobId === jobId)
  let emailSent = false

  if (isClientOrder) {
    co.exportedMasterUrl = downloadUrl
    co.expressRenderJobId = jobId
    co.expressRenderStatus = 'completed'
    co.expressPipelineStatus = 'delivered'
    co.stage = 'delivered'
    co.actionState = 'delivered'
    co.deliveredAt = new Date().toISOString()

    const customerEmail = typeof co.customerEmail === 'string' ? co.customerEmail.trim() : ''
    const ownerUserId = String((project as { user_id?: string }).user_id || '')

    if (customerEmail && !alreadyNotified) {
      let brandName = 'Video Studio'
      if (ownerUserId) {
        try {
          const profile = await getOrCreateProducerProfile(ownerUserId)
          brandName = toBrandProfileSnapshot(profile, 'Video Studio').brandName
        } catch {
          // Keep fallback brand name
        }
      }
      const customerName = String(co.customerName || co.customerLabel || 'there').trim()
      const resLabel = resolution || '4K'

      emailSent = await sendAutomatedClientPortalEmail({
        toEmail: customerEmail,
        customerName,
        brandName,
        subject: `${brandName} — Your ${resLabel} Master Cinema Film "${project.title}" Is Ready to Download`,
        heading: `Your ${resLabel} Cinema Master Is Ready!`,
        paragraphs: [
          `Hi ${customerName},`,
          `Your approved ${resLabel} Cinema Film "${project.title}" has finished rendering and is ready for immediate download and sharing.`,
          `Want to upgrade any key scenes to full-motion video later? Just reply to this email — your characters, voices, and story are already locked with zero rework.`,
        ],
        ctaLabel: `Download ${resLabel} Cinema Film`,
        ctaUrl: downloadUrl,
      })

      if (emailSent) {
        co.expressDownloadEmailSentAt = new Date().toISOString()
      }
    }

    if (ownerUserId && !alreadyNotified) {
      await notifyUser({
        userId: ownerUserId,
        projectId: project.id,
        type: 'client_stage_approved',
        title: `4K Cinema Master Delivered: ${project.title}`,
        message: emailSent
          ? `4K render completed and download link was automatically emailed to ${String(co.customerName || co.customerEmail)}.`
          : `4K render completed and saved to project metadata.`,
        sendEmail: false,
        metadata: {
          projectId: project.id,
          source: 'express_cinema',
          downloadUrl,
          jobId,
          openPath: `/dashboard/workflow/vision/${project.id}`,
        },
      }).catch(() => {})
    }

    md.clientOrder = co
  }

  await project.update({ metadata: md })
  return { emailSent, alreadyNotified }
}
