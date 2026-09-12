/**
 * Project Visual Lookbook — one Gemini pass per project, reused by every frame.
 *
 * The lookbook is keyed on a fingerprint of the treatment plus every scene's
 * description and direction. That is what makes it useful: an Express run and a
 * single frame regenerated an hour later resolve to the same look instead of
 * each inventing their own.
 */

import 'server-only'

import { generateText, type TextGenerationOptions } from '@/lib/vertexai/gemini'
import {
  buildFallbackProjectLookbook,
  buildLookbookSystemPrompt,
  buildLookbookUserPrompt,
  fingerprintLookbookSource,
  formatLookbookForPlannerPrompt,
  formatLookbookStyleAnchor,
  getSceneLookNote,
  summarizeScenesForLookbook,
  PROJECT_LOOKBOOK_VERSION,
  type LookbookSceneSummary,
  type ProjectLookbook,
  type ProjectLookbookRequest,
  type ProjectLookbookSceneLook,
} from '@/lib/intelligence/project-lookbook-fallback'
import type { FilmContext } from '@/lib/intelligence/scene-direction-metadata'
import { safeParseJsonFromText } from '@/lib/safeJson'

export type {
  LookbookSceneSummary,
  ProjectLookbook,
  ProjectLookbookRequest,
  ProjectLookbookSceneLook,
}
export {
  buildFallbackProjectLookbook,
  buildLookbookSystemPrompt,
  buildLookbookUserPrompt,
  fingerprintLookbookSource,
  formatLookbookForPlannerPrompt,
  formatLookbookStyleAnchor,
  getSceneLookNote,
  summarizeScenesForLookbook,
  PROJECT_LOOKBOOK_VERSION,
}

const LOOKBOOK_GEMINI_OPTIONS: TextGenerationOptions = {
  model: 'gemini-2.5-flash',
  temperature: 0.3,
  maxOutputTokens: 1536,
  responseMimeType: 'application/json',
  thinkingBudget: 0,
  timeoutMs: 30_000,
  maxRetries: 1,
}

interface LookbookCacheEntry {
  lookbook: ProjectLookbook
  timestamp: number
}

const lookbookCache = new Map<string, LookbookCacheEntry>()
const LOOKBOOK_CACHE_TTL_MS = 30 * 60 * 1000
const LOOKBOOK_CACHE_MAX_ENTRIES = 50

function getCachedLookbook(fingerprint: string): ProjectLookbook | null {
  const entry = lookbookCache.get(fingerprint)
  if (!entry) return null
  if (Date.now() - entry.timestamp > LOOKBOOK_CACHE_TTL_MS) {
    lookbookCache.delete(fingerprint)
    return null
  }
  return entry.lookbook
}

function setCachedLookbook(fingerprint: string, lookbook: ProjectLookbook): void {
  if (lookbookCache.size >= LOOKBOOK_CACHE_MAX_ENTRIES) {
    const oldest = lookbookCache.keys().next().value
    if (oldest) lookbookCache.delete(oldest)
  }
  lookbookCache.set(fingerprint, { lookbook, timestamp: Date.now() })
}

function parseSceneLooks(value: unknown, sceneCount: number): ProjectLookbookSceneLook[] {
  if (!Array.isArray(value)) return []
  const looks: ProjectLookbookSceneLook[] = []
  for (const raw of value) {
    const entry = raw as { sceneIndex?: unknown; lookNote?: unknown }
    const sceneIndex = typeof entry?.sceneIndex === 'number' ? entry.sceneIndex : NaN
    const lookNote = typeof entry?.lookNote === 'string' ? entry.lookNote.trim() : ''
    if (!Number.isInteger(sceneIndex) || sceneIndex < 0 || sceneIndex >= sceneCount) continue
    if (!lookNote) continue
    looks.push({ sceneIndex, lookNote })
  }
  return looks
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
}

/**
 * The look is only usable if the model filled the fields the prompt is built
 * from. A partial response falls back rather than emitting half a style anchor.
 */
function validateLookbook(
  parsed: Record<string, unknown>
): Pick<
  ProjectLookbook,
  'masterStyle' | 'colorPalette' | 'lightingGrammar' | 'lensAndFormat' | 'textureAndGrade'
> | null {
  const masterStyle = String(parsed.masterStyle ?? '').trim()
  const colorPalette = String(parsed.colorPalette ?? '').trim()
  const lightingGrammar = String(parsed.lightingGrammar ?? '').trim()
  const lensAndFormat = String(parsed.lensAndFormat ?? '').trim()
  const textureAndGrade = String(parsed.textureAndGrade ?? '').trim()

  if (masterStyle.length < 12) return null
  if (!colorPalette || !lightingGrammar) return null

  return { masterStyle, colorPalette, lightingGrammar, lensAndFormat, textureAndGrade }
}

