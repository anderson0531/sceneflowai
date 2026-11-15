import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/gemini/productionVideoClient', () => ({
  generateProductionVideo: vi.fn(),
  waitForProductionVideoCompletion: vi.fn(),
  downloadProductionVideo: vi.fn(),
}))

vi.mock('@/lib/kling/klingDirectClient', () => ({
  runKlingVideo: vi.fn(),
}))

import {
  generateProductionVideo,
  waitForProductionVideoCompletion,
} from '@/lib/gemini/productionVideoClient'
import type { VideoGenerationOptions } from '@/lib/gemini/videoClient'
import {
  deidentifyPromptForProminentPersonPolicy,
  deidentifyReferenceImageLabel,
  isProminentPeoplePolicyError,
  softenVideoSafetyTriggerClusters,
  splitSentencesPreservingTitles,
} from '@/lib/generation/prominentPersonSafePrompt'
import {
  buildArtStyleSpecFromValue,
  serializeArtStyleValue,
} from '@/lib/artStyle/globalArtStyle'
import { getArtStyleVideoPromptSuffix } from '@/lib/vision/artStyle'
import {
  buildTimedClipSequence,
  compileBeatVideoPromptFromDirection,
} from '@/lib/scene/beatVideoPromptCompiler'
import { applyPolicyComplianceToPatch } from '@/lib/intelligence/beat-still-director-fallback'
import { saveDirectorPatchToScenes } from '@/lib/vision/saveBeatDirection'
import { refreshProductionSegmentVideoPrompts } from '@/lib/scene/syncBeatVideoPrompt'
import { generateVideoWithVeoKlingFallback } from '@/lib/generation/veoWithKlingFallback'
import { evaluateGenerationError } from '@/lib/errors/generationErrorIntelligence'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const USER_FAILING_PROMPT =
  'Char_BRIAN_ERIC_ANDERSON_SR_AGE_34 speaks naturally: "Half a million concurrent queries rerouted across six distributed nodes. latency under four milliseconds. The math does not care about your pedigree, Max.". Delivery: with clinical delivery; with relentless delivery Performance: Rapid, surgical, and utterly commanding. Deliver the technical metrics with practiced cadence, dropping into a low, quiet intensity on the final sentence. 0s–2s (Start frame): Brian Eric Anderson Sr. (Age 34) stands positioned screen-left in medium close-up wearing his tailored charcoal power suit and crisp white collared shirt, facing three-quarters toward screen-right. His posture is rigid and upright, shoulders squared, chin level, and hands resting low out of frame beside the mainframe terminal console. Cool emerald phosphor glow from the terminal screen illuminates his profile against the dark drawn corporate blinds and rain-streaked exterior glass. 2s–5s (Action): Brian Eric Anderson Sr. 5s–8s (Action progression): (Age 34) articulates his technical report with sharp, measured precision, his chest lifting and settling in steady rhythmic breaths while emerald reflections play subtly across his dark silk tie. The camera executes a slow, deliberate push-in toward his steady profile as he completes his assessment, his posture remaining unyielding and immovable. 8s–10s (End frame): End on: The camera settles into a tighter medium close-up on Brian Eric Anderson Sr. (Age 34) with jaw set and gaze locked toward screen-right. Blocking: Brian Eric Anderson Sr. (Age 34) stands screen-left beside the console. Emotion: Brian Eric Anderson Sr. (Age 34): Clinical supremacy. Only these people are visible: Brian Eric Anderson Sr. (Age 34). No other people. photorealistic, cinematic motion, professional cinematography, natural lighting, shallow depth of field'

const VERTEX_PROMINENT_PEOPLE_ERROR =
  "Content Policy Violation: [prohibited_content] The input could not be submitted. This input contains certain prominent individuals that violate Google's Responsible AI practices. If you think this was an error, send feedback."

