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
  buildClarifyIntakeVisionPrompt,
  buildIntakeBlueprintSynthesisPrompt,
  buildNextIntakeQuestionPrompt,
  buildVisionConfirmedKickoffPrompt,
  INTAKE_PLAYBOOKS,
  type ExtractedBlueprintFromIntake,
  type IntakeCompletenessChecklist,
  type IntakeExtractedCharacter,
  type IntakeMessageTurn,
  type IntakePhase,
  type IntakeResonatingBeat,
  type IntakeVerticalId,
  type IntakeVisionProposal,
} from './intakePlaybooks'
import {
  isCollectiveOrGroupCharacterName,
  sanitizeBlueprintCharactersAndBeats,
  splitCompoundIndividualNames,
} from '@/lib/character/ageStageContinuity'

export type IntakeAccessMode = 'single_project' | 'public_lead'

export const DEFAULT_MAX_VISION_REVISIONS = 3

export interface IntakeSessionPayload {
  type: 'intake'
  mode: IntakeAccessMode
  vertical: IntakeVerticalId
  locale: ClientPortalLocale
  phase?: IntakePhase
  maxVisionRevisions?: number
  visionProposal?: IntakeVisionProposal
  maxCustomerTurns: number
  customerTurnsUsed: number
  maxFeedbackRounds: number
  clientPriceUsd?: number
  creditBudgetCap?: number
  customerLabel?: string
  brandProfileSnapshot: BrandProfileSnapshot
  turns: IntakeMessageTurn[]
  extractedCharacters?: IntakeExtractedCharacter[]
  resonatingBeats?: IntakeResonatingBeat[]
  completenessChecklist?: IntakeCompletenessChecklist
  readyToComplete?: boolean
  completedAt?: string
  resultProjectId?: string
  publicCreditsSpentToday?: number
  publicCreditsDayKey?: string
}

function sanitizeIndividualCharacterList(rawList: unknown): string[] {
  if (!Array.isArray(rawList)) return []
  const out: string[] = []
  for (const item of rawList) {
    const rawStr = typeof item === 'string' ? item.trim() : String((item as any)?.name || '').trim()
    if (!rawStr) continue
    const split = splitCompoundIndividualNames(rawStr)
    for (const single of split) {
      if (!single || isCollectiveOrGroupCharacterName(single)) continue
      if (!out.some((prev) => prev.toLowerCase() === single.toLowerCase())) {
        out.push(single)
      }
    }
  }
  return out
}

function sanitizeExtractedCharacters(rawChars: unknown): IntakeExtractedCharacter[] {
  if (!Array.isArray(rawChars)) return []
  const cleaned: IntakeExtractedCharacter[] = []
  rawChars.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return
    const obj = item as Record<string, unknown>
    const rawName = String(obj.name || '').trim()
    if (!rawName) return
    const split = splitCompoundIndividualNames(rawName)
    const role = String(obj.role || 'Key Subject').trim().slice(0, 120)
    const impact = String(obj.impact || obj.description || '').trim().slice(0, 280)
    const eraOrAge = String(obj.eraOrAge || obj.age || '').trim().slice(0, 60)

    for (const single of split) {
      if (!single || isCollectiveOrGroupCharacterName(single)) continue
      const existingIdx = cleaned.findIndex(
        (c) => c.name.toLowerCase() === single.toLowerCase()
      )
      if (existingIdx >= 0) {
        if (role && (!cleaned[existingIdx].role || cleaned[existingIdx].role === 'Key Subject')) {
          cleaned[existingIdx].role = role
        }
        if (impact && !cleaned[existingIdx].impact) {
          cleaned[existingIdx].impact = impact
        }
        continue
      }
      cleaned.push({
        id: String(obj.id || `char-${idx + 1}-${cleaned.length + 1}`),
        name: single,
        ...(eraOrAge ? { eraOrAge } : {}),
        role: role || 'Key Subject',
        impact,
      })
    }
  })
  return cleaned.slice(0, 16)
}

