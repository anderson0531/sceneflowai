import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Production Studio header hide control', () => {
  it('persists collapse and gates title plus description rows', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(panel).toContain("localStorage.getItem('productionStudioHeaderCollapsed')")
    expect(panel).toContain("localStorage.setItem('productionStudioHeaderCollapsed'")
    expect(panel).toContain('!studioHeaderCollapsed && (')
    expect(panel).toContain('{tStudio(\'title\')}')
    expect(panel).toContain("id=\"production-studio-header-description\"")
    expect(panel).toContain('tStudio(\'hideHeader\')')
    expect(panel).toContain('tStudio(\'showHeader\')')
    expect(panel).toContain('aria-expanded={!studioHeaderCollapsed}')
  })

  it('keeps EN copy for hide and show', () => {
    const en = JSON.parse(
      readSource('messages/app/en/production.json')
    ) as { studio: Record<string, string> }
    expect(en.studio.hideHeader).toBe('Hide page title and description')
    expect(en.studio.showHeader).toBe('Show page title and description')
  })
})
