import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relative: string): string {
  return readFileSync(path.join(ROOT, relative), 'utf8')
}

function listSources(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) return listSources(relative)
    return /\.tsx?$/.test(entry.name) ? [relative] : []
  })
}

const visionPage = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
const mixer = readSource('src/components/vision/scene-production/SceneProductionMixer.tsx')
const scriptPanel = readSource('src/components/vision/ScriptPanel.tsx')
const audioWorkbench = readSource('src/components/vision/scene-production/SceneAudioWorkbench.tsx')
const beatVideoGallery = readSource('src/components/vision/scene-production/BeatVideoGallery.tsx')

describe('Adding a language', () => {
  /**
   * The Screening Room, the Production Streams manager and the mixer's
   * language picker are the same user intent — "give me this film in another
   * language" — and used to run two different pipelines. The mixer went to
   * /api/vision/generate-all-audio, which wiped every language's audio before
   * generating and never wrote translations or player labels.
   */
  it('routes every surface through the one language stream handler', () => {
    const handlerPasses = visionPage.match(/handleGenerateLanguageStream\}/g) ?? []
    expect(handlerPasses).toHaveLength(3)
    expect(visionPage).toContain('onGenerateLanguageStream={handleGenerateLanguageStream}')
    expect(visionPage).toContain('onGenerateLanguage={handleGenerateLanguageStream}')
  })

  it('generates dialogue through the express pipeline, not a wipe-and-rebuild route', () => {
    expect(visionPage).toMatch(/handleGenerateLanguageStream[\s\S]{0,600}dialogueOnly: true/)
    expect(visionPage).not.toContain('handleGenerateAllAudio')
    expect(visionPage).not.toContain('deleteAllAudioFirst')
  })

  it('has no client left calling the removed batch audio route', () => {
    const offenders = [...listSources('src/app'), ...listSources('src/components')].filter(
      (relative) => readSource(relative).includes('/api/vision/generate-all-audio')
    )
    expect(offenders).toEqual([])
  })

  it('places Select Language (added only) and + Add Language on the Scene Card header while removing the redundant Mixer Stream card', () => {
    expect(scriptPanel).toContain('languagesNotYetAdded')
    expect(scriptPanel).toContain('addedSceneLanguages')
    expect(scriptPanel).toContain('placeholder="+ Add Language"')
    expect(scriptPanel).toContain('placeholder="Select language..."')
    expect(mixer).not.toContain('title="Stream"')
    expect(mixer).not.toMatch(/language === 'en' \? 'es'/)
  })

  it('keeps Audio and Clips statuses specific to the selected language instead of leaking English master status', () => {
    expect(scriptPanel).toContain("(selectedLanguage === 'en' ? beat.audioUrl : undefined)")
    expect(audioWorkbench).toContain("(props.selectedLanguage === 'en' ? beat.audioUrl : undefined)")
    expect(beatVideoGallery).toContain('const langComplete = hasLanguageClip || (!clip.needsLanguageClip && masterComplete)')
    expect(beatVideoGallery).toContain('label: `Needs ${languageName} clip`')
  })

  it('does not block dialogue-only language stream generation on project-wide reference images', () => {
    const start = visionPage.indexOf('const handleExpressGenerate = useCallback(')
    const end = visionPage.indexOf('const handleGenerateLanguageStream = useCallback(')
    const handler = visionPage.slice(start, end)
    expect(handler).toContain('if (!options.dialogueOnly && blockedByMissingReferences()) return')
    expect(handler).not.toMatch(/^\s*if\s*\(\s*blockedByMissingReferences\(\)\s*\)\s*return/m)
  })
})
