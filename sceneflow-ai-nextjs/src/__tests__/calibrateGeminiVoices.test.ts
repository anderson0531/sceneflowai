import { describe, it, expect } from 'vitest'
import { measurePitch } from '../../scripts/calibrate-gemini-voices'

const SAMPLE_RATE = 24000

/**
 * A harmonic pulse train stands in for voiced speech: the harmonic stack is
 * what makes pitch tracking non-trivial, so a pure sine would not exercise the
 * autocorrelation peak selection.
 */
function voiced(f0: number, seconds: number, sampleRate = SAMPLE_RATE): Float32Array {
  const length = Math.floor(seconds * sampleRate)
  const samples = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    let value = 0
    for (let harmonic = 1; harmonic <= 12; harmonic++) {
      if (f0 * harmonic > sampleRate / 2) break
      value += Math.sin(2 * Math.PI * f0 * harmonic * t) / harmonic
    }
    samples[i] = value * 0.3
  }
  return samples
}

describe('measurePitch', () => {
  it('recovers a known fundamental across the human range', () => {
    for (const f0 of [85, 100, 120, 145, 180, 220, 300]) {
      const result = measurePitch(voiced(f0, 1.5))
      expect(result, `${f0} Hz`).not.toBeNull()
      expect(result!.medianF0Hz, `${f0} Hz median`).toBeCloseTo(f0, 0)
    }
  })

  it('reports a pitch floor at or below the median', () => {
    const result = measurePitch(voiced(110, 1.5))!
    expect(result.pitchFloorHz).toBeLessThanOrEqual(result.medianF0Hz)
  })

  /**
   * The floor is a low percentile rather than the minimum, so one octave-halved
   * frame cannot drag it down.
   */
  it('resists a single octave error in the pitch floor', () => {
    const clean = voiced(120, 1.5)
    const corrupted = Float32Array.from(clean)
    const badFrame = voiced(60, 0.04)
    corrupted.set(badFrame, Math.floor(SAMPLE_RATE * 0.5))

    const result = measurePitch(corrupted)!
    expect(result.medianF0Hz).toBeCloseTo(120, 0)
    expect(result.pitchFloorHz).toBeGreaterThan(100)
  })

  it('returns null for silence, noise, and clips too short to measure', () => {
    expect(measurePitch(new Float32Array(SAMPLE_RATE))).toBeNull()

    const noise = new Float32Array(SAMPLE_RATE)
    for (let i = 0; i < noise.length; i++) noise[i] = (Math.random() - 0.5) * 0.4
    expect(measurePitch(noise)).toBeNull()

    expect(measurePitch(voiced(120, 0.05))).toBeNull()
  })

  /**
   * The search is clamped to human phonation, so a sub-audible fundamental
   * locks onto one of its in-range harmonics rather than escaping the bounds.
   * What matters for the catalog is that no measurement is ever out of range.
   */
  it('never reports a value outside plausible phonation', () => {
    for (const f0 of [30, 45, 85, 220, 450]) {
      const result = measurePitch(voiced(f0, 1.0))
      if (!result) continue
      expect(result.medianF0Hz, `${f0} Hz median`).toBeGreaterThanOrEqual(60)
      expect(result.medianF0Hz, `${f0} Hz median`).toBeLessThanOrEqual(400)
      expect(result.pitchFloorHz, `${f0} Hz floor`).toBeGreaterThanOrEqual(60)
      expect(result.pitchFloorHz, `${f0} Hz floor`).toBeLessThanOrEqual(400)
    }
  })

  it('counts the voiced frames it actually measured', () => {
    const result = measurePitch(voiced(120, 1.0))!
    expect(result.voicedFrames).toBeGreaterThan(10)
  })
})
