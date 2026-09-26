import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('scene navigation after the Shot label rename', () => {
  it('reads the beat in the Video Agent list instead of an unbound shot', () => {
    const dialog = readSource('src/components/vision/VideoAgentConfirmDialog.tsx')
    const listStart = dialog.indexOf('visibleBeats.map((beat)')
    expect(listStart).toBeGreaterThan(-1)
    const list = dialog.slice(listStart, dialog.indexOf('selectedSegmentIds.length > 0', listStart))
    expect(list).toContain('beat.isRendering')
    expect(list).toContain('beat.hasVideo')
    expect(list).toContain('beat.hasError')
    expect(list).not.toMatch(/\bshot\./)
  })

  it('counts excluded beats with the variable that is in scope', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(panel).toContain('const excludedBeatCount = useMemo(')
    expect(panel).toContain('excludedBeatCount > 0 ? `, ${excludedBeatCount} excluded`')
    expect(panel).not.toContain('excludedShotCount')
  })

  it('keeps Add Shot copy on the existing addBeat message keys', () => {
    const dialog = readSource('src/components/vision/scene-production/AddSegmentDialog.tsx')
    expect(dialog).toContain("t('addBeat.title')")
    expect(dialog).toContain("t('addBeat.directionScene')")
    expect(dialog).toContain("t('addBeat.addAction')")
    expect(dialog).not.toContain("t('addShot.")
  })
})
