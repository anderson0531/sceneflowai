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
  getLocalizedVisionFallbackQuestion,
  inferNarrativeModeFromVision,
  INTAKE_PLAYBOOKS,
  isValidNarrativeMode,
  parseRuntimeMinutesFromScope,
  type ExtractedBlueprintFromIntake,
  type IntakeCompletenessChecklist,
  type IntakeExtractedCharacter,
  type IntakeMessageTurn,
  type IntakeNarrativeMode,
  type IntakePhase,
  type IntakeResonatingBeat,
  type IntakeVerticalId,
  type IntakeVisionProposal,
} from './intakePlaybooks'
import {
  extractSamePersonAgeStage,
  formatAgeVariantCharacterName,
  isCollectiveOrGroupCharacterName,
  sanitizeBlueprintCharactersAndBeats,
  splitCompoundIndividualNames,
} from '@/lib/character/ageStageContinuity'
import {
  DEFAULT_CLIENT_BLUEPRINT_DEPOSIT_USD,
  DEFAULT_MAX_AUTOMATED_AR_ITERATIONS,
  DEFAULT_MAX_AUTOMATED_BLUEPRINT_REVISIONS,
  provisionAutomatedBlueprintShareFromIntake,
  sendAutomatedClientPortalEmail,
} from './automatedClientBlueprint'

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
  maxBlueprintRevisions?: number
  maxArIterations?: number
  blueprintDepositUsd?: number
  autoPublishBlueprintShare?: boolean
  customerEmail?: string
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
  blueprintShareToken?: string
  blueprintShareUrl?: string
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
      const candidateStage = extractSamePersonAgeStage(single)
      let candidateName = single
      const existingIdx = cleaned.findIndex(
        (c) => c.name.toLowerCase() === candidateName.toLowerCase()
      )
      if (existingIdx >= 0) {
        const prev = cleaned[existingIdx]!
        const prevEra = (prev.eraOrAge || '').trim()
        // If two entries share a bare name with distinct `eraOrAge` life stages, qualify both rather than dropping the second!
        if (
          !candidateStage.isAgeVariant &&
          eraOrAge &&
          prevEra &&
          eraOrAge.toLowerCase() !== prevEra.toLowerCase()
        ) {
          prev.name = formatAgeVariantCharacterName(prev.name, prevEra)
          candidateName = formatAgeVariantCharacterName(single, eraOrAge)
        } else {
          if (role && (!prev.role || prev.role === 'Key Subject')) {
            prev.role = role
          }
          if (impact && !prev.impact) {
            prev.impact = impact
          }
          continue
        }
      }
      if (cleaned.some((c) => c.name.toLowerCase() === candidateName.toLowerCase())) {
        continue
      }
      cleaned.push({
        id: String(obj.id || `char-${idx + 1}-${cleaned.length + 1}`),
        name: candidateName,
        ...(eraOrAge ? { eraOrAge } : {}),
        role: role || 'Key Subject',
        impact,
      })
    }
  })
  return cleaned.slice(0, 24)
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
  maxBlueprintRevisions?: number
  maxArIterations?: number
  blueprintDepositUsd?: number
  autoPublishBlueprintShare?: boolean
  customerEmail?: string
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
          locale,
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

    // Auto-route newly created client intake project to the workspace's locale PM
    const { autoAssignProjectByLocale } = await import('@/lib/producer/workspaceAccess')
    await autoAssignProjectByLocale({
      ownerUserId: input.ownerUserId,
      projectId: targetProject.id,
      locale,
    })
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
    maxBlueprintRevisions: Math.min(
      8,
      Math.max(1, Math.round(input.maxBlueprintRevisions ?? DEFAULT_MAX_AUTOMATED_BLUEPRINT_REVISIONS))
    ),
    maxArIterations: Math.min(
      5,
      Math.max(1, Math.round(input.maxArIterations ?? DEFAULT_MAX_AUTOMATED_AR_ITERATIONS))
    ),
    blueprintDepositUsd: input.blueprintDepositUsd ?? DEFAULT_CLIENT_BLUEPRINT_DEPOSIT_USD,
    autoPublishBlueprintShare: input.autoPublishBlueprintShare !== false,
    customerEmail: input.customerEmail?.trim() || undefined,
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

  if (input.customerEmail?.trim()) {
    await sendAutomatedClientPortalEmail({
      toEmail: input.customerEmail.trim(),
      customerName: input.customerLabel?.trim() || 'Client',
      brandName: brandSnapshot.brandName,
      subject: `${brandSnapshot.brandName} — Start Your Guided Storyboard Blueprint Intake`,
      heading: `Welcome to ${brandSnapshot.brandName}`,
      paragraphs: [
        `Your Storyboard Blueprint pass ($${input.blueprintDepositUsd ?? DEFAULT_CLIENT_BLUEPRINT_DEPOSIT_USD}) is active.`,
        `Click below to start your guided vision & story interview by voice or text. Within minutes of finishing, you will automatically receive your Illustrated & Narrated Storyboard Blueprint with up to ${payload.maxBlueprintRevisions} AI-guided iterations.`,
      ],
      ctaLabel: 'Start My Guided Story Intake',
      ctaUrl: hostedUrl,
    })
  }

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
  let inferredGenre = prevProposal?.inferredGenre || undefined
  let parsedNarrativeMode: IntakeNarrativeMode | undefined = prevProposal?.narrativeMode
  let intendedImpact =
    prevProposal?.intendedImpact ||
    `Deliver a resonant experience aligned with ${consent.customer_name}'s vision.`
  let targetAudience = prevProposal?.targetAudience || 'Target viewers for this production'
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
    if (typeof parsed.inferredGenre === 'string' && parsed.inferredGenre.trim()) {
      inferredGenre = parsed.inferredGenre.trim().slice(0, 120)
    }
    if (isValidNarrativeMode(parsed.narrativeMode)) {
      parsedNarrativeMode = parsed.narrativeMode
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

  const rawCombined = prevProposal?.rawInput
    ? `${prevProposal.rawInput}\n${trimmed}`.slice(0, 10000)
    : trimmed.slice(0, 10000)
  const resolvedNarrativeMode = inferNarrativeModeFromVision(
    {
      rawInput: rawCombined,
      clarifiedVision,
      inferredGenre,
      narrativeMode: parsedNarrativeMode,
      toneAndStyle,
    },
    payload.vertical
  )

  const visionProposal: IntakeVisionProposal = {
    rawInput: rawCombined,
    clarifiedVision,
    ...(inferredGenre ? { inferredGenre } : {}),
    narrativeMode: resolvedNarrativeMode,
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
    const narrativeMode = inferNarrativeModeFromVision(confirmedVision, payload.vertical)
    let openingQuestion = getLocalizedVisionFallbackQuestion(activeLocale, 0, narrativeMode)
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
        maxOutputTokens: 1200,
        thinkingLevel: 'minimal',
        thinkingBudget: 0,
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
      /* keep localized vision-driven fallback kickoff */
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
      maxOutputTokens: 6144,
      thinkingLevel: 'low',
      thinkingBudget: 512,
      responseMimeType: 'application/json',
      timeoutMs: 45_000,
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
    if (payload.visionProposal?.confirmed || payload.vertical === 'custom_production') {
      const narrativeMode = inferNarrativeModeFromVision(
        payload.visionProposal,
        payload.vertical
      )
      assistantReply = getLocalizedVisionFallbackQuestion(
        activeLocale,
        nextCount - 1,
        narrativeMode
      )
    } else {
      const fallbackIdx = Math.min(nextCount - 1, playbook.milestoneQuestions.length - 1)
      assistantReply = playbook.milestoneQuestions[fallbackIdx]
    }
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
  const narrativeMode = inferNarrativeModeFromVision(confirmedVision, vertical)
  const isFictional = narrativeMode === 'fictional_narrative'
  const fallbackGenre =
    confirmedVision?.inferredGenre ||
    (isFictional ? 'Cinematic Drama' : playbook.genre)
  const targetMinutes = parseRuntimeMinutesFromScope(
    confirmedVision?.deliverableScope,
    isFictional ? 5 : playbook.defaultDurationMinutes
  )
  const defaultNeedsPhoto = !isFictional
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
          intent: rb.impact || 'Core story beat',
          ...(rb.impact ? { impact: rb.impact } : {}),
          synopsis: rb.summary || customerAnswers[idx]?.slice(0, 400) || '',
          minutes: Number(
            (targetMinutes / Math.max(1, resonatingBeats.length)).toFixed(1)
          ),
          ...(rb.settingHint ? { settingHint: rb.settingHint } : {}),
          deliveryFormat: (rb.deliveryFormatHint ||
            (isFictional || idx % 3 === 0 ? 'ai_reenactment' : 'archival_photo')) as
            | 'archival_photo'
            | 'ai_reenactment',
        }))
      : customerAnswers.slice(0, 6).map((ans, idx) => ({
          title: `Chapter ${idx + 1}`,
          characters: [customerName],
          intent: 'Advance project vision',
          synopsis: ans.slice(0, 400),
          minutes: Number(
            (
              targetMinutes /
              Math.max(1, Math.min(6, customerAnswers.length))
            ).toFixed(1)
          ),
          deliveryFormat: (isFictional || idx % 3 === 0
            ? 'ai_reenactment'
            : 'archival_photo') as 'archival_photo' | 'ai_reenactment',
        }))

  const fallbackChars =
    Array.isArray(extractedCharacters) && extractedCharacters.length > 0
      ? extractedCharacters.map((ec) => ({
          name: ec.name,
          role: ec.role || 'protagonist',
          ...(ec.impact ? { impact: ec.impact } : {}),
          ...(ec.eraOrAge ? { age: ec.eraOrAge } : {}),
          description: ec.impact || `${ec.role || 'Featured character'} in production`,
          needsClientPhoto: defaultNeedsPhoto,
        }))
      : [
          {
            name: customerName,
            role: 'protagonist',
            description:
              combined.slice(0, 400) ||
              'Primary character/subject described during onboarding interview',
            needsClientPhoto: defaultNeedsPhoto,
          },
        ]

  return {
    title: `${playbook.defaultTitlePrefix}: ${customerName}`,
    logline:
      confirmedVision?.intendedImpact?.slice(0, 220) ||
      customerAnswers[0]?.slice(0, 220) ||
      `A custom ${fallbackGenre.toLowerCase()} created for ${customerName}.`,
    synopsis: combined.slice(0, 1800) || `Client intake completed for ${customerName}.`,
    genre: fallbackGenre,
    tone_description: confirmedVision?.toneAndStyle || playbook.tone,
    visual_style:
      confirmedVision?.toneAndStyle ||
      (isFictional
        ? 'Cinematic dramatic lighting and camera composition'
        : 'Warm documentary realism with archival photography and cinematic B-roll'),
    target_audience:
      confirmedVision?.targetAudience || 'Target audience for this production',
    beats: fallbackBeats,
    character_descriptions: fallbackChars,
    locations: [
      {
        name: 'Primary Featured Setting',
        description: 'Key location described in onboarding interview',
        needsClientPhoto: defaultNeedsPhoto,
      },
    ],
    props: [
      {
        name: 'Signature Story Prop or Detail',
        description: 'Key item highlighted during onboarding interview',
        needsClientPhoto: defaultNeedsPhoto,
      },
    ],
  }
}

