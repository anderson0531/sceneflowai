import { spawn } from 'child_process'
import { resolveFfmpegBinary } from '@/lib/ffmpeg/resolveFfmpegBinary'

/**
 * Run ffmpeg with explicit binary resolution and surfaced stderr on failure.
 */
export function runFfmpeg(args: string[]): Promise<void> {
  const ffmpegBin = resolveFfmpegBinary()

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('error', (err) => {
      reject(err)
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`ffmpeg failed with code ${code}: ${stderr.trim() || 'unknown error'}`))
    })
  })
}

/**
 * Inspect container/stream metadata of a local media file using `ffmpeg -hide_banner -i`.
 * Avoids bundling a separate 80MB `ffprobe-static` binary in Vercel Functions.
 */
export function inspectMediaWithFfmpeg(filePath: string): Promise<string> {
  const ffmpegBin = resolveFfmpegBinary()

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin, ['-hide_banner', '-i', filePath], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('error', (err) => {
      reject(err)
    })

    proc.on('close', () => {
      resolve(stderr)
    })
  })
}
