import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { enforceMaxBeatsPerScene } from '@/lib/script/structuredSceneRevision'
import { buildRevisionBeatVolumeBlock } from '@/lib/script/scriptCraftPrompt'
import { SCENE_OPTIMIZATION_TEMPLATES } from '@/lib/constants/scene-optimization'
import { MAX_BEATS_PER_SCENE, TARGET_BEATS_PER_SCENE } from '@/lib/script/sceneDecomposition'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const ROOT = join(__dirname, '..', '..')

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

function makeBeats(count: number): SceneBeat[] {
  return Array.from({ length: count }, (_, index) => ({
    beatId: `bt_${index}`,
    sequenceIndex: index,
    kind: 'action' as const,
    actionDescription: `Beat ${index}`,
  }))
}

describe('enforceMaxBeatsPerScene', () => {
  it('passes a scene at the ceiling through untouched', () => {
    const beats = makeBeats(MAX_BEATS_PER_SCENE)
    expect(enforceMaxBeatsPerScene(beats)).toBe(beats)
  })

  it('truncates a scene one beat over the ceiling', () => {
    const kept = enforceMaxBeatsPerScene(makeBeats(MAX_BEATS_PER_SCENE + 1))
    expect(kept).toHaveLength(MAX_BEATS_PER_SCENE)
    expect(kept[kept.length - 1].beatId).toBe(`bt_${MAX_BEATS_PER_SCENE - 1}`)
  })

  it('does not cap a scene written to the target', () => {
    expect(enforceMaxBeatsPerScene(makeBeats(TARGET_BEATS_PER_SCENE))).toHaveLength(
      TARGET_BEATS_PER_SCENE
    )
  })
})

describe('buildRevisionBeatVolumeBlock', () => {
  it('states the target as well as the ceiling', () => {
    const block = buildRevisionBeatVolumeBlock()
    expect(block).toContain(`${TARGET_BEATS_PER_SCENE} beats`)
    expect(block).toContain(`${MAX_BEATS_PER_SCENE} beats`)
    expect(block).toMatch(/never exceed that cap/i)
  })

  it('tells the model the original count is not a target to match', () => {
    const block = buildRevisionBeatVolumeBlock()
    expect(block).toMatch(/original beat count is NOT a target/i)
    expect(block).toMatch(/thin scene.*is a failure/i)
    expect(block).toMatch(/filling the ceiling is not the target/i)
  })

  it('interpolates the constants instead of hardcoding the old fifteen-beat cap', () => {
    const block = buildRevisionBeatVolumeBlock()
    expect(block).not.toMatch(/\b15\b/)
    const source = readSource('src/lib/script/scriptCraftPrompt.ts')
    expect(source).toContain('buildRevisionBeatVolumeBlock')
    expect(source).toContain('TARGET_BEATS_PER_SCENE')
  })

  it('defaults to the script-wide target when no scene target is given', () => {
    expect(buildRevisionBeatVolumeBlock()).toBe(
      buildRevisionBeatVolumeBlock(TARGET_BEATS_PER_SCENE)
    )
  })

  it('writes to a custom target above the default without changing the framing', () => {
    const block = buildRevisionBeatVolumeBlock(MAX_BEATS_PER_SCENE)
    expect(block).toContain(`TARGET IS ${MAX_BEATS_PER_SCENE}`)
    expect(block).toMatch(/original beat count is NOT a target/i)
  })

  /**
   * The load-bearing case. A scene set below the script-wide target was set
   * there because the default produced invented business, so the block must
   * stop telling the model that a short scene is a failure.
   */
  it('tells a deliberately short scene not to pad toward the default', () => {
    const block = buildRevisionBeatVolumeBlock(6)

    expect(block).toContain('TARGET IS 6 FOR THIS SCENE')
    expect(block).toMatch(/Do NOT pad toward 20/)
    expect(block).toMatch(/set deliberately short/i)
    expect(block).toMatch(/beats invented to reach a number/i)
  })

  it('drops the grow-the-scene language a short scene must not follow', () => {
    const block = buildRevisionBeatVolumeBlock(6)

    expect(block).not.toMatch(/original beat count is NOT a target/i)
    expect(block).not.toMatch(/thin scene.*is a failure/i)
    expect(block).not.toMatch(/room to add the beats/i)
  })

  it('still names the hard ceiling for a short scene', () => {
    const block = buildRevisionBeatVolumeBlock(6)
    expect(block).toContain(`never exceed ${MAX_BEATS_PER_SCENE}`)
  })

  it('keeps the no-padding rule at every target below the default', () => {
    for (const target of [4, 6, 12, TARGET_BEATS_PER_SCENE - 1]) {
      const block = buildRevisionBeatVolumeBlock(target)
      expect(block, `target ${target}`).toMatch(/Do NOT pad toward/)
      expect(block, `target ${target}`).toContain(`TARGET IS ${target} FOR THIS SCENE`)
    }
  })
})

