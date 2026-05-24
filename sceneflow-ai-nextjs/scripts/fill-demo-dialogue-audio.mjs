/**
 * Backfill missing dialogue audio on the landing demo (or any project) via Edge TTS.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/fill-demo-dialogue-audio.mjs [shareSlugOrProjectId]
 *   npx tsx scripts/fill-demo-dialogue-audio.mjs TheWhiteHouseWaltzAControlledThaw --langs=hi,ar,es
 *
 * Requires: DATABASE_URL, BLOB_READ_WRITE_TOKEN
 * Loads: .env.production.local, .env.local
 */

import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { put } from '@vercel/blob'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.env.DRY_RUN === 'true'
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const target = args[0] || 'TheWhiteHouseWaltzAControlledThaw'
const langsArg = process.argv.find((a) => a.startsWith('--langs='))?.split('=')[1]
const DEFAULT_LANGS = ['hi', 'ar', 'es']
const langs = langsArg ? langsArg.split(',').map((l) => l.trim()).filter(Boolean) : DEFAULT_LANGS
const sceneFilterArg = process.argv.find((a) => a.startsWith('--scene='))?.split('=')[1]
const sceneFilter =
  sceneFilterArg !== undefined ? parseInt(sceneFilterArg, 10) : null
const translateMissing = !process.argv.includes('--no-translate')

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function translateLine(text, targetLanguage) {
  const maxAttempts = 4
  let lastErr
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delayMs = 5000 * attempt
      console.warn(`  Translation retry ${attempt}/${maxAttempts - 1} after ${delayMs}ms`)
      await sleep(delayMs)
    }
    try {
      const { translateWithVertexAI } = await import('../src/lib/vertexai/translate.ts')
      const result = await translateWithVertexAI({
        text,
        targetLanguage,
        sourceLanguage: 'en',
      })
      return result.translatedText
    } catch (vertexErr) {
      lastErr = vertexErr
      const apiKey = process.env.GOOGLE_API_KEY?.trim()
      if (!apiKey) continue
      if (attempt === 0) {
        console.warn(
          '  Vertex translate unavailable, falling back to Google Translate v2:',
          vertexErr instanceof Error ? vertexErr.message : vertexErr
        )
      }
      try {
        const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            target: targetLanguage,
            source: 'en',
            format: 'text',
          }),
        })
        if (!response.ok) {
          const errText = await response.text().catch(() => '')
          const isRateLimit = response.status === 403 || response.status === 429
          lastErr = new Error(
            `Google Translate v2 failed: ${response.status} ${errText.slice(0, 200)}`
          )
          if (isRateLimit && attempt < maxAttempts - 1) continue
          throw lastErr
        }
        const data = await response.json()
        return data?.data?.translations?.[0]?.translatedText || text
      } catch (googleErr) {
        lastErr = googleErr
        if (attempt < maxAttempts - 1) continue
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

function getDialogueAudioUrl(entry) {
  const url = entry?.audioUrl || entry?.url
  return typeof url === 'string' && url.trim() ? url.trim() : undefined
}

function hasEnglishDialogueAudio(scene, dialogueIndex) {
  const enArr = Array.isArray(scene?.dialogueAudio)
    ? scene.dialogueAudio
    : scene?.dialogueAudio?.en
  if (!Array.isArray(enArr)) return false
  const entry =
    enArr.find((d) => d?.dialogueIndex === dialogueIndex) ?? enArr[dialogueIndex]
  return !!getDialogueAudioUrl(entry)
}

function hasLangDialogueAudio(scene, lang, dialogueIndex) {
  const arr = scene?.dialogueAudio?.[lang]
  if (!Array.isArray(arr)) return false
  const entry =
    arr.find((d) => d?.dialogueIndex === dialogueIndex) ?? arr[dialogueIndex]
  return !!getDialogueAudioUrl(entry)
}

function getTranslatedLine(translations, lang, sceneIndex, dialogueIndex, lineId) {
  const byScene =
    translations?.[lang]?.[sceneIndex] ?? translations?.[lang]?.[String(sceneIndex)]
  if (!byScene) return null
  if (lineId && byScene.dialogueByLineId?.[lineId]) {
    return byScene.dialogueByLineId[lineId]
  }
  if (Array.isArray(byScene.dialogue) && byScene.dialogue[dialogueIndex]) {
    return byScene.dialogue[dialogueIndex]
  }
  return null
}

function findCharacter(characters, characterName) {
  if (!Array.isArray(characters) || !characterName) return null
  const lower = characterName.toLowerCase()
  return (
    characters.find((c) => c?.name?.toLowerCase() === lower) ||
    characters.find((c) => c?.name?.toLowerCase().includes(lower.split(' ').pop() || '')) ||
    null
  )
}

function upsertDialogueEntryInScene(scene, lang, dialogueIndex, lineId, patch) {
  if (!scene) return false

  if (!scene.dialogueAudio || Array.isArray(scene.dialogueAudio)) {
    if (Array.isArray(scene.dialogueAudio) && scene.dialogueAudio.length > 0) {
      scene.dialogueAudio = { en: scene.dialogueAudio }
    } else {
      scene.dialogueAudio = {}
    }
  }

  if (!Array.isArray(scene.dialogueAudio[lang])) {
    scene.dialogueAudio[lang] = []
  }

  const arr = scene.dialogueAudio[lang]
  let idx = -1
  if (lineId) idx = arr.findIndex((d) => d?.lineId === lineId)
  if (idx < 0 && typeof dialogueIndex === 'number') {
    idx = arr.findIndex((d) => d?.dialogueIndex === dialogueIndex)
  }

  while (arr.length <= dialogueIndex) {
    arr.push(null)
  }

  const merged = { ...(arr[idx] || {}), ...patch }
  if (idx >= 0) {
    arr[idx] = merged
  } else {
    arr[dialogueIndex] = merged
  }

  scene.dialogueAudioGeneratedAt = new Date().toISOString()
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
    if (upsertDialogueEntryInScene(nested[sceneIndex], lang, dialogueIndex, lineId, patch)) {
      touched++
    }
  }
  if (Array.isArray(wrapper) && wrapper[sceneIndex] && wrapper !== nested) {
    if (upsertDialogueEntryInScene(wrapper[sceneIndex], lang, dialogueIndex, lineId, patch)) {
      touched++
    }
  }
  if (Array.isArray(legacy) && legacy[sceneIndex] && legacy !== nested && legacy !== wrapper) {
    if (upsertDialogueEntryInScene(legacy[sceneIndex], lang, dialogueIndex, lineId, patch)) {
      touched++
    }
  }
  return touched
}

