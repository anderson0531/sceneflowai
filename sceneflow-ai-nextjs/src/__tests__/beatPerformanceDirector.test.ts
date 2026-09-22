import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  applyBeatPerformanceDirectorToScene,
  buildBeatPerformanceSystemPrompt,
  buildBeatPerformanceUserPrompt,
  parseBeatPerformancePatch,
} from '@/lib/intelligence/beat-performance-director-fallback'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

function spokenBeat(): SceneBeat {
  return {
    beatId: 'bt_line',
    sequenceIndex: 0,
    kind: 'dialogue',
    character: 'Maya',
    line: 'We should leave.',
    voiceDirection: 'Flat.',
    lineId: 'ln_1',
    beatDirection: {
      shotType: 'Medium Shot',
      emotion: 'calm',
      castInFrame: ['Maya'],
      generatedBy: 'llm',
    },
  }
}

describe('beat performance director', () => {
  it('tells the model that user notes own the line and emotion, not the story or the cast', () => {
    const system = buildBeatPerformanceSystemPrompt()
    expect(system).toContain('authoritative for the line, the action, and the emotion')
    expect(system).toContain('Do not change the story')
    expect(system).toContain('Keep cast labels exactly')

    const user = buildBeatPerformanceUserPrompt({
      mode: 'rewrite',
      beat: spokenBeat(),
      beatIndex: 0,
      scene: { heading: 'INT. KITCHEN', purpose: 'Maya decides to stay.' },
      userDirection: 'She is furious, and she says she is not going anywhere.',
    })
    expect(user).toContain('She is furious')
    expect(user).toContain('Maya decides to stay')
    expect(user).toContain('do not override the story or the cast labels')
  })

  it('drops a cast label the scene does not have', () => {
    const scene = { characters: [{ name: 'Maya' }] }
    const patch = parseBeatPerformancePatch(
      {
        line: 'I am not going anywhere.',
        voiceDirection: 'Through her teeth.',
        emotion: 'fury, jaw tight',
        frozenMoment: 'Maya plants both hands on the table.',
        castInFrame: ['Maya', 'Stranger'],
      },
      spokenBeat(),
      scene
    )
    expect(patch?.line).toBe('I am not going anywhere.')
    expect(patch?.direction.emotion).toBe('fury, jaw tight')
    expect(patch?.direction.castInFrame).toEqual(['Maya'])
  })

  it('saves the line, the emotion, the still prompt, and the video prompt', () => {
    const scene = {
      characters: [{ name: 'Maya' }],
      dialogue: [{ lineId: 'ln_1', character: 'Maya', line: 'We should leave.', kind: 'dialogue' }],
      beats: [spokenBeat()],
      segments: [
        {
          beatId: 'bt_line',
          generatedPrompt: 'Old clip.',
          videoPrompt: 'Old clip.',
        },
      ],
    }
    const { scene: next, proseChanged } = applyBeatPerformanceDirectorToScene(
      scene,
      'bt_line',
      {
        line: 'I am not going anywhere.',
        voiceDirection: 'Through her teeth.',
        direction: {
          emotion: 'fury, jaw tight',
          frozenMoment: 'Maya plants both hands on the table.',
          castInFrame: ['Stranger'],
        },
      },
      { generatedBy: 'user' }
    )

    const [beat] = getSceneBeats(next)
    expect(proseChanged).toBe(true)
    expect(beat.character).toBe('Maya')
    expect(beat.line).toBe('I am not going anywhere.')
    expect(beat.voiceDirection).toBe('Through her teeth.')
    expect(beat.beatDirection?.emotion).toBe('fury, jaw tight')
    expect(beat.beatDirection?.generatedBy).toBe('user')
    expect(beat.beatDirection?.castInFrame).toEqual(['Maya'])
    expect(beat.storyboardImageUrl).toBeUndefined()
    expect(beat.storyboardImagePrompt).toContain('Maya plants both hands on the table')
    const dialogue = next.dialogue as Array<{ line?: string; lineId?: string }>
    expect(dialogue[0]?.lineId).toBe('ln_1')
    expect(dialogue[0]?.line).toBe('I am not going anywhere.')
    const segments = next.segments as Array<{ videoPrompt?: string }>
    expect(segments[0]?.videoPrompt).toContain('I am not going anywhere.')
    expect(segments[0]?.videoPrompt).toContain('fury, jaw tight')
  })

  it('is opened from the beat list and does not write the database in the route', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    const route = readSource('src/app/api/scene/direct-beat/route.ts')
    expect(panel).toContain('BeatPerformanceDirectorControl')
    expect(route).toContain('directBeatPerformance')
    expect(route).not.toContain('project.save')
    expect(route).not.toContain('persistVisionScriptScenes')
  })
})
