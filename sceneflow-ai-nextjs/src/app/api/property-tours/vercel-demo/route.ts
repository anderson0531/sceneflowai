import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  buildPropertyPerspectivePrompt,
  buildPropertyTourUrls,
  slugifyPropertyTitle,
} from '@/lib/propertyTours/hostingPolicy'
import {
  isVercelBlobConfigured,
  savePublishedTourToVercelBlob,
  uploadDataUrlImageToVercelBlob,
} from '@/lib/propertyTours/vercelBlobStore'
import {
  COMPASS_DIRECTIONS,
  type CompassDirection,
  type PropertyAdditionId,
  type PropertyEventId,
  type PropertyLifestyleId,
  type PropertyLightingId,
  type PropertyRoom,
  type PropertyStyleId,
  type PropertyTourDTO,
} from '@/lib/propertyTours/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const AI_GATEWAY_CHAT_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'
const VERCEL_GATEWAY_IMAGE_MODELS = [
  'google/gemini-2.5-flash-image',
  'google/gemini-3-pro-image',
] as const

function extractImageDataUrlFromGatewayPayload(payload: any): string | null {
  const choice = payload?.choices?.[0]
  const message = choice?.message
  if (!message) return null

  // OpenAI / Vercel AI Gateway multimodal image array shape
  if (Array.isArray(message.images)) {
    for (const img of message.images) {
      const url = img?.image_url?.url || img?.url
      if (typeof url === 'string' && url.length > 32) return url
      if (typeof img?.b64_json === 'string' && img.b64_json.length > 32) {
        return `data:image/png;base64,${img.b64_json}`
      }
    }
  }

  // Content array parts (image_url / inline_data)
  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      const url = part?.image_url?.url || part?.url
      if (typeof url === 'string' && url.length > 32) return url
      if (part?.inline_data?.data) {
        const mime = part.inline_data.mime_type || 'image/png'
        return `data:${mime};base64,${part.inline_data.data}`
      }
    }
  }

  // Fallback: data URL embedded in string content
  if (typeof message.content === 'string') {
    const match = message.content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/)
    if (match) return match[0]
  }

  return null
}

async function resolveImageInputForGateway(
  imageInput: string,
  origin: string
): Promise<string | null> {
  const trimmed = (imageInput || '').trim()
  if (!trimmed) return null
  if (trimmed.startsWith('data:image/')) return trimmed
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return trimmed
  if (trimmed.startsWith('/')) {
    return `${origin.replace(/\/$/, '')}${trimmed}`
  }
  return null
}

async function generateStagedImageViaVercelGateway(args: {
  prompt: string
  originalImageUrl: string | null
  anchorImageUrl: string | null
}): Promise<{ dataUrlOrUrl: string; modelUsed: string }> {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY is not configured in Vercel')
  }

  const contentParts: Array<Record<string, unknown>> = [{ type: 'text', text: args.prompt }]
  if (args.originalImageUrl) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: args.originalImageUrl },
    })
  }
  if (args.anchorImageUrl && args.anchorImageUrl !== args.originalImageUrl) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: args.anchorImageUrl },
    })
  }

  let lastError = 'No image returned by Vercel AI Gateway'

  for (const model of VERCEL_GATEWAY_IMAGE_MODELS) {
    try {
      const response = await fetch(AI_GATEWAY_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          modalities: ['image', 'text'],
          messages: [{ role: 'user', content: contentParts }],
        }),
        signal: AbortSignal.timeout(75_000),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText)
        lastError = `${model} HTTP ${response.status}: ${errText.slice(0, 200)}`
        continue
      }

      const json = await response.json()
      const imageUrl = extractImageDataUrlFromGatewayPayload(json)
      if (imageUrl) {
        return { dataUrlOrUrl: imageUrl, modelUsed: model }
      }
      lastError = `${model} responded without an image payload`
    } catch (err: any) {
      lastError = `${model}: ${err?.message || 'request failed'}`
    }
  }

  throw new Error(lastError)
}

