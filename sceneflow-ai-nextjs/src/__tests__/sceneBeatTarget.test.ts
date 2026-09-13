import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  CINEMATIC_SCENE_BEAT_TARGET,
  MIN_SCENE_BEAT_TARGET,
  SCENE_BEAT_TARGET_KEY,
  SCENE_BEAT_TARGET_PRESETS,
  clampSceneBeatTarget,
  hasStoredSceneBeatTarget,
  resolveSceneTargetBeatCount,
} from '@/lib/script/sceneBeatTarget'
import { MAX_BEATS_PER_SCENE, TARGET_BEATS_PER_SCENE } from '@/lib/script/sceneDecomposition'
import {
  finalizeFlatRevisedScene,
  finalizeStructuredRevisedScene,
} from '@/lib/script/structuredSceneRevision'

const ROOT = join(__dirname, '..', '..')

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

describe('clampSceneBeatTarget', () => {
  it('passes a plausible target through unchanged', () => {
    expect(clampSceneBeatTarget(6)).toBe(6)
    expect(clampSceneBeatTarget(TARGET_BEATS_PER_SCENE)).toBe(TARGET_BEATS_PER_SCENE)
  })

  it('holds a target inside the floor and the ceiling', () => {
    expect(clampSceneBeatTarget(1)).toBe(MIN_SCENE_BEAT_TARGET)
    expect(clampSceneBeatTarget(-40)).toBe(MIN_SCENE_BEAT_TARGET)
    expect(clampSceneBeatTarget(500)).toBe(MAX_BEATS_PER_SCENE)
  })

  it('never returns a target above the ceiling the finalizer enforces', () => {
    expect(clampSceneBeatTarget(MAX_BEATS_PER_SCENE + 1)).toBe(MAX_BEATS_PER_SCENE)
  })

  it('accepts a numeric string from the request body', () => {
    expect(clampSceneBeatTarget('12')).toBe(12)
    expect(clampSceneBeatTarget(11.6)).toBe(12)
  })

  it('returns null for anything that is not a number, so a caller can fall back', () => {
    expect(clampSceneBeatTarget(undefined)).toBeNull()
    expect(clampSceneBeatTarget(null)).toBeNull()
    expect(clampSceneBeatTarget('')).toBeNull()
    expect(clampSceneBeatTarget('twenty')).toBeNull()
    expect(clampSceneBeatTarget(NaN)).toBeNull()
    expect(clampSceneBeatTarget({})).toBeNull()
  })
})

describe('resolveSceneTargetBeatCount', () => {
  it('leaves an ordinary scene on the script-wide target', () => {
    expect(
      resolveSceneTargetBeatCount({ heading: 'INT. OFFICE - DAY', action: 'Marcus reads.' })
    ).toBe(TARGET_BEATS_PER_SCENE)
  })

  it('falls back to the script-wide target with no scene at all', () => {
    expect(resolveSceneTargetBeatCount()).toBe(TARGET_BEATS_PER_SCENE)
    expect(resolveSceneTargetBeatCount(null)).toBe(TARGET_BEATS_PER_SCENE)
  })

  /**
   * The reason this resolver exists: a title card has no twenty beats of story
   * in it, so asking for twenty is what made the model invent them.
   */
  it('starts a title or cinematic scene low instead of at twenty', () => {
    for (const scene of [
      { cinematicType: 'title' },
      { cinematicType: 'promo' },
      { heading: 'OPENING TITLE SEQUENCE' },
      { heading: 'INT. TITLE CARD - BLACK' },
      { heading: 'PROMO TRAILER - MAIN TITLE' },
    ]) {
      expect(resolveSceneTargetBeatCount(scene), JSON.stringify(scene)).toBe(
        CINEMATIC_SCENE_BEAT_TARGET
      )
    }
  })

  it('starts a credits scene low as well', () => {
    expect(resolveSceneTargetBeatCount({ cinematicType: 'outro' })).toBe(
      CINEMATIC_SCENE_BEAT_TARGET
    )
    expect(resolveSceneTargetBeatCount({ heading: 'END CREDITS' })).toBe(
      CINEMATIC_SCENE_BEAT_TARGET
    )
    expect(resolveSceneTargetBeatCount({ heading: 'END TITLE - ROLL' })).toBe(
      CINEMATIC_SCENE_BEAT_TARGET
    )
  })

  it('prefers a stored choice over the smart default in both directions', () => {
    expect(
      resolveSceneTargetBeatCount({ cinematicType: 'title', [SCENE_BEAT_TARGET_KEY]: 24 })
    ).toBe(24)
    expect(
      resolveSceneTargetBeatCount({ heading: 'INT. OFFICE - DAY', [SCENE_BEAT_TARGET_KEY]: 8 })
    ).toBe(8)
  })

  it('clamps a stored choice rather than trusting it', () => {
    expect(resolveSceneTargetBeatCount({ [SCENE_BEAT_TARGET_KEY]: 999 })).toBe(MAX_BEATS_PER_SCENE)
    expect(resolveSceneTargetBeatCount({ [SCENE_BEAT_TARGET_KEY]: 0 })).toBe(MIN_SCENE_BEAT_TARGET)
  })

  it('ignores a corrupt stored value and resolves as if it were absent', () => {
    expect(
      resolveSceneTargetBeatCount({ cinematicType: 'title', [SCENE_BEAT_TARGET_KEY]: 'lots' })
    ).toBe(CINEMATIC_SCENE_BEAT_TARGET)
    expect(resolveSceneTargetBeatCount({ [SCENE_BEAT_TARGET_KEY]: null })).toBe(
      TARGET_BEATS_PER_SCENE
    )
  })
})

