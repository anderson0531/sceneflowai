import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCATION_CANONICAL_SCALE,
  extractLocationCanonicalScale,
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
    })
    expect(scale.doorHeightFt).toBe(9)
    expect(scale.ceilingHeightFt).toBe(14)
  })
})
