/**
 * BYOK (Bring Your Own Key) Provider Credential Resolver & Live Validators
 *
 * Resolves per-user encrypted credentials from `UserProviderConfig` for
 * Google Vertex/Gemini (`AIProvider.GOOGLE_VEO`) and Kling (`AIProvider.KLING`),
 * computes isolated dispatch bucket namespaces (`platform` vs `byok:<12-char-sha256>`),
 * and validates credentials live before saving.
 */

import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { GoogleAuth } from 'google-auth-library'
import { UserProviderConfig } from '@/models/UserProviderConfig'
import type { AIProvider } from '@/services/ai-providers/BaseAIProviderAdapter'
import { EncryptionService } from '@/services/EncryptionService'
import { getKlingApiBaseUrl } from '@/lib/kling/config'

export type CredentialSource = 'platform' | 'byok'
export type VertexCredentialMode = 'platform_sa' | 'byok_api_key' | 'byok_service_account'

export interface ResolvedVertexCredential {
  source: CredentialSource
  bucketNamespace: string // 'platform' or 'byok:<12-char-sha256>'
  mode: VertexCredentialMode
  apiKey?: string
  serviceAccountJson?: string
  projectId?: string
  recommendedConcurrency: number // 1 for BYOK (adaptive sequential), 6 for platform
}

export interface ResolvedKlingCredential {
  source: CredentialSource
  bucketNamespace: string
  apiKey?: string
  accessKey?: string
  secretKey?: string
  recommendedConcurrency: number
}

export interface GoogleServiceAccountPayload {
  project_id: string
  client_email: string
  private_key: string
  [key: string]: unknown
}

export interface ValidateGoogleByokResult {
  ok: boolean
  mode?: 'byok_api_key' | 'byok_service_account'
  projectId?: string
  clientEmail?: string
  error?: string
}

export interface ValidateKlingByokResult {
  ok: boolean
  mode?: 'api_key' | 'access_secret'
  error?: string
}

/**
 * Typed rate-limit error thrown when a user's BYOK credential hits HTTP 429 /
 * RESOURCE_EXHAUSTED so execution paths NEVER silently fall back to platform
 * credentials and bill the platform quota on a BYOK 429.
 */
export class ByokRateLimitError extends Error {
  readonly provider: 'vertex' | 'kling' | string
  readonly status: number
  readonly retryAfterMs?: number
  readonly bucketNamespace?: string
  readonly isByokRateLimit = true

  constructor(
    message: string,
    options: {
      provider?: 'vertex' | 'kling' | string
      status?: number
      retryAfterMs?: number
      bucketNamespace?: string
    } = {}
  ) {
    super(message)
    this.name = 'ByokRateLimitError'
    this.provider = options.provider ?? 'vertex'
    this.status = options.status ?? 429
    this.retryAfterMs = options.retryAfterMs
    this.bucketNamespace = options.bucketNamespace
  }
}

export const PLATFORM_DEFAULT_CONCURRENCY = 6
export const BYOK_RECOMMENDED_CONCURRENCY = 1
const LIVE_VALIDATION_TIMEOUT_MS = 8_000

/**
 * Compute an isolated dispatch bucket namespace for a credential source.
 * Platform requests share `'platform'`; BYOK keys receive a stable
 * `'byok:<12-char-sha256>'` namespace so cooldowns, leases, and RPM counters
 * never bleed across users or into platform quota.
 */
export function computeCredentialBucketNamespace(
  source: CredentialSource,
  secretMaterial?: string
): string {
  if (source === 'platform') {
    return 'platform'
  }
  const normalized = (secretMaterial ?? '').trim()
  const hash = crypto
    .createHash('sha256')
    .update(normalized || 'byok-anonymous', 'utf8')
    .digest('hex')
    .slice(0, 12)
  return `byok:${hash}`
}

export function isLikelyGoogleApiKey(apiKey: string): boolean {
  return /^AIza[0-9A-Za-z_-]{20,}$/.test(apiKey.trim())
}

/**
 * Parse a Google Service Account JSON string or object, tolerating literal
 * newlines inside `private_key` (common when copy-pasted from env/editors).
 */
