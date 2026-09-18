import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { resolveStoryboardGeneration } from '@/lib/storyboard/storyboardQuality'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

function readHandler(relativePath: string, declaration: string): string {
  const source = readSource(relativePath)
  const start = source.indexOf(declaration)
  expect(start, `${declaration} not found in ${relativePath}`).toBeGreaterThan(-1)
  const after = source.slice(start)
  const end = after.slice(1).search(/\n {2}const \w/)
  return end === -1 ? after : after.slice(0, end + 1)
}

const PAGE = 'src/app/dashboard/workflow/vision/[projectId]/page.tsx'
const VIEWER = 'src/components/vision/SceneStoryboardFrameViewer.tsx'
const CONFIRM = 'src/components/vision/ExpressSceneConfirmDialog.tsx'
const DIRECT = 'src/components/vision/PreVisFramePromptDialog.tsx'
const SCRIPT_PANEL = 'src/components/vision/ScriptPanel.tsx'

describe('Draft/Final Frames toolbar default', () => {
  it('places the compact toggle immediately before Frame Agent in the toolbar', () => {
    const viewer = readSource(VIEWER)
    const toolbarStart = viewer.indexOf('{preVisStale && onSyncPreVisToScript &&')
    const toolbarEnd = viewer.indexOf('{draftFrameCount > 0 &&')
    expect(toolbarStart).toBeGreaterThan(-1)
    expect(toolbarEnd).toBeGreaterThan(toolbarStart)
    const toolbar = viewer.slice(toolbarStart, toolbarEnd)
    const toggleIdx = toolbar.indexOf('{qualityToggle}')
    const agentIdx = toolbar.indexOf('Frame Agent')
    expect(toggleIdx).toBeGreaterThan(-1)
    expect(agentIdx).toBeGreaterThan(toggleIdx)
    expect(viewer).toContain('size="compact"')
  })

  it('places the compact toggle above the empty-state Frame Agent button', () => {
    const viewer = readSource(VIEWER)
    const emptyStart = viewer.indexOf('No pre-vis frames yet.')
    expect(emptyStart).toBeGreaterThan(-1)
    const emptyEnd = viewer.indexOf(') : (', emptyStart)
    const empty = viewer.slice(emptyStart, emptyEnd)
    const toggleIdx = empty.indexOf('{qualityToggle}')
    const agentIdx = empty.indexOf('Frame Agent')
    expect(toggleIdx).toBeGreaterThan(-1)
    expect(agentIdx).toBeGreaterThan(toggleIdx)
  })

  it('reuses expressScene Draft/Final copy and does not persist the session default', () => {
    const viewer = readSource(VIEWER)
    const page = readSource(PAGE)
    expect(viewer).toContain("useTranslations('production.expressScene')")
    expect(viewer).toContain("tExpressScene('qualityDraft')")
    expect(viewer).toContain("tExpressScene('qualityFinal')")
    expect(page).toContain(
      "const [frameGenerationQuality, setFrameGenerationQuality] = useState<StoryboardQuality>('draft')"
    )
    expect(page).toContain(
      '/** Session default for Frame Agent, Regen, and Direct Frame. Not persisted. */'
    )
  })
})