describe('revise-scene beat volume prompt', () => {
  const source = readSource('src/app/api/vision/revise-scene/route.ts')

  it('feeds the shared beat volume block into the revision prompt', () => {
    expect(source).toContain('buildRevisionBeatVolumeBlock')
    expect(source).toContain('${buildRevisionBeatVolumeBlock(targetBeats)}')
  })

  it('no longer states the ceiling as the only beat-count instruction', () => {
    expect(source).not.toMatch(
      /Return the FULL ordered beats\[\] array for the revised scene \(MAX \$\{MAX_BEATS_PER_SCENE\}/
    )
    expect(source).toContain('${targetBeats} beats is the target')
  })

  it('tells the model how many beats the scene currently has', () => {
    expect(source).toContain('BEATS (${currentBeats.length} in the current scene')
    expect(source).toContain('this scene currently has ${currentBeats.length} beats')
  })

  it('licenses a Restructure to depart from the original beat count', () => {
    expect(source).toMatch(/A restructure is free to depart from the original beat count/)
    expect(source).toMatch(/work toward the ~\$\{targetBeats\}-beat target/)
    expect(source).toMatch(/Hold the beat count roughly where it is/)
  })

  /**
   * Every beat-count instruction must read the resolved scene target. One left
   * on the constant would tell the model 20 while the rest said 6, and a
   * contradicted prompt is how the filler came back.
   */
  it('reads the resolved target at every beat-count instruction', () => {
    expect(source).toContain('${targetBeats}-beat target for this scene')
    expect(source).toContain('${targetBeats} beats is the target for this scene')
    expect(source).toContain('The target is ~${targetBeats}')
    expect(source).toContain('target ${targetBeats}')
    expect(source).toContain('(target ${targetBeats}, cap ${MAX_BEATS_PER_SCENE}')
  })

  it('no longer states the script-wide constant as this scene\u2019s target', () => {
    expect(source).not.toContain('~${TARGET_BEATS_PER_SCENE}-beat target')
    expect(source).not.toContain('${TARGET_BEATS_PER_SCENE} beats is the target')
    expect(source).not.toContain('The target is ~${TARGET_BEATS_PER_SCENE}')
    expect(source).not.toContain('(target ${TARGET_BEATS_PER_SCENE},')
  })

  it('resolves the target from the request, then the scene', () => {
    expect(source).toContain('clampSceneBeatTarget(targetBeatCount) ?? resolveSceneTargetBeatCount')
    expect(source).toContain('targetBeatCount?: number')
  })

  it('steers a scene sitting over its target toward cutting, not padding', () => {
    expect(source).toContain('currentBeats.length > targetBeats')
    expect(source).toMatch(/cut the beats that carry the least/)
    expect(source).toMatch(/It sits under the target, so treat that gap as room/)
  })

  it('passes the target to the finalizer so the choice is persisted', () => {
    expect(source).toContain('{ revisionDepth, targetBeats }')
  })

  it('does not read "condense" as an instruction to cut beats', () => {
    expect(source).not.toMatch(/says "condense" the result should have FEWER lines/)
    expect(source).toMatch(/not an instruction to cut the scene's beat count/)
  })

  it('leaves output headroom for a scene written to the beat target', () => {
    expect(source).toContain('maxOutputTokens: 32768')
    expect(source).not.toContain('maxOutputTokens: 16384')
  })

  it('logs the before and after beat counts', () => {
    expect(source).toContain('${currentBeats.length} beats in, ${parsed.beats.length} out')
  })
})

describe('scene optimization quick actions', () => {
  it('does not ask Improve Pacing to narrow the scene to its key beats', () => {
    const pacing = SCENE_OPTIMIZATION_TEMPLATES.find((t) => t.id === 'improve-pacing')
    expect(pacing).toBeDefined()
    expect(pacing!.instruction).toMatch(/expand moments that need more breathing room/)
    expect(pacing!.instruction).not.toMatch(/key beats/i)
  })

  it('keeps no quick action instructing a beat-count reduction', () => {
    for (const template of SCENE_OPTIMIZATION_TEMPLATES) {
      expect(template.instruction).not.toMatch(/fewer beats|remove beats|cut beats/i)
    }
  })
})
