/**
 * Server-side video duration via ffprobe (when available).
 * Returns null on failure (e.g. Vercel without ffprobe).
 */

import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

async function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let ffprobePath = 'ffprobe'
    try {
      const ffprobeStatic = require('ffprobe-static')
      ffprobePath = ffprobeStatic.path
    } catch {
      // system ffprobe
    }

    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]

    const proc = spawn(ffprobePath, args)
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
    })

    const t = setTimeout(() => {
      proc.kill('SIGKILL')
      reject(new Error('ffprobe timeout'))
    }, 12_000)

    proc.on('close', (code) => {
      clearTimeout(t)
      if (code !== 0) {
        reject(new Error(`ffprobe exit ${code}: ${stderr}`))
        return
      }
      const duration = parseFloat(stdout.trim())
      if (Number.isNaN(duration)) {
        reject(new Error(`bad duration: ${stdout}`))
        return
      }
      resolve(duration)
    })

    proc.on('error', (err) => {
      clearTimeout(t)
      reject(err)
    })
  })
}

/**
 * Best-effort MP4/WebM duration from an in-memory buffer.
 */
export async function getVideoDurationFromBuffer(buffer: Buffer): Promise<number | null> {
  const tempPath = join(tmpdir(), `veo-out-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`)
  try {
    writeFileSync(tempPath, buffer)
    const sec = await probeDuration(tempPath)
    return sec
  } catch (e) {
    console.warn('[Video Duration] ffprobe unavailable or failed:', e instanceof Error ? e.message : e)
    return null
  } finally {
    try {
      unlinkSync(tempPath)
    } catch {
      // ignore
    }
  }
}
