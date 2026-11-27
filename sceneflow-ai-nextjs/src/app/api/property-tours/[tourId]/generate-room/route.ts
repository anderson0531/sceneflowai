import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PropertyTour } from '@/models'
import { resolveUser } from '@/lib/userHelper'
import { ensurePropertyToursSchema } from '@/lib/database/migratePropertyTours'
import { generateVertexGeminiImage } from '@/lib/vertexai/vertexImageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { executeMeteredProviderCall } from '@/lib/credits/meteredGateway'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { GEMINI_PRO_STILL_MODEL_ID } from '@/lib/credits/quoteGenerationCredits'
import { resolveVertexCredentialForUser } from '@/lib/byok/resolveProviderCredential'
import { buildPropertyPerspectivePrompt } from '@/lib/propertyTours/hostingPolicy'
import {
  COMPASS_DIRECTIONS,
  type CompassDirection,
  type PropertyLifestyleId,
  type PropertyLightingId,
  type PropertyStyleId,
  type PropertyVariantAsset,
} from '@/lib/propertyTours/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/property-tours/[tourId]/generate-room
 *
 * Cross-Angle Locked N/E/S/W Blueprint Generator:
 * 1. Generates the room's Anchor direction (default 'N') first via Gemini 3 Pro Image (2K).
 * 2. Generates E, S, W sequentially passing [Original Wall Photo, Anchor Plate] as interleaved
 *    reference images so flooring, cabinetry, wall paint, and sunlight match seamlessly across all 4 walls.
 * 3. Every plate is escrow-metered via `executeMeteredProviderCall` and persisted immediately to Vercel Blob + Postgres.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tourId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null }
    } | null
    const rawId = session?.user?.id || session?.user?.email
    if (!rawId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = await resolveUser(rawId)
    const { tourId } = await context.params
    await ensurePropertyToursSchema()

    const tour = await PropertyTour.findOne({ where: { id: tourId, user_id: user.id } })
    if (!tour) {
      return NextResponse.json({ error: 'Property tour not found' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      roomId?: string
      style?: PropertyStyleId
      lighting?: PropertyLightingId
      lifestyle?: PropertyLifestyleId
      directions?: CompassDirection[]
      customInstructions?: string
    }

    const roomId = String(body.roomId || '').trim()
    const style: PropertyStyleId = body.style || 'modern_coastal'
    const lighting: PropertyLightingId = body.lighting || 'daylight'
    const lifestyle: PropertyLifestyleId = body.lifestyle || 'architectural'

    const rooms = Array.isArray(tour.blueprint_rooms) ? [...tour.blueprint_rooms] : []
    const roomIdx = rooms.findIndex((r) => r.id === roomId)
    if (roomIdx === -1) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const room = { ...rooms[roomIdx], perspectives: { ...rooms[roomIdx].perspectives } }
    const anchorDir: CompassDirection = room.anchorDirection || 'N'

    const requestedDirs: CompassDirection[] =
      Array.isArray(body.directions) && body.directions.length > 0
        ? body.directions.filter((d): d is CompassDirection => COMPASS_DIRECTIONS.includes(d))
        : [...COMPASS_DIRECTIONS]

    // Ensure Anchor direction ALWAYS runs first so E/S/W lock to it!
    const orderedDirs = [
      ...requestedDirs.filter((d) => d === anchorDir),
      ...requestedDirs.filter((d) => d !== anchorDir),
    ]

    const vertexCred = await resolveVertexCredentialForUser(user.id)
    const credentialSource = vertexCred.source

    // Check if an anchor variant already exists for this exact style+lighting+lifestyle
    let anchorImageUrl: string | null =
      room.perspectives[anchorDir]?.variants.find(
        (v) => v.style === style && v.lighting === lighting && v.lifestyle === lifestyle
      )?.imageUrl ?? null

    const generatedDirections: CompassDirection[] = []
    const errors: string[] = []
    let totalCreditsCharged = 0

    for (const dir of orderedDirs) {
      const perspective = room.perspectives[dir]
      if (!perspective) continue

      const isAnchor = dir === anchorDir
      const originalPhoto = perspective.originalImageUrl
      const isHttpPhoto = Boolean(originalPhoto && /^https?:\/\//i.test(originalPhoto))
      const hasAnchorRef = Boolean(!isAnchor && anchorImageUrl && /^https?:\/\//i.test(anchorImageUrl))

      const referenceImages: Array<{ imageUrl: string; name: string }> = []
      if (isHttpPhoto && originalPhoto) {
        referenceImages.push({
          imageUrl: originalPhoto,
          name: `Original ${room.name} (${dir} wall architecture)`,
        })
      }
      if (hasAnchorRef && anchorImageUrl) {
        referenceImages.push({
          imageUrl: anchorImageUrl,
          name: `Approved ${room.name} (${anchorDir} Anchor style & materials lock)`,
        })
      }

      const prompt = buildPropertyPerspectivePrompt({
        room,
        direction: dir,
        style,
        lighting,
        lifestyle,
        isAnchor,
        hasOriginalPhoto: isHttpPhoto,
        hasAnchorReference: hasAnchorRef,
        customInstructions: body.customInstructions,
      })

      try {
        const metered = await executeMeteredProviderCall({
          userId: user.id,
          projectId: null,
          route: '/api/property-tours/[tourId]/generate-room',
          provider: 'vertex',
          model: GEMINI_PRO_STILL_MODEL_ID,
          operation: 'gemini_pro_still_2k',
          credentialSource,
          ref: `property_tour:${tour.id}:${room.id}:${dir}`,
          quoteInput: {
            kind: 'still',
            provider: 'google_vertex',
            model: GEMINI_PRO_STILL_MODEL_ID,
            resolution: '2k',
            imageCount: 1,
            floorCredits: IMAGE_CREDITS.SCENE_REFERENCE,
          },
          meta: {
            tourId: tour.id,
            roomId: room.id,
            direction: dir,
            style,
            lighting,
            lifestyle,
          },
          execute: async () => {
            const imgResult = await generateVertexGeminiImage({
              prompt,
              aspectRatio: '16:9',
              imageSize: '2K',
              modelTier: 'pro',
              referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
              byokCredential: vertexCred,
              bucketNamespace: vertexCred.bucketNamespace,
            })
            const dataUrl = `data:${imgResult.mimeType};base64,${imgResult.imageBase64}`
            const blobUrl = await uploadImageToBlob(
              dataUrl,
              `property-tours/${tour.id}/${room.id}/${dir.toLowerCase()}-${style}-${lighting}-${lifestyle}-${Date.now()}.png`
            )
            return { blobUrl, modelId: imgResult.modelId }
          },
        })

        const newVariant: PropertyVariantAsset = {
          id: `var-${crypto.randomUUID().slice(0, 8)}`,
          style,
          lighting,
          lifestyle,
          imageUrl: metered.result.blobUrl,
          motionVideoUrl: null,
          isVirtuallyModified: style !== 'as_is' || lighting !== 'daylight' || lifestyle !== 'architectural',
          promptSummary: `${style} · ${lighting} · ${lifestyle}`,
          generatedAt: new Date().toISOString(),
          creditsUsed: metered.creditsCharged,
        }

        // Replace existing matching style+lighting+lifestyle variant or append
        const filtered = perspective.variants.filter(
          (v) => !(v.style === style && v.lighting === lighting && v.lifestyle === lifestyle)
        )
        room.perspectives[dir] = {
          ...perspective,
          variants: [newVariant, ...filtered],
        }

        if (isAnchor) {
          anchorImageUrl = metered.result.blobUrl
        }

        generatedDirections.push(dir)
        totalCreditsCharged += metered.creditsCharged

        // Persist incrementally after each wall so partial progress survives any timeout/429
        rooms[roomIdx] = room
        tour.blueprint_rooms = rooms
        tour.total_generation_credits =
          Number(tour.total_generation_credits || 0) + metered.creditsCharged
        tour.changed('blueprint_rooms', true)
        await tour.save()
      } catch (err: any) {
        if (err?.message === 'INSUFFICIENT_CREDITS') {
          if (generatedDirections.length === 0) {
            return NextResponse.json(
              {
                error: 'INSUFFICIENT_CREDITS',
                message: 'Insufficient credits to generate property perspective plates.',
              },
              { status: 402 }
            )
          }
          errors.push(`${dir}: Stopped early — insufficient credits for remaining walls.`)
          break
        }
        const msg = err instanceof Error ? err.message : 'Generation failed'
        console.error(`[PropertyTour generate-room] Wall ${dir} failed:`, msg)
        errors.push(`${dir}: ${msg}`)
      }
    }

    // Ensure style/lighting/lifestyle are listed in tour's available toggle menus
    const nextStyles = Array.from(new Set([...(tour.available_styles || ['as_is']), style]))
    const nextLighting = Array.from(new Set([...(tour.available_lighting || ['daylight']), lighting]))
    const nextLifestyles = Array.from(
      new Set([...(tour.available_lifestyles || ['architectural']), lifestyle])
    )
    tour.available_styles = nextStyles as PropertyStyleId[]
    tour.available_lighting = nextLighting as PropertyLightingId[]
    tour.available_lifestyles = nextLifestyles as PropertyLifestyleId[]
    await tour.save()

    return NextResponse.json({
      tour: tour.toDTO(),
      generatedDirections,
      totalCreditsCharged,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('[POST /api/property-tours/[tourId]/generate-room] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate room perspectives', message: error?.message },
      { status: 500 }
    )
  }
}
