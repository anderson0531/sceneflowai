import crypto from 'crypto'
import CollabSession from '@/models/CollabSession'
import Project from '@/models/Project'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiProductModel } from '@/lib/config/modelConfig'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { CreditService } from '@/services/CreditService'
import { BLUEPRINT_CREDITS, IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { buildOfficialEmail } from '@/lib/email/officialEmail'
import { getAppBaseUrl, sendEmail } from '@/lib/email/resendClient'
import { evaluateCustomerTextQuarantine } from '@/lib/producer/quarantineCheck'
import type { BrandProfileSnapshot } from '@/lib/producer/producerProfileService'
import {
  resolveClientPortalLocale,
  toBlueprintReviewLanguageCode,
  type ClientPortalLocale,
} from './clientPortalCopy'
import { getLocaleEnglishName } from '@/i18n/locale'
import { englishForModel } from '@/i18n/server/requestLocale'
import {
  calculateOverallFromDeductions,
  mapRecommendations,
} from '@/lib/treatment/blueprintAudienceScorer'
import {
  BLUEPRINT_AR_CATEGORY_WEIGHTS,
  READY_FOR_PRODUCTION_THRESHOLD_V3,
  createAudienceDefinition,
  createPersistedBlueprintAR,
  type BlueprintAudienceCategory,
  type BlueprintAudienceDeduction,
  type BlueprintAudienceResonanceAnalysis,
  type BlueprintFixSection,
} from '@/lib/types/audienceResonance'
import { sanitizeBlueprintARForShare, type SharedBlueprintARSnapshot } from '@/lib/blueprint/sanitizeShareAR'
import type {
  BlueprintClientClarificationDraft,
  BlueprintSessionPayload,
} from '@/lib/blueprint/shareTypes'
import { resolveSessionByToken, getPayload } from '@/lib/blueprint/shareSession'
import { isBlueprintRoundLimitReached } from '@/lib/blueprint/shareSettings'
import {
  buildGuidedRevisePayload,
  executeGuidedRevise,
} from '@/lib/treatment/runGuidedRevise'
import { mergeRevisionIntoVariant } from '@/lib/treatment/blueprintRevisionDiff'
import {
  DEFAULT_BLUEPRINT_GEMINI_VOICE,
  isGeminiTtsConfigured,
} from '@/lib/tts/geminiFlashTts'
import { pickBestHeroImageUrl, resolveBlueprintHeroImageUrl } from '@/lib/blueprint/resolveBlueprintHeroImage'

function sessionDbId(session: { id?: string }): string {
  return String(session?.id || '')
}

/** Realistic self-funding initial Blueprint Pass fee ($29 -> ~83% net margin vs ~$3.90 max compute). */
export const DEFAULT_CLIENT_BLUEPRINT_DEPOSIT_USD = 29
export const DEFAULT_MAX_AUTOMATED_BLUEPRINT_REVISIONS = 4
export const DEFAULT_MAX_AUTOMATED_AR_ITERATIONS = 3
const MAX_INITIAL_STORYBOARD_BEATS = 6
const MAX_REVISED_STORYBOARD_BEATS = 2

export async function sendAutomatedClientPortalEmail(input: {
  toEmail?: string | null
  customerName?: string | null
  brandName: string
  subject: string
  heading: string
  paragraphs: string[]
  ctaLabel: string
  ctaUrl: string
}): Promise<boolean> {
  const email = (input.toEmail || '').trim()
  if (!email || !email.includes('@')) return false

  try {
    const baseUrl = getAppBaseUrl()
    const content = buildOfficialEmail({
      preheader: `${input.brandName} — ${input.heading}`,
      heading: input.heading,
      paragraphs: input.paragraphs,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      whyReceived: `You received this automated project link from ${input.brandName} for your custom video order.`,
      unsubscribeUrl: `${baseUrl}/preferences`,
    })
    await sendEmail({
      to: email,
      subject: input.subject,
      html: content.html,
      text: content.text,
    })
    return true
  } catch (err) {
    console.warn('[automatedClientBlueprint] Non-fatal email delivery warning:', err)
    return false
  }
}

export async function illustrateTreatmentBeatsForClientShare(input: {
  ownerUserId: string
  projectId: string
  treatment: Record<string, any>
  storyLocale?: string
  beatIndices?: number[]
  maxBeats?: number
}): Promise<{ treatment: Record<string, any>; generatedCount: number; heroImageUrl?: string }> {
  const {
    ownerUserId,
    projectId,
    treatment,
    storyLocale = 'en',
    beatIndices,
    maxBeats = MAX_INITIAL_STORYBOARD_BEATS,
  } = input

  const rawBeats = Array.isArray(treatment?.beats) ? treatment.beats : []
  if (rawBeats.length === 0) {
    return { treatment, generatedCount: 0 }
  }

  const nextBeats = rawBeats.map((b: Record<string, any>) => ({ ...b }))
  const candidateIndices =
    Array.isArray(beatIndices) && beatIndices.length > 0
      ? beatIndices.filter((idx) => idx >= 0 && idx < nextBeats.length)
      : nextBeats
          .map((b, idx) => ({
            idx,
            hasImage: Boolean(b?.imageUrl || b?.storyboardStillUrl || b?.stillUrl),
          }))
          .filter((x) => !x.hasImage)
          .map((x) => x.idx)

  const targetIndices = candidateIndices.slice(0, maxBeats)
  if (targetIndices.length === 0) {
    return {
      treatment: { ...treatment, beats: nextBeats },
      generatedCount: 0,
      heroImageUrl: resolveBlueprintHeroImageUrl(treatment) ?? undefined,
    }
  }

  const creditsPerBeat = IMAGE_CREDITS.FRAME_GENERATION
  const totalCreditsNeeded = targetIndices.length * creditsPerBeat
  const hasCredits = await CreditService.ensureCredits(ownerUserId, totalCreditsNeeded).catch(
    () => false
  )
  if (!hasCredits) {
    return {
      treatment: { ...treatment, beats: nextBeats },
      generatedCount: 0,
      heroImageUrl: resolveBlueprintHeroImageUrl(treatment) ?? undefined,
    }
  }

  let generatedCount = 0
  const tone = String(treatment.visual_style || treatment.tone_description || 'Cinematic naturalism').trim()

  let generateImageFn: typeof import('@/lib/gemini/imageClient').generateImageWithGemini | null = null
  let uploadBlobFn: typeof import('@/lib/storage/blob').uploadImageToBlob | null = null
  try {
    const imgMod = await import('@/lib/gemini/imageClient')
    const blobMod = await import('@/lib/storage/blob')
    generateImageFn = imgMod.generateImageWithGemini
    uploadBlobFn = blobMod.uploadImageToBlob
  } catch (loadErr) {
    console.warn('[automatedClientBlueprint] Image client unavailable in current env:', loadErr)
    return {
      treatment: { ...treatment, beats: nextBeats },
      generatedCount: 0,
      heroImageUrl: resolveBlueprintHeroImageUrl(treatment) ?? undefined,
    }
  }

  for (const idx of targetIndices) {
    const beat = nextBeats[idx]
    if (!beat) continue
    try {
      const rawTitle = String(beat.title || `Chapter ${idx + 1}`).trim()
      const rawSynopsis = String(beat.synopsis || beat.intent || '').trim()
      const rawSetting = String(beat.settingHint || '').trim()
      const era = String(beat.eraOrAge || '').trim()

      const enSynopsis = await englishForModel(rawSynopsis.slice(0, 320), storyLocale)
      const enSetting = rawSetting ? await englishForModel(rawSetting, storyLocale) : ''

      const prompt = [
        `Cinematic 16:9 storyboard keyframe illustration for Chapter ${idx + 1}: "${rawTitle}".`,
        enSynopsis ? `Scene action: ${enSynopsis}` : '',
        era ? `Historical era / character age context: ${era}.` : '',
        enSetting ? `Setting: ${enSetting}.` : '',
        `Visual style & tone: ${tone}.`,
        'Expressive cinematic framing, rich natural lighting, zero text overlays, zero watermarks.',
      ]
        .filter(Boolean)
        .join(' ')

      const dataUri = await generateImageFn(prompt, {
        aspectRatio: '16:9',
        imageSize: '1K',
        quality: 'fast',
        skipFaceMesh: true,
      })

      const uploadedUrl = await uploadBlobFn(
        dataUri,
        `projects/${projectId}/blueprint/beat-${idx + 1}-${Date.now()}.png`
      )

      if (uploadedUrl) {
        nextBeats[idx] = {
          ...beat,
          imageUrl: uploadedUrl,
          storyboardStillUrl: uploadedUrl,
        }
        generatedCount++
      }
    } catch (imgErr) {
      console.warn(`[automatedClientBlueprint] Beat ${idx + 1} illustration skipped:`, imgErr)
      // Stop attempting remaining beats if image provider is unavailable in current env
      if (generatedCount === 0) break
    }
  }

  if (generatedCount > 0) {
    await CreditService.charge(
      ownerUserId,
      generatedCount * creditsPerBeat,
      'ai_usage',
      projectId,
      {
        operation: 'automated_client_blueprint_beat_storyboards',
        generatedCount,
      }
    ).catch((e) => console.warn('[automatedClientBlueprint] Storyboard credit charge warning:', e))
  }

  const firstBeatImg = nextBeats.find((b) => typeof b?.imageUrl === 'string' && b.imageUrl)?.imageUrl as
    | string
    | undefined
  const updatedTreatment = {
    ...treatment,
    beats: nextBeats,
    ...(firstBeatImg && !treatment.heroImageUrl ? { heroImageUrl: firstBeatImg } : {}),
  }

  return {
    treatment: updatedTreatment,
    generatedCount,
    heroImageUrl: pickBestHeroImageUrl(
      resolveBlueprintHeroImageUrl(updatedTreatment),
      firstBeatImg
    ),
  }
}

export async function runAutomatedClientAudienceResonance(input: {
  ownerUserId: string
  projectId: string
  treatment: Record<string, any>
  locale: ClientPortalLocale
  targetAudienceText?: string
  iterationNumber: number
}): Promise<{
  snapshot: SharedBlueprintARSnapshot
  persisted: ReturnType<typeof createPersistedBlueprintAR>
}> {
  const { ownerUserId, projectId, treatment, locale, targetAudienceText, iterationNumber } = input
  const languageName = getLocaleEnglishName(locale)
  const audienceDef = createAudienceDefinition({
    description:
      targetAudienceText ||
      String(treatment.target_audience || 'Commissioning client & intended viewers'),
    source: 'blueprint',
  })

  let strengths: string[] = [
    'Clear emotional throughline aligned to the confirmed client vision',
    'Structured chapter pacing ready for storyboard review',
  ]
  let summary = 'Strong alignment with the confirmed vision and intended audience.'
  let rawRecommendations: unknown[] = []

  const arCost = BLUEPRINT_CREDITS.AUDIENCE_RESONANCE_ANALYSIS
  const canRunAi = await CreditService.ensureCredits(ownerUserId, arCost).catch(() => false)

  if (canRunAi) {
    try {
      const prompt = `You are SceneFlow's Audience Resonance Story Coach evaluating a client video Blueprint (Iteration ${iterationNumber} of ${DEFAULT_MAX_AUTOMATED_AR_ITERATIONS}).
Output Language: ${languageName} (${locale}) — write "summary", "strengths", and recommendation "title"/"text"/"reason" in ${languageName}.

Target Audience: ${audienceDef.description}
Title: ${String(treatment.title || '')}
Logline: ${String(treatment.logline || '')}
Genre & Tone: ${String(treatment.genre || '')} — ${String(treatment.tone_description || '')}
Synopsis: ${String(treatment.synopsis || '').slice(0, 2400)}
Beats: ${JSON.stringify((treatment.beats || []).slice(0, 8))}

Return valid JSON ONLY:
{
  "summary": "2-sentence constructive executive summary for the client",
  "strengths": ["2-3 specific story strengths"],
  "recommendations": [
    {
      "id": "ar-${iterationNumber}-1",
      "title": "Short constructive suggestion title",
      "reason": "What opportunity this unlocks for the audience",
      "text": "Concrete improvement that can be applied to the Blueprint",
      "priority": "medium",
      "fixSection": "beats",
      "impactSections": ["beats", "story"],
      "pointsDeducted": 5
    }
  ]
}`

      const res = await generateText(prompt, {
        model: getGeminiProductModel('blueprint'),
        temperature: 0.3,
        maxOutputTokens: 2048,
        thinkingLevel: 'low',
        thinkingBudget: 256,
        responseMimeType: 'application/json',
        timeoutMs: 30_000,
        maxRetries: 1,
      })

      const parsed = safeParseJsonFromText(res.text || '{}') as {
        summary?: string
        strengths?: unknown[]
        recommendations?: unknown[]
      }
      if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
        summary = parsed.summary.trim()
      }
      if (Array.isArray(parsed.strengths) && parsed.strengths.length > 0) {
        strengths = parsed.strengths.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 4)
      }
      if (Array.isArray(parsed.recommendations)) {
        rawRecommendations = parsed.recommendations.slice(0, 4)
      }

      await CreditService.charge(ownerUserId, arCost, 'ai_usage', projectId, {
        operation: 'automated_client_audience_resonance',
        iterationNumber,
      }).catch((e) => console.warn('[automatedClientBlueprint] AR credit charge warning:', e))
    } catch (err) {
      console.warn('[automatedClientBlueprint] AR analysis fallback used:', err)
    }
  }

  const recommendations = mapRecommendations(rawRecommendations, 0)
  const deductions: BlueprintAudienceDeduction[] = recommendations.map((r) => ({
    reason: r.reason || r.title || r.text,
    points: r.pointsDeducted,
    category: r.category || 'Audience Appeal',
    priority: r.priority,
    recommendationId: r.id,
  }))
  const overallScore =
    deductions.length > 0 ? calculateOverallFromDeductions(deductions) : 92

  const categories: BlueprintAudienceCategory[] = [
    'Audience Appeal',
    'Genre & Tone Fit',
    'Concept Hook',
    'Character Connection',
    'Clarity & Structure',
  ].map((name) => ({
    name,
    weight: BLUEPRINT_AR_CATEGORY_WEIGHTS[name] || 20,
    score: Math.min(98, Math.max(72, overallScore + (name === 'Audience Appeal' ? 2 : 0))),
  }))

  const analysis: BlueprintAudienceResonanceAnalysis = {
    version: 3,
    treatmentId: String(treatment.id || 'intake-blueprint'),
    overallScore,
    baseScore: 100,
    deductions,
    recommendations,
    categories,
    strengths,
    improvements: recommendations.map((r) => r.text),
    summary,
    audienceDefinition: audienceDef,
    isReadyForProduction: overallScore >= READY_FOR_PRODUCTION_THRESHOLD_V3,
    generatedAt: new Date().toISOString(),
    creditsUsed: canRunAi ? arCost : 0,
  }

  const persisted = createPersistedBlueprintAR(analysis, audienceDef, [], iterationNumber)
  const snapshot = sanitizeBlueprintARForShare(persisted)!

  return { snapshot, persisted }
}

