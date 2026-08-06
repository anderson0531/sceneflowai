import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { chunkNarrationText, narrationByteLength } from '@/lib/blueprint/narrationChunks'
import {
  hashNarrationAudio,
  narrationAudioPathname,
} from '@/lib/blueprint/narrationAudioCache'
import {
  GEMINI_TTS_MAX_INPUT_BYTES,
  NARRATION_CHUNK_BYTES,
} from '@/lib/tts/blueprintTtsConstants'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

/**
 * These guard the two properties that make narration feel fast: synthesis
 * overlaps playback, and a clip already made is never made twice. Both are
 * invisible when they regress — the audio still plays, just slowly — so they are
 * asserted rather than left to notice.
 */

describe('narration chunking is client-safe and boundary-aware', () => {
  it('does not pull node crypto into the browser bundle', () => {
    const chunks = readSource('src/lib/blueprint/narrationChunks.ts')
    // Imports only: the module explains the constraint in prose, so a plain
    // substring search would match its own comment.
    expect(chunks).not.toMatch(/^\s*import .*from ['"](node:)?crypto['"]/m)
    expect(chunks).not.toMatch(/require\(['"](node:)?crypto['"]\)/)
  })

  it('stays importable from the original module for server callers', () => {
    const section = readSource('src/lib/blueprint/sectionNarrationText.ts')
    expect(section).toContain("export { chunkNarrationText } from '@/lib/blueprint/narrationChunks'")
  })

  it('splits on sentence boundaries rather than mid-word', () => {
    const text = `${'First sentence here. '.repeat(30)}${'Second run of text. '.repeat(30)}`
    const chunks = chunkNarrationText(text, 200)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk).toMatch(/[.!?]$/)
    }
  })

  it('produces fewer requests than the old 1200-char hard slicing', () => {
    const text = 'A narration sentence that runs on. '.repeat(200)
    const sentenceAware = chunkNarrationText(text, 1500).length
    const hardSliced = Math.ceil(text.trim().length / 1200)
    expect(sentenceAware).toBeLessThan(hardSliced)
  })
})

/**
 * Cloud TTS rejects `input.text` over 4,000 UTF-8 bytes with an HTTP 400. A
 * character budget looks correct in English and silently overshoots in any
 * script that costs more than a byte per character, so the budget is asserted in
 * bytes for the languages that actually exercise it.
 */
describe('chunk budgets are UTF-8 bytes, not characters', () => {
  const scripts = {
    english: 'The harbour wakes before the town does, and Nadia counts crates. ',
    thai: 'ท่าเรือตื่นก่อนเมืองจะตื่น และนาเดียก็นับลังสินค้าอยู่แล้วในตอนนั้น ',
    chinese: '海港在小镇苏醒之前就已经醒了，而娜迪亚那时已经在清点货箱了。',
    hindi: 'बंदरगाह शहर से पहले जागता है, और नादिया पहले से ही बक्से गिन रही है। ',
    arabic: 'يستيقظ المرفأ قبل أن تستيقظ المدينة، وكانت نادية تعد الصناديق بالفعل. ',
  }

  it('keeps every chunk within the requested byte budget', () => {
    for (const [name, unit] of Object.entries(scripts)) {
      const text = unit.repeat(Math.ceil(12000 / unit.length))
      for (const budget of [NARRATION_CHUNK_BYTES, 1500, 1200]) {
        for (const chunk of chunkNarrationText(text, budget)) {
          expect(
            narrationByteLength(chunk),
            `${name} chunk exceeded ${budget} bytes`
          ).toBeLessThanOrEqual(budget)
        }
      }
    }
  })

  it('stays under the ceiling the speech API enforces', () => {
    expect(NARRATION_CHUNK_BYTES).toBeLessThan(GEMINI_TTS_MAX_INPUT_BYTES)
  })

  it('would have caught the regression a character budget allowed', () => {
    // 1,500 Thai characters is ~4,400 bytes: under a character budget, over the
    // byte ceiling. This is the exact shape of the request that returned 400.
    const thai = scripts.thai.repeat(Math.ceil(1500 / scripts.thai.length))
    expect(thai.length).toBeGreaterThan(1400)
    expect(narrationByteLength(thai)).toBeGreaterThan(GEMINI_TTS_MAX_INPUT_BYTES)

    for (const chunk of chunkNarrationText(thai, 1500)) {
      expect(narrationByteLength(chunk)).toBeLessThanOrEqual(1500)
    }
  })

  it('never splits a multi-byte character in half', () => {
    // A sentence with no boundary to split on forces the byte-slicing path.
    const unbroken = '海港在小镇苏醒之前就已经醒了而娜迪亚那时已经在清点货箱了'.repeat(40)
    const chunks = chunkNarrationText(unbroken, 200)
    expect(chunks.length).toBeGreaterThan(1)
    // Rejoining is lossless, which it would not be if a code point were cut.
    expect(chunks.join('')).toBe(unbroken)
    expect(chunks.join('')).not.toContain('\uFFFD')
  })

  it('routes and player all chunk on the shared byte budget', () => {
    for (const file of [
      'src/app/api/tts/blueprint/route.ts',
      'src/app/api/tts/google/route.ts',
      'src/app/api/tts/elevenlabs/route.ts',
    ]) {
      const source = readSource(file)
      expect(source, `${file} budget`).toContain('NARRATION_CHUNK_BYTES')
      expect(source, `${file} still uses a raw 4000 budget`).not.toMatch(
        /chunkNarrationText\([^)]*,\s*4000\s*\)/
      )
    }
    expect(readSource('src/hooks/useBlueprintTts.ts')).toContain(
      'chunkNarrationText(trimmed, NARRATION_CHUNK_BYTES)'
    )
  })
})

describe('narration audio cache keys', () => {
  const base = {
    text: 'The harbour wakes before the town does.',
    voiceId: 'Kore',
    languageCode: 'en-US',
    model: 'gemini-2.5-flash-tts',
  }

  it('reuses one path for identical narration', () => {
    expect(hashNarrationAudio(base)).toBe(hashNarrationAudio({ ...base }))
    expect(narrationAudioPathname(hashNarrationAudio(base))).toMatch(
      /^audio\/blueprint-narration\/[0-9a-f]{64}\.mp3$/
    )
  })

  it('misses when anything that changes the performance changes', () => {
    const original = hashNarrationAudio(base)
    expect(hashNarrationAudio({ ...base, voiceId: 'Puck' })).not.toBe(original)
    expect(hashNarrationAudio({ ...base, languageCode: 'es-ES' })).not.toBe(original)
    expect(hashNarrationAudio({ ...base, directorNotes: 'Read it slowly' })).not.toBe(original)
    expect(hashNarrationAudio({ ...base, model: 'other-tts' })).not.toBe(original)
    expect(hashNarrationAudio({ ...base, text: 'Different line.' })).not.toBe(original)
  })

  it('ignores incidental whitespace so a reformat is still a hit', () => {
    expect(hashNarrationAudio({ ...base, text: `  ${base.text}  ` })).toBe(
      hashNarrationAudio(base)
    )
  })
})

describe('the studio player overlaps synthesis with playback', () => {
  const hook = readSource('src/hooks/useBlueprintTts.ts')

  it('generates ahead of the clip that is playing', () => {
    expect(hook).toContain('NARRATION_LOOKAHEAD')
    expect(hook).toContain('startSynthesis(index + NARRATION_LOOKAHEAD + 1)')
    // The look-ahead is primed before the playback loop, so clip one is not the
    // only thing in flight when it starts.
    expect(hook).toMatch(/for \(let i = 0; i < Math\.min\(NARRATION_LOOKAHEAD \+ 1, total\)/)
  })

  it('keeps playback strictly ordered', () => {
    expect(hook).toContain('await pending[index]!')
  })

  it('translates the whole narration in one request', () => {
    expect(hook).toContain("fetch('/api/translate'")
    expect(hook).toContain('texts: missing')
    // The old per-chunk endpoint inside the playback loop is gone.
    expect(hook).not.toContain('/api/translate/google')
  })

  it('cancels clips the listener will never hear', () => {
    expect(hook).toContain('AbortController')
    expect(hook).toContain('signal: controller.signal')
    expect(hook).toContain('controller.abort()')
  })

  it('accepts a stored clip url as well as raw audio bytes', () => {
    expect(hook).toContain("resp.headers.get('content-type')")
    expect(hook).toContain('URL.createObjectURL')
    expect(hook).toContain('URL.revokeObjectURL')
  })
})

describe('the TTS route caches and parallelizes', () => {
  const route = readSource('src/app/api/tts/blueprint/route.ts')

  it('returns a stored clip without calling the model again', () => {
    // Compare call sites, not the import block at the top of the file.
    const cacheAt = route.indexOf('await findCachedNarrationAudio(pathname)')
    const synthesizeAt = route.indexOf('await processWithConcurrency<Buffer>(')
    expect(cacheAt).toBeGreaterThan(-1)
    expect(synthesizeAt).toBeGreaterThan(-1)
    expect(cacheAt).toBeLessThan(synthesizeAt)
  })

  it('synthesizes chunks concurrently and reassembles them in order', () => {
    expect(route).toContain('processWithConcurrency')
    expect(route).toContain('CONCURRENCY_DEFAULTS.AUDIO_GENERATION')
    expect(route).toContain('id: index')
    expect(route).toContain('Buffer.concat(buffers)')
  })

  it('fails rather than emitting silence when a chunk is lost', () => {
    expect(route).toContain("results.find((result) => result.status === 'rejected')")
    expect(route).toContain('throw failed.error')
  })

  it('falls back to streaming bytes when storage is unavailable', () => {
    expect(route).toContain('storeNarrationAudio')
    expect(route).toContain("'Content-Type': 'audio/mpeg'")
  })
})

describe('the side panel lands on Narrative', () => {
  const panel = readSource('src/components/blueprint/SidePanelTabs.tsx')
  const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')

  it('defaults to the narrative reasoning tab', () => {
    expect(panel).toMatch(
      /useState<'resonance' \| 'collaboration' \| 'reasoning'>\(\s*'reasoning'\s*\)/
    )
  })

  it('clears the tab signals on close so a stale one cannot win on reopen', () => {
    expect(studio).toContain('const closeSidePanel = useCallback(')
    const closeAt = studio.indexOf('const closeSidePanel = useCallback(')
    const body = studio.slice(closeAt, closeAt + 400)
    expect(body).toContain('setCollaborationTabSignal(0)')
    expect(body).toContain('setResonanceTabSignal(0)')
    expect(body).toContain('setFoundationTabSignal(0)')
    // Both ways of closing go through it.
    expect(studio).toContain('onClose={closeSidePanel}')
    expect(studio).toContain('showSidePanel ? closeSidePanel() : setShowSidePanel(true)')
  })
})

describe('the tab reads Narrative in every locale', () => {
  const locales = ['en', 'de', 'es', 'fr', 'pt', 'ar', 'hi', 'th', 'zh-CN']

  it('renames the label without renaming the key', () => {
    const panel = readSource('src/components/blueprint/SidePanelTabs.tsx')
    expect(panel).toContain("t('tabs.reasoning')")

    for (const locale of locales) {
      const catalog = JSON.parse(readSource(`messages/app/${locale}/blueprint.json`))
      const label = catalog.sidePanel.tabs.reasoning
      expect(label, `${locale} still has a value`).toBeTruthy()
      expect(label, `${locale} tab label`).not.toMatch(/reasoning/i)
    }
    expect(
      JSON.parse(readSource('messages/app/en/blueprint.json')).sidePanel.tabs.reasoning
    ).toBe('Narrative')
  })

  it('keeps the panel heading, which names the feature rather than the tab', () => {
    expect(JSON.parse(readSource('messages/app/en/blueprint.json')).reasoning.title).toBe(
      'Narrative Reasoning'
    )
  })

  it('updates the help copy that points at the tab by name', () => {
    const help = JSON.parse(readSource('messages/app/en/blueprint.json')).help
    expect(help.reasoning).toContain('"Narrative" tab')
    expect(help.decisions).toContain('"Narrative" tab')
  })
})
