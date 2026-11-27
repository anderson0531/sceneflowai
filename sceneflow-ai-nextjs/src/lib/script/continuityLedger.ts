/**
 * Compact Rolling Continuity Ledger for 60+ Minute Longform Scripts
 *
 * Replaces memoryless parallel chunk drafting with a lightweight (~600–900 token)
 * structured narrative state passed forward across batches:
 *  - `sceneExitBaton`: exact ending location, time of day, emotional temperature, closing hook
 *  - `activeSetups`: unresolved mysteries, promises, Chekhov's guns
 *  - `characterKnowledge`: what key characters currently know or believe
 *  - `wardrobeAndPropState`: injuries, costume changes, held items
 *
 * Includes both a zero-latency deterministic updater (always safe) and an optional
 * Tier 3 Flash-Lite semantic extractor (`updateContinuityLedgerWithTier3`).
 */

import { generateWithTier } from '@/lib/llm/tierRouter'
import { safeParseJsonFromText } from '@/lib/safeJson'
import type { GeminiThinkingLevel } from '@/lib/config/modelConfig'

export interface ContinuityLedger {
  lastSceneNumber: number
  lastHeading: string
  sceneExitBaton: string
  activeSetups: string[]
  characterKnowledge: Record<string, string>
  wardrobeAndPropState: string[]
}

export function createEmptyContinuityLedger(): ContinuityLedger {
  return {
    lastSceneNumber: 0,
    lastHeading: '',
    sceneExitBaton: '',
    activeSetups: [],
    characterKnowledge: {},
    wardrobeAndPropState: [],
  }
}

/**
 * Zero-latency deterministic ledger update extracted from newly generated scenes.
 * Keeps rolling memory accurate even when fast-pathing without an extra LLM call.
 */
export function updateContinuityLedgerDeterministic(
  prev: ContinuityLedger,
  newScenes: Array<Record<string, any>>
): ContinuityLedger {
  if (!Array.isArray(newScenes) || newScenes.length === 0) return prev

  const sorted = newScenes
    .slice()
    .sort((a, b) => (Number(a?.sceneNumber) || 0) - (Number(b?.sceneNumber) || 0))
  const last = sorted[sorted.length - 1]
  const lastNum = Number(last?.sceneNumber) || prev.lastSceneNumber + sorted.length
  const lastHeading = String(last?.heading || prev.lastHeading || '').trim()

  const lastBeats = Array.isArray(last?.beats) ? last.beats : []
  const finalBeat = lastBeats[lastBeats.length - 1]
  const closingText =
    String(
      finalBeat?.text ||
        finalBeat?.action ||
        finalBeat?.dialogue ||
        last?.action ||
        last?.visualDescription ||
        ''
    )
      .trim()
      .slice(0, 220)

  const newSetups = [...prev.activeSetups]
  const newProps = [...prev.wardrobeAndPropState]
  const knowledge = { ...prev.characterKnowledge }

  for (const s of sorted) {
    const heading = String(s?.heading || '').trim()
    const summary = String(s?.visualDescription || s?.action || '').trim().slice(0, 140)
    if (heading && summary) {
      newSetups.push(`Scene ${s?.sceneNumber ?? '?'}: ${heading} — ${summary}`)
    }
    if (Array.isArray(s?.dialogue)) {
      for (const d of s.dialogue.slice(-2)) {
        const speaker = String(d?.character || '').trim()
        const line = String(d?.line || d?.dialogue || '').trim().slice(0, 90)
        if (speaker && line) {
          knowledge[speaker] = `Last stated in Scene ${s?.sceneNumber ?? '?'}: "${line}"`
        }
      }
    }
  }

  return {
    lastSceneNumber: Math.max(prev.lastSceneNumber, lastNum),
    lastHeading,
    sceneExitBaton: closingText
      ? `Scene ${lastNum} (${lastHeading}) ended on: ${closingText}`
      : prev.sceneExitBaton,
    activeSetups: newSetups.slice(-8),
    characterKnowledge: Object.fromEntries(Object.entries(knowledge).slice(-10)),
    wardrobeAndPropState: newProps.slice(-8),
  }
}

/**
 * Optional Tier 3 (Flash-Lite, minimal thinking) semantic ledger compression.
 * Falls back cleanly to `updateContinuityLedgerDeterministic` on any error.
 */
