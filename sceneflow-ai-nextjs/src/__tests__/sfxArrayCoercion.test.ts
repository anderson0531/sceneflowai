import { describe, it, expect } from 'vitest'
import {
  coerceSceneSfxFlatArray,
  coerceSegmentSfxArray,
  sanitizeScriptScenes,
} from '@/lib/script/segmentScript'

describe('sfxArrayCoercion', () => {
  it('coerces flat scene.sfx string to array', () => {
    expect(coerceSceneSfxFlatArray('Door creak')).toEqual(['Door creak'])
  })

  it('coerces flat scene.sfx object to array', () => {
    const obj = { description: 'Thunder rumble' }
    expect(coerceSceneSfxFlatArray(obj)).toEqual([obj])
  })

  it('coerces segment.sfx string to SegmentSFX[]', () => {
    const cues = coerceSegmentSfxArray('Wind howling')
    expect(cues).toHaveLength(1)
    expect(cues[0].description).toBe('Wind howling')
    expect(cues[0].sfxId).toMatch(/^sfx_/)
  })

  it('sanitizes script scenes in place', () => {
    const script = {
      script: {
        scenes: [
          {
            sfx: 'Rain on glass',
            segments: [{ segmentId: 'seg_1', sfx: 'Footsteps', dialogue: [] }],
          },
        ],
      },
    }
    sanitizeScriptScenes(script)
    expect(Array.isArray(script.script.scenes[0].sfx)).toBe(true)
    expect(script.script.scenes[0].sfx[0]).toBe('Rain on glass')
    expect(Array.isArray(script.script.scenes[0].segments[0].sfx)).toBe(true)
    expect(script.script.scenes[0].segments[0].sfx[0].description).toBe('Footsteps')
  })
})
