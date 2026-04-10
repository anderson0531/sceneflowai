import { Storage } from '@google-cloud/storage'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import RenderJob from '@/models/RenderJob'
import { getJobStatusAsync, setJobStatus, type JobStatus } from '@/lib/render/jobStatusStore'
import { getRenderBucket } from '@/lib/gcs/renderStorage'

export interface StemSeparationJobRequest {
  projectId: string
  sceneId: string
  segmentId: string
  sourceAudioUrl: string
  sourceHash?: string
  takeId?: string
  userId?: string
  model?: string
  options?: Record<string, unknown>
}

export interface StemSeparationJobSpec extends StemSeparationJobRequest {
  jobId: string
  provider: 'demucs'
  createdAt: string
  callbackUrl: string
  outputPrefix: string
}

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || ''
const GCP_REGION = process.env.GCP_REGION || 'us-central1'
const STEM_CLOUD_RUN_JOB_NAME = process.env.CLOUD_RUN_STEM_JOB_NAME || 'sceneflow-demucs-stems'
const CALLBACK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio'

function getStorageClient(): Storage {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (credentialsJson) {
    const credentials = JSON.parse(credentialsJson)
    return new Storage({
      projectId: credentials.project_id,
      credentials,
    })
  }
  return new Storage()
}

async function createJWT(credentials: { client_email: string; private_key: string }): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  }

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${base64Header}.${base64Payload}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(credentials.private_key, 'base64url')
  return `${signatureInput}.${signature}`
}

async function getAccessToken(): Promise<string> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (credentialsJson) {
    const credentials = JSON.parse(credentialsJson)
    const jwt = await createJWT(credentials)
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })
    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`)
    }
    const data = await response.json()
    return data.access_token
  }

  const response = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  )
  if (!response.ok) {
    throw new Error('No valid credentials found for Cloud Run API')
  }
  const data = await response.json()
  return data.access_token
}

export function computeSourceHash(sourceAudioUrl: string): string {
  return crypto.createHash('sha256').update(sourceAudioUrl.trim().toLowerCase()).digest('hex')
}

async function triggerCloudRunStemJob(jobId: string, jobSpecPath: string): Promise<void> {
  if (!GCP_PROJECT_ID || !STEM_CLOUD_RUN_JOB_NAME) {
    throw new Error('Cloud Run stem job environment is not configured')
  }

  const jobName = `projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/jobs/${STEM_CLOUD_RUN_JOB_NAME}`
  const apiUrl = `https://run.googleapis.com/v2/${jobName}:run`
  const accessToken = await getAccessToken()
  const bucket = getRenderBucket()

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      overrides: {
        containerOverrides: [
          {
            env: [
              { name: 'JOB_ID', value: jobId },
              { name: 'JOB_SPEC_PATH', value: `${bucket}/${jobSpecPath}` },
              { name: 'GCS_BUCKET', value: bucket },
              { name: 'CALLBACK_URL', value: `${CALLBACK_BASE_URL}/api/audio/stems/callback` },
              { name: 'STEM_WORKER_MODE', value: 'demucs' },
            ],
          },
        ],
      },
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`Failed to trigger stem job (${response.status}) ${details}`.trim())
  }
}

async function createRenderJobRecord(jobId: string, request: StemSeparationJobRequest): Promise<void> {
  if (!request.userId) return
  try {
    await RenderJob.create({
      id: jobId,
      project_id: request.projectId,
      scene_id: request.sceneId,
      user_id: request.userId,
      status: 'QUEUED',
      progress: 0,
      resolution: '1080p',
      language: 'en',
      include_subtitles: false,
      render_type: 'scene_video',
      stream_type: 'video',
      estimated_duration: null,
      output_path: null,
      error: null,
    })
  } catch (error) {
    console.warn('[StemJobs] Failed to create RenderJob record (continuing with status store):', error)
  }
}

export async function enqueueStemSeparationJob(request: StemSeparationJobRequest): Promise<{
  jobId: string
  sourceHash: string
  status: 'pending' | 'processing'
  provider: 'demucs'
}> {
  const bucketName = getRenderBucket()
  const sourceHash = request.sourceHash || computeSourceHash(request.sourceAudioUrl)
  const jobId = uuidv4()
  const outputPrefix = `stems/${sourceHash}/`
  const jobSpecPath = `stem-job-specs/${jobId}.json`

  const spec: StemSeparationJobSpec = {
    ...request,
    sourceHash,
    jobId,
    provider: 'demucs',
    createdAt: new Date().toISOString(),
    callbackUrl: `${CALLBACK_BASE_URL}/api/audio/stems/callback`,
    outputPrefix,
  }

  const storage = getStorageClient()
  const bucket = storage.bucket(bucketName)
  await bucket.file(jobSpecPath).save(JSON.stringify(spec, null, 2), {
    contentType: 'application/json',
  })

  await createRenderJobRecord(jobId, request)
  setJobStatus(jobId, {
    status: 'QUEUED',
    progress: 0,
    createdAt: new Date().toISOString(),
  })

  await triggerCloudRunStemJob(jobId, jobSpecPath)
  setJobStatus(jobId, {
    status: 'PROCESSING',
    progress: 5,
    createdAt: new Date().toISOString(),
  })

  return {
    jobId,
    sourceHash,
    status: 'processing',
    provider: 'demucs',
  }
}

export async function getStemJobStatus(jobId: string): Promise<JobStatus | undefined> {
  return getJobStatusAsync(jobId)
}
