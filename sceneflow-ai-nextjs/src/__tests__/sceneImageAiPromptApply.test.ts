import { describe, it, expect } from 'vitest'
import { applySceneImageAiResultToPrompt } from '@/lib/scene/sceneImageAiPromptApply'
import type { SceneImageIntelligenceResult } from '@/lib/intelligence/scene-image-intelligence'

const cast = [
  {
    name: 'Piper Hayes',
    promptToken: 'person [1]',
    identityReferenceId: 'id-1',
    linkingDescription: 'a woman in her thirties',
  },
  {
    name: 'Gideon Croft',
    promptToken: 'person [2]',
    identityReferenceId: 'id-2',
    linkingDescription: 'a man in his sixties',
  },
]

function apply(prompt: string, isBeatFrame: boolean) {
  const aiResult = {
    usedAI: true,
    prompt,
    reasoning: 'test',
  } as unknown as SceneImageIntelligenceResult

  return applySceneImageAiResultToPrompt({
    aiResult,
    characterReferences: cast,
    fullSceneContext: 'scene context',
    autoDetectObjects: false,
    autoDetectLocations: false,
    projectObjectRefs: [],
    projectLocationRefs: [],
    detectedObjectReferences: [],
    matchedLocationReference: null,
    isBeatFrame,
  })
}

describe('a beat frame only carries the cast its composition places', () => {
  const propsOnlyBeat =
    'Extreme close-up on the rusted locking dogs of the receiving terminal, ' +
    'grease-caked brass rim catching the work light. No people in frame.'

  it('attaches nobody to a composition that places nobody', () => {
    const result = apply(propsOnlyBeat, true)
    expect(result.characterReferencesForImages).toEqual([])
  })

  it('attaches only the person the composition names', () => {
    const result = apply('person [1] braces both hands against the locking dogs.', true)
    expect(result.characterReferencesForImages.map((r: any) => r.name)).toEqual(['Piper Hayes'])
  })

  it('attaches both when the composition places both', () => {
    const result = apply(
      'person [1] hauls on the spanner while person [2] watches from the gantry.',
      true
    )
    expect(result.characterReferencesForImages.map((r: any) => r.name)).toEqual([
      'Piper Hayes',
      'Gideon Croft',
    ])
  })

  it('keeps the scene cast for a non-beat frame, which has no per-beat composition', () => {
    const result = apply(propsOnlyBeat, false)
    expect(result.characterReferencesForImages.map((r: any) => r.name)).toEqual([
      'Piper Hayes',
      'Gideon Croft',
    ])
  })
})
