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
})

describe('revise-scene beat volume prompt', () => {
  const source = readSource('src/app/api/vision/revise-scene/route.ts')

  it('feeds the shared beat volume block into the revision prompt', () => {
    expect(source).toContain('buildRevisionBeatVolumeBlock')
    expect(source).toContain('TARGET_BEATS_PER_SCENE')
    expect(source).toContain('${buildRevisionBeatVolumeBlock()}')
  })

  it('no longer states the ceiling as the only beat-count instruction', () => {
    expect(source).not.toMatch(
      /Return the FULL ordered beats\[\] array for the revised scene \(MAX \$\{MAX_BEATS_PER_SCENE\}/
    )
    expect(source).toContain('${TARGET_BEATS_PER_SCENE} beats is the target')
  })

  it('tells the model how many beats the scene currently has', () => {
    expect(source).toContain('BEATS (${currentBeats.length} in the current scene')
    expect(source).toContain('this scene currently has ${currentBeats.length} beats')
  })

  it('licenses a Restructure to grow past the original beat count', () => {
    expect(source).toMatch(/A restructure may run well past the original beat count/)
    expect(source).toMatch(/add beats toward the ~\$\{TARGET_BEATS_PER_SCENE\}-beat target/)
    expect(source).toMatch(/Hold the beat count roughly where it is/)
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
