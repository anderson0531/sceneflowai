import crypto from 'crypto'
import CollabSession from '@/models/CollabSession'
import Project from '@/models/Project'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiProductModel } from '@/lib/config/modelConfig'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { CreditService } from '@/services/CreditService'
import { TEXT_CREDITS } from '@/lib/credits/creditCosts'
import { notifyUser } from '@/lib/jobs/jobService'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import {
  getLatestCustomerConsent,
  getOrCreateProducerProfile,
  toBrandProfileSnapshot,
  type BrandProfileSnapshot,
} from '@/lib/producer/producerProfileService'
import { evaluateCustomerTextQuarantine } from '@/lib/producer/quarantineCheck'
import {
  resolveClientPortalLocale,
  type ClientPortalLocale,
} from './clientPortalCopy'
import {
  buildIntakeBlueprintSynthesisPrompt,
  buildNextIntakeQuestionPrompt,
  INTAKE_PLAYBOOKS,
  type ExtractedBlueprintFromIntake,
  type IntakeMessageTurn,
  type IntakeVerticalId,
} from './intakePlaybooks'

export type IntakeAccessMode = 'single_project' | 'public_lead'

export interface IntakeSessionPayload {
  type: 'intake'
  mode: IntakeAccessMode
  vertical: IntakeVerticalId
  locale: ClientPortalLocale
  maxCustomerTurns: number
  customerTurnsUsed: number
  maxFeedbackRounds: number
  clientPriceUsd?: number
  creditBudgetCap?: number
  customerLabel?: string
  brandProfileSnapshot: BrandProfileSnapshot
  turns: IntakeMessageTurn[]
  completedAt?: string
  resultProjectId?: string
  publicCreditsSpentToday?: number
  publicCreditsDayKey?: string
}

export function isIntakePayload(
  payload: Record<string, unknown> | null | undefined
): payload is Record<string, unknown> & IntakeSessionPayload {
  return payload?.type === 'intake'
}

function todayKeyUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export async function resolveActiveIntakeSession(token: string) {
  const session = await CollabSession.findOne({
    where: { token },
  })
  if (!session) return null
  const expiresAt = (session as { expires_at?: Date | null }).expires_at
  if (expiresAt && new Date(expiresAt) < new Date()) return null
  const payload = session.payload as Record<string, unknown> | null
  if (!isIntakePayload(payload)) return null
  return { session, payload }
}

