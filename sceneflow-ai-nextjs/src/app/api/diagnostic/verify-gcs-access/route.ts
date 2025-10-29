import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { gcsUri } = await req.json()
    
    if (!gcsUri || !gcsUri.startsWith('gs://')) {
      return NextResponse.json({ error: 'Invalid GCS URI' }, { status: 400 })
    }
    
    // Initialize GCS client
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}')
    const storage = new Storage({
      credentials,
      projectId: credentials.project_id
    })
    
    // Parse GCS URI (gs://bucket/path/file.jpg)
    const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid GCS URI format' }, { status: 400 })
    }
    
    const [, bucketName, filePath] = match
    
    // Test 1: Check bucket accessibility
    const bucket = storage.bucket(bucketName)
    const [bucketExists] = await bucket.exists()
    
    // Test 2: Check file accessibility
    const file = bucket.file(filePath)
    const [fileExists] = await file.exists()
    
    // Test 3: Get file metadata
    let metadata: any = null
    if (fileExists) {
      [metadata] = await file.getMetadata()
    }
    
    // Test 4: Try to get signed URL (tests read permissions)
    let signedUrl: string | null = null
    if (fileExists) {
      try {
        [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 1000 // 1 minute
        })
      } catch (error: any) {
        return NextResponse.json({
          bucketAccessible: bucketExists,
          fileAccessible: fileExists,
          signedUrlError: error.message,
          permissionIssue: true
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      bucketAccessible: bucketExists,
      fileAccessible: fileExists,
      fileSize: metadata?.size,
      contentType: metadata?.contentType,
      signedUrlGenerated: !!signedUrl,
      projectId: credentials.project_id
    })
  } catch (error: any) {
    console.error('[GCS Diagnostic] Error:', error)
    return NextResponse.json({
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}
