import { describe, expect, it } from 'vitest'
import { adaptPromptForLyria } from '@/lib/audio/lyriaPromptAdapter'
import {
  MAX_MUSIC_CUES,
  adoptLegacySceneTrack,
  applySceneMusicCues,
  buildMusicCueId,
  deriveSceneMusicCues,
  ensureSceneMusicCues,
  estimateMusicCueDuration,
  formatMusicCueRange,
  formatMusicCueSteer,
  getSceneMusicCues,
  isMusicCueScored,
  musicCueBudget,
  parsePersistedMusicCues,
  planSceneMusicCues,
  resolveBeatMusicCue,
} from '@/lib/script/sceneMusicCues'
import type { SceneBeat, SceneMovement, SceneMusicCue } from '@/lib/script/segmentTypes'

function beat(index: number, overrides: Partial<SceneBeat> = {}): SceneBeat {
  return {
    beatId: `b${index}`,
    sequenceIndex: index,
    kind: 'action',
    actionDescription: `Beat ${index}`,
    ...overrides,
  }
}

function beats(count: number, overrides: (index: number) => Partial<SceneBeat> = () => ({})) {
  return Array.from({ length: count }, (_, index) => beat(index, overrides(index)))
}

function movement(index: number, beatStart: number, beatEnd: number, summary: string): SceneMovement {
  return { index, summary, beatStart, beatEnd, generatedBy: 'derived' }
}

describe('planSceneMusicCues', () => {
  it('normalizes an LLM plan into cues with stable ids and Lyria-ready briefs', () => {
    const cues = planSceneMusicCues(
      [
        {
          beatStart: 2,
          beatEnd: 5,
          intent: 'rising dread',
          description:
            'Cinematic orchestral score, ominous mood, low strings and sub-bass drone, slow tempo',
          entry: 'fade',
          exit: 'tail',
        },
      ],
      beats(8)
    )

    expect(cues).toHaveLength(1)
    expect(cues[0].cueId).toBe(buildMusicCueId(2, 5))
    expect(cues[0].beatStart).toBe(2)
    expect(cues[0].beatEnd).toBe(5)
    expect(cues[0].intent).toBe('rising dread')
    expect(cues[0].entry).toBe('fade')
    expect(cues[0].exit).toBe('tail')
    expect(cues[0].generatedBy).toBe('llm')
    expect(cues[0].description).toBe(
      adaptPromptForLyria(
        'Cinematic orchestral score, ominous mood, low strings and sub-bass drone, slow tempo'
      )
    )
  })

  it('shifts a plan the model numbered from 1 back onto 0-based beats', () => {
    const cues = planSceneMusicCues(
      [
        { beatStart: 1, beatEnd: 2, description: 'Ambient score, uneasy mood, slow tempo' },
        { beatStart: 5, beatEnd: 6, description: 'Orchestral score, urgent mood, fast tempo' },
      ],
      beats(6)
    )

    expect(cues.map((cue) => [cue.beatStart, cue.beatEnd])).toEqual([
      [0, 1],
      [4, 5],
    ])
  })

  it('drops a cue that overlaps one already placed', () => {
    const cues = planSceneMusicCues(
      [
        { beatStart: 0, beatEnd: 3, description: 'Ambient score, uneasy mood, slow tempo' },
        { beatStart: 2, beatEnd: 4, description: 'Orchestral score, urgent mood, fast tempo' },
      ],
      beats(8)
    )

    expect(cues).toHaveLength(1)
    expect(cues[0].beatEnd).toBe(3)
  })

  it('clamps a cue running past the last beat', () => {
    const cues = planSceneMusicCues(
      [{ beatStart: 6, beatEnd: 40, description: 'Ambient score, uneasy mood, slow tempo' }],
      beats(8)
    )

    expect(cues[0].beatEnd).toBe(7)
  })

  it('caps the plan at MAX_MUSIC_CUES', () => {
    const raw = Array.from({ length: 8 }, (_, index) => ({
      beatStart: index * 2,
      beatEnd: index * 2 + 1,
      description: 'Ambient score, uneasy mood, slow tempo',
    }))

    expect(planSceneMusicCues(raw, beats(20))).toHaveLength(MAX_MUSIC_CUES)
  })

  it('ignores entries with no usable brief', () => {
    const cues = planSceneMusicCues(
      [
        { beatStart: 0, beatEnd: 1, description: 'sad' },
        { beatStart: 3, beatEnd: 4 },
      ],
      beats(8)
    )

    expect(cues).toHaveLength(0)
  })
})