describe('Draft/Final seeds the three generation paths', () => {
  it('confirm dialog accepts defaultQuality and seeds on open without writing back', () => {
    const dialog = readSource(CONFIRM)
    const viewer = readSource(VIEWER)
    expect(dialog).toContain('defaultQuality?: StoryboardQuality')
    expect(dialog).toContain('setQuality(defaultQuality)')
    expect(dialog).toContain('<StoryboardQualityToggle')
    expect(dialog).not.toContain("setQuality('draft')")
    expect(dialog).not.toContain('onFrameGenerationQualityChange')
    expect(viewer).toContain('defaultQuality={frameGenerationQuality}')
  })

  it('beat Regen start and end pass the session quality instead of a draft literal', () => {
    const start = readHandler(PAGE, 'const handleGenerateBeatFrameImage = async (')
    const end = readHandler(PAGE, 'const handleGenerateBeatEndFrameImage = async (')
    for (const handler of [start, end]) {
      expect(handler).toContain("scope: 'selected'")
      expect(handler).toContain('quality: frameGenerationQuality')
      expect(handler).not.toContain("quality: 'draft'")
    }
  })

  it('Direct Frame dialog seeds modelTier from the session quality', () => {
    const dialog = readSource(DIRECT)
    const page = readSource(PAGE)
    expect(dialog).toContain('defaultModelTier?: ModelTier')
    expect(dialog).toContain('setModelTier(defaultModelTier)')
    expect(page).toContain('defaultModelTier={')
    expect(page).toContain(
      'resolveStoryboardGeneration({ storyboardQuality: frameGenerationQuality }).modelTier'
    )
    expect(resolveStoryboardGeneration({ storyboardQuality: 'draft' }).modelTier).toBe('eco')
    expect(resolveStoryboardGeneration({ storyboardQuality: 'final' }).modelTier).toBe('designer')
  })

  it('lifts session quality through ScriptPanel to the Scene card viewer', () => {
    const panel = readSource(SCRIPT_PANEL)
    expect(panel).toContain('frameGenerationQuality={frameGenerationQuality}')
    expect(panel).toContain('onFrameGenerationQualityChange={onFrameGenerationQualityChange}')
    expect(panel).toContain('frameGenerationQuality={frameGenerationQuality}')
    const page = readSource(PAGE)
    expect(page).toContain('frameGenerationQuality={frameGenerationQuality}')
    expect(page).toContain('onFrameGenerationQualityChange={setFrameGenerationQuality}')
  })
})

describe('Standard/Creative Frames toolbar default', () => {
  it('places the compact Standard | Creative toggle next to Draft | Final', () => {
    const viewer = readSource(VIEWER)
    expect(viewer).toContain('<StoryboardGenerationModeToggle')
    expect(viewer).toContain("tStillPolicy('standard')")
    expect(viewer).toContain("tStillPolicy('creative')")
    expect(viewer).toContain("tStillPolicy('modeTooltip')")
    const qualityToggle = viewer.indexOf('const qualityToggle =')
    const qualityBlock = viewer.slice(
      qualityToggle,
      viewer.indexOf('if (frameSlots.length === 0 && sceneBeats.length === 0')
    )
    const draftIdx = qualityBlock.indexOf('<StoryboardQualityToggle')
    const modeIdx = qualityBlock.indexOf('<StoryboardGenerationModeToggle')
    expect(draftIdx).toBeGreaterThan(-1)
    expect(modeIdx).toBeGreaterThan(draftIdx)
  })

  it('keeps session mode in page state and does not persist it', () => {
    const page = readSource(PAGE)
    expect(page).toContain(
      "const [frameGenerationMode, setFrameGenerationMode] = useState<StillGenerationMode>('standard')"
    )
    expect(page).toContain('Session default: Standard (Google) or Creative (Kling). Not persisted.')
    expect(page).toContain('frameGenerationMode={frameGenerationMode}')
    expect(page).toContain('onFrameGenerationModeChange={setFrameGenerationMode}')
    expect(page).toContain('stillGenerationMode: frameGenerationMode')
    expect(page).toContain('stillGenerationMode: generationMode')
  })

  it('confirm dialog seeds generation mode from the session without writing back', () => {
    const dialog = readSource(CONFIRM)
    const viewer = readSource(VIEWER)
    expect(dialog).toContain('defaultGenerationMode?: StillGenerationMode')
    expect(dialog).toContain('setGenerationMode(defaultGenerationMode)')
    expect(dialog).toContain('<StoryboardGenerationModeToggle')
    expect(dialog).not.toContain('onFrameGenerationModeChange')
    expect(viewer).toContain('defaultGenerationMode={frameGenerationMode}')
  })

  it('lifts session mode through ScriptPanel to the Scene card viewer', () => {
    const panel = readSource(SCRIPT_PANEL)
    expect(panel).toContain('frameGenerationMode={frameGenerationMode}')
    expect(panel).toContain('onFrameGenerationModeChange={onFrameGenerationModeChange}')
    const page = readSource(PAGE)
    expect(page).toContain('frameGenerationMode={frameGenerationMode}')
  })
})
