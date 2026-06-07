import { describe, it, expect } from 'vitest'
import {
  ensureCinematicBookends,
  isCinematicBookendScene,
} from '@/lib/script/cinematicBookends'

describe('cinematicBookends', () => {
  const treatment = {
    title: 'The Last Signal',
    genre: 'sci-fi',
    tone: 'tense',
    author_writer: 'Jane Doe',
  }

  it('prepends title and appends credits when missing', () => {
    const scenes = [
      { sceneNumber: 1, heading: 'INT. LAB - DAY', action: 'Main scene', beats: [] },
    ]
    const result = ensureCinematicBookends(scenes, treatment)

    expect(result.injectedTitle).toBe(true)
    expect(result.injectedOutro).toBe(true)
    expect(result.scenes).toHaveLength(3)
    expect(result.scenes[0].cinematicType).toBe('title')
    expect(result.scenes[0].heading).toContain('TITLE SEQUENCE')
    expect(result.scenes[2].cinematicType).toBe('outro')
    expect(result.scenes[2].heading).toContain('CREDITS')
    expect(result.scenes[0].sceneNumber).toBe(1)
    expect(result.scenes[1].sceneNumber).toBe(2)
    expect(result.scenes[2].sceneNumber).toBe(3)
  })

  it('preserves existing bookend scenes', () => {
    const scenes = [
      {
        sceneNumber: 1,
        heading: 'INT. TITLE SEQUENCE - DAY',
        cinematicType: 'title',
        beats: [{ kind: 'action', actionDescription: 'Title reveal' }],
      },
      { sceneNumber: 2, heading: 'INT. LAB - DAY', action: 'Main', beats: [] },
      {
        sceneNumber: 3,
        heading: 'INT. CREDITS - DAY',
        cinematicType: 'outro',
        beats: [{ kind: 'action', actionDescription: 'Credits roll' }],
      },
    ]
    const result = ensureCinematicBookends(scenes, treatment)

    expect(result.injectedTitle).toBe(false)
    expect(result.injectedOutro).toBe(false)
    expect(result.scenes).toHaveLength(3)
  })

  it('injects fallback beats with action kind only', () => {
    const result = ensureCinematicBookends([], treatment)
    const titleBeats = result.scenes[0].beats as Array<{ kind: string }>
    const outroBeats = result.scenes[1].beats as Array<{ kind: string }>

    expect(titleBeats.length).toBeGreaterThanOrEqual(2)
    expect(titleBeats.every((b) => b.kind === 'action')).toBe(true)
    expect(outroBeats.every((b) => b.kind === 'action')).toBe(true)
  })

  it('isCinematicBookendScene detects title and outro', () => {
    expect(isCinematicBookendScene({ cinematicType: 'title' })).toBe(true)
    expect(isCinematicBookendScene({ cinematicType: 'outro' })).toBe(true)
    expect(isCinematicBookendScene({ heading: 'INT. LAB - DAY' })).toBe(false)
  })
})
