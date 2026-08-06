import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  beginLocaleSwitch,
  endLocaleSwitch,
  getLocaleSwitchState,
  getLocaleSwitchServerState,
  subscribeLocaleSwitch,
} from '@/i18n/localeSwitchStatus'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('locale switch status store', () => {
  beforeEach(() => endLocaleSwitch())

  it('starts idle', () => {
    expect(getLocaleSwitchState()).toEqual({ pending: false })
  })

  it('carries the target locale so the overlay can name it', () => {
    beginLocaleSwitch('es')
    expect(getLocaleSwitchState()).toEqual({ pending: true, locale: 'es' })
  })

  it('notifies subscribers on both edges', () => {
    let calls = 0
    const unsubscribe = subscribeLocaleSwitch(() => {
      calls += 1
    })
    beginLocaleSwitch('ar')
    endLocaleSwitch()
    unsubscribe()
    beginLocaleSwitch('th')
    expect(calls).toBe(2)
  })

  it('is never pending during SSR, so the overlay cannot be prerendered', () => {
    beginLocaleSwitch('es')
    expect(getLocaleSwitchServerState()).toEqual({ pending: false })
  })
})

describe('the overlay covers the whole switch', () => {
  const hook = readSource('src/i18n/useUiLocale.ts')

  it('raises before the profile write, not just before the reload', () => {
    const beginAt = hook.indexOf('beginLocaleSwitch(nextLocale)')
    const fetchAt = hook.indexOf("fetch('/api/user/locale'")
    const reloadAt = hook.indexOf('window.location.reload()')
    expect(beginAt).toBeGreaterThan(-1)
    expect(beginAt).toBeLessThan(fetchAt)
    expect(fetchAt).toBeLessThan(reloadAt)
  })

  it('clears the overlay when the caller opted out of the reload', () => {
    // Without a reload nothing replaces the document, so the store must be
    // released explicitly or the overlay would stay up forever.
    expect(hook).toContain('endLocaleSwitch()')
  })

  it('is raised from the Settings card too, which reloads on its own timer', () => {
    const card = readSource('src/components/i18n/LanguageSettingsCard.tsx')
    expect(card).toContain('beginLocaleSwitch(patch.uiLocale)')
  })
})

describe('overlay placement', () => {
  const layout = readSource('src/app/layout.tsx')

  it('mounts once at the root', () => {
    expect(layout).toContain('<LocaleSwitchOverlay />')
  })

  it('sits outside the message provider', () => {
    // It renders while the old catalog is still loaded, so translated copy
    // would name the language being left rather than the one being adopted.
    const providerEnd = layout.indexOf('</ClientAppMessagesProvider>')
    const overlayAt = layout.indexOf('<LocaleSwitchOverlay />')
    expect(providerEnd).toBeGreaterThan(-1)
    expect(overlayAt).toBeGreaterThan(providerEnd)
  })

  it('labels itself with the target endonym rather than the catalog', () => {
    const overlay = readSource('src/components/i18n/LocaleSwitchOverlay.tsx')
    expect(overlay).toContain('getLocaleNativeName(state.locale)')
    expect(overlay).not.toContain('useTranslations')
  })
})

describe('content translation reports its own progress', () => {
  it('exposes how many fields are in flight', () => {
    const hook = readSource('src/i18n/content/useContentTranslation.ts')
    expect(hook).toContain('setPendingCount(pending.length)')
    expect(hook).toContain('pendingCount')
  })

  it('names the wait instead of leaving bare spinners', () => {
    const field = readSource('src/components/i18n/LocalizedField.tsx')
    expect(field).toContain("t('translatingFields', { count: pendingCount })")

    const catalog = JSON.parse(readSource('messages/app/en/common.json'))
    expect(catalog.language.translatingFields).toContain('{count')
  })
})

