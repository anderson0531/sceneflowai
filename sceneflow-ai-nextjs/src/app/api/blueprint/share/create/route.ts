import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import CollabParticipant from '@/models/CollabParticipant'
import { getAuthenticatedUserId, assertProjectAccess } from '@/lib/projectAccess'
import type { BlueprintSessionPayload, BlueprintShareCreateBody } from '@/lib/blueprint/shareTypes'
import { getPayload } from '@/lib/blueprint/shareSession'
import { sanitizeBlueprintARForShare } from '@/lib/blueprint/sanitizeShareAR'
import { loadBlueprintARFromMetadata } from '@/lib/types/audienceResonance'
import {
  DEFAULT_SHARE_AUDIO_LANGUAGE,
  getShareAudioLanguage,
} from '@/lib/blueprint/shareAudioPayload'
import { isShareAudioStaleForTreatment } from '@/lib/blueprint/generateShareSectionAudio'
import {
  DEFAULT_BLUEPRINT_GEMINI_VOICE,
  isGeminiTtsConfigured,
} from '@/lib/tts/geminiFlashTts'
import { pickBestHeroImageUrl, resolveBlueprintHeroImageUrl } from '@/lib/blueprint/resolveBlueprintHeroImage'
import {
  applyHeroUrlToPayload,
  resolveShareHeroImageUrl,
} from '@/lib/blueprint/shareHeroImage'
import { ensureCollabBlueprintFeedbackTable } from '@/lib/blueprint/ensureCollabBlueprintSchema'

export const runtime = 'nodejs'
export const maxDuration = 300

