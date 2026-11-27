/**
 * 4-Stage "Showrunner Room" Creative Pipeline for First-Take Production
 *
 * Separates Divergent Creative Invention (high temperature + creative entropy + light schema)
 * from Convergent Blueprint Compilation (lower temperature + high thinking + strict JSON):
 *
 *  Stage 1 — Divergent Showrunner Pitch (3 distinct angles -> Critic selects best 'wow' pitch)
 *  Stage 2 — Grounded Cast & World Bible Forge (asymmetric friction, voice fingerprints,
 *            visual silhouettes, tactile locations, audited by Name Entropy Guard)
 *  Stage 3 — Blueprint JSON Compiler (handled by `film-treatment` route using locked brief)
 *  Stage 4 — Silent First-Take Readiness & Anti-Cliché Gate (audits cast names, noir drift,
 *            Reference Express continuity completeness, and beat density)
 */

import { generateWithTier } from '@/lib/llm/tierRouter'
import { safeParseJsonFromText } from '@/lib/safeJson'
import {
  buildCreativeEntropySeed,
  formatEntropyDirectiveBlock,
  type CreativeEntropySeed,
} from './creativeEntropy'
import {
  auditBlueprintCharacterNames,
  type NameEntropyReport,
} from '@/lib/character/nameEntropyGuard'

export interface ShowrunnerPitchTake {
  id: string
  angleLabel: string
  workingTitle: string
  logline: string
  premiseEngine: string
  settingTexture: string
  emotionalCore: string
  whyItWows: string
}

export interface ForgedCastMember {
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting'
  age: string
  gender: string
  ethnicity: string
  occupation: string
  voiceFingerprint: string
  visualSilhouette: string
  defaultWardrobe: string
  externalGoal: string
  internalNeed: string
  fatalFlaw: string
  frictionWithOthers: string
}

export interface ForgedLocation {
  name: string
  type: 'INT' | 'EXT'
  sensoryTexture: string
  signatureProps: string[]
}

export interface ShowrunnerCastWorldBible {
  winningTake: ShowrunnerPitchTake
  cast: ForgedCastMember[]
  locations: ForgedLocation[]
  visualPalette: string
  nameAudit: NameEntropyReport
}

export interface FirstTakeReadinessReport {
  score: number
  passed: boolean
  nameEntropy: NameEntropyReport
  noirDriftDetected: boolean
  continuityCompletenessPercent: number
  beatCount: number
  issues: string[]
}

export interface ShowrunnerPreCompilationResult {
  entropySeed: CreativeEntropySeed
  pitchTakes: ShowrunnerPitchTake[]
  selectedTake: ShowrunnerPitchTake
  bible: ShowrunnerCastWorldBible
  creativeBriefBlock: string
}

/**
 * Stage 1A: Generate 3 genuinely distinct 1-paragraph Director's Takes at high temperature (0.9).
 * Can be called standalone by `/api/blueprint/pitch-takes` for interactive 1-click selection,
 * or automatically inside First-Take Blueprint generation.
 */
