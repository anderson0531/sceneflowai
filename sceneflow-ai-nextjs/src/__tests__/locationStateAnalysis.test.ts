import { describe, expect, it } from 'vitest'
import {
  beatHasLocationStateChange,
  distillLocationStateNotesFromText,
  extractLocationStateHitsFromScene,
  formatSceneForLocationVersionAnalysis,
} from '@/lib/vision/locationStateAnalysis'

describe('locationStateAnalysis', () => {
  it('requires a set-piece noun so anger explosions do not count', () => {
    expect(beatHasLocationStateChange('She explodes with anger at him.')).toBe(false)
    expect(beatHasLocationStateChange('The front door explodes inward.')).toBe(true)
  })

  it('distills set-state phrases from beat text', () => {
    const notes = distillLocationStateNotesFromText(
      'The front door explodes. Glass and debris fill the foyer.'
    )
    expect(notes).toMatch(/door/i)
    expect(notes).toMatch(/explod/i)
  })

  it('extracts ordered beat hits with appliesFrom indices', () => {
    const hits = extractLocationStateHitsFromScene({
      sceneNumber: 1,
      heading: 'INT. FOYER - NIGHT',
      beats: [
        { beatId: 'b0', actionDescription: 'They argue in the intact foyer.' },
        {
          beatId: 'b1',
          actionDescription: 'The front door explodes. Splinters fill the frame.',
          frozenMoment: 'The doorway is a ragged hole.',
        },
      ],
    })
    expect(hits).toHaveLength(1)
    expect(hits[0].beatIndex).toBe(1)
    expect(hits[0].beatId).toBe('b1')
    expect(hits[0].notes).toMatch(/door/i)
  })

  it('formats beats in order for the LLM', () => {
    const text = formatSceneForLocationVersionAnalysis(
      {
        sceneNumber: 2,
        heading: 'INT. KITCHEN - DAY',
        beats: [
          {
            beatId: 'k1',
            actionDescription: 'Steam rises from the kettle.',
            frozenMoment: 'Empty kitchen hold.',
          },
        ],
      },
      'KITCHEN'
    )
    expect(text).toContain('Location: KITCHEN')
    expect(text).toContain('[Beat 0 id=k1]')
    expect(text).toContain('lasting set changes')
  })
})
