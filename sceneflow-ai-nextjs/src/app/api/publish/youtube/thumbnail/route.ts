import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import { authOptions } from '@/lib/auth'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function parseDataUriBuffer(dataUri: string): Buffer {
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/)
  if (match?.[1]) {
    return Buffer.from(match[1], 'base64')
  }
  return Buffer.from(dataUri.replace(/^data:[^,]+,/, ''), 'base64')
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      projectId?: string
      projectTitle?: string
      videoTitle?: string
      synopsis?: string
      genre?: string
      unitKind?: string
      language?: string
      aspectRatio?: '16:9' | '9:16'
      customPrompt?: string
      referenceImageUrl?: string
    }

    const aspect: '16:9' | '9:16' = body.aspectRatio === '9:16' ? '9:16' : '16:9'
    const title = (body.videoTitle || body.projectTitle || 'Untitled Film').trim()
    const synopsis = (body.synopsis || '').trim()
    const genre = (body.genre || 'cinematic drama').trim()

    const prompt = body.customPrompt?.trim()
      ? body.customPrompt.trim()
      : [
          `Create a bold, high-contrast, cinematic YouTube thumbnail (${aspect}) for "${title}".`,
          synopsis ? `Story context: ${synopsis.slice(0, 350)}` : '',
          `Genre & mood: ${genre}.`,
          `Composition: Dramatic focal subject with expressive emotion, rich rim lighting, shallow depth of field, vivid color separation, clean negative space, zero watermarks, no cluttered small text, theatrical film poster quality.`,
        ]
          .filter(Boolean)
          .join(' ')

    const referenceImages =
      body.referenceImageUrl && /^https?:\/\//i.test(body.referenceImageUrl)
        ? [
            {
              referenceId: 1,
              imageUrl: body.referenceImageUrl,
              subjectDescription: 'Visual style and key character/scene reference from the film',
            },
          ]
        : undefined

    const dataUri = await generateImageWithGemini(prompt, {
      aspectRatio: aspect,
      imageSize: '1K',
      quality: 'fast',
      skipFaceMesh: true,
      ...(referenceImages ? { referenceImages } : {}),
    })

    const rawBuffer = parseDataUriBuffer(dataUri)
    const targetWidth = aspect === '9:16' ? 720 : 1280
    const targetHeight = aspect === '9:16' ? 1280 : 720

    // Compress to crisp <= 1.5MB JPEG so YouTube thumbnails.set (2MB hard limit) always succeeds
    const jpegBuffer = await sharp(rawBuffer)
      .resize(targetWidth, targetHeight, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer()

    const safeProject = (body.projectId || 'default').replace(/[^a-zA-Z0-9_-]/g, '')
    const safeLang = (body.language || 'en').replace(/[^a-zA-Z0-9_-]/g, '')
    const blobPath = `projects/${safeProject}/images/thumbnails/youtube-${safeLang}-${Date.now()}.jpg`

    const uploaded = await put(blobPath, jpegBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    })

    return NextResponse.json({
      success: true,
      thumbnailUrl: uploaded.url,
      promptUsed: prompt,
      bytes: jpegBuffer.length,
    })
  } catch (error: unknown) {
    console.error('[YouTube Thumbnail Generate] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate thumbnail'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
