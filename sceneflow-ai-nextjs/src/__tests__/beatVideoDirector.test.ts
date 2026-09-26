import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  applyVideoDirectorPromptToProduction,
  applyVideoDirectorPromptToSegment,
  buildVideoDirectorSystemPrompt,
  parseVideoDirectorPrompt,
  resolveCurrentVideoPrompt,
} from '@/lib/intelligence/beat-video-director-fallback'

describe('parseVideoDirectorPrompt', () => {
  it('strips markdown fences and quotes', () => {
    expect(parseVideoDirectorPrompt('```\nSlow push in.\n```')).toBe('Slow push in.')
    expect(parseVideoDirectorPrompt('"Hold the two-shot."')).toBe('Hold the two-shot.')
  })
})

describe('resolveCurrentVideoPrompt', () => {
  it('prefers a user-edited video prompt', () => {
    expect(
      resolveCurrentVideoPrompt({
        userEditedPrompt: ' user ',
        generatedPrompt: 'generated',
        videoPrompt: 'video',
      })
    ).toBe('user')
  })
})

describe('applyVideoDirectorPromptToProduction', () => {
  it('writes only the video prompt fields and leaves still direction alone', () => {
    const beatDirection = { frozenMoment: 'Piper holds the spanner', generatedBy: 'user' }
    const stillPrompt = 'Two-shot still of Piper and Gideon'
    const segments = [
      {
        segmentId: 'seg-1',
        beatId: 'bt_1',
        userEditedPrompt: null,
        generatedPrompt: 'Old motion',
        videoPrompt: 'Old motion',
        beatDirection,
        storyboardImagePrompt: stillPrompt,
      },
      {
        segmentId: 'seg-2',
        beatId: 'bt_2',
        userEditedPrompt: null,
        generatedPrompt: 'Keep me',
        videoPrompt: 'Keep me',
      },
    ]

    const next = applyVideoDirectorPromptToProduction(
      segments,
      'seg-1',
      'Slow push-in, Piper turns the spanner a quarter-turn'
    )

    expect(next[0]).toMatchObject({
      userEditedPrompt: 'Slow push-in, Piper turns the spanner a quarter-turn',
      generatedPrompt: 'Slow push-in, Piper turns the spanner a quarter-turn',
      videoPrompt: 'Slow push-in, Piper turns the spanner a quarter-turn',
      beatDirection,
      storyboardImagePrompt: stillPrompt,
    })
    expect(next[0].beatDirection).toBe(beatDirection)
    expect(next[1].generatedPrompt).toBe('Keep me')
  })
})

describe('applyVideoDirectorPromptToSegment', () => {
  it('locks the clip to the rewritten prompt', () => {
    const next = applyVideoDirectorPromptToSegment(
      { userEditedPrompt: null, generatedPrompt: 'compiled' },
      '  Hold faces.  '
    )
    expect(next.userEditedPrompt).toBe('Hold faces.')
  })
})

describe('buildVideoDirectorSystemPrompt', () => {
  it('forbids music, stills, and beatDirection patches', () => {
    const prompt = buildVideoDirectorSystemPrompt()
    expect(prompt).toMatch(/Never ask for music, score/i)
    expect(prompt).toMatch(/Do not write beatDirection JSON/)
    expect(prompt).toMatch(/video prompt/)
  })
})

describe('Videos Direction wiring', () => {
  it('opens Direct Beat from the clip gallery instead of rewriting only the video prompt', () => {
    const consoleSrc = readFileSync(
      path.resolve(
        __dirname,
        '../components/vision/scene-production/DirectorConsoleImpl.tsx'
      ),
      'utf8'
    )
    const panel = readFileSync(
      path.resolve(__dirname, '../components/vision/ScriptPanel.tsx'),
      'utf8'
    )
    expect(consoleSrc).toContain('onDirectBeat={onDirectBeat}')
    expect(consoleSrc).not.toContain('BeatVideoDirectorDialog')
    expect(consoleSrc).not.toContain('onDirection={(segment) => handleRequestTake(segment, true)}')
    expect(panel).toContain('layout="dialog"')
    expect(panel).toContain('setDirectBeatId(beatId)')
    expect(panel).toContain('initialSafety={directBeatSafety}')
  })
})