export async function createClientIntakeLink(input: {
  ownerUserId: string
  ownerDisplayName?: string
  projectId?: string | null
  vertical: IntakeVerticalId
  mode?: IntakeAccessMode
  locale?: string
  maxCustomerTurns?: number
  maxFeedbackRounds?: number
  clientPriceUsd?: number
  creditBudgetCap?: number
  customerLabel?: string
  expiresInDays?: number
  origin: string
}): Promise<{
  token: string
  sessionId: string
  projectId: string
  hostedUrl: string
  embedUrl: string
  iframeSnippet: string
}> {
  await ensureProducerPlatformSchema()
  const profile = await getOrCreateProducerProfile(input.ownerUserId)
  if (!profile.commercial_addendum_accepted_at) {
    throw new Error(
      'COMMERCIAL_ADDENDUM_REQUIRED: Accept the SceneFlow Commercial Producer Addendum in Producer Settings before creating client intake links.'
    )
  }

  const playbook = INTAKE_PLAYBOOKS[input.vertical]
  const locale = resolveClientPortalLocale(input.locale)
  const brandSnapshot = toBrandProfileSnapshot(profile, input.ownerDisplayName || 'Studio Producer')
  const maxCustomerTurns = Math.min(
    12,
    Math.max(3, Math.round(input.maxCustomerTurns ?? playbook.suggestedMaxTurns))
  )
  const maxFeedbackRounds = Math.min(
    10,
    Math.max(0, Math.round(input.maxFeedbackRounds ?? profile.default_max_rounds ?? 2))
  )

  // Ensure a draft Project exists to anchor CollabSession.project_id FK cleanly
  let targetProject: Project | null = null
  if (input.projectId) {
    targetProject = await Project.findByPk(input.projectId)
  }

  if (!targetProject) {
    const label = (input.customerLabel || '').trim()
    const draftTitle = label
      ? `${playbook.defaultTitlePrefix} — ${label}`
      : `${playbook.defaultTitlePrefix} (Client Intake)`

    targetProject = await Project.create({
      user_id: input.ownerUserId,
      title: draftTitle,
      description: 'Awaiting client onboarding interview submission',
      genre: playbook.genre,
      duration: Math.round(playbook.defaultDurationMinutes * 60),
      status: 'draft',
      current_step: 'ideation',
      step_statuses: { ideation: 'in_progress' },
      metadata: {
        clientOrder: {
          isClientProject: true,
          vertical: input.vertical,
          stage: 'awaiting_intake',
          actionState: 'waiting_on_client',
          customerLabel: label || undefined,
          maxFeedbackRounds,
          clientPriceUsd: input.clientPriceUsd,
          creditBudgetCap: input.creditBudgetCap,
          enforceHardCap: Boolean(input.creditBudgetCap && input.creditBudgetCap > 0),
          createdAt: new Date().toISOString(),
        },
        ...(input.creditBudgetCap && input.creditBudgetCap > 0
          ? { creditsBudget: Math.round(input.creditBudgetCap) }
          : {}),
      },
    } as any)
  }

  const token = crypto.randomBytes(24).toString('base64url')
  const days = Math.min(90, Math.max(1, Math.round(input.expiresInDays ?? 30)))
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const initialGreeting =
    playbook.welcomeByLocale[locale] || playbook.welcomeByLocale.en

  const payload: IntakeSessionPayload = {
    type: 'intake',
    mode: input.mode === 'public_lead' ? 'public_lead' : 'single_project',
    vertical: input.vertical,
    locale,
    maxCustomerTurns,
    customerTurnsUsed: 0,
    maxFeedbackRounds,
    clientPriceUsd: input.clientPriceUsd,
    creditBudgetCap: input.creditBudgetCap,
    customerLabel: input.customerLabel?.trim() || undefined,
    brandProfileSnapshot: brandSnapshot,
    turns: [
      {
        role: 'assistant',
        content: initialGreeting,
        createdAt: new Date().toISOString(),
      },
    ],
  }

  const session = await CollabSession.create({
    project_id: targetProject.id,
    owner_user_id: input.ownerUserId,
    token,
    status: 'active',
    expires_at: expiresAt,
    payload: payload as unknown as Record<string, unknown>,
  })

  const hostedUrl = `${input.origin}/intake/${token}?lang=${encodeURIComponent(locale)}`
  const embedUrl = `${input.origin}/embed/intake/${token}?lang=${encodeURIComponent(locale)}`
  const iframeSnippet = `<iframe src="${embedUrl}" width="100%" height="680" style="border:0;border-radius:16px;overflow:hidden;" allow="microphone; clipboard-write" loading="lazy" title="${brandSnapshot.brandName} Story Intake"></iframe>`

  return {
    token,
    sessionId: session.id,
    projectId: targetProject.id,
    hostedUrl,
    embedUrl,
    iframeSnippet,
  }
}

export async function submitCustomerIntakeTurn(input: {
  token: string
  message: string
  locale?: string
}): Promise<
  | {
      ok: true
      reply: string
      turns: IntakeMessageTurn[]
      customerTurnsUsed: number
      maxCustomerTurns: number
      readyToComplete: boolean
    }
  | {
      ok: false
      status: number
      error: string
    }
