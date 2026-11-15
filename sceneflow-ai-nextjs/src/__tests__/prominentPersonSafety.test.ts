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
  splitSentencesPreservingTitles,
} from '@/lib/generation/prominentPersonSafePrompt'
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
})
