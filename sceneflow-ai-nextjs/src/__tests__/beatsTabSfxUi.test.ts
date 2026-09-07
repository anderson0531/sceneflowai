import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), 'utf8')
}

describe('Beats tab SFX UI', () => {
  it('does not render SFX: tag pills on action beats', () => {
    const source = readSource('src/components/vision/ScriptPanel.tsx')
    expect(source).not.toContain('SFX: {label')
    expect(source).toContain('stripInlineSfxLinesFromActionText')
    expect(source).toContain('bg-amber-950/35')
    expect(source).toContain('bg-blue-900/30')
  })

  it('matches dialogue generate chrome on action-beat SFX controls', () => {
    const source = readSource('src/components/vision/ActionBeatSfxControls.tsx')
    expect(source).toContain("Generating...")
    expect(source).toContain("'Generate'")
    expect(source).toContain('bg-amber-600 hover:bg-amber-700')
    expect(source).toContain('RefreshCw')
    expect(source).not.toContain('Generate SFX')
    expect(source).not.toContain('Re-generate SFX')
    expect(source).not.toContain('Veo...')
  })
})
