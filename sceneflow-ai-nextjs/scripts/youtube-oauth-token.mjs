#!/usr/bin/env node
/**
 * One-time helper to obtain YOUTUBE_REFRESH_TOKEN for @sceneflowaistudio uploads.
 *
 * Prerequisites:
 *   - YouTube Data API v3 enabled in Google Cloud Console
 *   - OAuth client (Desktop app or Web) with redirect URI http://localhost:8765/oauth2callback
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/youtube-oauth-token.mjs
 *
 * Opens a browser URL, paste the redirect URL after consent, prints refresh_token.
 */

import http from 'http'
import { URL } from 'url'
import { config } from 'dotenv'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const PORT = 8765
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
].join(' ')

async function exchangeCode(code, clientId, clientSecret) {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`)
  }

  return res.json()
}

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.')
    process.exit(1)
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')

  console.log('\n1. Open this URL in a browser signed in as @sceneflowaistudio:\n')
  console.log(authUrl.toString())
  console.log('\n2. Waiting for redirect on', REDIRECT_URI, '...\n')

  await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '/', `http://localhost:${PORT}`)
        if (url.pathname !== '/oauth2callback') {
          res.writeHead(404)
          res.end('Not found')
          return
        }

        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')
        if (error) {
          res.writeHead(400)
          res.end(`OAuth error: ${error}`)
          reject(new Error(error))
          server.close()
          return
        }

        if (!code) {
          res.writeHead(400)
          res.end('Missing code')
          return
        }

        const tokens = await exchangeCode(code, clientId, clientSecret)
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<h1>Success</h1><p>You can close this tab.</p>')

        console.log('\n=== Tokens ===')
        console.log('access_token:', tokens.access_token ? '(received)' : '(missing)')
        console.log('\nAdd to .env.local:\n')
        console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token || ''}`)
        if (!tokens.refresh_token) {
          console.warn('\nNo refresh_token returned. Revoke prior access and retry with prompt=consent.')
        }

        server.close()
        resolve(undefined)
      } catch (err) {
        reject(err)
        server.close()
      }
    })

    server.listen(PORT, () => {})
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