describe('musicCueBudget', () => {
  it('scores nothing when the scene has no movements', () => {
    expect(musicCueBudget(0)).toBe(0)
  })

  it('scores the only movement of a single-movement scene', () => {
    expect(musicCueBudget(1)).toBe(1)
  })

  it('leaves at least one movement dry once a scene has more than one', () => {
    for (const count of [2, 3, 4, 5, 6, 10]) {
      expect(musicCueBudget(count)).toBeLessThan(count)
    }
  })

  it('never exceeds MAX_MUSIC_CUES', () => {
    expect(musicCueBudget(20)).toBe(MAX_MUSIC_CUES)
  })
})

describe('deriveSceneMusicCues', () => {
  const arcBeats = [
    beat(0, { actionDescription: 'They compare notes across the table.' }),
    beat(1, { actionDescription: 'A shadow stalks the hallway, menacing and silent.' }),
    beat(2, { actionDescription: 'He slams her against the wall in a brutal attack.' }),
    beat(3, { actionDescription: 'She realizes the truth, stunned by the revelation.' }),
  ]
  const arc = [
    movement(0, 0, 0, 'They compare notes across the table.'),
    movement(1, 1, 1, 'A shadow stalks the hallway, menacing and silent.'),
    movement(2, 2, 2, 'He slams her against the wall in a brutal attack.'),
    movement(3, 3, 3, 'She realizes the truth, stunned by the revelation.'),
  ]

  it('scores the charged movements and leaves the procedural one dry', () => {
    const cues = deriveSceneMusicCues({}, arcBeats, arc)

    expect(cues.length).toBeGreaterThan(0)
    expect(cues.length).toBeLessThan(arc.length)
    expect(cues.some((cue) => cue.beatStart === 0)).toBe(false)
  })

  it('gives the first cue the scene’s own music brief when the script wrote one', () => {
    const brief = 'Cinematic orchestral score, ominous mood, low strings, slow tempo'
    const cues = deriveSceneMusicCues({ music: { description: brief } }, arcBeats, arc)

    expect(cues[0].description).toBe(adaptPromptForLyria(brief))
    expect(cues.slice(1).every((cue) => cue.description !== adaptPromptForLyria(brief))).toBe(true)
  })

  it('returns nothing when no movement carries a scorable emotion', () => {
    const flatBeats = [
      beat(0, { actionDescription: 'He files the paperwork.' }),
      beat(1, { actionDescription: 'She stamps the form and hands it back.' }),
    ]
    const flatArc = [
      movement(0, 0, 0, 'He files the paperwork.'),
      movement(1, 1, 1, 'She stamps the form and hands it back.'),
    ]

    expect(deriveSceneMusicCues({}, flatBeats, flatArc)).toHaveLength(0)
  })

  it('merges adjacent movements reaching for the same music into one cue', () => {
    const dreadBeats = [
      beat(0, { actionDescription: 'A menacing shadow stalks the corridor.' }),
      beat(1, { actionDescription: 'The foreboding hum grows, an ominous threat.' }),
      beat(2, { actionDescription: 'She signs the delivery slip.' }),
    ]
    const dreadArc = [
      movement(0, 0, 0, 'A menacing shadow stalks the corridor.'),
      movement(1, 1, 1, 'The foreboding hum grows, an ominous threat.'),
      movement(2, 2, 2, 'She signs the delivery slip.'),
    ]

    const cues = deriveSceneMusicCues({}, dreadBeats, dreadArc)
    expect(cues).toHaveLength(1)
    expect(cues[0].beatStart).toBe(0)
    expect(cues[0].beatEnd).toBe(1)
  })

  it('reads emotion from beat direction as well as action text', () => {
    const directedBeats = [
      beat(0, { actionDescription: 'She sets the cup down.' }),
      beat(1, {
        actionDescription: 'She sets the cup down.',
        beatDirection: { emotion: 'grief settling over her, devastated and mourning' },
      }),
    ]
    const directedArc = [
      movement(0, 0, 0, 'She sets the cup down.'),
      movement(1, 1, 1, 'She sets the cup down.'),
    ]

    const cues = deriveSceneMusicCues({}, directedBeats, directedArc)
    expect(cues).toHaveLength(1)
    expect(cues[0].beatStart).toBe(1)
    expect(cues[0].intent).toBe('grief settling in')
  })
})

