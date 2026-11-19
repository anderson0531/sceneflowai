import { describe, expect, it } from 'vitest'
import { neutralizeReferenceConflictPrompt } from '@/lib/gemini/neutralizeReferenceConflictPrompt'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import { buildOmniInteractionInput } from '@/lib/gemini/omniVideoInteractions'
import { normalizeReferenceImages, veoRefsToPrioritized } from '@/lib/video/normalizeReferenceImages'
import { buildOmniVideoReferencePrompt } from '@/lib/gemini/buildOmniVideoReferencePrompt'
import { buildSceneStateLedger } from '@/lib/scene/sceneStateLedger'
import { lintShotPromptConsistency } from '@/lib/vision/lintShotPromptConsistency'
import { buildDeterministicShotInvestigation } from '@/lib/errors/shotErrorInvestigator'
import { IDENTITY_ANTI_LIKENESS_DIRECTIVES } from '@/lib/character/characterReferencePrompts'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('Phase 1 — Prompt Hygiene, Scale Anchors & Continuity Fixes', () => {
  it('preserves location possessives and two-shot pronouns in neutralizeReferenceConflictPrompt', () => {
    const locationPrompt =
      "Inside Gideon's Workshop near St. Mary's Hall, Elara's hands rest on the workbench."
    const neutralLoc = neutralizeReferenceConflictPrompt(locationPrompt)
    expect(neutralLoc).toContain("Gideon's Workshop")
    expect(neutralLoc).toContain("St. Mary's Hall")
    expect(neutralLoc).toContain("the subject's hands")

    const twoShot =
      'person [1] steadies his hands on the rail while person [2] turns her face toward the harbor.'
    const neutralTwoShot = neutralizeReferenceConflictPrompt(twoShot)
    expect(neutralTwoShot).toContain('his hands')
    expect(neutralTwoShot).toContain('her face')
    expect(neutralTwoShot).not.toContain("The subject's")
  })

  it('intersects prevProps with currentProps so continuity never contradicts Only these objects', () => {
    const prevBeat: SceneBeat = {
      beatId: 'b1',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Maya inspects the brass lantern.',
      beatDirection: {
        shotType: 'Medium Shot',
        keyProps: ['Brass Lantern'],
        castInFrame: ['Maya'],
      },
    }
    const currBeat: SceneBeat = {
      beatId: 'b2',
      sequenceIndex: 1,
      kind: 'action',
      actionDescription: 'Maya checks the pocket watch.',
      beatDirection: {
        shotType: 'Close-Up',
        keyProps: ['Pocket Watch'],
        castInFrame: ['Maya'],
      },
    }

    const compiled = compileBeatVideoPromptFromDirection(currBeat, {
      previousBeat: prevBeat,
    })
    expect(compiled.prompt).toContain('Only these objects: Pocket Watch')
    expect(compiled.prompt).not.toContain('props remain: Brass Lantern')
  })

  it('does not duplicate frozenMoment as both Start frame and End frame when endFrame is omitted', () => {
    const beat: SceneBeat = {
      beatId: 'b3',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'Mateo turns the brass compass dial slowly.',
      beatDirection: {
        shotType: 'Close-Up',
        frozenMoment: 'Mateo holds the closed cedar compass box on the workbench',
        clipAction: 'Mateo lifts the lid and turns the brass dial slowly',
        castInFrame: ['Mateo'],
      },
    }

    const compiled = compileBeatVideoPromptFromDirection(beat)
    expect(compiled.prompt).toContain('0s–2s (Start frame):')
    expect(compiled.prompt).not.toContain(
      '8s–10s (End frame): Mateo holds the closed cedar compass box on the workbench'
    )
  })

  it('forwards positive-phrased silent, single-cast, and physics guardrails on Omni REF', async () => {
    const input = await buildOmniInteractionInput(
      'person [1] lifts the cedar box onto the workbench.',
      {
        referenceImages: [
          {
            base64Image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            label: 'The next image is the identity of person [1].',
          },
        ],
        negativePrompt:
          'dialogue, talking, lip sync, over-the-shoulder foreground person, teleporting, floating objects',
      }
    )

    expect(Array.isArray(input)).toBe(true)
    const parts = input as Array<{ type: string; text?: string }>
    const finalText = parts[parts.length - 1]?.text || ''
    expect(finalText).toContain('mouths remain closed with no lip-sync')
    expect(finalText).toContain('unreferenced foreground person')
    expect(finalText).toContain('rigid object permanence')
  })

  it('propagates dimensions, canonicalScale, and currentSetState into Omni Video REF bindings', () => {
    const normalized = normalizeReferenceImages([
      {
        url: 'https://example.com/loc.jpg',
        type: 'style',
        role: 'location',
        locationName: '1972 Cedar Boatshop',
        canonicalScale: '10m timber workshop interior',
        currentSetState: 'warm late-afternoon sawdust haze',
      },
      {
        url: 'https://example.com/prop.jpg',
        type: 'character',
        role: 'prop-critical',
        propName: 'Cedar Compass Box',
        dimensions: 'palm-sized 10cm x 10cm wooden box',
      },
    ])!

    const prioritized = veoRefsToPrioritized(normalized)
    const refPrompt = buildOmniVideoReferencePrompt({
      scenePrompt: 'The camera slowly pushes in on Cedar Compass Box inside 1972 Cedar Boatshop.',
      refs: prioritized,
    })

    expect(refPrompt).toContain('True scale: 10m timber workshop interior')
    expect(refPrompt).toContain('Set state: warm late-afternoon sawdust haze')
    expect(refPrompt).toContain('True physical scale: palm-sized 10cm x 10cm wooden box')
  })

  it('prevents transient holding verbs from polluting sceneStateLedger wardrobe carryover', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'b1',
        sequenceIndex: 0,
        kind: 'action',
        character: 'Elena',
        actionDescription: 'Elena is holding an open glass jar while examining the shelf.',
      },
      {
        beatId: 'b2',
        sequenceIndex: 1,
        kind: 'action',
        character: 'Elena',
        actionDescription: 'Elena puts on a navy wool coat before stepping outside.',
      },
      {
        beatId: 'b3',
        sequenceIndex: 2,
        kind: 'action',
        character: 'Elena',
        actionDescription: 'Elena walks down the harbor steps.',
      },
    ]

    const ledger = buildSceneStateLedger(beats)
    expect(ledger[0]?.wardrobeByCharacter['Elena']).toBeUndefined()
    expect(ledger[2]?.wardrobeByCharacter['Elena']).toContain('puts on a navy wool coat')
  })

  it('lintShotPromptConsistency detects and auto-repairs open-jar paradoxes and celebrity buzzwords', () => {
    const res = lintShotPromptConsistency({
      assetKind: 'clip',
      prompt:
        'A Hollywood star picks up the open glass jar from the counter, then opens the glass jar with steady hands.',
    })
    expect(res.ok).toBe(false)
    expect(res.changed).toBe(true)
    expect(res.issues.some((i) => i.code === 'state_transition_paradox')).toBe(true)
    expect(res.issues.some((i) => i.code === 'celebrity_casting_buzzword')).toBe(true)
    expect(res.sanitizedPrompt.toLowerCase()).toContain('closed glass jar')
    expect(res.sanitizedPrompt.toLowerCase()).not.toContain('hollywood star')
  })
})