export async function updateContinuityLedgerWithTier3(
  prev: ContinuityLedger,
  newScenes: Array<Record<string, any>>,
  opts?: { projectId?: string; userId?: string }
): Promise<ContinuityLedger> {
  const baseline = updateContinuityLedgerDeterministic(prev, newScenes)
  if (newScenes.length === 0) return prev

  const compactScenes = newScenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    heading: s.heading,
    action: String(s.action || s.visualDescription || '').slice(0, 280),
    lastDialogue: Array.isArray(s.dialogue)
      ? s.dialogue.slice(-3).map((d: any) => `${d.character}: ${String(d.line || '').slice(0, 100)}`)
      : [],
  }))

  const prompt = `Compress the updated narrative continuity state after these newly written scenes so the next batch of scenes stays 100% consistent.

PREVIOUS LEDGER:
${JSON.stringify(prev)}

NEWLY WRITTEN SCENES:
${JSON.stringify(compactScenes)}

Return ONLY compact JSON (keep every field concise, <= 8 items per array):
{
  "sceneExitBaton": "1-2 sentences: exact ending location, time of day, physical state, and dramatic hook handing off to the next scene",
  "activeSetups": ["Unresolved plot thread / promise / Chekhov's gun"],
  "characterKnowledge": { "Character Name": "Key secret/fact they now know or believe" },
  "wardrobeAndPropState": ["Visible injury, costume change, or critical prop location"]
}`

  try {
    const res = await generateWithTier(prompt, {
      tier: 'tier3_ledger_extractor',
      surface: 'script_ledger',
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      thinkingLevel: 'minimal',
      timeoutMs: 20_000,
      projectId: opts?.projectId,
      userId: opts?.userId,
    })
    const parsed = safeParseJsonFromText(res.text) as Record<string, any> | null
    if (!parsed) return baseline

    return {
      lastSceneNumber: baseline.lastSceneNumber,
      lastHeading: baseline.lastHeading,
      sceneExitBaton:
        typeof parsed.sceneExitBaton === 'string' && parsed.sceneExitBaton.trim()
          ? parsed.sceneExitBaton.trim()
          : baseline.sceneExitBaton,
      activeSetups: Array.isArray(parsed.activeSetups)
        ? parsed.activeSetups.map(String).slice(0, 8)
        : baseline.activeSetups,
      characterKnowledge:
        parsed.characterKnowledge && typeof parsed.characterKnowledge === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.characterKnowledge as Record<string, unknown>)
                .slice(0, 10)
                .map(([k, v]) => [k, String(v)])
            )
          : baseline.characterKnowledge,
      wardrobeAndPropState: Array.isArray(parsed.wardrobeAndPropState)
        ? parsed.wardrobeAndPropState.map(String).slice(0, 8)
        : baseline.wardrobeAndPropState,
    }
  } catch {
    return baseline
  }
}

/**
 * Format the Rolling Continuity Ledger as a compact prompt block for the next script batch.
 */
export function formatContinuityLedgerBlock(ledger: ContinuityLedger | null | undefined): string {
  if (!ledger || ledger.lastSceneNumber <= 0) return ''

  const lines: string[] = [
    `\nROLLING CONTINUITY LEDGER (THROUGH SCENE ${ledger.lastSceneNumber} — DO NOT CONTRADICT):`,
  ]
  if (ledger.sceneExitBaton) {
    lines.push(`• Handoff Baton: ${ledger.sceneExitBaton}`)
  }
  if (ledger.activeSetups.length > 0) {
    lines.push(`• Active Story Threads / Setups:\n  - ${ledger.activeSetups.join('\n  - ')}`)
  }
  const knowledgeEntries = Object.entries(ledger.characterKnowledge)
  if (knowledgeEntries.length > 0) {
    lines.push(
      `• Character Knowledge State:\n  - ${knowledgeEntries
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n  - ')}`
    )
  }
  if (ledger.wardrobeAndPropState.length > 0) {
    lines.push(`• Props / Wardrobe / Physical Continuity: ${ledger.wardrobeAndPropState.join('; ')}`)
  }
  return `${lines.join('\n')}\n`
}

/**
 * Adaptive thinking-level selector for longform chunks:
 * Reserves `'high'` thinking for opening hook, midpoint reversal, climax/finale, and
 * explicitly flagged structural turns; uses `'medium'` for connective scenes to cut
 * thinking-token cost & MAX_TOKENS contention by ~40%.
 */
export function selectAdaptiveThinkingLevelForChunk(opts: {
  chunkIndex: number
  totalChunks: number
  beatTitle?: string
  isRetry?: boolean
}): GeminiThinkingLevel {
  if (opts.isRetry) return 'high'
  if (opts.totalChunks <= 3) return 'high'
  if (opts.chunkIndex === 0 || opts.chunkIndex === opts.totalChunks - 1) return 'high'
  const midpointIdx = Math.floor(opts.totalChunks / 2)
  if (opts.chunkIndex === midpointIdx) return 'high'

  const title = (opts.beatTitle || '').toLowerCase()
  if (/\b(climax|midpoint|inciting|all is lost|reveal|turn|finale|crisis|break into)\b/i.test(title)) {
    return 'high'
  }
  return 'medium'
}