export function parseGoogleServiceAccountJson(
  raw: string | Record<string, unknown>
): GoogleServiceAccountPayload | null {
  let obj: Record<string, unknown>
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      const parsed = JSON.parse(trimmed)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
      obj = parsed as Record<string, unknown>
    } catch {
      try {
        const fixed = trimmed.replace(
          /("private_key"\s*:\s*")([\s\S]*?)("\s*,\s*"client_email")/,
          (_match, start: string, keyBody: string, end: string) =>
            `${start}${keyBody.replace(/\r?\n/g, '\\n')}${end}`
        )
        const parsed = JSON.parse(fixed)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
        obj = parsed as Record<string, unknown>
      } catch {
        return null
      }
    }
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    obj = raw
  } else {
    return null
  }

  const projectId = typeof obj.project_id === 'string' ? obj.project_id.trim() : ''
  const clientEmail = typeof obj.client_email === 'string' ? obj.client_email.trim() : ''
  const privateKey = typeof obj.private_key === 'string' ? obj.private_key.trim() : ''

  if (!projectId || !clientEmail || !privateKey) {
    return null
  }
  if (!clientEmail.includes('@') || !privateKey.includes('PRIVATE KEY')) {
    return null
  }

  return {
    ...obj,
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  }
}

function buildPlatformVertexCredential(): ResolvedVertexCredential {
  return {
    source: 'platform',
    bucketNamespace: 'platform',
    mode: 'platform_sa',
    projectId: process.env.VERTEX_PROJECT_ID?.trim() || process.env.GCP_PROJECT_ID?.trim() || undefined,
    recommendedConcurrency: PLATFORM_DEFAULT_CONCURRENCY,
  }
}

function buildPlatformKlingCredential(): ResolvedKlingCredential {
  return {
    source: 'platform',
    bucketNamespace: 'platform',
    recommendedConcurrency: PLATFORM_DEFAULT_CONCURRENCY,
  }
}

/**
 * Resolve Google Vertex / Gemini credentials for a user.
 * Returns the user's validated BYOK credential when configured and `preferByok !== false`;
 * otherwise returns the platform service-account descriptor.
 *
 * DB lookup or decryption errors gracefully fall back to platform credentials here
 * (config resolution only — never on 429 during execution).
 */
export async function resolveVertexCredentialForUser(
  userId?: string | null,
  opts?: { preferByok?: boolean }
): Promise<ResolvedVertexCredential> {
  if (!userId || opts?.preferByok === false) {
    return buildPlatformVertexCredential()
  }

  try {
    const config = await UserProviderConfig.findOne({
      where: {
        user_id: userId,
        provider_name: 'GOOGLE_VEO' as AIProvider,
        is_valid: true,
      },
    })

    if (!config?.encrypted_credentials) {
      return buildPlatformVertexCredential()
    }

    const decryptedRaw = EncryptionService.decrypt(config.encrypted_credentials)
    const parsed = JSON.parse(decryptedRaw) as Record<string, unknown>

    // 1. Service account JSON (nested under serviceAccountJson or stored at top level)
    const saCandidate =
      parsed.serviceAccountJson !== undefined
        ? (parsed.serviceAccountJson as string | Record<string, unknown>)
        : parsed.project_id && parsed.private_key && parsed.client_email
          ? parsed
          : undefined

    if (saCandidate !== undefined) {
      const saObj = parseGoogleServiceAccountJson(saCandidate)
      if (saObj) {
        const serializedSa =
          typeof parsed.serviceAccountJson === 'string'
            ? parsed.serviceAccountJson.trim()
            : JSON.stringify(saObj)
        const projectId =
          (typeof parsed.projectId === 'string' && parsed.projectId.trim()) || saObj.project_id
        return {
          source: 'byok',
          bucketNamespace: computeCredentialBucketNamespace(
            'byok',
            `${saObj.project_id}:${saObj.client_email}:${saObj.private_key}`
          ),
          mode: 'byok_service_account',
          serviceAccountJson: serializedSa,
          projectId,
          recommendedConcurrency: BYOK_RECOMMENDED_CONCURRENCY,
        }
      }
    }

    // 2. Gemini / Google API Key (AIza...)
    if (typeof parsed.apiKey === 'string' && parsed.apiKey.trim()) {
      const apiKey = parsed.apiKey.trim()
      return {
        source: 'byok',
        bucketNamespace: computeCredentialBucketNamespace('byok', apiKey),
        mode: 'byok_api_key',
        apiKey,
        recommendedConcurrency: BYOK_RECOMMENDED_CONCURRENCY,
      }
    }

    return buildPlatformVertexCredential()
  } catch (error) {
    console.warn('[BYOK] Failed to resolve Vertex credential for user; falling back to platform:', error)
    return buildPlatformVertexCredential()
  }
}