function sanitizeResonatingBeats(rawBeats: unknown): IntakeResonatingBeat[] {
  if (!Array.isArray(rawBeats)) return []
  const cleaned: IntakeResonatingBeat[] = []
  rawBeats.forEach((b, idx) => {
    if (!b || typeof b !== 'object') return
    const obj = b as Record<string, unknown>
    const title = String(obj.title || '').trim()
    const summary = String(obj.summary || obj.synopsis || '').trim()
    if (!title && !summary) return
    const eraOrAge = String(obj.eraOrAge || '').trim()
    const impact = String(obj.impact || obj.intent || '').trim()
    const settingHint = String(obj.settingHint || '').trim()
    const deliveryFormatHint =
      obj.deliveryFormatHint === 'ai_reenactment' || obj.deliveryFormatHint === 'archival_photo'
        ? obj.deliveryFormatHint
        : undefined
    const keyCharacters = sanitizeIndividualCharacterList(
      obj.keyCharacters ?? obj.characters
    )
    cleaned.push({
      id: String(obj.id || `beat-${idx + 1}`),
      title: title || `Beat ${idx + 1}`,
      ...(eraOrAge ? { eraOrAge: eraOrAge.slice(0, 80) } : {}),
      summary: summary.slice(0, 360),
      ...(impact ? { impact: impact.slice(0, 260) } : {}),
      keyCharacters,
      ...(settingHint ? { settingHint: settingHint.slice(0, 120) } : {}),
      ...(deliveryFormatHint ? { deliveryFormatHint } : {}),
    })
  })
  return cleaned.slice(0, 8)
}

function deriveCompletenessChecklist(
  rawChecklist: unknown,
  visionConfirmed: boolean,
  characters: IntakeExtractedCharacter[],
  beats: IntakeResonatingBeat[]
): IntakeCompletenessChecklist {
  const obj = rawChecklist && typeof rawChecklist === 'object'
    ? (rawChecklist as Record<string, unknown>)
    : {}

  const charsWithDepth = characters.filter(
    (c) => Boolean(c.name && c.role && c.impact && c.impact.length >= 8)
  )
  const beatsWithImpact = beats.filter(
    (b) => Boolean(b.summary && b.summary.length >= 15 && b.impact && b.impact.length >= 8)
  )

  const charactersComplete =
    typeof obj.charactersComplete === 'boolean'
      ? obj.charactersComplete
      : charsWithDepth.length >= 1
  const beatsComplete =
    typeof obj.beatsComplete === 'boolean'
      ? obj.beatsComplete
      : beats.length >= 3 && beatsWithImpact.length >= 2
  const closingImpactComplete =
    typeof obj.closingImpactComplete === 'boolean'
      ? obj.closingImpactComplete
      : beats.length >= 4

  const missingGaps = Array.isArray(obj.missingGaps)
    ? obj.missingGaps
        .map((g) => String(g || '').trim())
        .filter(Boolean)
        .slice(0, 5)
    : []

  let score = Number(obj.completenessScore)
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    score =
      (visionConfirmed ? 25 : 10) +
      Math.min(25, characters.length * 10 + charsWithDepth.length * 5) +
      Math.min(35, beats.length * 8 + beatsWithImpact.length * 4) +
      (closingImpactComplete ? 15 : 0)
  }

  return {
    visionConfirmed,
    charactersComplete,
    beatsComplete,
    closingImpactComplete,
    completenessScore: Math.min(100, Math.max(0, Math.round(score))),
    missingGaps,
  }
}

