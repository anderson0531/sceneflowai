import ffmpeg from 'fluent-ffmpeg'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'

try {
  const ffmpegStatic = eval('require')('ffmpeg-static')
  if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic)
  }
} catch {
  // Fallback to system ffmpeg
}

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

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioQuality(4)
        .format('mp3')
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath)
    })

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