> {
  const resolved = await resolveActiveIntakeSession(input.token)
  if (!resolved) {
    return { ok: false, status: 404, error: 'Intake link not found or expired' }
  }
  const { session, payload } = resolved

  if (session.status === 'closed' || payload.completedAt) {
    return { ok: false, status: 409, error: 'This intake interview has already been submitted' }
  }

  // Enforce Customer Clickwrap Consent (Zero-Privity + Media/Likeness Attestation)
  const consent = await getLatestCustomerConsent(session.id)
  if (!consent) {
    return {
      ok: false,
      status: 403,
      error: 'CONSENT_REQUIRED: Customer consent attestation must be accepted before chatting',
    }
  }

  if (payload.customerTurnsUsed >= payload.maxCustomerTurns) {
    return {
      ok: false,
      status: 409,
      error: 'TURN_LIMIT_REACHED: Interview turn limit reached. Please submit to generate your Blueprint.',
    }
  }

  const trimmed = (input.message || '').trim()
  if (!trimmed) {
    return { ok: false, status: 400, error: 'Message cannot be empty' }
  }

  // Quarantine pre-check — blocks abusive inputs WITHOUT incrementing Producer moderation strikes
  const quarantine = evaluateCustomerTextQuarantine(trimmed)
  if (quarantine.status === 'flagged') {
    return {
      ok: false,
      status: 422,
      error: quarantine.reason || 'Input flagged by safety filter. Please rephrase your response.',
    }
  }

  const turnCreditCost = Math.max(1, TEXT_CREDITS.GEMINI_FLASH || 2)

  // Public Lead-Capture daily credit cap guard
  if (payload.mode === 'public_lead') {
    const profile = await getOrCreateProducerProfile(session.owner_user_id)
    const dailyCap = Number(profile.daily_public_intake_credit_cap || 200)
    const today = todayKeyUtc()
    const spentToday =
      payload.publicCreditsDayKey === today ? Number(payload.publicCreditsSpentToday || 0) : 0
    if (spentToday + turnCreditCost > dailyCap) {
      return {
        ok: false,
        status: 429,
        error: 'Daily intake capacity reached for this public widget. Please try again tomorrow.',
      }
    }
  }

  const hasCredits = await CreditService.ensureCredits(session.owner_user_id, turnCreditCost).catch(
    () => false
  )
  if (!hasCredits) {
    return {
      ok: false,
      status: 402,
      error: 'This studio intake portal is temporarily unavailable. Please contact your producer.',
    }
  }

  const activeLocale = input.locale
    ? resolveClientPortalLocale(input.locale)
    : payload.locale

  const customerTurn: IntakeMessageTurn = {
    role: 'customer',
    content: trimmed.slice(0, 4000),
    createdAt: new Date().toISOString(),
  }

  const nextTurns = [...payload.turns, customerTurn]
  const nextCount = payload.customerTurnsUsed + 1
  const playbook = INTAKE_PLAYBOOKS[payload.vertical]

  let assistantReply = ''
  let readyToComplete = nextCount >= payload.maxCustomerTurns

  try {
    const prompt = buildNextIntakeQuestionPrompt({
      vertical: payload.vertical,
      locale: activeLocale,
      brandName: payload.brandProfileSnapshot.brandName,
      turns: nextTurns,
      customerTurnNumber: nextCount,
      maxCustomerTurns: payload.maxCustomerTurns,
    })

    const llmRes = await generateText(prompt, {
      model: getGeminiProductModel('blueprint'),
      temperature: 0.4,
      maxOutputTokens: 600,
      thinkingLevel: 'low',
      responseMimeType: 'application/json',
      timeoutMs: 25_000,
      maxRetries: 1,
    })

    const parsed = safeParseJsonFromText(llmRes.text || '{}') as {
      reply?: string
      readyToComplete?: boolean
    }
    if (typeof parsed.reply === 'string' && parsed.reply.trim()) {
      assistantReply = parsed.reply.trim()
    }
    if (typeof parsed.readyToComplete === 'boolean') {
      readyToComplete = readyToComplete || parsed.readyToComplete
    }
  } catch (err) {
    console.warn('[intakeService] Falling back to milestone question:', err)
  }

  if (!assistantReply) {
    const fallbackIdx = Math.min(nextCount - 1, playbook.milestoneQuestions.length - 1)
    assistantReply = playbook.milestoneQuestions[fallbackIdx]
  }

  const assistantTurn: IntakeMessageTurn = {
    role: 'assistant',
    content: assistantReply,
    createdAt: new Date().toISOString(),
  }

  const finalTurns = [...nextTurns, assistantTurn]
  const today = todayKeyUtc()
  const prevSpentToday =
    payload.publicCreditsDayKey === today ? Number(payload.publicCreditsSpentToday || 0) : 0

  const updatedPayload: IntakeSessionPayload = {
    ...payload,
    locale: activeLocale,
    customerTurnsUsed: nextCount,
    turns: finalTurns,
    ...(payload.mode === 'public_lead'
      ? {
          publicCreditsDayKey: today,
          publicCreditsSpentToday: prevSpentToday + turnCreditCost,
        }
      : {}),
  }

  await session.update({
    payload: updatedPayload as unknown as Record<string, unknown>,
  })

  try {
    await CreditService.charge(
      session.owner_user_id,
      turnCreditCost,
      'ai_usage',
      session.project_id,
      {
        operation: 'client_intake_turn',
        vertical: payload.vertical,
      }
    )
  } catch (chargeErr) {
    console.warn('[intakeService] Failed to charge turn credits:', chargeErr)
  }

  return {
    ok: true,
    reply: assistantReply,
    turns: finalTurns,
    customerTurnsUsed: nextCount,
    maxCustomerTurns: payload.maxCustomerTurns,
    readyToComplete,
  }
}