function deriveFallbackResonatingBeats(
  turns: IntakeMessageTurn[],
  fallbackProtagonist?: string
): IntakeResonatingBeat[] {
  const customerMessages = turns
    .filter((t) => t.role === 'customer' && t.content.trim().length > 0)
    .map((t) => t.content.trim())
  if (customerMessages.length === 0) return []

  const chunks: string[] = []
  for (const msg of customerMessages) {
    const paragraphs = msg
      .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 20)
    if (paragraphs.length >= 2 && customerMessages.length === 1) {
      chunks.push(...paragraphs.slice(0, 5))
    } else {
      chunks.push(msg)
    }
  }

  const fallbackLead =
    fallbackProtagonist && !isCollectiveOrGroupCharacterName(fallbackProtagonist)
      ? fallbackProtagonist.trim()
      : ''

  return chunks.slice(0, 6).map((chunk, idx) => {
    const ageMatch = chunk.match(/\b(?:age[d]?\s*(\d{1,2})|(\d{1,2})[-\s]*years?[-\s]*old)\b/i)
    const yearMatch = chunk.match(/\b((?:19|20)\d{2}s?)\b/)
    const ageVal = ageMatch ? Number(ageMatch[1] || ageMatch[2]) : null
    const eraParts = [
      yearMatch ? yearMatch[1] : '',
      ageVal ? `Age ${ageVal}` : '',
    ].filter(Boolean)
    const leadWithAge =
      fallbackLead && ageVal ? `${fallbackLead} (Age ${ageVal})` : fallbackLead

    return {
      id: `beat-${idx + 1}`,
      title: `Story Beat ${idx + 1}`,
      ...(eraParts.length > 0 ? { eraOrAge: eraParts.join(' — ') } : {}),
      summary: chunk.slice(0, 240),
      keyCharacters: leadWithAge ? [leadWithAge] : [],
    }
  })
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
    16,
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
    phase: 'vision_clarification',
    maxVisionRevisions: DEFAULT_MAX_VISION_REVISIONS,
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