export async function generateShowrunnerPitchTakes(opts: {
  input: string
  genre?: string
  tone?: string
  targetAudience?: string
  format?: string
  recentProjectNames?: string[]
  entropySeed?: CreativeEntropySeed
  projectId?: string
  userId?: string
  isAdmin?: boolean
}): Promise<{ entropySeed: CreativeEntropySeed; takes: ShowrunnerPitchTake[] }> {
  const entropySeed =
    opts.entropySeed ??
    buildCreativeEntropySeed({
      input: opts.input,
      genre: opts.genre,
      tone: opts.tone,
      recentProjectNames: opts.recentProjectNames,
    })

  const entropyBlock = formatEntropyDirectiveBlock(entropySeed)

  const prompt = `You are a world-class film & television showrunner pitching 3 genuinely distinct, memorable creative takes on a creator's initial idea.

CREATOR INPUT:
${opts.input}

CREATIVE TARGETS:
- Genre: ${opts.genre || 'Match the creator input organically'}
- Tone: ${opts.tone || 'Match the creator input organically (do NOT default to dark noir unless requested)'}
- Audience: ${opts.targetAudience || 'Discerning modern audience'}
- Format: ${opts.format || 'Long-form narrative'}

${entropyBlock}

TASK:
Pitch 3 RADICALLY DIFFERENT angles so the creator gets an immediate "wow" moment. Do NOT write 3 minor variations of the same plot:
1. Take 1 ("Character-Driven Surprise"): Grounded, deeply human, built around an unforgettable contradiction and tactile everyday world.
2. Take 2 ("High-Concept Engine"): Bold, ironic, poster-ready premise hook with kinetic visual escalation.
3. Take 3 ("Intimate Pressure-Cooker"): Tight ensemble friction in a vivid micro-world where loyalties fracture under a ticking clock.

Every take MUST:
- Honor every specific fact, name, or constraint in the CREATOR INPUT.
- Avoid generic "burned-out detective", "corrupt city official cover-up", or "cryptic letter" tropes unless explicitly in the input.
- Deliver a concrete, surprising premise engine and lived-in setting.

Return ONLY valid JSON:
{
  "takes": [
    {
      "id": "take_1",
      "angleLabel": "Character-Driven Surprise",
      "workingTitle": "Evocative original title",
      "logline": "One vivid poster-ready sentence with genuine hook/irony",
      "premiseEngine": "2 sentences explaining the specific escalating dramatic mechanism",
      "settingTexture": "1-2 sentences of concrete place, season, profession, and sensory texture",
      "emotionalCore": "1 sentence naming the human collision at the heart of the story",
      "whyItWows": "1 sentence on what makes this feel fresh and unmissable"
    }
  ]
}`

  const res = await generateWithTier(prompt, {
    tier: 'tier1_showrunner',
    surface: 'showrunner_pitch',
    temperature: 0.9,
    topP: 0.95,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    thinkingLevel: 'medium',
    timeoutMs: 45_000,
    projectId: opts.projectId,
    userId: opts.userId,
    isAdmin: opts.isAdmin,
  })

  const parsed = safeParseJsonFromText(res.text) as { takes?: unknown[] } | null
  const rawTakes = Array.isArray(parsed?.takes) ? parsed!.takes : []
  const takes: ShowrunnerPitchTake[] = rawTakes
    .filter((t): t is Record<string, any> => Boolean(t && typeof t === 'object'))
    .map((t, idx) => ({
      id: typeof t.id === 'string' && t.id.trim() ? t.id.trim() : `take_${idx + 1}`,
      angleLabel: String(t.angleLabel || `Take ${idx + 1}`),
      workingTitle: String(t.workingTitle || 'Untitled Take'),
      logline: String(t.logline || ''),
      premiseEngine: String(t.premiseEngine || ''),
      settingTexture: String(t.settingTexture || ''),
      emotionalCore: String(t.emotionalCore || ''),
      whyItWows: String(t.whyItWows || ''),
    }))
    .filter((t) => Boolean(t.logline))

  return { entropySeed, takes }
}

/**
 * Stage 1B: Internal Showrunner Critic (low temperature) selects the strongest "wow" take
 * for automated First-Take Production workflows.
 */
export async function selectWinningPitchTake(opts: {
  input: string
  takes: ShowrunnerPitchTake[]
  genre?: string
  tone?: string
  projectId?: string
  userId?: string
  isAdmin?: boolean
}): Promise<{ selectedTake: ShowrunnerPitchTake; rationale: string }> {
  if (opts.takes.length === 0) {
    throw new Error('No pitch takes provided to Showrunner Critic')
  }
  if (opts.takes.length === 1) {
    return { selectedTake: opts.takes[0], rationale: 'Single available take' }
  }

  const prompt = `You are an elite Executive Showrunner & Development Critic selecting the single strongest pitch to greenlight for First-Take Production.

CREATOR INPUT:
${opts.input}
Requested Genre: ${opts.genre || 'Open'} | Requested Tone: ${opts.tone || 'Open'}

CANDIDATE TAKES:
${JSON.stringify(opts.takes, null, 2)}

Evaluate strictly on:
1. Originality & Anti-Cliché (penalize stock noir/conspiracy tropes unless requested)
2. Faithfulness to the creator's exact premise & requested tone
3. Visual Cinema Potential (can we immediately picture memorable scenes & locations?)
4. Long-Form Engine (does this sustain rich character escalation?)

Return ONLY valid JSON:
{
  "selectedId": "take_1 | take_2 | take_3",
  "rationale": "1-2 crisp sentences explaining why this take wins"
}`

  try {
    const res = await generateWithTier(prompt, {
      tier: 'tier1_showrunner',
      surface: 'showrunner_pitch',
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      thinkingLevel: 'low',
      timeoutMs: 25_000,
      projectId: opts.projectId,
      userId: opts.userId,
      isAdmin: opts.isAdmin,
    })
    const parsed = safeParseJsonFromText(res.text) as { selectedId?: string; rationale?: string } | null
    const chosen = opts.takes.find((t) => t.id === parsed?.selectedId) || opts.takes[0]
    return {
      selectedTake: chosen,
      rationale: String(parsed?.rationale || 'Selected highest-impact original premise.'),
    }
  } catch {
    return { selectedTake: opts.takes[0], rationale: 'Defaulted to primary Showrunner take.' }
  }
}

