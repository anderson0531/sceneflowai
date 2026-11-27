import { describe, it, expect } from 'vitest'
import { resolveGemini3ThinkingLevel } from '@/lib/vertexai/gemini'
import {
  buildScoringAwareChecklist,
  buildTreatmentPrompt,
  getDemographicThemes,
  getToneKeywords,
  getGenreConventions,
} from '@/lib/treatment/prompts'
import { autoDetectFilmStructure } from '@/lib/treatment/filmStructure'
import {
  BLUEPRINT_CHARACTER_IDENTITY_BLOCK,
  BANNED_AI_FIRST_NAMES,
  BANNED_AI_SURNAMES,
} from '@/lib/character/characterNamingPrompt'
import {
  auditBlueprintCharacterNames,
  enforceNameEntropyOnTreatment,
} from '@/lib/character/nameEntropyGuard'
import {
  buildCreativeEntropySeed,
  formatEntropyDirectiveBlock,
  isSparseSynopsis,
} from '@/lib/treatment/creativeEntropy'
import {
  attachContinuityManifestToTreatment,
  buildVoiceFingerprintPromptBlock,
} from '@/lib/blueprint/continuityManifest'
import { auditFirstTakeReadiness } from '@/lib/treatment/showrunnerPipeline'
import { buildVisionPhaseContinuityFromVariant } from '@/lib/blueprint/blueprintContinuity'

describe('Phase 0: Gemini 3 thinking level & Blueprint anti-cliché fixes', () => {
  it('maps legacy thinkingBudget to Gemini 3 thinking_level instead of collapsing to LOW', () => {
    expect(resolveGemini3ThinkingLevel(undefined, 1024)).toBe('HIGH')
    expect(resolveGemini3ThinkingLevel(undefined, 256)).toBe('MEDIUM')
    expect(resolveGemini3ThinkingLevel(undefined, 0)).toBe('LOW')
    expect(resolveGemini3ThinkingLevel('high', 0)).toBe('HIGH')
    expect(resolveGemini3ThinkingLevel('minimal', 1024)).toBe('LOW')
  })

  it('does not silently inject dark-gritty noir or millennial burnout for free-text tone/audience', () => {
    const toneGuidance = getToneKeywords('Cinematic')
    expect(toneGuidance.toLowerCase()).not.toContain('bleak')
    expect(toneGuidance.toLowerCase()).not.toContain('unforgiving')
    expect(toneGuidance.toLowerCase()).toContain('cinematic')

    const warmGuidance = getToneKeywords('Warm and hopeful')
    expect(warmGuidance.toLowerCase()).not.toContain('bleak')

    const demo = getDemographicThemes('Art-house film enthusiasts')
    expect(demo.themes.toLowerCase()).not.toContain('student debt')
    expect(demo.themes.toLowerCase()).not.toContain('burnout')
    expect(demo.ageRange).toContain('Art-house film enthusiasts')

    expect(getGenreConventions('scifi')).toContain('world-building')
    expect(getGenreConventions('Science Fiction')).toContain('world-building')

    const checklist = buildScoringAwareChecklist({
      genre: 'Drama',
      tone: 'Warm and hopeful',
      targetAudience: 'Families',
      contentIntent: 'fiction',
    })
    expect(checklist).not.toContain('burned-out detective')
    expect(checklist).not.toContain('expose the cover-up before the election')
    expect(checklist).not.toContain('student debt')
  })

  it('scrubs Arthur & Elena Lin and John Miller prompt leakage and expands standalone banlists', () => {
    expect(BLUEPRINT_CHARACTER_IDENTITY_BLOCK).not.toContain('Arthur & Elena')
    expect(BLUEPRINT_CHARACTER_IDENTITY_BLOCK).not.toContain('John Miller')
    expect(BANNED_AI_FIRST_NAMES).toContain('Elena')
    expect(BANNED_AI_FIRST_NAMES).toContain('Marcus')
    expect(BANNED_AI_FIRST_NAMES).toContain('Maya')
    expect(BANNED_AI_SURNAMES).toContain('Vance')
    expect(BANNED_AI_SURNAMES).toContain('Thorne')
    expect(BANNED_AI_SURNAMES).toContain('Voss')

    const prompt = buildTreatmentPrompt({
      input: 'A retired maritime mechanic inherits her sister\'s sourdough bakery.',
      coreConcept: { input_title: 'Salt & Levain', input_synopsis: 'Bakery drama', core_themes: ['family'], narrative_structure: 'three_act' },
      format: 'short_film',
      targetMinutes: 45,
      contentIntent: 'fiction',
      context: { genre: 'Drama', tone: 'Warm' },
    })
    expect(prompt).not.toContain('Arthur & Elena')
    expect(prompt).not.toContain('John Miller')
    expect(prompt).toContain('voiceFingerprint')
  })

  it('prevents autoDetectFilmStructure regexes from hijacking fiction into mini_doc or instructional', () => {
    const journeyFiction = autoDetectFilmStructure(
      'A young chef goes on a journey to discover a real family secret and teach her apprentice.',
      null,
      'feature',
      90,
      'fiction'
    )
    expect(['three_act', 'heros_journey', 'save_the_cat']).toContain(journeyFiction.structure)
    expect(journeyFiction.structure).not.toBe('mini_doc')
    expect(journeyFiction.structure).not.toBe('instructional')

    const detectiveLeadFiction = autoDetectFilmStructure(
      'An archivist follows a lead to reveal a hidden forged painting.',
      null,
      'short_film',
      30,
      'fiction'
    )
    expect(detectiveLeadFiction.structure).not.toBe('instructional')
    expect(detectiveLeadFiction.structure).not.toBe('mini_doc')

    // Non-fiction formats still route cleanly to documentary / instructional
    const doc = autoDetectFilmStructure(
      'A portrait of island ferry engineers.',
      null,
      'documentary',
      40,
      'informational'
    )
    expect(doc.structure).toBe('mini_doc')

    const edu = autoDetectFilmStructure(
      'How-to tutorial on sourdough fermentation.',
      null,
      'education',
      20,
      'informational'
    )
    expect(edu.structure).toBe('instructional')
  })
})

