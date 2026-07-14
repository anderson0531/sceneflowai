/**
 * Split remote audio into fixed-duration chunks for multi-pass Kling lip-sync.
 */

import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}

export async function downloadToTemp(url: string, ext: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download media (${res.status})`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const filePath = join(tmpdir(), `sf-lipsync-${randomUUID()}.${ext}`)
  await fs.writeFile(filePath, buf)
  return filePath
}

export async function splitAudioFileToChunks(
  inputPath: string,
  chunkSeconds: number
): Promise<string[]> {
  const outDir = join(tmpdir(), `sf-lipsync-chunks-${randomUUID()}`)
  await fs.mkdir(outDir, { recursive: true })
  const pattern = join(outDir, 'chunk-%03d.mp3')

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-f',
        'segment',
        '-segment_time',
        String(chunkSeconds),
        '-reset_timestamps',
        '1',
        '-c:a',
        'libmp3lame',
      ])
      .output(pattern)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })

  const files = await fs.readdir(outDir)
  const chunks = files
    .filter((f) => f.startsWith('chunk-') && f.endsWith('.mp3'))
    .sort()
    .map((f) => join(outDir, f))

  if (chunks.length === 0) {
    return [inputPath]
  }
  return chunks
}

export async function cleanupTempPaths(paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      await fs.unlink(p)
    } catch {
      // ignore
    }
  }
}
