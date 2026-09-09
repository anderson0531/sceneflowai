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

  it('flags ñ as a non-English marker', () => {
    expect(looksNonEnglishAuthorship('España')).toBe(true)
    expect(looksNonEnglishAuthorship('niño')).toBe(true)
  })

  it('flags accented Spanish vowels in multi-word context', () => {
    expect(looksNonEnglishAuthorship('Conspiración del poder')).toBe(true)
    expect(looksNonEnglishAuthorship('Histórico narrativa')).toBe(true)
  })

  it('flags common Spanish function-word phrases', () => {
    expect(looksNonEnglishAuthorship('una implacable ciber-investigadora')).toBe(true)
    expect(looksNonEnglishAuthorship('del mundo que conoce los secretos')).toBe(true)
    expect(looksNonEnglishAuthorship('para descifrar un letal secreto')).toBe(true)
    expect(looksNonEnglishAuthorship('con dilemas morales')).toBe(true)
    expect(looksNonEnglishAuthorship('que amenaza con borrar su existencia')).toBe(true)
  })

  it('flags cuando, entre, sobre, desde', () => {
    expect(looksNonEnglishAuthorship('Cuando un enigmático artefacto')).toBe(true)
    expect(looksNonEnglishAuthorship('entre las ruinas del pasado')).toBe(true)
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

  it('detects Spanish genre even when title and logline are English', () => {
    expect(
      blueprintNeedsEnglishRewrite({
        title: 'The Faraday Echo',
        logline: 'When a reclusive historian unlocks a suppressed artifact...',
        genre: 'Thriller Histórico / Tecno-Thriller de Conspiración',
      })
    ).toBe(true)
  })

  it('is false when genre is English', () => {
    expect(
      blueprintNeedsEnglishRewrite({
        title: 'The Faraday Echo',
        logline: 'A historian uncovers the truth.',
        genre: 'Historical Thriller',
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

  it('film-treatment uses content-stamped helper for existing projects', () => {
    const filmTreatment = readSource('src/app/api/ideation/film-treatment/route.ts')
    expect(filmTreatment).toContain('resolveExistingContentStoryLocale')
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

  it('toolbar forwards explicit options like rewriteToEnglish', () => {
    const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
    expect(studio).toContain('openBlueprintRefineFromToolbar = useCallback((opts?: OpenBlueprintRefineOptions)')
  })

  it('clears stale AR analysis on blueprint regeneration', () => {
    const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
    expect(studio).toContain('setSavedBlueprintAR(null)')
    expect(studio).toContain('blueprintAudienceResonance: null')
  })

  it('useAccountStoryLocale does not read the UI locale cookie', () => {
    const storyLocale = readSource('src/i18n/useStoryLocale.ts')
    expect(storyLocale).not.toContain('readUiLocaleCookie')
  })

  it('genre is checked by blueprintNeedsEnglishRewrite callers', () => {
    const panel = readSource('src/components/blueprint/AudienceResonancePanelV3.tsx')
    const card = readSource('src/components/blueprint/TreatmentCard.tsx')
    expect(panel).toContain("genre: String(treatment?.genre || '')")
    expect(card).toContain("genre: String(activeVariant.genre || '')")
  })
})

function dialogSendsEnglish(
  studio: string,
  panel: string
): boolean {
  return studio.includes("requestBlueprintReanalyze('en')") && panel.includes("storyLocale: 'en'")
}
