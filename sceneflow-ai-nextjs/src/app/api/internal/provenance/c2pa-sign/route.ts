/**
 * Internal endpoint for Phase 2 C2PA manifest embedding (Sandbox/Workflow worker).
 *
 * When @contentauth/c2pa-node is available in the deployment environment,
 * downloads the asset, embeds a C2PA manifest, replaces the GCS object, and
 * updates AssetProvenanceLog.c2pa_status.
 */

import { NextRequest, NextResponse } from 'next/server'
import AssetProvenanceLog from '@/models/AssetProvenanceLog'
import { downloadGcsAssetFromHttpsUrl, parseGcsHttpsUrl } from '@/lib/storage/gcsAssets'
import { Storage } from '@google-cloud/storage'

export const maxDuration = 300
export const runtime = 'nodejs'

function authorize(req: NextRequest): boolean {
  const secret = process.env.C2PA_INTERNAL_SECRET || process.env.ASSET_PROVENANCE_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

async function replaceGcsObject(assetUrl: string, buffer: Buffer, contentType: string): Promise<void> {
  const parsed = parseGcsHttpsUrl(assetUrl)
  if (!parsed) {
    throw new Error(`Cannot parse GCS URL for C2PA replace: ${assetUrl}`)
  }

  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured')
  }

  const credentials = JSON.parse(credentialsJson)
  const storage = new Storage({ credentials, projectId: credentials.project_id })
  const file = storage.bucket(parsed.bucketName).file(parsed.filePath)

  await file.save(buffer, {
    contentType,
    metadata: {
      c2paEmbeddedAt: new Date().toISOString(),
    },
    resumable: buffer.length > 5 * 1024 * 1024,
  })
}

/**
 * Attempt in-file C2PA embed. Returns stamped buffer or null if library unavailable.
 */
async function tryEmbedC2paManifest(
  buffer: Buffer,
  metadata: Record<string, string>
): Promise<Buffer | null> {
  try {
    // Dynamic import — optional dependency for Sandbox deployments
    const c2pa = await import('@contentauth/c2pa-node').catch(() => null)
    if (!c2pa?.Builder || !c2pa?.createC2paFromBuffer) {
      console.warn('[C2PA] @contentauth/c2pa-node not installed — skipping embed')
      return null
    }

    const manifestStore = c2pa.createC2paFromBuffer(buffer)
    const builder = c2pa.Builder.new()

    builder.addAssertion('c2pa.actions', {
      actions: [
        {
          action: 'c2pa.created',
          softwareAgent: 'SceneFlow AI',
          digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
        },
      ],
    })

    builder.addAssertion('c2pa.metadata', metadata)

    const signed = builder.sign(manifestStore)
    return signed ?? null
  } catch (err) {
    console.warn('[C2PA] Embed failed:', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { provenanceId?: string; assetUrl?: string; contentHash?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { provenanceId, assetUrl, contentHash } = body
  if (!provenanceId || !assetUrl || !contentHash) {
    return NextResponse.json(
      { error: 'Missing provenanceId, assetUrl, or contentHash' },
      { status: 400 }
    )
  }

  try {
    const record = await AssetProvenanceLog.findByPk(provenanceId)
    if (!record) {
      return NextResponse.json({ error: 'Provenance record not found' }, { status: 404 })
    }

    if (record.content_hash !== contentHash) {
      return NextResponse.json({ error: 'Content hash mismatch' }, { status: 409 })
    }

    const { buffer, contentType } = await downloadGcsAssetFromHttpsUrl(assetUrl)

    const stamped = await tryEmbedC2paManifest(buffer, {
      'sceneflow.provenanceId': provenanceId,
      'sceneflow.contentHash': contentHash,
      'sceneflow.generativeModel': record.generative_model,
    })

    if (!stamped) {
      await record.update({ c2pa_status: 'skipped' })
      return NextResponse.json({
        success: true,
        c2paStatus: 'skipped',
        message: 'C2PA library unavailable; Phase 1 sidecar provenance remains authoritative',
      })
    }

    await replaceGcsObject(assetUrl, stamped, contentType)
    await record.update({
      c2pa_status: 'complete',
      c2pa_manifest_url: assetUrl,
    })

    return NextResponse.json({ success: true, c2paStatus: 'complete' })
  } catch (err) {
    console.error('[C2PA Sign] Error:', err)
    await AssetProvenanceLog.update(
      { c2pa_status: 'failed' },
      { where: { id: provenanceId } }
    ).catch(() => undefined)

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'C2PA signing failed',
      },
      { status: 500 }
    )
  }
}
