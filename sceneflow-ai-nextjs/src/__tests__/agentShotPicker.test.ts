import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Stills and Clips Agent shot picker', () => {
  it('shortens the scope labels and names the still list Shots', () => {
    const en = JSON.parse(readSource('messages/app/en/production.json')) as {
      expressScene: Record<string, string>
      videoAgent: Record<string, string>
    }
    expect(en.expressScene.scopeMissing).toBe('Missing')
    expect(en.expressScene.scopeRegenerate).toBe('Regenerate')
    expect(en.expressScene.frames).toBe('Shots')
    expect(en.expressScene.clearSelections).toBe('Clear')
    expect(en.videoAgent.scopeMissing).toBe('Missing')
    expect(en.videoAgent.scopeRegenerate).toBe('Regenerate')
    expect(en.videoAgent.beats).toBe('Shots')
    expect(en.videoAgent.clearSelections).toBe('Clear')
  })

  it('clears regenerate shot checks so specific shots can be chosen', () => {
    const stills = readSource('src/components/vision/ExpressSceneConfirmDialog.tsx')
    const clips = readSource('src/components/vision/VideoAgentConfirmDialog.tsx')
    for (const source of [stills, clips]) {
      expect(source).toContain("scope === 'selected'")
      expect(source).toContain("t('clearSelections')")
    }
    expect(stills).toContain('setSelectedFrameKeys([])')
    expect(clips).toContain('setSelectedSegmentIds([])')
  })

  it('checks shots from the same filters as the thumbnail rails', () => {
    const stills = readSource('src/components/vision/ExpressSceneConfirmDialog.tsx')
    const clips = readSource('src/components/vision/VideoAgentConfirmDialog.tsx')
    expect(stills).toContain('StatusFilterBar')
    expect(stills).toContain('frameMatchesFilters')
    expect(stills).toContain('numberedShotLine')
    expect(clips).toContain('StatusFilterBar')
    expect(clips).toContain('videoMatchesFilters')
    expect(clips).toContain('numberedShotLine')
    expect(clips).toContain('description')
  })
})