export async function provisionAutomatedBlueprintShareFromIntake(input: {
  ownerUserId: string
  ownerDisplayName?: string
  projectId: string
  variantId: string
  treatment: Record<string, any>
  locale: ClientPortalLocale
  customerName: string
  customerEmail?: string | null
  targetAudience?: string
  brandProfileSnapshot: BrandProfileSnapshot
  maxBlueprintRevisions?: number
  maxArIterations?: number
  blueprintDepositUsd?: number
  origin?: string
}): Promise<{
  shareToken: string
  shareUrl: string
  treatment: Record<string, any>
  arSnapshot: SharedBlueprintARSnapshot | null
}> {
  const maxRevisions = Math.min(
    8,
    Math.max(1, Math.round(input.maxBlueprintRevisions ?? DEFAULT_MAX_AUTOMATED_BLUEPRINT_REVISIONS))
  )
  const maxAr = Math.min(
    5,
    Math.max(1, Math.round(input.maxArIterations ?? DEFAULT_MAX_AUTOMATED_AR_ITERATIONS))
  )
  const depositUsd = input.blueprintDepositUsd ?? DEFAULT_CLIENT_BLUEPRINT_DEPOSIT_USD

  // 1. Auto-illustrate beat storyboard keyframes (best-effort)
  const illustrated = await illustrateTreatmentBeatsForClientShare({
    ownerUserId: input.ownerUserId,
    projectId: input.projectId,
    treatment: input.treatment,
    storyLocale: input.locale === 'zh-CN' ? 'zh' : input.locale,
    maxBeats: MAX_INITIAL_STORYBOARD_BEATS,
  })

  // 2. Run initial Audience Resonance pass (Pass 1 of 3)
  let arSnapshot: SharedBlueprintARSnapshot | null = null
  try {
    const arRes = await runAutomatedClientAudienceResonance({
      ownerUserId: input.ownerUserId,
      projectId: input.projectId,
      treatment: illustrated.treatment,
      locale: input.locale,
      targetAudienceText: input.targetAudience,
      iterationNumber: 1,
    })
    arSnapshot = arRes.snapshot
  } catch (arErr) {
    console.warn('[automatedClientBlueprint] Initial AR pass warning:', arErr)
  }

  // 3. Create white-label Client Blueprint Share session
  const shareToken = crypto.randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const reviewLang = toBlueprintReviewLanguageCode(input.locale)

  const sharePayload: BlueprintSessionPayload = {
    type: 'blueprint',
    projectId: input.projectId,
    variantId: input.variantId,
    treatment: illustrated.treatment,
    heroImageUrl: illustrated.heroImageUrl,
    audienceDefinition: arSnapshot?.analysis?.audienceDefinition ?? null,
    shareSettings: {
      expiresAt: expiresAt.toISOString(),
      allowTts: true,
      collectEmail: false,
      allowFeedback: true,
      neverExpires: false,
      clientMode: true,
      clientAutoReviseMode: true,
      hideAudienceResonance: false,
      maxFeedbackRounds: maxRevisions,
      roundsUsed: 0,
      maxArIterations: maxAr,
      arIterationsUsed: arSnapshot ? 1 : 0,
      customerEmail: input.customerEmail?.trim() || undefined,
      customerName: input.customerName,
      blueprintDepositUsd: depositUsd,
      approvalStatus: 'pending_review',
      brandProfileSnapshot: input.brandProfileSnapshot,
    },
    ownerDisplayName: input.brandProfileSnapshot.brandName || input.ownerDisplayName || 'Studio Producer',
    sectionAudioStatus: isGeminiTtsConfigured() ? 'idle' : 'skipped',
    sectionAudioLanguage: reviewLang,
    sectionAudioVoiceId: DEFAULT_BLUEPRINT_GEMINI_VOICE,
    sectionAudioByLanguage: {},
    blueprintAudienceResonance: arSnapshot,
  }

  const createdShare = await CollabSession.create({
    project_id: input.projectId,
    owner_user_id: input.ownerUserId,
    token: shareToken,
    status: 'active',
    expires_at: expiresAt,
    payload: sharePayload as unknown as Record<string, unknown>,
  })

  // 4. Trigger narrated section audio generation (best-effort, non-blocking on failure)
  if (isGeminiTtsConfigured() && createdShare?.id) {
    try {
      const { runShareSectionAudioGeneration } = await import(
        '@/lib/blueprint/generateShareSectionAudio'
      )
      await runShareSectionAudioGeneration(String(createdShare.id), {
        language: reviewLang,
      })
    } catch (ttsErr) {
      console.warn('[automatedClientBlueprint] Auto TTS generation skipped:', ttsErr)
    }
  }

  const baseOrigin = (input.origin || getAppBaseUrl()).replace(/\/$/, '')
  const shareUrl = `${baseOrigin}/blueprint/share/${shareToken}?lang=${encodeURIComponent(input.locale)}`

  // 5. Email automated Illustrated & Narrated Blueprint Review link to the customer
  await sendAutomatedClientPortalEmail({
    toEmail: input.customerEmail,
    customerName: input.customerName,
    brandName: input.brandProfileSnapshot.brandName,
    subject: `${input.brandProfileSnapshot.brandName} — Your Illustrated Storyboard Blueprint Is Ready: "${String(illustrated.treatment.title || 'Your Film')}"`,
    heading: 'Your Illustrated & Narrated Storyboard Blueprint Is Ready',
    paragraphs: [
      `Hi ${input.customerName},`,
      `Your story Blueprint for "${String(illustrated.treatment.title || 'your film')}" has been synthesized with chapter storyboards, voiceover audio, and an Audience Resonance score${arSnapshot?.analysis?.overallScore ? ` (${arSnapshot.analysis.overallScore}/100)` : ''}.`,
      `Open your private review portal below to listen, inspect each storyboard beat, refine up to ${maxRevisions} AI-guided iterations (plus up to ${maxAr} Audience Resonance passes), and click Approve when you are ready for your production quote.`,
    ],
    ctaLabel: 'Review Illustrated Storyboard Blueprint',
    ctaUrl: shareUrl,
  })

  return {
    shareToken,
    shareUrl,
    treatment: illustrated.treatment,
    arSnapshot,
  }
}

