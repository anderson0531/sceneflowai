/**
 * Audit and regenerate broken dialogueAudio blob URLs in project metadata.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/repair-dialogue-audio.mjs [shareSlugOrProjectId]
 *   npx tsx scripts/repair-dialogue-audio.mjs TheWhiteHouseWaltzAControlledThaw
 *
 * Requires: DATABASE_URL, BLOB_READ_WRITE_TOKEN
 * TTS: ELEVENLABS_API_KEY and/or Google creds, or `--provider=edge` (local edge-tts CLI)
 * Optional: --provider=elevenlabs|google|edge|auto (default auto)
 * Loads: .env.production.local, .env.local
 */

import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import { put } from '@vercel/blob'

const execFileAsync = promisify(execFile)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.env.DRY_RUN === 'true'
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const target = args[0] || 'TheWhiteHouseWaltzAControlledThaw'
const langFilter = process.argv.find((a) => a.startsWith('--lang='))?.split('=')[1] || process.env.REPAIR_LANG || 'en'
const sceneFilterArg = process.argv.find((a) => a.startsWith('--scene='))?.split('=')[1]
const sceneFilter =
  sceneFilterArg !== undefined ? parseInt(sceneFilterArg, 10) : process.env.REPAIR_SCENE !== undefined ? parseInt(process.env.REPAIR_SCENE, 10) : null
const andersonOnly = !process.argv.includes('--all-broken')
const providerArg = process.argv.find((a) => a.startsWith('--provider='))?.split('=')[1] || 'auto'
const providerMode = ['elevenlabs', 'google', 'edge', 'auto'].includes(providerArg) ? providerArg : 'auto'
const ttsModel =
  process.argv.find((a) => a.startsWith('--model='))?.split('=')[1] ||
  process.env.REPAIR_TTS_MODEL ||
  process.env.ELEVENLABS_TTS_MODEL ||
  'eleven_flash_v2_5'

const GOOGLE_FALLBACK_VOICE_BY_LANG = {
  en: 'en-US-Neural2-D',
  es: 'es-ES-Neural2-B',
}

const EDGE_VOICE_BY_LANG = {
  en: 'en-US-GuyNeural',
  es: 'es-ES-AlvaroNeural',
}

const EDGE_TTS_BIN = process.env.EDGE_TTS_BIN || 'edge-tts'

