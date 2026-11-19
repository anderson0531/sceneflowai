#!/usr/bin/env node
/**
 * Downloads full-resolution original images from AwesomeScreenshot share URLs
 * using headless Chrome CDP (to resolve the React SPA's signed image URL),
 * then converts them to crisp WebP files in `public/landing/key-features/screenshots/`.
 *
 * Usage:
 *   node scripts/download-awesomescreenshot.mjs stem=url [stem=url ...]
 */

import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'landing', 'key-features', 'screenshots')
const CHROME_BIN =
  process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const CDP_PORT = 9231

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

async function waitForCdpTarget(port, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`)
      if (res.ok) {
        const list = await res.json()
        const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
        if (page) return page
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Timed out waiting for headless Chrome CDP on port ${port}`)
}

async function resolveFullResImageUrl(cdp, shareUrl) {
  await cdp.send('Page.navigate', { url: shareUrl })

  // Poll up to 15s for the main screenshot <img> (naturalWidth >= 600) to load
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const evalRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        const big = imgs
          .filter(img => img.complete && img.naturalWidth >= 600 && img.src && !img.src.startsWith('data:'))
          .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));
        if (big[0]) {
          return { src: big[0].src, w: big[0].naturalWidth, h: big[0].naturalHeight };
        }
        return null;
      })()`,
      returnByValue: true,
    })
    const val = evalRes?.result?.value
    if (val?.src) return val
  }
  throw new Error(`Timed out waiting for full-res image on ${shareUrl}`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: node scripts/download-awesomescreenshot.mjs stem=url ...')
    process.exit(1)
  }

  const profileDir = join(ROOT, 'tmp', 'chrome-awesome-dl')
  mkdirSync(profileDir, { recursive: true })
  const chrome = spawn(
    CHROME_BIN,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profileDir}`,
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: 'ignore' }
  )

  try {
    const target = await waitForCdpTarget(CDP_PORT)
    const cdp = new CdpClient(target.webSocketDebuggerUrl)
    await cdp.send('Page.enable')
    mkdirSync(OUT_DIR, { recursive: true })

    for (const arg of args) {
      const eq = arg.indexOf('=')
      if (eq <= 0) throw new Error(`Invalid arg (expected stem=url): ${arg}`)
      const stem = arg.slice(0, eq)
      const shareUrl = arg.slice(eq + 1)

      const found = await resolveFullResImageUrl(cdp, shareUrl)
      const imgRes = await fetch(found.src, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          Referer: shareUrl,
        },
        redirect: 'follow',
      })
      if (!imgRes.ok) {
        throw new Error(`HTTP ${imgRes.status} downloading ${found.src}`)
      }
      const imgBuf = Buffer.from(await imgRes.arrayBuffer())
      const meta = await sharp(imgBuf).metadata()
      const outPath = join(OUT_DIR, `${stem}.webp`)
      await sharp(imgBuf).webp({ quality: 94, effort: 5 }).toFile(outPath)
      console.log(
        `✓ ${stem}.webp (${meta.width}x${meta.height}, ${Math.round(imgBuf.length / 1024)}KB src)`
      )
    }
    cdp.close()
  } finally {
    chrome.kill('SIGTERM')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
