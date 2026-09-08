import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  firstHighImpactSceneIndex,
  recommendationIsHighImpact,
  sceneHasHighImpactIssue,
} from '@/lib/script/audienceResonance/highImpact'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('High-impact audience resonance issues', () => {
  it('treats high priority or 10+ point deductions as high impact', () => {
    expect(recommendationIsHighImpact({ priority: 'high', pointsDeducted: 2 })).toBe(true)
    expect(recommendationIsHighImpact({ priority: 'medium', pointsDeducted: 10 })).toBe(true)
    expect(recommendationIsHighImpact({ priority: 'medium', pointsDeducted: 4 })).toBe(false)
    expect(recommendationIsHighImpact('tighten the ending')).toBe(false)
  })

  it('finds the first high-impact scene as a 0-based index', () => {
    const scenes = [
      { sceneNumber: 1, recommendations: [{ priority: 'low', pointsDeducted: 2 }] },
      { sceneNumber: 2, recommendations: [{ priority: 'high', pointsDeducted: 12 }] },
      { sceneNumber: 3, recommendations: [{ priority: 'medium', pointsDeducted: 15 }] },
    ]
    expect(sceneHasHighImpactIssue(scenes[0])).toBe(false)
    expect(sceneHasHighImpactIssue(scenes[1])).toBe(true)
    expect(firstHighImpactSceneIndex(scenes)).toBe(1)
    expect(firstHighImpactSceneIndex([{ recommendations: [] }])).toBeNull()
  })

  it('wires jump-to-scene and persisted Gemini voices through the AR dialog', () => {
    const modal = readSource('src/components/vision/ScriptReviewModal.tsx')
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')

    expect(modal).toContain('persistAssistantVoice')
    expect(modal).toContain('loadPersistedAssistantVoice')
    expect(modal).toContain('resolveAssistantGeminiVoiceId')
    expect(modal).toContain('onJumpToScene')
    expect(modal).toContain('firstHighImpactSceneIndex')
    expect(modal).toContain('Go to scene')
    expect(modal).toContain('ar-scene-heading')
    expect(modal).toContain('dialog-text-reset')
    expect(modal).not.toMatch(/<h3 className="font-semibold text-base/)

    expect(panel).toContain('sceneHasHighImpactIssue')
    expect(panel).toContain('focusedSceneIndex')
    expect(panel).toContain('High impact')

    expect(page).toContain('loadPersistedAssistantVoice')
    expect(page).toContain('onJumpToScene={handleJumpToSceneFromReview}')
    expect(page).toContain('focusedSceneIndex={focusedSceneIndex}')
  })
})
