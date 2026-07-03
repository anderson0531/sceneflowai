import { describe, expect, it } from 'vitest'
import {
  formatVisualExpressionCue,
  parsePerformanceCue,
  stripAllCues,
} from '@/lib/scene/performanceCues'
import { compileBeatVideoPrompt } from '@/lib/scene/beatVideoPromptCompiler'
import { composeGuidePromptFromElements } from '@/lib/scene/segmentGuidePrompt'
import {
  planContinuousDialogueBeat,
  shouldAutoSplitForExtensionChain,
} from '@/lib/scene/veoExtensionChain'
import { resolveBeatSpokenDuration } from '@/lib/scene/dialogueSegmentSplit'
import type { SceneBeat } from '@/lib/script/segmentTypes'

const EXAMPLE_LINE =
  '[thoughtful, to herself] Another corporate data breach... same old song and dance. Transparency is the only true security.'

describe('performanceCues', () => {
  it('parses bracket tags into delivery and visual expression', () => {
    const parsed = parsePerformanceCue(EXAMPLE_LINE)
    expect(parsed.emotion).toBe('thoughtful, to herself')
    expect(parsed.spokenText).not.toMatch(/\[thoughtful/)
    expect(parsed.deliveryProse).toMatch(/thoughtful/i)
    expect(parsed.deliveryProse).toMatch(/herself|introspective/i)
    expect(parsed.visualExpression).toMatch(/introspective|thoughtful/i)
  })

  it('stripAllCues removes bracket and parenthetical directions', () => {
    expect(stripAllCues('[urgent] Hello (softly)')).toBe('Hello')
  })

  it('formatVisualExpressionCue produces frame guidance', () => {
    const cue = formatVisualExpressionCue(EXAMPLE_LINE)
    expect(cue).toMatch(/^Facial expression:/)
  })
})

describe('video prompt cue handling', () => {
  it('beat video compiler strips bracket tags from spoken line and adds delivery', () => {
    const beat: SceneBeat = {
      beatId: 'b1',
      kind: 'dialogue',
      character: 'Alex',
      line: EXAMPLE_LINE,
    }
    const { prompt } = compileBeatVideoPrompt(beat)
    expect(prompt).not.toMatch(/\[thoughtful/)
    expect(prompt).toMatch(/Delivery:/)
    expect(prompt).toMatch(/Transparency is the only true security/)
  })

  it('guide prompt uses spoken text without re-inserting bracket tags', () => {
    const guide = composeGuidePromptFromElements(
      [
        {
          id: 'd0',
          type: 'dialogue',
          label: 'Alex dialogue',
          content: EXAMPLE_LINE,
          character: 'Alex',
          selected: true,
          portionStart: 0,
          portionEnd: 100,
        },
      ],
      { direction: '' }
    )
    expect(guide).not.toMatch(/'\[thoughtful/)
    expect(guide).toMatch(/Transparency is the only true security/)
    expect(guide).toMatch(/speaks the following line/i)
  })
})

describe('extension chain for long dialogue', () => {
  it('triggers split/extension for the example corporate breach line', () => {
    const spoken = resolveBeatSpokenDuration(
      { beatId: 'b1', kind: 'dialogue', line: EXAMPLE_LINE } as SceneBeat,
      {},
      'en'
    )
    expect(shouldAutoSplitForExtensionChain(EXAMPLE_LINE, spoken)).toBe(true)

    const chain = planContinuousDialogueBeat(EXAMPLE_LINE, { spokenSeconds: spoken })
    expect(chain.usesExtensionChain).toBe(true)
    expect(chain.parts.length).toBeGreaterThan(1)
    expect(chain.parts.some((p) => p.method === 'EXT')).toBe(true)
  })
})