export async function clarifyCustomerIntakeVision(input: {
  token: string
  message: string
  locale?: string
}): Promise<
  | {
      ok: true
      phase: IntakePhase
      visionProposal: IntakeVisionProposal
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

  const consent = await getLatestCustomerConsent(session.id)
  if (!consent) {
    return {
      ok: false,
      status: 403,
      error: 'CONSENT_REQUIRED: Customer consent attestation must be accepted before clarifying vision',
    }
  }

  const trimmed = (input.message || '').trim()
  if (!trimmed) {
    return { ok: false, status: 400, error: 'Please share your vision for this project' }
  }

  const quarantine = evaluateCustomerTextQuarantine(trimmed)
  if (quarantine.status === 'flagged') {
    return {
      ok: false,
      status: 422,
      error: quarantine.reason || 'Input flagged by safety filter. Please rephrase your response.',
    }
  }

  const maxRevisions = Math.max(1, Number(payload.maxVisionRevisions || DEFAULT_MAX_VISION_REVISIONS))
  const prevProposal = payload.visionProposal
  const currentRevisionCount = Number(prevProposal?.revisionCount || 0)

  if (currentRevisionCount >= maxRevisions) {
    return {
      ok: false,
      status: 409,
      error: 'VISION_REVISION_LIMIT: Vision clarification passes complete. Please click Confirm Vision to begin your interview.',
    }
  }

  const turnCreditCost = Math.max(1, TEXT_CREDITS.GEMINI_FLASH || 2)
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

  const customerVisionTurn: IntakeMessageTurn = {
    role: 'customer',
    content: trimmed.slice(0, 8000),
    createdAt: new Date().toISOString(),
  }

  const priorTurns = Array.isArray(prevProposal?.turns) ? prevProposal.turns : []
  const nextVisionTurns = [...priorTurns, customerVisionTurn]
  const nextRevision = currentRevisionCount + 1
  const playbook = INTAKE_PLAYBOOKS[payload.vertical]

  let clarifiedVision = prevProposal?.clarifiedVision
    ? `${prevProposal.clarifiedVision} ${trimmed}`.slice(0, 1200)
    : trimmed.slice(0, 1200)
  let intendedImpact =
    prevProposal?.intendedImpact ||
    `Deliver a resonant ${playbook.genre.toLowerCase()} experience for ${consent.customer_name}.`
  let targetAudience = prevProposal?.targetAudience || 'Family, clients, and invited viewers'
  let toneAndStyle = prevProposal?.toneAndStyle || playbook.tone
  let deliverableScope =
    prevProposal?.deliverableScope || `~${playbook.defaultDurationMinutes} min production`
  let assistantMessage =
    "Here is a structured summary of your project vision. Confirm it if it captures your goal, or share any adjustments."
  let readyToConfirm = nextRevision >= maxRevisions

  try {
    const prompt = buildClarifyIntakeVisionPrompt({
      vertical: payload.vertical,
      locale: activeLocale,
      brandName: payload.brandProfileSnapshot.brandName,
      visionTurns: nextVisionTurns,
      currentProposal: prevProposal,
      revisionNumber: nextRevision,
      maxRevisions,
    })

    const llmRes = await generateText(prompt, {
      model: getGeminiProductModel('blueprint'),
      temperature: 0.35,
      maxOutputTokens: 1200,
      thinkingLevel: 'low',
      responseMimeType: 'application/json',
      timeoutMs: 25_000,
      maxRetries: 1,
    })

    const parsed = safeParseJsonFromText(llmRes.text || '{}') as Record<string, unknown>
    if (typeof parsed.clarifiedVision === 'string' && parsed.clarifiedVision.trim()) {
      clarifiedVision = parsed.clarifiedVision.trim().slice(0, 1400)
    }
    if (typeof parsed.intendedImpact === 'string' && parsed.intendedImpact.trim()) {
      intendedImpact = parsed.intendedImpact.trim().slice(0, 400)
    }
    if (typeof parsed.targetAudience === 'string' && parsed.targetAudience.trim()) {
      targetAudience = parsed.targetAudience.trim().slice(0, 300)
    }
    if (typeof parsed.toneAndStyle === 'string' && parsed.toneAndStyle.trim()) {
      toneAndStyle = parsed.toneAndStyle.trim().slice(0, 300)
    }
    if (typeof parsed.deliverableScope === 'string' && parsed.deliverableScope.trim()) {
      deliverableScope = parsed.deliverableScope.trim().slice(0, 200)
    }
    if (typeof parsed.assistantMessage === 'string' && parsed.assistantMessage.trim()) {
      assistantMessage = parsed.assistantMessage.trim().slice(0, 600)
    }
    if (typeof parsed.readyToConfirm === 'boolean') {
      readyToConfirm = nextRevision >= maxRevisions ? true : parsed.readyToConfirm
    }
  } catch (err) {
    console.warn('[intakeService] Vision clarification fallback triggered:', err)
  }

  const assistantVisionTurn: IntakeMessageTurn = {
    role: 'assistant',
    content: assistantMessage,
    createdAt: new Date().toISOString(),
  }

  const visionProposal: IntakeVisionProposal = {
    rawInput: prevProposal?.rawInput
      ? `${prevProposal.rawInput}\n${trimmed}`.slice(0, 10000)
      : trimmed.slice(0, 10000),
    clarifiedVision,
    intendedImpact,
    targetAudience,
    toneAndStyle,
    deliverableScope,
    assistantMessage,
    readyToConfirm,
    revisionCount: nextRevision,
    maxRevisions,
    confirmed: false,
    turns: [...nextVisionTurns, assistantVisionTurn],
  }

  const today = todayKeyUtc()
  const prevSpentToday =
    payload.publicCreditsDayKey === today ? Number(payload.publicCreditsSpentToday || 0) : 0

  const updatedPayload: IntakeSessionPayload = {
    ...payload,
    locale: activeLocale,
    phase: 'vision_clarification',
    visionProposal,
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
        operation: 'client_intake_vision_clarify',
        vertical: payload.vertical,
      }
    )
  } catch (chargeErr) {
    console.warn('[intakeService] Failed to charge vision clarify credits:', chargeErr)
  }

  return {
    ok: true,
    phase: 'vision_clarification',
    visionProposal,
  }
}

