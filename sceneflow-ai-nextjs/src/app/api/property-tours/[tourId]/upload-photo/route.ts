import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { PropertyTour } from '@/models'
import { resolveUser } from '@/lib/userHelper'
import { ensurePropertyToursSchema } from '@/lib/database/migratePropertyTours'
import { COMPASS_DIRECTIONS, type CompassDirection } from '@/lib/propertyTours/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_BYTES = 12 * 1024 * 1024 // 12MB

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const roomId = String(formData.get('roomId') || '').trim()
    const direction = String(formData.get('direction') || 'N').trim().toUpperCase() as CompassDirection

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }
    if (!COMPASS_DIRECTIONS.includes(direction)) {
      return NextResponse.json({ error: 'Invalid direction (must be N, E, S, or W)' }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Image exceeds 12MB limit' }, { status: 400 })
    }

    const contentType = file.type || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 })
    }

    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const buffer = Buffer.from(await file.arrayBuffer())
    const blobPath = `property-tours/${tour.id}/${roomId || 'room'}/${direction.toLowerCase()}-orig-${Date.now()}.${ext}`

    const blob = await put(blobPath, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    })

    const rooms = Array.isArray(tour.blueprint_rooms) ? [...tour.blueprint_rooms] : []
    const roomIdx = rooms.findIndex((r) => r.id === roomId)
    if (roomIdx === -1) {
      return NextResponse.json({ error: 'Room not found on this tour' }, { status: 404 })
    }

    const targetRoom = {
      ...rooms[roomIdx],
      perspectives: {
        ...rooms[roomIdx].perspectives,
        [direction]: {
          ...rooms[roomIdx].perspectives[direction],
          direction,
          originalImageUrl: blob.url,
        },
      },
    }
    rooms[roomIdx] = targetRoom
    tour.blueprint_rooms = rooms
    tour.changed('blueprint_rooms', true)
    await tour.save()

    return NextResponse.json({
      imageUrl: blob.url,
      tour: tour.toDTO(),
    })
  } catch (error: any) {
    console.error('[POST /api/property-tours/[tourId]/upload-photo] Error:', error)
    return NextResponse.json(
      { error: 'Photo upload failed', message: error?.message },
      { status: 500 }
    )
  }
}
