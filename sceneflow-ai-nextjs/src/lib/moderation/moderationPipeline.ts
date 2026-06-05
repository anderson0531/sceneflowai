/**
 * Stage-based Hive moderation orchestrator + unified ModerationReport.
 */

import { randomUUID } from 'crypto'
import {
  HiveModerationService,
  type HiveModerationResult,
} from '@/services/HiveModerationService'
import type { StageContentType } from '@/models/ModerationEvent'
import { isStageModerationEnabled, isPromptModerationEnabled } from './moderationFlags'
import {
  aggregateBlueprintInputText,
  aggregateBlueprintOutputText,
} from './blueprintText'

// =============================================================================
// TYPES
// =============================================================================

export type ModerationStage =
  | 'blueprint'
  | 'script'
  | 'character'
  | 'storyboard'
  | 'fal_video'

export type ModerationCheckName =
  | 'harmful_text'
  | 'harmful_visual'
  | 'copyright_text'
  | 'celebrity_recognition'
  | 'likeness_detection'
  | 'copyright_media'

export type ModerationSeverity = 'none' | 'warn' | 'block'

export interface ModerationCheckResult {
  check: ModerationCheckName
  provider: 'hive' | 'heuristic' | 'openai'
  allowed: boolean
  severity: ModerationSeverity
  categories: string[]
  score?: number
  details?: Record<string, unknown>
}

export interface ModerationReport {
  id: string
  stage: ModerationStage
  allowed: boolean
  action: 'allowed' | 'blocked' | 'warning'
  checks: ModerationCheckResult[]
  summary: string
  projectId?: string
  resourceId?: string
  createdAt: string
}

export interface StageModerationContext {
  userId: string
  projectId?: string
  resourceId?: string
  sceneId?: string
  segmentIndex?: number
  /** When true, run copyright_media on fal_video stage (expensive). */
  includeCopyrightMedia?: boolean
}

export interface RunStageModerationInput {
  stage: ModerationStage
  text?: string
  imageUrl?: string
  videoUrl?: string
  context: StageModerationContext
  /** Skip stage flag check (paid validation API). */
  forceEnabled?: boolean
  /** Informational-only: harmful findings become warnings, never blocks flow. */
  validationMode?: boolean
}

const TEXT_CHUNK_SIZE = 8000

const STAGE_CHECKS: Record<
  ModerationStage,
  ModerationCheckName[]
> = {
  blueprint: ['harmful_text', 'copyright_text'],
  script: ['harmful_text', 'copyright_text'],
  character: ['harmful_visual', 'celebrity_recognition', 'likeness_detection'],
  storyboard: ['harmful_visual', 'likeness_detection'],
  fal_video: ['harmful_visual', 'copyright_media'],
}

const STAGE_CONTENT_TYPE: Record<ModerationStage, StageContentType> = {
  blueprint: 'blueprint_text',
  script: 'script_text',
  character: 'character_image',
  storyboard: 'storyboard_image',
  fal_video: 'fal_video',
}

function hiveResultToCheck(
  check: ModerationCheckName,
  result: HiveModerationResult,
  severity: ModerationSeverity
): ModerationCheckResult {
  const allowed = severity === 'warn' ? true : result.allowed
  return {
    check,
    provider: result.reason?.includes('OpenAI') ? 'openai' : 'hive',
    allowed,
    severity,
    categories: result.flaggedCategories,
    score: result.highestScore,
    details: {
      hiveRequestId: result.hiveRequestId,
      action: result.action,
    },
  }
}

function buildSummary(checks: ModerationCheckResult[], allowed: boolean): string {
  if (checks.length === 0) return 'Moderation skipped (stage disabled)'
  const blocks = checks.filter((c) => c.severity === 'block' && !c.allowed)
  const warns = checks.filter((c) => c.severity === 'warn' && !c.allowed)
  if (blocks.length > 0) {
    const cats = [...new Set(blocks.flatMap((c) => c.categories))].join(', ')
    return `Blocked: harmful content detected (${cats || 'policy violation'})`
  }
  if (warns.length > 0) {
    const cats = [...new Set(warns.flatMap((c) => c.categories))].join(', ')
    return `Allowed with warnings: ${cats || 'intellectual property signals'}`
  }
  return allowed ? 'Content passed moderation' : 'Content blocked'
}

function computeReportAction(
  allowed: boolean,
  checks: ModerationCheckResult[]
): ModerationReport['action'] {
  if (!allowed) return 'blocked'
  if (checks.some((c) => c.severity === 'warn' && c.categories.length > 0)) {
    return 'warning'
  }
  return 'allowed'
}

