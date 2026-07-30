#!/usr/bin/env node
/*
  Deploy + Verify helper
  - Optionally runs `vercel --prod` from sceneflow-ai-nextjs
  - Polls DEPLOY_VERIFY_URL (e.g., https://yourdomain.com) /api/build-info to validate:
    - commit matches local HEAD (short or long)
    - model is set (from GEMINI_MODEL env or central config)
    - uiMarker.productionSections contains Writer's Room and Motion
    - uiMarker.publishingLibrary contains Publishing Library markers
    - uiMarker.keyFeatures contains Create/Direct/Ship pillar markers
    - uiMarker.landingPage.pipelinePillarsRemoved is true
    - uiMarker.productionShowcase.animation.availableLocales includes es
    - uiMarker.heroVideo.availableLocales is en-only with the new English Blob master
    - uiMarker.landingPage.videoLanguageControl is overlay-dropdown
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
      const sections = (json.uiMarker && json.uiMarker.productionSections) || []
      const publishing = (json.uiMarker && json.uiMarker.publishingLibrary) || {}
      const keyFeatures = (json.uiMarker && json.uiMarker.keyFeatures) || {}
      const landingPage = (json.uiMarker && json.uiMarker.landingPage) || {}
      const productionShowcase = (json.uiMarker && json.uiMarker.productionShowcase) || {}
      const heroVideo = (json.uiMarker && json.uiMarker.heroVideo) || {}

      const commitMatches = commit.startsWith(headShort) || commit === headLong
      const modelOk = model && model.startsWith('gemini-')
      const sectionsOk =
        Array.isArray(sections) &&
        sections.includes("Writer's Room") &&
        sections.includes('Motion')
      const publishingOk =
        publishing.dialogTitle === 'Publishing Library' &&
        publishing.headerButton === 'Publish' &&
        Array.isArray(publishing.tabs) &&
        publishing.tabs.includes('YouTube')
      const keyFeaturesOk =
        Array.isArray(keyFeatures.pillars) &&
        keyFeatures.pillars.join(',') === 'Create,Direct,Ship' &&
        keyFeatures.counts?.direct === 7 &&
        keyFeatures.shipHeadline === 'YouTube Publishing'
      const landingPageOk =
        landingPage.pipelinePillarsRemoved === true &&
        landingPage.videoLanguageControl === 'overlay-dropdown' &&
        landingPage.useCasesTabsRemoved === true &&
        landingPage.heroCopy?.headline ===
          'You Direct the Story. SceneFlow Automates the Studio.' &&
        landingPage.heroCopy?.audienceMicroLineRemoved === true
      const animationShowcase =
        productionShowcase.animation && productionShowcase.animation.availableLocales
      const productionShowcaseOk =
        Array.isArray(animationShowcase) &&
        animationShowcase.includes('es') &&
        Array.isArray(productionShowcase.screeningRoomPlaceholders) &&
        productionShowcase.screeningRoomPlaceholders.join(',') ===
          'drama,animation,podcast,training'
      const heroVideoLocales = heroVideo.availableLocales
      const heroVideoOk =
        Array.isArray(heroVideoLocales) &&
        heroVideoLocales.join(',') === 'en,es,pt,hi,zh,ar,th' &&
        heroVideo.englishBlob === 'Hero Video (English).mp4' &&
        heroVideo.spanishBlob === 'Hero Video (Spanish) .mp4' &&
        heroVideo.portugueseBlob === 'Hero Video (Portuguese).mp4' &&
        heroVideo.hindiBlob === 'Hero Video (Hindi).mp4' &&
        heroVideo.chineseBlob === 'Hero Video (Chinese).mp4' &&
        heroVideo.arabicBlob === 'Hero Video (Arabic) .mp4' &&
        heroVideo.thaiBlob === 'Hero Video (Thai) .mp4'

      if (
        commitMatches &&
        modelOk &&
        sectionsOk &&
        publishingOk &&
        keyFeaturesOk &&
        landingPageOk &&
        productionShowcaseOk &&
        heroVideoOk
      ) {
        console.log('[deploy-verify] ✅ Verified production deploy: commit, model, and UI markers match')
        process.exit(0)
      } else {
        console.log('[deploy-verify] Not verified yet:', {
          commitMatches,
          modelOk,
          sectionsOk,
          publishingOk,
          keyFeaturesOk,
          landingPageOk,
          productionShowcaseOk,
          heroVideoOk,
        })
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