describe('applySceneMusicCues', () => {
  const cue: SceneMusicCue = {
    cueId: buildMusicCueId(1, 2),
    beatStart: 1,
    beatEnd: 2,
    description: 'Cinematic orchestral score, ominous mood, low strings, slow tempo',
    intent: 'rising dread',
    generatedBy: 'derived',
  }

  it('switches musicEnabled on for covered beats and off elsewhere', () => {
    const result = applySceneMusicCues({}, [cue], beats(4))

    expect(result.beats.map((entry) => entry.musicEnabled)).toEqual([
      false,
      true,
      true,
      false,
    ])
    expect(result.scene.musicCueCoverage).toBe('1-2')
  })

  it('leaves a user’s per-beat override alone once the coverage is unchanged', () => {
    const first = applySceneMusicCues({}, [cue], beats(4))
    const overridden = first.beats.map((entry, index) =>
      index === 3 ? { ...entry, musicEnabled: true } : entry
    )

    const second = applySceneMusicCues(first.scene, [cue], overridden)
    expect(second.beats[3].musicEnabled).toBe(true)
  })

  it('replaces the raw LLM field with the normalized record', () => {
    const result = applySceneMusicCues({ musicCues: [{ beatStart: 0 }] }, [cue], beats(4))

    expect(result.scene.musicCues).toBeUndefined()
    expect(result.scene.sceneMusicCues).toHaveLength(1)
  })

  it('writes a shape that survives a persist/parse round trip unchanged', () => {
    const applied = applySceneMusicCues({}, [cue], beats(4))
    const reparsed = parsePersistedMusicCues(applied.scene.sceneMusicCues, beats(4))
    const reapplied = applySceneMusicCues(applied.scene, reparsed, applied.beats)

    expect(JSON.stringify(reapplied.scene.sceneMusicCues)).toBe(
      JSON.stringify(applied.scene.sceneMusicCues)
    )
  })

  it('is a no-op when there is nothing to score', () => {
    const original = beats(3)
    const result = applySceneMusicCues({ heading: 'INT. ROOM' }, [], original)

    expect(result.beats).toBe(original)
    expect(result.scene.sceneMusicCues).toBeUndefined()
  })
})

describe('parsePersistedMusicCues', () => {
  it('keeps a generated track and its measured length', () => {
    const cues = parsePersistedMusicCues(
      [
        {
          cueId: 'cue-0-1',
          beatStart: 0,
          beatEnd: 1,
          description: 'Cinematic orchestral score, ominous mood, slow tempo',
          intent: 'rising dread',
          url: 'https://blob/cue.wav',
          duration: 12,
          fileDuration: 30,
          generatedBy: 'user',
        },
      ],
      beats(4)
    )

    expect(cues[0].url).toBe('https://blob/cue.wav')
    expect(cues[0].fileDuration).toBe(30)
    expect(cues[0].generatedBy).toBe('user')
    expect(isMusicCueScored(cues[0])).toBe(true)
  })

  it('clamps a cue whose beats moved without re-planning its brief', () => {
    const cues = parsePersistedMusicCues(
      [
        {
          cueId: 'cue-4-9',
          beatStart: 4,
          beatEnd: 9,
          description: 'Cinematic orchestral score, ominous mood, slow tempo',
          url: 'https://blob/cue.wav',
        },
      ],
      beats(6)
    )

    expect(cues[0].beatStart).toBe(4)
    expect(cues[0].beatEnd).toBe(5)
    expect(cues[0].cueId).toBe('cue-4-9')
    expect(cues[0].url).toBe('https://blob/cue.wav')
  })
})

describe('getSceneMusicCues', () => {
  const arcBeats = [
    beat(0, { actionDescription: 'A menacing shadow stalks the corridor.' }),
    beat(1, { actionDescription: 'He slams the door in a brutal rage.' }),
  ]
  const arc = [
    movement(0, 0, 0, 'A menacing shadow stalks the corridor.'),
    movement(1, 1, 1, 'He slams the door in a brutal rage.'),
  ]

  it('prefers a persisted plan over anything it could re-plan', () => {
    const scene = {
      sceneMusicCues: [
        {
          cueId: 'cue-0-0',
          beatStart: 0,
          beatEnd: 0,
          description: 'Persisted score, ominous mood, slow tempo',
          url: 'https://blob/paid-for.wav',
        },
      ],
      musicCues: [
        { beatStart: 1, beatEnd: 1, description: 'A different plan, urgent mood, fast tempo' },
      ],
    }

    const cues = getSceneMusicCues(scene, arcBeats, arc)
    expect(cues).toHaveLength(1)
    expect(cues[0].url).toBe('https://blob/paid-for.wav')
  })

  it('prefers the LLM plan over one derived from the movements', () => {
    const scene = {
      musicCues: [
        { beatStart: 1, beatEnd: 1, description: 'Planned score, urgent mood, fast tempo' },
      ],
    }

    const cues = getSceneMusicCues(scene, arcBeats, arc)
    expect(cues).toHaveLength(1)
    expect(cues[0].generatedBy).toBe('llm')
    expect(cues[0].beatStart).toBe(1)
  })

  it('falls back to the movements when the script planned nothing', () => {
    const cues = getSceneMusicCues({}, arcBeats, arc)
    expect(cues.length).toBeGreaterThan(0)
    expect(cues.every((cue) => cue.generatedBy === 'derived')).toBe(true)
  })
})