/** Paid validation: all findings informational; harmful → warn severity. */
export function applyValidationMode(report: ModerationReport): ModerationReport {
  const checks = report.checks.map((c) => {
    if (c.severity === 'block' && c.categories.length > 0) {
      return { ...c, severity: 'warn' as ModerationSeverity, allowed: true }
    }
    return { ...c, allowed: true }
  })
  const hasSignals = checks.some((c) => c.categories.length > 0)
  const harmful = checks.filter((c) =>
    ['harmful_text', 'harmful_visual'].includes(c.check) && c.categories.length > 0
  )
  const ip = checks.filter((c) =>
    !['harmful_text', 'harmful_visual'].includes(c.check) && c.categories.length > 0
  )
  let summary = 'Validation complete: no issues detected'
  if (harmful.length > 0 && ip.length > 0) {
    summary = 'Validation: harmful content signals and IP warnings detected (informational)'
  } else if (harmful.length > 0) {
    summary = 'Validation: harmful content signals detected (informational)'
  } else if (ip.length > 0) {
    summary = 'Validation: intellectual property warnings detected (informational)'
  }
  return {
    ...report,
    allowed: true,
    action: hasSignals ? 'warning' : 'allowed',
    checks,
    summary,
  }
}

async function runTextHarmfulCheck(
  text: string,
  context: StageModerationContext,
  contentType: StageContentType
): Promise<ModerationCheckResult> {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += TEXT_CHUNK_SIZE) {
    chunks.push(text.slice(i, i + TEXT_CHUNK_SIZE))
  }

  let worst: HiveModerationResult | null = null
  for (const chunk of chunks) {
    const result = await HiveModerationService.moderateText(chunk, {
      userId: context.userId,
      projectId: context.projectId,
      contentType: contentType === 'blueprint_text' ? 'blueprint_text' : 'script_text',
      voiceType: 'stock',
      logEvent: false,
    })
    if (!worst || result.highestScore > worst.highestScore) worst = result
    if (!result.allowed) break
  }

  const result = worst ?? {
    allowed: true,
    action: 'allowed' as const,
    flaggedCategories: [],
    categoryScores: {},
    highestScore: 0,
    threshold: 0.5,
  }

  return hiveResultToCheck('harmful_text', result, result.allowed ? 'none' : 'block')
}

async function runCopyrightTextCheck(
  text: string,
  context: StageModerationContext
): Promise<ModerationCheckResult> {
  const result = await HiveModerationService.moderateTextForCopyrightSignals(text, {
    userId: context.userId,
    projectId: context.projectId,
    contentType: 'blueprint_text',
    voiceType: 'stock',
    logEvent: false,
  })

  const severity: ModerationSeverity =
    result.flaggedCategories.length > 0 ? 'warn' : 'none'

  return {
    check: 'copyright_text',
    provider: result.hiveClasses?.length ? 'hive' : 'heuristic',
    allowed: true,
    severity,
    categories: result.flaggedCategories,
    score: result.highestScore,
    details: { signals: result.hiveClasses },
  }
}

async function runHarmfulVisualCheck(
  url: string,
  context: StageModerationContext,
  contentType: StageContentType
): Promise<ModerationCheckResult> {
  const result = await HiveModerationService.moderateImage(url, {
    userId: context.userId,
    projectId: context.projectId,
    contentType:
      contentType === 'character_image' ? 'character_image' : 'storyboard_image',
    voiceType: 'stock',
    sceneId: context.sceneId,
    segmentIndex: context.segmentIndex,
    logEvent: false,
  })

  return hiveResultToCheck(
    'harmful_visual',
    result,
    result.allowed ? 'none' : 'block'
  )
}

async function runHarmfulVideoCheck(
  url: string,
  context: StageModerationContext
): Promise<ModerationCheckResult> {
  const result = await HiveModerationService.moderateVideo(url, {
    userId: context.userId,
    projectId: context.projectId,
    contentType: 'fal_video',
    voiceType: 'stock',
    sceneId: context.sceneId,
    segmentIndex: context.segmentIndex,
    logEvent: false,
  })

  return hiveResultToCheck(
    'harmful_visual',
    result,
    result.allowed ? 'none' : 'block'
  )
}

async function runCelebrityCheck(
  imageUrl: string,
  context: StageModerationContext
): Promise<ModerationCheckResult> {
  const result = await HiveModerationService.recognizeCelebrities(imageUrl, {
    userId: context.userId,
    projectId: context.projectId,
    contentType: 'character_image',
    voiceType: 'stock',
    logEvent: false,
  })

  const severity: ModerationSeverity =
    result.flaggedCategories.length > 0 ? 'warn' : 'none'

  return {
    check: 'celebrity_recognition',
    provider: 'hive',
    allowed: true,
    severity,
    categories: result.flaggedCategories,
    score: result.highestScore,
    details: { matches: result.hiveClasses },
  }
}

