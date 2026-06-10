import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'
import { runFfmpeg } from '@/lib/ffmpeg/runFfmpeg'

/**
 * Extract the audio track from an MP4 buffer as MP3 (discards video).
 */
export async function extractAudioFromVideoBuffer(videoBuffer: Buffer): Promise<Buffer> {
  if (!videoBuffer.length) {
    throw new Error('Video buffer is empty')
  }

  const inputPath = join(tmpdir(), `${uuidv4()}_veo_sfx_in.mp4`)
  const outputPath = join(tmpdir(), `${uuidv4()}_veo_sfx_out.mp3`)

  try {
    await writeFile(inputPath, videoBuffer)

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

    const outputBuffer = await readFile(outputPath)
    if (!outputBuffer.length) {
      throw new Error('Extracted audio buffer is empty')
    }
    return outputBuffer
  } finally {
    try {
      await unlink(inputPath)
    } catch {
      /* ignore */
    }
    try {
      await unlink(outputPath)
    } catch {
      /* ignore */
    }
  }
}
