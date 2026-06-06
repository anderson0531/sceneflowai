#!/usr/bin/env node
/**
 * Upload landing art-style and output-format thumbnails to Vercel Blob.
 *
 * Generates placeholder WebP images via ffmpeg when local files are missing.
 *
 * Usage:
 *   node scripts/upload-landing-thumbnails.mjs --dry-run
 *   node scripts/upload-landing-thumbnails.mjs --type art-styles --all
 *   node scripts/upload-landing-thumbnails.mjs --type output-formats --id 16x9
 *   node scripts/upload-landing-thumbnails.mjs --type use-case-posters-from-video --all
 *
 * Requires BLOB_READ_WRITE_TOKEN in .env.local (unless --dry-run or --skip-upload)
 */

import { put } from '@vercel/blob'
import sharp from 'sharp'
import { execFileSync } from 'child_process'
import { config } from 'dotenv'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const TMP = join(ROOT, '.tmp/landing-thumbnails')
const USE_CASE_CONFIG = join(ROOT, 'src/config/landing/useCaseExamples.ts')
const BLOB_DEMO_BASE = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

const ART_STYLES = [
  { id: 'photorealistic', color: '0x334155', label: 'Photorealistic' },
  { id: 'anime-90s', color: '0x7c3aed', label: 'Anime 90s' },
  { id: 'pixar', color: '0x0891b2', label: 'Pixar 3D' },
  { id: 'concept-art', color: '0x475569', label: 'Concept Art' },
  { id: 'ghibli', color: '0x059669', label: 'Ghibli' },
  { id: 'comic-book', color: '0xdc2626', label: 'Comic Book' },
  { id: 'oil-painting', color: '0x92400e', label: 'Oil Painting' },
  { id: 'digital-art', color: '0x2563eb', label: 'Digital Art' },
  { id: 'watercolor', color: '0x0d9488', label: 'Watercolor' },
  { id: 'sketch', color: '0x64748b', label: 'Sketch' },
]

const OUTPUT_FORMATS = [
  { id: '16x9', w: 1280, h: 720, color: '0x1e293b', label: '16:9' },
  { id: '9x16', w: 720, h: 1280, color: '0x312e81', label: '9:16' },
  { id: '1x1', w: 800, h: 800, color: '0x134e4a', label: '1:1' },
  { id: '4x3', w: 960, h: 720, color: '0x374151', label: '4:3' },
]

/** categoryId/exampleId poster placeholders for use-case picker tiles */
const USE_CASE_POSTERS = [
  ['entertainment', 'vertical-short-drama', 'YouTube TV Drama', '0x581c87'],
  ['entertainment', 'animated-web-series', 'Animated Web Series', '0x7e22ce'],
  ['entertainment', 'episodic-youtube-series', 'Episodic YouTube', '0x6d28d9'],
  ['entertainment', 'creator-reality-competition', 'Creator Reality', '0x5b21b6'],
  ['entertainment', 'ctv-ready-series', 'Connected TV', '0x4c1d95'],
  ['property', 'residential-real-estate', 'Residential RE', '0x0e7490'],
  ['property', 'commercial-real-estate', 'Commercial RE', '0x155e75'],
  ['property', 'short-term-rentals', 'Short-Term Rentals', '0x0f766e'],
  ['property', 'hospitality-tourism', 'Hospitality', '0x115e59'],
  ['property', 'museum-gallery-guides', 'Museum Guides', '0x047857'],
  ['knowledge', 'k12-higher-ed', 'K-12 & Higher Ed', '0x1d4ed8'],
  ['knowledge', 'corporate-ld', 'Corporate L&D', '0x1e40af'],
  ['knowledge', 'software-saas-tutorials', 'SaaS Tutorials', '0x2563eb'],
  ['knowledge', 'niche-skill-tutoring', 'Skill Tutoring', '0x3b82f6'],
  ['knowledge', 'medical-patient-education', 'Patient Education', '0x0284c7'],
  ['knowledge', 'video-memoirs', 'Video Memoirs', '0x0369a1'],
  ['jit', 'hyper-local-news', 'Hyper-Local News', '0xca8a04'],
  ['jit', 'financial-market-recaps', 'Market Recaps', '0xb45309'],
  ['jit', 'sports-commentary', 'Sports Commentary', '0xa16207'],
  ['jit', 'true-crime-historical-docs', 'True Crime Docs', '0x92400e'],
  ['jit', 'weather-emergency-alerts', 'Weather Alerts', '0x78350f'],
  ['b2b', 'product-explainer-videos', 'Product Explainer', '0x4f46e5'],
  ['b2b', 'case-study-testimonials', 'Case Studies', '0x4338ca'],
  ['b2b', 'recruitment-branding', 'Recruitment', '0x3730a3'],
  ['b2b', 'conference-event-promos', 'Event Promos', '0x312e81'],
  ['public', 'ngo-impact-reports', 'NGO Impact', '0x059669'],
  ['public', 'public-health-announcements', 'Public Health', '0x047857'],
  ['public', 'legal-insurance-explainers', 'Legal Explainers', '0x065f46'],
  ['public', 'religious-spiritual-teachings', 'Spiritual Teachings', '0x064e3b'],
]