export async function deriveProjectLookbook(
  request: ProjectLookbookRequest
): Promise<ProjectLookbook> {
  const fingerprint = fingerprintLookbookSource(request)

  try {
    const result = await generateText(buildLookbookUserPrompt(request), {
      ...LOOKBOOK_GEMINI_OPTIONS,
      systemInstruction: buildLookbookSystemPrompt(),
    })

    let cleanText = result.text.trim()
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    const parsed = safeParseJsonFromText(cleanText) as Record<string, unknown>
    const core = validateLookbook(parsed)
    if (!core) {
      console.warn('[ProjectLookbook] Incomplete AI look, using deterministic fallback')
      return buildFallbackProjectLookbook(request)
    }

    const fallback = buildFallbackProjectLookbook(request)
    const negativeStyleTerms = parseStringArray(parsed.negativeStyleTerms)
    const sceneLooks = parseSceneLooks(parsed.sceneLooks, request.scenes.length)

    console.log(
      `[ProjectLookbook] Derived look for ${request.scenes.length} scenes (${fingerprint})`
    )

    return {
      version: PROJECT_LOOKBOOK_VERSION,
      fingerprint,
      ...core,
      lensAndFormat: core.lensAndFormat || fallback.lensAndFormat,
      textureAndGrade: core.textureAndGrade || fallback.textureAndGrade,
      negativeStyleTerms:
        negativeStyleTerms.length > 0 ? negativeStyleTerms : fallback.negativeStyleTerms,
      ...(sceneLooks.length > 0 ? { sceneLooks } : {}),
      generatedAt: new Date().toISOString(),
      usedAI: true,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[ProjectLookbook] Gemini failed, using deterministic fallback: ${message}`)
    return buildFallbackProjectLookbook(request)
  }
}

function readStoredLookbook(project: any): ProjectLookbook | null {
  const stored = project?.metadata?.visionPhase?.lookbook
  if (!stored || typeof stored !== 'object') return null
  if (stored.version !== PROJECT_LOOKBOOK_VERSION) return null
  if (typeof stored.fingerprint !== 'string' || !stored.masterStyle) return null
  return stored as ProjectLookbook
}

function getProjectScenes(project: any): unknown[] {
  const visionPhase = project?.metadata?.visionPhase || {}
  const scenes = visionPhase?.script?.script?.scenes || visionPhase?.script?.scenes || []
  return Array.isArray(scenes) ? scenes : []
}

export function buildProjectFilmContext(project: any): FilmContext {
  const treatment = project?.metadata?.visionPhase?.treatment || project?.metadata?.treatmentPhase
  const genre = treatment?.genre
  return {
    title: project?.metadata?.title || project?.title || undefined,
    logline: treatment?.logline || treatment?.synopsis || undefined,
    genre: genre ? (Array.isArray(genre) ? genre : [genre]) : undefined,
    tone: treatment?.tone || undefined,
    visualStyle: treatment?.visualStyle || undefined,
  }
}

export function buildProjectLookbookRequest(
  project: any,
  artStyle?: string
): ProjectLookbookRequest {
  return {
    scenes: summarizeScenesForLookbook(getProjectScenes(project)),
    filmContext: buildProjectFilmContext(project),
    artStyle:
      artStyle || project?.metadata?.visionPhase?.artStyle || 'photorealistic',
    projectId: project?.id,
  }
}

/**
 * Resolve the project's look, reusing the persisted one when the treatment and
 * scenes it was derived from have not changed. Returns `undefined` only when
 * there are no scenes to derive a look from.
 */
export async function ensureProjectLookbook(
  project: any,
  artStyle?: string
): Promise<ProjectLookbook | undefined> {
  const request = buildProjectLookbookRequest(project, artStyle)
  if (request.scenes.length === 0) return undefined

  const fingerprint = fingerprintLookbookSource(request)

  const stored = readStoredLookbook(project)
  if (stored?.fingerprint === fingerprint) return stored

  const cached = getCachedLookbook(fingerprint)
  if (cached) return cached

  const lookbook = await deriveProjectLookbook(request)
  setCachedLookbook(fingerprint, lookbook)
  if (project) {
    if (!project.metadata) project.metadata = {}
    if (!project.metadata.visionPhase) project.metadata.visionPhase = {}
    project.metadata.visionPhase.lookbook = lookbook
  }
  return lookbook
}

/** Test seam — the module cache otherwise leaks derived looks between cases. */
export function __clearProjectLookbookCacheForTests(): void {
  lookbookCache.clear()
}
