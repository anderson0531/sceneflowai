/**
 * Measure the acoustic substrate of every Gemini-TTS base voice.
 *
 * Google publishes a one-word character label per voice but no pitch data, so
 * the catalog ships label-derived defaults. This script replaces the guesses
 * with measurement: it synthesizes one fixed sentence per voice as LINEAR16,
 * estimates the fundamental frequency by autocorrelation, and writes the median
 * F0 and pitch floor into `src/lib/tts/geminiVoiceAcoustics.measured.json`,
 * which the catalog overlays on top of the defaults.
 *
 * The sentence is deliberately fixed and prosodically flat. Comparing voices
 * only means something when they read identical text with identical direction.
 *
 * Usage:
 *   GOOGLE_API_KEY=... npm run tts:calibrate-voices
 *   GOOGLE_API_KEY=... npm run tts:calibrate-voices -- --voice Charon --voice Iapetus
 *   GOOGLE_API_KEY=... npm run tts:calibrate-voices -- --dry-run
 *
 * @see https://cloud.google.com/text-to-speech/docs/gemini-tts
 */

import { writeFile, readFile } from 'fs/promises'
import path from 'path'

import { GEMINI_VOICE_CATALOG } from '../src/lib/tts/geminiVoiceCatalog'

const OUTPUT_PATH = path.join(
  process.cwd(),
  'src',
  'lib',
  'tts',
  'geminiVoiceAcoustics.measured.json'
)

const ENDPOINT = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize'

const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts'

/**
 * Long vowels and voiced consonants give the pitch tracker plenty of periodic
 * signal; the flat declarative shape keeps intonation from skewing the median.
 */
const SAMPLE_TEXT =
  'The number is nine, and the meeting will be held on Monday morning in the main hall.'

/**
 * Ask for the voice's own resting pitch. Any styling here would measure the
 * direction rather than the voice.
 */
const SAMPLE_PROMPT =
  'Read this sentence at a normal, level, conversational pitch. Do not add emotion, emphasis, or character. Do not whisper or shout.'

const SAMPLE_RATE_HZ = 24000

/** Human phonation, generously bounded: below is rumble, above is a child scream. */
const MIN_F0_HZ = 60
const MAX_F0_HZ = 400

const FRAME_MS = 40
const HOP_MS = 20

/** Below this the frame is silence or a breath, and its "pitch" is noise. */
const SILENCE_RMS = 0.01

/** Autocorrelation peak strength required to trust a frame as voiced. */
const MIN_PERIODICITY = 0.3

type MeasuredEntry = {
  medianF0Hz: number
  pitchFloorHz: number
  voicedFrames: number
}

type MeasuredFile = {
  generatedAt: string | null
  model: string | null
  sampleText: string | null
  voices: Record<string, MeasuredEntry>
}

type Args = {
  voices: string[]
  dryRun: boolean
  model: string
}

function parseArgs(argv: string[]): Args {
  const voices: string[] = []
  let dryRun = false
  let model = process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_MODEL

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--voice') {
      const value = argv[++i]
      if (value) voices.push(value.replace(/^gemini-/, ''))
    } else if (arg.startsWith('--voice=')) {
      voices.push(arg.slice('--voice='.length).replace(/^gemini-/, ''))
    } else if (arg === '--model') {
      const value = argv[++i]
      if (value) model = value
    } else if (arg.startsWith('--model=')) {
      model = arg.slice('--model='.length)
    }
  }

  return { voices, dryRun, model }
}

async function synthesizeLinear16(
  voiceName: string,
  model: string,
  apiKey: string
): Promise<Buffer> {
  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: SAMPLE_TEXT, prompt: SAMPLE_PROMPT },
      voice: { languageCode: 'en-US', name: voiceName, modelName: model },
      // LINEAR16 so samples can be read directly; MP3 would need a decoder.
      audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: SAMPLE_RATE_HZ },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`HTTP ${response.status} ${body.slice(0, 300)}`)
  }

  const data = (await response.json()) as { audioContent?: string }
  if (!data.audioContent) throw new Error('response contained no audioContent')
  return Buffer.from(data.audioContent, 'base64')
}

