import { Storage } from '@google-cloud/storage'

let storageClient: Storage | null = null

/**
 * Get or create GCS storage client using service account credentials
 */
export function getStorageClient(): Storage {
  if (!storageClient) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured')
    }

    try {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      
      storageClient = new Storage({
        credentials,
        projectId: credentials.project_id
      })
      
      console.log('[GCS] Storage client initialized')
    } catch (error: any) {
      console.error('[GCS] Failed to initialize storage client:', error)
      throw new Error(`GCS initialization failed: ${error.message}`)
    }
  }

  return storageClient
}

/**
 * Sanitize character name for use as filename
 */
function sanitizeFilename(characterName: string): string {
  return characterName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Upload character reference image to Google Cloud Storage
 * @param imageBuffer - Image data as Buffer
 * @param characterName - Name of character for filename
 * @returns GCS URL in format: gs://bucket-name/characters/character-name-timestamp.jpg
 */
export async function uploadImageToGCS(
  imageBuffer: Buffer,
  characterName: string
): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME

  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable not configured')
  }

  try {
    const storage = getStorageClient()
    const bucket = storage.bucket(bucketName)
    
    // Generate filename with timestamp
    const sanitizedName = sanitizeFilename(characterName)
    const timestamp = Date.now()
    const filename = `characters/${sanitizedName}-${timestamp}.jpg`
    
    const file = bucket.file(filename)
    
    console.log(`[GCS] Uploading image for ${characterName} to gs://${bucketName}/${filename}`)
    
    // Upload the image
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          characterName,
          uploadedAt: new Date().toISOString()
        }
      },
      resumable: false // For smaller files, non-resumable is faster
    })
    
    // Note: Public access is configured at bucket level (uniform bucket-level access)
    // Individual file.makePublic() is not needed and would cause an error
    
    const gsUrl = `gs://${bucketName}/${filename}`
    
    console.log(`[GCS] Successfully uploaded to ${gsUrl}`)
    
    return gsUrl
  } catch (error: any) {
    console.error('[GCS] Upload failed:', error)
    throw new Error(`Failed to upload image to GCS: ${error.message}`)
  }
}

/**
 * Delete character reference image from Google Cloud Storage
 * @param gsUrl - GCS URL in format: gs://bucket-name/path/to/file.jpg
 */
export async function deleteImageFromGCS(gsUrl: string): Promise<void> {
  try {
    // Parse GCS URL
    const match = gsUrl.match(/^gs:\/\/([^\/]+)\/(.+)$/)
    if (!match) {
      throw new Error(`Invalid GCS URL format: ${gsUrl}`)
    }

    const [, bucketName, filePath] = match

    const storage = getStorageClient()
    const bucket = storage.bucket(bucketName)
    const file = bucket.file(filePath)

    console.log(`[GCS] Deleting ${gsUrl}`)

    await file.delete()

    console.log(`[GCS] Successfully deleted ${gsUrl}`)
  } catch (error: any) {
    // Don't throw on 404 - file might already be deleted
    if (error.code === 404) {
      console.warn(`[GCS] File not found (already deleted?): ${gsUrl}`)
      return
    }

    console.error('[GCS] Delete failed:', error)
    throw new Error(`Failed to delete image from GCS: ${error.message}`)
  }
}

