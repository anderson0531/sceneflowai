#!/usr/bin/env node
/**
 * Uploads SceneFlow Desktop installer artifacts to Vercel Blob and refreshes the renderer manifest.
 *
 * Expects installers to exist in dist/desktop/ (produced by electron-builder scripts).
 *
 * Environment:
 *   VERCEL_BLOB_RW_TOKEN or BLOB_READ_WRITE_TOKEN – token with read/write access to the Blob store.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DIST_DIR = path.resolve(__dirname, '..', 'dist', 'desktop')
const MANIFEST_PATH = path.resolve(__dirname, '..', 'desktop', 'renderer-manifest.json')
const BLOB_PREFIX = 'renderer'
const token = process.env.VERCEL_BLOB_RW_TOKEN || process.env.BLOB_READ_WRITE_TOKEN

if (!token) {
  console.error('[upload-renderer] Missing VERCEL_BLOB_RW_TOKEN (or BLOB_READ_WRITE_TOKEN).')
  process.exit(1)
}

if (!fs.existsSync(DIST_DIR)) {
  console.error(`[upload-renderer] Build output not found at ${DIST_DIR}`)
  process.exit(1)
}

const pkg = require('../package.json')
const version = pkg.version

/**
 * Computes a SHA256 checksum for a file.
 * @param {string} filePath
 */
function sha256(filePath) {
  const hash = crypto.createHash('sha256')
  const stream = fs.createReadStream(filePath)
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

/**
 * Determines platform metadata for an artifact based on its filename.
 * @param {string} filename
 */
function parseArtifactMetadata(filename) {
  const ext = path.extname(filename).toLowerCase()
  const lower = filename.toLowerCase()

  if (ext === '.exe') {
    return { platform: 'windows', arch: 'x64', type: 'nsis' }
  }

  if (ext === '.dmg') {
    const arch = lower.includes('arm64') ? 'arm64' : lower.includes('x64') ? 'x64' : 'universal'
    return { platform: 'mac', arch, type: 'dmg' }
  }

  if (ext === '.zip') {
    const arch = lower.includes('arm64') ? 'arm64' : lower.includes('x64') ? 'x64' : 'universal'
    return { platform: 'mac', arch, type: 'zip' }
  }

  return null
}

let putFn = null

async function uploadFile(blobKey, filePath) {
  console.log(`[upload-renderer] Uploading ${path.basename(filePath)} → ${blobKey}`)
  return putFn(blobKey, fs.createReadStream(filePath), {
    access: 'public',
    token
  })
}

async function uploadArtifacts() {
  const files = fs.readdirSync(DIST_DIR).filter((item) => {
    const full = path.join(DIST_DIR, item)
    return fs.statSync(full).isFile()
  })

  const artifactFilenames = files.filter((filename) => {
    const ext = path.extname(filename).toLowerCase()
    return ['.exe', '.dmg', '.zip'].includes(ext)
  })

  const updaterMetadataFiles = files.filter((filename) => filename.toLowerCase().endsWith('.yml'))

  if (artifactFilenames.length === 0) {
    console.error('[upload-renderer] No installer artifacts (.exe, .dmg, .zip) found in dist/desktop.')
    process.exit(1)
  }

  const uploaded = []
  const uploadedAt = new Date().toISOString()

  for (const filename of artifactFilenames) {
    const metadata = parseArtifactMetadata(filename)
    if (!metadata) {
      console.warn(`[upload-renderer] Skipping unsupported artifact ${filename}`)
      continue
    }

    const filePath = path.join(DIST_DIR, filename)
    const size = fs.statSync(filePath).size
    const checksum = await sha256(filePath)
    const versionedKey = `${BLOB_PREFIX}/${version}/${filename}`
    const latestKey = `${BLOB_PREFIX}/${filename}`

    const { url } = await uploadFile(versionedKey, filePath)

    // Upload a copy to the root feed path to support electron-updater generic provider.
    await uploadFile(latestKey, filePath)

    uploaded.push({
      version,
      uploadedAt,
      filename,
      size,
      sha256: checksum,
      url,
      ...metadata
    })
  }

  // Upload auto-update metadata descriptors (latest.yml, latest-mac.yml, etc.)
  for (const filename of updaterMetadataFiles) {
    const filePath = path.join(DIST_DIR, filename)
    const blobKey = `${BLOB_PREFIX}/${filename}`
    await uploadFile(blobKey, filePath)
  }

  return uploaded
}

function ensureManifestDir() {
  const dir = path.dirname(MANIFEST_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function writeManifest(artifacts) {
  ensureManifestDir()

  let manifest = {
    latest: version,
    releases: {}
  }

  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    } catch (error) {
      console.warn('[upload-renderer] Existing manifest unreadable, regenerating from scratch.', error)
    }
  }

  manifest.latest = version
  manifest.releases[version] = {
    generatedAt: new Date().toISOString(),
    artifacts
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log(`[upload-renderer] Manifest updated at ${MANIFEST_PATH}`)
}

async function main() {
  try {
    const blobModule = await import('@vercel/blob')
    putFn = blobModule.put

    const artifacts = await uploadArtifacts()
    await writeManifest(artifacts)
    console.log('[upload-renderer] Completed successfully.')
  } catch (error) {
    console.error('[upload-renderer] Failed:', error)
    process.exit(1)
  }
}

main()

