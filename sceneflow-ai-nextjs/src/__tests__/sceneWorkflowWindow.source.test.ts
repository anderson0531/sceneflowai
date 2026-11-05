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
    const fullscreenHeaderIdx = panel.indexOf('data-testid="scene-workflow-fullscreen-header"', menuIdx)
    const tabsListIdx = panel.indexOf('aria-label="Scene workflow"', menuIdx)
    const bodyIdx = panel.indexOf('data-testid="scene-workflow-body"', tabsListIdx)

    expect(menuIdx).toBeGreaterThan(-1)
    expect(fullscreenHeaderIdx).toBeGreaterThan(menuIdx)
    expect(tabsListIdx).toBeGreaterThan(fullscreenHeaderIdx)
    expect(bodyIdx).toBeGreaterThan(tabsListIdx)

    const menuSlice = panel.slice(menuIdx, bodyIdx)
    expect(menuSlice).toContain('shrink-0')
    expect(menuSlice).toContain('overflow-x-auto overflow-y-hidden')
    expect(menuSlice).toContain('aria-label="Previous scene"')
    expect(menuSlice).toContain('aria-label="Jump to scene"')
    expect(menuSlice).toContain('aria-label="Next scene"')
    // Ensure fullscreen scene navigation matches workflow tab height (h-8) and does not crop text descenders via truncate on <select>
    expect(menuSlice).toContain('inline-flex h-8 w-8 items-center justify-center')
    expect(menuSlice).toContain(
      'h-8 max-w-[11rem] sm:max-w-[15rem] lg:max-w-[19rem] rounded-md border border-indigo-500/40 bg-slate-900 px-2.5 py-0 text-xs font-semibold leading-normal text-white'
    )
    expect(menuSlice).not.toContain('h-7 max-w-[9rem]')

    const bodySlice = panel.slice(bodyIdx, bodyIdx + 220)
    expect(bodySlice).toContain('min-h-0 flex-1 overflow-y-auto')
  })

  it('keeps GlobalHeader below the fullscreen workflow window z-index so the fullscreen menu bar is never occluded', () => {
    const header = readSource('src/components/layout/GlobalHeader.tsx')
    expect(header).toContain('sticky top-0 z-[35]')
    expect(header).not.toContain('sticky top-0 z-50')
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

  it('prevents Vercel Blob overwrite 500s on dialogue generation and checks both .wav and .mp3 caches', () => {
    const route = readSource('src/app/api/vision/generate-scene-audio/route.ts')
    expect(route).toContain('isDesignedGeminiVoiceId(finalVoiceConfig.voiceId)')
    expect(route).toContain('allowOverwrite: true')
    expect(route).toContain("const wavPathname = pathname.replace(/\\.mp3$/, '.wav')")

    const googleTtsRoute = readSource('src/app/api/tts/google/route.ts')
    expect(googleTtsRoute).toContain('resolvedDesignPrompt')
    expect(googleTtsRoute).toContain('falling back to gemini-Puck')
  })

  it('enables Action SFX Generate button whenever shot has an audioCue, slot description, or actionDescription', () => {
    const sfxControls = readSource('src/components/vision/ActionBeatSfxControls.tsx')
    expect(sfxControls).toContain('distinctSfxCue(beat) ||')
    expect(sfxControls).toContain('slot.description?.trim() ||')
    expect(sfxControls).toContain('audioSourceFingerprintForSfxBeat(beat)')
  })
})
