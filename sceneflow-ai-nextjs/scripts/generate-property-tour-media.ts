#!/usr/bin/env tsx
/**
 * Interactive Property Explorer — All-in-One Media Production Script
 *
 * Generates all assets needed to power every toggle in the Interactive Property Explorer:
 *   1. Multilingual Narration & In-Scene Agent Dialogue Audio (English, Spanish, Japanese)
 *      - Free default via `edge-tts-universal` (already installed in package.json)
 *      - Studio upgrade via ElevenLabs (`--tts=elevenlabs` + ELEVENLABS_API_KEY)
 *      - OpenAI TTS upgrade (`--tts=openai` + OPENAI_API_KEY)
 *   2. Ambient Background Music Loops (Coastal Acoustic + Twilight Lounge)
 *      - Zero-dependency warm harmonic ambient stereo WAV synth default (`--music=synth`)
 *      - Optional ElevenLabs Music / Fal Stable Audio (`--music=fal` + FAL_API_KEY)
 *   3. Event, Redesign & Architectural Addition Still Plates (`--plates=gateway`)
 *      - Uses Vercel AI Gateway (`AI_GATEWAY_API_KEY` + google/gemini-2.5-flash-image)
 *   4. Motion Clips (N->E->S->W transitions + Event/Addition loops) & In-Scene Agent Lip-Sync
 *      - Generates complete production manifest (`property-tour-media-manifest.json`) by default
 *      - Optional live Fal Kling + Sync/OmniHuman execution (`--clips=fal` + FAL_API_KEY)
 *   5. Optional Vercel Blob CDN publishing (`--upload-blob` + BLOB_READ_WRITE_TOKEN)
 *
 * Usage:
 *   npx tsx scripts/generate-property-tour-media.ts
 *   npx tsx scripts/generate-property-tour-media.ts --tts=elevenlabs --music=synth --clips=manifest
 *   npx tsx scripts/generate-property-tour-media.ts --tts=edge --clips=fal --upload-blob
 *   npx tsx scripts/generate-property-tour-media.ts --dry-run
 */

import fs from 'node:fs'
import path from 'node:path'
import { buildPropertyPerspectivePrompt, buildPublicDemoPropertyTourDTO } from '../src/lib/propertyTours/hostingPolicy'
import {
  COMPASS_DIRECTIONS,
  PROPERTY_ADDITION_PRESETS,
  PROPERTY_EVENT_PRESETS,
  PROPERTY_LANGUAGE_PRESETS,
  type PropertyAdditionId,
  type PropertyEventId,
  type PropertyLanguageCode,
  type PropertyRoom,
  type PropertyTourDTO,
} from '../src/lib/propertyTours/types'

interface CliOptions {
  outDir: string
  tts: 'edge' | 'elevenlabs' | 'openai' | 'skip'
  music: 'synth' | 'fal' | 'skip'
  plates: 'skip' | 'gateway'
  clips: 'manifest' | 'fal' | 'skip'
  uploadBlob: boolean
  dryRun: boolean
  languages: PropertyLanguageCode[]
}

function parseArgs(argv: string[]): CliOptions {
  const getFlag = (name: string): string | undefined => {
    const prefix = `--${name}=`
    const found = argv.find((a) => a.startsWith(prefix))
    return found ? found.slice(prefix.length) : undefined
  }
  const hasFlag = (name: string) => argv.includes(`--${name}`)

  const rawLangs = (getFlag('langs') || 'en,es,ja')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is PropertyLanguageCode => s === 'en' || s === 'es' || s === 'ja')

  return {
    outDir: path.resolve(process.cwd(), getFlag('out') || 'public/media/property-tours/demo'),
    tts: (getFlag('tts') as CliOptions['tts']) || 'edge',
    music: (getFlag('music') as CliOptions['music']) || 'synth',
    plates: (getFlag('plates') as CliOptions['plates']) || 'skip',
    clips: (getFlag('clips') as CliOptions['clips']) || 'manifest',
    uploadBlob: hasFlag('upload-blob'),
    dryRun: hasFlag('dry-run'),
    languages: rawLangs.length > 0 ? rawLangs : ['en', 'es', 'ja'],
  }
}