/**
 * Resolve Kling AI credentials for a user.
 * Supports either gateway `apiKey` or official `accessKey` + `secretKey`.
 */
export async function resolveKlingCredentialForUser(
  userId?: string | null,
  opts?: { preferByok?: boolean }
): Promise<ResolvedKlingCredential> {
  if (!userId || opts?.preferByok === false) {
    return buildPlatformKlingCredential()
  }

  try {
    const config = await UserProviderConfig.findOne({
      where: {
        user_id: userId,
        provider_name: 'KLING' as AIProvider,
        is_valid: true,
      },
    })

    if (!config?.encrypted_credentials) {
      return buildPlatformKlingCredential()
    }

    const decryptedRaw = EncryptionService.decrypt(config.encrypted_credentials)
    const parsed = JSON.parse(decryptedRaw) as Record<string, unknown>

    const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : ''
    const accessKey = typeof parsed.accessKey === 'string' ? parsed.accessKey.trim() : ''
    const secretKey = typeof parsed.secretKey === 'string' ? parsed.secretKey.trim() : ''

    if (accessKey && secretKey) {
      return {
        source: 'byok',
        bucketNamespace: computeCredentialBucketNamespace('byok', `${accessKey}:${secretKey}`),
        accessKey,
        secretKey,
        ...(apiKey ? { apiKey } : {}),
        recommendedConcurrency: BYOK_RECOMMENDED_CONCURRENCY,
      }
    }

    if (apiKey) {
      return {
        source: 'byok',
        bucketNamespace: computeCredentialBucketNamespace('byok', apiKey),
        apiKey,
        recommendedConcurrency: BYOK_RECOMMENDED_CONCURRENCY,
      }
    }

    return buildPlatformKlingCredential()
  } catch (error) {
    console.warn('[BYOK] Failed to resolve Kling credential for user; falling back to platform:', error)
    return buildPlatformKlingCredential()
  }
}

function shouldSkipLiveValidation(): boolean {
  return process.env.BYOK_SKIP_LIVE_VALIDATION === 'true'
}

/**
 * Live-validate a Google BYOK credential (either a Gemini API key `AIza...`
 * or a Google Cloud Vertex AI Service Account JSON).
 */
