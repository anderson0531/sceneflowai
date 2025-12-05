/**
 * Server-side Audio Duration Helper
 * 
 * Get MP3 duration from audio buffer using ffprobe
 */

import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Get audio duration from a Buffer using ffprobe
 * Falls back to estimation if ffprobe is not available
 */
export async function getAudioDurationFromBuffer(buffer: Buffer, estimatedWordCount?: number): Promise<number> {
  const tempPath = join(tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`)
  
  try {
    // Write buffer to temp file
    writeFileSync(tempPath, buffer)
    
    // Try to get duration using ffprobe
    const duration = await getAudioDurationWithFFprobe(tempPath)
    return duration
  } catch (error) {
    console.warn('[Audio Duration] FFprobe failed, using estimation:', error)
    // Fallback: estimate based on word count or buffer size
    if (estimatedWordCount) {
      // ~150 words per minute
      return (estimatedWordCount / 150) * 60
    }
    // Rough estimate: MP3 at 128kbps = 16KB per second
    return buffer.length / (16 * 1024)
  } finally {
    // Clean up temp file
    try {
      unlinkSync(tempPath)
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get audio duration using ffprobe
 */
async function getAudioDurationWithFFprobe(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Try to use ffprobe-static first
    let ffprobePath = 'ffprobe'
    try {
      const ffprobeStatic = require('ffprobe-static')
      ffprobePath = ffprobeStatic.path
    } catch {
      // Use system ffprobe
    }

    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]

    const process = spawn(ffprobePath, args)
    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`))
        return
      }

      const duration = parseFloat(stdout.trim())
      if (isNaN(duration)) {
        reject(new Error(`Could not parse duration from ffprobe output: ${stdout}`))
        return
      }

      resolve(duration)
    })

    process.on('error', (error) => {
      reject(error)
    })

    // Timeout after 10 seconds
    setTimeout(() => {
      process.kill()
      reject(new Error('ffprobe timed out'))
    }, 10000)
  })
}

/**
 * Estimate audio duration from text (fallback)
 * Based on average speaking rate of ~150 words per minute
 */
export function estimateAudioDuration(text: string): number {
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
  // ~150 words per minute = 2.5 words per second
  return wordCount / 2.5
}