function resolveShareExpiry(body: BlueprintShareCreateBody): Date | null {
  if (body.neverExpires === true || body.allowFeedback === false) return null
  const days = body.expiresInDays ?? 14
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

function buildSharePayload(
  body: BlueprintShareCreateBody,
  ownerName: string,
  expiresAt: Date | null,
  arSnapshot: BlueprintSessionPayload['blueprintAudienceResonance']
): BlueprintSessionPayload {
  const neverExpires = expiresAt == null
  return {
    type: 'blueprint',
    projectId: body.projectId,
    variantId: body.variantId,
    treatment: body.treatment,
    heroImageUrl: body.heroImageUrl,
    audienceDefinition: body.audienceDefinition ?? null,
    shareSettings: {
      expiresAt: expiresAt?.toISOString(),
      allowTts: true,
      collectEmail: false,
      allowFeedback: body.allowFeedback !== false,
      neverExpires,
    },
    ownerDisplayName: ownerName,
    sectionAudioStatus: isGeminiTtsConfigured() ? 'idle' : 'skipped',
    sectionAudioLanguage: DEFAULT_SHARE_AUDIO_LANGUAGE,
    sectionAudioVoiceId: DEFAULT_BLUEPRINT_GEMINI_VOICE,
    sectionAudioByLanguage: {},
    blueprintAudienceResonance: arSnapshot ?? null,
  }
}

function invalidateAudioIfTreatmentChanged(
  prev: BlueprintSessionPayload,
  nextTreatment: Record<string, unknown>
): BlueprintSessionPayload {
  const lang = getShareAudioLanguage(prev)
  const probe: BlueprintSessionPayload = { ...prev, treatment: nextTreatment }
  if (!isShareAudioStaleForTreatment(probe, lang)) return prev
  const byLang = { ...(prev.sectionAudioByLanguage || {}) }
  delete byLang[lang]
  const translations = { ...(prev.sectionTranslations || {}) }
  delete translations[lang]
  return {
    ...prev,
    treatment: nextTreatment,
    sectionAudioByLanguage: byLang,
    sectionTranslations: translations,
    sectionAudioStatus: 'idle',
    sectionAudioStartedAt: undefined,
    sectionAudioGeneratedAt: undefined,
  }
}

async function findActiveBlueprintSession(projectId: string, ownerUserId: string) {
  const candidates = await CollabSession.findAll({
    where: {
      project_id: projectId,
      owner_user_id: ownerUserId,
      status: 'active',
    },
    order: [['created_at', 'DESC']],
    limit: 10,
  })
  for (const s of candidates) {
    const expiresAt = (s as { expires_at?: Date | null }).expires_at
    if (expiresAt && new Date(expiresAt) < new Date()) continue
    if (getPayload(s)) return s
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const authSession = await getServerSession(authOptions as any).catch(() => null)
    const ownerUserId = await getAuthenticatedUserId(req)
    const ownerName = (authSession?.user as { name?: string })?.name || 'Owner'
    const ownerEmail = (authSession?.user as { email?: string })?.email || null
    if (!ownerUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as BlueprintShareCreateBody & { legacyOwnerId?: string }
    const {
      projectId,
      variantId,
      treatment,
      heroImageUrl,
      audienceDefinition,
      expiresInDays = 14,
      legacyOwnerId,
      forceNew = false,
      allowFeedback,
      neverExpires,
    } = body

    if (!projectId || !variantId || !treatment) {
      return NextResponse.json({ success: false, error: 'Missing projectId, variantId, or treatment' }, { status: 400 })
    }

    const resolvedHeroImageUrl = pickBestHeroImageUrl(
      resolveBlueprintHeroImageUrl(treatment as Record<string, unknown>),
      typeof heroImageUrl === 'string' ? heroImageUrl : undefined
    )

    const access = await assertProjectAccess(projectId, ownerUserId, legacyOwnerId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const { persisted: persistedAR } = loadBlueprintARFromMetadata(
      (access.project.metadata || {}) as Record<string, unknown>
    )
    const arSnapshot = sanitizeBlueprintARForShare(persistedAR)

    await sequelize.authenticate()

    const heroDraft: BlueprintSessionPayload = {
      type: 'blueprint',
      projectId,
      variantId,
      treatment,
      heroImageUrl: resolvedHeroImageUrl,
    }
    const resolvedShareHero = await resolveShareHeroImageUrl(heroDraft)
    const heroSyncedDraft = applyHeroUrlToPayload(heroDraft, resolvedShareHero)
    const syncedTreatment = heroSyncedDraft.treatment
    const syncedHeroImageUrl = heroSyncedDraft.heroImageUrl

    const settingsChanged =
      typeof allowFeedback === 'boolean' || typeof neverExpires === 'boolean'
    const expiresAt = resolveShareExpiry({
      ...body,
      allowFeedback,
      neverExpires,
      expiresInDays,
    })

    await CollabSession.sync({ alter: false })
    await CollabParticipant.sync({ alter: false })
    await ensureCollabBlueprintFeedbackTable()

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : new URL(req.url).origin

    if (!forceNew) {
      const existing = await findActiveBlueprintSession(projectId, ownerUserId)
      if (existing) {
        const prev = getPayload(existing)!
        let nextPayload: BlueprintSessionPayload = {
          ...prev,
          variantId,
          treatment: syncedTreatment,
          heroImageUrl: syncedHeroImageUrl,
          audienceDefinition: audienceDefinition ?? null,
          ownerDisplayName: ownerName,
          blueprintAudienceResonance: arSnapshot ?? prev.blueprintAudienceResonance ?? null,
          shareSettings: {
            ...prev.shareSettings,
            allowTts: true,
            ...(settingsChanged
              ? {
                  expiresAt: expiresAt?.toISOString(),
                  allowFeedback: allowFeedback !== false,
                  neverExpires: expiresAt == null,
                }
              : {}),
          },
        }
        nextPayload = invalidateAudioIfTreatmentChanged(prev, syncedTreatment)
        nextPayload = {
          ...nextPayload,
          variantId,
          treatment: syncedTreatment,
          heroImageUrl: syncedHeroImageUrl,
          audienceDefinition: audienceDefinition ?? null,
          ownerDisplayName: ownerName,
          blueprintAudienceResonance: arSnapshot ?? nextPayload.blueprintAudienceResonance ?? null,
          shareSettings: {
            ...nextPayload.shareSettings,
            allowTts: true,
            ...(settingsChanged
              ? {
                  expiresAt: expiresAt?.toISOString(),
                  allowFeedback: allowFeedback !== false,
                  neverExpires: expiresAt == null,
                }
              : {}),
          },
        }
        await existing.update({
          ...(settingsChanged ? { expires_at: expiresAt } : {}),
          payload: nextPayload,
        })

        const tokenStr = (existing as { token?: string }).token
        if (!tokenStr) {
          return NextResponse.json({ success: false, error: 'Invalid session token' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          token: tokenStr,
          sessionId: existing.id,
          url: `${origin}/blueprint/share/${tokenStr}`,
          reused: true,
        })
      }
    }

    const tokenStr = crypto.randomBytes(24).toString('base64url')
    const payload = buildSharePayload(
      {
        projectId,
        variantId,
        treatment: syncedTreatment,
        heroImageUrl: syncedHeroImageUrl,
        audienceDefinition,
        expiresInDays,
        allowFeedback,
        neverExpires,
      },
      ownerName,
      expiresAt,
      arSnapshot
    )

    const t = await sequelize.transaction()
    try {
      const collabSession = await CollabSession.create(
        {
          project_id: projectId,
          owner_user_id: ownerUserId,
          token: tokenStr,
          status: 'active',
          expires_at: expiresAt,
          payload,
        },
        { transaction: t }
      )

      await CollabParticipant.create(
        {
          session_id: collabSession.id,
          name: ownerName,
          email: ownerEmail || '',
          role: 'owner',
        },
        { transaction: t }
      )

      await t.commit()

      return NextResponse.json({
        success: true,
        token: tokenStr,
        sessionId: collabSession.id,
        url: `${origin}/blueprint/share/${tokenStr}`,
        reused: false,
      })
    } catch (e) {
      await t.rollback()
      throw e
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create share'
    console.error('[blueprint/share/create]', e)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
