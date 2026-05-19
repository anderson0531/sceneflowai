/**
 * Opt-in logging for Vertex Veo predictLongRunning requests.
 *
 * Set `VEO_DIAGNOSTIC_LOG=1` or `SCENEFLOW_VEO_DUMP_REQUEST=true` on the server
 * (e.g. Vercel env) to log the exact prompt and a JSON body with base64 fields redacted.
 */

import { createHash } from 'crypto'

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

export function isVeoDiagnosticLogEnabled(): boolean {
  const a = process.env.VEO_DIAGNOSTIC_LOG
  const b = process.env.SCENEFLOW_VEO_DUMP_REQUEST
  if (a && TRUTHY.has(a.toLowerCase())) return true
  if (b && TRUTHY.has(b.toLowerCase())) return true
  return false
}

function sha256PrefixFromBase64(b64: string): string {
  try {
    const buf = Buffer.from(b64, 'base64')
    if (!buf.length) return 'empty'
    return createHash('sha256').update(buf).digest('hex').slice(0, 16)
  } catch {
    return 'invalid-b64'
  }
}

/** Deep clone via JSON and replace every bytesBase64Encoded with length + hash (never log raw pixels). */
export function redactVeoPredictLongRunningBody(body: unknown): unknown {
  try {
    const clone = JSON.parse(JSON.stringify(body)) as unknown
    const walk = (o: unknown): void => {
      if (o == null || typeof o !== 'object') return
      if (Array.isArray(o)) {
        for (const x of o) walk(x)
        return
      }
      const rec = o as Record<string, unknown>
      const b64 = rec.bytesBase64Encoded
      if (typeof b64 === 'string') {
        rec.bytesBase64Encoded = `<redacted len=${b64.length} sha256=${sha256PrefixFromBase64(b64)}>`
      }
      for (const k of Object.keys(rec)) {
        if (k === 'bytesBase64Encoded') continue
        walk(rec[k])
      }
    }
    walk(clone)
    return clone
  } catch {
    return { _redactError: 'could not serialize body for logging' }
  }
}

/**
 * Cheap lexical hints only — Vertex does not publish mappings; this narrows A/B tests for false positives.
 */
export function summarizePromptForPolicyHeuristics(prompt: string): string[] {
  const hits: string[] = []
  const note = (msg: string) => {
    if (!hits.includes(msg)) hits.push(msg)
  }
  if (/\bpeace\b/i.test(prompt)) {
    note(
      'contains "peace" — sometimes grouped with civic/news commentary filters; try synonyms or neutral phrasing if blocked'
    )
  }
  if (/\b(terror|terrorism|extremist)\b/i.test(prompt)) {
    note('contains terrorism-adjacent terms')
  }
  if (/\b(shoot|shooting|gunfire|weapon|bomb|explosive)\b/i.test(prompt)) {
    note('contains violence / weapons vocabulary')
  }
  if (/\b(nude|naked|explicit sex)\b/i.test(prompt)) {
    note('contains sexual explicitness hints')
  }
  if (/\b(child|minor|underage)\s+/i.test(prompt) || /\bteen\b/i.test(prompt)) {
    note('contains minor / age-related wording (personGeneration + imagery combo is sensitive)')
  }
  if (hits.length === 0) {
    note('no common keyword heuristics — if blocked, suspect composite scoring, images, or uncommon phrases')
  }
  return hits
}

export function logVeoPredictLongRunningSubmitDiagnostics(params: {
  endpoint: string
  model: string
  quality: string
  prompt: string
  requestBody: Record<string, unknown>
}): void {
  if (!isVeoDiagnosticLogEnabled()) return
  const { endpoint, model, quality, prompt, requestBody } = params
  console.log('[Veo Diagnostic] ========== predictLongRunning (submit) ==========')
  console.log('[Veo Diagnostic]', JSON.stringify({ endpoint, model, quality }, null, 2))
  console.log('[Veo Diagnostic] policy heuristics:', summarizePromptForPolicyHeuristics(prompt))
  console.log('[Veo Diagnostic] ----- full prompt (exact string in JSON body) -----')
  console.log(prompt)
  console.log('[Veo Diagnostic] ----- instances[0].parameters (images redacted) -----')
  console.log(JSON.stringify(redactVeoPredictLongRunningBody(requestBody), null, 2))
  console.log('[Veo Diagnostic] ========== end submit ==========')
}

export function logVeoFetchPredictOperationResponseDiagnostics(data: unknown): void {
  if (!isVeoDiagnosticLogEnabled()) return
  try {
    console.log('[Veo Diagnostic] ========== fetchPredictOperation response (full) ==========')
    console.log(JSON.stringify(data, null, 2))
    console.log('[Veo Diagnostic] ========== end fetchPredictOperation ==========')
  } catch {
    console.log('[Veo Diagnostic] fetchPredictOperation response: <unserializable>')
  }
}