export async function confirmCustomerIntakeVision(input: {
  token: string
  locale?: string
}): Promise<
  | {
      ok: true
      phase: IntakePhase
      visionProposal: IntakeVisionProposal
      turns: IntakeMessageTurn[]
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

  const consent = await getLatestCustomerConsent(session.id)
  if (!consent) {
    return {
      ok: false,
      status: 403,
      error: 'CONSENT_REQUIRED: Customer consent attestation is required',
    }
  }

  if (!payload.visionProposal?.clarifiedVision) {
    return {
      ok: false,
      status: 400,
      error: 'Please clarify your project vision before confirming',
    }
  }

  const activeLocale = input.locale
    ? resolveClientPortalLocale(input.locale)
    : payload.locale

  const nowIso = new Date().toISOString()
  const confirmedVision: IntakeVisionProposal = {
    ...payload.visionProposal,
    confirmed: true,
    confirmedAt: nowIso,
  }

  let nextTurns = Array.isArray(payload.turns) ? [...payload.turns] : []

  // When transitioning into Phase 2 with zero Q&A turns used yet, tailor the opening interview question to the Confirmed Vision!
  if (payload.customerTurnsUsed === 0) {
    const playbook = INTAKE_PLAYBOOKS[payload.vertical]
    let openingQuestion =
      playbook.welcomeByLocale[activeLocale] || playbook.welcomeByLocale.en
    try {
      const kickoffPrompt = buildVisionConfirmedKickoffPrompt({
        vertical: payload.vertical,
        locale: activeLocale,
        brandName: payload.brandProfileSnapshot.brandName,
        confirmedVision,
      })
      const llmRes = await generateText(kickoffPrompt, {
        model: getGeminiProductModel('blueprint'),
        temperature: 0.4,
        maxOutputTokens: 500,
        thinkingLevel: 'low',
        responseMimeType: 'application/json',
        timeoutMs: 20_000,
        maxRetries: 1,
      })
      const parsed = safeParseJsonFromText(llmRes.text || '{}') as {
        openingQuestion?: string
      }
      if (typeof parsed.openingQuestion === 'string' && parsed.openingQuestion.trim()) {
        openingQuestion = parsed.openingQuestion.trim().slice(0, 700)
      }
    } catch {
      /* keep localized playbook greeting */
    }

    nextTurns = [
      {
        role: 'assistant',
        content: openingQuestion,
        createdAt: nowIso,
      },
    ]
  }

  const updatedPayload: IntakeSessionPayload = {
    ...payload,
    locale: activeLocale,
    phase: 'structured_interview',
    visionProposal: confirmedVision,
    turns: nextTurns,
  }

  await session.update({
    payload: updatedPayload as unknown as Record<string, unknown>,
  })

  return {
    ok: true,
    phase: 'structured_interview',
    visionProposal: confirmedVision,
    turns: nextTurns,
  }
}

