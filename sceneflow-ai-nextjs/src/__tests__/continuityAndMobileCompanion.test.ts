import { readFileSync, statSync } from 'fs'
import path from 'path'
import { describe, it, expect, vi } from 'vitest'

// Mock DB/models before importing modules that transitively reference Sequelize
vi.mock('@/config/database', () => {
  const mockSeq = {
    transaction: vi.fn(),
    define: vi.fn(() => ({})),
    query: vi.fn(),
  }
  return {
    default: mockSeq,
    sequelize: mockSeq,
  }
})
vi.mock('@/models', () => ({}))
vi.mock('@/models/CollabSession', () => ({ default: {} }))
vi.mock('@/models/ClientAssetSubmission', () => ({ default: {} }))
vi.mock('@/models/Project', () => ({ default: {} }))
vi.mock('@/models/User', () => ({ default: {} }))
vi.mock('@/models/WorkspaceMember', () => ({ default: {} }))
vi.mock('@/models/ProjectAssignment', () => ({ default: {} }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/auth/sessionUser', () => ({ getSessionUserId: vi.fn() }))
vi.mock('@/lib/database/migrateProducerPlatform', () => ({
  ensureProducerPlatformSchema: vi.fn(),
}))
vi.mock('@/lib/producer/producerProfileService', () => ({
  getLatestCustomerConsent: vi.fn(),
  getOrCreateProducerProfile: vi.fn(),
  toBrandProfileSnapshot: vi.fn(),
}))
vi.mock('@/lib/jobs/jobService', () => ({ notifyUser: vi.fn() }))
vi.mock('@/lib/referenceLibrary/assetRepository', () => ({ createReferenceAsset: vi.fn() }))

import { isPublicRoute } from '@/constants/publicRoutes'
import { computeScaledDimensions } from '@/lib/continuity/clientImageDownscale'
import {
  extractContinuitySlotsFromProject,
  applyPromotedSubmissionToProjectMetadata,
} from '@/lib/continuity/continuityPortalService'
import { companionOpenPath } from '@/lib/companion/feedbackNotification'
import {
  resolveCompanionMilestoneStage,
  buildCompanionPlanCard,
} from '@/lib/companion/planCard'
import { buildInitialBlueprintMetadataFromBrief } from '@/app/api/companion/initiate/route'

const ROOT = path.resolve(__dirname, '../..')

describe('Mobile PWA Infrastructure & Public Client Portals', () => {
  it('allows unauthenticated mobile clients to open /intake/[token] and all 4 shared review portals', () => {
    expect(isPublicRoute('/intake/tok_customer_brief_123')).toBe(true)
    expect(isPublicRoute('/blueprint/share/tok_bp_123')).toBe(true)
    expect(isPublicRoute('/share/script-resonance/tok_ara_123')).toBe(true)
    expect(isPublicRoute('/share/continuity/tok_cont_123')).toBe(true)
    expect(isPublicRoute('/share/screening-room/tok_sr_123')).toBe(true)
    expect(isPublicRoute('/dashboard/studio/proj_123')).toBe(false)
  })

  it('ships valid non-empty PWA manifest screenshots and companion shortcut URLs', () => {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, 'public/manifest.json'), 'utf8'))
    expect(manifest.shortcuts.some((s: any) => s.url === '/dashboard?companion=new')).toBe(true)
    expect(manifest.shortcuts.some((s: any) => s.url === '/dashboard?companion=plan')).toBe(true)
    expect(JSON.stringify(manifest.shortcuts)).not.toContain('/projects/new')

    const desktopShot = statSync(path.join(ROOT, 'public/screenshots/desktop-1.png'))
    const mobileShot = statSync(path.join(ROOT, 'public/screenshots/mobile-1.png'))
    expect(desktopShot.size).toBeGreaterThan(1024)
    expect(mobileShot.size).toBeGreaterThan(1024)
  })

  it('permits mobile /dashboard/settings/* access in MobileAppGate and persists AppInstallCard 7-day snooze', () => {
    const gateSrc = readFileSync(
      path.join(ROOT, 'src/components/layout/MobileAppGate.tsx'),
      'utf8'
    )
    expect(gateSrc).toContain("pathname?.startsWith('/dashboard/settings/')")

    const cardSrc = readFileSync(
      path.join(ROOT, 'src/components/pwa/AppInstallCard.tsx'),
      'utf8'
    )
    expect(cardSrc).toContain('pwa-install-dismissed')
  })
})