async function handleStagePhoto(request: NextRequest, body: Record<string, any>) {
  const roomName = String(body.roomName || 'Living Room').trim().slice(0, 120)
  const roomType = (body.roomType || 'living') as PropertyRoom['roomType']
  const direction: CompassDirection = COMPASS_DIRECTIONS.includes(body.direction)
    ? body.direction
    : 'N'
  const style = (body.style || 'modern_coastal') as PropertyStyleId
  const lighting = (body.lighting || 'daylight') as PropertyLightingId
  const lifestyle = (body.lifestyle || 'architectural') as PropertyLifestyleId
  const event = (body.event || 'none') as PropertyEventId
  const addition = (body.addition || 'none') as PropertyAdditionId
  const customInstructions =
    typeof body.customInstructions === 'string'
      ? body.customInstructions.trim().slice(0, 400)
      : undefined

  const origin = new URL(request.url).origin
  const originalResolved = await resolveImageInputForGateway(
    String(body.originalImageUrl || ''),
    origin
  )
  const anchorResolved = await resolveImageInputForGateway(
    String(body.anchorImageUrl || ''),
    origin
  )

  const syntheticRoom: PropertyRoom = {
    id: 'vercel-demo-room',
    name: roomName,
    roomType,
    orderIndex: 0,
    anchorDirection: 'N',
    description: typeof body.roomDescription === 'string' ? body.roomDescription : undefined,
    perspectives: {
      N: { direction: 'N', originalImageUrl: originalResolved, variants: [] },
      E: { direction: 'E', originalImageUrl: originalResolved, variants: [] },
      S: { direction: 'S', originalImageUrl: originalResolved, variants: [] },
      W: { direction: 'W', originalImageUrl: originalResolved, variants: [] },
    },
  }

  const isAnchor = direction === 'N'
  const prompt = buildPropertyPerspectivePrompt({
    room: syntheticRoom,
    direction,
    style,
    lighting,
    lifestyle,
    event,
    addition,
    isAnchor,
    hasOriginalPhoto: Boolean(originalResolved),
    hasAnchorReference: Boolean(!isAnchor && anchorResolved),
    customInstructions,
  })

  const { dataUrlOrUrl, modelUsed } = await generateStagedImageViaVercelGateway({
    prompt,
    originalImageUrl: originalResolved,
    anchorImageUrl: anchorResolved,
  })

  // Persist generated plate to Vercel Blob if configured so published links stay lightweight & fast
  let finalImageUrl = dataUrlOrUrl
  if (dataUrlOrUrl.startsWith('data:image/') && isVercelBlobConfigured()) {
    const slugHint = slugifyPropertyTitle(roomName, direction.toLowerCase())
    finalImageUrl = await uploadDataUrlImageToVercelBlob({
      dataUrl: dataUrlOrUrl,
      slug: slugHint,
      filenamePrefix: `${style}-${lighting}-${direction.toLowerCase()}`,
    })
  }

  return NextResponse.json({
    success: true,
    imageUrl: finalImageUrl,
    modelUsed,
    provider: 'vercel_ai_gateway',
    promptSummary: `${style.replace(/_/g, ' ')} · ${lighting.replace(/_/g, ' ')} · ${lifestyle.replace(/_/g, ' ')} (${direction} wall)`,
  })
}

async function handlePublishTour(request: NextRequest, body: Record<string, any>) {
  if (!isVercelBlobConfigured()) {
    return NextResponse.json(
      { error: 'Vercel Blob storage is not configured on this deployment.' },
      { status: 503 }
    )
  }

  const incoming = body.tour as (PropertyTourDTO & { blueprintRooms?: PropertyRoom[] }) | undefined
  const incomingRooms = Array.isArray(incoming?.rooms)
    ? incoming.rooms
    : Array.isArray(incoming?.blueprintRooms)
      ? incoming.blueprintRooms
      : null
  if (!incoming || !incoming.title || !incomingRooms) {
    return NextResponse.json({ error: 'Invalid property tour payload.' }, { status: 400 })
  }
  if (incomingRooms.length > 20) {
    return NextResponse.json({ error: 'Demo tours are limited to 20 rooms.' }, { status: 400 })
  }

  const suffix = crypto.randomBytes(3).toString('hex')
  const slug = slugifyPropertyTitle(incoming.title, suffix)
  const now = new Date().toISOString()

  // Persist any local browser data:image/... URLs to Vercel Blob CDN
  const persistedRooms: PropertyRoom[] = []
  for (const room of incomingRooms) {
    const updatedPerspectives = { ...room.perspectives }
    for (const dir of COMPASS_DIRECTIONS) {
      const p = room.perspectives[dir]
      let origUrl = p.originalImageUrl
      if (typeof origUrl === 'string' && origUrl.startsWith('data:image/')) {
        origUrl = await uploadDataUrlImageToVercelBlob({
          dataUrl: origUrl,
          slug,
          filenamePrefix: `${room.id}-${dir}-orig`,
        })
      }

      const updatedVariants = []
      for (const v of p.variants || []) {
        let vUrl = v.imageUrl
        if (typeof vUrl === 'string' && vUrl.startsWith('data:image/')) {
          vUrl = await uploadDataUrlImageToVercelBlob({
            dataUrl: vUrl,
            slug,
            filenamePrefix: `${room.id}-${dir}-${v.style}`,
          })
        }
        updatedVariants.push({ ...v, imageUrl: vUrl })
      }

      updatedPerspectives[dir] = {
        ...p,
        originalImageUrl: origUrl,
        variants: updatedVariants,
      }
    }

    persistedRooms.push({
      ...room,
      perspectives: updatedPerspectives,
    })
  }

  const publishedTour: PropertyTourDTO = {
    ...incoming,
    id: `vercel-tour-${suffix}`,
    slug,
    status: 'published',
    publishedAt: now,
    updatedAt: now,
    createdAt: incoming.createdAt || now,
    rooms: persistedRooms,
  }

  await savePublishedTourToVercelBlob(publishedTour)

  const origin = new URL(request.url).origin
  const urls = buildPropertyTourUrls(slug, origin)

  return NextResponse.json(
    {
      success: true,
      storage: 'vercel_blob',
      slug,
      tour: publishedTour,
      ...urls,
    },
    { status: 201 }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    const action = String(body.action || '')

    if (action === 'stage-photo') {
      return await handleStagePhoto(request, body)
    }

    if (action === 'publish-tour') {
      return await handlePublishTour(request, body)
    }

    return NextResponse.json(
      { error: 'Unsupported action. Expected "stage-photo" or "publish-tour".' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[POST /api/property-tours/vercel-demo] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Vercel demo request failed' },
      { status: 500 }
    )
  }
}
