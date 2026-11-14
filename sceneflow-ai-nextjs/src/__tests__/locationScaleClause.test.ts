import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCATION_CANONICAL_SCALE,
  extractExplicitLocationCanonicalScale,
  extractLocationCanonicalScale,
  extractMountedFixtureHeights,
  formatLocationScaleDescriptor,
  hasExplicitLocationScale,
  locationScaleClause,
} from '@/lib/imagen/locationScaleClause'

describe('locationScaleClause', () => {
  it('defaults to a ~10ft room ceiling without inventing a 7ft door when no door is mentioned', () => {
    const clause = locationScaleClause()
    expect(clause).toContain('~10ft')
    expect(clause).not.toContain('door ~7ft')
    expect(clause.toLowerCase()).toContain('never invent doors')
    expect(clause.toLowerCase()).toContain('right-margin scale ticks')
    expect(clause.toLowerCase()).toContain('do not draw rulers')
    expect(clause.toLowerCase()).toContain('do not shrink architecture')
  })

  it('omits indoor ceiling/door scale on exterior locations and ignores legacy auto-stamped 10ft/7ft defaults', () => {
    const extClause = locationScaleClause(
      'Rocky shoreline overlooking Lake Michigan at night',
      'EXT. CHICAGO COASTLINE - NIGHT'
    )
    expect(extClause).not.toContain('~10ft')
    expect(extClause).not.toContain('door')
    expect(extClause).not.toContain('right-margin scale ticks')

    expect(
      hasExplicitLocationScale(
        'Damp subterranean stone chamber with a zinc workbench',
        'UNDERGROUND CHAMBER',
        { ceilingHeightFt: 10, doorHeightFt: 7 }
      )
    ).toBe(false)
    expect(
      extractExplicitLocationCanonicalScale(
        'A tunnel with an 11-foot ceiling and concrete walls',
        'RAIL TUNNEL',
        { ceilingHeightFt: 11, doorHeightFt: 7 }
      )
    ).toEqual({ ceilingHeightFt: 11 })
    expect(
      formatLocationScaleDescriptor(
        'A tunnel with an 11-foot ceiling and concrete walls',
        'RAIL TUNNEL',
        { ceilingHeightFt: 11, doorHeightFt: 7 }
      )
    ).toBe('11-foot ceiling, maintain proportionate size with characters')
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