/**
 * Stage 2: Dedicated Cast & World Bible Forge (temperature 0.85).
 * Builds idiosyncratic cast with Voice Fingerprints, Asymmetric Friction, Visual Silhouettes,
 * and tactile locations BEFORE beat plotting begins.
 */
export async function forgeCastAndWorldBible(opts: {
  input: string
  winningTake: ShowrunnerPitchTake
  entropySeed: CreativeEntropySeed
  genre?: string
  tone?: string
  projectId?: string
  userId?: string
  isAdmin?: boolean
}): Promise<ShowrunnerCastWorldBible> {
  const entropyBlock = formatEntropyDirectiveBlock(opts.entropySeed)

  const prompt = `You are a Casting Director & Production Designer forging a fresh, unforgettable Cast Ensemble and Tactile World Bible before the writers room plots the beat sheet.

CREATOR INPUT:
${opts.input}

GREENLIT SHOWRUNNER PITCH:
- Title: ${opts.winningTake.workingTitle}
- Logline: ${opts.winningTake.logline}
- Premise Engine: ${opts.winningTake.premiseEngine}
- Setting Texture: ${opts.winningTake.settingTexture}
- Emotional Core: ${opts.winningTake.emotionalCore}
- Genre: ${opts.genre || 'Match pitch'} | Tone: ${opts.tone || 'Match pitch'}

${entropyBlock}

REQUIREMENTS:
1. Cast 4–6 distinct INDIVIDUALS (never groups). Preserve any names explicitly given in CREATOR INPUT.
2. Every invented name MUST be culturally authentic, generationally accurate, phonetically distinct across leads (distinct starting initials), and NEVER use banned AI defaults.
3. Give every character a specific "voiceFingerprint" (speech rhythm, diction, verbal tells) and a concrete "visualSilhouette" + "defaultWardrobe" ready for reference-image generation.
4. Define explicit asymmetric "frictionWithOthers" so no supporting character is a passive sounding board.
5. Design 3–5 hyper-specific signature locations (not generic "Modern Office" or "City Street") with concrete props.

Return ONLY valid JSON:
{
  "visualPalette": "1-2 sentences defining color palette, lighting contrast, and visual grammar",
  "cast": [
    {
      "name": "Full Name",
      "role": "protagonist | antagonist | supporting",
      "age": "Exact age",
      "gender": "female | male | non-binary",
      "ethnicity": "Specific heritage",
      "occupation": "Concrete role/craft",
      "voiceFingerprint": "How they actually talk: cadence, vocabulary, verbal tells",
      "visualSilhouette": "Physical build, posture, defining facial feature, hair",
      "defaultWardrobe": "Signature outfit & accessories rooted in their profession and world",
      "externalGoal": "Visible active pursuit",
      "internalNeed": "Colliding emotional truth",
      "fatalFlaw": "Playable contradiction",
      "frictionWithOthers": "Specific secret, debt, or collision with another named cast member"
    }
  ],
  "locations": [
    {
      "name": "Specific evocative location name",
      "type": "INT | EXT",
      "sensoryTexture": "Architecture, light, sound, lived-in clutter",
      "signatureProps": ["Tactile prop 1", "Tactile prop 2"]
    }
  ]
}`

  const res = await generateWithTier(prompt, {
    tier: 'tier1_showrunner',
    surface: 'showrunner_pitch',
    temperature: 0.85,
    topP: 0.95,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    thinkingLevel: 'medium',
    timeoutMs: 45_000,
    projectId: opts.projectId,
    userId: opts.userId,
    isAdmin: opts.isAdmin,
  })

  const parsed = safeParseJsonFromText(res.text) as Record<string, any> | null
  const cast: ForgedCastMember[] = Array.isArray(parsed?.cast)
    ? (parsed!.cast as any[])
        .map(
          (c: any): ForgedCastMember => ({
            name: String(c?.name || ''),
            role:
              c?.role === 'protagonist' || c?.role === 'antagonist' ? c.role : 'supporting',
            age: String(c?.age || '35'),
            gender: String(c?.gender || 'non-binary'),
            ethnicity: String(c?.ethnicity || 'Unspecified'),
            occupation: String(c?.occupation || ''),
            voiceFingerprint: String(c?.voiceFingerprint || ''),
            visualSilhouette: String(c?.visualSilhouette || ''),
            defaultWardrobe: String(c?.defaultWardrobe || ''),
            externalGoal: String(c?.externalGoal || ''),
            internalNeed: String(c?.internalNeed || ''),
            fatalFlaw: String(c?.fatalFlaw || ''),
            frictionWithOthers: String(c?.frictionWithOthers || ''),
          })
        )
        .filter((c) => Boolean(c.name))
    : []

  const locations: ForgedLocation[] = Array.isArray(parsed?.locations)
    ? (parsed!.locations as any[])
        .map(
          (l: any): ForgedLocation => ({
            name: String(l?.name || ''),
            type: String(l?.type || '').toUpperCase().includes('EXT') ? 'EXT' : 'INT',
            sensoryTexture: String(l?.sensoryTexture || ''),
            signatureProps: Array.isArray(l?.signatureProps) ? l.signatureProps.map(String) : [],
          })
        )
        .filter((l) => Boolean(l.name))
    : []

  const nameAudit = auditBlueprintCharacterNames(cast, {
    userInput: opts.input,
    recentProjectNames: opts.entropySeed.excludedRecentNames,
  })

  return {
    winningTake: opts.winningTake,
    cast,
    locations,
    visualPalette: String(parsed?.visualPalette || ''),
    nameAudit,
  }
}

