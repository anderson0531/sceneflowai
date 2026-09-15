import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import {
  IMAGE_CLIENT_CONTENT_TYPES,
  IMAGE_CLIENT_MAX_BYTES,
} from '@/lib/vision/imageUploadLimits'

/**
 * Signed URL for browser → Vercel Blob image uploads.
 * Bypasses the 4.5MB Function body cap that 413s POST /api/upload/image.
 */
export const runtime = 'edge'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...IMAGE_CLIENT_CONTENT_TYPES],
        maximumSizeInBytes: IMAGE_CLIENT_MAX_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('[Image Upload URL] Upload completed:', blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[Image Upload URL] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
