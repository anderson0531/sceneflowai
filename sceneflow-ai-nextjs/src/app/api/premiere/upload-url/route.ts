import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export const runtime = 'edge'

const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'video/x-m4v',
          ],
          maximumSizeInBytes: MAX_VIDEO_SIZE,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[Premiere Upload URL] Upload completed:', blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[Premiere Upload URL] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
