import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { slotEligibleForScope } from '@/lib/storyboard/expressBeatFrameProgress'
import type { StoryboardFrameSlot } from '@/lib/storyboard/types'

function slot(key: string, overrides: Partial<StoryboardFrameSlot> = {}): StoryboardFrameSlot {
  return {
    key,
    label: key,
    kind: 'action',
    isPlaceholder: false,
    isMissing: false,
    ...overrides,
  }
}

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Frame Agent Express fail-fast selection', () => {
  it('missing scope is empty-URL only, even at Final quality', () => {
    const draft = slot('beat-1', {
      ownImageUrl: 'https://example.com/draft.jpg',
      imageTier: 'draft',
    })
    const empty = slot('beat-2')

    expect(slotEligibleForScope(draft, 'missing')).toBe(false)
    expect(slotEligibleForScope(empty, 'missing')).toBe(true)
    expect(slotEligibleForScope(draft, 'selected')).toBe(true)
    expect(slotEligibleForScope(empty, 'selected')).toBe(false)
  })
})

describe('Frame Agent Express fail-fast contracts', () => {
  it('does not remap Final + missing to an upgrade-all finalizeOnly pass', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).not.toContain('upgradeToFinal')
    expect(page).not.toMatch(/finalizeOnly:/)
    expect(page).toContain("missingFramesOnly: options?.scope === 'missing'")
  })

  it('Retry failed re-runs the failed keys as selected, not missing', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toMatch(/onRetryFailed=\{\(failedKeys\) => \{[\s\S]*scope:\s*'selected'/)
  })

  it('confirm dialogs do not send finalizeOnly', () => {
    const sceneDialog = readSource('src/components/vision/ExpressSceneConfirmDialog.tsx')
    const projectDialog = readSource('src/components/vision/ExpressConfirmDialog.tsx')
    expect(sceneDialog).not.toContain('onlyUpgradeLeft')
    expect(sceneDialog).not.toContain('scopeNotFinal')
    expect(projectDialog).not.toMatch(/finalizeOnly:\s*/)
  })

  it('Vertex fail-fast skips eco fallback and flash-to-pro escalation', () => {
    const src = readSource('src/lib/vertexai/vertexImageClient.ts')
    expect(src).toContain('if (options.failFastOnRateLimit) return false')
    expect(src).toContain('options.failFastOnRateLimit ||')
    expect(src).toContain('!options.failFastOnRateLimit &&')
  })
})
