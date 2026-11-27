import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_RETRY_AFTER_CAP_MS,
  fetchWithRetry,
  parseRetryAfterMs,
} from '@/lib/utils/retry'
import {
  ByokRateLimitError,
  computeCredentialBucketNamespace,
  validateGoogleByokCredential,
  validateKlingByokCredential,
} from '@/lib/byok/resolveProviderCredential'
import { synthesizeElevenLabsMp3 } from '@/lib/elevenlabs/textToSpeech'
import { synthesizeGeminiFlashMp3 } from '@/lib/tts/geminiFlashTts'
import {
  VERTEX_DISPATCH_EVAL_SCRIPT,
  VERTEX_IMAGE_LEASE_EVAL_SCRIPT,
  VERTEX_ROLLING_RPM_INCR_SCRIPT,
  acquireImageGenerationLease,
  getBucketCooldownRemainingMs,
  getDistributedRollingRpmCount,
  incrementDistributedRollingRpm,
  noteImageGenerationCooldown,
  noteVideoGenerationCooldown,
  resetVertexDispatchBucketForTests,
  vertexDispatchKey,
  vertexImageCooldownKey,
  vertexImageLeaseKey,
  vertexRollingRpmKey,
  vertexVideoCooldownKey,
} from '@/lib/vertexai/vertexDispatchBucket'

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

