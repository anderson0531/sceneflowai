import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export const runtime = 'edge'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Validate pathname/filename
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('[Upload URL] Upload completed:', blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[Upload URL] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