/**
 * Defense-in-depth recovery when an LLM Blueprint synthesis response omits or truncates
 * characters, locations, or props that were already captured during the intake interview
 * or referenced inside `beats[]`.
 */
export function backfillTruncatedIntakeBlueprintAssets(input: {
  extracted: ExtractedBlueprintFromIntake
  interviewCharacters?: IntakeExtractedCharacter[]
  interviewBeats?: IntakeResonatingBeat[]
  defaultNeedsClientPhoto: boolean
}): ExtractedBlueprintFromIntake {
  const { extracted, interviewCharacters = [], interviewBeats = [], defaultNeedsClientPhoto } = input
  const nextChars = [...(Array.isArray(extracted.character_descriptions) ? extracted.character_descriptions : [])]
  const seenExact = new Set(nextChars.map((c) => String(c.name || '').trim().toLowerCase()).filter(Boolean))

  const getSiblingsByBase = (baseKey: string) =>
    nextChars.filter(
      (c) => extractSamePersonAgeStage(String(c.name || '')).baseName.trim().toLowerCase() === baseKey
    )

  const inferBeatPhotoNeed = (charName: string): boolean => {
    const lower = charName.toLowerCase()
    const matchingBeats = (extracted.beats || []).filter((b) =>
      Array.isArray(b.characters) && b.characters.some((bc) => String(bc || '').toLowerCase() === lower)
    )
    if (
      matchingBeats.length > 0 &&
      matchingBeats.every((b) => b.deliveryFormat === 'ai_reenactment')
    ) {
      return false
    }
    return defaultNeedsClientPhoto
  }

  const maybeRestoreCharacter = (candidate: {
    name: string
    role?: string
    impact?: string
    eraOrAge?: string
  }) => {
    for (const single of splitCompoundIndividualNames(candidate.name)) {
      if (!single || isCollectiveOrGroupCharacterName(single)) continue
      const lowerName = single.toLowerCase()
      if (seenExact.has(lowerName)) continue

      const stage = extractSamePersonAgeStage(single)
      const baseKey = stage.baseName.trim().toLowerCase()
      if (!baseKey) continue
      const siblings = getSiblingsByBase(baseKey)

      if (!stage.isAgeVariant) {
        // Bare name already represented by one or more `(Age NN)` cards in the cast
        if (siblings.length > 0) continue
      } else if (siblings.length > 0) {
        const alreadyCovered = siblings.some((sib) => {
          const sibStage = extractSamePersonAgeStage(String(sib.name || ''))
          if (
            stage.ageStageLabel &&
            sibStage.ageStageLabel &&
            stage.ageStageLabel.toLowerCase() === sibStage.ageStageLabel.toLowerCase()
          ) {
            return true
          }
          const sibMin =
            sibStage.numericAgeMin ??
            sibStage.numericAge ??
            (/^\d{1,3}$/.test(String(sib.age || '').trim()) ? Number(String(sib.age).trim()) : undefined)
          const sibMax = sibStage.numericAgeMax ?? sibMin
          if (stage.numericAge !== undefined && sibMin !== undefined && sibMax !== undefined) {
            if (stage.numericAge >= sibMin && stage.numericAge <= sibMax) return true
            return Math.min(Math.abs(stage.numericAge - sibMin), Math.abs(stage.numericAge - sibMax)) <= 6
          }
          return false
        })
        if (alreadyCovered) continue
      }

      const donor = siblings[0]
      seenExact.add(lowerName)
      nextChars.push({
        name: single,
        role: candidate.role || donor?.role || 'supporting',
        ...(candidate.impact ? { impact: candidate.impact } : {}),
        ...(stage.numericAge !== undefined
          ? { age: String(stage.numericAge) }
          : candidate.eraOrAge
            ? { age: candidate.eraOrAge }
            : {}),
        ...(donor?.ethnicity ? { ethnicity: donor.ethnicity } : {}),
        description:
          candidate.impact ||
          donor?.description ||
          `${candidate.role || 'Featured individual'} in the story.`,
        needsClientPhoto: inferBeatPhotoNeed(single),
      })
    }
  }

  for (const ic of interviewCharacters) {
    if (!ic?.name) continue
    maybeRestoreCharacter({
      name: ic.name,
      role: ic.role,
      impact: ic.impact,
      eraOrAge: ic.eraOrAge,
    })
  }

  for (const beat of extracted.beats || []) {
    for (const bc of beat.characters || []) {
      const nameStr = String(bc || '').trim()
      if (!nameStr) continue
      const interviewMatch = interviewCharacters.find(
        (ic) => ic.name.trim().toLowerCase() === nameStr.toLowerCase()
      )
      maybeRestoreCharacter({
        name: nameStr,
        role: interviewMatch?.role || 'supporting',
        impact: interviewMatch?.impact || beat.impact || beat.synopsis,
        eraOrAge: interviewMatch?.eraOrAge || beat.eraOrAge,
      })
    }
  }

  let nextLocations = Array.isArray(extracted.locations) ? [...extracted.locations] : []
  if (nextLocations.length === 0) {
    const seenLocs = new Set<string>()
    for (const hint of [
      ...(extracted.beats || []).map((b) => ({
        name: String(b.settingHint || '').trim(),
        desc: String(b.synopsis || '').trim(),
        aiOnly: b.deliveryFormat === 'ai_reenactment',
      })),
      ...interviewBeats.map((b) => ({
        name: String(b.settingHint || '').trim(),
        desc: String(b.summary || '').trim(),
        aiOnly: b.deliveryFormatHint === 'ai_reenactment',
      })),
    ]) {
      if (!hint.name) continue
      const key = hint.name.toLowerCase()
      if (seenLocs.has(key)) continue
      seenLocs.add(key)
      nextLocations.push({
        name: hint.name,
        description: hint.desc || `Featured story location (${hint.name}).`,
        needsClientPhoto: hint.aiOnly ? false : defaultNeedsClientPhoto,
      })
    }
  }

  return {
    ...extracted,
    character_descriptions: nextChars,
    locations: nextLocations,
  }
}