export async function reopenCustomerIntakeVision(input: {
  token: string
}): Promise<
  | {
      ok: true
      phase: IntakePhase
      visionProposal: IntakeVisionProposal | undefined
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

  const nextVision = payload.visionProposal
    ? { ...payload.visionProposal, confirmed: false }
    : undefined

  const updatedPayload: IntakeSessionPayload = {
    ...payload,
    phase: 'vision_clarification',
    visionProposal: nextVision,
  }

  await session.update({
    payload: updatedPayload as unknown as Record<string, unknown>,
  })

  return {
    ok: true,
    phase: 'vision_clarification',
    visionProposal: nextVision,
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
      extractedCharacters: IntakeExtractedCharacter[]
      resonatingBeats: IntakeResonatingBeat[]
      completenessChecklist: IntakeCompletenessChecklist
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
    content: trimmed.slice(0, 12000),
    createdAt: new Date().toISOString(),
  }

  const nextTurns = [...payload.turns, customerTurn]
  const nextCount = payload.customerTurnsUsed + 1
  const playbook = INTAKE_PLAYBOOKS[payload.vertical]

  let assistantReply = ''
  let extractedCharacters: IntakeExtractedCharacter[] = Array.isArray(payload.extractedCharacters)
    ? payload.extractedCharacters
    : []
  let resonatingBeats: IntakeResonatingBeat[] = Array.isArray(payload.resonatingBeats)
    ? payload.resonatingBeats
    : []
  let rawChecklist: unknown = payload.completenessChecklist
  let readyToComplete = nextCount >= payload.maxCustomerTurns

  try {
    const prompt = buildNextIntakeQuestionPrompt({
      vertical: payload.vertical,
      locale: activeLocale,
      brandName: payload.brandProfileSnapshot.brandName,
      turns: nextTurns,
      customerTurnNumber: nextCount,
      maxCustomerTurns: payload.maxCustomerTurns,
      confirmedVision: payload.visionProposal?.confirmed ? payload.visionProposal : null,
      existingCharacters: extractedCharacters,
      existingBeats: resonatingBeats,
    })

    const llmRes = await generateText(prompt, {
      model: getGeminiProductModel('blueprint'),
      temperature: 0.4,
      maxOutputTokens: 2400,
      thinkingLevel: 'low',
      responseMimeType: 'application/json',
      timeoutMs: 30_000,
      maxRetries: 1,
    })

    const parsed = safeParseJsonFromText(llmRes.text || '{}') as {
      reply?: string
      extractedCharacters?: unknown
      resonatingBeats?: unknown
      completenessChecklist?: unknown
      readyToComplete?: boolean
    }
    if (typeof parsed.reply === 'string' && parsed.reply.trim()) {
      assistantReply = parsed.reply.trim()
    }
    const sanitizedChars = sanitizeExtractedCharacters(parsed.extractedCharacters)
    if (sanitizedChars.length > 0) {
      extractedCharacters = sanitizedChars
    }
    const sanitizedBeats = sanitizeResonatingBeats(parsed.resonatingBeats)
    if (sanitizedBeats.length > 0) {
      resonatingBeats = sanitizedBeats
    }
    if (parsed.completenessChecklist) {
      rawChecklist = parsed.completenessChecklist
    }
    if (typeof parsed.readyToComplete === 'boolean') {
      readyToComplete = readyToComplete || parsed.readyToComplete
    }
  } catch (err) {
    console.warn('[intakeService] Falling back to milestone question:', err)
  }

  if (resonatingBeats.length === 0) {
    resonatingBeats = deriveFallbackResonatingBeats(
      nextTurns,
      payload.customerLabel || consent.customer_name
    )
  }

  // Ensure any keyCharacters mentioned in beats also exist in extractedCharacters so UI & synthesis stay unified
  if (resonatingBeats.length > 0) {
    const knownNames = new Set(extractedCharacters.map((c) => c.name.toLowerCase()))
    for (const beat of resonatingBeats) {
      for (const person of beat.keyCharacters || []) {
        if (!knownNames.has(person.toLowerCase())) {
          knownNames.add(person.toLowerCase())
          extractedCharacters.push({
            id: `char-auto-${extractedCharacters.length + 1}`,
            name: person,
            ...(beat.eraOrAge ? { eraOrAge: beat.eraOrAge } : {}),
            role: extractedCharacters.length === 0 ? 'Protagonist' : 'Featured Individual',
            impact: beat.impact || beat.summary || '',
          })
        }
      }
    }
  }

  const completenessChecklist = deriveCompletenessChecklist(
    rawChecklist,
    Boolean(payload.visionProposal?.confirmed),
    extractedCharacters,
    resonatingBeats
  )

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
    phase: 'structured_interview',
    customerTurnsUsed: nextCount,
    turns: finalTurns,
    extractedCharacters,
    resonatingBeats,
    completenessChecklist,
    readyToComplete,
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
    extractedCharacters,
    resonatingBeats,
    completenessChecklist,
    customerTurnsUsed: nextCount,
    maxCustomerTurns: payload.maxCustomerTurns,
    readyToComplete,
  }
}

