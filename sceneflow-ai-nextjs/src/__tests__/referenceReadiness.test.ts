import { describe, it, expect } from 'vitest'
import {
  formatReferenceReadinessMessage,
  resolveProjectReferenceReadiness,
  resolveReferenceReadiness,
} from '@/lib/vision/referenceReadiness'

describe('resolveReferenceReadiness', () => {
  it('is ready when every reference row carries an image', () => {
    const readiness = resolveReferenceReadiness({
      characters: [{ name: 'Piper Hayes', referenceImage: 'https://cdn/piper.png' }],
      locationReferences: [{ location: 'Receiving Terminal', imageUrl: 'https://cdn/term.png' }],
      objectReferences: [{ name: 'Iron spanner', imageUrl: 'https://cdn/spanner.png' }],
    })

    expect(readiness.ready).toBe(true)
    expect(readiness.missingTotal).toBe(0)
    expect(formatReferenceReadinessMessage(readiness)).toBe('')
  })

  it('is ready when the library is empty — nothing to be inconsistent about', () => {
    expect(resolveReferenceReadiness({}).ready).toBe(true)
  })

  it('names the cast whose appearance has never been drawn', () => {
    const readiness = resolveReferenceReadiness({
      characters: [
        { name: 'Piper Hayes', referenceImage: 'https://cdn/piper.png' },
        { name: 'Gideon Croft' },
      ],
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.missingCast).toEqual(['Gideon Croft'])
    expect(readiness.missingTotal).toBe(1)
  })

  it('leaves narrators out of the missing cast', () => {
    const readiness = resolveReferenceReadiness({
      characters: [
        { name: 'Narrator', type: 'narrator' },
        { name: 'Piper Hayes', referenceImage: 'https://cdn/piper.png' },
      ],
    })

    expect(readiness.ready).toBe(true)
    expect(readiness.missingCast).toEqual([])
  })

  it('treats a whitespace-only image URL as no image at all', () => {
    const readiness = resolveReferenceReadiness({
      objectReferences: [{ name: 'Olive-drab cylinder', imageUrl: '   ' }],
    })

    expect(readiness.missingObjects).toEqual(['Olive-drab cylinder'])
  })

  it('falls back to a positional label when a row has no name', () => {
    const readiness = resolveReferenceReadiness({
      characters: [{}],
      locationReferences: [{}],
      objectReferences: [{}],
    })

    expect(readiness.missingCast).toEqual(['Character 1'])
    expect(readiness.missingLocations).toEqual(['Location 1'])
    expect(readiness.missingObjects).toEqual(['Object 1'])
    expect(readiness.missingTotal).toBe(3)
  })

  it('accepts either location field as the display name', () => {
    const readiness = resolveReferenceReadiness({
      locationReferences: [
        { location: 'INT. TERMINAL' },
        { locationDisplay: 'Loading Bay' },
        { name: 'Gantry' },
      ],
    })

    expect(readiness.missingLocations).toEqual(['INT. TERMINAL', 'Loading Bay', 'Gantry'])
  })
})

describe('resolveProjectReferenceReadiness', () => {
  it('reads the three reference slices out of project metadata', () => {
    const readiness = resolveProjectReferenceReadiness({
      metadata: {
        visionPhase: {
          characters: [{ name: 'Piper Hayes' }],
          references: {
            locationReferences: [{ location: 'Terminal', imageUrl: 'https://cdn/term.png' }],
            objectReferences: [{ name: 'Spanner' }],
          },
        },
      },
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.missingCast).toEqual(['Piper Hayes'])
    expect(readiness.missingLocations).toEqual([])
    expect(readiness.missingObjects).toEqual(['Spanner'])
  })

  it('treats a project with no vision phase as ready', () => {
    expect(resolveProjectReferenceReadiness({}).ready).toBe(true)
    expect(resolveProjectReferenceReadiness(null).ready).toBe(true)
    expect(resolveProjectReferenceReadiness({ metadata: { visionPhase: {} } }).ready).toBe(true)
  })
})

describe('formatReferenceReadinessMessage', () => {
  it('counts and names each missing group', () => {
    const message = formatReferenceReadinessMessage(
      resolveReferenceReadiness({
        characters: [{ name: 'Gideon Croft' }],
        locationReferences: [{ location: 'Terminal' }, { location: 'Gantry' }],
        objectReferences: [{ name: 'Spanner' }],
      })
    )

    expect(message).toContain('1 cast (Gideon Croft)')
    expect(message).toContain('2 locations (Terminal, Gantry)')
    expect(message).toContain('1 object (Spanner)')
  })

  it('truncates a long list rather than naming everything', () => {
    const message = formatReferenceReadinessMessage(
      resolveReferenceReadiness({
        objectReferences: [
          { name: 'One' },
          { name: 'Two' },
          { name: 'Three' },
          { name: 'Four' },
          { name: 'Five' },
        ],
      })
    )

    expect(message).toContain('5 objects (One, Two, Three +2 more)')
  })
})
