import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

const GENERATE_ASSET = 'src/app/api/segments/[segmentId]/generate-asset/route.ts'
const CONTINUOUS =
  'src/app/api/scenes/[sceneId]/beats/[beatId]/generate-continuous/route.ts'
const LONGTAKE = 'src/app/api/scenes/[sceneId]/beats/[beatId]/generate-longtake/route.ts'
const CONSOLE = 'src/components/vision/scene-production/DirectorConsoleImpl.tsx'
const GALLERY = 'src/components/vision/scene-production/BeatVideoGallery.tsx'
const PAGE = 'src/app/dashboard/workflow/vision/[projectId]/page.tsx'
const EXPRESS = 'src/lib/sceneGeneration/expressOrchestrator.ts'

describe('video generation unlock wiring', () => {
  it('generate-asset, continuous, and longtake use isVideoGenerationUnlocked via enforce helper', () => {
    const asset = readSource(GENERATE_ASSET)
    const continuous = readSource(CONTINUOUS)
    const longtake = readSource(LONGTAKE)
    expect(asset).toContain('enforceVideoGenerationUnlock')
    expect(continuous).toContain('enforceVideoGenerationUnlock')
    expect(longtake).toContain('enforceVideoGenerationUnlock')
    expect(asset).not.toContain('isStoryboardApproved(')
    expect(continuous).not.toContain('isStoryboardApproved(')
    expect(longtake).not.toContain('isStoryboardApproved(')
  })

  it('Video Agent generate is gated on isVideoGenerationUnlocked', () => {
    const consoleSrc = readSource(CONSOLE)
    const gallery = readSource(GALLERY)
    expect(consoleSrc).toContain('isVideoGenerationUnlocked')
    expect(consoleSrc).toContain('videoGenerationLocked={!videoGenerationUnlocked}')
    expect(consoleSrc).toContain('Approve Pre-Vis before generating video')
    expect(gallery).toContain('videoGenerationLocked')
    expect(gallery).toContain('disabled={videoGenerationLocked}')
    expect(gallery).toContain('Approve Pre-Vis before generating video')
  })

  it('client generate-asset 403 keeps STORYBOARD_NOT_APPROVED and unlocks title bookends', () => {
    const page = readSource(PAGE)
    expect(page).toContain('isVideoGenerationUnlocked')
    expect(page).toContain('gateScene && !isVideoGenerationUnlocked')
    expect(page).toContain("errorData?.code === 'STORYBOARD_NOT_APPROVED'")
  })

  it('Express stamps bookend storyboard status through applyExpressStoryboardStatus', () => {
    const express = readSource(EXPRESS)
    expect(express).toContain('applyExpressStoryboardStatus')
    expect(express).not.toContain("scene.storyboardStatus = 'pending_review'")
  })

  it('derive-segments syncs approved onto the client script', () => {
    const page = readSource(PAGE)
    expect(page).toContain("if (data.storyboardStatus === 'approved')")
    expect(page).toContain('storyboardStatus: \'approved\'')
  })
})
