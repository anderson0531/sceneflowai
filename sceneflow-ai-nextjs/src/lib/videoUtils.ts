/**
 * Video utilities for frame extraction and video processing
 * 
 * NOTE: FFmpeg is not available in Vercel serverless environment.
 * Server-side extraction will be skipped, and client-side extraction
 * should be used instead when needed.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { uploadImageToBlob } from './storage/blob'
import * as fs from 'fs'
import * as path from 'path'

const execPromise = promisify(exec)

// Cache the FFmpeg availability check
let ffmpegAvailable: boolean | null = null

/**
 * Check if FFmpeg is available in the system
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== null) {
    return ffmpegAvailable
  }
  
  try {
    await execPromise('which ffmpeg')
    ffmpegAvailable = true
  } catch {
    ffmpegAvailable = false
    console.log('[Video Utils] FFmpeg not available - server-side frame extraction will be skipped')
  }
  
  return ffmpegAvailable
}

/**
 * Extract the last frame from a video and upload it to cloud storage
 * 
 * @param videoUrl - URL of the video file
 * @param segmentId - Segment ID for naming the output file
 * @returns URL of the uploaded frame image, or null if extraction failed/unavailable
 * 
 * NOTE: This requires FFmpeg which is not available on Vercel.
 * Returns null gracefully when FFmpeg is unavailable.
 */
export async function extractAndStoreLastFrame(
  videoUrl: string,
  segmentId: string
): Promise<string | null> {
  // Check if FFmpeg is available first
  const hasFFmpeg = await checkFFmpegAvailable()
  if (!hasFFmpeg) {
    console.log('[Video Utils] Skipping last frame extraction - FFmpeg not available')
    console.log('[Video Utils] Client-side extraction will be used when needed')
    return null
  }
  
  try {
    // Create temporary directory for processing
    const tmpDir = path.join('/tmp', `frames_${segmentId}_${Date.now()}`)
    await fs.promises.mkdir(tmpDir, { recursive: true })

    const outputPath = path.join(tmpDir, `last_frame_${segmentId}.jpg`)

    // Use FFmpeg to extract a frame near the end of the video
    // -sseof -1 seeks to 1 second before the end of the file
    // -vframes 1 extracts exactly 1 frame
    const command = `ffmpeg -i "${videoUrl}" -sseof -1 -vframes 1 "${outputPath}" -y`

    console.log('[Video Utils] Extracting last frame:', command)

    try {
      await execPromise(command)
    } catch (error: any) {
      // If sseof fails (some formats don't support it), try alternative method
      console.warn('[Video Utils] sseof method failed, trying alternative:', error.message)
      
      // Alternative: Get video duration and extract frame near end
      const durationCommand = `ffmpeg -i "${videoUrl}" 2>&1 | grep "Duration" | cut -d ' ' -f 4 | sed s/,//`
      const durationOutput = await execPromise(durationCommand)
      const duration = parseDuration(durationOutput.stdout.trim())
      
      if (duration > 0) {
        // Extract frame 0.5 seconds before the end
        const seekTime = Math.max(0, duration - 0.5)
        const altCommand = `ffmpeg -i "${videoUrl}" -ss ${seekTime} -vframes 1 "${outputPath}" -y`
        await execPromise(altCommand)
      } else {
        throw new Error('Could not determine video duration')
      }
    }

    // Check if file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('Frame extraction failed: output file not created')
    }

    // Read the image file and convert to base64
    const imageBuffer = await fs.promises.readFile(outputPath)
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`

    // Upload to cloud storage
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `segments/${segmentId}/last_frame.jpg`
    )

    // Clean up temporary files
    try {
      await fs.promises.unlink(outputPath)
      await fs.promises.rmdir(tmpDir)
    } catch (cleanupError) {
      console.warn('[Video Utils] Failed to clean up temp files:', cleanupError)
    }

    console.log('[Video Utils] Last frame extracted and uploaded:', imageUrl)
    return imageUrl
  } catch (error) {
    console.error('[Video Utils] Error extracting last frame:', error)
    return null
  }
}

/**
 * Parse duration string (HH:MM:SS.mmm) to seconds
 */
function parseDuration(durationStr: string): number {
  const parts = durationStr.split(':')
  if (parts.length !== 3) return 0
  
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  const seconds = parseFloat(parts[2]) || 0
  
  return hours * 3600 + minutes * 60 + seconds
}

