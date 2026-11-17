/**
 * Server-side video duration helper.
 * Parses ISO-BMFF / MP4 `mvhd` atom duration directly in memory first (works on
 * Vercel serverless with zero binaries or temp files), then falls back to local
 * system `ffprobe` in non-Vercel environments.
 *
 * IMPORTANT: Avoid dynamic eval-based requires here — Turbopack NFT treats dynamic
 * eval calls + child_process spawns as a whole-project filesystem trace,
 * which swept 187MB+ of static repo files into serverless functions.
 */

import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Pure-JS ISO-BMFF / MP4 `mvhd` duration parser (supports version 0 32-bit and version 1 64-bit).
 */
export function parseMp4DurationSeconds(buffer: Buffer): number | null {
  const scanBoxes = (start: number, end: number): number | null => {
    let offset = start
    while (offset + 8 <= end) {
      let boxSize = buffer.readUInt32BE(offset)
      const boxType = buffer.toString('ascii', offset + 4, offset + 8)
      let headerSize = 8

      if (boxSize === 1) {
        if (offset + 16 > end) break
        const hi = buffer.readUInt32BE(offset + 8)
        const lo = buffer.readUInt32BE(offset + 12)
        boxSize = hi * 4294967296 + lo
        headerSize = 16
      } else if (boxSize === 0) {
        boxSize = end - offset
      }

      if (boxSize < headerSize || offset + boxSize > end) {
        break
      }

      if (boxType === 'moov') {
        const inner = scanBoxes(offset + headerSize, offset + boxSize)
        if (inner != null) return inner
      } else if (boxType === 'mvhd') {
        const payloadOffset = offset + headerSize
        if (payloadOffset + 20 <= offset + boxSize) {
          const version = buffer.readUInt8(payloadOffset)
          if (version === 0 && payloadOffset + 20 <= offset + boxSize) {
            const timescale = buffer.readUInt32BE(payloadOffset + 12)
            const duration = buffer.readUInt32BE(payloadOffset + 16)
            if (timescale > 0 && duration > 0 && duration !== 0xffffffff) {
              return duration / timescale
            }
          } else if (version === 1 && payloadOffset + 32 <= offset + boxSize) {
            const timescale = buffer.readUInt32BE(payloadOffset + 20)
            const durHi = buffer.readUInt32BE(payloadOffset + 24)
            const durLo = buffer.readUInt32BE(payloadOffset + 28)
            const duration = durHi * 4294967296 + durLo
            if (timescale > 0 && duration > 0) {
              return duration / timescale
            }
          }
        }
      }

      offset += boxSize
    }
    return null
  }

  try {
    return scanBoxes(0, buffer.length)
  } catch {
    return null
  }
}

async function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobePath = process.env.FFPROBE_BIN?.trim() || 'ffprobe'

    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]

    const proc = spawn(/* turbopackIgnore: true */ ffprobePath, args)
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
  const fromMp4 = parseMp4DurationSeconds(buffer)
  if (fromMp4 != null && Number.isFinite(fromMp4) && fromMp4 > 0) {
    return fromMp4
  }

  if (process.env.VERCEL) {
    return null
  }

  const tempPath = join(
    /* turbopackIgnore: true */ tmpdir(),
    `veo-out-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`
  )
  try {
    writeFileSync(/* turbopackIgnore: true */ tempPath, buffer)
    const sec = await probeDuration(tempPath)
    return sec
  } catch (e) {
    console.warn('[Video Duration] ffprobe unavailable or failed:', e instanceof Error ? e.message : e)
    return null
  } finally {
    try {
      unlinkSync(/* turbopackIgnore: true */ tempPath)
    } catch {
      // ignore
    }
  }
}