function buildFallbackBlueprint(
  vertical: IntakeVerticalId,
  customerName: string,
  turns: IntakeMessageTurn[]
): ExtractedBlueprintFromIntake {
  const playbook = INTAKE_PLAYBOOKS[vertical]
  const customerAnswers = turns
    .filter((t) => t.role === 'customer')
    .map((t) => t.content)
  const combined = customerAnswers.join(' ')

  return {
    title: `${playbook.defaultTitlePrefix}: ${customerName}`,
    logline: customerAnswers[0]?.slice(0, 220) || `A custom ${playbook.genre.toLowerCase()} created for ${customerName}.`,
    synopsis: combined.slice(0, 1800) || `Client story intake completed for ${customerName}.`,
    genre: playbook.genre,
    tone_description: playbook.tone,
    visual_style: 'Warm documentary realism with archival photography and cinematic B-roll',
    target_audience: 'Family, clients, and invited viewers',
    beats: customerAnswers.slice(0, 6).map((ans, idx) => ({
      title: `Chapter ${idx + 1}`,
      intent: 'Capture client milestone',
      synopsis: ans.slice(0, 400),
      minutes: Number((playbook.defaultDurationMinutes / Math.max(1, Math.min(6, customerAnswers.length))).toFixed(1)),
      deliveryFormat: idx % 3 === 0 ? 'ai_reenactment' : 'archival_photo',
    })),
    character_descriptions: [
      {
        name: customerName,
        role: 'protagonist',
        description: 'Primary subject described during client onboarding interview',
        needsClientPhoto: true,
      },
    ],
    locations: [
      {
        name: 'Primary Featured Setting',
        description: 'Key location described in onboarding interview',
        needsClientPhoto: true,
      },
    ],
    props: [
      {
        name: 'Signature Keepsake or Featured Detail',
        description: 'Key item highlighted during onboarding interview',
        needsClientPhoto: true,
      },
    ],
  }
}

export async function completeClientIntakeToBlueprint(input: {
  token: string
}): Promise<
  | {
      ok: true
      projectId: string
      title: string
      extracted: ExtractedBlueprintFromIntake
    }
  | {
      ok: false
      status: number
      error: string
    }