/**
 * Read 16-bit signed little-endian PCM into normalized floats.
 *
 * Cloud TTS returns LINEAR16 wrapped in a RIFF header, so skip to the `data`
 * chunk when one is present rather than assuming a fixed offset.
 */
function pcmToFloats(buffer: Buffer): Float32Array {
  let offset = 0

  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    let cursor = 12
    while (cursor + 8 <= buffer.length) {
      const chunkId = buffer.toString('ascii', cursor, cursor + 4)
      const chunkSize = buffer.readUInt32LE(cursor + 4)
      if (chunkId === 'data') {
        offset = cursor + 8
        break
      }
      cursor += 8 + chunkSize + (chunkSize % 2)
    }
  }

  const sampleCount = Math.floor((buffer.length - offset) / 2)
  const samples = new Float32Array(sampleCount)
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = buffer.readInt16LE(offset + i * 2) / 32768
  }
  return samples
}

function rms(frame: Float32Array): number {
  let sum = 0
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
  return Math.sqrt(sum / frame.length)
}

/**
 * Estimate F0 for one frame by normalized autocorrelation.
 *
 * Only lags inside the human range are searched, and the peak must clear
 * `MIN_PERIODICITY` relative to the frame's own energy, which rejects unvoiced
 * consonants and room noise. Returns null when the frame is not voiced.
 */
function estimateF0(frame: Float32Array, sampleRate: number): number | null {
  const mean = frame.reduce((acc, v) => acc + v, 0) / frame.length
  const centered = new Float32Array(frame.length)
  for (let i = 0; i < frame.length; i++) centered[i] = frame[i] - mean

  let energy = 0
  for (let i = 0; i < centered.length; i++) energy += centered[i] * centered[i]
  if (energy === 0) return null

  const minLag = Math.floor(sampleRate / MAX_F0_HZ)
  const maxLag = Math.min(Math.floor(sampleRate / MIN_F0_HZ), centered.length - 1)
  if (maxLag <= minLag) return null

  let bestLag = -1
  let bestScore = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    let correlation = 0
    for (let i = 0; i + lag < centered.length; i++) {
      correlation += centered[i] * centered[i + lag]
    }
    const score = correlation / energy
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }

  if (bestLag < 0 || bestScore < MIN_PERIODICITY) return null

  // Parabolic interpolation around the peak recovers sub-sample precision,
  // which matters because one sample of lag is several Hz at these pitches.
  const refined = refinePeak(centered, energy, bestLag, minLag, maxLag)
  return sampleRate / refined
}

function refinePeak(
  signal: Float32Array,
  energy: number,
  lag: number,
  minLag: number,
  maxLag: number
): number {
  if (lag <= minLag || lag >= maxLag) return lag

  const at = (l: number) => {
    let correlation = 0
    for (let i = 0; i + l < signal.length; i++) correlation += signal[i] * signal[i + l]
    return correlation / energy
  }

  const prev = at(lag - 1)
  const curr = at(lag)
  const next = at(lag + 1)
  const denominator = 2 * (2 * curr - prev - next)
  if (denominator === 0) return lag
  return lag + (next - prev) / denominator
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const index = (sorted.length - 1) * fraction
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

/**
 * Track pitch across the whole utterance and summarize it.
 *
 * The median resists the octave errors autocorrelation occasionally makes on a
 * single frame, and the 10th percentile is a better "pitch floor" than the
 * minimum for the same reason.
 */
export function measurePitch(
  samples: Float32Array,
  sampleRate = SAMPLE_RATE_HZ
): MeasuredEntry | null {
  const frameSize = Math.floor((FRAME_MS / 1000) * sampleRate)
  const hopSize = Math.floor((HOP_MS / 1000) * sampleRate)
  const estimates: number[] = []

  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const frame = samples.subarray(start, start + frameSize)
    if (rms(frame) < SILENCE_RMS) continue
    const f0 = estimateF0(frame, sampleRate)
    if (f0 !== null && f0 >= MIN_F0_HZ && f0 <= MAX_F0_HZ) estimates.push(f0)
  }

  // Too few voiced frames means the measurement is not worth writing down.
  if (estimates.length < 10) return null

  estimates.sort((a, b) => a - b)
  return {
    medianF0Hz: Math.round(percentile(estimates, 0.5) * 10) / 10,
    pitchFloorHz: Math.round(percentile(estimates, 0.1) * 10) / 10,
    voicedFrames: estimates.length,
  }
}

