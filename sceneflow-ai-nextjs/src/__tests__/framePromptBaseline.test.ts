import { describe, expect, it } from 'vitest'
import {
  resolveQuickFrameActionPrompt,
  resolveAdvancedFramePromptBaseline,
  shouldInitializeFramePromptState,
  buildPreVisEndFrameEditInstruction,
  isVisualEndFrameDelta,
} from '@/lib/vision/framePromptBaseline'

describe('framePromptBaseline', () => {
  it('uses quick baseline prompt precedence', () => {
    expect(
      resolveQuickFrameActionPrompt({
        userEditedPrompt: ' user prompt ',
        generatedPrompt: 'generated',
        action: 'action',
      })
    ).toBe('user prompt')

    expect(
      resolveQuickFrameActionPrompt({
        userEditedPrompt: '  ',
        generatedPrompt: 'generated',
        action: 'action',
      })
    ).toBe('generated')

    expect(
      resolveQuickFrameActionPrompt({
        generatedPrompt: '   ',
        action: 'action',
        actionPrompt: 'legacy action prompt',
      })
    ).toBe('action')
  })

  it('prefers intelligent baseline for advanced prompt', () => {
    expect(
      resolveAdvancedFramePromptBaseline({
        segment: {
          userEditedPrompt: 'fallback prompt',
        },
        intelligentPrompt: ' intelligent baseline ',
      })
    ).toBe('intelligent baseline')

    expect(
      resolveAdvancedFramePromptBaseline({
        segment: {
          userEditedPrompt: 'fallback prompt',
        },
        intelligentPrompt: '   ',
      })
    ).toBe('fallback prompt')
  })

  it('buildPreVisEndFrameEditInstruction uses start visual without scene-direction bloat', () => {
    const startVisual =
      'A shimmering, ethereal nebula of data points and glowing lines, slowly coalescing. Photorealistic rendering of digital space, 8K clarity.'
    const instruction = buildPreVisEndFrameEditInstruction({
      startFramePrompt: startVisual,
      endFramePrompt:
        'Subtle environmental motion while preserving composition: nebula coalescing further',
    })
    expect(instruction).toContain('DO NOT hallucinate new objects')
    expect(instruction).toContain('Maintain absolute physics and visual continuity')
    expect(instruction).toContain('Edit start frame:')
    expect(instruction).toContain('ethereal nebula')
    expect(instruction).not.toMatch(/Wide Shot/i)
    expect(instruction).not.toMatch(/Dolly in/i)
    expect(instruction).not.toMatch(/photorealistic, professional photography/i)
  })

  it('skips generic dialogue-gesture end delta', () => {
    expect(
      isVisualEndFrameDelta(
        'Character completes speaking gesture; subtle expression and body motion'
      )
    ).toBe(false)
    const instruction = buildPreVisEndFrameEditInstruction({
      startFramePrompt: 'Sarah at the window, city lights behind her.',
      endFramePrompt:
        'Character completes speaking gesture; subtle expression and body motion',
    })
    expect(instruction).not.toContain('completes speaking gesture')
    expect(instruction).toContain('Sarah at the window')
  })

  it('uses customPrompt as the edit anchor when provided', () => {
    const instruction = buildPreVisEndFrameEditInstruction({
      customPrompt: 'Nebula lines coalescing into a brighter core.',
      startFramePrompt: 'ignored when custom is set',
    })
    expect(instruction).toContain('Nebula lines coalescing')
    expect(instruction).not.toContain('ignored when custom')
  })

  it('initializes dialog state only when opening or context changes', () => {
    expect(
      shouldInitializeFramePromptState({
        isOpen: false,
        wasOpen: true,
        currentContextKey: 'seg-a:start',
        lastInitializedContextKey: 'seg-a:start',
      })
    ).toBe(false)

    expect(
      shouldInitializeFramePromptState({
        isOpen: true,
        wasOpen: false,
        currentContextKey: 'seg-a:start',
        lastInitializedContextKey: null,
      })
    ).toBe(true)

    expect(
      shouldInitializeFramePromptState({
        isOpen: true,
        wasOpen: true,
        currentContextKey: 'seg-a:start',
        lastInitializedContextKey: 'seg-a:start',
      })
    ).toBe(false)

    expect(
      shouldInitializeFramePromptState({
        isOpen: true,
        wasOpen: true,
        currentContextKey: 'seg-a:end',
        lastInitializedContextKey: 'seg-a:start',
      })
    ).toBe(true)
  })
})
