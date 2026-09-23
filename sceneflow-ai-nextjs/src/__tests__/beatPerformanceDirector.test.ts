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
  it('tells the model to rewrite the line or the action, not the frame', () => {
    const system = buildBeatPerformanceSystemPrompt()
    expect(system).toContain('spoken line and its delivery')
    expect(system).toContain('action description')
    expect(system).toContain('Do not change the story')
    expect(system).toContain('Do not rename the speaker')
    expect(system).not.toContain('frozenMoment')
    expect(system).not.toContain('castInFrame')

    const user = buildBeatPerformanceUserPrompt({
      mode: 'rewrite',
      beat: spokenBeat(),
      beatIndex: 0,
      scene: { heading: 'INT. KITCHEN', purpose: 'Maya decides to stay.' },
      userDirection: 'She is furious, and she says she is not going anywhere.',
    })
    expect(user).toContain('She is furious')
    expect(user).toContain('Maya decides to stay')
    expect(user).toContain('do not override the story or who is speaking')
  })

  it('keeps the line and ignores frame fields the model still returns', () => {
    const patch = parseBeatPerformancePatch(
      {
        line: 'I am not going anywhere.',
        voiceDirection: 'Through her teeth.',
        emotion: 'fury, jaw tight',
        frozenMoment: 'Maya plants both hands on the table.',
        castInFrame: ['Maya', 'Stranger'],
      },
      spokenBeat(),
      { characters: [{ name: 'Maya' }] }
    )
    expect(patch).toEqual({
      line: 'I am not going anywhere.',
      voiceDirection: 'Through her teeth.',
    })
  })

  it('saves the line and leaves the frame, the still, and the video prompt alone', () => {
    const scene = {
      characters: [{ name: 'Maya' }],
      dialogue: [{ lineId: 'ln_1', character: 'Maya', line: 'We should leave.', kind: 'dialogue' }],
      beats: [
        {
          ...spokenBeat(),
          storyboardImageUrl: 'https://example.com/still.jpg',
          storyboardImagePrompt: 'Old still.',
        },
      ],
      segments: [
        {
          beatId: 'bt_line',
          generatedPrompt: 'Old clip.',
          videoPrompt: 'Old clip.',
        },
      ],
    }
    const { scene: next, proseChanged } = applyBeatPerformanceDirectorToScene(scene, 'bt_line', {
      line: 'I am not going anywhere.',
      voiceDirection: 'Through her teeth.',
    })

    const [beat] = getSceneBeats(next)
    expect(proseChanged).toBe(true)
    expect(beat.character).toBe('Maya')
    expect(beat.line).toBe('I am not going anywhere.')
    expect(beat.voiceDirection).toBe('Through her teeth.')
    expect(beat.beatDirection?.emotion).toBe('calm')
    expect(beat.beatDirection?.generatedBy).toBe('llm')
    expect(beat.beatDirection?.castInFrame).toEqual(['Maya'])
    expect(beat.storyboardImageUrl).toBe('https://example.com/still.jpg')
    expect(beat.storyboardImagePrompt).toBe('Old still.')
    const dialogue = next.dialogue as Array<{ line?: string; lineId?: string; voiceDirection?: string }>
    expect(dialogue[0]?.lineId).toBe('ln_1')
    expect(dialogue[0]?.line).toBe('I am not going anywhere.')
    expect(dialogue[0]?.voiceDirection).toBe('Through her teeth.')
    const segments = next.segments as Array<{ videoPrompt?: string }>
    expect(segments[0]?.videoPrompt).toBe('Old clip.')
  })

  it('saves an action description without writing a spoken line', () => {
    const action: SceneBeat = {
      beatId: 'bt_action',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'She sets the cup down.',
      beatDirection: { shotType: 'Wide Shot', emotion: 'calm', generatedBy: 'llm' },
      storyboardImagePrompt: 'Old still.',
    }
    const scene = { beats: [action], action: 'She sets the cup down.' }
    const { scene: next } = applyBeatPerformanceDirectorToScene(scene, 'bt_action', {
      actionDescription: 'She shoves the cup away.',
      line: 'This line must not land on an action beat.',
    })
    const [beat] = getSceneBeats(next)
    expect(beat.actionDescription).toBe('She shoves the cup away.')
    expect(beat.line).toBeUndefined()
    expect(beat.beatDirection?.shotType).toBe('Wide Shot')
    expect(beat.storyboardImagePrompt).toBe('Old still.')
    expect(next.action).toBe('She shoves the cup away.')
  })

  it('is opened from the beat list and does not write the database in the route', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    const dialog = readSource('src/components/vision/BeatPerformanceDirectorDialog.tsx')
    const route = readSource('src/app/api/scene/direct-beat/route.ts')
    expect(panel).toContain('BeatPerformanceDirectorControl')
    expect(dialog).not.toContain('onGenerateStill')
    expect(dialog).not.toContain('saveAndGenerate')
    expect(route).toContain('directBeatPerformance')
    expect(route).not.toContain('actionFraming')
    expect(route).not.toContain('project.save')
    expect(route).not.toContain('persistVisionScriptScenes')
  })
})