export async function validateGoogleByokCredential(input: {
  apiKey?: string
  serviceAccountJson?: string | Record<string, unknown>
}): Promise<ValidateGoogleByokResult> {
  const hasServiceAccount =
    input.serviceAccountJson !== undefined &&
    input.serviceAccountJson !== null &&
    (typeof input.serviceAccountJson !== 'string' || input.serviceAccountJson.trim().length > 0)

  if (hasServiceAccount) {
    const parsed = parseGoogleServiceAccountJson(input.serviceAccountJson!)
    if (!parsed) {
      return {
        ok: false,
        error:
          'Invalid Google Service Account JSON. Ensure it is valid JSON containing project_id, client_email, and private_key.',
      }
    }

    if (shouldSkipLiveValidation()) {
      return {
        ok: true,
        mode: 'byok_service_account',
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
      }
    }

    try {
      const auth = new GoogleAuth({
        credentials: parsed,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })
      const client = await auth.getClient()
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        const tokenResponse = await Promise.race([
          client.getAccessToken(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`Google OAuth token exchange timed out after ${LIVE_VALIDATION_TIMEOUT_MS}ms`)),
              LIVE_VALIDATION_TIMEOUT_MS
            )
          }),
        ])
        if (!tokenResponse?.token) {
          return {
            ok: false,
            error: 'Google rejected the service account credentials (no OAuth access token returned).',
          }
        }
      } finally {
        if (timer) clearTimeout(timer)
      }

      return {
        ok: true,
        mode: 'byok_service_account',
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
      }
    } catch (error: any) {
      const message = error?.message || String(error)
      return {
        ok: false,
        error: `Service account OAuth validation failed: ${message}`,
      }
    }
  }

  const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : ''
  if (!apiKey) {
    return {
      ok: false,
      error: 'Either a Google API key (AIza...) or a Vertex AI Service Account JSON is required.',
    }
  }

  if (!isLikelyGoogleApiKey(apiKey)) {
    return {
      ok: false,
      error: 'Invalid Google API key format. Expected a key starting with "AIza".',
    }
  }

  if (shouldSkipLiveValidation()) {
    return {
      ok: true,
      mode: 'byok_api_key',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LIVE_VALIDATION_TIMEOUT_MS)

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(
      apiKey
    )}`
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    })

    if (response.status === 200) {
      return {
        ok: true,
        mode: 'byok_api_key',
      }
    }

    let detail = ''
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      detail = body?.error?.message || ''
    } catch {
      detail = await response.text().catch(() => '')
    }

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error: `Google rejected the API key (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : '.'}`,
      }
    }

    return {
      ok: false,
      error: `Google API key validation failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : '.'}`,
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        error: `Google API key validation timed out after ${LIVE_VALIDATION_TIMEOUT_MS}ms.`,
      }
    }
    return {
      ok: false,
      error: `Google API key validation failed: ${error?.message || String(error)}`,
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Validate a Kling BYOK credential (either gateway `apiKey` or official
 * `accessKey` + `secretKey`). Verifies key format, HS256 JWT signing when
 * using AccessKey+SecretKey, and performs a zero-credit auth check unless
 * `BYOK_SKIP_LIVE_VALIDATION=true`.
 */
export async function validateKlingByokCredential(input: {
  apiKey?: string
  accessKey?: string
  secretKey?: string
}): Promise<ValidateKlingByokResult> {
  const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : ''
  const accessKey = typeof input.accessKey === 'string' ? input.accessKey.trim() : ''
  const secretKey = typeof input.secretKey === 'string' ? input.secretKey.trim() : ''

  let bearerToken = ''
  let mode: 'api_key' | 'access_secret'

  if (accessKey || secretKey) {
    if (accessKey.length < 8 || secretKey.length < 8 || /\s/.test(accessKey) || /\s/.test(secretKey)) {
      return {
        ok: false,
        error: 'Both Kling Access Key and Secret Key must be at least 8 characters with no whitespace.',
      }
    }
    try {
      const now = Math.floor(Date.now() / 1000)
      const signed = jwt.sign(
        { iss: accessKey, exp: now + 300, nbf: now - 5 },
        secretKey,
        { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
      )
      jwt.verify(signed, secretKey, { algorithms: ['HS256'] })
      bearerToken = signed
      mode = 'access_secret'
    } catch (error: any) {
      return {
        ok: false,
        error: `Failed to sign Kling JWT with provided Access/Secret keys: ${error?.message || String(error)}`,
      }
    }
  } else if (apiKey) {
    if (apiKey.length < 8 || /\s/.test(apiKey)) {
      return {
        ok: false,
        error: 'Kling API key must be at least 8 characters with no whitespace.',
      }
    }
    bearerToken = apiKey
    mode = 'api_key'
  } else {
    return {
      ok: false,
      error: 'Kling API key (or Access Key + Secret Key) is required.',
    }
  }

  if (shouldSkipLiveValidation()) {
    return { ok: true, mode }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LIVE_VALIDATION_TIMEOUT_MS)

  try {
    const baseUrl = getKlingApiBaseUrl()
    const response = await fetch(`${baseUrl}/videos/text2video?pageNum=1&pageSize=1`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    if (response.status === 401 || response.status === 403) {
      const detail = await response.text().catch(() => '')
      return {
        ok: false,
        error: `Kling rejected the credentials (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : '.'}`,
      }
    }

    if (response.ok) {
      try {
        const payload = (await response.json()) as { code?: number; message?: string }
        // Kling API auth error codes: 1000-1004
        if (
          typeof payload?.code === 'number' &&
          payload.code >= 1000 &&
          payload.code <= 1004
        ) {
          return {
            ok: false,
            error: `Kling authentication failed (code ${payload.code}): ${payload.message || 'Invalid credentials'}`,
          }
        }
      } catch {
        // Non-JSON 200 response from a custom gateway — treat as authenticated
      }
      return { ok: true, mode }
    }

    // 404/405 can occur on third-party gateways that don't expose list endpoints;
    // since auth wasn't rejected (401/403), allow format-validated credentials.
    if (response.status === 404 || response.status === 405) {
      return { ok: true, mode }
    }

    const detail = await response.text().catch(() => '')
    return {
      ok: false,
      error: `Kling credential verification failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : '.'}`,
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        error: `Kling credential verification timed out after ${LIVE_VALIDATION_TIMEOUT_MS}ms.`,
      }
    }
    return {
      ok: false,
      error: `Unable to reach Kling API to verify credentials: ${error?.message || String(error)}`,
    }
  } finally {
    clearTimeout(timer)
  }
}
