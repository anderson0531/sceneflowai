import http from 'http'
import { Storage } from '@google-cloud/storage'
import fetch from 'cross-fetch'
import pino from 'pino'

const logger = pino()

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080
const WORKER_TOKEN = process.env.EXPORT_WORKER_TOKEN
const API_BASE = process.env.EXPORT_API_BASE
const OUTPUT_BUCKET = process.env.EXPORT_OUTPUT_BUCKET
const GOOGLE_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

if (!WORKER_TOKEN) {
  logger.warn('EXPORT_WORKER_TOKEN not set. API calls will fail.')
}
if (!API_BASE) {
  logger.warn('EXPORT_API_BASE not set. Worker cannot report job status.')
}
if (!OUTPUT_BUCKET) {
  logger.warn('EXPORT_OUTPUT_BUCKET not set. Worker cannot write outputs.')
}

let storageClient: Storage | null = null
function getStorage(): Storage {
  if (!GOOGLE_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured')
  }
  if (!storageClient) {
    const credentials = JSON.parse(GOOGLE_CREDENTIALS)
    storageClient = new Storage({ projectId: credentials.project_id, credentials })
  }
  return storageClient
}

async function markProgress(jobId: string, body: any) {
  if (!API_BASE || !WORKER_TOKEN) return
  const url = `${API_BASE}/api/export/jobs/${jobId}/progress`
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-export-worker-token': WORKER_TOKEN,
    },
    body: JSON.stringify(body),
  })
}

async function markComplete(jobId: string, body: any) {
  if (!API_BASE || !WORKER_TOKEN) return
  const url = `${API_BASE}/api/export/jobs/${jobId}/complete`
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-export-worker-token': WORKER_TOKEN,
    },
    body: JSON.stringify(body),
  })
}

async function markFailed(jobId: string, errorMessage: string) {
  if (!API_BASE || !WORKER_TOKEN) return
  const url = `${API_BASE}/api/export/jobs/${jobId}/fail`
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-export-worker-token': WORKER_TOKEN,
    },
    body: JSON.stringify({ errorMessage }),
  })
}

async function handleExport(job: any) {
  const jobId = job.jobId
  if (!jobId) {
    logger.error({ job }, 'Received job without jobId')
    return
  }

  try {
    await markProgress(jobId, { status: 'running', progress: 0 })

    if (!OUTPUT_BUCKET) {
      throw new Error('OUTPUT bucket not configured')
    }

    const storage = getStorage()
    const bucket = storage.bucket(OUTPUT_BUCKET)
    const objectPath = `exports/${jobId}-${Date.now()}.json`
    const file = bucket.file(objectPath)

    await file.save(Buffer.from(JSON.stringify(job.payload ?? {}), 'utf-8'), {
      contentType: 'application/json',
      metadata: { jobId },
      resumable: false,
    })

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    })

    await markComplete(jobId, {
      resultUrl: signedUrl,
      metadata: { outputObject: objectPath },
    })
    logger.info({ jobId, objectPath }, 'Export job completed (placeholder output)')
  } catch (error: any) {
    logger.error({ err: error, jobId }, 'Export job failed')
    await markFailed(jobId, error?.message || 'Export worker error')
  }
}

function parsePubSubMessage(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
        const message = body.message
        if (!message || !message.data) {
          return resolve(null)
        }
        const decoded = Buffer.from(message.data, 'base64').toString('utf-8')
        resolve(JSON.parse(decoded))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', (error) => reject(error))
  })
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 404
    return res.end()
  }

  try {
    const jobPayload = await parsePubSubMessage(req)
    if (!jobPayload) {
      logger.warn('Received Pub/Sub message without payload')
      res.statusCode = 204
      return res.end()
    }

    await handleExport(jobPayload)
    res.statusCode = 204
    res.end()
  } catch (error) {
    logger.error({ err: error }, 'Failed to process Pub/Sub message')
    res.statusCode = 500
    res.end()
  }
})

server.listen(PORT, () => {
  logger.info(`Export worker listening on port ${PORT}`)
})