/**
 * Format the locked Stage 1 + Stage 2 Showrunner Room artifacts into a directive block
 * for Stage 3 Convergent Blueprint JSON Compilation.
 */
export function formatShowrunnerBriefBlock(bible: ShowrunnerCastWorldBible): string {
  const castLines = bible.cast
    .map(
      (c) =>
        `  - ${c.name} (${c.role}, age ${c.age}, ${c.gender}, ${c.ethnicity}, ${c.occupation}) | Voice: ${c.voiceFingerprint} | Visual: ${c.visualSilhouette} | Wardrobe: ${c.defaultWardrobe} | Goal vs Need: ${c.externalGoal} vs ${c.internalNeed} | Flaw: ${c.fatalFlaw} | Friction: ${c.frictionWithOthers}`
    )
    .join('\n')

  const locLines = bible.locations
    .map(
      (l) =>
        `  - ${l.type}. ${l.name}: ${l.sensoryTexture} (Props: ${l.signatureProps.join(', ')})`
    )
    .join('\n')

  return `=============================================================================
SHOWRUNNER ROOM LOCKED CREATIVE BRIEF (PRESERVE THIS ORIGINALITY IN COMPILATION)
=============================================================================
GREENLIT PREMISE:
- Working Title: ${bible.winningTake.workingTitle}
- Hook / Logline: ${bible.winningTake.logline}
- Premise Engine: ${bible.winningTake.premiseEngine}
- Setting Texture: ${bible.winningTake.settingTexture}
- Emotional Core: ${bible.winningTake.emotionalCore}
- Visual Palette: ${bible.visualPalette}

LOCKED ENSEMBLE CAST (USE THESE EXACT NAMES, VOICES, SILHOUETTES & FRICTION):
${castLines}

LOCKED SIGNATURE LOCATIONS & PROPS:
${locLines}

COMPILATION DIRECTIVE:
- Preserve these exact character names, voiceFingerprints, wardrobes, and signature locations.
- Architect 12–24 tightly causally linked beats ("THEREFORE / BUT") that fulfill this exact premise engine and interpersonal friction matrix.
=============================================================================`
}

/**
 * Execute Stages 1 & 2 end-to-end when input is sparse or First-Take mode is active.
 */
export async function runShowrunnerPreCompilation(opts: {
  input: string
  genre?: string
  tone?: string
  targetAudience?: string
  format?: string
  recentProjectNames?: string[]
  /** Optional user-picked Stage 1 take (skips Stage 1 generation if already selected in UI) */
  chosenTake?: ShowrunnerPitchTake
  projectId?: string
  userId?: string
  isAdmin?: boolean
}): Promise<ShowrunnerPreCompilationResult> {
  const entropySeed = buildCreativeEntropySeed({
    input: opts.input,
    genre: opts.genre,
    tone: opts.tone,
    recentProjectNames: opts.recentProjectNames,
  })

  let pitchTakes: ShowrunnerPitchTake[] = []
  let selectedTake: ShowrunnerPitchTake

  if (opts.chosenTake) {
    pitchTakes = [opts.chosenTake]
    selectedTake = opts.chosenTake
  } else {
    const pitchResult = await generateShowrunnerPitchTakes({
      ...opts,
      entropySeed,
    })
    pitchTakes = pitchResult.takes
    if (pitchTakes.length === 0) {
      throw new Error('Showrunner pitch stage produced no valid takes')
    }
    const selection = await selectWinningPitchTake({
      input: opts.input,
      takes: pitchTakes,
      genre: opts.genre,
      tone: opts.tone,
      projectId: opts.projectId,
      userId: opts.userId,
      isAdmin: opts.isAdmin,
    })
    selectedTake = selection.selectedTake
  }

  const bible = await forgeCastAndWorldBible({
    input: opts.input,
    winningTake: selectedTake,
    entropySeed,
    genre: opts.genre,
    tone: opts.tone,
    projectId: opts.projectId,
    userId: opts.userId,
    isAdmin: opts.isAdmin,
  })

  return {
    entropySeed,
    pitchTakes,
    selectedTake,
    bible,
    creativeBriefBlock: formatShowrunnerBriefBlock(bible),
  }
}

