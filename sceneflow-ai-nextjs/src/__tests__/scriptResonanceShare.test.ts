import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { sanitizeScriptARReview } from '@/lib/script/audienceResonance/sanitizeShareReview'
import { buildScriptARNarrationText } from '@/lib/script/audienceResonance/scriptARNarrationText'
import { PUBLIC_ROUTE_PREFIXES } from '@/constants/publicRoutes'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Script Audience Resonance listen-only share', () => {
  it('sanitizes the public report and omits deductions', () => {
    const review = sanitizeScriptARReview({
      overallScore: 81,
      deductions: [{ reason: 'internal', points: 4, category: 'Pacing' }],
      categories: [{ name: 'Pacing', score: 78, weight: 1 }],
      analysis: 'The middle act slows.',
      strengths: ['Strong open'],
      improvements: ['Tighten scene 4'],
      recommendations: [{ text: 'Cut the hallway beat', priority: 'high' }],
      sceneAnalysis: [
        {
          sceneNumber: 4,
          sceneHeading: 'INT. HALL',
          score: 62,
          notes: 'Over-explained',
          recommendations: [{ text: 'Show, do not tell', priority: 'high' }],
        },
      ],
      generatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(review?.overallScore).toBe(81)
    expect(review && 'deductions' in review).toBe(false)
    expect(review?.sceneAnalysis[0]?.notes).toContain('Over-explained')
    expect(buildScriptARNarrationText(review!, 'overview')).toContain('81')
    expect(buildScriptARNarrationText(review!, 'analysis')).toContain('Strong open')
  })

  it('exposes a public /share/script-resonance route without mutate actions', () => {
    expect(PUBLIC_ROUTE_PREFIXES.some((prefix) => prefix === '/share/')).toBe(true)
    const viewer = readSource('src/components/vision/ScriptResonanceShareViewer.tsx')
    expect(viewer).toContain('Listen only')
    expect(viewer).not.toContain('onScriptOptimized')
    expect(viewer).not.toContain('You Direct')
    expect(viewer).not.toContain('handleRegenerate')
    expect(readSource('src/app/share/script-resonance/[token]/page.tsx')).toContain(
      'ScriptResonanceShareViewer'
    )
  })

  it('offers a Studio share action from Script Review', () => {
    const modal = readSource('src/components/vision/ScriptReviewModal.tsx')
    expect(modal).toContain('Share listen-only report')
    expect(modal).toContain('createScriptARShare')
  })
})
