import { getStorageClient } from '@/lib/storage/gcs'

export type ExportStage = 'raw' | 'output'

function getBucketForStage(stage: ExportStage): string {
  if (stage === 'raw') {
    const bucket = process.env.EXPORT_INPUT_BUCKET
    if (!bucket) throw new Error('EXPORT_INPUT_BUCKET not configured')
    return bucket
  }

  const bucket = process.env.EXPORT_OUTPUT_BUCKET
  if (!bucket) throw new Error('EXPORT_OUTPUT_BUCKET not configured')
  return bucket
}

export interface SignedUpload {
  objectPath: string
  uploadUrl: string
  expiresAt: string
}

export interface SignedDownload {
  objectPath: string
  downloadUrl: string
  expiresAt: string
}

export async function createUploadSignedUrl(stage: ExportStage, filename: string, contentType: string, expiresInSeconds = 15 * 60): Promise<SignedUpload> {
  const bucketName = getBucketForStage(stage)
  const storage = getStorageClient()
  const objectPath = `${stage}/${Date.now()}-${filename}`
  const file = storage.bucket(bucketName).file(objectPath)

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiresInSeconds * 1000,
    contentType,
  })

  return {
    objectPath,
    uploadUrl: url,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  }
}

export async function createDownloadSignedUrl(stage: ExportStage, objectPath: string, expiresInSeconds = 60 * 60): Promise<SignedDownload> {
  const bucketName = getBucketForStage(stage)
  const storage = getStorageClient()
  const file = storage.bucket(bucketName).file(objectPath)

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInSeconds * 1000,
  })

  return {
    objectPath,
    downloadUrl: url,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  }
}
