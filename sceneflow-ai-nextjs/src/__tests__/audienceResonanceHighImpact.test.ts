import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  collectTopImpactIssues,
  firstHighImpactSceneIndex,
  preserveAppliedRecommendationIds,
  recommendationId,
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

  it('ignores applied recommendations when deciding high impact', () => {
    const rec = { text: 'Cut the prologue', priority: 'high', pointsDeducted: 12 }
    expect(
      sceneHasHighImpactIssue({
        recommendations: [rec],
        appliedRecommendationIds: [recommendationId(rec)],
      })
    ).toBe(false)
    expect(sceneHasHighImpactIssue({ recommendations: [rec], appliedRecommendationIds: [] })).toBe(true)
  })

  it('collects top impact issues sorted by points and can exclude applied', () => {
    const scenes = [
      {
        sceneNumber: 1,
        sceneHeading: 'INT. TITLE',
        recommendations: [{ text: 'Tighten the title', pointsDeducted: 4, priority: 'low' }],
      },
      {
        sceneNumber: 2,
        sceneHeading: 'INT. STUDIO',
        recommendations: [
          { text: 'Raise the stakes', pointsDeducted: 12, priority: 'high' },
          { text: 'Cut a line', pointsDeducted: 6, priority: 'medium' },
        ],
        appliedRecommendationIds: [recommendationId({ text: 'Raise the stakes' })],
      },
    ]

    const open = collectTopImpactIssues(scenes, { excludeApplied: true, limit: 5 })
    expect(open.map((issue) => issue.rec.text)).toEqual(['Cut a line', 'Tighten the title'])

    const all = collectTopImpactIssues(scenes, { excludeApplied: false, limit: 5 })
    expect(all[0].rec.text).toBe('Raise the stakes')
    expect(all[0].applied).toBe(true)
  })

  it('preserves applied ids across a re-analysis by id or text', () => {
    const previous = {
      recommendations: [{ text: 'Raise the stakes', pointsDeducted: 12 }],
      appliedRecommendationIds: [recommendationId({ text: 'Raise the stakes' })],
    }
    const next = [{ text: 'Raise the stakes', pointsDeducted: 8, priority: 'medium' }]
    expect(preserveAppliedRecommendationIds(previous, next)).toEqual(previous.appliedRecommendationIds)
    expect(preserveAppliedRecommendationIds(previous, [{ text: 'Something else', pointsDeducted: 3 }])).toEqual([])
  })

  it('wires jump-to-scene and persisted Gemini voices through the AR dialog', () => {
    const modal = readSource('src/components/vision/ScriptReviewModal.tsx')
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')

    expect(modal).toContain('persistAssistantVoice')
    expect(modal).toContain('loadPersistedAssistantVoice')
    expect(modal).toContain('resolveAssistantGeminiVoiceId')
    expect(modal).toContain('onJumpToScene')
    expect(modal).toContain('collectTopImpactIssues')
    expect(modal).toContain('Go to scene')
    expect(modal).toContain('ar-scene-heading')
    expect(modal).toContain('dialog-text-reset')
    expect(modal).not.toMatch(/<h3 className="font-semibold text-base/)

    expect(panel).toContain('sceneHasHighImpactIssue')
    expect(panel).toContain('focusedSceneIndex')
    expect(panel).toContain('High impact')
    expect(panel).toContain('<WritersRoomTopImpactPanel')
    expect(panel).toContain("tStudio('audienceResonance')")
    expect(panel).toContain('DialogContent')
    expect(panel.indexOf('<WritersRoomTopImpactPanel')).toBeGreaterThan(
      panel.indexOf("tStudio('audienceResonance')")
    )
    expect(panel.indexOf('<WritersRoomTopImpactPanel')).toBeLessThan(
      panel.indexOf('{productionProgressSlot &&')
    )
    expect(panel.indexOf('<WritersRoomTopImpactPanel')).toBeLessThan(
      panel.indexOf('<BlueprintBeatGroupHeader')
    )
    expect(panel).toContain('appliedRecommendationIds')
    expect(panel).toContain('onToggleAudienceRecommendation')

    const impactPanel = readSource('src/components/vision/WritersRoomTopImpactPanel.tsx')
    expect(impactPanel).toContain('DialogContent')
    expect(impactPanel).toContain('setOpen(false)')
    expect(impactPanel).toContain('onJumpToScene')

    expect(page).toContain('loadPersistedAssistantVoice')
    expect(page).toContain('onJumpToScene={handleJumpToSceneFromReview}')
    expect(page).toContain('focusedSceneIndex={focusedSceneIndex}')
    expect(page).toContain('onToggleAudienceRecommendation={handleToggleAudienceRecommendation}')
    expect(page).toContain('preserveAppliedRecommendationIds')
  })
})
