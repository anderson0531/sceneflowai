import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Production Mixer crashed on open:
 *   ReferenceError: Cannot access 'ar' before initialization
 *
 * Cause: shotMethodFor's useCallback dependency array read klingLipsyncEnabled
 * during render, while the useState that declares it sat hundreds of lines
 * later. The const is in the temporal dead zone, and the minifier keeps that
 * order. The vision error boundary then shows the Mixer application error.
 */
describe('SceneProductionMixer klingLipsyncEnabled TDZ', () => {
  const src = readFileSync(
    join(__dirname, '../components/vision/scene-production/SceneProductionMixer.tsx'),
    'utf8'
  )

  const component = src.slice(src.indexOf('export function SceneProductionMixer'))

  it('declares klingLipsyncEnabled before shotMethodFor reads it', () => {
    const decl = component.indexOf('const [klingLipsyncEnabled, setKlingLipsyncEnabled]')
    const shotMethod = component.indexOf('const shotMethodFor = useCallback')
    expect(decl, 'klingLipsyncEnabled useState not found').toBeGreaterThan(-1)
    expect(shotMethod, 'shotMethodFor not found').toBeGreaterThan(-1)
    expect(decl).toBeLessThan(shotMethod)
  })

  it('declares klingLipsyncEnabled only once', () => {
    const matches = component.match(/const \[klingLipsyncEnabled, setKlingLipsyncEnabled\]/g) ?? []
    expect(matches).toHaveLength(1)
  })
})
