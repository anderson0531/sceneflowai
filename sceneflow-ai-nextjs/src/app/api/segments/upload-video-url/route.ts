import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

/**
 * Handle client-side video uploads to Vercel Blob.
 * This endpoint generates signed URLs for direct upload, bypassing the 4.5MB serverless limit.
 * 
 * Videos up to 500MB are supported with client-side upload.
 */
export const runtime = 'edge'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Extract segment ID from pathname for logging
        console.log('[Upload Video URL] Generating token for:', pathname)
        
        return {
          allowedContentTypes: [
            'video/mp4',
            'video/webm', 
            'video/quicktime',
            'video/x-msvideo',
            'video/x-matroska',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB max
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('[Upload Video URL] Upload completed:', blob.url, 'Size:', Math.round(blob.size / 1024 / 1024), 'MB')
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[Upload Video URL] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