function buildFallbackBlueprint(
  vertical: IntakeVerticalId,
  customerName: string,
  turns: IntakeMessageTurn[],
  resonatingBeats?: IntakeResonatingBeat[],
  confirmedVision?: IntakeVisionProposal | null,
  extractedCharacters?: IntakeExtractedCharacter[]
): ExtractedBlueprintFromIntake {
  const playbook = INTAKE_PLAYBOOKS[vertical]
  const customerAnswers = turns
    .filter((t) => t.role === 'customer')
    .map((t) => t.content)
  const combined = [
    confirmedVision?.clarifiedVision || '',
    ...customerAnswers,
  ]
    .filter(Boolean)
    .join(' ')
  const fallbackBeats =
    Array.isArray(resonatingBeats) && resonatingBeats.length > 0
      ? resonatingBeats.map((rb, idx) => ({
          title: rb.title || `Chapter ${idx + 1}`,
          ...(rb.eraOrAge ? { eraOrAge: rb.eraOrAge } : {}),
          ...(rb.keyCharacters?.length ? { characters: rb.keyCharacters } : {}),
          intent: rb.impact || 'Resonating life chapter',
          ...(rb.impact ? { impact: rb.impact } : {}),
          synopsis: rb.summary || customerAnswers[idx]?.slice(0, 400) || '',
          minutes: Number(
            (playbook.defaultDurationMinutes / Math.max(1, resonatingBeats.length)).toFixed(1)
          ),
          ...(rb.settingHint ? { settingHint: rb.settingHint } : {}),
          deliveryFormat: (rb.deliveryFormatHint ||
            (idx % 3 === 0 ? 'ai_reenactment' : 'archival_photo')) as
            | 'archival_photo'
            | 'ai_reenactment',
        }))
      : customerAnswers.slice(0, 6).map((ans, idx) => ({
          title: `Chapter ${idx + 1}`,
          characters: [customerName],
          intent: 'Capture client milestone',
          synopsis: ans.slice(0, 400),
          minutes: Number(
            (
              playbook.defaultDurationMinutes /
              Math.max(1, Math.min(6, customerAnswers.length))
            ).toFixed(1)
          ),
          deliveryFormat: (idx % 3 === 0 ? 'ai_reenactment' : 'archival_photo') as
            | 'archival_photo'
            | 'ai_reenactment',
        }))

  const fallbackChars =
    Array.isArray(extractedCharacters) && extractedCharacters.length > 0
      ? extractedCharacters.map((ec) => ({
          name: ec.name,
          role: ec.role || 'protagonist',
          ...(ec.impact ? { impact: ec.impact } : {}),
          ...(ec.eraOrAge ? { age: ec.eraOrAge } : {}),
          description: ec.impact || `${ec.role || 'Featured subject'} in client production`,
          needsClientPhoto: true,
        }))
      : [
          {
            name: customerName,
            role: 'protagonist',
            description:
              combined.slice(0, 400) ||
              'Primary subject described during client onboarding interview',
            needsClientPhoto: true,
          },
        ]

  return {
    title: `${playbook.defaultTitlePrefix}: ${customerName}`,
    logline:
      confirmedVision?.intendedImpact?.slice(0, 220) ||
      customerAnswers[0]?.slice(0, 220) ||
      `A custom ${playbook.genre.toLowerCase()} created for ${customerName}.`,
    synopsis: combined.slice(0, 1800) || `Client story intake completed for ${customerName}.`,
    genre: playbook.genre,
    tone_description: confirmedVision?.toneAndStyle || playbook.tone,
    visual_style:
      confirmedVision?.toneAndStyle ||
      'Warm documentary realism with archival photography and cinematic B-roll',
    target_audience:
      confirmedVision?.targetAudience || 'Family, clients, and invited viewers',
    beats: fallbackBeats,
    character_descriptions: fallbackChars,
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
  const confirmedVision = payload.visionProposal?.clarifiedVision
    ? payload.visionProposal
    : null

  try {
    const prompt = buildIntakeBlueprintSynthesisPrompt({
      vertical: payload.vertical,
      locale: payload.locale,
      customerName: consent.customer_name,
      turns: payload.turns,
      confirmedVision,
      extractedCharacters: payload.extractedCharacters,
      resonatingBeats: payload.resonatingBeats,
    })

    const llmRes = await generateText(prompt, {
      model: getGeminiProductModel('blueprint'),
      temperature: 0.3,
      maxOutputTokens: 4096,
      thinkingLevel: 'low',
      responseMimeType: 'application/json',
      timeoutMs: 45_000,
      maxRetries: 1,
    })

    const parsed = safeParseJsonFromText(llmRes.text || '{}') as Partial<ExtractedBlueprintFromIntake>
    if (parsed.title && parsed.synopsis) {
      const parsedAny = parsed as Record<string, unknown>
      extracted = {
        title: String(parsed.title).slice(0, 200),
        logline: String(parsed.logline || '').slice(0, 500),
        synopsis: String(parsed.synopsis).slice(0, 5000),
        genre: String(parsed.genre || INTAKE_PLAYBOOKS[payload.vertical].genre),
        tone_description: String(
          parsed.tone_description ||
            (typeof parsedAny.tone === 'string' ? parsedAny.tone : '') ||
            confirmedVision?.toneAndStyle ||
            INTAKE_PLAYBOOKS[payload.vertical].tone
        ),
        visual_style: String(
          parsed.visual_style ||
            (typeof parsedAny.visualStyle === 'string' ? parsedAny.visualStyle : '') ||
            confirmedVision?.toneAndStyle ||
            'Warm cinematic documentary'
        ),
        target_audience: String(
          parsed.target_audience ||
            confirmedVision?.targetAudience ||
            'Client & Family'
        ),
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
    extracted = buildFallbackBlueprint(
      payload.vertical,
      consent.customer_name,
      payload.turns,
      payload.resonatingBeats,
      confirmedVision,
      payload.extractedCharacters
    )
  }

  // Enforce individual-only cast, split multi-decade age spans into separate `(Age NN)` characters,
  // and highlight era-matched individual characters on every beat!
  const sanitizedIntake = sanitizeBlueprintCharactersAndBeats({
    characters: extracted.character_descriptions,
    beats: extracted.beats,
  })
  extracted = {
    ...extracted,
    character_descriptions: sanitizedIntake.characters.map((c) => ({
      ...c,
      needsClientPhoto: c.needsClientPhoto !== false,
    })),
    beats: sanitizedIntake.beats,
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
    ...(confirmedVision?.clarifiedVision
      ? {
          visionStatement: confirmedVision.clarifiedVision,
          intendedImpact: confirmedVision.intendedImpact,
        }
      : {}),
    beats: extracted.beats,
    character_descriptions: extracted.character_descriptions.map((c) => ({
      name: c.name,
      role: c.role,
      ...((c as { impact?: string }).impact
        ? { impact: String((c as { impact?: string }).impact) }
        : {}),
      ...(c.age ? { age: String(c.age) } : {}),
      ...(c.ethnicity ? { ethnicity: String(c.ethnicity) } : {}),
      ...(c.appearance ? { appearance: String(c.appearance) } : {}),
      ...(c.samePersonGroupId ? { samePersonGroupId: String(c.samePersonGroupId) } : {}),
      description: c.description,
      needsClientPhoto: c.needsClientPhoto !== false,
    })),
    scene_descriptions: extracted.locations.map((l) => ({
      name: l.name,
      description: l.description,
      needsClientPhoto: l.needsClientPhoto !== false,
    })),
    prop_descriptions: extracted.props.map((p) => ({
      name: p.name,
      description: p.description,
      needsClientPhoto: p.needsClientPhoto !== false,
    })),
  }

  const continuityChecklist = {
    characters: extracted.character_descriptions.map((c, idx) => ({
      slotId: `char-${idx + 1}`,
      slotType: 'character' as const,
      name: c.name,
      role: c.role,
      ...((c as { impact?: string }).impact
        ? { impact: String((c as { impact?: string }).impact) }
        : {}),
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

  const visionHeaderText = confirmedVision?.clarifiedVision
    ? `CONFIRMED CLIENT VISION:\n${confirmedVision.clarifiedVision}\nIntended Impact: ${confirmedVision.intendedImpact}\nAudience: ${confirmedVision.targetAudience}\nTone & Style: ${confirmedVision.toneAndStyle}\n\n`
    : ''

  const transcriptPrimeText =
    visionHeaderText +
    payload.turns
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
        ...(c.age ? { age: String(c.age), ageRange: String(c.age) } : {}),
        ...(c.ethnicity ? { ethnicity: String(c.ethnicity) } : {}),
        ...(c.appearance
          ? { appearance: String(c.appearance), appearanceDescription: String(c.appearance) }
          : {}),
        ...(c.samePersonGroupId ? { samePersonGroupId: String(c.samePersonGroupId) } : {}),
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
      ...(confirmedVision
        ? {
            confirmedVision: {
              clarifiedVision: confirmedVision.clarifiedVision,
              intendedImpact: confirmedVision.intendedImpact,
              targetAudience: confirmedVision.targetAudience,
              toneAndStyle: confirmedVision.toneAndStyle,
              deliverableScope: confirmedVision.deliverableScope,
              confirmedAt: confirmedVision.confirmedAt,
            },
          }
        : {}),
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
        phase: 'completed',
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
