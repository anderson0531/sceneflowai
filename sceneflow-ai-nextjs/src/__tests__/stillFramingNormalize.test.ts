import { describe, it, expect } from 'vitest'
import {
  isDetailShot,
  normalizeStillCameraAngle,
  normalizeStillFraming,
  normalizeStillLens,
  normalizeStillShotType,
  stripLensSubjectNote,
  suppressDetailLensForShot,
} from '@/lib/imagen/stillFramingNormalize'

describe('normalizeStillCameraAngle', () => {
  it('reduces a camera move to the angle the frame ends on', () => {
    expect(
      normalizeStillCameraAngle('Dynamic, shifting from high-angle dominance to low-angle vulnerability')
    ).toBe('low angle')
  })

  it('reduces a bare start-to-end angle to its end state', () => {
    expect(normalizeStillCameraAngle('from eye level to overhead')).toBe('overhead angle')
  })

  it('drops the mood a directed angle carries', () => {
    expect(normalizeStillCameraAngle('low-angle vulnerability')).toBe('low angle')
    expect(normalizeStillCameraAngle('oppressive high angle looking down')).toBe('high angle')
  })

  it('yields nothing when the field held only camera motion', () => {
    expect(normalizeStillCameraAngle('dynamic')).toBe('')
    expect(normalizeStillCameraAngle('slow dolly, continuous')).toBe('')
  })

  it('keeps an angle a photograph can be taken from', () => {
    expect(normalizeStillCameraAngle('low angle')).toBe('low angle')
    expect(normalizeStillCameraAngle("worm's-eye")).toBe("worm's-eye angle")
    expect(normalizeStillCameraAngle('Dutch tilt')).toBe('Dutch angle')
  })

  it('leaves a non-angle phrase that is not a move alone', () => {
    expect(normalizeStillCameraAngle('close to the ground')).toBe('close to the ground')
  })
})

describe('normalizeStillShotType', () => {
  it('strips the move off a shot scale', () => {
    expect(normalizeStillShotType('Tracking Two-Shot')).toBe('Two-Shot')
    expect(normalizeStillShotType('Handheld Medium Shot')).toBe('Medium Shot')
  })

  it('leaves a still-safe shot scale untouched', () => {
    expect(normalizeStillShotType('Extreme Close-Up')).toBe('Extreme Close-Up')
    expect(normalizeStillShotType('Medium Close-Up')).toBe('Medium Close-Up')
  })
})

describe('normalizeStillFraming', () => {
  it('turns a directed camera move into one shot a still can hold', () => {
    const { shot, rewrites } = normalizeStillFraming(
      'Two-Shot',
      'Dynamic, shifting from high-angle dominance to low-angle vulnerability'
    )

    expect(shot).toBe('Two-Shot, low angle')
    expect(rewrites).toEqual([
      {
        field: 'cameraAngle',
        from: 'Dynamic, shifting from high-angle dominance to low-angle vulnerability',
        to: 'low angle',
      },
    ])
  })

  it('reports no rewrite for direction a still could already use', () => {
    const { shot, rewrites } = normalizeStillFraming('Medium Shot', 'low angle')

    expect(shot).toBe('Medium Shot, low angle')
    expect(rewrites).toEqual([])
  })

  it('treats hyphens and case as authoring style rather than a rewrite', () => {
    expect(normalizeStillFraming('Medium Shot', 'Low-Angle').rewrites).toEqual([])
  })

  it('does not state the angle twice when the shot scale already names it', () => {
    expect(normalizeStillFraming('Low-Angle Wide Shot', 'low angle').shot).toBe(
      'Low-Angle Wide Shot'
    )
  })

  it('keeps the shot when the angle field held nothing usable', () => {
    const { shot, rewrites } = normalizeStillFraming('Wide Shot', 'dynamic, kinetic')

    expect(shot).toBe('Wide Shot')
    expect(rewrites).toEqual([
      { field: 'cameraAngle', from: 'dynamic, kinetic', to: '' },
    ])
  })

  it('returns nothing when the beat has no framing direction', () => {
    expect(normalizeStillFraming(undefined, null)).toEqual({ shot: '', rewrites: [] })
  })
})

describe('lens normalization', () => {
  it('drops the subject a film-wide lens note names', () => {
    expect(stripLensSubjectNote('Macro (100mm) for extreme detail on the needle and ash')).toBe(
      'Macro (100mm)'
    )
  })

  it('keeps a purpose clause that describes the lens rather than a subject', () => {
    expect(stripLensSubjectNote('Anamorphic 40mm for depth')).toBe('Anamorphic 40mm for depth')
  })

  it('recognizes the shots a detail lens belongs on', () => {
    expect(isDetailShot('Extreme Close-Up')).toBe(true)
    expect(isDetailShot('Insert Shot')).toBe(true)
    expect(isDetailShot('Two-Shot')).toBe(false)
  })

  it('suppresses a detail lens on a shot that cannot hold one', () => {
    expect(suppressDetailLensForShot('Macro (100mm); shallow depth of field', 'Two-Shot')).toBe(
      'shallow depth of field'
    )
    expect(suppressDetailLensForShot('Macro (100mm)', 'Insert Shot')).toBe('Macro (100mm)')
  })

  it('leaves the lens family alone when the beat states no shot scale', () => {
    expect(suppressDetailLensForShot('Macro (100mm)', undefined)).toBe('Macro (100mm)')
  })

  it('strips the named subject and the detail family together for a wide shot', () => {
    expect(
      normalizeStillLens('Macro (100mm) for extreme detail on the needle and ash', 'Two-Shot')
    ).toBe('')
    expect(
      normalizeStillLens('Macro (100mm) for extreme detail on the needle and ash', 'Insert Shot')
    ).toBe('Macro (100mm)')
  })
})
