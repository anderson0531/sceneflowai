/**
 * Phase 2 C2PA signing — async enqueue via internal API (Workflow/Sandbox ready).
 */

export interface C2paSigningJob {
  provenanceId: string
  assetUrl: string
  contentHash: string
}

/**
 * Enqueue in-file C2PA manifest embedding after Phase 1 provenance upload.
 * Uses fire-and-forget internal HTTP when C2PA_SIGNING_ENABLED=true.
 */
export async function enqueueC2paSigning(job: C2paSigningJob): Promise<void> {
  const baseUrl =
    process.env.C2PA_WORKFLOW_BASE_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'

  const secret = process.env.C2PA_INTERNAL_SECRET || process.env.ASSET_PROVENANCE_SECRET
  if (!secret) {
    console.warn('[C2PA Workflow] No C2PA_INTERNAL_SECRET — skipping enqueue')
    return
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/internal/provenance/c2pa-sign`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(job),
  }).catch((err) => {
    console.warn('[C2PA Workflow] Enqueue fetch failed:', err)
    return null
  })

  if (response && !response.ok) {
    const text = await response.text().catch(() => '')
    console.warn(`[C2PA Workflow] Enqueue rejected ${response.status}: ${text}`)
  }
}
