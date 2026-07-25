import { describe, it, expect } from 'vitest'
import {
  INTRO_ANIMATIC_ACT_ORDER,
  INTRO_ANIMATIC_BEATS,
  INTRO_ANIMATIC_LOCALES,
  INTRO_ANIMATIC_LOCALE_IDS,
  INTRO_ANIMATIC_REFERENCES,
  INTRO_ANIMATIC_STYLE_LOCK_MARKER,
  formatIntroAnimaticTimecode,
  getIntroAnimaticNarration,
  getIntroAnimaticRuntimeSeconds,
  getIntroAnimaticWordCount,
  type IntroAnimaticLocaleId,
} from '@/config/landing/introductionAnimaticScript'
import {
  buildIntroAnimaticHtml,
  buildIntroAnimaticMarkdown,
  buildIntroAnimaticNarrationText,
} from '@/lib/export/scriptDocExport'

function parseTimecode(timecode: string): number {
  const [minutes, seconds] = timecode.split(':').map(Number)
  return minutes * 60 + seconds
}

describe('introduction animatic locales', () => {
  it('covers exactly the six requested languages', () => {
    expect(INTRO_ANIMATIC_LOCALE_IDS).toEqual(['en', 'es', 'pt', 'zh', 'ar', 'th'])
  })

  it('marks Arabic as the only right-to-left locale', () => {
    const rtl = INTRO_ANIMATIC_LOCALES.filter((locale) => locale.dir === 'rtl')
    expect(rtl.map((locale) => locale.id)).toEqual(['ar'])
  })

  it('flags non-English narration as pending native review', () => {
    for (const locale of INTRO_ANIMATIC_LOCALES) {
      expect(locale.reviewed, locale.id).toBe(locale.id === 'en')
    }
  })

  it('carries a TTS short code that maps to a Gemini locale', () => {
    for (const locale of INTRO_ANIMATIC_LOCALES) {
      expect(locale.ttsShortCode, locale.id).toBeTruthy()
    }
  })
})

describe('introduction animatic beats', () => {
  it('has narration for every locale on every beat', () => {
    expect(INTRO_ANIMATIC_BEATS.length).toBeGreaterThanOrEqual(12)

    for (const beat of INTRO_ANIMATIC_BEATS) {
      for (const localeId of INTRO_ANIMATIC_LOCALE_IDS) {
        const line = beat.narration[localeId]
        expect(line, `beat ${beat.id} / ${localeId}`).toBeTruthy()
        expect(line.trim(), `beat ${beat.id} / ${localeId}`).not.toBe('')
      }
    }
  })

  it('uses contiguous timecodes consistent with each duration', () => {
    let expected = 0
    for (const beat of INTRO_ANIMATIC_BEATS) {
      expect(parseTimecode(beat.timecode), `beat ${beat.id}`).toBe(expected)
      expect(beat.durationSeconds, `beat ${beat.id}`).toBeGreaterThan(0)
      expected += beat.durationSeconds
    }
    expect(getIntroAnimaticRuntimeSeconds()).toBe(expected)
  })

  it('numbers beats sequentially with zero padding', () => {
    INTRO_ANIMATIC_BEATS.forEach((beat, index) => {
      expect(beat.id).toBe(String(index + 1).padStart(2, '0'))
    })
  })

  it('ends every frame prompt with the style-lock marker', () => {
    for (const beat of INTRO_ANIMATIC_BEATS) {
      expect(beat.framePrompt.trim().endsWith(INTRO_ANIMATIC_STYLE_LOCK_MARKER), beat.id).toBe(true)
    }
  })

  it('only uses acts declared in the act order', () => {
    for (const beat of INTRO_ANIMATIC_BEATS) {
      expect(INTRO_ANIMATIC_ACT_ORDER).toContain(beat.act)
    }
  })

  it('references only reference tokens that are defined', () => {
    const tokens = INTRO_ANIMATIC_REFERENCES.map((reference) => reference.token)
    const referenced = new Set<string>()

    for (const beat of INTRO_ANIMATIC_BEATS) {
      for (const token of tokens) {
        if (beat.framePrompt.includes(token)) referenced.add(token)
      }
    }

    // Every declared reference should earn its place in at least one frame.
    expect([...referenced].sort()).toEqual([...tokens].sort())
  })

  it('keeps frames free of baked-in text so locales share one visual spine', () => {
    for (const beat of INTRO_ANIMATIC_BEATS) {
      expect(beat.framePrompt.toLowerCase(), beat.id).not.toContain('title card')
    }
  })
})