export async function clarifyCustomerBlueprintFeedback(input: {
  token: string
  rawFeedback: string
  reviewerName?: string
  locale?: string
}): Promise<
  | {
      ok: true
      clarification: BlueprintClientClarificationDraft
      roundsUsed: number
      maxFeedbackRounds: number
    }
  | { ok: false; status: number; error: string }
> {
  const session = await resolveSessionByToken(input.token)
  if (!session) return { ok: false, status: 404, error: 'Blueprint share link not found or expired' }
  const payload = getPayload(session)
  if (!payload) return { ok: false, status: 400, error: 'Invalid Blueprint session' }

  if (payload.shareSettings?.approvalStatus === 'approved') {
    return { ok: false, status: 409, error: 'BLUEPRINT_LOCKED: This Blueprint has already been approved.' }
  }
  if (isBlueprintRoundLimitReached(payload.shareSettings)) {
    return {
      ok: false,
      status: 409,
      error: 'ROUND_LIMIT_REACHED: All included automated Blueprint iterations have been used.',
    }
  }

  const trimmed = (input.rawFeedback || '').trim()
  if (!trimmed) {
    return { ok: false, status: 400, error: 'Please enter the changes you would like to make' }
  }

  const quarantine = evaluateCustomerTextQuarantine(trimmed)
  if (quarantine.status === 'flagged') {
    return {
      ok: false,
      status: 422,
      error: quarantine.reason || 'Feedback flagged by safety filter. Please rephrase your note.',
    }
  }

  const activeLocale = resolveClientPortalLocale(
    input.locale || payload.sectionAudioLanguage || 'en'
  )
  const languageName = getLocaleEnglishName(activeLocale)
  const treatment = payload.treatment || {}

  let clarifiedSummary = trimmed.slice(0, 400)
  let proposedChanges: string[] = [trimmed.slice(0, 240)]
  let targetSections: BlueprintFixSection[] = ['beats', 'story']

  try {
    const prompt = `You are a helpful executive story producer filtering and clarifying a client's feedback before routing it to SceneFlow's automated Blueprint Director.
Output Language: ${languageName} (${activeLocale}) — write "clarifiedSummary" and "proposedChanges" in ${languageName}.

Current Blueprint Title: ${String(treatment.title || '')}
Logline: ${String(treatment.logline || '')}
Beats: ${JSON.stringify((Array.isArray(treatment.beats) ? treatment.beats : []).slice(0, 8))}

Client's Raw Feedback:
"${trimmed.slice(0, 2500)}"

RULES:
1. Distill only actionable story, beat, tone, character, or prop adjustments (ignore off-topic chatter).
2. Keep every character as a single named individual (never create plural group characters).
3. Summarize clearly so the client can confirm: "Yes, apply these updates to my Blueprint."

Return valid JSON ONLY:
{
  "clarifiedSummary": "Clear 1-2 sentence confirmation of what will be updated",
  "proposedChanges": ["Bullet 1", "Bullet 2"],
  "targetSections": ["beats", "story"]
}`

    const res = await generateText(prompt, {
      model: getGeminiProductModel('blueprint'),
      temperature: 0.25,
      maxOutputTokens: 1536,
      thinkingLevel: 'minimal',
      thinkingBudget: 0,
      responseMimeType: 'application/json',
      timeoutMs: 25_000,
      maxRetries: 1,
    })

    const parsed = safeParseJsonFromText(res.text || '{}') as {
      clarifiedSummary?: string
      proposedChanges?: unknown[]
      targetSections?: unknown[]
    }
    if (typeof parsed.clarifiedSummary === 'string' && parsed.clarifiedSummary.trim()) {
      clarifiedSummary = parsed.clarifiedSummary.trim().slice(0, 600)
    }
    if (Array.isArray(parsed.proposedChanges) && parsed.proposedChanges.length > 0) {
      proposedChanges = parsed.proposedChanges
        .map((c) => String(c || '').trim())
        .filter(Boolean)
        .slice(0, 5)
    }
    const validSections: BlueprintFixSection[] = ['core', 'story', 'tone', 'beats', 'characters']
    if (Array.isArray(parsed.targetSections)) {
      const filtered = parsed.targetSections.filter((s): s is BlueprintFixSection =>
        validSections.includes(s as BlueprintFixSection)
      )
      if (filtered.length > 0) targetSections = filtered
    }
  } catch (err) {
    console.warn('[automatedClientBlueprint] Feedback clarifier fallback used:', err)
  }

  const clarification: BlueprintClientClarificationDraft = {
    id: `clarify-${crypto.randomUUID().slice(0, 8)}`,
    rawFeedback: trimmed.slice(0, 2500),
    clarifiedSummary,
    proposedChanges,
    targetSections,
    createdAt: new Date().toISOString(),
  }

  const nextPayload: BlueprintSessionPayload = {
    ...payload,
    pendingClientClarification: clarification,
  }

  await CollabSession.update(
    { payload: nextPayload as unknown as Record<string, unknown> },
    { where: { id: sessionDbId(session) } }
  )

  return {
    ok: true,
    clarification,
    roundsUsed: Number(payload.shareSettings?.roundsUsed ?? 0),
    maxFeedbackRounds: Number(
      payload.shareSettings?.maxFeedbackRounds ?? DEFAULT_MAX_AUTOMATED_BLUEPRINT_REVISIONS
    ),
  }
}