function collectGapWorkItems(scenes, translations, characters, targetLangs) {
  const items = []
  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    if (sceneFilter !== null && !Number.isNaN(sceneFilter) && sceneIndex !== sceneFilter) {
      continue
    }
    const scene = scenes[sceneIndex]
    const dialogueLines = Array.isArray(scene?.dialogue) ? scene.dialogue : []
    for (let dialogueIndex = 0; dialogueIndex < dialogueLines.length; dialogueIndex++) {
      const line = dialogueLines[dialogueIndex]
      const lineText = line?.line || line?.text || ''
      if (!lineText.trim()) continue
      if (!hasEnglishDialogueAudio(scene, dialogueIndex)) continue

      for (const lang of targetLangs) {
        if (lang === 'en') continue
        if (hasLangDialogueAudio(scene, lang, dialogueIndex)) continue

        const lineId = line?.lineId
        const translated = getTranslatedLine(
          translations,
          lang,
          sceneIndex,
          dialogueIndex,
          lineId
        )
        if (!translated?.trim()) {
          items.push({
            sceneIndex,
            lang,
            dialogueIndex,
            lineId,
            character: line?.character || 'dialogue',
            englishText: lineText,
            gender: findCharacter(characters, line?.character)?.gender,
            characterRecord: findCharacter(characters, line?.character),
            needsTranslation: true,
          })
          continue
        }

        const char = findCharacter(characters, line?.character)
        items.push({
          sceneIndex,
          lang,
          dialogueIndex,
          lineId,
          character: line?.character || 'dialogue',
          lineText: translated,
          gender: char?.gender || char?.attributes?.gender,
          characterRecord: char,
        })
      }
    }
  }
  return items
}

