import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { slotEligibleForScope } from '@/lib/storyboard/expressBeatFrameProgress'
import type { StoryboardFrameSlot } from '@/lib/storyboard/types'
import { expressFrameNodeKey } from '@/lib/sceneGeneration/types'

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
    expect(src).toContain('!options.failFastOnRateLimit &&')
    expect(src).toContain('VERTEX_IMAGE_ABORTED_BY_CLIENT')
  })

  it('Frame Agent pins the beat pool to one attempt and two-wide dispatch', () => {
    const src = readSource('src/lib/sceneGeneration/expressOrchestrator.ts')
    expect(src).toContain('maxAttempts: 1')
    expect(src).not.toContain('maxAttempts: getSceneExpressBeatMaxAttempts()')
    expect(src).toContain('cooldownMsAfterError: () => 0')
    expect(src).toContain('initialConcurrency: FRAME_AGENT_STILL_CONCURRENCY')
    expect(src).toContain('maxConcurrency: FRAME_AGENT_STILL_CONCURRENCY')
    expect(src).toContain('Promise.allSettled')
    expect(src).toContain('frames: frameNodes')
    expect(src).not.toContain('getSceneExpressBeat429CooldownMs')
  })

  it('does not toast wait-60s on a Frame Agent 429', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).not.toContain('wait ~60s and retry Frame Agent')
    expect(page).toContain('Use Retry failed')
    expect(page).toContain('expressRunningRef')
  })

  it('generate-image admits stills through the process-wide lock', () => {
    const src = readSource('src/app/api/scene/generate-image/route.ts')
    expect(src).toContain('runInSceneImageAdmission')
  })

  it('fail-fast holds the Vertex gate for the whole attempt', () => {
    const src = readSource('src/lib/vertexai/vertexImageClient.ts')
    expect(src).toContain('if (options.failFastOnRateLimit && retryCount === 0)')
    expect(src).toContain('generateVertexGeminiImageAttempt')
  })

  it('normalizes per-frame node keys for the complete payload', () => {
    expect(expressFrameNodeKey(0, { beatIndex: 2, frameRole: 'start' })).toBe(
      'scene:0:beat:2:start'
    )
    expect(expressFrameNodeKey(1, { dialogueIndex: 3 })).toBe('scene:1:dialogue:3')
    expect(expressFrameNodeKey(2, {})).toBe('scene:2:establishing')
  })
})
