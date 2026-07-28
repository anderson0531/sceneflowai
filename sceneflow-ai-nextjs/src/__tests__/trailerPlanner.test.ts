import { describe, it, expect } from 'vitest'
import { planPromoTrailer } from '@/lib/publish/trailerPlanner'

describe('trailerPlanner', () => {
  const scenes = [
    {
      id: 'scene-0',
      heading: 'INT. ROOM - DAY',
      action: 'A tense conversation unfolds with rising stakes.',
      dialogue: [{ character: 'ALEX', line: 'We need to go now.' }],
    },
    {
      id: 'scene-1',
      heading: 'EXT. STREET - NIGHT',
      action: 'Chase through rain-soaked streets.',
      dialogue: [{ character: 'ALEX', line: 'Run!' }],
    },
    {
      id: 'scene-2',
      heading: 'EXT. ROOFTOP - DAWN',
      action: 'Final confrontation at sunrise.',
      dialogue: [{ character: 'ALEX', line: 'It ends here.' }],
    },
  ]

  it('selects beats totaling between 30 and 60 seconds', () => {
    const result = planPromoTrailer({
      scenes,
      targetDurationSec: 45,
    })
    expect(result.beatPlan.length).toBeGreaterThan(0)
    expect(result.totalDurationSec).toBeGreaterThanOrEqual(30)
    expect(result.totalDurationSec).toBeLessThanOrEqual(60)
  })

  it('prioritizes hero beat pins', () => {
    const withHero = planPromoTrailer({
      scenes,
      heroBeatIds: ['0:0'],
    })
    expect(withHero.beatPlan.some((b) => b.sceneIndex === 0)).toBe(true)
  })

  it('respects audience resonance scene scores', () => {
    const result = planPromoTrailer({
      scenes,
      sceneScores: { 2: 95, 0: 20, 1: 50 },
    })
    const highScoreBeats = result.beatPlan.filter((b) => b.sceneIndex === 2)
    expect(highScoreBeats.length).toBeGreaterThan(0)
  })
})
