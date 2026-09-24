import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Opening the Reference Library crashed the vision page:
 *   ReferenceError: Cannot access 'ti' before initialization
 *
 * Cause: visibleLocations / visibleObjects read locationQuery, locationSceneFilter,
 * objectQuery, and objectSceneFilter before those consts were declared. The
 * bindings are scope-hoisted, so the useMemo dependency arrays hit TDZ.
 */
describe('VisionReferencesSidebar filter state TDZ', () => {
  const src = readFileSync(
    join(__dirname, '../components/vision/VisionReferencesSidebar.tsx'),
    'utf8'
  )
  const body = src.slice(src.indexOf('export function VisionReferencesSidebar'))

  const bindings = [
    'locationQuery',
    'locationSceneFilter',
    'objectQuery',
    'objectSceneFilter',
  ] as const

  it.each(bindings)('declares %s before any read in the sidebar', (name) => {
    const decl = body.indexOf(`const [${name},`)
    expect(decl, `const [${name} not found`).toBeGreaterThan(-1)
    const firstUse = body.search(new RegExp(`\\b${name}\\b`))
    expect(firstUse).toBe(decl + 'const ['.length)
  })

  it('builds the location and object filter memos after the query state', () => {
    const decl = body.indexOf('const [locationQuery,')
    const locations = body.indexOf('const visibleLocations')
    const objects = body.indexOf('const visibleObjects')
    expect(decl).toBeGreaterThan(-1)
    expect(locations).toBeGreaterThan(decl)
    expect(objects).toBeGreaterThan(decl)
  })
})
