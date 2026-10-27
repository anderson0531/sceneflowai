import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCATION_CANONICAL_SCALE,
  extractLocationCanonicalScale,
  extractMountedFixtureHeights,
  formatLocationScaleDescriptor,
  locationScaleClause,
} from '@/lib/imagen/locationScaleClause'

describe('locationScaleClause', () => {
  it('defaults to a 7ft door and 10ft ceiling', () => {
    const clause = locationScaleClause()
    expect(clause).toContain('~7ft')
    expect(clause).toContain('~10ft')
    expect(clause.toLowerCase()).toContain('right-margin scale ticks')
    expect(clause.toLowerCase()).toContain('do not draw rulers')
    expect(clause.toLowerCase()).toContain('do not shrink architecture')
  })

  it('reads door and ceiling heights from a location description', () => {
    const scale = extractLocationCanonicalScale(
      'Interior 8ft door under a 12ft ceiling, brick vault',
      'Freight tunnel'
    )
    expect(scale.doorHeightFt).toBe(8)
    expect(scale.ceilingHeightFt).toBe(12)
    expect(scale.figureHeightFt).toBe(DEFAULT_LOCATION_CANONICAL_SCALE.figureHeightFt)
    expect(locationScaleClause('Interior 8ft door under a 12ft ceiling')).toContain('~8ft')
    expect(locationScaleClause('Interior 8ft door under a 12ft ceiling')).toContain('~12ft')
  })

  it('lets an explicit canonicalScale win over the description', () => {
    const scale = extractLocationCanonicalScale('7ft door', 'Vault', {
      doorHeightFt: 9,
      ceilingHeightFt: 14,
      fixtureHeights: 'chalkboard mounted at a height of 6-foot',
    })
    expect(scale.doorHeightFt).toBe(9)
    expect(scale.ceilingHeightFt).toBe(14)
    expect(scale.fixtureHeights).toBe('chalkboard mounted at a height of 6-foot')
  })

  it('extracts mounted fixture heights and formats a proportional scale descriptor', () => {
    const desc =
      'A rail tunnel with an 11-foot ceiling, chalkboard mounted at a height of 6-foot, and an 8-foot iron door.'
    expect(extractMountedFixtureHeights(desc)).toContain('chalkboard mounted at a height of 6-foot')
    const descriptor = formatLocationScaleDescriptor(desc)
    expect(descriptor).toContain('11-foot ceiling')
    expect(descriptor).toContain('8-foot door')
    expect(descriptor).toContain('chalkboard mounted at a height of 6-foot')
    expect(descriptor).toContain('maintain proportionate size with characters')
  })
})