describe('adoptLegacySceneTrack', () => {
  const brief = 'Cinematic orchestral score, ominous mood, low strings, slow tempo'

  function cueFromBrief(description: string): SceneMusicCue {
    return {
      cueId: buildMusicCueId(0, 1),
      beatStart: 0,
      beatEnd: 1,
      description,
      intent: 'rising dread',
      generatedBy: 'derived',
    }
  }

  it('hands the scene’s existing track to the cue written from the same brief', () => {
    const cues = adoptLegacySceneTrack(
      {
        music: { description: brief },
        musicAudio: 'https://blob/scene.wav',
        musicFileDuration: 30,
      },
      [cueFromBrief(adaptPromptForLyria(brief))]
    )

    expect(cues[0].url).toBe('https://blob/scene.wav')
    expect(cues[0].fileDuration).toBe(30)
  })

  it('leaves the track alone when the first cue asks for different music', () => {
    const cues = adoptLegacySceneTrack(
      { music: { description: brief }, musicAudio: 'https://blob/scene.wav' },
      [cueFromBrief('Cinematic score, triumphant mood, bright brass, upbeat tempo')]
    )

    expect(cues[0].url).toBeUndefined()
  })
})

describe('ensureSceneMusicCues', () => {
  const arcBeats = [
    beat(0, { actionDescription: 'A menacing shadow stalks the corridor.' }),
    beat(1, { actionDescription: 'She signs the delivery slip.' }),
  ]
  const arc = [
    movement(0, 0, 0, 'A menacing shadow stalks the corridor.'),
    movement(1, 1, 1, 'She signs the delivery slip.'),
  ]

  it('produces the same scene and beats when run twice', () => {
    const first = ensureSceneMusicCues({}, arcBeats, arc)
    const second = ensureSceneMusicCues(first.scene, first.beats, arc)

    expect(JSON.stringify(second.scene)).toBe(JSON.stringify(first.scene))
    expect(JSON.stringify(second.beats)).toBe(JSON.stringify(first.beats))
  })
})

describe('cue helpers', () => {
  const cue: SceneMusicCue = {
    cueId: buildMusicCueId(3, 6),
    beatStart: 3,
    beatEnd: 6,
    description: 'Cinematic orchestral score, ominous mood, slow tempo',
    intent: 'rising dread',
    generatedBy: 'llm',
  }

  it('resolves the cue covering a beat and nothing outside it', () => {
    expect(resolveBeatMusicCue([cue], 3)?.cueId).toBe(cue.cueId)
    expect(resolveBeatMusicCue([cue], 6)?.cueId).toBe(cue.cueId)
    expect(resolveBeatMusicCue([cue], 2)).toBeUndefined()
    expect(resolveBeatMusicCue([cue], 7)).toBeUndefined()
  })

  it('labels a cue’s span 1-based for the UI', () => {
    expect(formatMusicCueRange(cue)).toBe('Beats 4-7')
    expect(formatMusicCueRange({ ...cue, beatStart: 2, beatEnd: 2 })).toBe('Beat 3')
  })

  it('steers the video prompt with the emotion and never with the music', () => {
    const steer = formatMusicCueSteer(cue)
    expect(steer).toContain('rising dread')
    expect(steer).toContain('pacing and performance')
    expect(steer.toLowerCase()).not.toContain('music')
    expect(steer.toLowerCase()).not.toContain('orchestral')
  })

  it('has no steer to add when the cue records no intent', () => {
    expect(formatMusicCueSteer({ ...cue, intent: '' })).toBe('')
    expect(formatMusicCueSteer(undefined)).toBe('')
  })

  it('sums the covered beats to estimate how long the cue plays', () => {
    const measured = beats(8, (index) => (index >= 3 && index <= 6 ? { durationSeconds: 5 } : {}))
    expect(estimateMusicCueDuration(cue, measured)).toBe(20)
  })

  it('falls back to a default hold for beats with no measured length', () => {
    expect(estimateMusicCueDuration(cue, beats(8))).toBe(16)
  })
})
