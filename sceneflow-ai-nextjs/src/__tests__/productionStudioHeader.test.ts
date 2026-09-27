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

  it('presents blueprint beats as chapters with hide controls', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(panel).toContain("localStorage.getItem('productionStudioChapterCollapsed')")
    expect(panel).toContain("localStorage.setItem('productionStudioChapterCollapsed'")
    expect(panel).toContain("localStorage.getItem('productionStudioSceneTitleCollapsed')")
    expect(panel).toContain("localStorage.setItem('productionStudioSceneTitleCollapsed'")
    expect(panel).toContain("tStudio('chapter'")
    expect(panel).toContain("tStudio('sceneInChapter'")
    expect(panel).toContain("tStudio('prevChapter')")
    expect(panel).toContain("tStudio('nextChapter')")
    expect(panel).toContain("tStudio('hideChapter')")
    expect(panel).toContain("tStudio('showChapter')")
    expect(panel).toContain("tStudio('hideSceneTitle')")
    expect(panel).toContain("tStudio('showSceneTitle')")
    expect(panel).toContain('collapsed={chapterSectionCollapsed}')
    expect(panel).toContain('!sceneTitleCollapsed && (')
    expect(panel).toContain('id="production-studio-chapter-heading"')
    expect(panel).toContain('id="production-studio-chapter-description"')
    expect(panel).toContain('id="production-studio-scene-title"')
    expect(panel).toContain('id="production-studio-scene-description"')
    expect(panel).toContain('aria-expanded={!collapsed}')
    expect(panel).toContain('aria-expanded={!sceneTitleCollapsed}')
    expect(panel).not.toContain('Blueprint Beat')
    expect(panel).not.toContain('Prev in beat')
    expect(panel).not.toContain('in this beat')
  })

  it('keeps EN copy for chapters and scene title controls', () => {
    const en = JSON.parse(
      readSource('messages/app/en/production.json')
    ) as { studio: Record<string, string> }
    expect(en.studio.chapter).toBe('Chapter {name}')
    expect(en.studio.sceneInChapter).toBe('Scene {position} of {total} in this chapter')
    expect(en.studio.prevChapter).toBe('Prev Chapter')
    expect(en.studio.nextChapter).toBe('Next Chapter')
    expect(en.studio.hideChapter).toBe('Hide chapter')
    expect(en.studio.showChapter).toBe('Show chapter')
    expect(en.studio.hideSceneTitle).toBe('Hide scene title and description')
    expect(en.studio.showSceneTitle).toBe('Show scene title and description')
  })
})
