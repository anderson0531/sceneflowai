/**
 * Image Proxy API Route
 * 
 * Proxies GCS images to bypass CORS restrictions when loading images
 * from storage.googleapis.com in the browser.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }
  
  // Only allow proxying from our GCS bucket for security
  const allowedDomains = [
    'storage.googleapis.com',
    'storage.cloud.google.com'
  ]
  
  try {
    const parsedUrl = new URL(url)
    
    if (!allowedDomains.some(domain => parsedUrl.hostname.includes(domain))) {
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
      console.error('[ImageProxy] Failed to fetch image:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch image', status: response.status },
        { status: response.status }
      )
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'
    
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
