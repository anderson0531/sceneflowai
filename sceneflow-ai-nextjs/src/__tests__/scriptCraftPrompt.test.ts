import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { repairTreatment } from '@/lib/treatment/validate'
import { SECTION_FIELDS } from '@/lib/treatment/blueprintRevisionTypes'
import { classifyField } from '@/i18n/content/fieldRegistry'
import {
  buildLongformScriptLengthBlock,
  buildScriptCraftPromptBlock,
  parseScriptCraftNotes,
  parseScriptCraftPriorities,
} from '@/lib/script/scriptCraftPrompt'

const ROOT = join(__dirname, '..', '..')

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

describe('scriptCraft parsing', () => {
  it('keeps known priorities and drops unknown values', () => {
    expect(
      parseScriptCraftPriorities(['characterDepth', 'nope', 'actionClarity', 'characterDepth'])
    ).toEqual(['characterDepth', 'actionClarity'])
    expect(parseScriptCraftPriorities('visualFirst')).toEqual([])
    expect(parseScriptCraftNotes('  Give her more silence.  ')).toBe('Give her more silence.')
  })

  it('builds a craft prompt from Blueprint priorities and notes', () => {
    const block = buildScriptCraftPromptBlock({
      scriptCraft: ['characterDepth', 'actionClarity'],
      scriptCraftNotes: 'Keep the kitchen geography sharp.',
    })
    expect(block).toContain('SCRIPT CRAFT PRIORITIES')
    expect(block).toContain('characterDepth')
    expect(block).toContain('actionClarity')
    expect(block).toContain('specific blocking')
    expect(block).toContain('Keep the kitchen geography sharp.')
    expect(buildScriptCraftPromptBlock({})).toBe('')
  })

  it('states that story determines length and enforces scene decomposition', () => {
    const block = buildLongformScriptLengthBlock()
    expect(block).toMatch(/story determines length/i)
    expect(block).toContain('Decompose each Blueprint beat into multiple scenes')
    expect(block).toContain('15 beats')
    expect(block).not.toMatch(/8–10/)
    expect(block).not.toMatch(/8-10/)
    expect(block).not.toMatch(/45 seconds/)
    expect(block).not.toMatch(/60–120/)
    expect(block).not.toMatch(/60-120/)
  })
})

describe('Blueprint scriptCraft persist', () => {
  it('repairTreatment round-trips scriptCraft priorities and notes', () => {
    const repaired = repairTreatment({
      title: 'Night Kitchen',
      logline: 'A cook stays late.',
      scriptCraft: ['subtext', 'visualFirst', 'bogus'],
      scriptCraftNotes: 'Let the silence do the work.',
    })
    expect(repaired.scriptCraft).toEqual(['subtext', 'visualFirst'])
    expect(repaired.scriptCraftNotes).toBe('Let the silence do the work.')
  })

  it('keeps scriptCraft on the tone section so refine/save does not drop it', () => {
    expect(SECTION_FIELDS.tone).toContain('scriptCraft')
    expect(SECTION_FIELDS.tone).toContain('scriptCraftNotes')
  })

  it('classifies notes as display and priority ids as opaque', () => {
    expect(classifyField('treatmentVariants[0].scriptCraftNotes')).toBe('display')
    expect(classifyField('treatmentVariants[0].scriptCraft')).toBe('opaque')
    expect(classifyField('treatmentVariants[A].scriptCraft[0]')).toBe('opaque')
  })
})

describe('generate-script-v2 longform length', () => {
  it('does not emit scene/beat duration hard targets', () => {
    const source = readSource('src/app/api/vision/generate-script-v2/route.ts')
    expect(source).toContain('buildLongformScriptLengthBlock')
    expect(source).toContain('buildScriptCraftPromptBlock')
    expect(source).toContain('blueprintBeatIndex')
    expect(source).toContain('splitOversizedScenes')
    expect(source).not.toMatch(/8–10 seconds/)
    expect(source).not.toMatch(/8-10 seconds/)
    expect(source).not.toMatch(/45 seconds or longer/)
    expect(source).not.toMatch(/60–120 seconds/)
    expect(source).not.toMatch(/60-120s is ideal/)
  })
})

describe('revise-scene scope', () => {
  it('no longer treats beat add/remove as OUT_OF_SCOPE', () => {
    const source = readSource('src/app/api/vision/revise-scene/route.ts')
    expect(source).toContain('You MAY add, remove, or reorder beats')
    expect(source).toContain('buildScriptCraftPromptBlock')
    expect(source).not.toMatch(/beyond scene-level improvements \(e\.g\., "add a new character"/)
    expect(source).not.toMatch(/Do NOT introduce new characters or remove existing characters/)
  })
})
