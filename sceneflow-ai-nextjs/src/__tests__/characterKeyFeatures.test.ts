import { describe, it, expect } from 'vitest'
import {
  ethnicityKeyFeature,
  isNonVisualEthnicityLabel,
} from '@/lib/imagen/characterKeyFeatures'

describe('ethnicityKeyFeature', () => {
  it('drops ethnicity when an identity reference is attached', () => {
    expect(
      ethnicityKeyFeature('African-American', { referenceImage: 'https://example.com/gideon.png' })
    ).toBeUndefined()
    expect(
      ethnicityKeyFeature('neutral American', { identityReferenceId: 1 })
    ).toBeUndefined()
  })

  it('never treats accent labels as a visual ethnicity', () => {
    expect(isNonVisualEthnicityLabel('neutral American')).toBe(true)
    expect(ethnicityKeyFeature('neutral American', {})).toBeUndefined()
    expect(ethnicityKeyFeature('British accent', {})).toBeUndefined()
  })

  it('keeps a visual ethnicity only when there is no identity image', () => {
    expect(ethnicityKeyFeature('West African', {})).toBe('West African')
  })
})
