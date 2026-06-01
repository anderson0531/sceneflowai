/**
 * DEPRECATED — auto-generated mockups stray too far from real product screenshots.
 * Use manual AI recapture from English refs in featureStoryboardMedia.ts, then:
 *   node scripts/upload-landing-visual-media.mjs
 *
 * Generate Thai landing visuals (walkthrough screenshots + comparison infographic)
 * from English references via Gemini image generation, then upload to Vercel Blob.
 *
 * Usage:
 *   npx tsx scripts/generate-thai-landing-visuals.ts
 *   npx tsx scripts/generate-thai-landing-visuals.ts --only comparison
 *   npx tsx scripts/generate-thai-landing-visuals.ts --only storyboard --id 4
 *   npx tsx scripts/generate-thai-landing-visuals.ts --skip-upload
 */

import { config } from 'dotenv'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { put } from '@vercel/blob'
import { generateImage } from '../src/lib/vertexai/gemini'
import {
  COMPARISON_IMAGE_EN,
  COMPARISON_IMAGE_TH,
} from '../src/config/landing/landingVisualMedia'
import { FEATURE_STORYBOARD_MEDIA } from '../src/config/landing/featureStoryboardMedia'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const OUT_DIR = join(ROOT, 'assets/landing-visuals/th')
const STORYBOARD_OUT = join(OUT_DIR, 'storyboard')
const COMPARISON_OUT = join(OUT_DIR, 'comparison/sceneflow-comparison-th.jpeg')

const STORYBOARD_PROMPT =
  'Localize this SceneFlow AI studio product screenshot for a Thai landing page. ' +
  'Keep the exact layout, colors, dark theme, icons, spacing, and UI structure. ' +
  'Replace every visible English label, button, menu item, and heading with natural Thai text. ' +
  'Use professional SaaS typography. Output a crisp 16:9 software screenshot, no watermarks.'

const COMPARISON_PROMPT =
  'Recreate this SceneFlow comparison infographic with identical visual design, layout, icons, and data points, ' +
  'but translate ALL text labels into Thai. Title: "ความรวดเร็วในการผลิตโดยไม่มีภาระต้นทุนแฝง". ' +
  'Subtitle theme: replace fragmented prompt tools and manual assembly with one automated studio from concept to publish-ready master. ' +
  'Caption theme: one studio replaces fragmented prompt tools, manual edits, and multi-platform handoffs. ' +
  'Keep cyan/dark brand styling. Professional marketing infographic, 16:9.'

function parseArgs() {
  const args = process.argv.slice(2)
  const onlyIdx = args.indexOf('--only')
  const only = onlyIdx >= 0 ? args[onlyIdx + 1] : 'all'
  const idIdx = args.indexOf('--id')
  const id = idIdx >= 0 ? Number(args[idIdx + 1]) : null
  const skipUpload = args.includes('--skip-upload')
  return { only, id, skipUpload }
}

function resolveScreenshotUrl(id: number): string | undefined {
  const url = FEATURE_STORYBOARD_MEDIA[id]?.screenshotUrl
  if (!url) return undefined
  if (url.startsWith('http')) return url
  // Local public asset — id 1 path is missing in repo; fall back to blueprint screenshot
  if (id === 1) {
    return FEATURE_STORYBOARD_MEDIA[10]?.screenshotUrl
  }
  return undefined
}

async function generateAndSave(
  prompt: string,
  referenceUrl: string,
  outPath: string,
  aspectRatio: '16:9' = '16:9'
) {
  if (existsSync(outPath)) {
    console.log(`Skipping existing ${outPath}`)
    return readFileSync(outPath)
  }

  console.log(`Generating ${outPath} …`)
  const imageBase64 = await generateImage(prompt, {
    aspectRatio,
    referenceImages: [
      {
        referenceId: 1,
        imageUrl: referenceUrl,
        subjectDescription: 'SceneFlow AI studio software interface screenshot',
        subjectType: 'SUBJECT_TYPE_PRODUCT',
      },
    ],
  })

  const buffer = Buffer.from(imageBase64, 'base64')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, buffer)
  console.log(`Saved ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`)
  return buffer
}

async function uploadBuffer(blobPath: string, buffer: Buffer, contentType: string) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) throw new Error('BLOB_READ_WRITE_TOKEN is required for upload')

  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType,
    token: blobToken,
  })
  console.log(`Uploaded ${blobPath}\n  ${blob.url}`)
}

async function generateStoryboard(id: number, skipUpload: boolean) {
  const referenceUrl = resolveScreenshotUrl(id)
  if (!referenceUrl) {
    console.warn(`No English reference for storyboard id ${id}, skipping`)
    return
  }

  const outPath = join(STORYBOARD_OUT, `${id}.png`)
  const buffer = await generateAndSave(STORYBOARD_PROMPT, referenceUrl, outPath)

  if (!skipUpload) {
    await uploadBuffer(`landing/storyboard/th/${id}.png`, buffer, 'image/png')
  }
}

async function generateComparison(skipUpload: boolean) {
  const buffer = await generateAndSave(COMPARISON_PROMPT, COMPARISON_IMAGE_EN, COMPARISON_OUT)

  if (!skipUpload) {
    await uploadBuffer('landing/comparison/sceneflow-comparison-th.jpeg', buffer, 'image/jpeg')
  }

  console.log(`Thai comparison URL: ${COMPARISON_IMAGE_TH}`)
}

async function main() {
  const { only, id, skipUpload } = parseArgs()

  if (only === 'all' || only === 'comparison') {
    await generateComparison(skipUpload)
  }

  if (only === 'all' || only === 'storyboard') {
    const ids = id ? [id] : Array.from({ length: 14 }, (_, i) => i + 1)
    for (const storyboardId of ids) {
      await generateStoryboard(storyboardId, skipUpload)
    }
  }

  console.log('\nComplete. Local assets:', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
