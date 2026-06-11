import { describe, it, expect } from 'vitest'
import { resolvePreVisSceneDisplay } from '@/lib/storyboard/preVisSceneDisplay'

describe('resolvePreVisSceneDisplay', () => {
  it('builds combined title line with formatted heading', () => {
    const result = resolvePreVisSceneDisplay(
      {
        heading: 'INT. TITLE SEQUENCE - DAY',
        visualDescription: 'A high-energy title sequence.',
      },
      0
    )

    expect(result.sceneNumber).toBe(1)
    expect(result.titleLine).toBe('SCENE 1: INT (Interior). TITLE SEQUENCE - DAY')
    expect(result.description).toBe('A high-energy title sequence.')
  })

  it('prefers visualDescription over action', () => {
    const result = resolvePreVisSceneDisplay(
      {
        heading: 'EXT. BEACH - DAY',
        visualDescription: 'Visual first.',
        action: 'Action second.',
      },
      2
    )

    expect(result.titleLine).toContain('SCENE 3:')
    expect(result.description).toBe('Visual first.')
  })

  it('falls back through action, summary, and sceneDirection.sceneDescription', () => {
    expect(
      resolvePreVisSceneDisplay({ heading: 'INT. ROOM', action: 'Action only.' }, 0).description
    ).toBe('Action only.')

    expect(
      resolvePreVisSceneDisplay({ heading: 'INT. ROOM', summary: 'Summary text.' }, 0).description
    ).toBe('Summary text.')

    expect(
      resolvePreVisSceneDisplay(
        {
          heading: 'INT. ROOM',
          sceneDirection: { sceneDescription: 'Direction description.' },
        },
        0
      ).description
    ).toBe('Direction description.')
  })

  it('returns empty description when none present', () => {
    const result = resolvePreVisSceneDisplay({ heading: 'INT. ROOM - DAY' }, 0)
    expect(result.description).toBe('')
  })

  it('handles missing scene', () => {
    const result = resolvePreVisSceneDisplay(undefined, 4)
    expect(result.titleLine).toBe('SCENE 5: Untitled Scene')
    expect(result.description).toBe('')
    expect(result.sceneNumber).toBe(5)
  })
})
