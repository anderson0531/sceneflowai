import { readFile, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { runFfmpeg } from '@/lib/ffmpeg/runFfmpeg'

/** Gemini 3.8 TTS returns WAV. Existing players and blob storage expect MP3. */
export async function transcodeWavToMp3(wav: Buffer): Promise<Buffer> {
  if (!wav.length) throw new Error('Designed voice audio was empty')

  const inputPath = join(tmpdir(), `${uuidv4()}_designed_voice.wav`)
  const outputPath = join(tmpdir(), `${uuidv4()}_designed_voice.mp3`)
  try {
    await writeFile(inputPath, wav)
    await runFfmpeg([
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-acodec',
      'libmp3lame',
      '-q:a',
      '4',
      '-f',
      'mp3',
      outputPath,
    ])
    const mp3 = await readFile(outputPath)
    if (!mp3.length) throw new Error('Designed voice MP3 was empty')
    return mp3
  } finally {
    await unlink(inputPath).catch(() => undefined)
    await unlink(outputPath).catch(() => undefined)
  }
}