describe('the header is the only language control in the studio', () => {
  const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
  const hook = readSource('src/i18n/useUiLocale.ts')

  it('does not show a second story-language badge beside the header', () => {
    // The badge reported generation language and stayed pinned to stale project
    // metadata.i18n overrides; the header is the sole studio language control.
    expect(studio).not.toContain('<StoryLocaleBadge')
    expect(studio).not.toContain('<StoryLocaleControl')
  })

  it('keeps account story language editable in Settings', () => {
    const settings = readSource('src/components/i18n/LanguageSettingsCard.tsx')
    expect(settings).toContain('storyLocale')
  })

  it('lets the story language follow the interface language', () => {
    // Nothing to keep in sync if the account default already falls through.
    const resolver = readSource('src/i18n/server/storyLocale.ts')
    expect(resolver).toContain('user.story_locale ?? user.preferred_locale')
  })

  it('header switch writes both uiLocale and storyLocale', () => {
    expect(hook).toContain("JSON.stringify({ uiLocale: nextLocale, storyLocale: nextLocale })")
    expect(hook).toContain('setCachedAccountStoryLocale(nextLocale)')
  })
})

describe('Blueprint read path uses content MT, not Google Translate', () => {
  it('TreatmentCard wires useContentTranslation for display fields', () => {
    const card = readSource('src/components/blueprint/TreatmentCard.tsx')
    expect(card).toContain('useContentTranslation')
    expect(card).toContain('buildTreatmentVariantDisplayFields')
    expect(card).toContain('TranslationNotice')
    expect(card).toContain('contentI18n')
  })

  it('Audience Resonance panel translates analysis prose the same way', () => {
    const panel = readSource('src/components/blueprint/AudienceResonancePanelV3.tsx')
    expect(panel).toContain('useContentTranslation')
    expect(panel).toContain('buildAudienceResonanceDisplayFields')
    expect(panel).toContain('TranslationNotice')
  })

  it('hero billboard title/logline/genre go through content MT', () => {
    const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
    expect(studio).toContain('useContentTranslation')
    expect(studio).toContain('buildTreatmentVariantDisplayFields')
    expect(studio).toContain('heroTitle')
    expect(studio).toContain('title={heroTitle}')
    expect(studio).toContain('subtitle={heroSubtitle}')
    expect(studio).toContain('genre={heroGenre}')
  })

  it('sidebar menu labels come from common.nav catalogs', () => {
    const sidebar = readSource('src/components/layout/GlobalSidebarUnified.tsx')
    expect(sidebar).toContain("useTranslations('common.nav')")
    expect(sidebar).toContain('tNav(item.labelKey)')
    expect(sidebar).toContain("tNav('workflow')")
    expect(sidebar).toContain("tNav('credits')")
    expect(sidebar).not.toMatch(/<span>\{item\.label\}<\/span>/)
  })

  it('studio routes stay catalog-only (no GT widget)', () => {
    const surfaces = readSource('src/config/i18n/gtSurfaces.ts')
    expect(surfaces).toMatch(/prefix:\s*'\/dashboard\/studio'[\s\S]*?mode:\s*'catalog'/)
  })

  it('content source defaults to English when project i18n is unset', () => {
    // So syncing account story_locale with the header does not disable MT for
    // existing English treatments. Legacy preference-only stamps are healed by
    // readContentEntityI18n (not raw readEntityI18n).
    const entity = readSource('src/i18n/content/entityI18n.ts')
    expect(entity).toContain("sourceLocale: DEFAULT_LOCALE")
    expect(entity).toContain('readContentEntityI18n')
    expect(entity).toContain('contentStamped')
    const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
    expect(studio).toContain('readContentEntityI18n(')
  })

  it('stamps content authorship locale on Blueprint generate and create', () => {
    const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
    expect(studio).toContain('withContentStampedSourceLocale')
    expect(studio).toContain('mergeEntityI18nIntoMetadata')
    expect(studio).toContain('contentI18nStamp')
    const filmTreatment = readSource('src/app/api/ideation/film-treatment/route.ts')
    expect(filmTreatment).toContain('storyLocale,')
  })

  it('does not skip Vertex translation merely because the target is English', () => {
    const translate = readSource('src/lib/vertexai/translate.ts')
    expect(translate).not.toMatch(/targetLanguage === ['"]en['"]\s*\|\|/)
    expect(translate).toContain('if (targetLanguage === sourceLanguage)')
  })
})