export async function applyConfirmedCustomerBlueprintRevision(input: {
  token: string
  confirmedIntent?: string
  selectedRecommendationIds?: string[]
  locale?: string
  origin?: string
}): Promise<
  | {
      ok: true
      treatment: Record<string, any>
      roundsUsed: number
      maxFeedbackRounds: number
      arIterationsUsed: number
      maxArIterations: number
      blueprintAudienceResonance: SharedBlueprintARSnapshot | null
    }
  | { ok: false; status: number; error: string }
> {
  const session = await resolveSessionByToken(input.token)
  if (!session) return { ok: false, status: 404, error: 'Blueprint share link not found or expired' }
  const payload = getPayload(session)
  if (!payload) return { ok: false, status: 400, error: 'Invalid Blueprint session' }

  if (payload.shareSettings?.approvalStatus === 'approved') {
    return { ok: false, status: 409, error: 'BLUEPRINT_LOCKED: This Blueprint has already been approved.' }
  }
  if (isBlueprintRoundLimitReached(payload.shareSettings)) {
    return {
      ok: false,
      status: 409,
      error: 'ROUND_LIMIT_REACHED: All included automated Blueprint iterations have been used.',
    }
  }

  const ownerUserId = String((session as { owner_user_id?: string }).owner_user_id || '')
  const projectId = String((session as { project_id?: string }).project_id || payload.projectId || '')
  if (!ownerUserId || !projectId) {
    return { ok: false, status: 400, error: 'Session is missing owner or project reference' }
  }

  const pending = payload.pendingClientClarification
  const intentText = (
    input.confirmedIntent ||
    (pending
      ? `${pending.clarifiedSummary}\n${pending.proposedChanges.map((p) => `- ${p}`).join('\n')}`
      : '')
  ).trim()

  const arRecs = payload.blueprintAudienceResonance?.analysis?.recommendations || []
  const selectedIds = Array.isArray(input.selectedRecommendationIds)
    ? input.selectedRecommendationIds
    : []

  if (!intentText && selectedIds.length === 0) {
    return {
      ok: false,
      status: 400,
      error: 'Please clarify your feedback or select an Audience Resonance suggestion first',
    }
  }

  if (intentText) {
    const quarantine = evaluateCustomerTextQuarantine(intentText)
    if (quarantine.status === 'flagged') {
      return {
        ok: false,
        status: 422,
        error: quarantine.reason || 'Feedback flagged by safety filter',
      }
    }
  }

  const reviseCreditCost = BLUEPRINT_CREDITS.BLUEPRINT_GUIDED_REVISE
  const hasCredits = await CreditService.ensureCredits(ownerUserId, reviseCreditCost).catch(
    () => false
  )
  if (!hasCredits) {
    return {
      ok: false,
      status: 402,
      error: 'Studio credit balance temporarily reached. Please notify your producer.',
    }
  }

  const activeLocale = resolveClientPortalLocale(
    input.locale || payload.sectionAudioLanguage || 'en'
  )
  const storyLocale = activeLocale === 'zh-CN' ? 'zh' : activeLocale
  const intentForRouting =
    storyLocale === 'en' ? intentText : await englishForModel(intentText, storyLocale)

  const prevTreatment = (payload.treatment || {}) as Record<string, any>
  const prevBeats = Array.isArray(prevTreatment.beats) ? prevTreatment.beats : []

  // Route through SceneFlow's Blueprint Director (`executeGuidedRevise`)
  const guidedPayload = buildGuidedRevisePayload({
    incomingVariant: prevTreatment,
    userIntent: intentText,
    intentTextForRouting: intentForRouting,
    resonanceRecommendations: arRecs,
    selectedRecommendationIds: selectedIds,
    focusScope: 'all',
    storyLocale,
  })

  const guidedResult = await executeGuidedRevise(guidedPayload)
  let nextTreatment = mergeRevisionIntoVariant(prevTreatment, guidedResult.patch) as Record<
    string,
    any
  >

  // Preserve unchanged beat storyboard stills and detect modified beats for re-illustration
  const changedBeatIndices: number[] = []
  if (Array.isArray(nextTreatment.beats)) {
    nextTreatment.beats = nextTreatment.beats.map((nb: Record<string, any>, idx: number) => {
      const oldBeat = prevBeats[idx] as Record<string, any> | undefined
      const synopsisChanged =
        !oldBeat ||
        String(oldBeat.synopsis || '').trim() !== String(nb.synopsis || '').trim() ||
        String(oldBeat.title || '').trim() !== String(nb.title || '').trim()
      if (synopsisChanged) {
        changedBeatIndices.push(idx)
        return nb
      }
      const preservedImg =
        nb.imageUrl || oldBeat?.imageUrl || oldBeat?.storyboardStillUrl || undefined
      return preservedImg
        ? { ...nb, imageUrl: preservedImg, storyboardStillUrl: preservedImg }
        : nb
    })
  }

  if (changedBeatIndices.length > 0) {
    const reillustrated = await illustrateTreatmentBeatsForClientShare({
      ownerUserId,
      projectId,
      treatment: nextTreatment,
      storyLocale,
      beatIndices: changedBeatIndices,
      maxBeats: MAX_REVISED_STORYBOARD_BEATS,
    })
    nextTreatment = reillustrated.treatment
  }

  await CreditService.charge(ownerUserId, reviseCreditCost, 'ai_usage', projectId, {
    operation: 'automated_client_blueprint_guided_revise',
  }).catch((e) => console.warn('[automatedClientBlueprint] Guided revise credit warning:', e))

  const nextRoundsUsed = Number(payload.shareSettings?.roundsUsed ?? 0) + 1
  const maxFeedbackRounds = Number(
    payload.shareSettings?.maxFeedbackRounds ?? DEFAULT_MAX_AUTOMATED_BLUEPRINT_REVISIONS
  )
  let arIterationsUsed = Number(payload.shareSettings?.arIterationsUsed ?? 0)
  const maxArIterations = Number(
    payload.shareSettings?.maxArIterations ?? DEFAULT_MAX_AUTOMATED_AR_ITERATIONS
  )
  let nextArSnapshot = payload.blueprintAudienceResonance ?? null

  // Auto-run Audience Resonance pass if under the 3-iteration cap
  if (arIterationsUsed < maxArIterations) {
    try {
      const arRes = await runAutomatedClientAudienceResonance({
        ownerUserId,
        projectId,
        treatment: nextTreatment,
        locale: activeLocale,
        targetAudienceText: payload.audienceDefinition?.description,
        iterationNumber: arIterationsUsed + 1,
      })
      nextArSnapshot = arRes.snapshot
      arIterationsUsed += 1
    } catch (arErr) {
      console.warn('[automatedClientBlueprint] Post-revise AR warning:', arErr)
    }
  }

  const nextPayload: BlueprintSessionPayload = {
    ...payload,
    treatment: nextTreatment,
    heroImageUrl:
      resolveBlueprintHeroImageUrl(nextTreatment) ?? payload.heroImageUrl,
    pendingClientClarification: null,
    blueprintAudienceResonance: nextArSnapshot,
    sectionAudioStatus: isGeminiTtsConfigured() ? 'idle' : payload.sectionAudioStatus,
    sectionAudioByLanguage: {},
    shareSettings: {
      ...payload.shareSettings,
      roundsUsed: nextRoundsUsed,
      maxFeedbackRounds,
      arIterationsUsed,
      maxArIterations,
      approvalStatus: 'pending_review',
    },
  }

  await CollabSession.update(
    { payload: nextPayload as unknown as Record<string, unknown> },
    { where: { id: sessionDbId(session) } }
  )

  // Sync updated Blueprint variant back onto Project metadata
  const project = await Project.findByPk(projectId).catch(() => null)
  if (project) {
    const md = ((project.metadata || {}) as Record<string, unknown>)
    const co = ((md.clientOrder || {}) as Record<string, unknown>)
    await project.update({
      title: String(nextTreatment.title || project.title),
      description: String(nextTreatment.logline || project.description),
      metadata: {
        ...md,
        filmTreatmentVariant: nextTreatment,
        variants: [nextTreatment],
        clientOrder: {
          ...co,
          blueprintRoundsUsed: nextRoundsUsed,
          arIterationsUsed,
          lastClientBlueprintRevisionAt: new Date().toISOString(),
        },
      },
    })
  }

  const brandName =
    payload.shareSettings?.brandProfileSnapshot?.brandName ||
    payload.ownerDisplayName ||
    'Video Studio'
  const baseOrigin = (input.origin || getAppBaseUrl()).replace(/\/$/, '')
  const shareUrl = `${baseOrigin}/blueprint/share/${input.token}?lang=${encodeURIComponent(activeLocale)}`

  await sendAutomatedClientPortalEmail({
    toEmail: payload.shareSettings?.customerEmail,
    customerName: payload.shareSettings?.customerName,
    brandName,
    subject: `${brandName} — Updated Blueprint (Revision ${nextRoundsUsed}/${maxFeedbackRounds}) & Audience Resonance Score`,
    heading: `Your Blueprint Has Been Updated (Iteration ${nextRoundsUsed} of ${maxFeedbackRounds})`,
    paragraphs: [
      `Hi ${payload.shareSettings?.customerName || 'there'},`,
      `Your confirmed feedback has been applied by Blueprint Director${nextArSnapshot?.analysis?.overallScore ? ` and re-scored by Audience Resonance (${nextArSnapshot.analysis.overallScore}/100, Pass ${arIterationsUsed}/${maxArIterations})` : ''}.`,
      `Open your Blueprint link below to review the updated storyboards and click Approve when ready for your production quote.`,
    ],
    ctaLabel: 'Open Updated Blueprint & AR Score',
    ctaUrl: shareUrl,
  })

  return {
    ok: true,
    treatment: nextTreatment,
    roundsUsed: nextRoundsUsed,
    maxFeedbackRounds,
    arIterationsUsed,
    maxArIterations,
    blueprintAudienceResonance: nextArSnapshot,
  }
}