describe('Shared Continuity Approval & Mobile Photo Downscaling', () => {
  it('computes aspect-preserving downscaled dimensions within 2048px ceiling', () => {
    expect(computeScaledDimensions(4032, 3024, 2048)).toEqual({
      width: 2048,
      height: 1536,
    })
    expect(computeScaledDimensions(3024, 4032, 2048)).toEqual({
      width: 1536,
      height: 2048,
    })
    expect(computeScaledDimensions(1600, 1200, 2048)).toEqual({
      width: 1600,
      height: 1200,
    })
  })

  it('extracts character, wardrobe, canonical locationReferences (+ deduplicated sceneReferences), location_version, and prop slots', () => {
    const project = {
      metadata: {
        visionPhase: {
          characters: [
            {
              id: 'char-elena',
              name: 'Elena',
              role: 'Protagonist',
              description: 'Warm grandmother portrait',
              referenceImage: 'https://cdn.example/elena.jpg',
              wardrobes: [
                {
                  id: 'ward-1974',
                  name: '1974 Summer Dress',
                  description: 'Floral linen dress',
                  previewImageUrl: null,
                },
              ],
            },
          ],
          references: {
            locationReferences: [
              {
                id: 'loc-harbor',
                name: 'Harbor Pier',
                description: 'Wooden dock at sunset',
                imageUrl: 'https://cdn.example/harbor.jpg',
                versions: [
                  {
                    id: 'ver-winter',
                    name: 'Winter Storm',
                    description: 'Snow on pier planks',
                    imageUrl: null,
                  },
                ],
              },
            ],
            sceneReferences: [
              // Duplicate ID of loc-harbor should be deduped; loc-kitchen should be merged
              {
                id: 'loc-harbor',
                name: 'Harbor Pier',
                description: 'Duplicate entry',
              },
              {
                id: 'loc-kitchen',
                name: 'Family Kitchen',
                description: 'Warm sunlit breakfast table',
              },
            ],
            objectReferences: [
              {
                id: 'prop-locket',
                name: 'Brass Locket',
                description: 'Engraved heirloom locket',
                imageUrl: null,
              },
            ],
          },
        },
      },
    } as any

    const slots = extractContinuitySlotsFromProject(project)
    const types = slots.map((s) => `${s.slotType}:${s.slotId}`)
    expect(types).toEqual([
      'character:char-elena',
      'wardrobe:wardrobe:char-elena:ward-1974',
      'location:loc-harbor',
      'location_version:locver:loc-harbor:ver-winter',
      'location:loc-kitchen',
      'prop:prop-locket',
    ])
    expect(slots.find((s) => s.slotId === 'char-elena')?.needsClientPhoto).toBe(false)
    expect(slots.find((s) => s.slotId === 'prop-locket')?.needsClientPhoto).toBe(true)
  })

  it('promotes customer uploads cleanly across character, wardrobe, location, location_version, and prop metadata', () => {
    const baseMetadata = {
      visionPhase: {
        characters: [
          {
            id: 'char-elena',
            name: 'Elena',
            wardrobes: [
              {
                id: 'ward-1974',
                name: '1974 Dress',
                combinedCharacterRefUrl: 'https://old/combined.jpg',
              },
            ],
          },
        ],
        references: {
          locationReferences: [
            {
              id: 'loc-harbor',
              name: 'Harbor Pier',
              versions: [{ id: 'ver-winter', name: 'Winter' }],
            },
          ],
          sceneReferences: [{ id: 'loc-harbor', name: 'Harbor Pier' }],
          objectReferences: [{ id: 'prop-locket', name: 'Brass Locket' }],
        },
      },
    }

    const afterWardrobe = applyPromotedSubmissionToProjectMetadata(baseMetadata, {
      slot_id: 'wardrobe:char-elena:ward-1974',
      slot_type: 'wardrobe',
      slot_name: '1974 Dress',
      blob_url: 'https://blob.example/wardrobe.jpg',
    })
    const promotedWardrobe = afterWardrobe.visionPhase.characters[0].wardrobes[0]
    expect(promotedWardrobe.previewImageUrl).toBe('https://blob.example/wardrobe.jpg')
    expect(promotedWardrobe.fullBodyUrl).toBe('https://blob.example/wardrobe.jpg')
    expect(promotedWardrobe.combinedCharacterRefUrl).toBeUndefined()

    const afterLocation = applyPromotedSubmissionToProjectMetadata(afterWardrobe, {
      slot_id: 'loc-harbor',
      slot_type: 'location',
      slot_name: 'Harbor Pier',
      blob_url: 'https://blob.example/harbor-new.jpg',
    })
    expect(afterLocation.visionPhase.references.locationReferences[0].imageUrl).toBe(
      'https://blob.example/harbor-new.jpg'
    )
    expect(afterLocation.visionPhase.references.sceneReferences[0].imageUrl).toBe(
      'https://blob.example/harbor-new.jpg'
    )

    const afterLocVer = applyPromotedSubmissionToProjectMetadata(afterLocation, {
      slot_id: 'locver:loc-harbor:ver-winter',
      slot_type: 'location_version',
      slot_name: 'Winter',
      blob_url: 'https://blob.example/harbor-winter.jpg',
    })
    expect(afterLocVer.visionPhase.references.locationReferences[0].versions[0].imageUrl).toBe(
      'https://blob.example/harbor-winter.jpg'
    )

    const afterProp = applyPromotedSubmissionToProjectMetadata(afterLocVer, {
      slot_id: 'prop-locket',
      slot_type: 'prop',
      slot_name: 'Brass Locket',
      blob_url: 'https://blob.example/locket.jpg',
    })
    expect(afterProp.visionPhase.references.objectReferences[0].imageUrl).toBe(
      'https://blob.example/locket.jpg'
    )
  })
})

