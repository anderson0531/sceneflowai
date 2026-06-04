import jwt from 'jsonwebtoken'

const KLING_BASE = 'https://api.klingai.com/v1'

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Official Kling JWT (Access Key + Secret Key) or static KLING_API_KEY bearer.
 */
export async function getKlingAuthToken(): Promise<string> {
  const staticKey = process.env.KLING_API_KEY
  if (staticKey?.trim()) return staticKey.trim()

  const ak = process.env.KLING_ACCESS_KEY
  const sk = process.env.KLING_SECRET_KEY
  if (!ak || !sk) {
    throw new Error('KLING_API_KEY or KLING_ACCESS_KEY + KLING_SECRET_KEY required')
  }

  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token
  }

  const token = jwt.sign(
    { iss: ak, exp: now + 1800, nbf: now - 5 },
    sk,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  )

  cachedToken = { token, expiresAt: now + 1800 }
  return token
}

export function getKlingBaseUrl(): string {
  return process.env.KLING_API_BASE_URL || KLING_BASE
}

export async function klingFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getKlingAuthToken()
  const url = `${getKlingBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(url, { ...init, headers })
}
