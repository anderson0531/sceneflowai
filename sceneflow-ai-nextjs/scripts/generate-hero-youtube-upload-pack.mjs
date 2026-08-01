#!/usr/bin/env node
/**
 * Generate a manual YouTube upload pack for all 7 hero language videos.
 *
 * Usage:
 *   node scripts/generate-hero-youtube-upload-pack.mjs
 *   node scripts/generate-hero-youtube-upload-pack.mjs --download
 *
 * Output: content/youtube-hero-upload-pack/
 */

import { spawnSync } from 'child_process'
import { mkdirSync, writeFileSync, createWriteStream, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'content/youtube-hero-upload-pack')

function loadBundles() {
  const cliPath = join(__dirname, 'hero-youtube-bundles-cli.ts')
  const result = spawnSync('npx', ['tsx', cliPath], { cwd: ROOT, encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(1)
  }
  return JSON.parse(result.stdout.trim())
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function localeFolder(locale) {
  return join(OUT, locale)
}

async function downloadFile(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed ${url}: ${res.status}`)
  await pipeline(res.body, createWriteStream(dest))
}

function writeLocaleFiles(bundle) {
  const dir = localeFolder(bundle.locale)
  mkdirSync(dir, { recursive: true })

  writeFileSync(join(dir, 'title.txt'), bundle.title, 'utf8')
  writeFileSync(join(dir, 'description.txt'), bundle.description, 'utf8')
  writeFileSync(join(dir, 'tags.txt'), bundle.tags.join(', '), 'utf8')
  writeFileSync(join(dir, 'video-url.txt'), bundle.videoUrl, 'utf8')
  writeFileSync(join(dir, 'thumbnail-url.txt'), bundle.thumbnailUrl, 'utf8')

  writeFileSync(
    join(dir, 'metadata.json'),
    JSON.stringify(
      {
        locale: bundle.locale,
        title: bundle.title,
        description: bundle.description,
        tags: bundle.tags,
        videoUrl: bundle.videoUrl,
        thumbnailUrl: bundle.thumbnailUrl,
        categoryId: bundle.categoryId,
        language: bundle.language,
        youtubeStudioChecklist: [
          'Upload video file (sceneflow-hero-{locale}.mp4)',
          'Paste title from title.txt',
          'Paste description from description.txt',
          'Upload thumbnail (sceneflow-hero-{locale}-poster.jpg)',
          'Add tags from tags.txt',
          'Category: Science & Technology',
          'Language: match locale',
          'Visibility: Public',
        ],
      },
      null,
      2
    ),
    'utf8'
  )
}

function buildHtml(bundles) {
  const sections = bundles
    .map((b) => {
      const tags = b.tags.join(', ')
      return `
<section class="locale" id="${b.locale}">
  <h2>${b.locale.toUpperCase()} — ${escapeHtml(b.title)}</h2>
  <div class="links">
    <a href="${escapeHtml(b.videoUrl)}" download>Download MP4</a>
    <a href="${escapeHtml(b.thumbnailUrl)}" download>Download thumbnail</a>
  </div>
  <label>Title <button type="button" onclick="copy('title-${b.locale}')">Copy</button></label>
  <textarea id="title-${b.locale}" readonly rows="2">${escapeHtml(b.title)}</textarea>
  <label>Description <button type="button" onclick="copy('desc-${b.locale}')">Copy</button></label>
  <textarea id="desc-${b.locale}" readonly rows="12">${escapeHtml(b.description)}</textarea>
  <label>Tags <button type="button" onclick="copy('tags-${b.locale}')">Copy</button></label>
  <textarea id="tags-${b.locale}" readonly rows="2">${escapeHtml(tags)}</textarea>
  <p class="meta">Category: Science &amp; Technology · Language: ${b.locale}</p>
</section>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SceneFlow Hero — YouTube Manual Upload Pack</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; background: #0f172a; color: #e2e8f0; }
    h1 { font-size: 1.5rem; }
    .steps { background: #1e293b; padding: 1rem 1.25rem; border-radius: 8px; margin-bottom: 2rem; }
    .steps ol { margin: 0.5rem 0 0; padding-left: 1.25rem; }
    .locale { background: #1e293b; padding: 1.25rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #334155; }
    .locale h2 { margin-top: 0; font-size: 1.1rem; }
    .links a { display: inline-block; margin-right: 1rem; margin-bottom: 0.75rem; color: #38bdf8; }
    label { display: block; font-weight: 600; margin: 0.75rem 0 0.25rem; font-size: 0.85rem; }
    textarea { width: 100%; box-sizing: border-box; background: #0f172a; color: #e2e8f0; border: 1px solid #475569; border-radius: 6px; padding: 0.5rem; font-size: 0.9rem; }
    button { margin-left: 0.5rem; font-size: 0.75rem; cursor: pointer; }
    .meta { font-size: 0.85rem; color: #94a3b8; margin-top: 0.75rem; }
    .copied { outline: 2px solid #22c55e; }
  </style>
</head>
<body>
  <h1>SceneFlow Hero — Manual YouTube Upload (@sceneflowaistudio)</h1>
  <div class="steps">
    <strong>YouTube Studio steps (repeat for each language):</strong>
    <ol>
      <li>Open <a href="https://studio.youtube.com/channel/UCSXGf2gMfCRtktBCrFBDc0g/videos/upload" style="color:#38bdf8">YouTube Studio → Upload</a></li>
      <li>Drag in the MP4 from the locale folder (or use Download MP4)</li>
      <li>Copy/paste Title and Description below</li>
      <li>Upload thumbnail JPG in the video editor</li>
      <li>Add Tags, set Category to <em>Science &amp; Technology</em>, set video language</li>
      <li>Set visibility to <strong>Public</strong> and publish</li>
    </ol>
  </div>
  ${sections}
  <script>
    function copy(id) {
      const el = document.getElementById(id);
      el.select();
      navigator.clipboard.writeText(el.value);
      el.classList.add('copied');
      setTimeout(() => el.classList.remove('copied'), 800);
    }
  </script>
</body>
</html>`
}

async function main() {
  const download = process.argv.includes('--download')
  const bundles = loadBundles()

  mkdirSync(OUT, { recursive: true })

  for (const bundle of bundles) {
    writeLocaleFiles(bundle)
    console.log(`Wrote metadata: ${bundle.locale}/`)

    if (download) {
      const dir = localeFolder(bundle.locale)
      const videoPath = join(dir, `sceneflow-hero-${bundle.locale}.mp4`)
      const thumbPath = join(dir, `sceneflow-hero-${bundle.locale}-poster.jpg`)

      if (!existsSync(videoPath)) {
        console.log(`Downloading video: ${bundle.locale}...`)
        await downloadFile(bundle.videoUrl, videoPath)
      }
      if (!existsSync(thumbPath)) {
        console.log(`Downloading thumbnail: ${bundle.locale}...`)
        await downloadFile(bundle.thumbnailUrl, thumbPath)
      }
    }
  }

  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ channel: '@sceneflowaistudio', videos: bundles }, null, 2))
  writeFileSync(join(OUT, 'upload-guide.html'), buildHtml(bundles), 'utf8')

  console.log(`\nUpload pack ready: ${OUT}`)
  console.log('Open upload-guide.html in a browser for copy/paste metadata.')
  if (!download) console.log('Run with --download to fetch all MP4s and thumbnails locally.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
