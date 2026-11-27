/**
 * Programmatic Creative Entropy Seed & Cross-Project Name Exclusion
 *
 * Prevents LLM mode collapse on sparse creator synopses (< 120 words) by injecting
 * fresh, genre-compatible creative constraints (tactile milieu, grounded occupation/social
 * texture, distinct phonetic initials, and cross-project character name exclusion).
 */

import { BANNED_AI_FIRST_NAMES, BANNED_AI_SURNAMES } from '@/lib/character/characterNamingPrompt'
import { stripAgeStageSuffix } from '@/lib/character/nameEntropyGuard'

export interface CreativeEntropySeed {
  seedId: string
  isSparseInput: boolean
  wordCount: number
  milieuTexture: string
  interpersonalEngine: string
  visualSignature: string
  suggestedLeadInitials: [string, string, string]
  namingCadenceDirective: string
  excludedRecentNames: string[]
}

const MILIEU_TEXTURES = [
  'a working port or transit hub in the off-season, where everyone knows the schedule by heart',
  'a sun-bleached inland town whose economy revolves around a single aging trade or festival',
  'a cramped, high-craft guild or workshop where reputation travels faster than money',
  'a humid late-summer coastal or riverside neighborhood caught between old craft and new real estate',
  'an insular boarding/residential institution or seasonal lodge with unwritten social hierarchy',
  'a nocturnal logistics, broadcast, or hospitality ecosystem that only wakes up after midnight',
  'a high-altitude or borderland community where weather dictates every schedule',
  'a bustling multi-generational market district or family-run enterprise with competing heirs',
]

const INTERPERSONAL_ENGINES = [
  'an unspoken financial or professional debt between two people who pretend to be equals',
  'a protégé who has quietly outgrown a stubborn mentor who refuses to retire',
  'two estranged collaborators forced to share one tight deadline and one reputation',
  'an outsider hired to audit or fix a beloved local institution that hides an embarrassing secret',
  'siblings or close allies pursuing the exact same goal for mutually incompatible reasons',
  'a caregiver or fixer whose competence enables everyone else to avoid telling the truth',
]

const VISUAL_SIGNATURES = [
  'tactile practical light, lived-in analog textures, and distinct color contrast between public and private spaces',
  'kinetic handheld framing during emotional pressure contrasted with still, wide architectural compositions',
  'warm golden-hour exteriors clashing against cool fluorescent interiors to map power shifts',
  'expressive blocking around physical craft objects, doorways, and shared tables rather than static talking heads',
  'vivid seasonal weather shifts and layered foreground activity that make the setting feel populated and real',
]

const DISTINCT_INITIAL_SETS: Array<[string, string, string]> = [
  ['T', 'N', 'H'],
  ['D', 'P', 'R'],
  ['S', 'G', 'B'],
  ['C', 'F', 'W'],
  ['N', 'I', 'Z'],
  ['R', 'B', 'O'],
  ['P', 'D', 'G'],
  ['H', 'S', 'T'],
  ['F', 'W', 'C'],
  ['G', 'T', 'P'],
]

const NAMING_CADENCE_DIRECTIVES = [
  'Contrast syllable rhythms across leads: pair a brisk two-syllable given name with a longer, grounded family surname, and give the rival a sharper, consonant-heavy cadence.',
  'Anchor character names to specific generational birth decades (e.g., 1960s/70s names for elders, grounded 1990s/2000s names for younger leads) rather than timeless YA-fantasy defaults.',
  'Include realistic regional or heritage surnames reflecting the story\'s true geography and working-class or professional milieu.',
  'Give at least one principal character a lived-in occupational or familial nickname used organically in dialogue alongside their legal full name.',
]

export function countWords(text: string): number {
  const cleaned = (text || '').trim()
  if (!cleaned) return 0
  return cleaned.split(/\s+/).filter(Boolean).length
}

/**
 * Sparse synopses (< 120 words and without structured beat/scene breakdowns) benefit most
 * from divergent Showrunner Pitching + Creative Entropy injection.
 */
export function isSparseSynopsis(input: string): boolean {
  const words = countWords(input)
  if (words === 0) return true
  if (words < 120) return true
  // Even slightly longer inputs without named characters or scene beats can still be sparse concepts
  const hasExplicitStructure = /\b(act\s+[i123]|scene\s+\d+|beat\s+\d+|int\.|ext\.)/i.test(input)
  return words < 160 && !hasExplicitStructure
}

