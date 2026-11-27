/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides resilient API calls with automatic retry for transient errors
 * like 429 RESOURCE_EXHAUSTED from Vertex AI.
 * 
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429
 */

import { combineAbortSignals } from './abortSignals'

// =============================================================================
// Types
// =============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs?: number
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelayMs?: number
  /** Optional explicit per-attempt base delay schedule in ms (jittered and capped by maxDelayMs) */
  backoffScheduleMs?: number[]
  /** Maximum cap in milliseconds when honoring HTTP Retry-After headers (default: 120000) */
  maxRetryAfterMs?: number
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: any, status?: number) => boolean
  /** Operation name for logging */
  operationName?: string
  /** Timeout in milliseconds for the entire operation (default: none) */
  timeoutMs?: number
  /** Optional caller AbortSignal to cancel in-flight fetch and retry sleeps immediately */
  signal?: AbortSignal
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
}

export const MAX_RETRY_AFTER_CAP_MS = 120_000

/**
 * Parse an HTTP `Retry-After` header (delta-seconds like `"60"` or HTTP-date format)
 * into a non-negative delay in milliseconds, capped at `MAX_RETRY_AFTER_CAP_MS` (120s).
 * Returns `null` if the header is missing or unparseable.
 */
export function parseRetryAfterMs(
  header: string | null | undefined,
  nowMs: number = Date.now()
): number | null {
  if (!header || typeof header !== 'string') return null
  const trimmed = header.trim()
  if (!trimmed) return null

  // Delta-seconds (integer or decimal >= 0)
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed)
    if (!Number.isFinite(seconds) || seconds < 0) return null
    return Math.min(MAX_RETRY_AFTER_CAP_MS, Math.round(seconds * 1000))
  }

  // HTTP-date format (e.g., "Wed, 21 Oct 2026 07:28:00 GMT")
  const parsedDateMs = Date.parse(trimmed)
  if (Number.isFinite(parsedDateMs)) {
    const deltaMs = parsedDateMs - nowMs
    if (deltaMs <= 0) return 0
    return Math.min(MAX_RETRY_AFTER_CAP_MS, Math.round(deltaMs))
  }

  return null
}

function createCallerAbortError(): Error {
  const err = new Error('Operation aborted')
  err.name = 'AbortError'
  return err
}

// =============================================================================
// Retry Detection
// =============================================================================

/**
 * Default function to determine if an error is retryable
 * Detects 429 rate limit, RESOURCE_EXHAUSTED, and transient network errors
 */
export function isRetryableError(error: any, status?: number): boolean {
  if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
    return false
  }

  // Check HTTP status
  if (status === 429 || status === 502 || status === 503 || status === 504) {
    return true
  }

  if (error?.code === 'TIMEOUT' || error?.code === 'ETIMEDOUT') {
    return true
  }
  
  // Check error message patterns
  const message = error?.message || String(error) || ''
  const lower = message.toLowerCase()
  const retryablePatterns = [
    '429',
    '502',
    '503',
    '504',
    'RESOURCE_EXHAUSTED',
    'rate limit',
    'quota',
    'too many requests',
    'gateway timeout',
    'bad gateway',
    'service unavailable',
    'temporarily unavailable',
    'UNAVAILABLE',
    'DEADLINE_EXCEEDED',
    'timed out', // fetchWithRetry uses "timed out" (not substring of "timeout")
    'timeout',
    'ECONNRESET',
    'ETIMEDOUT',
  ]
  
  return retryablePatterns.some(pattern => lower.includes(pattern.toLowerCase()))
}

/**
 * Full jitter above an optional Retry-After floor.
 *
 * The exponential term is the ceiling of a uniform draw, not a shared sleep.
 * `delay = floor + random(0, min(cap, base × 2^attempt))`.
 * Callers that wake from the same 429 therefore do not retry on one timestamp.
 * A floor of 0 and a roll of 0 is an immediate retry; that is the short end of
 * the window, and the long end is the cap.
 */
export function fullJitterDelayMs(options: {
  attempt: number
  baseMs: number
  capMs: number
  /** Google's Retry-After, already in milliseconds. Added under the random window. */
  retryAfterMs?: number
  /** Test seam. Defaults to Math.random. */
  random?: () => number
}): number {
  const attempt = Number.isFinite(options.attempt) ? Math.max(0, Math.floor(options.attempt)) : 0
  const baseMs = Math.max(0, options.baseMs)
  const capMs = Math.max(0, options.capMs)
  const exponential = baseMs * 2 ** attempt
  const span = Math.floor(Math.min(capMs, exponential))
  const random = options.random ?? Math.random
  const unit = Math.min(1, Math.max(0, random()))
  const jitter = span <= 0 ? 0 : Math.min(span, Math.floor(unit * (span + 1)))
  const floor = Math.max(0, options.retryAfterMs ?? 0)
  return floor + jitter
}

