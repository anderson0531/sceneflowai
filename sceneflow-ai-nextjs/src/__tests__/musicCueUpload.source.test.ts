import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

const PANEL = 'src/components/vision/SceneMusicCuePanel.tsx'
const SCRIPT = 'src/components/vision/ScriptPanel.tsx'

describe('music score cue upload', () => {
  it('exposes an upload control on every cue row', () => {
    const panel = readSource(PANEL)
    expect(panel).toContain('onUploadCue')
    expect(panel).toContain('uploadingCueId')
    expect(panel).toContain('title="Upload cue"')
    expect(panel).toContain('<Upload className="w-4 h-4" />')
    expect(panel).toContain('{uploadButton}')
  })

  it('offers upload next to Generate when the cue has no track yet', () => {
    const panel = readSource(PANEL)
    const start = panel.indexOf('{!scored && (')
    expect(start).toBeGreaterThan(-1)
    const unscored = panel.slice(start, start + 1200)
    expect(unscored).toContain('Generate ({MUSIC_CREDITS})')
    expect(unscored).toContain('{uploadButton}')
  })

  it('saves the uploaded file onto the named cue, not the scene track', () => {
    const script = readSource(SCRIPT)
    const start = script.indexOf('const uploadMusicCue = async')
    const end = script.indexOf('const generateAllMusicCues', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const handler = script.slice(start, end)
    expect(handler).toContain('uploadAssetViaAPI(file, projectId)')
    expect(handler).toContain('await saveSceneAudio(')
    expect(handler).toContain('cueId')
    expect(handler).toContain("'music'")
    expect(handler).not.toContain("uploadAudio?.(sceneIdx, 'music')")
  })

  it('wires the Score panel upload control through ScriptPanel', () => {
    const script = readSource(SCRIPT)
    expect(script).toContain('onUploadCue={')
    expect(script).toContain('uploadMusicCue(sceneIdx, cueId)')
    expect(script).toContain('uploadingCueId={')
    expect(script).toContain('uploadingMusicCue={uploadingMusicCue}')
  })
})