async function readExisting(): Promise<MeasuredFile> {
  try {
    const raw = await readFile(OUTPUT_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<MeasuredFile>
    return {
      generatedAt: parsed.generatedAt ?? null,
      model: parsed.model ?? null,
      sampleText: parsed.sampleText ?? null,
      voices: parsed.voices ?? {},
    }
  } catch {
    return { generatedAt: null, model: null, sampleText: null, voices: {} }
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  const selected = GEMINI_VOICE_CATALOG.filter((voice) => {
    if (args.voices.length === 0) return true
    const name = voice.id.replace(/^gemini-/, '')
    return args.voices.some((requested) => requested.toLowerCase() === name.toLowerCase())
  })

  if (selected.length === 0) {
    console.error(`No catalog voices matched: ${args.voices.join(', ')}`)
    process.exit(1)
  }

  if (args.dryRun) {
    console.log(`Would calibrate ${selected.length} voice(s) with model ${args.model}:`)
    for (const voice of selected) console.log(`  ${voice.id} (${voice.officialLabel})`)
    console.log(`\nSample text: ${SAMPLE_TEXT}`)
    console.log(`Output: ${OUTPUT_PATH}`)
    return
  }

  const apiKey = process.env.GOOGLE_API_KEY?.trim()
  if (!apiKey) {
    console.error('GOOGLE_API_KEY is required. Export it and re-run.')
    process.exit(1)
  }

  const existing = await readExisting()
  const measured: Record<string, MeasuredEntry> = { ...existing.voices }
  const failures: string[] = []

  for (const [index, voice] of selected.entries()) {
    const voiceName = voice.id.replace(/^gemini-/, '')
    const position = `${index + 1}/${selected.length}`

    try {
      const audio = await synthesizeLinear16(voiceName, args.model, apiKey)
      const result = measurePitch(pcmToFloats(audio))

      if (!result) {
        failures.push(`${voiceName} (too few voiced frames)`)
        console.warn(`  ${position} ${voiceName}: not enough voiced audio to measure`)
        continue
      }

      measured[voice.id] = result
      console.log(
        `  ${position} ${voiceName.padEnd(14)} ${voice.officialLabel.padEnd(14)} ` +
          `median ${result.medianF0Hz.toFixed(1)} Hz  floor ${result.pitchFloorHz.toFixed(1)} Hz  ` +
          `(${result.voicedFrames} frames)`
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${voiceName}: ${message}`)
      console.warn(`  ${position} ${voiceName}: ${message}`)
    }
  }

  if (Object.keys(measured).length === 0) {
    console.error('\nNo voices were measured; leaving the catalog overlay untouched.')
    process.exit(1)
  }

  const output: MeasuredFile = {
    generatedAt: new Date().toISOString(),
    model: args.model,
    sampleText: SAMPLE_TEXT,
    voices: Object.fromEntries(
      Object.entries(measured).sort(([a], [b]) => a.localeCompare(b))
    ),
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(`\nWrote ${Object.keys(output.voices).length} measurement(s) to ${OUTPUT_PATH}`)

  if (failures.length > 0) {
    console.warn(`\n${failures.length} voice(s) could not be measured:`)
    for (const failure of failures) console.warn(`  ${failure}`)
  }
}

// Only run when invoked directly, so the pitch tracker can be unit tested.
if (process.argv[1] && /calibrate-gemini-voices\.[cm]?ts$/.test(process.argv[1])) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