describe('hasStoredSceneBeatTarget', () => {
  it('tells a stored choice apart from a resolved default', () => {
    expect(hasStoredSceneBeatTarget({ [SCENE_BEAT_TARGET_KEY]: 6 })).toBe(true)
    expect(hasStoredSceneBeatTarget({ cinematicType: 'title' })).toBe(false)
    expect(hasStoredSceneBeatTarget({})).toBe(false)
    expect(hasStoredSceneBeatTarget(null)).toBe(false)
  })
})

describe('SCENE_BEAT_TARGET_PRESETS', () => {
  it('offers every preset as a target the clamp will accept unchanged', () => {
    for (const preset of SCENE_BEAT_TARGET_PRESETS) {
      expect(clampSceneBeatTarget(preset.value), preset.label).toBe(preset.value)
    }
  })

  it('spans the cinematic default up to the hard ceiling', () => {
    const values = SCENE_BEAT_TARGET_PRESETS.map((p) => p.value)
    expect(values[0]).toBe(CINEMATIC_SCENE_BEAT_TARGET)
    expect(values).toContain(TARGET_BEATS_PER_SCENE)
    expect(values[values.length - 1]).toBe(MAX_BEATS_PER_SCENE)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
  })

  it('labels each preset for the editor', () => {
    for (const preset of SCENE_BEAT_TARGET_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0)
      expect(preset.hint.length).toBeGreaterThan(0)
    }
  })
})

describe('target persistence through revise and apply', () => {
  const currentScene = {
    heading: 'INT. TITLE SEQUENCE - BLACK',
    cinematicType: 'title',
    action: 'Cards resolve out of black.',
  }
  const parsed = {
    beats: [
      { kind: 'action', actionDescription: 'A logo burns in.' },
      { kind: 'action', actionDescription: 'It fades to black.' },
    ],
  }

  it('stamps the target the structured revision was written to', () => {
    const scene = finalizeStructuredRevisedScene(parsed, currentScene, [], {}, {
      revisionDepth: 'deep',
      targetBeats: CINEMATIC_SCENE_BEAT_TARGET,
    })
    expect(scene[SCENE_BEAT_TARGET_KEY]).toBe(CINEMATIC_SCENE_BEAT_TARGET)
  })

  it('stamps the target on a flat revision too', () => {
    const scene = finalizeFlatRevisedScene(
      { action: 'Cards resolve.' },
      currentScene,
      [],
      {},
      { revisionDepth: 'moderate', targetBeats: 8 }
    )
    expect(scene[SCENE_BEAT_TARGET_KEY]).toBe(8)
  })

  it('clamps the stamped target so a bad request cannot persist an impossible one', () => {
    const scene = finalizeStructuredRevisedScene(parsed, currentScene, [], {}, {
      revisionDepth: 'moderate',
      targetBeats: 400,
    })
    expect(scene[SCENE_BEAT_TARGET_KEY]).toBe(MAX_BEATS_PER_SCENE)
  })

  it('leaves an existing target alone when a revision does not carry one', () => {
    const scene = finalizeStructuredRevisedScene(
      parsed,
      { ...currentScene, [SCENE_BEAT_TARGET_KEY]: 6 },
      [],
      {},
      { revisionDepth: 'moderate' }
    )
    expect(scene[SCENE_BEAT_TARGET_KEY]).toBe(6)
  })

  it('stamps nothing on a scene that never had a target', () => {
    const scene = finalizeStructuredRevisedScene(parsed, currentScene, [], {}, {
      revisionDepth: 'moderate',
    })
    expect(SCENE_BEAT_TARGET_KEY in scene).toBe(false)
  })

  /**
   * `__revisionDepth` is stripped on apply because it only tells apply how to
   * treat assets. The target is a real authored field and must reach the save.
   */
  it('is not stripped on apply the way the revision depth stamp is', () => {
    const applySource = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(applySource).toContain('delete cleanedScene[REVISION_DEPTH_SCENE_KEY]')
    expect(applySource).not.toContain('delete cleanedScene[SCENE_BEAT_TARGET_KEY]')
    expect(applySource).not.toContain("delete cleanedScene['targetBeatCount']")
    expect(applySource).not.toContain('delete cleanedScene.targetBeatCount')
  })

  it('reads the target back out of a saved scene on the next revision', () => {
    const saved = finalizeStructuredRevisedScene(parsed, currentScene, [], {}, {
      revisionDepth: 'deep',
      targetBeats: CINEMATIC_SCENE_BEAT_TARGET,
    })
    delete saved.__revisionDepth
    expect(resolveSceneTargetBeatCount(saved)).toBe(CINEMATIC_SCENE_BEAT_TARGET)
    expect(hasStoredSceneBeatTarget(saved)).toBe(true)
  })
})

describe('scene editor beat target control', () => {
  const source = readSource('src/components/vision/SceneEditorModalV2.tsx')

  it('seeds the control from the same resolver the route uses', () => {
    expect(source).toContain('resolveSceneTargetBeatCount')
    expect(source).toContain('SCENE_BEAT_TARGET_PRESETS')
  })

  it('sends the chosen target to revise-scene', () => {
    expect(source).toContain('targetBeatCount,')
  })

  it('re-reads the scene target on open rather than resetting to a constant', () => {
    expect(source).toContain('setTargetBeatCount(resolveSceneTargetBeatCount(scene))')
  })
})

describe('shared scene classification', () => {
  it('keeps one credits classifier rather than a copy per caller', () => {
    const classification = readSource('src/lib/script/sceneClassification.ts')
    const migration = readSource('src/lib/script/beatMigration.ts')

    expect(classification).toContain('export function isCreditsScene')
    expect(migration).not.toMatch(/^function isCreditsScene/m)
    expect(migration).toContain("from '@/lib/script/sceneClassification'")
  })
})
