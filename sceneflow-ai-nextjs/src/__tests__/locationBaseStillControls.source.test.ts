import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('base location still controls', () => {
  it('keeps regenerate, prompt builder, and director visible on the base still', () => {
    const src = readSource('src/components/vision/LocationLibrary.tsx')
    const pane = readSource('src/components/vision/ReferenceSplitPane.tsx')

    expect(src).toContain('<LocationStillOverlay')
    expect(src).toContain('alwaysVisible')
    expect(src).toContain('setExpandedBaseLocationId(loc.id)')
    expect(src).toContain('DictationTextarea')
    expect(pane).toContain('absolute inset-0')
    expect(src).not.toContain('opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3')
  })
})
