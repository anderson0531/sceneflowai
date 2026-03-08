/**
 * Video Proxy API Route
 * 
 * GET /api/proxy-video?url=<encoded-url>
 * 
 * Proxies video content from Google Cloud Storage signed URLs to bypass CORS
 * restrictions when the browser needs to fetch video data for IndexedDB caching.
 * 
 * The <video> element can play GCS URLs directly (no CORS needed), but when
 * we need to fetch() the video data to store in IndexedDB for offline access,
 * CORS blocks the request. This proxy fetches server-side and streams back.
 * 
 * Security:
 * - Only proxies URLs from trusted domains (storage.googleapis.com, vercel-storage)
 * - Only returns video/* content types
 * - Streams response to avoid loading full video into server memory
 */

import { NextRequest, NextResponse } from 'next/server'

// Trusted domains we'll proxy video from
const TRUSTED_DOMAINS = [
  'storage.googleapis.com',
  'storage.cloud.google.com',
  '.public.blob.vercel-storage.com',
  '.vercel-storage.com',
]

function isUrlTrusted(url: string): boolean {
  try {
    const parsed = new URL(url)
    return TRUSTED_DOMAINS.some(domain => 
      domain.startsWith('.') 
        ? parsed.hostname.endsWith(domain) 
        : parsed.hostname === domain
    )
  } catch {
    return false
  }
}

export const maxDuration = 60 // 60 seconds max for large video downloads

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const videoUrl = searchParams.get('url')
  
  if (!videoUrl) {
    return NextResponse.json(
      { error: 'Missing required parameter: url' },
      { status: 400 }
    )
  }
  
  // Validate URL is from a trusted domain
  if (!isUrlTrusted(videoUrl)) {
    return NextResponse.json(
      { error: 'URL not from a trusted domain' },
      { status: 403 }
    )
  }
  
  try {
    // Fetch the video server-side (no CORS restrictions)
    const response = await fetch(videoUrl, {
      headers: {
        // Avoid sending custom headers that might trigger CORS preflight
        'Accept': 'video/*,*/*',
      },
    })
    
    if (!response.ok) {
      console.error(`[ProxyVideo] Upstream fetch failed: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: `Upstream fetch failed: ${response.status}` },
        { status: response.status }
      )
    }
    
    const contentType = response.headers.get('content-type') || 'video/mp4'
    const contentLength = response.headers.get('content-length')
    
    // Validate content type is video
    if (!contentType.startsWith('video/') && !contentType.startsWith('application/octet-stream')) {
      return NextResponse.json(
        { error: `Invalid content type: ${contentType}` },
        { status: 400 }
      )
    }
    
    // Stream the video back with proper CORS headers
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    }
    
    if (contentLength) {
      headers['Content-Length'] = contentLength
    }
    
    // Stream the response body through
    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
    
  } catch (error) {
    console.error('[ProxyVideo] Error proxying video:', error)
    return NextResponse.json(
      { error: 'Failed to proxy video' },
      { status: 500 }
    )
  }
}
