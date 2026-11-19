#!/usr/bin/env node
/**
 * Live Production Multi-Language Screenshot Capture (Zero-Dependency Chrome CDP)
 *
 * Captures razor-sharp native UI screenshots directly from live production
 * (`https://sceneflowai.studio`) across all 6 non-English languages
 * (`es`, `pt`, `hi`, `zh-CN`, `ar`, `th`), saving WebP files to:
 *   `public/landing/key-features/screenshots/locales/<shortLocale>/<name>.webp`
 *
 * How it works:
 *   1. Launch Chrome once with remote debugging & a persistent profile so you
 *      only sign in to https://sceneflowai.studio once:
 *        node scripts/capture-live-feature-screenshots.mjs --launch-chrome
 *   2. Navigate to any Studio screen/tab/modal you want to capture, then run:
 *        node scripts/capture-live-feature-screenshots.mjs --capture=production-agent
 *      (Add `--full-page` for tall scrolling views like `blueprint-beats` or `series-review`.)
 *   3. The script automatically switches `sf-locale` (cookie + localStorage) across
 *      all 6 languages (`es`, `pt`, `hi`, `zh-CN`, `ar`, `th`), waits for fonts &
 *      translations to settle, captures each screen at 2× DPR (2560px wide),
 *      saves lossless/high-quality WebP, and restores `en` when done.
 *   4. Rebuild the affected feature videos with:
 *        npx tsx scripts/build-feature-animatics.ts --force
 *        node scripts/generate-panned-room-walkthroughs.mjs
 */

import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const LOCALES_OUT_ROOT = join(ROOT, 'public', 'landing', 'key-features', 'screenshots', 'locales')
const CHROME_BIN =
  process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROFILE_DIR = join(ROOT, 'tmp', 'chrome-capture-profile')

const LOCALE_TARGETS = [
  { folder: 'es', cookieLocale: 'es' },
  { folder: 'pt', cookieLocale: 'pt' },
  { folder: 'hi', cookieLocale: 'hi' },
  { folder: 'zh', cookieLocale: 'zh-CN' },
  { folder: 'ar', cookieLocale: 'ar' },
  { folder: 'th', cookieLocale: 'th' },
]

function parseArgs(argv) {
  const getVal = (prefix) => {
    const hit = argv.find((a) => a.startsWith(prefix))
    return hit ? hit.slice(prefix.length) : undefined
  }
  const port = Number(getVal('--port=') || '9222') || 9222
  const captureName = getVal('--capture=')
  const localeFilter = getVal('--locale=')
  const waitMs = Number(getVal('--wait-ms=') || '2200') || 2200
  const fullPage = argv.includes('--full-page')
  const launchChrome = argv.includes('--launch-chrome')
  const locales = localeFilter
    ? LOCALE_TARGETS.filter((t) =>
        localeFilter
          .split(',')
          .map((s) => s.trim())
          .includes(t.folder)
      )
    : LOCALE_TARGETS
  return { port, captureName, locales, waitMs, fullPage, launchChrome }
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.id = 0
    this.pending = new Map()
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data))
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    })
  }

  async send(method, params = {}) {
    await this.ready
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    this.ws.close()
  }
}

async function getActiveSceneFlowTarget(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json`)
  if (!res.ok) {
    throw new Error(`Could not connect to Chrome CDP on port ${port}. Run with --launch-chrome first.`)
  }
  const targets = await res.json()
  const page =
    targets.find(
      (t) =>
        t.type === 'page' &&
        typeof t.url === 'string' &&
        t.url.includes('sceneflowai.studio')
    ) || targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
  if (!page?.webSocketDebuggerUrl) {
    throw new Error('No open SceneFlow Studio page found in Chrome.')
  }
  return page
}

async function setLocaleAndReload(cdp, cookieLocale, waitMs) {
  await cdp.send('Network.setCookie', {
    name: 'sf-locale',
    value: cookieLocale,
    domain: 'sceneflowai.studio',
    path: '/',
    secure: true,
    sameSite: 'Lax',
  })
  await cdp.send('Runtime.evaluate', {
    expression: `
      try {
        localStorage.setItem('sf-locale', ${JSON.stringify(cookieLocale)});
        document.cookie = 'sf-locale=' + encodeURIComponent(${JSON.stringify(cookieLocale)}) + '; path=/; max-age=31536000; SameSite=Lax';
      } catch (e) {}
    `,
    awaitPromise: true,
  })
  await cdp.send('Page.reload', { ignoreCache: false })
  await new Promise((r) => setTimeout(r, waitMs))
  await cdp.send('Runtime.evaluate', {
    expression: `document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true`,
    awaitPromise: true,
  })
  await new Promise((r) => setTimeout(r, 400))
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (opts.launchChrome) {
    mkdirSync(PROFILE_DIR, { recursive: true })
    console.log(`Launching Chrome with CDP on port ${opts.port}...`)
    console.log('Sign in to https://sceneflowai.studio, open any screen, then run:')
    console.log('  node scripts/capture-live-feature-screenshots.mjs --capture=<screenshot-name>')
    spawn(
      CHROME_BIN,
      [
        `--remote-debugging-port=${opts.port}`,
        `--user-data-dir=${PROFILE_DIR}`,
        '--window-size=1280,720',
        'https://sceneflowai.studio/dashboard',
      ],
      { detached: true, stdio: 'ignore' }
    ).unref()
    return
  }

  if (!opts.captureName) {
    console.log('Usage:')
    console.log('  1) node scripts/capture-live-feature-screenshots.mjs --launch-chrome')
    console.log('  2) node scripts/capture-live-feature-screenshots.mjs --capture=production-agent [--full-page]')
    process.exit(1)
  }

  const stem = opts.captureName.replace(/\.(webp|png|jpg)$/i, '')
  const target = await getActiveSceneFlowTarget(opts.port)
  console.log(`Connected to tab: ${target.url}`)
  const cdp = new CdpClient(target.webSocketDebuggerUrl)

  try {
    await cdp.send('Page.enable')
    await cdp.send('Network.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 720,
      deviceScaleFactor: 2,
      mobile: false,
    })

    for (const { folder, cookieLocale } of opts.locales) {
      await setLocaleAndReload(cdp, cookieLocale, opts.waitMs)
      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: opts.fullPage,
        fromSurface: true,
      })
      const pngBuf = Buffer.from(data, 'base64')
      const outDir = join(LOCALES_OUT_ROOT, folder)
      mkdirSync(outDir, { recursive: true })
      const outPath = join(outDir, `${stem}.webp`)
      await sharp(pngBuf).webp({ quality: 92, effort: 5 }).toFile(outPath)
      console.log(`  ✓ [${folder}] Saved ${outPath}`)
    }

    // Restore English UI in the browser tab when finished
    await setLocaleAndReload(cdp, 'en', 1000)
    await cdp.send('Emulation.clearDeviceMetricsOverride')
    console.log(`\nDone capturing "${stem}" across ${opts.locales.length} languages.`)
  } finally {
    cdp.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
