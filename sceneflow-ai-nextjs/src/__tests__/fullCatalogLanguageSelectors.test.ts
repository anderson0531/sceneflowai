import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('full-catalog language selectors', () => {
  const root = process.cwd()

  it('ScriptPanel Scene Card header splits Select Language (added only) and + Add Language into two distinctive controls', () => {
    const source = readFileSync(
      join(root, 'src/components/vision/ScriptPanel.tsx'),
      'utf8'
    )
    expect(source).toMatch(
      /GroupedLanguageSelector[\s\S]*?filterCodes=\{addedSceneLanguages\}[\s\S]*?intent="navigate"[\s\S]*?placeholder="Select language\.\.\."/
    )
    expect(source).toMatch(
      /GroupedLanguageSelector[\s\S]*?onValueChange=\{handleAddSceneLanguage\}[\s\S]*?filterCodes=\{languagesNotYetAdded\}[\s\S]*?intent="generate"[\s\S]*?placeholder="\+ Add Language"/
    )
    expect(source).not.toMatch(/placeholder="Generate language\.\.\."/)
  })

  it('SceneGallery Screening selector omits filterCodes so missing langs can open generate dialog', () => {
    const source = readFileSync(
      join(root, 'src/components/vision/SceneGallery.tsx'),
      'utf8'
    )
    expect(source).not.toMatch(
      /GroupedLanguageSelector[\s\S]{0,200}filterCodes=\{availableLanguages\}/
    )
    expect(source).toContain('setLanguageGenDialogOpen(true)')
    expect(source).toContain('onValueChange={handleLanguageSelect}')
  })

  it('AudioGalleryPlayer uses full catalog unless stream-ready mode', () => {
    const source = readFileSync(
      join(root, 'src/components/vision/AudioGalleryPlayer.tsx'),
      'utf8'
    )
    expect(source).toMatch(
      /playbackMode === 'stream' && streamReadyLanguages\.length > 0/
    )
    expect(source).toMatch(/: undefined/)
    // Do not hide the toolbar selector behind length > 1 for English-only projects.
    expect(source).not.toMatch(/languageFilterCodes\.length > 1 && \(/)
  })
})