export async function completeClientIntakeToBlueprint(input: {
  token: string
  locale?: string
  origin?: string
}): Promise<
  | {
      ok: true
      projectId: string
      title: string
      extracted: ExtractedBlueprintFromIntake
      blueprintShareToken?: string
      blueprintShareUrl?: string
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

  const activeLocale = input.locale
    ? resolveClientPortalLocale(input.locale)
    : payload.locale

  const synthesisCreditCost = Math.max(5, (TEXT_CREDITS.GEMINI_PRO || 10))
  let extracted: ExtractedBlueprintFromIntake | null = null
  const confirmedVision = payload.visionProposal?.clarifiedVision
    ? payload.visionProposal
    : null
  const synthesisNarrativeMode = inferNarrativeModeFromVision(confirmedVision, payload.vertical)
  const isFictionalSynthesis = synthesisNarrativeMode === 'fictional_narrative'
  const resolveNeedsPhoto = (explicit?: boolean) =>
    isFictionalSynthesis ? explicit === true : explicit !== false

  try {
    const prompt = buildIntakeBlueprintSynthesisPrompt({
      vertical: payload.vertical,
      locale: activeLocale,
      customerName: consent.customer_name,
      turns: payload.turns,
      confirmedVision,
      extractedCharacters: payload.extractedCharacters,
      resonatingBeats: payload.resonatingBeats,
    })

    const llmRes = await generateText(prompt, {
      model: getGeminiProductModel('blueprint'),
      temperature: 0.3,
      maxOutputTokens: 16384,
      thinkingLevel: 'low',
      thinkingBudget: 512,
      responseMimeType: 'application/json',
      timeoutMs: 75_000,
      maxRetries: 1,
    })

    if (llmRes.finishReason && llmRes.finishReason !== 'STOP') {
      console.warn(
        `[intakeService] Blueprint synthesis finishReason=${llmRes.finishReason} (len=${(llmRes.text || '').length})`
      )
    }

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
  } else {
    extracted = backfillTruncatedIntakeBlueprintAssets({
      extracted,
      interviewCharacters: payload.extractedCharacters,
      interviewBeats: payload.resonatingBeats,
      defaultNeedsClientPhoto: !isFictionalSynthesis,
    })
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
      needsClientPhoto: resolveNeedsPhoto(c.needsClientPhoto),
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
      needsClientPhoto: resolveNeedsPhoto(c.needsClientPhoto),
    })),
    scene_descriptions: extracted.locations.map((l) => ({
      name: l.name,
      description: l.description,
      needsClientPhoto: resolveNeedsPhoto(l.needsClientPhoto),
    })),
    prop_descriptions: extracted.props.map((p) => ({
      name: p.name,
      description: p.description,
      needsClientPhoto: resolveNeedsPhoto(p.needsClientPhoto),
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
      needsClientPhoto: resolveNeedsPhoto(c.needsClientPhoto),
      approved: false,
    })),
    locations: extracted.locations.map((l, idx) => ({
      slotId: `loc-${idx + 1}`,
      slotType: 'location' as const,
      name: l.name,
      description: l.description,
      needsClientPhoto: resolveNeedsPhoto(l.needsClientPhoto),
      approved: false,
    })),
    props: extracted.props.map((p, idx) => ({
      slotId: `prop-${idx + 1}`,
      slotType: 'prop' as const,
      name: p.name,
      description: p.description,
      needsClientPhoto: resolveNeedsPhoto(p.needsClientPhoto),
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

  const targetProjectMinutes = parseRuntimeMinutesFromScope(
    confirmedVision?.deliverableScope,
    isFictionalSynthesis ? 5 : INTAKE_PLAYBOOKS[payload.vertical].defaultDurationMinutes
  )

  if (!targetProject) {
    targetProject = await Project.create({
      user_id: session.owner_user_id,
      title: extracted.title,
      description: extracted.logline,
      genre: extracted.genre,
      duration: Math.round(targetProjectMinutes * 60),
      status: 'in_progress',
      current_step: 'ideation',
      step_statuses: { ideation: 'in_progress' },
      metadata: {},
    } as any)
  }

  // Ensure locale-based PM auto-routing runs using the finalized client intake locale
  try {
    const { autoAssignProjectByLocale } = await import('@/lib/producer/workspaceAccess')
    await autoAssignProjectByLocale({
      ownerUserId: session.owner_user_id,
      projectId: targetProject.id,
      locale: activeLocale,
    })
  } catch (routeErr) {
    console.warn('[intakeService] Locale PM auto-routing skipped:', routeErr)
  }

  const prevMeta = ((targetProject.metadata || {}) as Record<string, unknown>)
  const prevOrder = ((prevMeta.clientOrder || {}) as Record<string, unknown>)

  let finalTreatmentVariant: Record<string, any> = filmTreatmentVariant
  let blueprintShareToken: string | undefined
  let blueprintShareUrl: string | undefined

  if (payload.autoPublishBlueprintShare !== false) {
    try {
      const provisioned = await provisionAutomatedBlueprintShareFromIntake({
        ownerUserId: session.owner_user_id,
        projectId: targetProject.id,
        variantId,
        treatment: filmTreatmentVariant,
        locale: activeLocale,
        customerName: consent.customer_name,
        customerEmail: consent.customer_email || payload.customerEmail,
        targetAudience: extracted.target_audience,
        brandProfileSnapshot: payload.brandProfileSnapshot,
        maxBlueprintRevisions:
          payload.maxBlueprintRevisions ?? DEFAULT_MAX_AUTOMATED_BLUEPRINT_REVISIONS,
        maxArIterations: payload.maxArIterations ?? DEFAULT_MAX_AUTOMATED_AR_ITERATIONS,
        blueprintDepositUsd:
          payload.blueprintDepositUsd ?? DEFAULT_CLIENT_BLUEPRINT_DEPOSIT_USD,
        origin: input.origin,
      })
      finalTreatmentVariant = provisioned.treatment
      blueprintShareToken = provisioned.shareToken
      blueprintShareUrl = provisioned.shareUrl
    } catch (provErr) {
      console.warn('[intakeService] Automated Blueprint Share provisioning warning:', provErr)
    }
  }

  const nextMeta: Record<string, unknown> = {
    ...prevMeta,
    storyLocale: activeLocale === 'zh-CN' ? 'zh' : activeLocale,
    blueprintPrimeInput: transcriptPrimeText,
    selectedVariantId: variantId,
    filmTreatmentVariant: finalTreatmentVariant,
    variants: [finalTreatmentVariant],
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
      locale: activeLocale,
      stage: blueprintShareToken ? 'blueprint_client_iteration' : 'blueprint_review_ready',
      actionState: blueprintShareToken ? 'waiting_on_client' : 'action_required',
      customerName: consent.customer_name,
      customerEmail: consent.customer_email,
      customerConsentId: consent.id,
      intakeCompletedAt: new Date().toISOString(),
      maxFeedbackRounds: payload.maxFeedbackRounds,
      maxBlueprintRevisions:
        payload.maxBlueprintRevisions ?? DEFAULT_MAX_AUTOMATED_BLUEPRINT_REVISIONS,
      maxArIterations: payload.maxArIterations ?? DEFAULT_MAX_AUTOMATED_AR_ITERATIONS,
      blueprintDepositUsd:
        payload.blueprintDepositUsd ?? DEFAULT_CLIENT_BLUEPRINT_DEPOSIT_USD,
      ...(blueprintShareToken ? { blueprintShareToken, blueprintShareUrl } : {}),
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
        ...(blueprintShareToken ? { blueprintShareToken, blueprintShareUrl } : {}),
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
    blueprintShareToken,
    blueprintShareUrl,
  }
}
