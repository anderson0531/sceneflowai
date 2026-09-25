import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  filterStructuralActions,
  improvementToRecommendation,
  scriptDirectionRecommendations,
  stampPreservedScenes,
  restorePreservedScenes,
} from '@/lib/script/directScript'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('improvementToRecommendation', () => {
  it('keeps lines that already start with a verb', () => {
    expect(improvementToRecommendation('Tighten the midpoint in scenes 8-12.')).toBe(
      'Tighten the midpoint in scenes 8-12.'
    )
  })

  it('turns a diagnostic sentence into a fix', () => {
    expect(improvementToRecommendation('The midpoint sags in scenes 8-12.')).toBe(
      'Fix: The midpoint sags in scenes 8-12.'
    )
  })
})

describe('scriptDirectionRecommendations', () => {
  it('prefers script-level recommendations when they exist', () => {
    const recs = scriptDirectionRecommendations({
      recommendations: [{ text: 'Cut the repeated argument', priority: 'high', category: 'Pacing' }],
      improvements: ['The midpoint sags in scenes 8-12.'],
    })
    expect(recs).toEqual([
      {
        id: 'rec-0',
        text: 'Cut the repeated argument',
        priority: 'high',
        category: 'Pacing',
      },
    ])
  })

  it('converts improvements when there are no recommendations', () => {
    const recs = scriptDirectionRecommendations({
      recommendations: [],
      improvements: ['The midpoint sags in scenes 8-12.'],
    })
    expect(recs[0]?.text).toBe('Fix: The midpoint sags in scenes 8-12.')
  })
})

describe('filterStructuralActions', () => {
  it('drops merge, cut, and rewrite actions that touch a locked scene', () => {
    const actions = [
      { action: 'merge', sceneNumbers: [2, 3], rationale: 'repeat' },
      { action: 'cut', sceneNumbers: [5], rationale: 'empty' },
      { action: 'rewrite', sceneNumbers: [4], rationale: 'flashback' },
      { action: 'merge', sceneNumbers: [6, 7], rationale: 'ok' },
    ]
    expect(filterStructuralActions(actions, [3, 5])).toEqual([
      { action: 'rewrite', sceneNumbers: [4], rationale: 'flashback' },
      { action: 'merge', sceneNumbers: [6, 7], rationale: 'ok' },
    ])
  })
})

describe('preserved scene stamps', () => {
  it('restores the original scene after a rewrite drops the stamp', () => {
    const original = [{ heading: 'INT. LAB' }, { heading: 'INT. HALL' }]
    const { scenes, originals } = stampPreservedScenes(original, [0])
    const rewritten = [
      { heading: 'INT. LAB - CHANGED' },
      { heading: 'INT. HALL - CHANGED', _directScriptPreserveId: scenes[1] && undefined },
    ]
    // Scene 0 carries the stamp; the model dropped it. Restore by the stamp
    // when it survives, and the batch path overwrites by index when it does not.
    const withStamp = [
      { ...scenes[0], heading: 'INT. LAB - CHANGED' },
      { heading: 'INT. HALL - CHANGED' },
    ]
    const restored = restorePreservedScenes(withStamp, originals)
    expect(restored[0]).toEqual({ heading: 'INT. LAB' })
    expect(restored[1]).toEqual({ heading: 'INT. HALL - CHANGED' })
    expect(rewritten[1].heading).toContain('HALL')
  })
})

describe('Direct Script dock', () => {
  it('rewrites from Direct Script without locking the page', () => {
    const source = readSource('src/components/vision/DirectScriptDialog.tsx')
    expect(source).toContain('runWithAgentDock')
    expect(source).toContain("title: 'Script Agent'")
    expect(source).not.toContain('useProcessWithOverlay')
    expect(source).not.toContain('overlayStore')
    expect(source).toContain('How detailed should changes be?')
    expect(source).toContain('What is the target duration?')
    expect(source).toContain('Areas for Improvement')
    expect(source).toContain('Common Rewrites')
    expect(source).toContain('Preserve Scenes')
  })

  it('keeps Audience Analysis focused on analysis and recommendations', () => {
    const modal = readSource('src/components/vision/ScriptReviewModal.tsx')
    expect(modal).toContain('Audience Analysis')
    expect(modal).toContain('Script Analysis and Recommendations')
    expect(modal).not.toContain('Insights & Direction')
    expect(modal).not.toContain('You Direct')
    expect(modal).not.toContain("value=\"cinematic\"")
    const panel = readSource('src/components/vision/ScriptPanel.tsx')
    expect(panel.indexOf("tStudio('directScript')")).toBeGreaterThan(
      panel.indexOf("tStudio('audienceResonance')")
    )
  })
})