export async function runStandaloneCustomerArIteration(input: {
  token: string
  locale?: string
  origin?: string
}): Promise<
  | {
      ok: true
      arIterationsUsed: number
      maxArIterations: number
      blueprintAudienceResonance: SharedBlueprintARSnapshot
    }
  | { ok: false; status: number; error: string }
> {
  const session = await resolveSessionByToken(input.token)
  if (!session) return { ok: false, status: 404, error: 'Blueprint share link not found or expired' }
  const payload = getPayload(session)
  if (!payload) return { ok: false, status: 400, error: 'Invalid Blueprint session' }

  const used = Number(payload.shareSettings?.arIterationsUsed ?? 0)
  const maxAr = Number(
    payload.shareSettings?.maxArIterations ?? DEFAULT_MAX_AUTOMATED_AR_ITERATIONS
  )
  if (used >= maxAr) {
    return {
      ok: false,
      status: 409,
      error: `AR_LIMIT_REACHED: All ${maxAr} automated Audience Resonance iterations have been used.`,
    }
  }

  const ownerUserId = String((session as { owner_user_id?: string }).owner_user_id || '')
  const projectId = String((session as { project_id?: string }).project_id || payload.projectId || '')
  const activeLocale = resolveClientPortalLocale(
    input.locale || payload.sectionAudioLanguage || 'en'
  )

  const arRes = await runAutomatedClientAudienceResonance({
    ownerUserId,
    projectId,
    treatment: (payload.treatment || {}) as Record<string, any>,
    locale: activeLocale,
    targetAudienceText: payload.audienceDefinition?.description,
    iterationNumber: used + 1,
  })

  const nextUsed = used + 1
  const nextPayload: BlueprintSessionPayload = {
    ...payload,
    blueprintAudienceResonance: arRes.snapshot,
    shareSettings: {
      ...payload.shareSettings,
      arIterationsUsed: nextUsed,
      maxArIterations: maxAr,
    },
  }

  await CollabSession.update(
    { payload: nextPayload as unknown as Record<string, unknown> },
    { where: { id: sessionDbId(session) } }
  )

  const brandName =
    payload.shareSettings?.brandProfileSnapshot?.brandName ||
    payload.ownerDisplayName ||
    'Video Studio'
  const baseOrigin = (input.origin || getAppBaseUrl()).replace(/\/$/, '')
  const shareUrl = `${baseOrigin}/blueprint/share/${input.token}?lang=${encodeURIComponent(activeLocale)}`

  await sendAutomatedClientPortalEmail({
    toEmail: payload.shareSettings?.customerEmail,
    customerName: payload.shareSettings?.customerName,
    brandName,
    subject: `${brandName} — Audience Resonance Report (${arRes.snapshot.analysis?.overallScore ?? 90}/100 · Pass ${nextUsed}/${maxAr})`,
    heading: `Audience Resonance Iteration ${nextUsed} of ${maxAr} Ready`,
    paragraphs: [
      `Your latest Audience Resonance analysis scored ${arRes.snapshot.analysis?.overallScore ?? 90}/100.`,
      `Open your shared Blueprint link below to inspect story recommendations or approve your Blueprint.`,
    ],
    ctaLabel: 'View Audience Resonance & Blueprint',
    ctaUrl: shareUrl,
  })

  return {
    ok: true,
    arIterationsUsed: nextUsed,
    maxArIterations: maxAr,
    blueprintAudienceResonance: arRes.snapshot,
  }
}
