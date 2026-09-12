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

  it('lets the mixer pick the language instead of guessing Spanish', () => {
    expect(mixer).toContain('languagesNotYetGenerated')
    expect(mixer).toContain('placeholder="+ Add Language"')
    expect(mixer).not.toMatch(/language === 'en' \? 'es'/)
  })
})