function hexToRgb(hex) {
  const n = parseInt(hex.replace('0x', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

async function generatePlaceholder({ w, h, color, label, outPath }) {
  mkdirSync(dirname(outPath), { recursive: true })
  const { r, g, b } = hexToRgb(color)
  const safeLabel = label
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="rgb(${r},${g},${b})"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="32">${safeLabel}</text>
</svg>`
  await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toFile(outPath)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const skipUpload = args.includes('--skip-upload')
  const all = args.includes('--all')
  const typeIdx = args.indexOf('--type')
  const idIdx = args.indexOf('--id')
  const type = typeIdx >= 0 ? args[typeIdx + 1] : 'art-styles'
  const id = idIdx >= 0 ? args[idIdx + 1] : null
  return { dryRun, skipUpload, all, type, id }
}

async function uploadFile(blobPath, localPath, dryRun, skipUpload) {
  if (dryRun) {
    console.log(`  [dry-run] ${blobPath} <- ${localPath}`)
    return `${blobPath}`
  }
  if (skipUpload) {
    console.log(`  [skip-upload] ${localPath}`)
    return localPath
  }
  if (!BLOB_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN required')
  const buffer = readFileSync(localPath)
  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType: 'image/jpeg',
    token: BLOB_TOKEN,
    allowOverwrite: true,
  })
  console.log(`  uploaded: ${blob.url}`)
  return blob.url
}

function resolveFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return 'ffmpeg'
  } catch {
    try {
      const out = execFileSync('python3', [
        '-c',
        'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())',
      ]).toString().trim()
      if (out) return out
    } catch {
      /* ignore */
    }
  }
  throw new Error('ffmpeg not found. Install ffmpeg or pip install imageio-ffmpeg.')
}

function parseUseCaseExamplesFromConfig() {
  const configSrc = readFileSync(USE_CASE_CONFIG, 'utf8')
  const examples = []
  const blockRe = /ex\('([^']+)', \{([\s\S]*?)\n      \}\)/g
  let match

  while ((match = blockRe.exec(configSrc)) !== null) {
    const categoryId = match[1]
    const block = match[2]
    const idMatch = block.match(/id: '([^']+)'/)
    const videoMatch = block.match(/videoSrc: `\$\{BLOB_DEMO\}([^`]+)`/)
    if (!idMatch) continue

    examples.push({
      categoryId,
      exampleId: idMatch[1],
      videoSrc: videoMatch ? `${BLOB_DEMO_BASE}${videoMatch[1]}` : null,
    })
  }

  return examples
}

function extractPosterFrame(ffmpeg, videoUrl, posterPath) {
  mkdirSync(dirname(posterPath), { recursive: true })
  execFileSync(
    ffmpeg,
    ['-y', '-ss', '2', '-i', videoUrl, '-frames:v', '1', '-q:v', '2', posterPath],
    { stdio: 'ignore' }
  )
}

async function processUseCasePostersFromVideo({ dryRun, skipUpload, all, id, ffmpeg }) {
  const examples = parseUseCaseExamplesFromConfig()
  const items = all ? examples : examples.filter((ex) => ex.exampleId === id)

  if (!all && !id) {
    console.error('Use --all or --id {exampleId}')
    process.exit(1)
  }

  console.log('\nUse case posters from video:')
  for (const { categoryId, exampleId, videoSrc } of items) {
    const blobPath = `demo/use-cases/${categoryId}/${exampleId}-poster.jpg`
    const localPath = join(TMP, 'use-cases', categoryId, `${exampleId}-poster.jpg`)

    if (!videoSrc?.trim()) {
      console.error(`  skip ${exampleId}: no videoSrc in config`)
      continue
    }

    if (dryRun) {
      console.log(`  [dry-run] ${blobPath} <- ${videoSrc}`)
      continue
    }

    console.log(`  ${categoryId}/${exampleId}`)
    try {
      extractPosterFrame(ffmpeg, videoSrc, localPath)
    } catch (err) {
      console.error(`  ERROR extracting frame for ${exampleId}: ${err.message}`)
      continue
    }

    await uploadFile(blobPath, localPath, dryRun, skipUpload)
  }
}

async function main() {
  const { dryRun, skipUpload, all, type, id } = parseArgs()
  const needsFfmpeg = type === 'use-case-posters-from-video'
  const ffmpeg = needsFfmpeg && !dryRun ? resolveFfmpeg() : null

  if (type === 'use-case-posters-from-video') {
    await processUseCasePostersFromVideo({ dryRun, skipUpload, all, id, ffmpeg })
    return
  }

  if (type === 'art-styles' || type === 'all') {
    const items = all ? ART_STYLES : ART_STYLES.filter((s) => s.id === id)
    if (!all && !id) {
      console.error('Use --all or --id {presetId}')
      process.exit(1)
    }
    console.log('\nArt styles:')
    for (const style of items) {
      const blobPath = `landing/art-styles/${style.id}.jpg`
      const localPath = join(TMP, 'art-styles', `${style.id}.jpg`)
      if (!existsSync(localPath) && !dryRun) {
        await generatePlaceholder({
          w: 800,
          h: 800,
          color: style.color,
          label: style.label,
          outPath: localPath,
        })
      }
      if (!existsSync(localPath)) {
        console.error(`  missing ${localPath} — run with ffmpeg or add file manually`)
        continue
      }
      await uploadFile(blobPath, localPath, dryRun, skipUpload)
    }
  }

  if (type === 'output-formats' || type === 'all') {
    const items = all ? OUTPUT_FORMATS : OUTPUT_FORMATS.filter((f) => f.id === id)
    if (type === 'output-formats' && !all && !id) {
      console.error('Use --all or --id {16x9|9x16|1x1|4x3}')
      process.exit(1)
    }
    console.log('\nOutput formats:')
    for (const fmt of items) {
      const blobPath = `landing/output-formats/${fmt.id}.jpg`
      const localPath = join(TMP, 'output-formats', `${fmt.id}.jpg`)
      if (!existsSync(localPath) && !dryRun) {
        await generatePlaceholder({
          w: fmt.w,
          h: fmt.h,
          color: fmt.color,
          label: fmt.label,
          outPath: localPath,
        })
      }
      if (!existsSync(localPath)) {
        console.error(`  missing ${localPath}`)
        continue
      }
      await uploadFile(blobPath, localPath, dryRun, skipUpload)
    }
  }

  if (type === 'use-case-posters' || type === 'all') {
    const items = all
      ? USE_CASE_POSTERS
      : USE_CASE_POSTERS.filter(([, exampleId]) => exampleId === id)
    if (type === 'use-case-posters' && !all && !id) {
      console.error('Use --all or --id {exampleId}')
      process.exit(1)
    }
    console.log('\nUse case posters:')
    for (const [categoryId, exampleId, label, color] of items) {
      const blobPath = `demo/use-cases/${categoryId}/${exampleId}-poster.jpg`
      const localPath = join(TMP, 'use-cases', categoryId, `${exampleId}-poster.jpg`)
      if (!existsSync(localPath) && !dryRun) {
        await generatePlaceholder({
          w: 1280,
          h: 720,
          color,
          label,
          outPath: localPath,
        })
      }
      if (!existsSync(localPath)) {
        console.error(`  missing ${localPath}`)
        continue
      }
      await uploadFile(blobPath, localPath, dryRun, skipUpload)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
