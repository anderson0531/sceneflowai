import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  blueprintNeedsEnglishRewrite,
  looksNonEnglishAuthorship,
  REWRITE_BLUEPRINT_ENGLISH_INTENT,
} from '@/lib/blueprint/rewriteBlueprintEnglish'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('looksNonEnglishAuthorship', () => {
  it('ignores English treatment copy', () => {
    expect(
      looksNonEnglishAuthorship(
        'A mentor secretly becomes the antagonist. The second act rebalances so the betrayal lands.'
      )
    ).toBe(false)
  })

  it('flags Spanish function words and inverted punctuation', () => {
    expect(looksNonEnglishAuthorship('El protagonista está en la ciudad.')).toBe(true)
    expect(looksNonEnglishAuthorship('¿Qué debería cambiar?')).toBe(true)
  })
})

describe('blueprintNeedsEnglishRewrite', () => {
  it('is true when the project is stamped as a non-English source', () => {
    expect(
      blueprintNeedsEnglishRewrite({
        sourceLocale: 'es',
        title: 'The Last Lantern',
      })
    ).toBe(true)
  })

  it('is true when stored fields look Spanish even if unstamped', () => {
    expect(
      blueprintNeedsEnglishRewrite({
        title: 'La última linterna',
        logline: 'Un protagonista enfrenta a su mentor.',
      })
    ).toBe(true)
  })

  it('is false for an English stamped project', () => {
    expect(
      blueprintNeedsEnglishRewrite({
        sourceLocale: 'en',
        title: 'The Last Lantern',
        logline: 'A thief returns a debt.',
      })
    ).toBe(false)
  })
})

describe('resolveExistingContentStoryLocale', () => {
  const resolver = readSource('src/i18n/server/storyLocale.ts')

  it('ignores account story_locale and preferred_locale', () => {
    const start = resolver.indexOf('export async function resolveExistingContentStoryLocale')
    const body = resolver.slice(start)
    expect(body).toContain('readContentEntityI18n')
    expect(body).toContain('contentStamped')
    expect(body).not.toContain('user.story_locale')
    expect(body).not.toContain('preferred_locale')
    expect(body).toContain("source: 'default'")
  })
})

describe('the leak is closed at every authorship seam', () => {
  it('AR analyze uses the content-stamped helper, not the UI cookie', () => {
    const route = readSource('src/app/api/treatment/audience-resonance/route.ts')
    expect(route).toContain('resolveExistingContentStoryLocale')
    expect(route).not.toContain('resolveRequestStoryLocale')
  })

  it('refine and guided-revise use the same helper', () => {
    const refine = readSource('src/app/api/treatment/refine/route.ts')
    const revise = readSource('src/app/api/treatment/guided-revise/start/route.ts')
    expect(refine).toContain('resolveExistingContentStoryLocale')
    expect(revise).toContain('resolveExistingContentStoryLocale')
  })

  it('guided-revise honours an explicit English storyLocale from the client', () => {
    const dialog = readSource('src/components/blueprint/BlueprintRefineDialog.tsx')
    expect(dialog).toContain('storyLocale')
    expect(dialog).toContain("'/api/treatment/guided-revise/start'")
    expect(REWRITE_BLUEPRINT_ENGLISH_INTENT.toLowerCase()).toContain('english')
  })

  it('apply stamps the locale the job wrote, not storyI18n.sourceLocale', () => {
    const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
    expect(studio).toContain('withContentStampedSourceLocale(blueprintRefineStoryLocale)')
    expect(studio).not.toContain('withContentStampedSourceLocale(storyI18n.sourceLocale)')
  })

  it('Rewrite in English starts a full-balance job and re-runs AR in English', () => {
    const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
    const panel = readSource('src/components/blueprint/AudienceResonancePanelV3.tsx')
    const card = readSource('src/components/blueprint/TreatmentCard.tsx')
    expect(panel).toContain('rewriteToEnglish: true')
    expect(card).toContain('rewriteToEnglish: true')
    expect(studio).toContain("requestBlueprintReanalyze('en')")
    expect(dialogSendsEnglish(studio, panel)).toBe(true)
  })
})

function dialogSendsEnglish(
  studio: string,
  panel: string
): boolean {
  return studio.includes("requestBlueprintReanalyze('en')") && panel.includes("storyLocale: 'en'")
}
