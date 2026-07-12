/**
 * Trigger Cloud Run FFmpeg renderer for stitch-mode long-take jobs.
 */

import { uploadJobSpec } from '@/lib/gcs/renderStorage'
import type { StitchRenderJobSpec } from '@/lib/video/renderTypes'
import { setJobStatus } from '@/lib/render/jobStatusStore'

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID?.trim()
const GCP_REGION = process.env.GCP_REGION?.trim() || 'us-central1'
const CLOUD_RUN_JOB_NAME = process.env.CLOUD_RUN_JOB_NAME?.trim()
const GCS_RENDER_BUCKET =
  process.env.GCS_RENDER_BUCKET || process.env.SCENEFLOW_RENDER_BUCKET || 'sceneflow-render-jobs'

async function getAccessToken(): Promise<string> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured')
  }
  const credentials = JSON.parse(credentialsJson) as {
    client_email: string
    private_key: string
  }

  const crypto = await import('crypto')
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
  const jwt = `${signatureInput}.${signature}`

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
  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

export async function triggerStitchRenderJob(
  jobSpec: StitchRenderJobSpec
): Promise<{ jobSpecPath: string }> {
  setJobStatus(jobSpec.jobId, {
    status: 'QUEUED',
    progress: 0,
    createdAt: new Date().toISOString(),
  })

  const jobSpecPath = await uploadJobSpec(jobSpec as never)

  if (!GCP_PROJECT_ID || !CLOUD_RUN_JOB_NAME) {
    console.log('[KlingStitch] Skipping Cloud Run trigger (missing GCP config)')
    return { jobSpecPath }
  }

  const jobName = `projects/${GCP_PROJECT_ID}/locations/${GCP_REGION}/jobs/${CLOUD_RUN_JOB_NAME}`
  const apiUrl = `https://run.googleapis.com/v2/${jobName}:run`
  const accessToken = await getAccessToken()

  const requestBody = {
    overrides: {
      containerOverrides: [
        {
          env: [
            { name: 'JOB_ID', value: jobSpec.jobId },
            { name: 'JOB_SPEC_PATH', value: jobSpecPath },
            { name: 'GCS_BUCKET', value: GCS_RENDER_BUCKET },
            { name: 'RENDER_MODE', value: 'stitch' },
            { name: 'CALLBACK_URL', value: jobSpec.callbackUrl || '' },
          ],
        },
      ],
    },
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Cloud Run stitch trigger failed: ${response.status} - ${errorText}`)
  }

  setJobStatus(jobSpec.jobId, {
    status: 'PROCESSING',
    progress: 10,
    createdAt: new Date().toISOString(),
  })

  return { jobSpecPath }
}
