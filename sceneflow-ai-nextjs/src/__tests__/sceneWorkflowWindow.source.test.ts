import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Scene workflow viewport-fitted window and uncropped menu', () => {
  it('renders a dynamic viewport-fitted scene workflow window with fullscreen workstation mode', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(panel).toContain('data-testid="scene-workflow-window"')
    expect(panel).toContain('data-workflow-fullscreen={workflowFullscreen ? \'true\' : \'false\'}')
    expect(panel).toContain("localStorage.getItem('productionSceneWorkflowFullscreen')")
    expect(panel).toContain("localStorage.setItem('productionSceneWorkflowFullscreen'")
    expect(panel).toContain('fixed inset-0 z-40 flex h-dvh w-screen flex-col overflow-hidden bg-slate-950')
    expect(panel).toContain('max-h-[calc(100dvh-10.5rem)]')
    expect(panel).toContain('data-testid="scene-workflow-fullscreen-header"')
    expect(panel).toContain('Open scene workflow in fullscreen window')
    expect(panel).toContain('Exit scene workflow fullscreen')
  })

  it('pins the scene workflow menu bar outside the scrollable tab body so it never gets cropped', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    const menuIdx = panel.indexOf('data-testid="scene-workflow-menu-bar"')
    const tabsListIdx = panel.indexOf('aria-label="Scene workflow"', menuIdx)
    const bodyIdx = panel.indexOf('data-testid="scene-workflow-body"', tabsListIdx)

    expect(menuIdx).toBeGreaterThan(-1)
    expect(tabsListIdx).toBeGreaterThan(menuIdx)
    expect(bodyIdx).toBeGreaterThan(tabsListIdx)

    const menuSlice = panel.slice(menuIdx, bodyIdx)
    expect(menuSlice).toContain('shrink-0')
    expect(menuSlice).toContain('overflow-x-auto overflow-y-hidden')

    const bodySlice = panel.slice(bodyIdx, bodyIdx + 220)
    expect(bodySlice).toContain('min-h-0 flex-1 overflow-y-auto')
  })

  it('keeps backdrop-blur and overflow-hidden off the outer SceneCard container so fixed/sticky children are not clipped', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    const cardIdx = panel.indexOf('ref={cardRef}')
    expect(cardIdx).toBeGreaterThan(-1)
    const cardOpenTag = panel.slice(cardIdx, panel.indexOf('<div className="relative z-[1]">', cardIdx))
    expect(cardOpenTag).toContain('pointer-events-none absolute inset-0 overflow-hidden rounded-2xl backdrop-blur')
  })

  it('caps inline media preview heights so workflow stages fit inside the screen window', () => {
    const stage = readSource('src/components/vision/scene-production/SceneBeatStage.tsx')
    const viewer = readSource('src/components/vision/scene-production/BeatStillClipViewer.tsx')
    const imageFrame = readSource('src/components/vision/SceneImageFrame.tsx')
    const videoGallery = readSource('src/components/vision/scene-production/BeatVideoGallery.tsx')

    expect(stage).toContain('lg:sticky lg:top-2')
    expect(viewer).toContain('max-h-[38vh]')
    expect(imageFrame).toContain('max-h-[42vh]')
    expect(videoGallery).toContain('max-h-[42vh]')
  })
})
