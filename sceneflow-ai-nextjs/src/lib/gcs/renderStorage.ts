/**
 * GCS Render Storage Service
 * 
 * Handles uploading job specifications and downloading rendered outputs
 * from Google Cloud Storage for the FFmpeg video rendering pipeline.
 */

import { Storage } from '@google-cloud/storage'

// Environment configuration
const GCS_BUCKET = process.env.GCS_RENDER_BUCKET || process.env.SCENEFLOW_RENDER_BUCKET || 'sceneflow-render-jobs'

// Initialize GCS client with service account credentials
let storageClient: Storage | null = null

function getStorageClient(): Storage {
  if (!storageClient) {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    
    if (!credentialsJson) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured for GCS access')
    }
    
    try {
      const credentials = JSON.parse(credentialsJson)
      
      storageClient = new Storage({
        credentials,
        projectId: credentials.project_id,
      })
      
      console.log('[RenderStorage] GCS client initialized with service account')
    } catch (error) {
      console.error('[RenderStorage] Failed to parse credentials:', error)
      throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format')
    }
  }
  return storageClient
}

export interface RenderJobSpec {
  jobId: string
  projectId: string
  projectTitle: string
  resolution: '720p' | '1080p' | '4K'
  fps: number
  segments: Array<{
    segmentId: string
    imageUrl: string
    startTime: number
    duration: number
    kenBurns?: {
      zoomStart: number
      zoomEnd: number
      panX: number
      panY: number
    }
  }>
  audioClips: Array<{
    url: string
    startTime: number
    duration: number
    volume?: number
    type?: 'narration' | 'dialogue' | 'music' | 'sfx'
  }>
  outputPath: string
  callbackUrl?: string
  createdAt: string
  language?: string
}

/**
 * Upload a job specification JSON to GCS.
 * 
 * @param jobSpec - The render job specification
 * @returns GCS URI (gs://bucket/path)
 */
export async function uploadJobSpec(jobSpec: RenderJobSpec): Promise<string> {
  const storage = getStorageClient()
  const bucket = storage.bucket(GCS_BUCKET)
  
  const blobPath = `job-specs/${jobSpec.jobId}.json`
  const blob = bucket.file(blobPath)
  
  const jsonContent = JSON.stringify(jobSpec, null, 2)
  
  await blob.save(jsonContent, {
    contentType: 'application/json',
    metadata: {
      projectId: jobSpec.projectId,
      resolution: jobSpec.resolution,
      createdAt: jobSpec.createdAt,
    },
  })
  
  console.log(`[RenderStorage] Uploaded job spec: gs://${GCS_BUCKET}/${blobPath}`)
  
  return `gs://${GCS_BUCKET}/${blobPath}`
}

/**
 * Generate the output path for a rendered video.
 * 
 * @param jobId - The render job ID
 * @returns GCS URI for the output video
 */
export function getOutputPath(jobId: string): string {
  return `gs://${GCS_BUCKET}/outputs/${jobId}.mp4`
}

/**
 * Generate a signed URL for downloading the rendered video.
 * 
 * @param jobId - The render job ID
 * @param expirationMinutes - How long the URL should be valid (default: 7 days)
 * @returns Signed download URL
 */
export async function getSignedDownloadUrl(
  jobId: string,
  expirationMinutes: number = 10080 // 7 days
): Promise<string | null> {
  try {
    const storage = getStorageClient()
    const bucket = storage.bucket(GCS_BUCKET)
    const blob = bucket.file(`outputs/${jobId}.mp4`)
    
    // Check if file exists
    const [exists] = await blob.exists()
    if (!exists) {
      console.log(`[RenderStorage] Output file not found for job: ${jobId}`)
      return null
    }
    
    // Generate signed URL
    const [signedUrl] = await blob.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expirationMinutes * 60 * 1000,
    })
    
    return signedUrl
    
  } catch (error) {
    console.error(`[RenderStorage] Failed to get signed URL for job ${jobId}:`, error)
    return null
  }
}

/**
 * Check if a rendered video exists.
 * 
 * @param jobId - The render job ID
 * @returns True if the output file exists
 */
export async function outputExists(jobId: string): Promise<boolean> {
  try {
    const storage = getStorageClient()
    const bucket = storage.bucket(GCS_BUCKET)
    const blob = bucket.file(`outputs/${jobId}.mp4`)
    
    const [exists] = await blob.exists()
    return exists
    
  } catch (error) {
    console.error(`[RenderStorage] Failed to check output existence:`, error)
    return false
  }
}

/**
 * Delete job spec and output files for a job.
 * 
 * @param jobId - The render job ID
 */
export async function deleteJobFiles(jobId: string): Promise<void> {
  try {
    const storage = getStorageClient()
    const bucket = storage.bucket(GCS_BUCKET)
    
    // Delete job spec
    await bucket.file(`job-specs/${jobId}.json`).delete({ ignoreNotFound: true })
    
    // Delete output
    await bucket.file(`outputs/${jobId}.mp4`).delete({ ignoreNotFound: true })
    
    console.log(`[RenderStorage] Deleted files for job: ${jobId}`)
    
  } catch (error) {
    console.error(`[RenderStorage] Failed to delete job files:`, error)
  }
}

/**
 * Get the GCS bucket name for render jobs.
 */
export function getRenderBucket(): string {
  return GCS_BUCKET
}