dotenv.config({ path: path.join(__dirname, '..', '.env.production.local') })
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:5432/${process.env.POSTGRES_DATABASE || 'postgres'}`

function sanitizeForFilename(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getDialogueAudioUrl(entry) {
  const url = entry?.audioUrl || entry?.url
  return typeof url === 'string' && url.trim() ? url.trim() : undefined
}

async function headStatus(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.status
  } catch {
    return 0
  }
}

function collectDialogueAudioEntries(scenes) {
  const rows = []
  if (!Array.isArray(scenes)) return rows
  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    const scene = scenes[sceneIndex]
    const da = scene?.dialogueAudio
    if (!da) continue
    const byLang =
      typeof da === 'object' && !Array.isArray(da)
        ? Object.entries(da)
        : [['en', Array.isArray(da) ? da : []]]
    for (const [lang, arr] of byLang) {
      if (!Array.isArray(arr)) continue
      for (const entry of arr) {
        if (!entry) continue
        const url = getDialogueAudioUrl(entry)
        if (!url) continue
        if (entry.kind === 'narration' || entry.characterId === 'narrator') continue
        rows.push({
          sceneIndex,
          lang,
          dialogueIndex: entry.dialogueIndex,
          lineId: entry.lineId,
          character: entry.character,
          url,
          entry,
        })
      }
    }
  }
  return rows
}

function findCharacterVoice(characters, characterName) {
  if (!Array.isArray(characters) || !characterName) return null
  const lower = characterName.toLowerCase()
  return (
    characters.find((c) => c?.name?.toLowerCase() === lower) ||
    characters.find((c) => c?.name?.toLowerCase().includes(lower.split(' ').pop() || '')) ||
    null
  )
}

function updateDialogueEntryInScene(scene, lang, dialogueIndex, lineId, patch) {
  if (!scene?.dialogueAudio) return false
  let arr
  if (Array.isArray(scene.dialogueAudio)) {
    if (lang !== 'en') return false
    arr = scene.dialogueAudio
  } else {
    arr = scene.dialogueAudio[lang]
  }
  if (!Array.isArray(arr)) return false

  let idx = -1
  if (lineId) idx = arr.findIndex((d) => d?.lineId === lineId)
  if (idx < 0 && typeof dialogueIndex === 'number') {
    idx = arr.findIndex((d) => d?.dialogueIndex === dialogueIndex)
  }
  if (idx < 0) return false

  arr[idx] = { ...arr[idx], ...patch }
  return true
}

function syncSceneCopies(metadata, sceneIndex, lang, dialogueIndex, lineId, patch) {
  const visionPhase = metadata.visionPhase || {}
  const script = visionPhase.script || {}
  const nested = script?.script?.scenes
  const wrapper = script?.scenes
  const legacy = visionPhase.scenes

  let touched = 0
  if (Array.isArray(nested) && nested[sceneIndex]) {
    if (updateDialogueEntryInScene(nested[sceneIndex], lang, dialogueIndex, lineId, patch)) touched++
  }
  if (Array.isArray(wrapper) && wrapper[sceneIndex] && wrapper !== nested) {
    if (updateDialogueEntryInScene(wrapper[sceneIndex], lang, dialogueIndex, lineId, patch)) touched++
  }
  if (Array.isArray(legacy) && legacy[sceneIndex] && legacy !== nested && legacy !== wrapper) {
    if (updateDialogueEntryInScene(legacy[sceneIndex], lang, dialogueIndex, lineId, patch)) touched++
  }
  return touched
}

function isElevenLabsQuotaError(err) {
  const msg = err instanceof Error ? err.message : String(err)
  return /quota_exceeded|insufficient.*credit/i.test(msg)
}

async function synthesizeGoogleMp3({ text, lang, voiceName }) {
  const { finalizeTextForGoogleTts } = await import('../src/lib/tts/textOptimizer.ts')
  const { getVertexAIAuthToken } = await import('../src/lib/vertexai/client.ts')

  const sanitizedText = finalizeTextForGoogleTts(text)
  if (!sanitizedText) throw new Error('Text is empty after Google TTS sanitize')

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  let accessToken = null
  try {
    accessToken = await getVertexAIAuthToken()
  } catch {
    /* fall back to API key */
  }
  if (!accessToken && !apiKey) {
    throw new Error('Google TTS requires service account or GOOGLE_API_KEY')
  }

  const languageCode =
    lang === 'en'
      ? 'en-US'
      : lang === 'es'
        ? 'es-ES'
        : `${lang}-${lang.toUpperCase()}`
  const voice = voiceName || GOOGLE_FALLBACK_VOICE_BY_LANG[lang] || 'en-US-Neural2-D'

  const payload = {
    input: { text: sanitizedText },
    voice: { languageCode, name: voice },
    audioConfig: { audioEncoding: 'MP3' },
  }

  let url = 'https://texttospeech.googleapis.com/v1/text:synthesize'
  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  } else {
    url += `?key=${apiKey}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Google TTS failed: HTTP ${response.status} ${errText.slice(0, 400)}`)
  }

  const data = await response.json()
  return { buffer: Buffer.from(data.audioContent, 'base64'), voiceId: voice, provider: 'google' }
}

async function synthesizeEdgeMp3({ text, lang }) {
  const voice = EDGE_VOICE_BY_LANG[lang] || EDGE_VOICE_BY_LANG.en
  const tmpPath = path.join(os.tmpdir(), `repair-dialogue-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`)
  try {
    await execFileAsync(EDGE_TTS_BIN, ['--voice', voice, '--text', text, '--write-media', tmpPath], {
      timeout: 120_000,
    })
    const buffer = await fs.readFile(tmpPath)
    if (!buffer.length) throw new Error('edge-tts produced empty audio')
    return { buffer, voiceId: voice, provider: 'edge' }
  } finally {
    await fs.unlink(tmpPath).catch(() => {})
  }
}

async function synthesizeRepairAudio({ text, voiceConfig, lang, providerMode: mode, modelId }) {
  if (mode === 'edge') {
    return synthesizeEdgeMp3({ text, lang })
  }

  const { synthesizeElevenLabsMp3 } = await import('../src/lib/elevenlabs/textToSpeech.ts')
  const elevenConfigured = Boolean(process.env.ELEVENLABS_API_KEY)
  const useEleven =
    mode === 'elevenlabs' || (mode === 'auto' && voiceConfig?.provider !== 'google' && elevenConfigured)
  const useGoogle = mode === 'google' || voiceConfig?.provider === 'google'

  if (useGoogle && !useEleven) {
    return synthesizeGoogleMp3({
      text,
      lang,
      voiceName: voiceConfig?.voiceId?.includes('-') ? voiceConfig.voiceId : undefined,
    })
  }

  if (!elevenConfigured) {
    if (mode === 'auto') {
      return synthesizeGoogleMp3({ text, lang })
    }
    throw new Error('ELEVENLABS_API_KEY is required for elevenlabs provider')
  }

  try {
    const buffer = await synthesizeElevenLabsMp3({
      text,
      voiceId: voiceConfig.voiceId,
      stability: voiceConfig.stability,
      similarityBoost: voiceConfig.similarityBoost,
      modelId: modelId || ttsModel,
    })
    return { buffer, voiceId: voiceConfig.voiceId, provider: 'elevenlabs' }
  } catch (err) {
    if (mode === 'auto' && isElevenLabsQuotaError(err)) {
      console.warn('  ElevenLabs quota exceeded — falling back to Google TTS')
      try {
        return await synthesizeGoogleMp3({ text, lang })
      } catch (googleErr) {
        console.warn('  Google TTS failed — falling back to edge-tts:', googleErr instanceof Error ? googleErr.message : googleErr)
        return synthesizeEdgeMp3({ text, lang })
      }
    }
    throw err
  }
}

async function main() {
  const { resolveStoryboardScenes } = await import('../src/lib/storyboard/resolveStoryboardScenes.ts')
  const { optimizeTextForTTS } = await import('../src/lib/tts/textOptimizer.ts')
  const { getAudioDurationFromBuffer } = await import('../src/lib/audio/serverAudioDuration.ts')

  const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  })

  console.log(`\nRepair dialogue audio — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Target: ${target}`)
  console.log(`Provider: ${providerMode}`)
  console.log(`TTS model: ${ttsModel}\n`)

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

  const projectId = project.id
  const md = project.metadata || {}
  const visionPhase = md.visionPhase || {}
  const script = visionPhase.script || {}
  const characters = visionPhase.characters || []

  const resolved = resolveStoryboardScenes({
    script,
    visionPhaseScenes: visionPhase.scenes,
  })

  const entries = collectDialogueAudioEntries(resolved)
  console.log(`Auditing ${entries.length} dialogue audio URLs across ${resolved.length} scenes...\n`)

  const broken = []
  for (const row of entries) {
    const status = await headStatus(row.url)
    const ok = status >= 200 && status < 400
    const flag = ok ? 'OK' : 'BROKEN'
    console.log(
      `  Scene ${row.sceneIndex + 1} [${row.lang}] dIdx=${row.dialogueIndex} ${row.character || '?'} HTTP ${status || 'ERR'} ${flag} — ${row.url.split('/').pop()}`
    )
    if (!ok) broken.push({ ...row, status })
  }

  console.log(`\nBroken entries: ${broken.length}`)
  if (broken.length === 0) {
    await sequelize.close()
    return
  }

  let toRepair = broken
  if (langFilter) {
    toRepair = toRepair.filter((r) => r.lang === langFilter)
  }
  if (sceneFilter !== null && !Number.isNaN(sceneFilter)) {
    toRepair = toRepair.filter((r) => r.sceneIndex === sceneFilter)
  }
  if (andersonOnly) {
    toRepair = toRepair.filter((r) => (r.character || '').toUpperCase().includes('ANDERSON'))
  }

  if (toRepair.length !== broken.length) {
    console.log(
      `Filtered to ${toRepair.length} entries (lang=${langFilter}, scene=${sceneFilter ?? 'all'}, andersonOnly=${andersonOnly})`
    )
  }

  if (toRepair.length === 0) {
    console.log('No entries match repair filters.')
    await sequelize.close()
    return
  }

  if (DRY_RUN) {
    console.log('\nDRY_RUN: would regenerate:')
    for (const row of toRepair) {
      console.log(`  Scene ${row.sceneIndex + 1} [${row.lang}] dIdx=${row.dialogueIndex} ${row.character}`)
    }
    await sequelize.close()
    return
  }

  const hasGoogleCreds =
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) ||
    Boolean(process.env.GOOGLE_API_KEY) ||
    Boolean(process.env.GOOGLE_GEMINI_API_KEY)
  const hasTts =
    providerMode === 'edge' ||
    Boolean(process.env.ELEVENLABS_API_KEY) ||
    hasGoogleCreds
  if (!hasTts) {
    console.error('TTS credentials required (or use --provider=edge with edge-tts installed)')
    process.exit(1)
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN is required for live repair')
    process.exit(1)
  }

  const nextMetadata = JSON.parse(JSON.stringify(md))
  let repairedCount = 0

  for (const row of toRepair) {
    const scene = resolved[row.sceneIndex]
    const dialogueIndex = row.dialogueIndex
    const line =
      typeof dialogueIndex === 'number' && Array.isArray(scene?.dialogue)
        ? scene.dialogue[dialogueIndex]
        : null
    const lineText = line?.line || line?.text || ''
    if (!lineText.trim()) {
      console.warn(`  Skip scene ${row.sceneIndex + 1} dIdx ${dialogueIndex}: no line text`)
      continue
    }

    const characterName = row.character || line?.character || 'dialogue'
    const char = findCharacterVoice(characters, characterName)
    const voiceConfig = char?.voiceConfig
    if (!voiceConfig?.voiceId) {
      console.warn(`  Skip ${characterName}: no voiceConfig on character`)
      continue
    }

    const optimized = optimizeTextForTTS(lineText)
    if (!optimized.isSpeakable || !optimized.text.trim()) {
      console.warn(`  Skip scene ${row.sceneIndex + 1} dIdx ${dialogueIndex}: not speakable after optimize`)
      continue
    }

    console.log(`\nRegenerating Scene ${row.sceneIndex + 1} dIdx ${dialogueIndex} (${characterName})...`)
    console.log(`  TTS text: ${optimized.text.slice(0, 120)}${optimized.text.length > 120 ? '…' : ''}`)

    let audioBuffer
    let usedVoiceId = voiceConfig.voiceId
    let usedProvider = voiceConfig.provider || 'elevenlabs'
    try {
      const synth = await synthesizeRepairAudio({
        text: optimized.text,
        voiceConfig,
        lang: row.lang || 'en',
        providerMode,
        modelId: ttsModel,
      })
      audioBuffer = synth.buffer
      usedVoiceId = synth.voiceId
      usedProvider = synth.provider
      console.log(`  Synthesized via ${usedProvider} (voice ${usedVoiceId})`)
    } catch (err) {
      console.error(`  Failed to synthesize scene ${row.sceneIndex + 1} dIdx ${dialogueIndex}:`, err)
      continue
    }

    let duration = null
    try {
      const wordCount = optimized.text.split(/\s+/).filter(Boolean).length
      duration = await getAudioDurationFromBuffer(
        audioBuffer,
        wordCount,
        row.lang || 'en',
        usedVoiceId
      )
    } catch {
      duration = audioBuffer.length / 16000
    }

    const fileDescriptor = sanitizeForFilename(characterName)
    const langSuffix = row.lang !== 'en' ? `-${row.lang}` : ''
    const fileName = `audio/dialogue/${projectId}/scene-${row.sceneIndex}-${fileDescriptor}${langSuffix}-${Date.now()}.mp3`

    const blob = await put(fileName, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false,
    })

    const verifyStatus = await headStatus(blob.url)
    console.log(`  Uploaded: ${blob.url} (HTTP ${verifyStatus}, ${duration?.toFixed?.(2) ?? duration}s)`)

    const patch = {
      character: characterName,
      dialogueIndex,
      audioUrl: blob.url,
      duration: duration ?? undefined,
      voiceId: usedVoiceId,
      ...(row.lineId ? { lineId: row.lineId } : {}),
    }

    const touched = syncSceneCopies(
      nextMetadata,
      row.sceneIndex,
      row.lang,
      dialogueIndex,
      row.lineId,
      patch
    )
    console.log(`  Updated ${touched} metadata scene copy/copies`)
    repairedCount++
  }

  if (repairedCount === 0) {
    console.error('\nNo entries were repaired — metadata not updated.')
    await sequelize.close()
    process.exit(1)
  }

  await sequelize.query(`UPDATE projects SET metadata = :metadata::jsonb, updated_at = NOW() WHERE id = :id`, {
    replacements: {
      id: projectId,
      metadata: JSON.stringify(nextMetadata),
    },
  })

  console.log(`\nUpdated project ${projectId} (${project.title})`)
  await sequelize.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
