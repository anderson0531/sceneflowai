import { describe, expect, it } from 'vitest'
import {
  resolveQuickFrameActionPrompt,
  resolveAdvancedFramePromptBaseline,
  shouldInitializeFramePromptState,
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
