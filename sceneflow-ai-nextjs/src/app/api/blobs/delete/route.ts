import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'

export const runtime = 'nodejs'

/**
 * DELETE /api/blobs/delete
 * 
 * Deletes one or more blobs from Vercel Blob storage.
 * Used to clean up orphaned audio files when scenes are edited.
 * 
 * Body: { urls: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json()
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: urls (array of blob URLs)' },
        { status: 400 }
      )
    }
    
    // Filter to only Vercel Blob URLs for safety
    const validUrls = urls.filter((url: string) => {
      if (typeof url !== 'string') return false
      // Vercel Blob URLs contain these patterns
      return url.includes('.vercel-storage.com') || 
             url.includes('.public.blob.vercel-storage.com')
    })
    
    if (validUrls.length === 0) {
      console.log('[Blob Delete] No valid Vercel Blob URLs provided')
      return NextResponse.json({ 
        success: true, 
        deleted: 0,
        message: 'No valid Vercel Blob URLs to delete'
      })
    }
    
    console.log(`[Blob Delete] Deleting ${validUrls.length} blob(s)...`)
    
    // Delete blobs (del supports arrays)
    await del(validUrls)
    
    console.log(`[Blob Delete] Successfully deleted ${validUrls.length} blob(s)`)
    
    return NextResponse.json({
      success: true,
      deleted: validUrls.length
    })
  } catch (error: any) {
    console.error('[Blob Delete] Error:', error)
    
    // Don't fail hard - blob deletion is cleanup, not critical
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete blobs'
    }, { status: 500 })
  }
}