async function runLikenessCheck(
  imageUrl: string,
  context: StageModerationContext
): Promise<ModerationCheckResult> {
  const result = await HiveModerationService.detectLikeness(imageUrl, {
    userId: context.userId,
    projectId: context.projectId,
    contentType: 'character_image',
    voiceType: 'stock',
    logEvent: false,
  })

  const severity: ModerationSeverity =
    result.flaggedCategories.length > 0 ? 'warn' : 'none'

  return {
    check: 'likeness_detection',
    provider: 'hive',
    allowed: true,
    severity,
    categories: result.flaggedCategories,
    score: result.highestScore,
    details: { matches: result.hiveClasses },
  }
}

async function runCopyrightMediaCheck(
  videoUrl: string,
  context: StageModerationContext
): Promise<ModerationCheckResult> {
  const result = await HiveModerationService.searchMediaCopyright(videoUrl, {
    userId: context.userId,
    projectId: context.projectId,
    contentType: 'fal_video',
    voiceType: 'stock',
    logEvent: false,
  })

  const severity: ModerationSeverity =
    result.flaggedCategories.length > 0 ? 'warn' : 'none'

  return {
    check: 'copyright_media',
    provider: 'hive',
    allowed: true,
    severity,
    categories: result.flaggedCategories,
    score: result.highestScore,
    details: { matches: result.hiveClasses },
  }
}

/**
 * Run enabled checks for a workflow stage and persist audit log.
 */
export async function runStageModeration(
  input: RunStageModerationInput
): Promise<ModerationReport | null> {
  const { stage, text, imageUrl, videoUrl, context, forceEnabled, validationMode } = input

  const enabled = forceEnabled || isStageModerationEnabled(stage)
  if (!enabled) return null

  if (!HiveModerationService.isConfigured()) {
    console.warn(`[ModerationPipeline] Hive not configured; skipping stage=${stage}`)
    return null
  }

  const checks: ModerationCheckResult[] = []
  const contentType = STAGE_CONTENT_TYPE[stage]
  const checkNames = [...STAGE_CHECKS[stage]]

  if (stage === 'fal_video' && !context.includeCopyrightMedia) {
    const idx = checkNames.indexOf('copyright_media')
    if (idx >= 0) checkNames.splice(idx, 1)
  }

  for (const checkName of checkNames) {
    try {
      switch (checkName) {
        case 'harmful_text':
          if (text?.trim()) {
            checks.push(await runTextHarmfulCheck(text, context, contentType))
          }
          break
        case 'copyright_text':
          if (text?.trim()) {
            checks.push(await runCopyrightTextCheck(text, context))
          }
          break
        case 'harmful_visual':
          if (imageUrl) {
            checks.push(await runHarmfulVisualCheck(imageUrl, context, contentType))
          } else if (videoUrl && stage === 'fal_video') {
            checks.push(await runHarmfulVideoCheck(videoUrl, context))
          }
          break
        case 'celebrity_recognition':
          if (imageUrl) checks.push(await runCelebrityCheck(imageUrl, context))
          break
        case 'likeness_detection':
          if (imageUrl) checks.push(await runLikenessCheck(imageUrl, context))
          break
        case 'copyright_media':
          if (videoUrl) checks.push(await runCopyrightMediaCheck(videoUrl, context))
          break
      }
    } catch (err) {
      console.error(`[ModerationPipeline] Check ${checkName} failed:`, err)
    }
  }

  const allowed = !checks.some((c) => c.severity === 'block' && !c.allowed)
  let report: ModerationReport = {
    id: randomUUID(),
    stage,
    allowed,
    action: computeReportAction(allowed, checks),
    checks,
    summary: buildSummary(checks, allowed),
    projectId: context.projectId,
    resourceId: context.resourceId,
    createdAt: new Date().toISOString(),
  }

  if (validationMode) {
    report = applyValidationMode(report)
  }

  const contentForHash = text || imageUrl || videoUrl || stage
  await HiveModerationService.logStageModerationEvent({
    userId: context.userId,
    contentType,
    contentHash: HiveModerationService.hashContent(contentForHash),
    stage,
    report,
    projectId: context.projectId,
  })

  return report
}

