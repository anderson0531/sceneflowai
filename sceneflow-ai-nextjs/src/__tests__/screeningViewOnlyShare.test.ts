import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { isScreeningFeedbackAllowed, matchingShareLink } from '@/lib/screening/shareFeedback'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Screening Room view-only share', () => {
  it('defaults existing links to feedback allowed', () => {
    expect(isScreeningFeedbackAllowed(undefined)).toBe(true)
    expect(isScreeningFeedbackAllowed({})).toBe(true)
    expect(isScreeningFeedbackAllowed({ allowFeedback: true })).toBe(true)
    expect(isScreeningFeedbackAllowed({ allowFeedback: false })).toBe(false)
  })

  it('matches a share by token or slug', () => {
    const metadata = {
      storyboardShareLink: { slug: 'TheWhiteCityCurrent', allowFeedback: false },
      screeningRoomShareLink: { shareToken: 'room-1', allowFeedback: true },
    }
    expect(matchingShareLink(metadata, 'TheWhiteCityCurrent')?.allowFeedback).toBe(false)
    expect(matchingShareLink(metadata, 'room-1')?.allowFeedback).toBe(true)
    expect(matchingShareLink(metadata, 'missing')).toBeNull()
  })

  it('stores view-only on the vision share and hides the public feedback section', () => {
    const create = readSource('src/app/api/vision/create-share-link/route.ts')
    const player = readSource('src/components/vision/StandaloneStoryboardPlayer.tsx')
    const feedback = readSource('src/app/api/vision/shared-project/[shareToken]/feedback/route.ts')
    expect(create).toContain('allowFeedback: viewOnly !== true')
    expect(player).toContain('allowFeedback ?')
    expect(player).toContain('allowFeedback={allowFeedback}')
    expect(feedback).toContain('isScreeningFeedbackAllowed')
    expect(feedback).toContain('403')
  })

  it('offers the checkbox on Screening Room link generation', () => {
    const player = readSource('src/components/vision/AudioGalleryPlayer.tsx')
    const publishing = readSource('src/components/publishing/PublishingScreeningTab.tsx')
    expect(player).toContain('View only (no feedback)')
    expect(player).toContain('screeningLayout && viewOnlyShare')
    expect(publishing).toContain('View only (no feedback)')
    expect(publishing).toContain('viewOnly')
  })

  it('skips premiere feedback chrome and rejects premiere feedback posts', () => {
    const audience = readSource('src/components/screening-room/AudiencePlayer.tsx')
    const page = readSource('src/app/s/[screeningId]/page.tsx')
    const premiere = readSource('src/app/api/premiere/feedback/route.ts')
    const create = readSource('src/lib/premiere/screenings.ts')
    expect(audience).toContain('enableAudienceFeedback && !embedMode')
    expect(audience).toContain('enableAudienceFeedback ?')
    expect(page).toContain('enableAudienceFeedback={videoData.feedbackEnabled}')
    expect(premiere).toContain('feedbackEnabled === false')
    expect(premiere).toContain('403')
    expect(create).toContain('const feedbackEnabled = input.feedbackEnabled !== false')
    expect(create).toContain('collectBiometrics: feedbackEnabled')
    expect(create).toContain('collectDemographics: feedbackEnabled')
  })
})
