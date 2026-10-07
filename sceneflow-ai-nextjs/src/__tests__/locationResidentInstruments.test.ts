import { describe, expect, it } from 'vitest'
import { isMountedSetFixtureName } from '@/lib/vision/mountedSetFixtures'
import {
  extractLocationResidentInstrumentPhrases,
  isLocationResidentInstrumentName,
  propPlateIdentifiesInstrument,
} from '@/lib/vision/locationResidentInstruments'

describe('location resident instruments', () => {
  it('names wall-mounted gauges, galvanometers, manometers, and dials', () => {
    expect(isLocationResidentInstrumentName('Brass pressure gauge')).toBe(true)
    expect(isLocationResidentInstrumentName('vintage brass galvanometer')).toBe(true)
    expect(isLocationResidentInstrumentName('steam manometer')).toBe(true)
    expect(isLocationResidentInstrumentName('brass dial')).toBe(true)
    expect(
      extractLocationResidentInstrumentPhrases(
        'On the wall, the glass face of a brass pressure gauge connected to the chute is cracked.'
      ).some((phrase) => /brass pressure gauge/i.test(phrase))
    ).toBe(true)
  })

  it('leaves vault-door hardware and handheld props in their own classes', () => {
    expect(isLocationResidentInstrumentName('heavy door wheel')).toBe(false)
    expect(isLocationResidentInstrumentName('vault door wheel')).toBe(false)
    expect(isLocationResidentInstrumentName('Massive brass lockdown wheel')).toBe(false)
    expect(isLocationResidentInstrumentName('Framed Photo of Sarah')).toBe(false)
    expect(isMountedSetFixtureName('Brass pressure gauge')).toBe(false)
    expect(isMountedSetFixtureName('vintage brass galvanometer')).toBe(false)
  })

  it('treats a matching prop plate as the same instrument', () => {
    const phrases = extractLocationResidentInstrumentPhrases(
      'Extreme Close-Up. The brass pressure gauge needle is pinned.'
    )
    expect(propPlateIdentifiesInstrument('Brass pressure gauge', phrases)).toBe(true)
    expect(propPlateIdentifiesInstrument('Framed Photo of Sarah', phrases)).toBe(false)
  })
})