describe('Phase 2: Name Entropy Guard, Creative Entropy & Canonical Continuity Manifest', () => {
  it('audits and deterministically remaps banned AI names & cross-project duplicates while preserving user-typed names', () => {
    const treatment = {
      title: 'Tidewater',
      logline: 'Elena Vance confronts Marcus Voss over the missing harbor deed while Kenji Morita watches.',
      synopsis: 'Elena arrives at dawn. Marcus hides the deed. Kenji Morita intervenes.',
      protagonist: 'Elena Vance — stubborn mechanic',
      antagonist: 'Marcus Voss — harbor bureaucrat',
      character_descriptions: [
        { name: 'Elena Vance', role: 'protagonist', gender: 'female', description: 'Elena stands firm.' },
        { name: 'Marcus Voss', role: 'antagonist', gender: 'male', description: 'Marcus manipulates the board.' },
        { name: 'Kenji Morita', role: 'supporting', gender: 'male', description: 'Wise watchmaker.' },
      ],
      beats: [
        {
          title: 'Opening',
          synopsis: 'Elena Vance meets Marcus Voss at the pier while Kenji Morita looks on.',
          characters: ['Elena Vance', 'Marcus Voss', 'Kenji Morita'],
        },
      ],
    }

    const { treatment: cleaned, report } = enforceNameEntropyOnTreatment(treatment, {
      userInput: 'A story featuring Kenji Morita in a coastal harbor.',
      recentProjectNames: ['Nadia Bhatia'],
      seedKey: 'unit-test-seed',
    })

    expect(report.passed).toBe(true)
    expect(report.remapped?.length).toBe(2)

    const names = cleaned.character_descriptions.map((c) => c.name)
    expect(names).toContain('Kenji Morita') // User-supplied name preserved!
    expect(names.join(' ')).not.toContain('Elena')
    expect(names.join(' ')).not.toContain('Vance')
    expect(names.join(' ')).not.toContain('Marcus')
    expect(names.join(' ')).not.toContain('Voss')

    // Remapping propagated cleanly to logline, synopsis, beats, and beat characters
    expect(cleaned.logline).not.toContain('Elena')
    expect(cleaned.logline).not.toContain('Marcus')
    expect(cleaned.beats[0].characters).toEqual(names)
  })

  it('flags recent project duplicates and lead initial collisions in auditBlueprintCharacterNames', () => {
    const audit = auditBlueprintCharacterNames(
      [
        { name: 'Tessa Kowalski', role: 'protagonist' },
        { name: 'Tomas Delgado', role: 'antagonist' },
      ],
      { recentProjectNames: ['Tessa Kowalski'] }
    )
    expect(audit.passed).toBe(false)
    expect(audit.violations.some((v) => v.reason === 'recent_project_duplicate')).toBe(true)
    expect(audit.violations.some((v) => v.reason === 'lead_initial_collision')).toBe(true)
  })

  it('detects sparse synopses and builds reproducible Creative Entropy Seeds', () => {
    expect(isSparseSynopsis('A baker fights to save her shop.')).toBe(true)
    const seed = buildCreativeEntropySeed({
      input: 'A baker fights to save her shop.',
      genre: 'Drama',
      tone: 'Warm',
      recentProjectNames: ['Tessa Kowalski (Age 32)'],
      nonce: 'fixed-nonce',
    })
    expect(seed.isSparseInput).toBe(true)
    expect(seed.excludedRecentNames).toContain('Tessa Kowalski')
    const directive = formatEntropyDirectiveBlock(seed)
    expect(directive).toContain('CROSS-PROJECT MEMORY')
    expect(directive).toContain('Tessa Kowalski')
  })

  it('attaches canonical IDs (char_01, loc_01, prop_01) and propagates voiceFingerprint into visionPhase', () => {
    const raw = {
      title: 'Salt & Levain',
      logline: 'A retired mechanic saves a coastal sourdough bakery.',
      synopsis: 'Warm character drama by the harbor.',
      character_descriptions: [
        {
          name: 'Nadia Kowalski',
          role: 'protagonist',
          appearance: 'Weathered hands, silver-streaked dark bob, bright hazel eyes, upright maritime posture.',
          defaultWardrobe: 'Waxed canvas apron over navy fisherman sweater',
          voiceFingerprint: 'Clipped, practical phrasing with dry nautical idioms and sudden warmth',
          description: 'Pragmatic former shipwright',
        },
      ],
      scene_descriptions: [
        { name: 'Harbor Sourdough Oven Room', type: 'INT', location: 'Brick oven bay', atmosphere: 'Warm flour-dusted dawn' },
        { name: 'North Pier Fish Market', type: 'EXT', location: 'Wet timber docks', atmosphere: 'Brisk salt fog' },
      ],
      prop_descriptions: [
        { name: '1948 Brass Proofing Timer', category: 'prop', description: 'Tarnished mechanical timer', significance: 'Heirloom', importance: 'high' },
      ],
      beats: Array.from({ length: 10 }, (_, i) => ({
        title: `Beat ${i + 1}`,
        synopsis: 'Causal visual turn.',
        minutes: 4,
        characters: ['Nadia Kowalski'],
      })),
    }

    const { treatment: manifested, manifest } = attachContinuityManifestToTreatment(raw)
    expect(manifest.characters[0].canonicalId).toBe('char_01')
    expect(manifest.locations[0].canonicalId).toBe('loc_01')
    expect(manifest.props[0].canonicalId).toBe('prop_01')

    const readiness = auditFirstTakeReadiness(manifested, {
      userInput: 'A retired mechanic saves a coastal bakery.',
      requestedTone: 'Warm and heartwarming',
      targetMinutes: 40,
    })
    expect(readiness.passed).toBe(true)
    expect(readiness.noirDriftDetected).toBe(false)
    expect(readiness.continuityCompletenessPercent).toBe(100)

    const vision = buildVisionPhaseContinuityFromVariant(manifested)
    expect(vision.characters[0].canonicalId).toBe('char_01')
    expect(vision.characters[0].voiceFingerprint).toContain('nautical idioms')

    const voiceBlock = buildVoiceFingerprintPromptBlock(vision.characters)
    expect(voiceBlock).toContain('[char_01] Nadia Kowalski')
    expect(voiceBlock).toContain('nautical idioms')
  })
})
