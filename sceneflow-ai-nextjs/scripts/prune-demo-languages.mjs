/**
 * Prune non-demo language audio from the landing sample project.
 *
 * Usage:
 *   DRY_RUN=true node scripts/prune-demo-languages.mjs [shareSlugOrProjectId]
 *   node scripts/prune-demo-languages.mjs TheWhiteHouseWaltzAControlledThaw --delete-blobs
 *
 * Requires: DATABASE_URL (or POSTGRES_*), BLOB_READ_WRITE_TOKEN for --delete-blobs
 * Loads: .env.production.local, .env.local
 */

import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { del } from '@vercel/blob'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.env.DRY_RUN === 'true'
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const target = args[0] || 'TheWhiteHouseWaltzAControlledThaw'
const deleteBlobs = process.argv.includes('--delete-blobs')

/** Demo showcase languages — keep audio + translations for these only. */
const KEEP_LANGS = new Set(['en', 'th', 'es', 'ar', 'hi', 'ja', 'zh'])

/** Map legacy / alias codes to canonical keep codes before pruning. */
const LANG_ALIASES = {
  'zh-cn': 'zh',
  'zh-tw': 'zh',
  'zh-hans': 'zh',
  'zh-hant': 'zh',
}

dotenv.config({ path: path.join(__dirname, '..', '.env.production.local') })
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:5432/${process.env.POSTGRES_DATABASE || 'postgres'}`

function normalizeLangCode(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return raw
  const lower = raw.trim().toLowerCase()
  if (LANG_ALIASES[lower]) return LANG_ALIASES[lower]
  if (lower.startsWith('zh')) return 'zh'
  return lower
}

function isKeepLang(lang) {
  return KEEP_LANGS.has(normalizeLangCode(lang))
}

function collectUrl(value, bucket) {
  if (typeof value !== 'string' || !value.trim()) return
  bucket.add(value.trim())
}

function collectFromDialogueArray(arr, bucket) {
  if (!Array.isArray(arr)) return
  for (const entry of arr) {
    if (!entry) continue
    collectUrl(entry.audioUrl, bucket)
    collectUrl(entry.url, bucket)
  }
}

function collectLangMapUrls(map, lang, bucket) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return
  const data = map[lang]
  if (!data) return
  if (typeof data === 'string') {
    collectUrl(data, bucket)
    return
  }
  collectUrl(data.url, bucket)
  if (Array.isArray(data)) {
    collectFromDialogueArray(data, bucket)
  }
}

function pruneSceneAudio(scene, stats) {
  if (!scene || typeof scene !== 'object') return scene
  const next = { ...scene }
  const urlsToDelete = stats.urlsToDelete

  const pruneLangMap = (field) => {
    const map = next[field]
    if (!map || typeof map !== 'object' || Array.isArray(map)) return
    const out = { ...map }
    for (const lang of Object.keys(map)) {
      if (isKeepLang(lang)) continue
      stats.removedByLang[lang] = (stats.removedByLang[lang] || 0) + 1
      collectLangMapUrls(map, lang, urlsToDelete)
      delete out[lang]
    }
    if (Object.keys(out).length === 0) {
      delete next[field]
    } else {
      next[field] = out
    }
  }

  pruneLangMap('dialogueAudio')
  pruneLangMap('narrationAudio')
  pruneLangMap('descriptionAudio')

  // Legacy flat dialogueAudio array (English-only)
  if (Array.isArray(next.dialogueAudio)) {
    // keep as-is — treated as en legacy
  }

  // Per-language sfxAudio: { [lang]: { [sfxId]: entry } }
  if (next.sfxAudio && typeof next.sfxAudio === 'object' && !Array.isArray(next.sfxAudio)) {
    const firstKey = Object.keys(next.sfxAudio)[0]
    const looksPerLang =
      firstKey &&
      typeof next.sfxAudio[firstKey] === 'object' &&
      !Array.isArray(next.sfxAudio[firstKey]) &&
      firstKey.length <= 5
    if (looksPerLang) {
      const out = { ...next.sfxAudio }
      for (const lang of Object.keys(next.sfxAudio)) {
        if (isKeepLang(lang)) continue
        stats.removedByLang[lang] = (stats.removedByLang[lang] || 0) + 1
        const langMap = next.sfxAudio[lang]
        if (langMap && typeof langMap === 'object') {
          for (const entry of Object.values(langMap)) {
            if (entry && typeof entry === 'object') {
              collectUrl(entry.url, urlsToDelete)
              collectUrl(entry.audioUrl, urlsToDelete)
            } else if (typeof entry === 'string') {
              collectUrl(entry, urlsToDelete)
            }
          }
        }
        delete out[lang]
      }
      next.sfxAudio = Object.keys(out).length ? out : undefined
    }
  }

  return next
}

function languagesOnScene(scene) {
  const langs = new Set()
  for (const field of ['dialogueAudio', 'narrationAudio', 'descriptionAudio']) {
    const map = scene?.[field]
    if (!map || typeof map !== 'object' || Array.isArray(map)) continue
    for (const lang of Object.keys(map)) {
      const norm = normalizeLangCode(lang)
      const hasContent =
        field === 'dialogueAudio'
          ? Array.isArray(map[lang]) && map[lang].some((d) => d?.audioUrl || d?.url)
          : map[lang]?.url || typeof map[lang] === 'string'
      if (hasContent) langs.add(norm)
    }
  }
  if (Array.isArray(scene?.dialogueAudio) && scene.dialogueAudio.some((d) => d?.audioUrl)) {
    langs.add('en')
  }
  return langs
}

function unionLanguages(scenes) {
  const all = new Set()
  if (!Array.isArray(scenes)) return all
  for (const scene of scenes) {
    for (const l of languagesOnScene(scene)) all.add(l)
  }
  return all
}

function pruneTranslations(translations, stats) {
  if (!translations || typeof translations !== 'object') return translations
  const out = { ...translations }
  for (const lang of Object.keys(translations)) {
    if (isKeepLang(lang)) continue
    stats.removedTranslationLangs.push(lang)
    delete out[lang]
  }
  return out
}

function collectStreamUrls(stream, bucket) {
  if (!stream || typeof stream !== 'object') return
  collectUrl(stream.url, bucket)
  collectUrl(stream.videoUrl, bucket)
  collectUrl(stream.audioUrl, bucket)
  collectUrl(stream.renderedSceneUrl, bucket)
  if (Array.isArray(stream.segments)) {
    for (const seg of stream.segments) {
      collectUrl(seg?.videoUrl, bucket)
      collectUrl(seg?.audioUrl, bucket)
      collectUrl(seg?.thumbnailUrl, bucket)
    }
  }
}

function pruneProduction(production, stats) {
  if (!production || typeof production !== 'object') return production
  const out = { ...production }
  const scenes = out.scenes
  if (!scenes || typeof scenes !== 'object') return out

  const nextScenes = { ...scenes }
  for (const [sceneId, prodScene] of Object.entries(scenes)) {
    if (!prodScene || typeof prodScene !== 'object') continue
    const streams = prodScene.productionStreams
    if (!Array.isArray(streams) || streams.length === 0) continue

    const kept = []
    for (const stream of streams) {
      const lang = stream?.language
      if (!lang || isKeepLang(lang)) {
        kept.push(stream)
        continue
      }
      stats.removedProductionStreams++
      collectStreamUrls(stream, stats.urlsToDelete)
    }

    if (kept.length !== streams.length) {
      nextScenes[sceneId] = { ...prodScene, productionStreams: kept }
    }
  }
  out.scenes = nextScenes
  return out
}

function applyPruneToScenes(scenes, stats) {
  if (!Array.isArray(scenes)) return scenes
  return scenes.map((scene) => pruneSceneAudio(scene, stats))
}

function completenessReport(scenes) {
  if (!Array.isArray(scenes)) return {}
  const report = {}
  for (const lang of KEEP_LANGS) {
    report[lang] = { withDialogue: 0, withNarration: 0, missing: 0, total: scenes.length }
  }
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    for (const lang of KEEP_LANGS) {
      const hasDialogue =
        Array.isArray(scene?.dialogueAudio?.[lang]) &&
        scene.dialogueAudio[lang].some((d) => d?.audioUrl || d?.url)
      const hasNarration = !!scene?.narrationAudio?.[lang]?.url
      if (hasDialogue) report[lang].withDialogue++
      if (hasNarration) report[lang].withNarration++
      if (!hasDialogue && !hasNarration && lang !== 'en') {
        // en may use legacy flat dialogueAudio
        if (lang === 'en' && Array.isArray(scene?.dialogueAudio) && scene.dialogueAudio.some((d) => d?.audioUrl)) {
          report[lang].withDialogue++
        } else {
          report[lang].missing++
        }
      }
    }
  }
  return report
}

function isVercelBlobUrl(url) {
  return (
    typeof url === 'string' &&
    (url.includes('.vercel-storage.com') || url.includes('.public.blob.vercel-storage.com'))
  )
}

function isGcsUrl(url) {
  return typeof url === 'string' && (url.startsWith('gs://') || url.includes('storage.googleapis.com'))
}

async function deleteGcsUrl(url) {
  const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credJson) {
    console.warn('  [GCS] Skip (no GOOGLE_APPLICATION_CREDENTIALS_JSON):', url.slice(0, 80))
    return false
  }
  try {
    const { Storage } = await import('@google-cloud/storage')
    const credentials = JSON.parse(credJson)
    const storage = new Storage({ credentials, projectId: credentials.project_id })
    const bucketName = (process.env.GCS_ASSETS_BUCKET || 'sceneflow-assets').trim()

    let objectPath = url
    if (url.startsWith('gs://')) {
      const match = url.match(/^gs:\/\/([^/]+)\/(.+)$/)
      if (!match) return false
      const [, bucket, path] = match
      await storage.bucket(bucket).file(path).delete({ ignoreNotFound: true })
      return true
    }
    if (url.includes('storage.googleapis.com')) {
      const u = new URL(url)
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) {
        const bucket = parts[0]
        const filePath = parts.slice(1).join('/')
        await storage.bucket(bucket).file(decodeURIComponent(filePath)).delete({ ignoreNotFound: true })
        return true
      }
    }
    await storage.bucket(bucketName).file(objectPath).delete({ ignoreNotFound: true })
    return true
  } catch (err) {
    console.warn('  [GCS] Delete failed:', err.message)
    return false
  }
}

async function deleteCollectedBlobs(urlSet) {
  const urls = [...urlSet]
  const vercel = urls.filter(isVercelBlobUrl)
  const gcs = urls.filter(isGcsUrl)
  const other = urls.filter((u) => !isVercelBlobUrl(u) && !isGcsUrl(u))

  let deleted = 0
  let failed = 0

  if (vercel.length) {
    console.log(`\nDeleting ${vercel.length} Vercel blob(s)...`)
    try {
      await del(vercel)
      deleted += vercel.length
    } catch (err) {
      console.warn('Vercel batch delete failed, trying one-by-one:', err.message)
      for (const url of vercel) {
        try {
          await del(url)
          deleted++
        } catch {
          failed++
          console.warn('  Failed:', url.slice(0, 100))
        }
      }
    }
  }

  if (gcs.length) {
    console.log(`\nDeleting ${gcs.length} GCS file(s)...`)
    for (const url of gcs) {
      const ok = await deleteGcsUrl(url)
      if (ok) deleted++
      else failed++
    }
  }

  if (other.length) {
    console.log(`\nSkipping ${other.length} unrecognized URL(s) (not Vercel/GCS):`)
    for (const u of other.slice(0, 5)) console.log(' ', u.slice(0, 120))
    if (other.length > 5) console.log(`  ... and ${other.length - 5} more`)
  }

  return { deleted, failed, skipped: other.length }
}

async function main() {
  console.log(`\nPrune demo languages — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Target: ${target}`)
  console.log(`Keep: ${[...KEEP_LANGS].join(', ')}`)
  console.log(`Delete blobs: ${deleteBlobs && !DRY_RUN ? 'yes' : 'no'}\n`)

  const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  })

  await sequelize.authenticate()

  const [projects] = await sequelize.query(
    `SELECT id, title, metadata FROM projects WHERE metadata::text ILIKE :needle LIMIT 20`,
    { replacements: { needle: `%${target}%` } }
  )

  if (!projects.length) {
    console.error('No project found for target:', target)
    process.exit(1)
  }

  const project = projects.find((p) => {
    const md = p.metadata || {}
    const link = md.storyboardShareLink
    return (
      p.id === target ||
      link?.slug === target ||
      link?.shareToken === target ||
      (p.title && String(p.title).includes('White House Waltz'))
    )
  }) || projects[0]

  const md = project.metadata || {}
  const visionPhase = md.visionPhase || {}
  const script = visionPhase.script || {}

  const nested = script?.script?.scenes
  const wrapper = script?.scenes
  const legacy = visionPhase.scenes
  const canonical = Array.isArray(nested) && nested.length > 0 ? nested : wrapper || legacy || []

  const beforeLangs = unionLanguages(canonical)
  console.log('Languages BEFORE (union across scenes):', [...beforeLangs].sort().join(', ') || '(none)')

  const stats = {
    removedByLang: {},
    removedTranslationLangs: [],
    removedProductionStreams: 0,
    urlsToDelete: new Set(),
  }

  const prunedScenes = applyPruneToScenes(canonical, stats)
  const prunedTranslations = pruneTranslations(visionPhase.translations, stats)
  const prunedProduction = pruneProduction(visionPhase.production, stats)

  const afterLangs = unionLanguages(prunedScenes)
  console.log('Languages AFTER:', [...afterLangs].sort().join(', ') || '(none)')

  console.log('\nRemoved audio keys by language:')
  for (const [lang, count] of Object.entries(stats.removedByLang).sort()) {
    console.log(`  ${lang}: ${count} map key(s)`)
  }
  if (stats.removedTranslationLangs.length) {
    console.log('Removed translation langs:', stats.removedTranslationLangs.join(', '))
  }
  if (stats.removedProductionStreams) {
    console.log(`Removed production streams: ${stats.removedProductionStreams}`)
  }
  console.log(`Blob URLs collected: ${stats.urlsToDelete.size}`)

  console.log('\nCompleteness (kept languages):')
  const complete = completenessReport(prunedScenes)
  for (const lang of [...KEEP_LANGS].sort()) {
    const r = complete[lang]
    console.log(
      `  ${lang}: dialogue=${r.withDialogue}/${r.total} narration=${r.withNarration}/${r.total} missing=${r.missing}`
    )
  }

  const nextScript = script?.script
    ? {
        ...script,
        script: { ...script.script, scenes: prunedScenes },
        scenes: prunedScenes,
      }
    : { ...script, scenes: prunedScenes }

  const nextMetadata = {
    ...md,
    visionPhase: {
      ...visionPhase,
      scenes: prunedScenes,
      script: nextScript,
      translations: prunedTranslations,
      production: prunedProduction,
    },
  }

  if (DRY_RUN) {
    console.log('\nDRY_RUN: would update project', project.id, project.title)
    if (deleteBlobs) {
      console.log('DRY_RUN: would delete', stats.urlsToDelete.size, 'blob URL(s)')
    }
    await sequelize.close()
    return
  }

  await sequelize.query(`UPDATE projects SET metadata = :metadata::jsonb, updated_at = NOW() WHERE id = :id`, {
    replacements: {
      id: project.id,
      metadata: JSON.stringify(nextMetadata),
    },
  })
  console.log(`\nUpdated project ${project.id} (${project.title})`)

  if (deleteBlobs && stats.urlsToDelete.size > 0) {
    const result = await deleteCollectedBlobs(stats.urlsToDelete)
    console.log(`\nBlob cleanup: deleted=${result.deleted} failed=${result.failed} skipped=${result.skipped}`)
  }

  await sequelize.close()
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
