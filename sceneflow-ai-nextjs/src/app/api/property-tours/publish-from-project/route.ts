import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { compileSceneFlowProjectToPropertyTour } from '@/lib/propertyTours/compileProjectToTour'
import { buildPropertyTourUrls } from '@/lib/propertyTours/hostingPolicy'
import {
  isVercelBlobConfigured,
  savePublishedTourToVercelBlob,
} from '@/lib/propertyTours/vercelBlobStore'
import type { PropertyBranding, PropertySpecs } from '@/lib/propertyTours/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 1-Click "Publish Production -> Interactive Property Explorer" endpoint.
 *
 * Compiles any SceneFlow Blueprint + Production project (scenes, N/E/S/W frames,
 * rendered video clips, multilingual agent sales narration, and music tracks)
 * into a live white-label `/tour/[slug]` and `/tour/[slug]?embed=1` player.
 *
 * Persists directly to Vercel Blob CDN (zero GCP dependency), and best-effort
 * mirrors into Postgres `property_tours` when authenticated and Cloud SQL is online.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isVercelBlobConfigured()) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN is not configured on this deployment.' },
        { status: 503 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    const projectId = String(body.projectId || `proj-${crypto.randomBytes(4).toString('hex')}`).trim()

    const compiled = compileSceneFlowProjectToPropertyTour({
      projectId,
      userId: typeof body.userId === 'string' ? body.userId : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      script: body.script,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
      sceneProductionState:
        body.sceneProductionState && typeof body.sceneProductionState === 'object'
          ? body.sceneProductionState
          : undefined,
      streams: Array.isArray(body.streams) ? body.streams : undefined,
      brandingOverrides: (body.branding || {}) as Partial<PropertyBranding>,
      specsOverrides: (body.propertySpecs || {}) as Partial<PropertySpecs>,
      propertyAddress: typeof body.propertyAddress === 'string' ? body.propertyAddress : null,
      customSlug: typeof body.customSlug === 'string' ? body.customSlug : null,
    })

    if (compiled.tour.rooms.length === 0) {
      return NextResponse.json(
        {
          error:
            'No scenes found in this project yet. Generate a Script / Storyboard in Blueprint or Production before publishing to Property Explorer.',
        },
        { status: 400 }
      )
    }

    // 1. Primary resilient publish to Vercel Blob CDN (100% Vercel-native)
    await savePublishedTourToVercelBlob(compiled.tour)

    // 2. Best-effort mirror to Postgres `property_tours` if session & DB are online
    let syncedToPostgres = false
    try {
      const [{ getServerSession }, { authOptions }, { resolveUser }, { ensurePropertyToursSchema }, { PropertyTour }] =
        await Promise.all([
          import('next-auth'),
          import('@/lib/auth'),
          import('@/lib/userHelper'),
          import('@/lib/database/migratePropertyTours'),
          import('@/models'),
        ])
      const session = (await getServerSession(authOptions as any)) as {
        user?: { id?: string; email?: string | null }
      } | null
      const rawId = session?.user?.id || session?.user?.email
      if (rawId) {
        const user = await resolveUser(rawId).catch(() => null)
        if (user) {
          await ensurePropertyToursSchema()
          const existing = await PropertyTour.findOne({
            where: { slug: compiled.tour.slug, user_id: user.id },
          })
          if (existing) {
            await existing.update({
              title: compiled.tour.title,
              property_address: compiled.tour.propertyAddress,
              property_specs: compiled.tour.propertySpecs,
              branding: compiled.tour.branding,
              blueprint_rooms: compiled.tour.rooms,
              available_styles: compiled.tour.availableStyles,
              available_lighting: compiled.tour.availableLighting,
              available_lifestyles: compiled.tour.availableLifestyles,
              status: 'published',
              published_at: new Date(),
            })
          } else {
            await PropertyTour.create({
              id: crypto.randomUUID(),
              user_id: user.id,
              slug: compiled.tour.slug,
              title: compiled.tour.title,
              property_address: compiled.tour.propertyAddress,
              property_specs: compiled.tour.propertySpecs,
              branding: compiled.tour.branding,
              default_room_id: compiled.tour.defaultRoomId,
              available_styles: compiled.tour.availableStyles,
              available_lighting: compiled.tour.availableLighting,
              available_lifestyles: compiled.tour.availableLifestyles,
              blueprint_rooms: compiled.tour.rooms,
              status: 'published',
              hosting_tier: 'standard',
              published_at: new Date(),
            })
          }
          syncedToPostgres = true
        }
      }
    } catch (dbErr) {
      console.warn('[publish-from-project] Postgres mirror skipped (Vercel Blob live):', dbErr)
    }

    const origin = new URL(request.url).origin
    const urls = buildPropertyTourUrls(compiled.tour.slug, origin)

    return NextResponse.json(
      {
        success: true,
        storage: syncedToPostgres ? 'vercel_blob+postgres' : 'vercel_blob',
        slug: compiled.tour.slug,
        tour: compiled.tour,
        stats: compiled.stats,
        ...urls,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[POST /api/property-tours/publish-from-project] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to publish project to Property Explorer' },
      { status: 500 }
    )
  }
}