/**
 * Stage 4: Deterministic First-Take Quality & Continuity Readiness Gate.
 * Checks Name Entropy, unwanted noir-trope drift, Reference Express continuity readiness,
 * and beat density before handing off to Continuity Library & Production Script.
 */
export function auditFirstTakeReadiness(
  treatment: Record<string, any>,
  opts?: {
    userInput?: string
    requestedTone?: string
    recentProjectNames?: string[]
    targetMinutes?: number
  }
): FirstTakeReadinessReport {
  const issues: string[] = []
  const chars = Array.isArray(treatment?.character_descriptions)
    ? treatment.character_descriptions
    : []
  const scenes = Array.isArray(treatment?.scene_descriptions)
    ? treatment.scene_descriptions
    : []
  const beats = Array.isArray(treatment?.beats) ? treatment.beats : []

  // 1. Name Entropy Audit
  const nameEntropy = auditBlueprintCharacterNames(chars, {
    userInput: opts?.userInput,
    recentProjectNames: opts?.recentProjectNames,
  })
  if (!nameEntropy.passed) {
    issues.push(
      `Name entropy check flagged ${nameEntropy.violations.length} violation(s): ${nameEntropy.violations.map((v) => v.characterName).join(', ')}`
    )
  }

  // 2. Unwanted Noir-Detective Drift Check
  const requestedTone = (opts?.requestedTone || '').toLowerCase()
  const userRequestedNoir = /\b(dark|gritty|noir|detective|crime|thriller|mystery|bleak|conspiracy)\b/i.test(
    `${requestedTone} ${opts?.userInput || ''}`
  )
  const combinedProse = `${treatment?.logline || ''} ${treatment?.synopsis || ''} ${treatment?.protagonist || ''}`.toLowerCase()
  const noirSignals = [
    'burned-out detective',
    'expose the cover-up',
    'cryptic letter',
    'shadowy conspiracy',
    'haunted by a case',
  ].filter((phrase) => combinedProse.includes(phrase))
  const noirDriftDetected = !userRequestedNoir && noirSignals.length > 0
  if (noirDriftDetected) {
    issues.push(`Unrequested noir-template drift detected (${noirSignals.join(', ')})`)
  }

  // 3. Continuity Library & Reference Express Completeness
  let totalChecks = 0
  let passedChecks = 0
  for (const c of chars) {
    totalChecks += 3
    if (typeof c?.appearance === 'string' && c.appearance.trim().length >= 25) passedChecks += 1
    if (typeof c?.defaultWardrobe === 'string' && c.defaultWardrobe.trim().length >= 10) passedChecks += 1
    if (typeof c?.voiceFingerprint === 'string' && c.voiceFingerprint.trim().length >= 10) passedChecks += 1
  }
  totalChecks += 1
  if (scenes.length >= 2) passedChecks += 1

  const continuityCompletenessPercent =
    totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0
  if (continuityCompletenessPercent < 75) {
    issues.push(
      `Continuity Library readiness is ${continuityCompletenessPercent}% (missing appearance, defaultWardrobe, or voiceFingerprint fields)`
    )
  }

  // 4. Beat Density Check
  const targetMinutes = opts?.targetMinutes ?? 30
  if (targetMinutes >= 25 && beats.length < 8) {
    issues.push(`Long-form target (${targetMinutes}m) produced only ${beats.length} beats (expected >= 8)`)
  }

  let score = 100
  score -= Math.round((100 - nameEntropy.score) * 0.4)
  if (noirDriftDetected) score -= 20
  if (continuityCompletenessPercent < 75) score -= Math.round((75 - continuityCompletenessPercent) * 0.5)
  if (targetMinutes >= 25 && beats.length < 8) score -= 12
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    passed: score >= 82 && nameEntropy.passed && !noirDriftDetected,
    nameEntropy,
    noirDriftDetected,
    continuityCompletenessPercent,
    beatCount: beats.length,
    issues,
  }
}