describe('Prominent-person false-positive prevention & Shot Director Safe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves honorifics and generational suffixes (Sr., Jr., Dr., Ms.) when splitting timed clip sentences', () => {
    const sentences = splitSentencesPreservingTitles(
      'Brian Eric Anderson Sr. (Age 34) articulates his technical report with sharp, measured precision. The camera executes a slow, deliberate push-in toward his steady profile.'
    )
    expect(sentences).toEqual([
      'Brian Eric Anderson Sr. (Age 34) articulates his technical report with sharp, measured precision.',
      'The camera executes a slow, deliberate push-in toward his steady profile.',
    ])

    const beat: SceneBeat = {
      beatId: 'bt_memoir_34',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: 'Brian Eric Anderson Sr. (Age 34)',
      line: 'Half a million concurrent queries rerouted across six distributed nodes.',
      beatDirection: {
        generatedBy: 'user',
        shotType: 'Medium Close-Up',
        startFrame:
          'Brian Eric Anderson Sr. (Age 34) stands positioned screen-left in medium close-up wearing his tailored charcoal power suit.',
        clipAction:
          'Brian Eric Anderson Sr. (Age 34) articulates his technical report with sharp, measured precision. The camera executes a slow, deliberate push-in toward his steady profile.',
        endFrame:
          'The camera settles into a tighter medium close-up on Brian Eric Anderson Sr. (Age 34).',
        castInFrame: ['Brian Eric Anderson Sr. (Age 34)'],
      },
    }

    const timed = buildTimedClipSequence(beat)!
    expect(timed).toContain(
      '2s–5s (Action): Brian Eric Anderson Sr. (Age 34) articulates his technical report with sharp, measured precision'
    )
    expect(timed).toContain(
      '5s–8s (Action progression): The camera executes a slow, deliberate push-in toward his steady profile'
    )
    expect(timed).not.toContain('5s–8s (Action progression): (Age 34)')
  })

  it('de-identifies Char_* aliases, full legal names, and legacy split (Age N) fragments while keeping spoken dialogue verbatim', () => {
    const result = deidentifyPromptForProminentPersonPolicy(USER_FAILING_PROMPT, {
      softenPhotorealistic: true,
    })

    expect(result.wasModified).toBe(true)
    expect(result.prompt).not.toContain('Char_BRIAN_ERIC_ANDERSON_SR_AGE_34')
    expect(result.prompt).not.toMatch(/Brian Eric Anderson/i)
    expect(result.prompt).not.toMatch(/\bAnderson\b/i)
    expect(result.prompt).not.toContain('(Age 34)')
    expect(result.prompt).not.toMatch(/\bphotorealistic\b/i)
    expect(result.prompt).toContain('The 34-year-old man speaks naturally:')
    expect(result.prompt).toContain('0s–2s (Start frame): The 34-year-old man stands positioned')
    expect(result.prompt).toContain(
      '2s–5s (Action): The 34-year-old man articulates his technical report'
    )
    expect(result.prompt).toContain('Only these people are visible: the 34-year-old man.')
    // Spoken line inside quotation marks must stay untouched (including "Max")
    expect(result.prompt).toContain(
      '"Half a million concurrent queries rerouted across six distributed nodes. latency under four milliseconds. The math does not care about your pedigree, Max."'
    )
  })

  it('strips nested character display names from person [N] reference legends while preserving multimodal binding tokens', () => {
    const omniPrompt = [
      'Use the images above.',
      'person [1] (Brian Eric Anderson Sr. (Age 34)) is the person in the identity image of person [1]. Clothes of person [1]: Tailored charcoal power suit.',
      'location [1] (CORPORATE BOARDROOM) is the place in the location image of location [1].',
      '',
      'Char_BRIAN_ERIC_ANDERSON_SR_AGE_34 speaks naturally: "The math does not care about your pedigree, Max.". 0s–2s (Start frame): Brian Eric Anderson Sr. (Age 34) stands screen-left.',
    ].join('\n')

    const result = deidentifyPromptForProminentPersonPolicy(omniPrompt, {
      boundReplacements: [
        { name: 'Brian Eric Anderson Sr. (Age 34)', token: 'person [1]' },
      ],
    })

    expect(result.wasModified).toBe(true)
    expect(result.prompt).toContain(
      'person [1] is the person in the identity image of person [1].'
    )
    expect(result.prompt).toContain('person [1] speaks naturally:')
    expect(result.prompt).toContain('0s–2s (Start frame): person [1] stands screen-left.')
    expect(result.prompt).not.toMatch(/Brian Eric Anderson/i)
    expect(result.prompt).not.toContain('Char_BRIAN_ERIC_ANDERSON_SR_AGE_34')
    expect(result.prompt).toContain('location [1] (CORPORATE BOARDROOM)')
  })

  it('makes Shot Director Safe (policyCompliance: true) rewrite stored and production clip prompts without losing castInFrame continuity', () => {
    const charId = 'char-brian-eric-anderson-sr-age-34'
    const charName = 'Brian Eric Anderson Sr. (Age 34)'
    const initialBeat: SceneBeat = {
      beatId: 'bt_1',
      sequenceIndex: 0,
      kind: 'dialogue',
      character: charName,
      characterId: charId,
      line: 'Half a million concurrent queries rerouted across six distributed nodes. The math does not care about your pedigree, Max.',
      voiceDirection: 'Rapid, surgical, and utterly commanding.',
      referenceSelection: {
        characterIds: [charId],
        objectRefIds: [],
        source: 'user',
      },
      beatDirection: {
        generatedBy: 'user',
        shotType: 'Medium Close-Up',
        cameraAngle: 'eye-level',
        cameraMovement: 'slow push-in',
        startFrame: `${charName} stands positioned screen-left in medium close-up wearing his tailored charcoal power suit.`,
        clipAction: `${charName} articulates his technical report with sharp, measured precision. The camera executes a slow push-in toward his steady profile.`,
        endFrame: `The camera settles into a tighter medium close-up on ${charName}.`,
        blocking: `${charName} stands screen-left beside the console.`,
        emotion: `${charName}: Clinical certainty.`,
        castInFrame: [charName],
      },
    }

    const beforeCompile = compileBeatVideoPromptFromDirection(initialBeat, null)
    expect(beforeCompile.prompt).toMatch(/Char_Brian_Eric_Anderson_Sr_Age_34/i)
    expect(beforeCompile.prompt).toContain(charName)

    const initialScene = {
      id: 'scene-corp',
      heading: 'INT. CORPORATE DATA CENTER - NIGHT',
      beats: [initialBeat],
      segments: [
        {
          segmentId: 'seg-1',
          beatId: 'bt_1',
          videoPrompt: beforeCompile.prompt,
        },
      ],
    }

    const safePatch = applyPolicyComplianceToPatch({
      shotType: initialBeat.beatDirection!.shotType,
      cameraAngle: initialBeat.beatDirection!.cameraAngle,
      cameraMovement: initialBeat.beatDirection!.cameraMovement,
      startFrame: initialBeat.beatDirection!.startFrame,
      clipAction: initialBeat.beatDirection!.clipAction,
      endFrame: initialBeat.beatDirection!.endFrame,
      blocking: initialBeat.beatDirection!.blocking,
      emotion: initialBeat.beatDirection!.emotion,
      castInFrame: [charName],
    })
    expect(safePatch.policyCompliance).toBe(true)

    const updatedScenes = saveDirectorPatchToScenes({
      scenes: [initialScene],
      sceneIdx: 0,
      beatId: 'bt_1',
      patch: safePatch,
      referenceSelection: initialBeat.referenceSelection!,
      characters: [{ id: charId, name: charName, referenceImage: 'https://blob.example/brian34.png' }],
      objectReferences: [],
      policyCompliance: true,
    })

    const savedScene = updatedScenes[0]
    const savedBeat = savedScene.beats[0] as SceneBeat
    // Continuity Library binding preserved!
    expect(savedBeat.beatDirection?.policyCompliance).toBe(true)
    expect(savedBeat.beatDirection?.castInFrame).toEqual([charName])
    expect(savedBeat.referenceSelection?.characterIds).toEqual([charId])

    // Stored segment & beat video prompts are scrubbed of real-person names & Char_* tags!
    const savedVideoPrompt = savedBeat.beatDirection?.videoPrompt ?? ''
    expect(savedVideoPrompt).not.toContain('Char_BRIAN_ERIC_ANDERSON_SR_AGE_34')
    expect(savedVideoPrompt).not.toMatch(/Brian Eric Anderson/i)
    expect(savedVideoPrompt).not.toMatch(/\bphotorealistic\b/i)
    expect(savedVideoPrompt).toContain('The 34-year-old man speaks naturally:')
    expect(savedVideoPrompt).toContain('The math does not care about your pedigree, Max.')

    // Production queue segment prompt also updates synchronously when BeatDirectorDialog saves!
    const refreshedProd = refreshProductionSegmentVideoPrompts(
      [
        {
          segmentId: 'seg-1',
          beatId: 'bt_1',
          sequenceIndex: 0,
          startTime: 0,
          endTime: 10,
          status: 'ERROR',
          generatedPrompt: beforeCompile.prompt,
          references: {},
          takes: [],
        } as any,
      ],
      savedScene
    )
    expect(refreshedProd).not.toBeNull()
    expect(refreshedProd![0].generatedPrompt).not.toMatch(/Brian Eric Anderson/i)
    expect(refreshedProd![0].generatedPrompt).toContain('The 34-year-old man speaks naturally:')
  })

  it('automatically scrubs prominent-person triggers on Vertex policy retry and succeeds on Attempt 2', async () => {
    expect(isProminentPeoplePolicyError(VERTEX_PROMINENT_PEOPLE_ERROR)).toBe(true)
    expect(
      deidentifyReferenceImageLabel('Identity reference 1: Brian Eric Anderson Sr. (Age 34)', 1)
    ).toBe('The next image is the identity of person [1].')

    const calls: Array<{ prompt: string; options: VideoGenerationOptions }> = []
    vi.mocked(generateProductionVideo).mockImplementation(async (prompt, opts) => {
      calls.push({ prompt, options: opts as VideoGenerationOptions })
      if (calls.length === 1) {
        return {
          status: 'FAILED',
          error: VERTEX_PROMINENT_PEOPLE_ERROR,
        }
      }
      return {
        status: 'COMPLETED',
        operationName: 'interaction:retry-ok',
        videoUrl: 'data:video/mp4;base64,AAAA',
      }
    })
    vi.mocked(waitForProductionVideoCompletion).mockResolvedValue({
      status: 'COMPLETED',
      operationName: 'interaction:retry-ok',
      videoUrl: 'data:video/mp4;base64,AAAA',
    })

    const res = await generateVideoWithVeoKlingFallback({
      prompt: USER_FAILING_PROMPT,
      method: 'REF',
      allowPolicyFallback: false,
      videoOptions: {
        durationSeconds: 10,
        aspectRatio: '16:9',
        referenceImages: [
          {
            url: 'https://blob.example/brian34.png',
            type: 'character',
            label: 'Identity reference 1: Brian Eric Anderson Sr. (Age 34)',
            role: 'identity',
          } as any,
        ],
      },
    })

    expect(res.status).toBe('COMPLETED')
    expect(res.vertexAttempts).toBe(2)
    expect(calls).toHaveLength(2)
    expect(calls[1].prompt).not.toContain('Char_BRIAN_ERIC_ANDERSON_SR_AGE_34')
    expect(calls[1].prompt).not.toMatch(/Brian Eric Anderson/i)
    expect(calls[1].prompt).not.toMatch(/\bphotorealistic\b/i)
    const retryLabel = (calls[1].options.referenceImages?.[0] as { label?: string })?.label ?? ''
    expect(retryLabel).toBe('The next image is the identity of person [1].')
    expect(calls[1].options.referenceImages?.[0]?.url).toBe('https://blob.example/brian34.png')
  })

  it('classifies prominent-individuals errors with accurate Likeness Filter guidance and Rewrite for Safety CTA', () => {
    const evaluated = evaluateGenerationError({
      mediaType: 'clip',
      rawError: VERTEX_PROMINENT_PEOPLE_ERROR,
      statusCode: 422,
      errorCode: 'CONTENT_POLICY_VIOLATION',
      provider: 'vertex',
    })

    expect(evaluated.category).toBe('content_policy')
    expect(evaluated.title).toBe('Clip Blocked by Likeness Filter')
    expect(evaluated.explanation).toMatch(/public figure/i)
    expect(evaluated.primaryCta).toEqual({
      action: 'rewrite_director',
      label: 'Rewrite for Safety',
    })
    expect(evaluated.secondaryCta).toEqual({
      action: 'switch_creative',
      label: 'Switch to Creative',
    })
  })

  it('neutralizes medical/supremacy/dominance co-occurrence clusters and distills multi-scene Pattaya/Pittsburgh style suffixes while keeping spoken dialogue verbatim', () => {
    const blockedPrompt =
      'The 34-year-old man speaks naturally: "Half a million concurrent queries rerouted across six distributed nodes. latency under four milliseconds. The math does not care about your pedigree, Max.". Delivery: with clinical delivery; with relentless delivery Performance: Rapid, surgical, and utterly commanding. Deliver the technical metrics with practiced, machine-like cadence, dropping into a low, quiet intensity on the final sentence. 0s–2s (Start frame): The 34-year-old man stands screen-left in medium close-up, dressed in a tailored charcoal power suit, crisp white shirt, and dark silk tie, angled three-quarters toward screen-right. His shoulders are squared in a rigid athletic stance, his hands rest low out of frame beside the brushed-stage prop mainframe housing, and his profile is illuminated by the cold emerald phosphor glow of adjacent terminal displays against the dark horizontal slats of drawn blinds. Emotion: The 34-year-old man: Clinical supremacy and absolute mathematical certainty; breathing is measured, quiet, and diaphragmatic; posture is rigid, poised, and unyielding. Lighting: Sharp rim light along bridge of nose and jawline from terminal arrays. Film Noir infused with cold, clinical corporate neo-realism and high-contrast anamorphic chiaroscuro. Scored moment: overwhelming technical dominance — carry that in the pacing and performance. The only spoken line is: "Half a million concurrent queries rerouted across six distributed nodes. latency under four milliseconds. The math does not care about your pedigree, Max.". High-contrast, grain-heavy 35mm film evoking the orange furnace flares and gray winter soot of 1970s Pittsburgh; sterile, desaturated anamorphic glass and cool fluorescent blues for the hard-set corporate corridors; crisp, high-key medical modernism shifting to lush tropical golds, sea-glass azures, and humid coastal breezes of Pattaya, Thailand'

    const { prompt: cleaned, wasModified } = softenVideoSafetyTriggerClusters(blockedPrompt)
    expect(wasModified).toBe(true)

    // Spoken line (including "pedigree, Max") stays 100% intact
    expect(cleaned).toContain(
      '"Half a million concurrent queries rerouted across six distributed nodes. latency under four milliseconds. The math does not care about your pedigree, Max."'
    )

    // Co-occurrence triggers and cross-scene geographic/medical bible terms are removed
    expect(cleaned).not.toMatch(/\bsupremacy\b/i)
    expect(cleaned).not.toMatch(/\bsurgical\b/i)
    expect(cleaned).not.toMatch(/\bclinical\b/i)
    expect(cleaned).not.toMatch(/\brelentless\b/i)
    expect(cleaned).not.toMatch(/\bdominance\b/i)
    expect(cleaned).not.toMatch(/\bmedical modernism\b/i)
    expect(cleaned).not.toMatch(/Pattaya|Thailand|Pittsburgh/i)
    expect(cleaned).not.toMatch(/brushed-stage prop/i)

    // Clean kinematic/camera replacements are present
    expect(cleaned).toContain('brushed-metal mainframe housing')
    expect(cleaned).toContain('Calm analytical certainty and unshakable focus')
    expect(cleaned).toContain('quiet technical confidence')
    expect(cleaned).toContain('35mm live-action cinematography, anamorphic glass, subtle film grain')
  })

  it('distills multi-act Blueprint visual_style arcs in Global Art Style video suffixes and avoids truncated-title duplication', () => {
    const multiActVisualStyle =
      'High-contrast, grain-heavy 35mm film evoking the orange furnace flares and gray winter soot of 1970s Pittsburgh; sterile, desaturated anamorphic glass and cool fluorescent blues for the predatory corporate corridors; crisp, high-key medical modernism shifting to lush tropical golds, sea-glass azures, and humid coastal breezes of Pattaya, Thailand.'

    const spec = buildArtStyleSpecFromValue(multiActVisualStyle)
    const serialized = serializeArtStyleValue(spec)
    expect(serialized).not.toContain('…:')

    const videoSuffix = getArtStyleVideoPromptSuffix(serialized)
    expect(videoSuffix).toContain('35mm live-action cinematography')
    expect(videoSuffix).toContain('anamorphic glass')
    expect(videoSuffix).not.toMatch(/Pittsburgh|Pattaya|Thailand|medical modernism|predatory/i)
  })

  it('re-binds pre-sanitized neutral descriptors back to person [1] in REF mode and preserves brushed-steel in applyPolicyComplianceToPatch', () => {
    const patch = applyPolicyComplianceToPatch({
      startFrame:
        'Brian Eric Anderson Sr. (Age 34) stands beside the brushed-steel mainframe housing.',
      emotion: 'Clinical supremacy and absolute mathematical certainty.',
      voiceDirection: 'Rapid, surgical, and utterly commanding.',
    })
    expect(patch.startFrame).toContain('brushed-steel mainframe housing')
    expect(patch.startFrame).not.toMatch(/stage prop/i)
    expect(patch.emotion).not.toMatch(/supremacy/i)
    expect(patch.voiceDirection).not.toMatch(/surgical/i)

    const preSanitizedRefPrompt =
      'Use the images above. person [1] is the person in the identity image of person [1].\n\nThe 34-year-old man speaks naturally: "The math does not care about your pedigree, Max.". 0s–2s (Start frame): The 34-year-old man stands screen-left. Only these people are visible: the 34-year-old man.'

    const rebound = deidentifyPromptForProminentPersonPolicy(preSanitizedRefPrompt, {
      boundReplacements: [
        { name: 'Brian Eric Anderson Sr. (Age 34)', token: 'person [1]' },
        { name: 'Brian Eric Anderson Sr. (Age 34)', token: 'person [1]' },
      ],
    })
    expect(rebound.prompt).toContain(
      'Use the images above. person [1] is the person in the identity image of person [1].\n\nperson [1] speaks naturally:'
    )
    expect(rebound.prompt).toContain('0s–2s (Start frame): person [1] stands screen-left.')
    expect(rebound.prompt).toContain('Only these people are visible: person [1].')
    expect(rebound.prompt).not.toMatch(/34-year-old man/i)
  })

  it('detaches startFrame on final I2V retry when a dark continuity frame repeatedly triggers content_blocked', async () => {
    const calls: Array<{ prompt: string; options: VideoGenerationOptions }> = []
    vi.mocked(generateProductionVideo).mockImplementation(async (prompt, opts) => {
      calls.push({ prompt, options: opts as VideoGenerationOptions })
      if (calls.length < 3) {
        return {
          status: 'FAILED',
          error:
            '[content_blocked] Request blocked for an unspecified policy reason. Please modify your input and retry.',
        }
      }
      return {
        status: 'COMPLETED',
        operationName: 'op-i2v-fallback-ok',
        videoUrl: 'data:video/mp4;base64,AAAA',
      }
    })

    const res = await generateVideoWithVeoKlingFallback({
      prompt: 'The 34-year-old man speaks with clinical supremacy in Pattaya, Thailand.',
      method: 'I2V',
      allowPolicyFallback: false,
      videoOptions: {
        durationSeconds: 8,
        aspectRatio: '16:9',
        startFrame: 'https://blob.example/dark-chiaroscuro-frame.png',
      },
    })

    expect(res.status).toBe('COMPLETED')
    expect(res.vertexAttempts).toBe(3)
    expect(res.finalMethod).toBe('T2V')
    expect(calls[0].options.startFrame).toBe('https://blob.example/dark-chiaroscuro-frame.png')
    expect(calls[1].options.startFrame).toBe('https://blob.example/dark-chiaroscuro-frame.png')
    expect(calls[1].prompt).not.toMatch(/supremacy/i)
    expect(calls[2].options.startFrame).toBeUndefined()
  })
})
