import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { resolveVideoGeneration } from '@/lib/video/videoGenerationPolicy'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

const PAGE = 'src/app/dashboard/workflow/vision/[projectId]/page.tsx'
const CONSOLE = 'src/components/vision/scene-production/DirectorConsoleImpl.tsx'
const CONFIRM = 'src/components/vision/VideoAgentConfirmDialog.tsx'
const SCRIPT_PANEL = 'src/components/vision/ScriptPanel.tsx'
const DIALOG = 'src/components/vision/scene-production/DirectorDialog.tsx'

describe('Draft/Final Video toolbar default', () => {
  it('places the compact toggles immediately before Video Agent in Footage controls', () => {
    const consoleSrc = readSource(CONSOLE)
    const controlsStart = consoleSrc.indexOf('const generateControls =')
    const controlsEnd = consoleSrc.indexOf('const videoSection =')
    expect(controlsStart).toBeGreaterThan(-1)
    expect(controlsEnd).toBeGreaterThan(controlsStart)
    const controls = consoleSrc.slice(controlsStart, controlsEnd)
    const qualityIdx = controls.indexOf('<StoryboardQualityToggle')
    const modeIdx = controls.indexOf('<StoryboardGenerationModeToggle')
    const agentIdx = controls.indexOf("tVideoAgent('toolbarButton')")
    expect(qualityIdx).toBeGreaterThan(-1)
    expect(modeIdx).toBeGreaterThan(qualityIdx)
    expect(agentIdx).toBeGreaterThan(modeIdx)
    expect(controls).toContain('size="compact"')
  })

  it('reuses videoAgent Draft/Final copy and does not persist the session default', () => {
    const consoleSrc = readSource(CONSOLE)
    const page = readSource(PAGE)
    expect(consoleSrc).toContain("useTranslations('production.videoAgent')")
    expect(consoleSrc).toContain("tVideoAgent('qualityDraft')")
    expect(consoleSrc).toContain("tVideoAgent('qualityFinal')")
    expect(page).toContain(
      "const [videoGenerationQuality, setVideoGenerationQuality] = useState<VideoGenerationQuality>('draft')"
    )
    expect(page).toContain(
      '/** Session default for Video Agent and Take. Not persisted. */'
    )
  })
})

describe('Draft/Final seeds Video Agent and Take', () => {
  it('confirm dialog accepts defaultQuality and seeds on open without writing back', () => {
    const dialog = readSource(CONFIRM)
    const consoleSrc = readSource(CONSOLE)
    expect(dialog).toContain('defaultQuality?: VideoGenerationQuality')
    expect(dialog).toContain('setQuality(defaultQuality)')
    expect(dialog).toContain('<StoryboardQualityToggle')
    expect(dialog).not.toContain('onVideoGenerationQualityChange')
    expect(consoleSrc).toContain('defaultQuality={videoGenerationQuality}')
    expect(consoleSrc).not.toContain("setQuality('draft')")
  })

  it('Take dialog seeds from session video quality and mode', () => {
    const dialog = readSource(DIALOG)
    const consoleSrc = readSource(CONSOLE)
    expect(dialog).toContain('videoGenerationQuality?: VideoGenerationQuality')
    expect(dialog).toContain('videoGenerationMode?: VideoGenerationMode')
    expect(dialog).toContain('const nextTakeMode: \'standard\' | \'creative\' = videoGenerationMode')
    expect(consoleSrc).toContain('videoGenerationQuality={videoGenerationQuality}')
    expect(consoleSrc).toContain('videoGenerationMode={videoGenerationMode}')
  })

  it('lifts session video quality through ScriptPanel to DirectorWorkflow', () => {
    const panel = readSource(SCRIPT_PANEL)
    expect(panel).toContain('videoGenerationQuality={videoGenerationQuality}')
    expect(panel).toContain('onVideoGenerationQualityChange={onVideoGenerationQualityChange}')
    expect(panel).toContain('videoGenerationMode={videoGenerationMode}')
    const page = readSource(PAGE)
    expect(page).toContain('videoGenerationQuality={videoGenerationQuality}')
    expect(page).toContain('onVideoGenerationQualityChange={setVideoGenerationQuality}')
    expect(page).toContain('onVideoGenerationModeChange={setVideoGenerationMode}')
  })
})

describe('Standard/Creative Footage toolbar default', () => {
  it('places Standard | Creative next to Draft | Final', () => {
    const consoleSrc = readSource(CONSOLE)
    const controlsStart = consoleSrc.indexOf('const generateControls =')
    const controls = consoleSrc.slice(controlsStart, consoleSrc.indexOf('const videoSection ='))
    const draftIdx = controls.indexOf('<StoryboardQualityToggle')
    const modeIdx = controls.indexOf('<StoryboardGenerationModeToggle')
    expect(draftIdx).toBeGreaterThan(-1)
    expect(modeIdx).toBeGreaterThan(draftIdx)
    expect(controls).toContain("tVideoAgent('modeStandard')")
    expect(controls).toContain("tVideoAgent('modeCreative')")
    expect(controls).toContain("tVideoAgent('modeTooltip')")
  })

  it('keeps session mode in page state and does not persist it', () => {
    const page = readSource(PAGE)
    expect(page).toContain(
      "const [videoGenerationMode, setVideoGenerationMode] = useState<VideoGenerationMode>('standard')"
    )
    expect(page).toContain(
      'Session default: Standard (Google Veo) or Creative (Kling). Not persisted.'
    )
  })

  it('confirm dialog seeds generation mode from the session without writing back', () => {
    const dialog = readSource(CONFIRM)
    const consoleSrc = readSource(CONSOLE)
    expect(dialog).toContain('defaultGenerationMode?: VideoGenerationMode')
    expect(dialog).toContain('setGenerationMode(defaultGenerationMode)')
    expect(dialog).toContain('<StoryboardGenerationModeToggle')
    expect(dialog).not.toContain('onVideoGenerationModeChange')
    expect(consoleSrc).toContain('defaultGenerationMode={videoGenerationMode}')
  })
})

describe('Video Agent confirm runs resolveVideoGeneration', () => {
  it('does not hard-code Kling pro on the batch path', () => {
    const consoleSrc = readSource(CONSOLE)
    expect(consoleSrc).toContain('applyVideoGenerationToConfig')
    expect(consoleSrc).toContain('resolveVideoGeneration')
    expect(consoleSrc).toContain('handleVideoAgentConfirm')
    expect(consoleSrc).not.toContain("klingQuality: 'pro'")
    expect(consoleSrc).not.toContain("klingModel: 'kling-v3-omni'")
    expect(consoleSrc).not.toContain('onClick={handleExpress}')
    expect(consoleSrc).not.toContain('>Generate</Button>')
  })

  it('labels the Footage batch button Video Agent', () => {
    const consoleSrc = readSource(CONSOLE)
    expect(consoleSrc).toContain("tVideoAgent('toolbarButton')")
    expect(consoleSrc).toContain('handleOpenVideoAgent')
    expect(readSource(CONFIRM)).toContain("{t('confirm')}")
    expect(readSource('messages/app/en/production.json')).toContain('"confirm": "Video Agent"')
  })

  it('resolver matrix matches the Footage policy', () => {
    expect(resolveVideoGeneration({ quality: 'draft', mode: 'standard' }).videoProvider).toBe(
      'vertex'
    )
    expect(resolveVideoGeneration({ quality: 'final', mode: 'creative' }).klingQuality).toBe('pro')
  })
})