describe('parseRetryAfterMs & fetchWithRetry Retry-After handling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('parses delta-seconds, HTTP-dates, invalid inputs, and enforces 120s cap', () => {
    const now = Date.UTC(2026, 9, 21, 7, 28, 0)
    expect(parseRetryAfterMs(null, now)).toBeNull()
    expect(parseRetryAfterMs('', now)).toBeNull()
    expect(parseRetryAfterMs('not-a-date', now)).toBeNull()

    expect(parseRetryAfterMs('0', now)).toBe(0)
    expect(parseRetryAfterMs('60', now)).toBe(60_000)
    expect(parseRetryAfterMs('1.5', now)).toBe(1_500)
    expect(parseRetryAfterMs('999', now)).toBe(MAX_RETRY_AFTER_CAP_MS)

    const futureDate = new Date(now + 45_000).toUTCString()
    expect(parseRetryAfterMs(futureDate, now)).toBe(45_000)

    const pastDate = new Date(now - 5_000).toUTCString()
    expect(parseRetryAfterMs(pastDate, now)).toBe(0)

    const farFutureDate = new Date(now + 600_000).toUTCString()
    expect(parseRetryAfterMs(farFutureDate, now)).toBe(MAX_RETRY_AFTER_CAP_MS)
  })

  it('waits at least the server Retry-After header on 429 even when above maxDelayMs', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    let attempts = 0
    const fetchMock = vi.fn(async () => {
      attempts++
      if (attempts === 1) {
        return new Response('rate limited', {
          status: 429,
          headers: { 'Retry-After': '45' },
        })
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    let resolved = false
    const promise = fetchWithRetry(
      'https://example.test/synthesize',
      { method: 'POST' },
      { maxRetries: 2, initialDelayMs: 500, maxDelayMs: 10_000 }
    ).then((res) => {
      resolved = true
      return res
    })

    await vi.advanceTimersByTimeAsync(44_999)
    expect(resolved).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    const res = await promise
    expect(resolved).toBe(true)
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('honors HTTP-date Retry-After on 503 responses', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 21, 7, 28, 0))
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const retryDate = new Date(Date.now() + 8_000).toUTCString()
    let attempts = 0
    const fetchMock = vi.fn(async () => {
      attempts++
      if (attempts === 1) {
        return new Response('service unavailable', {
          status: 503,
          headers: { 'Retry-After': retryDate },
        })
      }
      return new Response('ok', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    let resolved = false
    const promise = fetchWithRetry(
      'https://example.test/tts',
      { method: 'POST' },
      { maxRetries: 2, initialDelayMs: 500, maxDelayMs: 30_000 }
    ).then((res) => {
      resolved = true
      return res
    })

    await vi.advanceTimersByTimeAsync(7_999)
    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    const res = await promise
    expect(resolved).toBe(true)
    expect(res.status).toBe(200)
  })
})

describe('computeCredentialBucketNamespace & ByokRateLimitError', () => {
  it('returns platform for platform source and deterministic isolated hashes for BYOK keys', () => {
    expect(computeCredentialBucketNamespace('platform')).toBe('platform')
    expect(computeCredentialBucketNamespace('platform', 'AIzaSomeIgnoredSecret')).toBe('platform')

    const nsA1 = computeCredentialBucketNamespace('byok', 'AIzaKeyAlpha1234567890123456')
    const nsA2 = computeCredentialBucketNamespace('byok', '  AIzaKeyAlpha1234567890123456  ')
    const nsB = computeCredentialBucketNamespace('byok', 'AIzaKeyBravo1234567890123456')

    expect(nsA1).toMatch(/^byok:[0-9a-f]{12}$/)
    expect(nsA1).toBe(nsA2)
    expect(nsA1).not.toBe(nsB)
    expect(nsA1).not.toBe('platform')
  })

  it('constructs a typed ByokRateLimitError that prevents silent platform fallback', () => {
    const err = new ByokRateLimitError('User BYOK quota exceeded', {
      provider: 'vertex',
      retryAfterMs: 12_000,
      bucketNamespace: 'byok:deadbeef1234',
    })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ByokRateLimitError)
    expect(err.name).toBe('ByokRateLimitError')
    expect(err.status).toBe(429)
    expect(err.retryAfterMs).toBe(12_000)
    expect(err.bucketNamespace).toBe('byok:deadbeef1234')
    expect(err.isByokRateLimit).toBe(true)
  })
})

describe('vertexDispatchBucket namespace isolation & distributed rolling RPM', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS
    envBackup.KV_REST_API_URL = process.env.KV_REST_API_URL
    envBackup.KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN
    envBackup.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
    envBackup.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    process.env.VERTEX_IMAGE_DISPATCH_INTERVAL_MS = '500'
    resetVertexDispatchBucketForTests()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    restoreEnv('VERTEX_IMAGE_DISPATCH_INTERVAL_MS', envBackup.VERTEX_IMAGE_DISPATCH_INTERVAL_MS)
    restoreEnv('KV_REST_API_URL', envBackup.KV_REST_API_URL)
    restoreEnv('KV_REST_API_TOKEN', envBackup.KV_REST_API_TOKEN)
    restoreEnv('UPSTASH_REDIS_REST_URL', envBackup.UPSTASH_REDIS_REST_URL)
    restoreEnv('UPSTASH_REDIS_REST_TOKEN', envBackup.UPSTASH_REDIS_REST_TOKEN)
    resetVertexDispatchBucketForTests()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('prefixes all Redis keys with bucketNamespace', () => {
    const byokNs = 'byok:abc123def456'
    expect(vertexDispatchKey('image')).toBe('platform:vertex:dispatch:image')
    expect(vertexDispatchKey('image', byokNs)).toBe('byok:abc123def456:vertex:dispatch:image')
    expect(vertexImageLeaseKey()).toBe('platform:vertex:inflight:image')
    expect(vertexImageLeaseKey(byokNs)).toBe('byok:abc123def456:vertex:inflight:image')
    expect(vertexImageCooldownKey()).toBe('platform:vertex:image:cooldown-until')
    expect(vertexImageCooldownKey(byokNs)).toBe('byok:abc123def456:vertex:image:cooldown-until')
    expect(vertexVideoCooldownKey()).toBe('platform:vertex:video:cooldown-until')
    expect(vertexVideoCooldownKey(byokNs)).toBe('byok:abc123def456:vertex:video:cooldown-until')
    expect(vertexRollingRpmKey('video', byokNs, 120_000)).toBe(
      'byok:abc123def456:vertex:dispatch:video:rpm:2'
    )
  })

  it('isolates image and video cooldowns between platform and BYOK namespaces', async () => {
    vi.useFakeTimers()
    const byokNs = 'byok:abc123def456'

    // Put platform into a 15s image cooldown and byokNs into a 10s video cooldown
    await noteImageGenerationCooldown(15_000, 'platform')
    await noteVideoGenerationCooldown(10_000, byokNs)

    expect(await getBucketCooldownRemainingMs('image', 'platform')).toBe(15_000)
    expect(await getBucketCooldownRemainingMs('image', byokNs)).toBe(0)
    expect(await getBucketCooldownRemainingMs('video', byokNs)).toBe(10_000)
    expect(await getBucketCooldownRemainingMs('video', 'platform')).toBe(0)

    // BYOK image lease acquires immediately even while platform is cooled down!
    let byokAcquired = false
    const byokRelease = await acquireImageGenerationLease({
      maxWaitMs: 5_000,
      bucketNamespace: byokNs,
    })
    byokAcquired = true
    expect(byokAcquired).toBe(true)
    await byokRelease()

    // Platform image lease is still blocked by its cooldown
    let platformAcquired = false
    const platformPromise = acquireImageGenerationLease({
      maxWaitMs: 20_000,
      bucketNamespace: 'platform',
    }).then((r) => {
      platformAcquired = true
      return r
    })

    await vi.advanceTimersByTimeAsync(14_999)
    expect(platformAcquired).toBe(false)

    await vi.advanceTimersByTimeAsync(1_000)
    const platformRelease = await platformPromise
    expect(platformAcquired).toBe(true)
    await platformRelease()
  })

  it('uses Redis INCR + EXPIRE 70 for distributed rolling RPM when Redis is configured', async () => {
    expect(VERTEX_DISPATCH_EVAL_SCRIPT).toContain("redis.call('INCR'")
    expect(VERTEX_DISPATCH_EVAL_SCRIPT).toContain("redis.call('EXPIRE', rpmKey, 70)")
    expect(VERTEX_IMAGE_LEASE_EVAL_SCRIPT).toContain("redis.call('INCR'")
    expect(VERTEX_IMAGE_LEASE_EVAL_SCRIPT).toContain("redis.call('EXPIRE', rpmKey, 70)")
    expect(VERTEX_ROLLING_RPM_INCR_SCRIPT).toContain("redis.call('INCR'")
    expect(VERTEX_ROLLING_RPM_INCR_SCRIPT).toContain("redis.call('EXPIRE', KEYS[1], 70)")

    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'secret-token'

    const byokNs = 'byok:112233445566'
    const now = 1_700_000_040_000
    const counters = new Map<string, number>()

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { script: string; keys: string[] }
      const key = body.keys[0]
      if (body.script.includes('INCR')) {
        const next = (counters.get(key) ?? 0) + 1
        counters.set(key, next)
        return new Response(JSON.stringify({ result: next }), { status: 200 })
      }
      return new Response(JSON.stringify({ result: counters.get(key) ?? null }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    expect(await incrementDistributedRollingRpm('image', byokNs, now)).toBe(1)
    expect(await incrementDistributedRollingRpm('image', byokNs, now)).toBe(2)
    expect(await getDistributedRollingRpmCount('image', byokNs, now)).toBe(2)
    expect(await getDistributedRollingRpmCount('image', 'platform', now)).toBe(0)
  })
})

describe('validateGoogleByokCredential & validateKlingByokCredential', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.BYOK_SKIP_LIVE_VALIDATION = process.env.BYOK_SKIP_LIVE_VALIDATION
    delete process.env.BYOK_SKIP_LIVE_VALIDATION
  })

  afterEach(() => {
    restoreEnv('BYOK_SKIP_LIVE_VALIDATION', envBackup.BYOK_SKIP_LIVE_VALIDATION)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rejects empty or malformed Google API keys and incomplete Service Account JSON', async () => {
    expect((await validateGoogleByokCredential({})).ok).toBe(false)
    expect((await validateGoogleByokCredential({ apiKey: 'sk-not-a-google-key' })).ok).toBe(false)
    expect((await validateGoogleByokCredential({ apiKey: 'AIzaShort' })).ok).toBe(false)
    expect((await validateGoogleByokCredential({ serviceAccountJson: '{bad json' })).ok).toBe(false)
    expect(
      (
        await validateGoogleByokCredential({
          serviceAccountJson: JSON.stringify({ project_id: 'only-project' }),
        })
      ).ok
    ).toBe(false)
  })

  it('performs live GET check for valid Google API key format and checks HTTP 200', async () => {
    const validKey = 'AIzaSyTestKey1234567890abcdef12345'

    const okFetch = vi.fn(async (url: string) => {
      expect(String(url)).toContain('generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=')
      return new Response(JSON.stringify({ models: [] }), { status: 200 })
    })
    vi.stubGlobal('fetch', okFetch)

    const okResult = await validateGoogleByokCredential({ apiKey: validKey })
    expect(okResult).toEqual({ ok: true, mode: 'byok_api_key' })

    const rejectedFetch = vi.fn(async () => {
      return new Response(JSON.stringify({ error: { message: 'API key not valid.' } }), {
        status: 400,
      })
    })
    vi.stubGlobal('fetch', rejectedFetch)

    const failResult = await validateGoogleByokCredential({ apiKey: validKey })
    expect(failResult.ok).toBe(false)
    expect(failResult.error).toContain('API key not valid')
  })

  it('supports BYOK_SKIP_LIVE_VALIDATION=true for unit tests on Google and Kling credentials', async () => {
    process.env.BYOK_SKIP_LIVE_VALIDATION = 'true'

    const saResult = await validateGoogleByokCredential({
      serviceAccountJson: JSON.stringify({
        project_id: 'my-gcp-project',
        client_email: 'runner@my-gcp-project.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nFAKE\n-----END PRIVATE KEY-----\n',
      }),
    })
    expect(saResult).toEqual({
      ok: true,
      mode: 'byok_service_account',
      projectId: 'my-gcp-project',
      clientEmail: 'runner@my-gcp-project.iam.gserviceaccount.com',
    })

    expect((await validateKlingByokCredential({ apiKey: 'short' })).ok).toBe(false)
    expect((await validateKlingByokCredential({ apiKey: 'kling_valid_api_key_12345' })).ok).toBe(true)
    expect(
      (
        await validateKlingByokCredential({
          accessKey: 'kling_access_key_1234',
          secretKey: 'kling_secret_key_5678',
        })
      ).ok
    ).toBe(true)
  })
})

