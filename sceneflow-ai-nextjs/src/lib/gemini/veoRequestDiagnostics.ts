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

/** Cheap lexical hints only — Vertex does not publish mappings; this narrows A/B tests for false positives. */
export function collectPolicyHeuristicHits(text: string): string[] {
  const hits: string[] = []
  const note = (msg: string) => {
    if (!hits.includes(msg)) hits.push(msg)
  }
  if (/\bpeace\b/i.test(text)) {
    note(
      'contains "peace" — sometimes grouped with civic/news commentary filters; try synonyms or neutral phrasing if blocked'
    )
  }
  if (/\bstuttering\b/i.test(text)) {
    note(
      'contains "stuttering" — disability-adjacent; same safety stack often scores parameters.negativePrompt and has correlated with false blocks'
    )
  }
  if (/\b(terror|terrorism|extremist)\b/i.test(text)) {
    note('contains terrorism-adjacent terms')
  }
  if (/\b(shoot|shooting|gunfire|weapon|bomb|explosive)\b/i.test(text)) {
    note('contains violence / weapons vocabulary')
  }
  if (/\b(nude|naked|explicit sex)\b/i.test(text)) {
    note('contains sexual explicitness hints')
  }
  if (/\b(child|minor|underage)\s+/i.test(text) || /\bteen\b/i.test(text)) {
    note('contains minor / age-related wording (personGeneration + imagery combo is sensitive)')
  }
  return hits
}

export function summarizePromptForPolicyHeuristics(prompt: string): string[] {
  const hits = collectPolicyHeuristicHits(prompt)
  if (hits.length === 0) {
    return [
      'no common keyword heuristics — if blocked, suspect composite scoring, images, negativePrompt text, or uncommon phrases',
    ]
  }
  return hits
}

/** Same heuristics as the main prompt; omit generic fallback when empty (caller supplies context). */
export function summarizeNegativePromptForPolicyHeuristics(negativePrompt: string): string[] | null {
  const t = negativePrompt.trim()
  if (!t) return null
  const hits = collectPolicyHeuristicHits(t)
  if (hits.length > 0) return hits
  return [
    'no heuristic-keyword hits in negativePrompt — long comma-separated lists can still add marginal filter surface area',
  ]
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
  console.log('[Veo Diagnostic] policy heuristics (prompt):', summarizePromptForPolicyHeuristics(prompt))
  const paramsObj = requestBody.parameters as Record<string, unknown> | undefined
  const neg = typeof paramsObj?.negativePrompt === 'string' ? paramsObj.negativePrompt : ''
  const negHints = summarizeNegativePromptForPolicyHeuristics(neg)
  if (negHints) {
    console.log('[Veo Diagnostic] negativePrompt length:', neg.length)
    console.log('[Veo Diagnostic] policy heuristics (negativePrompt):', negHints)
  }
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
