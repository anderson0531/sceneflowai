import { describe, expect, it } from 'vitest'
import {
  extractMountedSetFixturePhrases,
  harvestMountedSetFixturesFromScenes,
  isMountedSetFixtureCatalogName,
  isMountedSetFixtureName,
  locationDescriptionWithMountedFixtures,
  rejectMountedSetFixtures,
  withMountedFixturesInLocationDescription,
} from '@/lib/vision/mountedSetFixtures'

describe('isMountedSetFixtureName', () => {
  it('matches qualified door / hatch / vault wheels', () => {
    expect(isMountedSetFixtureName('heavy door wheel')).toBe(true)
    expect(isMountedSetFixtureName('Hatch Wheel')).toBe(true)
    expect(isMountedSetFixtureName('vault wheel')).toBe(true)
    expect(isMountedSetFixtureName('vault door wheel')).toBe(true)
    expect(isMountedSetFixtureName('bulkhead wheel')).toBe(true)
    expect(isMountedSetFixtureName('airlock wheel')).toBe(true)
    expect(isMountedSetFixtureName('gate wheel')).toBe(true)
  })

  it('does not match bare wheels or unrelated wheels', () => {
    expect(isMountedSetFixtureName('wheel')).toBe(false)
    expect(isMountedSetFixtureName('wheels')).toBe(false)
    expect(isMountedSetFixtureName('steering wheel')).toBe(false)
    expect(isMountedSetFixtureName('wagon wheel')).toBe(false)
    expect(isMountedSetFixtureName('Thirty-Inch Iron Rail Spanner')).toBe(false)
  })
})

describe('extractMountedSetFixturePhrases', () => {
  it('pulls a heavy door wheel from scene prose', () => {
    const phrases = extractMountedSetFixturePhrases(
      'Gideon struggles with a heavy door wheel across the room.'
    )
    expect(phrases.some((phrase) => /heavy door wheel/i.test(phrase))).toBe(true)
  })

  it('pulls wheel-on-aperture phrasing', () => {
    const phrases = extractMountedSetFixturePhrases(
      'He braces against the wheel on the vault door.'
    )
    expect(phrases.length).toBeGreaterThan(0)
  })
})

describe('harvestMountedSetFixturesFromScenes', () => {
  it('reads tagged keyProps and beat action', () => {
    const names = harvestMountedSetFixturesFromScenes([
      {
        heading: 'INT. VAULT - NIGHT',
        beats: [
          {
            actionDescription: 'Gideon struggles with a heavy door wheel across the room.',
            beatDirection: { keyProps: ['heavy door wheel', 'brass weight'] },
          },
        ],
      },
    ])
    expect(names.some((name) => /heavy door wheel/i.test(name))).toBe(true)
    expect(names.some((name) => /brass weight/i.test(name))).toBe(false)
  })
})

describe('withMountedFixturesInLocationDescription', () => {
  it('appends a mounted-architecture clause without duplicating', () => {
    const once = withMountedFixturesInLocationDescription(
      'Cold industrial vault. Workbench in the foreground.',
      ['heavy door wheel']
    )
    expect(once.toLowerCase()).toContain('built-in set architecture')
    expect(once.toLowerCase()).toContain('heavy door wheel')

    const twice = withMountedFixturesInLocationDescription(once, ['heavy door wheel'])
    expect(twice).toBe(once)
  })
})

describe('locationDescriptionWithMountedFixtures', () => {
  it('scopes harvest to the named location', () => {
    const description = locationDescriptionWithMountedFixtures(
      { location: 'VAULT', description: 'Empty iron vault.' },
      [
        {
          heading: 'INT. VAULT - NIGHT',
          beats: [
            {
              actionDescription: 'Gideon works a heavy door wheel across the room.',
            },
          ],
        },
        {
          heading: 'INT. STREET - NIGHT',
          beats: [{ actionDescription: 'A hatch wheel sits in a crate.' }],
        },
      ]
    )
    expect(description.toLowerCase()).toContain('heavy door wheel')
    expect(description.toLowerCase()).not.toContain('hatch wheel')
  })
})

describe('rejectMountedSetFixtures', () => {
  it('drops fixture rows and keeps handheld props', () => {
    const kept = rejectMountedSetFixtures([
      { name: 'heavy door wheel' },
      { name: 'brass weight' },
      { name: 'wrench' },
    ])
    expect(kept.map((row) => row.name)).toEqual(['brass weight', 'wrench'])
  })
})

describe('isMountedSetFixtureCatalogName', () => {
  it('protects qualified fixtures and a leftover bare wheel catalog row', () => {
    expect(isMountedSetFixtureCatalogName('hatch wheel')).toBe(true)
    expect(isMountedSetFixtureCatalogName('wheel')).toBe(true)
    expect(isMountedSetFixtureCatalogName('brass weight')).toBe(false)
  })
})