> {
  const resolved = await resolveActiveIntakeSession(input.token)
  if (!resolved) {
    return { ok: false, status: 404, error: 'Intake link not found or expired' }
  }
  const { session, payload } = resolved

  if (payload.completedAt && payload.resultProjectId) {
    return {
      ok: false,
      status: 409,
      error: 'Intake interview has already been finalized',
    }
  }

  const consent = await getLatestCustomerConsent(session.id)
  if (!consent) {
    return {
      ok: false,
      status: 403,
      error: 'CONSENT_REQUIRED: Customer consent attestation is required',
    }
  }

  if (payload.customerTurnsUsed < 1) {
    return {
      ok: false,
      status: 400,
      error: 'Please answer at least one interview question before submitting',
    }
  }

  const synthesisCreditCost = Math.max(5, (TEXT_CREDITS.GEMINI_PRO || 10))
  let extracted: ExtractedBlueprintFromIntake | null = null

  try {
    const prompt = buildIntakeBlueprintSynthesisPrompt({
      vertical: payload.vertical,
      locale: payload.locale,
      customerName: consent.customer_name,
      turns: payload.turns,
    })

    const llmRes = await generateText(prompt, {
      model: getGeminiProductModel('blueprint'),
      temperature: 0.3,
      maxOutputTokens: 3000,
      thinkingLevel: 'low',
      responseMimeType: 'application/json',
      timeoutMs: 45_000,
      maxRetries: 1,
    })

    const parsed = safeParseJsonFromText(llmRes.text || '{}') as Partial<ExtractedBlueprintFromIntake>
    if (parsed.title && parsed.synopsis) {
      extracted = {
        title: String(parsed.title).slice(0, 200),
        logline: String(parsed.logline || '').slice(0, 500),
        synopsis: String(parsed.synopsis).slice(0, 5000),
        genre: String(parsed.genre || INTAKE_PLAYBOOKS[payload.vertical].genre),
        tone_description: String(parsed.tone_description || INTAKE_PLAYBOOKS[payload.vertical].tone),
        visual_style: String(parsed.visual_style || 'Warm cinematic documentary'),
        target_audience: String(parsed.target_audience || 'Client & Family'),
        beats: Array.isArray(parsed.beats) ? parsed.beats : [],
        character_descriptions: Array.isArray(parsed.character_descriptions)
          ? parsed.character_descriptions
          : Array.isArray((parsed as { characters?: ExtractedBlueprintFromIntake['character_descriptions'] }).characters)
            ? (parsed as { characters: ExtractedBlueprintFromIntake['character_descriptions'] }).characters
            : [],
        locations: Array.isArray(parsed.locations) ? parsed.locations : [],
        props: Array.isArray(parsed.props) ? parsed.props : [],
      }
    }
  } catch (err) {
    console.warn('[intakeService] Blueprint synthesis fallback triggered:', err)
  }

  if (!extracted) {
    extracted = buildFallbackBlueprint(payload.vertical, consent.customer_name, payload.turns)
  }

  // In single_project mode, update the anchored Project; in public_lead mode, spawn a dedicated Project per lead!
  let targetProject: Project | null = null
  if (payload.mode === 'single_project') {
    targetProject = await Project.findByPk(session.project_id)
  }

  const variantId = `intake-${crypto.randomUUID().slice(0, 8)}`
  const filmTreatmentVariant = {
    id: variantId,
    label: 'Client Intake Blueprint',
    title: extracted.title,
    logline: extracted.logline,
    synopsis: extracted.synopsis,
    genre: extracted.genre,
    tone_description: extracted.tone_description,
    visual_style: extracted.visual_style,
    target_audience: extracted.target_audience,
    beats: extracted.beats,
    character_descriptions: extracted.character_descriptions.map((c) => ({
      name: c.name,
      role: c.role,
      description: c.description,
    })),
  }

  const continuityChecklist = {
    characters: extracted.character_descriptions.map((c, idx) => ({
      slotId: `char-${idx + 1}`,
      slotType: 'character' as const,
      name: c.name,
      role: c.role,
      description: c.description,
      needsClientPhoto: c.needsClientPhoto !== false,
      approved: false,
    })),
    locations: extracted.locations.map((l, idx) => ({
      slotId: `loc-${idx + 1}`,
      slotType: 'location' as const,
      name: l.name,
      description: l.description,
      needsClientPhoto: l.needsClientPhoto !== false,
      approved: false,
    })),
    props: extracted.props.map((p, idx) => ({
      slotId: `prop-${idx + 1}`,
      slotType: 'prop' as const,
      name: p.name,
      description: p.description,
      needsClientPhoto: p.needsClientPhoto !== false,
      approved: false,
    })),
  }

  const transcriptPrimeText = payload.turns
    .map((t) => `${t.role === 'assistant' ? 'Interviewer' : consent.customer_name}: ${t.content}`)
    .join('\n\n')

  if (!targetProject) {
    targetProject = await Project.create({
      user_id: session.owner_user_id,
      title: extracted.title,
      description: extracted.logline,
      genre: extracted.genre,
      duration: Math.round(INTAKE_PLAYBOOKS[payload.vertical].defaultDurationMinutes * 60),
      status: 'in_progress',
      current_step: 'ideation',
      step_statuses: { ideation: 'in_progress' },
      metadata: {},
    } as any)
  }

  const prevMeta = ((targetProject.metadata || {}) as Record<string, unknown>)
  const prevOrder = ((prevMeta.clientOrder || {}) as Record<string, unknown>)

  const nextMeta: Record<string, unknown> = {
    ...prevMeta,
    blueprintPrimeInput: transcriptPrimeText,
    selectedVariantId: variantId,
    filmTreatmentVariant,
    variants: [filmTreatmentVariant],
    visionPhase: {
      ...((prevMeta.visionPhase as Record<string, unknown>) || {}),
      characters: extracted.character_descriptions.map((c, i) => ({
        id: `char-${i + 1}`,
        name: c.name,
        role: c.role,
        description: c.description,
      })),
      references: {
        sceneReferences: extracted.locations.map((l, i) => ({
          id: `loc-${i + 1}`,
          name: l.name,
          description: l.description,
        })),
        objectReferences: extracted.props.map((p, i) => ({
          id: `prop-${i + 1}`,
          name: p.name,
          description: p.description,
        })),
      },
    },
    clientOrder: {
      ...prevOrder,
      isClientProject: true,
      vertical: payload.vertical,
      locale: payload.locale,
      stage: 'blueprint_review_ready',
      actionState: 'action_required',
      customerName: consent.customer_name,
      customerEmail: consent.customer_email,
      customerConsentId: consent.id,
      intakeCompletedAt: new Date().toISOString(),
      maxFeedbackRounds: payload.maxFeedbackRounds,
      continuityChecklist,
    },
  }

  await targetProject.update({
    title: extracted.title,
    description: extracted.logline || targetProject.description,
    genre: extracted.genre,
    status: 'in_progress',
    metadata: nextMeta,
  })

  if (payload.mode === 'single_project') {
    await session.update({
      status: 'closed',
      payload: {
        ...payload,
        completedAt: new Date().toISOString(),
        resultProjectId: targetProject.id,
      } as unknown as Record<string, unknown>,
    })
  }

  try {
    await CreditService.charge(
      session.owner_user_id,
      synthesisCreditCost,
      'ai_usage',
      targetProject.id,
      {
        operation: 'client_intake_blueprint_synthesis',
        vertical: payload.vertical,
      }
    )
  } catch (err) {
    console.warn('[intakeService] Synthesis credit charge warning:', err)
  }

  try {
    await notifyUser({
      userId: session.owner_user_id,
      projectId: targetProject.id,
      type: 'client_intake_submitted',
      title: `Client Intake Ready: ${extracted.title}`,
      message: `${consent.customer_name} completed their ${payload.vertical.replace(/_/g, ' ')} onboarding interview. Review Blueprint & run Audience Resonance before sharing back.`,
      sendEmail: true,
      metadata: {
        projectId: targetProject.id,
        customerName: consent.customer_name,
        vertical: payload.vertical,
        openPath: `/dashboard/studio/${targetProject.id}`,
      },
    })
  } catch (notifyErr) {
    console.warn('[intakeService] Notification warning:', notifyErr)
  }

  return {
    ok: true,
    projectId: targetProject.id,
    title: extracted.title,
    extracted,
  }
}
