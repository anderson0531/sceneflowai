import { describe, expect, it } from 'vitest'
import { buildCompanionPlanCard } from '@/lib/companion/planCard'
import {
  buildFeedbackNotification,
  companionOpenPath,
  feedbackExcerpt,
} from '@/lib/companion/feedbackNotification'

describe('companion plan cards', () => {
  it('reports pace, spend, finish date, and upcoming work days', () => {
    const card = buildCompanionPlanCard({
      projectId: 'project-1',
      title: 'Pilot',
      updatedAt: '2026-09-30T00:00:00.000Z',
      today: '2026-09-15',
      metadata: {
        creditsBudget: 1200,
        creditsUsed: 10,
        creditsBudgetParams: {
          version: 3,
          method: 'draft_production',
          frameQuality: 'draft',
          videoQuality: 'none',
          frameIterations: 1,
          videoIterations: 0,
          topazEnabled: false,
          intelligenceEnabled: false,
          segmentDuration: 10,
          schedule: {
            scenesPerDay: 1,
            startDate: '2026-09-01',
            entries: [
              { sceneId: 's1', day: 1, date: '2026-09-01', pinned: false },
              { sceneId: 's2', day: 2, date: '2026-10-22', pinned: false },
            ],
          },
        },
        visionPhase: {
          scenes: [
            {
              id: 's1',
              title: 'Open',
              beats: [{ beatId: 'b1', storyboardImageUrl: 'https://example.com/still.png' }],
            },
            { id: 's2', title: 'Close', beats: [{ beatId: 'b2' }] },
          ],
        },
      },
    })

    expect(card.plannedCredits).toBe(1200)
    expect(card.finishDate).toBe('2026-10-22')
    expect(card.finishLabel).toBe('Oct. 22, 2026')
    expect(card.hasSchedule).toBe(true)
    expect(card.scenesPlanned).toBe(1)
    expect(card.scenesFinished).toBe(1)
    expect(card.schedulePace).toBe('on_pace')
    expect(card.upcoming.map((row) => row.label)).toEqual(['Oct. 22, 2026'])
    expect(card.chapterEnds.length).toBeGreaterThan(0)
  })

  it('says when a project has no saved schedule', () => {
    const card = buildCompanionPlanCard({
      projectId: 'project-2',
      title: 'Untitled',
      updatedAt: '2026-09-30T00:00:00.000Z',
      today: '2026-09-30',
      metadata: {},
    })
    expect(card.hasSchedule).toBe(false)
    expect(card.plannedCredits).toBeNull()
    expect(card.schedulePace).toBeNull()
    expect(card.upcoming).toEqual([])
  })
})

describe('feedback notifications', () => {
  it('builds a blueprint payload with source and excerpt', () => {
    const note = buildFeedbackNotification({
      userId: 'user-1',
      projectId: 'project-1',
      source: 'blueprint',
      reviewer: 'Ava',
      excerpt: '  Tighten the opening.  ',
      feedbackId: 'fb-1',
    })
    expect(note.type).toBe('feedback')
    expect(note.title).toBe('Blueprint feedback')
    expect(note.message).toBe('Ava: Tighten the opening.')
    expect(note.metadata).toMatchObject({
      source: 'blueprint',
      feedbackId: 'fb-1',
      excerpt: 'Tighten the opening.',
    })
    expect(companionOpenPath(note)).toBe('/dashboard?companion=feedback&project=project-1')
  })

  it('builds a screening payload and trims long notes', () => {
    const excerpt = feedbackExcerpt('x'.repeat(200), 20)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBe(20)
    const note = buildFeedbackNotification({
      userId: 'user-1',
      projectId: 'project-1',
      source: 'screening',
      reviewer: 'Sam',
      excerpt,
      feedbackId: 'fb-2',
      screeningId: 'screen-1',
    })
    expect(note.metadata.source).toBe('screening')
    expect(note.metadata.screeningId).toBe('screen-1')
    expect(note.message.startsWith('Sam: ')).toBe(true)
  })
})
