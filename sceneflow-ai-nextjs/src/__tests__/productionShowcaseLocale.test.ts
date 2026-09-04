import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { LANDING_TRANSLATE_LANGUAGES } from '@/config/landingTranslateLanguages'

const ROOT = join(process.cwd(), 'messages')
const ENGLISH_BADGE = 'Production Examples'

describe('productionShowcase locale copy', () => {
  const localeCodes = LANDING_TRANSLATE_LANGUAGES.map((l) => l.code).filter((c) => c !== 'en')

  it('defines four cards in English productionShowcase', () => {
    expect(enMessages.productionShowcase.cards).toHaveLength(4)
    expect(enMessages.productionShowcase.badge).toBe(ENGLISH_BADGE)
  })

  for (const code of localeCodes) {
    it(`has productionShowcase namespace for ${code}`, () => {
      const localeMessages = JSON.parse(
        readFileSync(join(ROOT, `${code}.json`), 'utf8')
      ) as Record<string, unknown>

      const showcase = localeMessages.productionShowcase as
        | {
            badge?: string
            title?: string
            subtitle?: string
            cards?: Array<{ id?: string; title?: string }>
          }
        | undefined

      expect(showcase, `${code} missing productionShowcase namespace`).toBeTruthy()
      expect(typeof showcase?.badge).toBe('string')
      expect(typeof showcase?.title).toBe('string')
      expect(typeof showcase?.subtitle).toBe('string')
      expect(showcase?.cards).toHaveLength(4)
    })
  }
})