describe('introduction animatic helpers', () => {
  it('returns one narration line per beat', () => {
    for (const localeId of INTRO_ANIMATIC_LOCALE_IDS) {
      expect(getIntroAnimaticNarration(localeId)).toHaveLength(INTRO_ANIMATIC_BEATS.length)
    }
  })

  it('formats timecodes as m:ss', () => {
    expect(formatIntroAnimaticTimecode(0)).toBe('0:00')
    expect(formatIntroAnimaticTimecode(65)).toBe('1:05')
    expect(formatIntroAnimaticTimecode(95)).toBe('1:35')
  })

  it('estimates a plausible word count for space- and non-space-delimited scripts', () => {
    for (const localeId of INTRO_ANIMATIC_LOCALE_IDS) {
      const count = getIntroAnimaticWordCount(localeId)
      expect(count, localeId).toBeGreaterThan(80)
      expect(count, localeId).toBeLessThan(400)
    }
  })
})

describe('introduction animatic export builders', () => {
  const locales: IntroAnimaticLocaleId[] = [...INTRO_ANIMATIC_LOCALE_IDS]

  it('emits one markdown table row per beat', () => {
    for (const localeId of locales) {
      const markdown = buildIntroAnimaticMarkdown(localeId)
      for (const beat of INTRO_ANIMATIC_BEATS) {
        expect(markdown, `${localeId} beat ${beat.id}`).toContain(
          `| ${beat.id} | ${beat.timecode} | ${beat.durationSeconds}s |`
        )
      }
    }
  })

  it('includes the style lock and every reference in markdown', () => {
    const markdown = buildIntroAnimaticMarkdown('en')
    for (const reference of INTRO_ANIMATIC_REFERENCES) {
      expect(markdown).toContain(`**REF: ${reference.token}**`)
    }
  })

  it('emits one HTML table row per beat', () => {
    for (const localeId of locales) {
      const html = buildIntroAnimaticHtml(localeId)
      const rows = html.match(/<tr>/g) ?? []
      // One header row plus one body row per beat, across all act tables.
      const actsWithBeats = new Set(INTRO_ANIMATIC_BEATS.map((beat) => beat.act)).size
      expect(rows.length, localeId).toBe(INTRO_ANIMATIC_BEATS.length + actsWithBeats)
    }
  })

  it('marks the narration column right-to-left only for Arabic', () => {
    expect(buildIntroAnimaticHtml('ar')).toContain('<td dir="rtl"')
    expect(buildIntroAnimaticHtml('en')).not.toContain('<td dir="rtl"')
  })

  it('escapes HTML-significant characters rather than emitting raw markup', () => {
    const html = buildIntroAnimaticHtml('en')
    const body = html.replace(/<[^>]+>/g, '')
    expect(body).not.toContain('<')
    expect(body).not.toContain('>')
  })

  it('escapes pipes so markdown table cells cannot break out', () => {
    const markdown = buildIntroAnimaticMarkdown('en')
    for (const line of markdown.split('\n')) {
      if (!line.startsWith('| ') || line.startsWith('|---')) continue
      const cells = line.slice(2, -2).split(' | ')
      expect(cells.length).toBe(6)
    }
  })

  it('lists every beat in the narration-only sheet', () => {
    for (const localeId of locales) {
      const text = buildIntroAnimaticNarrationText(localeId)
      for (const beat of INTRO_ANIMATIC_BEATS) {
        expect(text, `${localeId} beat ${beat.id}`).toContain(beat.narration[localeId])
      }
    }
  })

  it('surfaces overlay copy alongside narration when a beat has it', () => {
    const withOverlay = INTRO_ANIMATIC_BEATS.filter((beat) => beat.onScreenText)
    expect(withOverlay.length).toBeGreaterThan(0)

    const markdown = buildIntroAnimaticMarkdown('en')
    for (const beat of withOverlay) {
      expect(markdown).toContain(`[OVERLAY: ${beat.onScreenText}]`)
    }
  })
})
