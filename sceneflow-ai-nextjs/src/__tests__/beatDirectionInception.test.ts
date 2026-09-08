import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildBeatDirectionPromptBlock,
  buildBeatDirectionSchemaExample,
  buildBeatTimelineNarrationRules,
} from '@/lib/script/narrationPolicy'
import { migrateProjectBeatDirection } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('script inception ships beat direction contracts', () => {
  it('narration policy exposes an authoritative BeatDirection rule block', () => {
    const block = buildBeatDirectionPromptBlock()
    expect(block).toMatch(/beatDirection/)
    expect(block.toLowerCase()).toContain('shot')
    expect(block.toLowerCase()).toContain('emotion')
    expect(block.toLowerCase()).toContain('gaze')
    expect(block).toMatch(/transition/i)
  })

  it('narration policy schema example inlines BeatDirection JSON snippet', () => {
    const example = buildBeatDirectionSchemaExample()
    // The snippet is inlined into a larger sample beat, so it is a partial JSON
    // fragment beginning with a key. Wrap it into an object to parse.
    const wrapped = JSON.parse(`{${example.replace(/\s+$/, '')}}`)
    expect(wrapped).toBeTruthy()
    expect(wrapped.beatDirection).toBeDefined()
    expect(wrapped.beatDirection.shotType).toBeTruthy()
    expect(wrapped.beatDirection.transition).toMatch(/CUT|CONTINUE|DISSOLVE|FADE|MATCH_CUT/)
  })

  it('beat timeline narration rules reference beat direction', () => {
    const rules = buildBeatTimelineNarrationRules({
      mode: 'moderate',
      allowNarration: true,
      allowPerSceneNarration: true,
      maxNarrationPerScene: 1,
      allowedPositions: ['opening', 'closing'],
      blueprintHasNarrator: false,
    })
    expect(rules.toLowerCase()).toMatch(/beat\s*direction|beatdirection/)
  })

  it('generate-script-v2 route imports the beat-direction migration + wires it after direction attach', () => {
    const source = readSource('src/app/api/vision/generate-script-v2/route.ts')
    expect(source).toContain('migrateProjectBeatDirection')

    const attachIdx = source.indexOf('attachSceneDirectionsToScript')
    const migrateIdx = source.indexOf('migrateProjectBeatDirection(metadataToPersist)')
    expect(attachIdx).toBeGreaterThan(-1)
    expect(migrateIdx).toBeGreaterThan(-1)
    expect(migrateIdx).toBeGreaterThan(attachIdx)
  })

  it('revise-scene route asks the LLM to emit beatDirection and lets clients preserve it', () => {
    const source = readSource('src/app/api/vision/revise-scene/route.ts')
    expect(source).toContain('beatDirection')
    expect(source).toMatch(/preserve.*beatDirection|beatDirection.*preserve/i)
  })
})

describe('beat direction present after inception + backfill', () => {
  it('every parsed beat receives a beatDirection after migration runs', () => {
    const beats: SceneBeat[] = [
      {
        beatId: 'b1',
        sequenceIndex: 0,
        kind: 'action',
        actionDescription: 'Elara faces the console.',
      },
      {
        beatId: 'b2',
        sequenceIndex: 1,
        kind: 'dialogue',
        character: 'ELARA',
        line: 'Ready.',
      },
    ]
    const metadata = {
      visionPhase: {
        script: {
          script: {
            scenes: [
              {
                heading: 'INT. CONTROL ROOM - NIGHT',
                sceneDirection: {
                  camera: {
                    shots: ['Wide', 'Medium Close-Up'],
                    movement: 'slow drift',
                  },
                  scene: { keyProps: ['Journal'] },
                  keyProps: ['Journal'],
                  lighting: { overallMood: 'anxious teal' },
                  talent: { emotionalBeat: 'wary' },
                },
                beats,
              },
            ],
          },
        },
      },
    }
    const result = migrateProjectBeatDirection(metadata)
    const nextScenes =
      (result.metadata as any).visionPhase.script.script.scenes[0].beats
    expect(nextScenes[0].beatDirection).toBeDefined()
    expect(nextScenes[1].beatDirection).toBeDefined()
    expect(nextScenes[0].beatDirection.transition).toBe('CUT')
  })
})
