import { describe, expect, it } from 'vitest'
import { isBlueprintFeedbackAllowed, isBlueprintNeverExpires } from '@/lib/blueprint/shareSettings'
import { sanitizeBlueprintARForShare } from '@/lib/blueprint/sanitizeShareAR'
import type { PersistedBlueprintAudienceResonance } from '@/lib/types/audienceResonance'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Blueprint listen-only share', () => {
  it('defaults existing shares to feedback allowed', () => {
    expect(isBlueprintFeedbackAllowed(undefined)).toBe(true)
    expect(isBlueprintFeedbackAllowed({})).toBe(true)
    expect(isBlueprintFeedbackAllowed({ allowFeedback: true })).toBe(true)
    expect(isBlueprintFeedbackAllowed({ allowFeedback: false })).toBe(false)
    expect(isBlueprintNeverExpires({ neverExpires: true })).toBe(true)
    expect(isBlueprintNeverExpires({})).toBe(false)
  })

  it('snapshots AR without requiring a live project read on the public page', () => {
    const persisted = {
      analysis: {
        version: 3,
        treatmentId: 't1',
        overallScore: 84,
        baseScore: 100,
        deductions: [],
        recommendations: [],
        categories: [{ name: 'Audience Appeal', score: 86, weight: 1 }],
        strengths: ['Clear hook'],
        improvements: ['Sharpen the midpoint'],
        summary: 'Ready enough to produce.',
        audienceDefinition: { description: 'Adult drama viewers' },
        isReadyForProduction: true,
        generatedAt: '2026-01-01T00:00:00.000Z',
        creditsUsed: 1,
      },
      audienceDefinition: { description: 'Adult drama viewers' },
      appliedRecommendationIds: ['rec-1'],
      iterationCount: 1,
      lastAnalyzedAt: '2026-01-01T00:00:00.000Z',
      lastSavedAt: '2026-01-01T00:00:00.000Z',
    } as unknown as PersistedBlueprintAudienceResonance

    const snapshot = sanitizeBlueprintARForShare(persisted)
    expect(snapshot?.analysis?.overallScore).toBe(84)
    expect(snapshot?.analysis?.summary).toContain('Ready')
    expect(snapshot?.appliedRecommendationIds).toEqual(['rec-1'])
  })

  it('rejects feedback, register, and collaborator chat when listen-only', () => {
    const feedback = readSource('src/app/api/blueprint/share/[token]/feedback/route.ts')
    const register = readSource('src/app/api/blueprint/share/[token]/register/route.ts')
    const chat = readSource('src/app/api/blueprint/share/[token]/chat/team/route.ts')
    expect(feedback).toContain('isBlueprintFeedbackAllowed')
    expect(feedback).toContain('403')
    expect(register).toContain('isBlueprintFeedbackAllowed')
    expect(chat).toContain('isBlueprintFeedbackAllowed')
  })

  it('uses catalog copy for the listen-only studio toggle', () => {
    const panel = readSource('src/components/blueprint/SidePanelTabs.tsx')
    expect(panel).toContain("t('collab.listenOnlyCheckbox')")
    expect(panel).not.toContain('Listen-only preview (no feedback)')
  })

  it('hides review chrome on the public viewer when feedback is off', () => {
    const viewer = readSource('src/components/blueprint/BlueprintShareViewer.tsx')
    expect(viewer).toContain('allowFeedback')
    expect(viewer).toContain('BlueprintShareResonancePanel')
    expect(viewer).toContain('canFeedback={canFeedback}')
    expect(viewer).toContain('allowFeedback && participantId')
    // Nested `allowFeedback ? !participantId ?` has no else branch and fails Turbopack.
    expect(viewer).toContain('allowFeedback && (!participantId ?')
    expect(viewer).not.toMatch(/allowFeedback \? !participantId \?/)
  })
})
