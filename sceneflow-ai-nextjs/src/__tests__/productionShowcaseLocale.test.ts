import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import { LANDING_TRANSLATE_LANGUAGES } from '@/config/landingTranslateLanguages'

const ROOT = join(process.cwd(), 'messages')
const ENGLISH_BADGE = 'Production Examples'

describe('productionShowcase locale copy', () => {
  const localeCodes = LANDING_TRANSLATE_LANGUAGES.map((l) => l.code).filter((c) => c !== 'en')

  it('defines six cards in English productionShowcase', () => {
    expect(enMessages.productionShowcase.cards).toHaveLength(6)
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
            screeningDoor?: string
            seriesDoor?: string
            blueprintDoor?: string
            scriptArDoor?: string
            cards?: Array<{ id?: string; title?: string }>
          }
        | undefined

      expect(showcase, `${code} missing productionShowcase namespace`).toBeTruthy()
      expect(typeof showcase?.badge).toBe('string')
      expect(typeof showcase?.title).toBe('string')
      expect(typeof showcase?.subtitle).toBe('string')
      expect(showcase?.cards).toHaveLength(6)

      // Shareable review link buttons are client-facing white-label doors and must be localized
      const doorPairs: Array<['screeningDoor' | 'seriesDoor' | 'blueprintDoor' | 'scriptArDoor', string]> = [
        ['screeningDoor', enMessages.productionShowcase.screeningDoor],
        ['seriesDoor', enMessages.productionShowcase.seriesDoor],
        ['blueprintDoor', enMessages.productionShowcase.blueprintDoor],
        ['scriptArDoor', enMessages.productionShowcase.scriptArDoor],
      ]
      for (const [key, enVal] of doorPairs) {
        const val = showcase?.[key]
        expect(typeof val, `${code} missing productionShowcase.${key}`).toBe('string')
        expect(val?.trim().length, `${code} empty productionShowcase.${key}`).toBeGreaterThan(1)
        expect(val, `${code} productionShowcase.${key} still untranslated English`).not.toBe(enVal)
        expect(val, `${code} productionShowcase.${key} has SFAI glossary leak`).not.toMatch(/SFAI/i)
      }
    })
  }

  it('localizes all 4 shareable review link door labels across every non-English locale catalog with zero SFAI leaks', () => {
    const allNonEnFiles = readdirSync(ROOT)
      .filter((f) => f.endsWith('.json') && f !== 'en.json' && !f.startsWith('_'))
      .sort()
    expect(allNonEnFiles.length).toBeGreaterThanOrEqual(38)

    const doorPairs: Array<['screeningDoor' | 'seriesDoor' | 'blueprintDoor' | 'scriptArDoor', string]> = [
      ['screeningDoor', enMessages.productionShowcase.screeningDoor],
      ['seriesDoor', enMessages.productionShowcase.seriesDoor],
      ['blueprintDoor', enMessages.productionShowcase.blueprintDoor],
      ['scriptArDoor', enMessages.productionShowcase.scriptArDoor],
    ]

    for (const file of allNonEnFiles) {
      const localeMessages = JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as {
        productionShowcase?: Record<string, unknown>
      }
      const showcase = localeMessages.productionShowcase
      expect(showcase, `${file} missing productionShowcase`).toBeTruthy()
      for (const [key, enVal] of doorPairs) {
        const val = String(showcase?.[key] ?? '')
        expect(val.trim().length, `${file} ${key} empty`).toBeGreaterThan(1)
        expect(val, `${file} ${key} still English`).not.toBe(enVal)
        expect(val, `${file} ${key} has SFAI leak`).not.toMatch(/SFAI/i)
      }
    }
  })
})
