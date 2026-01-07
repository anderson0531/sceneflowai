/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides resilient API calls with automatic retry for transient errors
 * like 429 RESOURCE_EXHAUSTED from Vertex AI.
 * 
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429
 */

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
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: any, status?: number) => boolean
  /** Operation name for logging */
  operationName?: string
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

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'operationName' | 'isRetryable'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
}

// =============================================================================
// Retry Detection
// =============================================================================

/**
 * Default function to determine if an error is retryable
 * Detects 429 rate limit, RESOURCE_EXHAUSTED, and transient network errors
 */
export function isRetryableError(error: any, status?: number): boolean {
  // Check HTTP status
  if (status === 429 || status === 503 || status === 502) {
    return true
  }
  
  // Check error message patterns
  const message = error?.message || String(error) || ''
  const retryablePatterns = [
    '429',
    'RESOURCE_EXHAUSTED',
    'rate limit',
    'quota',
    'Too Many Requests',
    'temporarily unavailable',
    'UNAVAILABLE',
    'DEADLINE_EXCEEDED',
    'timeout',
    'ECONNRESET',
    'ETIMEDOUT',
  ]
  
  return retryablePatterns.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  )
}

/**
 * Calculate delay with exponential backoff and jitter
 * delay = min(initialDelay * 2^attempt + random(0-500ms), maxDelay)
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number
): number {
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt)
  const jitter = Math.floor(Math.random() * 500)
  return Math.min(exponentialDelay + jitter, maxDelayMs)
}

// =============================================================================
// Main Retry Function
// =============================================================================

/**
 * Execute a function with automatic retry on transient failures
 * Uses exponential backoff with jitter for delay between retries
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
    isRetryable = isRetryableError,
    operationName = 'Operation',
  } = options
  
  let lastError: Error | undefined
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
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
      
      // Calculate backoff delay
      const delay = calculateBackoffDelay(attempt, initialDelayMs, maxDelayMs)
      
      console.warn(
        `[Retry] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
        `retrying in ${delay}ms... Error: ${error.message?.substring(0, 100)}`
      )
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
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
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const operationName = options.operationName || `Fetch ${url.substring(0, 50)}`
  
  return withRetry(async () => {
    const response = await fetch(url, init)
    
    // Check if response status indicates we should retry
    if (response.status === 429 || response.status === 502 || response.status === 503) {
      const errorText = await response.text()
      const error: any = new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
      error.status = response.status
      error.response = response
      throw error
    }
    
    return response
  }, { ...options, operationName })
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