describe('Phase 2 — Self-Healing [Investigate] Diagnostic Engine', () => {
  it('recommends Creative (Kling AI F2V) as #1 resolution for action/violence blocks on Google Veo', () => {
    const result = buildDeterministicShotInvestigation({
      mediaType: 'clip',
      provider: 'vertex',
      rawError: 'CONTENT_POLICY_VIOLATION: Safety filter blocked video generation',
      prompt: 'person [1] lunges forward in a close-quarters fight and strikes the wooden door.',
      hasStartFrame: true,
    })

    expect(result.diagnosedCause).toBe('action_intensity_for_veo')
    expect(result.resolutions[0]?.actionType).toBe('switch_creative_kling_f2v')
    expect(result.resolutions[0]?.recommended).toBe(true)
  })

  it('diagnoses Prominent People likeness blocks and provides Creative F2V + Shot Fix + Cast Root Fix', () => {
    const result = buildDeterministicShotInvestigation({
      mediaType: 'clip',
      provider: 'vertex',
      rawError: 'RAI filter: prominent people likeness detected',
      prompt: 'person [1] looks out over the harbor at dusk.',
      referenceImages: [{ name: 'Marcus (Identity)', role: 'identity' }],
      hasStartFrame: true,
    })

    expect(result.diagnosedCause).toBe('celebrity_likeness_ref')
    const actions = result.resolutions.map((r) => r.actionType)
    expect(actions).toContain('switch_creative_kling_f2v')
    expect(actions).toContain('mitigate_likeness_and_retry')
    expect(actions).toContain('regenerate_non_celebrity_portrait')
  })

  it('diagnoses 429 rate limits with cooldown retry and Creative bypass option', () => {
    const result = buildDeterministicShotInvestigation({
      mediaType: 'clip',
      provider: 'vertex',
      statusCode: 429,
      rawError: 'RESOURCE_EXHAUSTED: 429 quota exceeded, retry after 30 seconds',
      hasStartFrame: true,
    })

    expect(result.diagnosedCause).toBe('rate_limit_429')
    expect(result.resolutions[0]?.actionType).toBe('retry_after_cooldown')
    expect(result.resolutions.some((r) => r.actionType === 'switch_creative_kling_f2v')).toBe(true)
  })

  it('anchors character portrait generation to ordinary non-celebrity documentary realism', () => {
    expect(IDENTITY_ANTI_LIKENESS_DIRECTIVES.toLowerCase()).toContain('ordinary everyday')
    expect(IDENTITY_ANTI_LIKENESS_DIRECTIVES.toLowerCase()).toContain('natural facial asymmetry')
    expect(IDENTITY_ANTI_LIKENESS_DIRECTIVES.toLowerCase()).toContain('never resemble a movie star')
  })
})
