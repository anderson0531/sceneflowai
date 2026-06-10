import { spawn } from 'child_process'
import { resolveFfmpegBinary } from '@/lib/ffmpeg/resolveFfmpegBinary'

/**
 * Run ffmpeg with explicit binary resolution and surfaced stderr on failure.
 */
export function runFfmpeg(args: string[]): Promise<void> {
  const ffmpegBin = resolveFfmpegBinary()

  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegBin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    process.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    process.on('error', (err) => {
      reject(err)
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`ffmpeg failed with code ${code}: ${stderr.trim() || 'unknown error'}`))
    })
  })
}