/** Merge input + output reports (e.g. blueprint pre/post). */
export function mergeModerationReports(
  reports: Array<ModerationReport | null | undefined>
): ModerationReport | null {
  const valid = reports.filter((r): r is ModerationReport => !!r)
  if (valid.length === 0) return null

  const checks = valid.flatMap((r) => r.checks)
  const allowed = valid.every((r) => r.allowed)
  const stage = valid[0].stage

  return {
    id: randomUUID(),
    stage,
    allowed,
    action: computeReportAction(allowed, checks),
    checks,
    summary: buildSummary(checks, allowed),
    projectId: valid.find((r) => r.projectId)?.projectId,
    resourceId: valid.find((r) => r.resourceId)?.resourceId,
    createdAt: new Date().toISOString(),
  }
}

/** Generic pre-generation prompt moderation (segments, image edit). */
export async function moderatePromptText(
  prompt: string,
  context: StageModerationContext
): Promise<ModerationReport | null> {
  if (!isPromptModerationEnabled() || !prompt?.trim()) return null
  if (!HiveModerationService.isConfigured()) return null

  const check = await runTextHarmfulCheck(prompt, context, 'storyboard_image')
  const allowed = check.severity !== 'block' || check.allowed
  const checks = [check]
  const report: ModerationReport = {
    id: randomUUID(),
    stage: 'storyboard',
    allowed,
    action: computeReportAction(allowed, checks),
    checks,
    summary: buildSummary(checks, allowed),
    projectId: context.projectId,
    resourceId: context.resourceId,
    createdAt: new Date().toISOString(),
  }

  await HiveModerationService.logStageModerationEvent({
    userId: context.userId,
    contentType: 'image_prompt',
    contentHash: HiveModerationService.hashContent(prompt),
    stage: 'storyboard',
    report,
    projectId: context.projectId,
  })

  return report
}

/** Aggregate screenplay scenes into moderation text. */
export function aggregateScriptText(scenes: Array<Record<string, unknown>>): string {
  return scenes
    .map((scene) => {
      const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
      const dialogueText = dialogue
        .map((d: Record<string, unknown>) =>
          [d.character, d.line].filter(Boolean).join(': ')
        )
        .join('\n')
      return [
        scene.heading,
        scene.action,
        scene.description,
        scene.visual_description,
        dialogueText,
      ]
        .filter((p) => typeof p === 'string' && p.trim())
        .join('\n')
    })
    .join('\n\n')
}

export function reportHasWarnings(report: ModerationReport | null | undefined): boolean {
  if (!report) return false
  return report.action === 'warning' || report.checks.some((c) => c.severity === 'warn' && c.categories.length > 0)
}

export function reportIsBlocked(report: ModerationReport | null | undefined): boolean {
  return !!report && !report.allowed
}

/** Blueprint analyze: pre-input + post-output text moderation. */
export async function runBlueprintModeration(params: {
  userId: string
  projectId?: string
  input?: Record<string, unknown>
  output?: unknown
  phase?: 'input' | 'output' | 'both'
}): Promise<{ report: ModerationReport | null; blocked: boolean }> {
  if (!isStageModerationEnabled('blueprint')) {
    return { report: null, blocked: false }
  }

  const phase = params.phase ?? 'both'
  const context: StageModerationContext = {
    userId: params.userId,
    projectId: params.projectId,
  }

  let inputReport: ModerationReport | null = null
  if ((phase === 'input' || phase === 'both') && params.input) {
    const inputText = aggregateBlueprintInputText(params.input)
    if (inputText) {
      inputReport = await runStageModeration({
        stage: 'blueprint',
        text: inputText,
        context: { ...context, resourceId: 'input' },
      })
    }
    if (reportIsBlocked(inputReport)) {
      return { report: inputReport, blocked: true }
    }
  }

  let outputReport: ModerationReport | null = null
  if ((phase === 'output' || phase === 'both') && params.output) {
    const outputText = aggregateBlueprintOutputText(params.output)
    if (outputText) {
      outputReport = await runStageModeration({
        stage: 'blueprint',
        text: outputText,
        context: { ...context, resourceId: 'output' },
      })
    }
  }

  const report = mergeModerationReports(
    phase === 'input' ? [inputReport] : phase === 'output' ? [outputReport] : [inputReport, outputReport]
  )
  return { report, blocked: reportIsBlocked(report) }
}

/** Post-upload image moderation for character NIL or storyboard harmful checks. */
export async function runImageStageModeration(params: {
  stage: 'character' | 'storyboard'
  imageUrl: string
  context: StageModerationContext
}): Promise<{ report: ModerationReport | null; blocked: boolean }> {
  const report = await runStageModeration({
    stage: params.stage,
    imageUrl: params.imageUrl,
    context: params.context,
  })
  return { report, blocked: reportIsBlocked(report) }
}
