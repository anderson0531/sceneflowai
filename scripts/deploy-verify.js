#!/usr/bin/env node
/*
  Deploy + Verify helper
  - Optionally runs `vercel --prod` from sceneflow-ai-nextjs
  - Polls DEPLOY_VERIFY_URL (e.g., https://yourdomain.com) /api/build-info to validate:
    - commit matches local HEAD (short or long)
    - model === gemini-2.5-flash
    - uiMarker.tabs contains both labels
*/
const { execSync } = require('node:child_process')
const https = require('https')

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts }).trim()
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(new Error(`Invalid JSON from ${url}: ${data.slice(0, 200)}`))
          }
        })
      })
      .on('error', reject)
  })
}

async function main() {
  const verifyUrl = process.env.DEPLOY_VERIFY_URL
  if (!verifyUrl) {
    console.error('DEPLOY_VERIFY_URL is not set (e.g., https://your-prod-domain)')
    process.exit(1)
  }

  const headLong = sh('git rev-parse HEAD')
  const headShort = sh('git rev-parse --short HEAD')
  console.log(`[deploy-verify] HEAD short: ${headShort}, long: ${headLong}`)

  if (process.env.SKIP_VERCEL_DEPLOY !== 'true') {
    console.log('[deploy-verify] Running Vercel production deploy...')
    try {
      const out = sh('npx --yes vercel --cwd sceneflow-ai-nextjs --prod --yes', { stdio: 'pipe' })
      console.log(out)
    } catch (e) {
      console.warn('[deploy-verify] Vercel CLI failed or not linked, continuing to verification...')
    }
  } else {
    console.log('[deploy-verify] Skipping Vercel deploy (SKIP_VERCEL_DEPLOY=true)')
  }

  // Poll /api/build-info up to 15 attempts
  const target = verifyUrl.replace(/\/$/, '') + '/api/build-info?__t=' + Date.now()
  const maxAttempts = 15
  const delayMs = 6000

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const json = await fetchJson(target)
      console.log(`[deploy-verify] Attempt ${attempt}:`, json)
      const commit = String(json.commit || '')
      const model = String(json.model || '')
      const tabs = (json.uiMarker && json.uiMarker.tabs) || []

      const commitMatches = commit.startsWith(headShort) || commit === headLong
      const modelOk = model === 'gemini-2.5-flash'
      const tabsOk = Array.isArray(tabs) && tabs.includes('Your Direction') && tabs.includes('Flow Direction')

      if (commitMatches && modelOk && tabsOk) {
        console.log('[deploy-verify] ✅ Verified production deploy: commit, model, and UI markers match')
        process.exit(0)
      } else {
        console.log('[deploy-verify] Not verified yet:', { commitMatches, modelOk, tabsOk })
      }
    } catch (e) {
      console.log(`[deploy-verify] Attempt ${attempt} error: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, delayMs))
  }

  console.error('[deploy-verify] ❌ Verification failed after polling. Check Vercel deploy and /api/build-info.')
  process.exit(2)
}

main().catch(err => {
  console.error('[deploy-verify] Fatal:', err)
  process.exit(2)
})


