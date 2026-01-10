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

/**
 * Upload an image from an HTTP URL to GCS
 * Downloads the image and uploads to GCS, returning the gs:// URI
 * Required for Vertex AI Imagen which requires GCS URIs for reference images
 * @param httpUrl - HTTP/HTTPS URL of the image to upload
 * @param identifier - Unique identifier for the file (e.g., character name or reference ID)
 * @returns GCS URL in format: gs://bucket-name/reference-images/identifier-timestamp.jpg
 */
export async function uploadFromUrlToGCS(
  httpUrl: string,
  identifier: string
): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME

  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable not configured')
  }

  try {
    console.log(`[GCS] Downloading image from: ${httpUrl.substring(0, 60)}...`)
    
    // Download the image
    const response = await fetch(httpUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)
    
    console.log(`[GCS] Downloaded ${imageBuffer.length} bytes`)
    
    // Determine content type from response or default to JPEG
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const extension = contentType.includes('png') ? 'png' : 'jpg'
    
    // Generate unique filename
    const storage = getStorageClient()
    const bucket = storage.bucket(bucketName)
    const sanitizedId = identifier.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const timestamp = Date.now()
    const filename = `reference-images/${sanitizedId}-${timestamp}.${extension}`
    
    const file = bucket.file(filename)
    
    console.log(`[GCS] Uploading to gs://${bucketName}/${filename}`)
    
    // Upload the image
    await file.save(imageBuffer, {
      metadata: {
        contentType,
        metadata: {
          sourceUrl: httpUrl.substring(0, 200), // Truncate long URLs
          uploadedAt: new Date().toISOString()
        }
      },
      resumable: false
    })
    
    const gsUrl = `gs://${bucketName}/${filename}`
    console.log(`[GCS] Successfully uploaded to ${gsUrl}`)
    
    return gsUrl
  } catch (error: any) {
    console.error('[GCS] Upload from URL failed:', error)
    throw new Error(`Failed to upload image to GCS: ${error.message}`)
  }
}

/**
 * Download image from GCS and return as base64 encoded string
 * Required for Imagen subject customization which needs bytesBase64Encoded, not GCS URIs
 * @param gsUrl - GCS URL in format: gs://bucket-name/path/to/file.jpg
 * @returns Base64 encoded image data (without data URL prefix)
 */
export async function downloadImageAsBase64(gsUrl: string): Promise<string> {
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

    console.log(`[GCS] Downloading ${gsUrl} for base64 encoding`)

    // Download file contents
    const [contents] = await file.download()

    // Validate image data
    const fileSize = contents.length
    console.log(`[GCS] Downloaded ${fileSize} bytes from ${gsUrl}`)
    
    // Check for valid JPEG/PNG header
    const isJpeg = contents[0] === 0xFF && contents[1] === 0xD8
    const isPng = contents[0] === 0x89 && contents[1] === 0x50 && contents[2] === 0x4E && contents[3] === 0x47
    console.log(`[GCS] Image format detection: JPEG=${isJpeg}, PNG=${isPng}`)
    
    if (!isJpeg && !isPng) {
      console.warn(`[GCS] WARNING: Image does not have valid JPEG/PNG header. First 4 bytes: ${contents.slice(0, 4).toString('hex')}`)
    }

    // Convert to base64
    const base64Data = contents.toString('base64')
    
    // Validate base64 encoding
    const base64Length = base64Data.length
    const expectedBase64Length = Math.ceil(fileSize / 3) * 4
    console.log(`[GCS] Base64 encoding: ${base64Length} chars (expected ~${expectedBase64Length})`)
    
    // Verify base64 is valid by checking first/last chars and no invalid characters
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    const isValidBase64 = base64Regex.test(base64Data)
    console.log(`[GCS] Base64 validation: ${isValidBase64 ? 'VALID' : 'INVALID'}`)
    
    if (!isValidBase64) {
      console.error(`[GCS] ERROR: Invalid base64 encoding detected!`)
    }
    
    console.log(`[GCS] Successfully downloaded and encoded ${gsUrl} (${base64Data.length} chars)`)

    return base64Data
  } catch (error: any) {
    console.error('[GCS] Download failed:', error)
    throw new Error(`Failed to download image from GCS: ${error.message}`)
  }
}