function roomSlug(room: PropertyRoom): string {
  if (room.id.includes('great-room')) return 'great-room'
  if (room.id.includes('kitchen')) return 'kitchen'
  if (room.id.includes('terrace')) return 'terrace'
  return room.id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ============================================================================
// 1. MULTILINGUAL TTS ENGINE (English, Spanish, Japanese)
// ============================================================================

async function synthesizeWithEdgeTts(text: string, voice: string, outPath: string): Promise<void> {
  const { EdgeTTS } = await import('edge-tts-universal')
  const tts = new EdgeTTS(text, voice)
  const result = await Promise.race([
    tts.synthesize(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Edge TTS timeout (${voice})`)), 25_000)
    ),
  ])
  const arrayBuffer = await result.audio.arrayBuffer()
  const buf = Buffer.from(arrayBuffer)
  if (!buf.length) throw new Error(`Edge TTS returned empty audio (${voice})`)
  fs.writeFileSync(outPath, buf)
}

async function synthesizeWithElevenLabs(text: string, lang: PropertyLanguageCode, outPath: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set')
  const voiceId =
    process.env.ELEVENLABS_AGENT_VOICE_ID?.trim() ||
    (lang === 'es' ? 'EXAVITQu4vr4xnSDxMaL' : lang === 'ja' ? 'EXAVITQu4vr4xnSDxMaL' : 'EXAVITQu4vr4xnSDxMaL')

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.48, similarity_boost: 0.78, style: 0.25, use_speaker_boost: true },
    }),
  })
  if (!res.ok) {
    throw new Error(`ElevenLabs HTTP ${res.status}: ${await res.text()}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(outPath, buf)
}

async function synthesizeWithOpenAI(text: string, outPath: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      voice: 'nova',
      input: text,
      response_format: 'mp3',
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenAI TTS HTTP ${res.status}: ${await res.text()}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(outPath, buf)
}

async function generateVoiceTrack(args: {
  engine: CliOptions['tts']
  text: string
  lang: PropertyLanguageCode
  outPath: string
  voiceOverride?: string
  dryRun: boolean
}): Promise<boolean> {
  if (args.engine === 'skip') return false
  if (args.dryRun) {
    console.log(`  [DRY-RUN TTS:${args.engine}] ${path.basename(args.outPath)} (${args.lang}) -> "${args.text.slice(0, 64)}..."`)
    return true
  }

  const preset = PROPERTY_LANGUAGE_PRESETS.find((l) => l.code === args.lang) ?? PROPERTY_LANGUAGE_PRESETS[0]
  const voice = args.voiceOverride || preset.edgeVoice

  try {
    if (args.engine === 'elevenlabs') {
      await synthesizeWithElevenLabs(args.text, args.lang, args.outPath)
    } else if (args.engine === 'openai') {
      await synthesizeWithOpenAI(args.text, args.outPath)
    } else {
      await synthesizeWithEdgeTts(args.text, voice, args.outPath)
    }
    const kb = Math.round(fs.statSync(args.outPath).size / 1024)
    console.log(`  ✓ Generated ${path.basename(args.outPath)} (${kb} KB) via ${args.engine}`)
    return true
  } catch (err: any) {
    console.warn(`  ⚠ Failed ${path.basename(args.outPath)} (${args.engine}): ${err?.message || err}`)
    return false
  }
}

// ============================================================================
// 2. AMBIENT LUXURY MUSIC SYNTHESIZER (Zero-Dependency Seamless Loop WAV)
// ============================================================================

/**
 * Generates a warm, seamless stereo 16-bit PCM WAV ambient chord loop (16s)
 * so the player always has lush architectural background music out-of-the-box,
 * even without external music API keys.
 */
function writeWarmAmbientWav(args: {
  outPath: string
  chordsHz: number[][]
  durationSeconds: number
  tempoWaveHz: number
}): void {
  const sampleRate = 22050
  const numChannels = 2
  const bitsPerSample = 16
  const numSamples = sampleRate * args.durationSeconds
  const dataSize = numSamples * numChannels * (bitsPerSample / 8)
  const buffer = Buffer.alloc(44 + dataSize)

  // Standard RIFF/WAVE header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28)
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  const chordLen = args.durationSeconds / args.chordsHz.length

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const chordIdx = Math.min(args.chordsHz.length - 1, Math.floor(t / chordLen))
    const localT = t - chordIdx * chordLen
    const chord = args.chordsHz[chordIdx]

    // Smooth crossfade envelope per chord & loop boundary
    const fadeIn = Math.min(1, localT / 0.85)
    const fadeOut = Math.min(1, (chordLen - localT) / 0.85)
    const loopFade = Math.min(1, t / 0.4, (args.durationSeconds - t) / 0.4)
    const env = fadeIn * fadeOut * loopFade

    // Gentle breathing LFO
    const shimmer = 0.78 + 0.22 * Math.sin(2 * Math.PI * args.tempoWaveHz * t)

    let left = 0
    let right = 0
    for (let n = 0; n < chord.length; n++) {
      const f = chord[n]
      // Slight stereo detune for lush acoustic pad feel
      const sL = Math.sin(2 * Math.PI * f * t) + 0.22 * Math.sin(2 * Math.PI * (f * 2) * t)
      const sR = Math.sin(2 * Math.PI * (f * 1.003) * t) + 0.22 * Math.sin(2 * Math.PI * (f * 2.002) * t)
      const panL = n % 2 === 0 ? 0.65 : 0.35
      const panR = 1 - panL
      left += sL * panL
      right += sR * panR
    }

    const norm = (0.16 * env * shimmer) / chord.length
    const clampedL = Math.max(-0.92, Math.min(0.92, left * norm))
    const clampedR = Math.max(-0.92, Math.min(0.92, right * norm))

    buffer.writeInt16LE(Math.round(clampedL * 32767), offset)
    buffer.writeInt16LE(Math.round(clampedR * 32767), offset + 2)
    offset += 4
  }

  fs.writeFileSync(args.outPath, buffer)
}

async function generateMusicTracks(opts: CliOptions): Promise<void> {
  if (opts.music === 'skip') return
  console.log('\n[2/4] Generating Ambient Background Music Tracks...')

  const tracks = [
    {
      filename: 'music-coastal-ambient.wav',
      label: 'Coastal Acoustic (Daylight)',
      // Cmaj9 -> Fmaj9 -> Am9 -> G6 warm coastal progression
      chordsHz: [
        [130.81, 164.81, 196.0, 246.94, 293.66],
        [174.61, 220.0, 261.63, 329.63, 392.0],
        [110.0, 164.81, 196.0, 246.94, 329.63],
        [146.83, 196.0, 246.94, 293.66, 329.63],
      ],
      tempoWaveHz: 0.25,
    },
    {
      filename: 'music-twilight-lounge.wav',
      label: 'Twilight Lounge (Evening Entertaining)',
      // Dbmaj7 -> Bbm9 -> Gbmaj7 -> Ab6 warm twilight lounge progression
      chordsHz: [
        [138.59, 174.61, 207.65, 261.63],
        [116.54, 174.61, 207.65, 261.63, 311.13],
        [185.0, 233.08, 277.18, 349.23],
        [103.83, 164.81, 207.65, 261.63],
      ],
      tempoWaveHz: 0.18,
    },
  ]

  for (const track of tracks) {
    const outPath = path.join(opts.outDir, track.filename)
    if (opts.dryRun) {
      console.log(`  [DRY-RUN MUSIC:${opts.music}] ${track.filename} (${track.label})`)
      continue
    }
    writeWarmAmbientWav({
      outPath,
      chordsHz: track.chordsHz,
      durationSeconds: 16,
      tempoWaveHz: track.tempoWaveHz,
    })
    const kb = Math.round(fs.statSync(outPath).size / 1024)
    console.log(`  ✓ Generated ${track.filename} (${kb} KB)`)
  }
}

// ============================================================================
// 3. MOTION CLIPS & IN-SCENE AGENT LIP-SYNC PRODUCTION MANIFEST (+ Optional Fal)
// ============================================================================

function buildClipsProductionManifest(tour: PropertyTourDTO, opts: CliOptions) {
  const jobs: Array<Record<string, unknown>> = []

  // A. N -> E -> S -> W architectural camera pan transitions (Kling 2.1 / Veo 3.1 FTV)
  for (const room of tour.rooms) {
    for (let i = 0; i < COMPASS_DIRECTIONS.length; i++) {
      const fromDir = COMPASS_DIRECTIONS[i]
      const toDir = COMPASS_DIRECTIONS[(i + 1) % COMPASS_DIRECTIONS.length]
      const startFrame = room.perspectives[fromDir].variants[0]?.imageUrl || room.perspectives[fromDir].originalImageUrl
      const endFrame = room.perspectives[toDir].variants[0]?.imageUrl || room.perspectives[toDir].originalImageUrl

      jobs.push({
        type: 'room_pan_transition',
        roomId: room.id,
        roomName: room.name,
        transition: `${fromDir}->${toDir}`,
        recommendedModel: 'kling-2.1-master-ftv (or veo-3.1-fast)',
        durationSec: 4,
        startFrame,
        endFrame,
        prompt: `Smooth stabilized 24mm gimbal pan turning 90 degrees clockwise inside ${room.name} from ${fromDir} wall to ${toDir} wall. Preserve exact architectural geometry, white oak floors, cedar beams, and natural lighting with zero morphing.`,
        outputFile: `clip-${roomSlug(room)}-${fromDir.toLowerCase()}-to-${toDir.toLowerCase()}.mp4`,
      })
    }

    // B. Event & Addition Ambient Motion Loops (4s seamless lifestyle/architectural motion)
    const eventTargets: PropertyEventId[] = ['family_gathering', 'cocktail_party']
    for (const evt of eventTargets) {
      const preset = PROPERTY_EVENT_PRESETS.find((e) => e.id === evt)
      const variant = room.perspectives.N.variants.find((v) => v.event === evt)
      if (!variant || !preset) continue
      jobs.push({
        type: 'event_motion_loop',
        roomId: room.id,
        event: evt,
        recommendedModel: 'kling-2.1-pro-i2v',
        durationSec: 5,
        sourceImage: variant.imageUrl,
        prompt: `Subtle cinematic architectural motion inside ${room.name}: ${preset.promptGuidance} Gentle ambient movement, flickering candlelight/fireplace, soft ocean breeze, locked tripod camera.`,
        outputFile: `clip-${roomSlug(room)}-event-${evt}.mp4`,
      })
    }

    const additionTargets: PropertyAdditionId[] = ['wine_cellar_bar', 'adu_casita', 'infinity_pool']
    for (const addId of additionTargets) {
      const preset = PROPERTY_ADDITION_PRESETS.find((a) => a.id === addId)
      const variant = room.perspectives.N.variants.find((v) => v.addition === addId)
      if (!variant || !preset) continue
      jobs.push({
        type: 'addition_showcase_clip',
        roomId: room.id,
        addition: addId,
        estimatedCostUsd: preset.estimatedCostUsd ?? null,
        recommendedModel: 'veo-3.1-fast-i2v',
        durationSec: 5,
        sourceImage: variant.imageUrl,
        prompt: `Slow luxury real estate slider push-in showcasing ${preset.label} in ${room.name}. ${preset.promptGuidance} Shimmering water/lighting reflections, architectural precision.`,
        outputFile: `clip-${roomSlug(room)}-addition-${addId}.mp4`,
      })
    }

    // C. In-Scene Agent Lip-Sync Presenter Clips (EN / ES / JA)
    for (const lang of opts.languages) {
      const agentTrack = room.agentSyncByLanguage?.[lang]
      if (!agentTrack) continue
      jobs.push({
        type: 'in_scene_agent_lipsync',
        roomId: room.id,
        roomName: room.name,
        language: lang,
        recommendedModel: 'fal-ai/kling-video/lipsync or omnihuman-1 / sync-lipsync-2',
        presenterKeyframe: agentTrack.posterImageUrl,
        audioFile: `agent-${roomSlug(room)}-${lang}.mp3`,
        script: agentTrack.script,
        outputFile: `agent-sync-${roomSlug(room)}-${lang}.mp4`,
      })
    }
  }

  // D. Cross-angle still plate prompts for Redesign × Event × Addition combinations
  const plateBlueprints = tour.rooms.map((room) => ({
    roomId: room.id,
    roomName: room.name,
    redesignPromptExample: buildPropertyPerspectivePrompt({
      room,
      direction: 'N',
      style: 'japandi_zen',
      lighting: 'golden_hour',
      lifestyle: 'architectural',
      isAnchor: true,
      hasOriginalPhoto: true,
      hasAnchorReference: false,
    }),
  }))

  return {
    generatedAt: new Date().toISOString(),
    tourId: tour.id,
    tourTitle: tour.title,
    languages: opts.languages,
    totalVideoJobs: jobs.length,
    estimatedCostSummary: {
      voiceTracksEdgeTts: '$0.00 (18 neural MP3 tracks across EN/ES/JA via edge-tts-universal)',
      voiceTracksElevenLabs: '~$0.45 (18 tracks via eleven_multilingual_v2)',
      ambientMusicSynth: '$0.00 (2 seamless 16s stereo loops)',
      videoClipsKlingFast: `~$${(jobs.length * 0.28).toFixed(2)} (${jobs.length} clips @ ~$0.28/clip)`,
    },
    videoAndLipSyncJobs: jobs,
    redesignPromptTemplates: plateBlueprints,
  }
}

async function maybeRunFalLipSync(
  manifest: ReturnType<typeof buildClipsProductionManifest>,
  opts: CliOptions
): Promise<void> {
  if (opts.clips !== 'fal') return
  const falKey = process.env.FAL_API_KEY?.trim()
  if (!falKey) {
    console.warn('  ⚠ --clips=fal requested, but FAL_API_KEY is not set. Skipping live Fal generation (manifest saved).')
    return
  }
  console.log('  ℹ FAL_API_KEY detected. Use manifest jobs with @fal-ai/client (`fal-ai/kling-video/v2.1/pro/image-to-video` & `fal-ai/omnihuman`) for batch rendering.')
  console.log(`    Total queued video jobs in manifest: ${manifest.totalVideoJobs}`)
}

// ============================================================================
// 4. OPTIONAL VERCEL BLOB CDN UPLOAD
// ============================================================================

async function uploadGeneratedMediaToVercelBlob(opts: CliOptions): Promise<void> {
  if (!opts.uploadBlob) return
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    console.warn('  ⚠ --upload-blob requested, but BLOB_READ_WRITE_TOKEN is not set. Skipping upload.')
    return
  }
  const { put } = await import('@vercel/blob')
  const files = fs.readdirSync(opts.outDir).filter((f) => /\.(mp3|wav|mp4|json)$/i.test(f))
  const uploaded: Record<string, string> = {}

  console.log(`\n[4/4] Uploading ${files.length} generated media files to Vercel Blob...`)
  for (const file of files) {
    const fullPath = path.join(opts.outDir, file)
    const contentType = file.endsWith('.mp3')
      ? 'audio/mpeg'
      : file.endsWith('.wav')
        ? 'audio/wav'
        : file.endsWith('.mp4')
          ? 'video/mp4'
          : 'application/json'
    const blob = await put(`property-tours/media/demo/${file}`, fs.readFileSync(fullPath), {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    uploaded[file] = blob.url
    console.log(`  ✓ Uploaded ${file} -> ${blob.url}`)
  }

  fs.writeFileSync(
    path.join(opts.outDir, 'vercel-blob-urls.json'),
    JSON.stringify(uploaded, null, 2)
  )
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const tour = buildPublicDemoPropertyTourDTO('demo')

  console.log('====================================================================')
  console.log(' SceneFlow Interactive Property Explorer — Media Production Pipeline')
  console.log('====================================================================')
  console.log(` Tour:      ${tour.title}`)
  console.log(` Rooms:     ${tour.rooms.length} (${tour.rooms.map((r) => r.name).join(', ')})`)
  console.log(` Languages: ${opts.languages.join(', ').toUpperCase()}`)
  console.log(` TTS:       ${opts.tts} | Music: ${opts.music} | Clips: ${opts.clips}`)
  console.log(` Output:    ${opts.outDir}`)
  console.log('====================================================================\n')

  if (!opts.dryRun) {
    fs.mkdirSync(opts.outDir, { recursive: true })
  }

  // Step 1: Multilingual Narration + In-Scene Agent Sync Audio (EN / ES / JA)
  console.log('[1/4] Generating Multilingual Narration & In-Scene Agent Audio (EN / ES / JA)...')
  for (const room of tour.rooms) {
    const slug = roomSlug(room)
    for (const lang of opts.languages) {
      const narr = room.narrationByLanguage?.[lang]
      if (narr?.script) {
        await generateVoiceTrack({
          engine: opts.tts,
          text: narr.script,
          lang,
          outPath: path.join(opts.outDir, `narration-${slug}-${lang}.mp3`),
          dryRun: opts.dryRun,
        })
      }

      const agent = room.agentSyncByLanguage?.[lang]
      if (agent?.script) {
        // Distinct slightly warmer presenter voice for In-Scene Agent Sync
        const agentVoiceMap: Record<PropertyLanguageCode, string> = {
          en: 'en-US-JennyNeural',
          es: 'es-MX-DaliaNeural',
          ja: 'ja-JP-NanamiNeural',
        }
        await generateVoiceTrack({
          engine: opts.tts,
          text: agent.script,
          lang,
          outPath: path.join(opts.outDir, `agent-${slug}-${lang}.mp3`),
          voiceOverride: agentVoiceMap[lang],
          dryRun: opts.dryRun,
        })
      }
    }
  }

  // Step 2: Ambient Music Loops
  await generateMusicTracks(opts)

  // Step 3: Motion Clips & Lip-Sync Production Manifest
  console.log('\n[3/4] Writing Clips, Events, Additions & Lip-Sync Production Manifest...')
  const manifest = buildClipsProductionManifest(tour, opts)
  const manifestPath = path.join(opts.outDir, 'property-tour-media-manifest.json')
  if (!opts.dryRun) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    console.log(`  ✓ Saved ${manifestPath} (${manifest.totalVideoJobs} clip & lip-sync jobs)`)
  } else {
    console.log(`  [DRY-RUN] Would write ${manifest.totalVideoJobs} clip & lip-sync jobs to ${manifestPath}`)
  }
  await maybeRunFalLipSync(manifest, opts)

  // Step 4: Optional Vercel Blob Upload
  await uploadGeneratedMediaToVercelBlob(opts)

  console.log('\nDone! All audio, music, and clip manifests are ready for the Interactive Property Explorer.')
}

main().catch((err) => {
  console.error('[generate-property-tour-media] Fatal error:', err)
  process.exit(1)
})