/**
 * Calculate delay with exponential backoff and full jitter.
 * delay = random(0, min(cap, initialDelay × 2^attempt))
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number
): number {
  return fullJitterDelayMs({
    attempt,
    baseMs: initialDelayMs,
    capMs: maxDelayMs,
  })
}

// =============================================================================
// Main Retry Function
// =============================================================================

/**
 * Execute a function with automatic retry on transient failures
 * Uses exponential backoff with full jitter for delay between retries
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetch(url),
 *   { maxRetries: 3, operationName: 'API call' }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_RETRY_OPTIONS.maxRetries,
    initialDelayMs = DEFAULT_RETRY_OPTIONS.initialDelayMs,
    maxDelayMs = DEFAULT_RETRY_OPTIONS.maxDelayMs,
    backoffScheduleMs,
    maxRetryAfterMs,
    isRetryable = isRetryableError,
    operationName = 'Operation',
    signal,
  } = options
  
  let lastError: Error | undefined
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw createCallerAbortError()
    }
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      if (signal?.aborted || error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
        throw error
      }

      // Check if this is the last attempt
      if (attempt >= maxRetries) {
        console.error(`[Retry] ${operationName} failed after ${attempt + 1} attempts:`, error.message)
        throw error
      }
      
      // Check if error is retryable
      const status = error?.status || error?.response?.status
      if (!isRetryable(error, status)) {
        console.error(`[Retry] ${operationName} failed with non-retryable error:`, error.message)
        throw error
      }
      
      // Calculate backoff delay (honoring explicit schedule if provided)
      let backoffDelay: number
      if (Array.isArray(backoffScheduleMs) && backoffScheduleMs.length > 0) {
        const base = Math.max(
          0,
          backoffScheduleMs[Math.min(attempt, backoffScheduleMs.length - 1)]
        )
        const jitterFactor = 0.75 + Math.random() * 0.5
        backoffDelay = Math.min(maxDelayMs, Math.round(base * jitterFactor))
      } else {
        backoffDelay = calculateBackoffDelay(attempt, initialDelayMs, maxDelayMs)
      }

      // Honor explicit server Retry-After on 429 / 503 (or error.retryAfterMs)
      const rawRetryAfterMs =
        typeof error?.retryAfterMs === 'number' && Number.isFinite(error.retryAfterMs)
          ? Math.max(0, error.retryAfterMs)
          : status === 429 || status === 503
            ? parseRetryAfterMs(error?.response?.headers?.get?.('retry-after'))
            : null

      const retryAfterCap = Math.min(
        MAX_RETRY_AFTER_CAP_MS,
        maxRetryAfterMs ?? Math.max(maxDelayMs, MAX_RETRY_AFTER_CAP_MS)
      )
      const boundedRetryAfterMs =
        rawRetryAfterMs !== null ? Math.min(retryAfterCap, rawRetryAfterMs) : null
      const delay =
        boundedRetryAfterMs !== null
          ? Math.max(backoffDelay, boundedRetryAfterMs)
          : backoffDelay
      
      console.warn(
        `[Retry] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
        `retrying in ${delay}ms${boundedRetryAfterMs !== null ? ` (Retry-After: ${boundedRetryAfterMs}ms)` : ''}... Error: ${error.message?.substring(0, 100)}`
      )
      
      // Wait before retrying (abort-aware)
      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(createCallerAbortError())
          return
        }
        const onAbort = () => {
          clearTimeout(timer)
          reject(createCallerAbortError())
        }
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }, delay)
        signal?.addEventListener('abort', onAbort, { once: true })
      })
    }
  }
  
  // Should never reach here, but TypeScript needs this
  throw lastError || new Error(`${operationName} failed after ${maxRetries + 1} attempts`)
}

// =============================================================================
// Specialized Retry for Fetch
// =============================================================================

/**
 * Fetch with automatic retry for transient failures
 * Handles 429, 502, 503 status codes and network errors
 * Supports optional timeout via AbortController
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const operationName = options.operationName || `Fetch ${url.substring(0, 50)}`
  const timeoutMs = options.timeoutMs
  const callerSignal = (init?.signal ?? options.signal) || undefined
  
  return withRetry(async () => {
    if (callerSignal?.aborted) {
      throw createCallerAbortError()
    }
    // Create AbortController for timeout if specified
    let controller: AbortController | undefined
    let timeoutId: NodeJS.Timeout | undefined
    
    if (timeoutMs) {
      controller = new AbortController()
      timeoutId = setTimeout(() => {
        controller?.abort()
        console.warn(`[Retry] ${operationName} timed out after ${timeoutMs}ms`)
      }, timeoutMs)
    }
    
    const combinedSignal =
      controller?.signal || callerSignal
        ? combineAbortSignals(controller?.signal, callerSignal)
        : undefined

    try {
      const response = await fetch(url, {
        ...init,
        signal: combinedSignal,
      })
      
      // Check if response status indicates we should retry
      if (
        response.status === 429 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        const retryAfterMs =
          response.status === 429 || response.status === 503
            ? parseRetryAfterMs(response.headers?.get?.('retry-after'))
            : null
        const errorText = await response.text()
        const error: any = new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
        error.status = response.status
        error.response = response
        if (retryAfterMs !== null) {
          error.retryAfterMs = retryAfterMs
        }
        throw error
      }
      
      return response
    } catch (error: any) {
      // If caller explicitly aborted, preserve AbortError so we don't retry
      if (callerSignal?.aborted) {
        throw error
      }
      // Convert timeout AbortError to timeout error for better diagnostics
      if (error.name === 'AbortError') {
        const timeoutError: any = new Error(`${operationName} timed out after ${timeoutMs}ms`)
        timeoutError.code = 'TIMEOUT'
        throw timeoutError
      }
      throw error
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, { ...options, operationName, signal: callerSignal })
}

// =============================================================================
// Convenience Helpers
// =============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// =============================================================================
// Deadline / Timeout Wrapper
// =============================================================================

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Race a promise against a deadline. Rejects with TimeoutError if the deadline
 * is exceeded before the promise settles.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName = 'Operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${operationName} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}