describe('TTS clients 429 Retry-After backoff', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
    envBackup.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
    envBackup.GOOGLE_APPLICATION_CREDENTIALS_JSON = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    restoreEnv('ELEVENLABS_API_KEY', envBackup.ELEVENLABS_API_KEY)
    restoreEnv('GOOGLE_API_KEY', envBackup.GOOGLE_API_KEY)
    restoreEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON', envBackup.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('retries ElevenLabs TTS on 429 honoring Retry-After and succeeds', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    process.env.ELEVENLABS_API_KEY = 'el-test-key'

    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls++
      if (calls === 1) {
        return new Response('too many requests', {
          status: 429,
          headers: { 'Retry-After': '3' },
        })
      }
      return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const promise = synthesizeElevenLabsMp3({
      text: 'Hello world',
      voiceId: 'voice-123',
    })

    await vi.advanceTimersByTimeAsync(2_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    const buf = await promise
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(buf.byteLength).toBe(4)
  })

  it('retries Gemini Flash TTS on 429 honoring Retry-After and succeeds', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    process.env.GOOGLE_API_KEY = 'AIzaTestKeyForTtsRetry1234567890'

    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls++
      if (calls === 1) {
        return new Response('RESOURCE_EXHAUSTED', {
          status: 429,
          headers: { 'Retry-After': '2' },
        })
      }
      return new Response(
        JSON.stringify({ audioContent: Buffer.from('mp3bytes').toString('base64') }),
        { status: 200 }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const promise = synthesizeGeminiFlashMp3({
      text: 'Action cue ready.',
      voiceId: 'gemini-Kore',
    })

    await vi.advanceTimersByTimeAsync(1_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    const buf = await promise
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(buf.toString('utf8')).toBe('mp3bytes')
  })
})