describe('Mobile Companion Initiation, 5-Stage Milestones & Notification Routing', () => {
  it('builds baseline Blueprint + PM support metadata when a customer initiates a project on mobile', () => {
    const md = buildInitialBlueprintMetadataFromBrief({
      title: 'Grandpa Joe Harbor Memoir',
      brief: 'A 3-minute tribute celebrating 50 years as a harbor captain with family archive photos.',
      vertical: 'video_memoir',
      requestPmSupport: true,
      customerName: 'Elena Vance',
      customerEmail: 'elena@example.com',
      creditBudgetCap: 2500,
      locale: 'es-MX',
    })

    expect(md.filmTreatmentVariant.title).toBe('Grandpa Joe Harbor Memoir')
    expect(md.filmTreatmentVariant.beats).toHaveLength(3)
    expect(md.clientOrder.pmSupportRequested).toBe(true)
    expect(md.clientOrder.initiatedVia).toBe('mobile_companion_pwa')
    expect(md.clientOrder.creditBudgetCap).toBe(2500)
    expect(md.clientOrder.locale).toBe('es')
    expect(md.visionPhase.references.locationReferences.length).toBeGreaterThan(0)
  })

  it('tracks all 5 milestone stages and surfaces shared links on CompanionPlanCard', () => {
    expect(
      resolveCompanionMilestoneStage({
        metadata: {},
        framesDone: 0,
        videosDone: 0,
        resonanceScore: null,
      })
    ).toBe('blueprint')

    expect(
      resolveCompanionMilestoneStage({
        metadata: {},
        framesDone: 0,
        videosDone: 0,
        resonanceScore: 92,
      })
    ).toBe('resonance')

    const card = buildCompanionPlanCard({
      projectId: 'proj_memoir_1',
      title: 'Grandpa Joe Harbor Memoir',
      updatedAt: '2026-11-14T00:00:00.000Z',
      metadata: {
        audienceResonanceScore: 94,
        clientOrder: {
          pmSupportRequested: true,
          stage: 'continuity_review',
          actionState: 'waiting_on_client',
          creditBudgetCap: 2500,
        },
      },
      shareLinks: {
        blueprintUrl: '/blueprint/share/bp_1',
        resonanceUrl: '/share/script-resonance/ara_1',
        continuityUrl: '/share/continuity/cont_1',
      },
      continuitySummary: {
        totalSlots: 6,
        approvedSlots: 4,
        pendingUploads: 2,
      },
    })

    expect(card.milestoneStage).toBe('continuity')
    expect(card.pmSupportRequested).toBe(true)
    expect(card.isClientProject).toBe(true)
    expect(card.creditBudgetCap).toBe(2500)
    expect(card.resonanceScore).toBe(94)
    expect(card.shareLinks.continuityUrl).toBe('/share/continuity/cont_1')
    expect(card.continuitySummary?.approvedSlots).toBe(4)
  })

  it('routes continuity, feedback, and client upload notifications to the right Mobile Companion tab', () => {
    expect(
      companionOpenPath({
        type: 'client_feedback_received',
        projectId: 'p1',
        metadata: { source: 'continuity' },
      })
    ).toBe('/dashboard?companion=feedback&project=p1')

    expect(
      companionOpenPath({
        type: 'client_assets_uploaded',
        projectId: 'p1',
      })
    ).toBe('/dashboard?companion=plan&project=p1')

    expect(
      companionOpenPath({
        type: 'job_completed',
        projectId: 'p1',
      })
    ).toBe('/dashboard?companion=inbox&project=p1')
  })
})
