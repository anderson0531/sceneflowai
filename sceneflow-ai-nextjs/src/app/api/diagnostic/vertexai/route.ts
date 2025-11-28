import { NextRequest, NextResponse } from 'next/server'
import { getVertexAIAuthToken } from '@/lib/vertexai/client'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  try {
    const projectId = process.env.GCP_PROJECT_ID
    const region = process.env.GCP_REGION || 'us-central1'
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      : null

    if (!projectId) {
      return NextResponse.json({ ok: false, step: 'env', error: 'Missing GCP_PROJECT_ID' }, { status: 400 })
    }
    if (!creds?.client_email) {
      return NextResponse.json({ ok: false, step: 'env', error: 'Missing GOOGLE_APPLICATION_CREDENTIALS_JSON or client_email' }, { status: 400 })
    }

    const token = await getVertexAIAuthToken()

    // Check model GET permission (less privileged than predict)
    const modelName = 'imagen-3.0-generate-002'
    const modelUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${modelName}`
    const getRes = await fetch(modelUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })

    // Try a tiny dry-run predict with no payload to observe permission (will fail 400 if perm ok)
    const predictUrl = `${modelUrl}:predict`
    const permRes = await fetch(predictUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [{ prompt: 'test' }], parameters: { sampleCount: 1, aspectRatio: '1:1' } })
    })

    const result = {
      ok: true,
      projectId,
      region,
      serviceAccount: creds.client_email,
      modelGet: { status: getRes.status, ok: getRes.ok },
      predictProbe: { status: permRes.status, ok: permRes.ok },
      hints: [] as string[]
    }

    if (getRes.status === 403) {
      result.hints.push('Grant roles/aiplatform.user to the service account on the project')
    }
    if (permRes.status === 403) {
      result.hints.push('Permission aiplatform.endpoints.predict denied: grant roles/aiplatform.user')
    }

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
