/**
 * Server-side Audio Duration Helper
 * 
 * Get MP3 duration from audio buffer using ffprobe
 * Falls back to buffer-size estimation for serverless environments (Vercel)
 */

import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// Languages that don't use spaces between words (CJK + Southeast Asian)
// Word count estimation is BROKEN for these languages
const NON_SPACE_LANGUAGES = ['th', 'zh', 'ja', 'ko', 'lo', 'km', 'my', 'vi']

/**
 * Get audio duration from a Buffer using ffprobe
 * Falls back to buffer-size estimation if ffprobe is not available
 * 
 * IMPORTANT: Word count estimation is broken for Thai/Chinese/Japanese/Korean
 * because these languages don't use spaces. Buffer size is the reliable fallback.
 * 
 * @param buffer - MP3 audio buffer
 * @param estimatedWordCount - Optional word count (NOT reliable for non-space languages)
 * @param language - ISO language code (e.g., 'th', 'en') for smart fallback
 */
export async function getAudioDurationFromBuffer(
  buffer: Buffer, 
  estimatedWordCount?: number,
  language: string = 'en'
): Promise<number> {
  const tempPath = join(tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`)
  
  try {
    // Write buffer to temp file
    writeFileSync(tempPath, buffer)
    
    // Try to get duration using ffprobe
    const duration = await getAudioDurationWithFFprobe(tempPath)
    console.log('[Audio Duration] FFprobe duration:', duration.toFixed(2), 'seconds')
    return duration
  } catch (error) {
    console.warn('[Audio Duration] FFprobe failed, using buffer-size estimation:', error)
    
    // PRIMARY FALLBACK: Estimate from buffer size (works for ALL languages!)
    // This is the most reliable method when ffprobe is unavailable (e.g., Vercel serverless).
    // MP3 bitrates used by ElevenLabs:
    // - 128kbps (English) = 16,000 bytes per second
    // - 192kbps (non-English high quality) = 24,000 bytes per second
    const isHighQualityLanguage = NON_SPACE_LANGUAGES.includes(language) || language !== 'en'
    const bytesPerSecond = isHighQualityLanguage ? 24000 : 16000
    const bufferBasedDuration = buffer.length / bytesPerSecond
    
    console.log('[Audio Duration] Buffer-based estimate:', {
      bufferBytes: buffer.length,
      bytesPerSecond,
      duration: bufferBasedDuration.toFixed(2),
      language
    })
    
    // Validate the estimate is reasonable (at least 0.5 seconds)
    if (bufferBasedDuration >= 0.5) {
      return bufferBasedDuration
    }
    
    // SECONDARY FALLBACK: Word count (ONLY for space-delimited languages like English)
    if (!NON_SPACE_LANGUAGES.includes(language) && estimatedWordCount && estimatedWordCount > 5) {
      // ~150 words per minute = 2.5 words per second
      const wordBasedDuration = estimatedWordCount / 2.5
      console.log('[Audio Duration] Word-based fallback:', wordBasedDuration.toFixed(2), 'seconds')
      return wordBasedDuration
    }
    
    // LAST RESORT: Minimum 1 second or buffer-based
    return Math.max(1, buffer.length / (16 * 1024))
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
 * Estimate audio duration from text
 * Uses character count for non-space languages (Thai, Chinese, Japanese, Korean)
 * Uses word count for space-delimited languages (English, Spanish, etc.)
 * 
 * @param text - The text to estimate duration for
 * @param language - ISO language code (e.g., 'th', 'en')
 */
export function estimateAudioDuration(text: string, language: string = 'en'): number {
  // For non-space languages, use character-based estimation
  if (NON_SPACE_LANGUAGES.includes(language)) {
    // Thai, Chinese, Japanese, Korean: ~5-7 characters per second spoken
    const charCount = text.length
    const duration = charCount / 6
    console.log('[Audio Duration] Character-based estimate:', {
      charCount,
      duration: duration.toFixed(2),
      language
    })
    return Math.max(1, duration)
  }
  
  // For space-delimited languages, use word count
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
  // ~150 words per minute = 2.5 words per second
  const duration = wordCount / 2.5
  return Math.max(1, duration)
}
