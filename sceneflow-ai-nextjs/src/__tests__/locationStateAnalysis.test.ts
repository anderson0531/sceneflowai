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

  it('treats a spoken shut-the-door command as a set-state change', () => {
    const line = '[wincing, defiant] Cleanup doesn\'t bleed. Shut the damn door.'
    expect(beatHasLocationStateChange(line)).toBe(true)
    expect(distillLocationStateNotesFromText(line)).toMatch(/door/i)
    expect(distillLocationStateNotesFromText(line)).toMatch(/shut/i)

    const hits = extractLocationStateHitsFromScene({
      sceneNumber: 1,
      beats: [
        { beatId: 'b9', actionDescription: 'The door stands open.' },
        { beatId: 'b10', kind: 'dialogue', line },
      ],
    })
    expect(hits).toHaveLength(1)
    expect(hits[0].beatId).toBe('b10')
    expect(hits[0].beatIndex).toBe(1)
  })

  it('treats practical lights going off as a set-state change', () => {
    expect(beatHasLocationStateChange('The vault lights die.')).toBe(true)
    expect(distillLocationStateNotesFromText('The vault lights die.')).toMatch(/lights/i)
    expect(beatHasLocationStateChange('Moody lighting fills the room.')).toBe(false)
  })

  it('treats a cracked pressure gauge as a set-state change and ignores a framed photo', () => {
    const crack = 'The pressure gauge glass cracks when the needle pegs into the red compression arc.'
    expect(beatHasLocationStateChange(crack)).toBe(true)
    const notes = distillLocationStateNotesFromText(crack)
    expect(notes).toMatch(/gauge/i)
    expect(notes).toMatch(/crack/i)
    expect(notes).not.toMatch(/sarah|gideon|photo/i)

    const photo =
      "Gideon's cheek resting on the stone ledge inches from the shattered glass of the Framed Photo of Sarah."
    expect(beatHasLocationStateChange(photo)).toBe(false)
    expect(distillLocationStateNotesFromText(photo)).toBeUndefined()
    expect(beatHasLocationStateChange('light on')).toBe(false)

    const hits = extractLocationStateHitsFromScene({
      sceneNumber: 1,
      beats: [
        { beatId: 'shot4', actionDescription: 'The brass pressure gauge holds steady on the chute.' },
        { beatId: 'shot17', actionDescription: 'He studies the intact glass of the pressure gauge.' },
        { beatId: 'shot18', actionDescription: crack },
      ],
    })
    expect(hits).toHaveLength(1)
    expect(hits[0].beatId).toBe('shot18')
    expect(hits[0].beatIndex).toBe(2)
    expect(hits[0].notes).toMatch(/crack/i)
  })

  it('includes spoken lines in the LLM scene dump', () => {
    const text = formatSceneForLocationVersionAnalysis(
      {
        sceneNumber: 1,
        beats: [{ beatId: 'd1', kind: 'dialogue', line: 'Shut the damn door.' }],
      },
      'FOYER'
    )
    expect(text).toContain('line: Shut the damn door.')
  })
})
