import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Directed set version wiring', () => {
  it('Scene References offers Directed set version next to Add reference', () => {
    const panel = readSource('src/components/vision/SceneReferencesPanel.tsx')
    expect(panel).toContain('DirectedLocationVersionDialog')
    expect(panel).toContain("tLocation('addDirectedVersion')")
    expect(panel).toContain('onAddDirectedLocationVersion')
    expect(panel).toContain('DirectedLocationVersionInput')
  })

  it('Location Library offers Add directed version beside Update', () => {
    const library = readSource('src/components/vision/LocationLibrary.tsx')
    expect(library).toContain("t('addDirectedVersion')")
    expect(library).toContain("t('update')")
    expect(library).toContain('appendDirectedLocationVersion')
    expect(library.indexOf("t('addDirectedVersion')")).toBeLessThan(library.indexOf("t('update')"))
  })

  it('dialog writes sticky-forward appliesFrom from the starting beat', () => {
    const dialog = readSource('src/components/vision/DirectedLocationVersionDialog.tsx')
    expect(dialog).toContain('appliesFrom: LocationVersionAppliesFrom')
    expect(dialog).toContain('sceneNumber: selectedBeat.sceneNumber')
    expect(dialog).toContain('beatIndex: selectedBeat.beatIndex')
    expect(dialog).toContain("t('directedVersionHint')")
  })

  it('page persists a directed version and stamps Direct Frame appliesFrom', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('handleAddDirectedLocationVersion')
    expect(page).toContain('appendDirectedLocationVersion')
    expect(page).toContain('stampLocationVersionAppliesFrom')
    expect(page).toContain('onAddDirectedLocationVersion={handleAddDirectedLocationVersion}')
    const directStart = page.indexOf('const handleDirectFrameGenerate')
    const nextHandler = page.indexOf('const handleGenerateDialogueFrameImage')
    const direct = page.slice(directStart, nextHandler)
    expect(direct).toContain('stampLocationVersionAppliesFrom')
    expect(direct).toContain('!version.appliesFrom')
  })

  it('ScriptPanel passes directed beats from the scene card', () => {
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(panel).toContain('directedBeatOptionsFromScene')
    expect(panel).toContain('onAddDirectedLocationVersion={onAddDirectedLocationVersion}')
  })

  it('lists spoken lines as starting-beat options', () => {
    const dialog = readSource('src/components/vision/DirectedLocationVersionDialog.tsx')
    expect(dialog).toContain('export function directedBeatOptionsFromScene')
    expect(dialog).toContain('beat.line || beat.actionDescription || beat.kind')
  })
})
