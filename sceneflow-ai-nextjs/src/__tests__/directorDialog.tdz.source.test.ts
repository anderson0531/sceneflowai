import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Production Take crashed opening DirectorDialog:
 *   Uncaught ReferenceError: Cannot access 'l' before initialization
 *
 * Cause: initializeDialogState read `nextTakeMode` to pick the UI tab, then
 * declared `const nextTakeMode` later in the same callback. The inner const is
 * scope-hoisted, so the earlier read is TDZ. The minifier renamed it to `l`.
 */
describe('DirectorDialog initializeDialogState() TDZ', () => {
  const src = readFileSync(
    join(__dirname, '../components/vision/scene-production/DirectorDialog.tsx'),
    'utf8'
  )

  const initialize = src.slice(
    src.indexOf('const initializeDialogState = useCallback'),
    src.indexOf('const resolveStandardEffectiveMethod')
  )

  it('declares nextTakeMode before any read in initializeDialogState', () => {
    const decl = initialize.indexOf('const nextTakeMode')
    expect(decl, 'const nextTakeMode not found').toBeGreaterThan(-1)
    const firstUse = initialize.search(/\bnextTakeMode\b/)
    expect(firstUse).toBe(decl + 'const '.length)
  })

  it('does not read nextTakeMode in initialMode before the const', () => {
    const withoutComments = initialize
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    const decl = withoutComments.indexOf('const nextTakeMode')
    const initialMode = withoutComments.indexOf('const initialMode')
    expect(decl).toBeGreaterThan(-1)
    expect(initialMode).toBeGreaterThan(decl)
  })
})