function hashEntropy(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Build a fresh Creative Entropy Seed for a Blueprint generation.
 * Uses a per-request nonce by default so regenerating the same sparse prompt explores new territory.
 */
export function buildCreativeEntropySeed(opts: {
  input: string
  genre?: string
  tone?: string
  recentProjectNames?: string[]
  /** Optional deterministic nonce for reproducible testing */
  nonce?: string
}): CreativeEntropySeed {
  const wordCount = countWords(opts.input)
  const sparse = isSparseSynopsis(opts.input)
  const nonce = opts.nonce ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const h1 = hashEntropy(`${nonce}:${opts.input.slice(0, 80)}:milieu`)
  const h2 = hashEntropy(`${nonce}:${opts.genre || ''}:engine`)
  const h3 = hashEntropy(`${nonce}:${opts.tone || ''}:visual`)
  const h4 = hashEntropy(`${nonce}:initials`)

  const excludedRecentNames = Array.from(
    new Set(
      (opts.recentProjectNames || [])
        .map((n) => stripAgeStageSuffix(n).baseName)
        .filter((n) => n.length >= 2)
    )
  ).slice(0, 25)

  return {
    seedId: `ent_${h1.toString(36).slice(0, 6)}`,
    isSparseInput: sparse,
    wordCount,
    milieuTexture: MILIEU_TEXTURES[h1 % MILIEU_TEXTURES.length],
    interpersonalEngine: INTERPERSONAL_ENGINES[h2 % INTERPERSONAL_ENGINES.length],
    visualSignature: VISUAL_SIGNATURES[h3 % VISUAL_SIGNATURES.length],
    suggestedLeadInitials: DISTINCT_INITIAL_SETS[h4 % DISTINCT_INITIAL_SETS.length],
    namingCadenceDirective: NAMING_CADENCE_DIRECTIVES[(h1 + h2) % NAMING_CADENCE_DIRECTIVES.length],
    excludedRecentNames,
  }
}

/**
 * Format the entropy seed into an anti-cliché prompt injection block.
 */
export function formatEntropyDirectiveBlock(seed: CreativeEntropySeed): string {
  const recentBlock =
    seed.excludedRecentNames.length > 0
      ? `\n- CROSS-PROJECT MEMORY (DO NOT REUSE): This creator's recent projects already used these names — invent completely fresh ones: ${seed.excludedRecentNames.join(', ')}`
      : ''

  return `CREATIVE ORIGINALITY & ENTROPY DIRECTIVES (Seed ${seed.seedId}):
- SPECIFICITY OVER GENERICISM: If the creator's input leaves setting, occupation, or relationships open, ground them in tactile, unexpected real-world specifics (for inspiration only—adapt seamlessly to the creator's genre/tone: ${seed.milieuTexture}).
- INTERPERSONAL FRICTION: Build asymmetric relational tension between principals (e.g., ${seed.interpersonalEngine}).
- VISUAL SIGNATURE: ${seed.visualSignature}.
- PHONETIC NAME DIVERSITY: Give your top 3 principal characters distinct starting initials (suggested distinct initials when inventing fresh names: ${seed.suggestedLeadInitials.join(', ')}). ${seed.namingCadenceDirective}
- HARD NAME EXCLUSIONS (NEVER USE unless explicitly typed by the creator): First names [${BANNED_AI_FIRST_NAMES.join(', ')}]; Surnames [${BANNED_AI_SURNAMES.join(', ')}].${recentBlock}`
}

/**
 * Load character names used across the creator's last N projects to prevent cross-project repetition.
 * Safely returns `[]` if DB is unavailable or in unit tests.
 */
export async function loadRecentUserCharacterNames(
  userId?: string | null,
  limitProjects = 10
): Promise<string[]> {
  if (!userId || process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return []
  }
  try {
    const { Project } = await import('@/models')
    const projects = await Project.findAll({
      where: { user_id: userId } as any,
      order: [['updated_at', 'DESC']],
      limit: limitProjects,
      attributes: ['id', 'metadata'],
    })

    const names = new Set<string>()
    for (const proj of projects as any[]) {
      const meta = proj?.metadata || {}
      const vpChars = Array.isArray(meta?.visionPhase?.characters)
        ? meta.visionPhase.characters
        : []
      const ftChars = Array.isArray(meta?.filmTreatmentVariant?.character_descriptions)
        ? meta.filmTreatmentVariant.character_descriptions
        : []

      for (const c of [...vpChars, ...ftChars]) {
        const raw = typeof c?.name === 'string' ? c.name.trim() : ''
        if (raw) {
          const { baseName } = stripAgeStageSuffix(raw)
          if (baseName) names.add(baseName)
        }
      }
    }
    return Array.from(names).slice(0, 30)
  } catch {
    return []
  }
}
