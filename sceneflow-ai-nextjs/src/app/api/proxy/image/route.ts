/**
 * Image Proxy API Route
 * 
 * Proxies GCS images to bypass CORS restrictions when loading images
 * from storage.googleapis.com in the browser.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  let url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }
  
  // The URL might be double-encoded from the browser, decode it if needed
  // Check if it contains double-encoded characters like %25 (which is encoded %)
  while (url.includes('%25')) {
    url = decodeURIComponent(url)
  }
  
  console.log('[ImageProxy] Fetching URL:', url.substring(0, 120) + '...')
  
  // Only allow proxying from our GCS bucket for security
  const allowedDomains = [
    'storage.googleapis.com',
    'storage.cloud.google.com'
  ]
  
  try {
    const parsedUrl = new URL(url)
    
    if (!allowedDomains.some(domain => parsedUrl.hostname.includes(domain))) {
      console.error('[ImageProxy] URL domain not allowed:', parsedUrl.hostname)
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
    }
    
    // Fetch the image from GCS
    const response = await fetch(url, {
      headers: {
        // Forward accept header for proper content negotiation
        'Accept': 'image/*',
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('[ImageProxy] Failed to fetch image:', response.status, response.statusText)
      console.error('[ImageProxy] Error details:', errorText.substring(0, 300))
      return NextResponse.json(
        { error: 'Failed to fetch image', status: response.status, details: errorText.substring(0, 200) },
        { status: response.status }
      )
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'
    
    console.log('[ImageProxy] Successfully fetched image, size:', imageBuffer.byteLength, 'bytes')
    
    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[ImageProxy] Error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    )
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
