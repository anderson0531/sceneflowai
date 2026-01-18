import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { deleteFromGCS, isGcsSignedUrl } from '@/lib/storage/gcsAssets'

export const runtime = 'nodejs'

/**
 * DELETE /api/blobs/delete
 * 
 * Deletes one or more blobs from storage (Vercel Blob or GCS).
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
    
    // Separate Vercel Blob and GCS URLs
    const vercelUrls: string[] = []
    const gcsUrls: string[] = []
    
    for (const url of urls) {
      if (typeof url !== 'string') continue
      
      if (url.includes('.vercel-storage.com') || url.includes('.public.blob.vercel-storage.com')) {
        vercelUrls.push(url)
      } else if (url.startsWith('gs://') || isGcsSignedUrl(url)) {
        gcsUrls.push(url)
      }
    }
    
    let deletedCount = 0
    
    // Delete Vercel Blob URLs
    if (vercelUrls.length > 0) {
      console.log(`[Blob Delete] Deleting ${vercelUrls.length} Vercel blob(s)...`)
      try {
        await del(vercelUrls)
        deletedCount += vercelUrls.length
        console.log(`[Blob Delete] Deleted ${vercelUrls.length} Vercel blob(s)`)
      } catch (error: any) {
        console.error('[Blob Delete] Vercel delete error:', error.message)
      }
    }
    
    // Delete GCS URLs
    if (gcsUrls.length > 0) {
      console.log(`[Blob Delete] Deleting ${gcsUrls.length} GCS file(s)...`)
      for (const url of gcsUrls) {
        try {
          // For signed URLs, extract the gs:// path (stored in metadata or parsed from URL)
          // For now, we only support gs:// URLs directly
          if (url.startsWith('gs://')) {
            await deleteFromGCS(url)
            deletedCount++
          }
        } catch (error: any) {
          console.error(`[Blob Delete] GCS delete error for ${url}:`, error.message)
        }
      }
      console.log(`[Blob Delete] Deleted GCS files`)
    }
    
    if (deletedCount === 0 && urls.length > 0) {
      console.log('[Blob Delete] No valid URLs to delete')
      return NextResponse.json({ 
        success: true, 
        deleted: 0,
        message: 'No valid storage URLs to delete'
      })
    }
    
    console.log(`[Blob Delete] Successfully deleted ${deletedCount} file(s)`)
    
    return NextResponse.json({
      success: true,
      deleted: deletedCount
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