async function main() {
  const { resolveStoryboardScenes } = await import('../src/lib/storyboard/resolveStoryboardScenes.ts')
  const { optimizeTextForTTS } = await import('../src/lib/tts/textOptimizer.ts')
  const { synthesizeEdgeMp3 } = await import('../src/lib/tts/synthesizeEdgeMp3.ts')
  const { resolveEdgeVoiceForCharacter, getEdgeVoiceConfigForResolution } = await import('../src/lib/tts/edgeTtsVoices.ts')
  const { getAudioDurationFromBuffer } = await import('../src/lib/audio/serverAudioDuration.ts')

  const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  })

  console.log(`\nFill demo dialogue audio — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Target: ${target}`)
  console.log(`Languages: ${langs.join(', ')}\n`)

  await sequelize.authenticate()

  const [projects] = await sequelize.query(
    `SELECT id, title, metadata FROM projects WHERE metadata::text ILIKE :needle LIMIT 20`,
    { replacements: { needle: `%${target}%` } }
  )

  if (!projects.length) {
    console.error('No project found for target:', target)
    process.exit(1)
  }

  const project =
    projects.find((p) => {
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
  const translations = visionPhase.translations || {}

  const resolved = resolveStoryboardScenes({
    script,
    visionPhaseScenes: visionPhase.scenes,
  })

  const workItems = collectGapWorkItems(resolved, translations, characters, langs)
  const toFill = workItems.filter((w) => !w.skipReason)
  const skipped = workItems.filter((w) => w.skipReason)
  const needsTranslation = toFill.filter((w) => w.needsTranslation)

  console.log(`Scenes: ${resolved.length}`)
  console.log(`Gaps to fill: ${toFill.length}${needsTranslation.length ? ` (${needsTranslation.length} need Vertex translation)` : ''}`)
  console.log(`Translate missing: ${translateMissing}`)
  console.log(`Skipped: ${skipped.length}\n`)

  for (const row of toFill) {
    console.log(
      `  Scene ${row.sceneIndex + 1} [${row.lang}] dIdx=${row.dialogueIndex} ${row.character}`
    )
  }
  for (const row of skipped) {
    console.warn(
      `  SKIP Scene ${row.sceneIndex + 1} [${row.lang}] dIdx=${row.dialogueIndex}: ${row.skipReason}`
    )
  }

  if (toFill.length === 0) {
    console.log('\nNothing to fill.')
    await sequelize.close()
    return
  }

  if (DRY_RUN) {
    console.log('\nDRY_RUN: would synthesize and upload the entries above.')
    await sequelize.close()
    return
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN is required for live fill')
    process.exit(1)
  }

  const nextMetadata = JSON.parse(JSON.stringify(md))
  let filledCount = 0

  for (const row of toFill) {
    let speakText = row.lineText

    if (row.needsTranslation) {
      if (!translateMissing) {
        console.warn(
          `  Skip scene ${row.sceneIndex + 1} [${row.lang}] dIdx ${row.dialogueIndex}: no stored translation (use --no-translate only to audit)`
        )
        continue
      }
      const { translateWithVertexAI } = await import('../src/lib/vertexai/translate.ts')
      const source = row.englishText || ''
      const optimizedEn = optimizeTextForTTS(source)
      if (!optimizedEn.text.trim()) continue
      try {
        speakText = await translateLine(optimizedEn.text, row.lang)
        console.log(
          `  Translated scene ${row.sceneIndex + 1} [${row.lang}] dIdx ${row.dialogueIndex}`
        )
      } catch (err) {
        console.error(`  Translation failed for scene ${row.sceneIndex + 1} [${row.lang}]:`, err)
        continue
      }
    }

    const optimized = optimizeTextForTTS(speakText)
    if (!optimized.isSpeakable || !optimized.text.trim()) {
      console.warn(`  Skip scene ${row.sceneIndex + 1} dIdx ${row.dialogueIndex}: not speakable`)
      continue
    }

    const edgeVoiceConfig = getEdgeVoiceConfigForResolution(row.characterRecord, row.lang)
    const edgeVoice = resolveEdgeVoiceForCharacter({
      edgeVoiceConfig,
      gender: row.gender,
      lang: row.lang,
    })
    console.log(
      `\nSynthesizing Scene ${row.sceneIndex + 1} [${row.lang}] dIdx ${row.dialogueIndex} (${row.character}) voice=${edgeVoice}`
    )

    let audioBuffer
    try {
      audioBuffer = await synthesizeEdgeMp3({
        text: optimized.text,
        voice: edgeVoice,
        language: row.lang,
      })
    } catch (err) {
      console.error(`  Edge TTS failed:`, err)
      continue
    }

    let duration = null
    try {
      const wordCount = optimized.text.split(/\s+/).filter(Boolean).length
      duration = await getAudioDurationFromBuffer(
        audioBuffer,
        wordCount,
        row.lang,
        edgeVoice
      )
    } catch {
      duration = audioBuffer.length / (row.lang === 'en' ? 16000 : 24000)
    }

    const fileDescriptor = sanitizeForFilename(row.character)
    const langSuffix = row.lang !== 'en' ? `-${row.lang}` : ''
    const fileName = `audio/dialogue/${projectId}/scene-${row.sceneIndex}-${fileDescriptor}${langSuffix}-${Date.now()}.mp3`

    const blob = await put(fileName, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false,
    })

    console.log(`  Uploaded: ${blob.url} (${duration?.toFixed?.(2) ?? duration}s)`)

    const patch = {
      character: row.character,
      dialogueIndex: row.dialogueIndex,
      audioUrl: blob.url,
      duration: duration ?? undefined,
      voiceId: edgeVoice,
      provider: 'edge',
      generatedAt: new Date().toISOString(),
      ...(row.lineId ? { lineId: row.lineId } : {}),
    }

    const touched = syncSceneCopies(
      nextMetadata,
      row.sceneIndex,
      row.lang,
      row.dialogueIndex,
      row.lineId,
      patch
    )
    console.log(`  Updated ${touched} metadata scene copy/copies`)
    filledCount++

    await sleep(2000)
  }

  if (filledCount === 0) {
    console.error('\nNo entries were filled — metadata not updated.')
    await sequelize.close()
    process.exit(1)
  }

  await sequelize.query(`UPDATE projects SET metadata = :metadata::jsonb, updated_at = NOW() WHERE id = :id`, {
    replacements: {
      id: projectId,
      metadata: JSON.stringify(nextMetadata),
    },
  })

  console.log(`\nUpdated project ${projectId} (${project.title}) — ${filledCount} clips filled`)
  await sequelize.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
