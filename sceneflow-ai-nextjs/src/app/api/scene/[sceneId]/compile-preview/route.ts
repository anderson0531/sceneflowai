import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import { uploadAssetToBlob } from '@/lib/storage/upload'

export const maxDuration = 600 // 10 minutes for compilation
export const runtime = 'nodejs'

const execPromise = promisify(exec)

interface CompilePreviewRequest {
  projectId: string
  segments: Array<{
    segmentId: string
    sequenceIndex: number
    startTime: number
    endTime: number
    activeAssetUrl: string | null
    assetType: 'video' | 'image' | null
    duration: number
  }>
  audioTracks?: {
    narration?: { url: string; startTime: number; duration: number }
    dialogue?: Array<{ url: string; startTime: number; duration: number }>
    sfx?: Array<{ url: string; startTime: number; duration: number }>
    music?: { url: string; startTime: number; duration: number }
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params
    const body: CompilePreviewRequest = await req.json()
    const { projectId, segments, audioTracks } = body

    if (!projectId || !segments || segments.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and segments' },
        { status: 400 }
      )
    }

    console.log('[Preview Compilation] Compiling preview for scene:', sceneId, 'Segments:', segments.length)

    // Create temporary directory for processing
    const tmpDir = path.join('/tmp', `preview_${sceneId}_${Date.now()}`)
    await fs.promises.mkdir(tmpDir, { recursive: true })

    try {
      // Download and prepare all assets
      const videoFiles: string[] = []
      const imageFiles: Array<{ path: string; duration: number }> = []
      const audioFiles: Array<{ path: string; startTime: number }> = []

      // Process visual segments
      for (const segment of segments) {
        if (!segment.activeAssetUrl) continue

        const segmentPath = path.join(tmpDir, `segment_${segment.sequenceIndex}.${segment.assetType === 'video' ? 'mp4' : 'jpg'}`)

        // Download asset
        const response = await fetch(segment.activeAssetUrl)
        if (!response.ok) {
          throw new Error(`Failed to download segment ${segment.sequenceIndex}`)
        }
        const buffer = Buffer.from(await response.arrayBuffer())
        await fs.promises.writeFile(segmentPath, buffer)

        if (segment.assetType === 'video') {
          videoFiles.push(segmentPath)
        } else if (segment.assetType === 'image') {
          // Images need to be converted to video loops
          imageFiles.push({ path: segmentPath, duration: segment.duration || 5 })
        }
      }

      // Download audio tracks
      if (audioTracks) {
        if (audioTracks.narration?.url) {
          const audioPath = path.join(tmpDir, 'narration.mp3')
          const response = await fetch(audioTracks.narration.url)
          const buffer = Buffer.from(await response.arrayBuffer())
          await fs.promises.writeFile(audioPath, buffer)
          audioFiles.push({ path: audioPath, startTime: audioTracks.narration.startTime })
        }

        if (audioTracks.dialogue) {
          for (let i = 0; i < audioTracks.dialogue.length; i++) {
            const dialogue = audioTracks.dialogue[i]
            if (dialogue.url) {
              const audioPath = path.join(tmpDir, `dialogue_${i}.mp3`)
              const response = await fetch(dialogue.url)
              const buffer = Buffer.from(await response.arrayBuffer())
              await fs.promises.writeFile(audioPath, buffer)
              audioFiles.push({ path: audioPath, startTime: dialogue.startTime })
            }
          }
        }

        if (audioTracks.sfx) {
          for (let i = 0; i < audioTracks.sfx.length; i++) {
            const sfx = audioTracks.sfx[i]
            if (sfx.url) {
              const audioPath = path.join(tmpDir, `sfx_${i}.mp3`)
              const response = await fetch(sfx.url)
              const buffer = Buffer.from(await response.arrayBuffer())
              await fs.promises.writeFile(audioPath, buffer)
              audioFiles.push({ path: audioPath, startTime: sfx.startTime })
            }
          }
        }

        if (audioTracks.music?.url) {
          const audioPath = path.join(tmpDir, 'music.mp3')
          const response = await fetch(audioTracks.music.url)
          const buffer = Buffer.from(await response.arrayBuffer())
          await fs.promises.writeFile(audioPath, buffer)
          audioFiles.push({ path: audioPath, startTime: audioTracks.music.startTime })
        }
      }

      // Build FFmpeg command
      const outputPath = path.join(tmpDir, 'preview.mp4')
      const ffmpegCommand = buildFFmpegCommand(videoFiles, imageFiles, audioFiles, outputPath)

      console.log('[Preview Compilation] Running FFmpeg command...')
      await execPromise(ffmpegCommand)

      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('FFmpeg compilation failed: output file not created')
      }

      // Upload compiled preview
      const videoBlob = await fs.promises.readFile(outputPath)
      // Convert Buffer to Blob for upload
      const videoBlobObj = new Blob([videoBlob], { type: 'video/mp4' })
      const previewUrl = await uploadAssetToBlob(
        videoBlobObj,
        `preview_${sceneId}_${Date.now()}.mp4`,
        projectId
      )

      // Clean up temporary files
      try {
        await fs.promises.rm(tmpDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.warn('[Preview Compilation] Failed to clean up temp files:', cleanupError)
      }

      return NextResponse.json({
        success: true,
        previewUrl,
        sceneId,
      })
    } catch (error: any) {
      // Clean up on error
      try {
        await fs.promises.rm(tmpDir, { recursive: true, force: true })
      } catch {}

      throw error
    }
  } catch (error: any) {
    console.error('[Preview Compilation] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to compile preview',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Build FFmpeg command to concatenate videos, convert images to video loops, and mix audio
 */
function buildFFmpegCommand(
  videoFiles: string[],
  imageFiles: Array<{ path: string; duration: number }>,
  audioFiles: Array<{ path: string; startTime: number }>,
  outputPath: string
): string {
  const inputs: string[] = []
  const videoFilters: string[] = []
  const audioFilters: string[] = []

  // Add video inputs
  videoFiles.forEach((file, idx) => {
    inputs.push(`-i "${file}"`)
  })

  // Add image inputs (will be converted to video loops)
  imageFiles.forEach((file, idx) => {
    inputs.push(`-loop 1 -t ${file.duration} -i "${file.path}"`)
  })

  // Add audio inputs
  audioFiles.forEach((file, idx) => {
    inputs.push(`-i "${file.path}"`)
  })

  // Build video concatenation filter
  const videoInputCount = videoFiles.length + imageFiles.length
  if (videoInputCount > 0) {
    const videoInputs = Array.from({ length: videoInputCount }, (_, i) => `[${i}:v]`).join('')
    videoFilters.push(`${videoInputs}concat=n=${videoInputCount}:v=1:a=0[vout]`)
  }

  // Build audio mixing filter with timing
  if (audioFiles.length > 0) {
    const audioInputs = audioFiles.map((_, idx) => {
      const videoInputCount = videoFiles.length + imageFiles.length
      const audioInputIndex = videoInputCount + idx
      return `[${audioInputIndex}:a]`
    }).join('')

    if (audioFiles.length === 1) {
      // Single audio track - just map it
      audioFilters.push(`${audioInputs}acopy[aout]`)
    } else {
      // Multiple audio tracks - mix them
      audioFilters.push(`${audioInputs}amix=inputs=${audioFiles.length}:duration=longest[aout]`)
    }
  }

  // Build filter complex
  const filterComplex = [...videoFilters, ...audioFilters].join('; ')

  // Build output mapping
  const outputMap = videoFilters.length > 0 ? '-map "[vout]"' : ''
  const audioMap = audioFilters.length > 0 ? '-map "[aout]"' : ''

  // Construct full command
  const command = [
    'ffmpeg',
    ...inputs,
    '-filter_complex',
    `"${filterComplex}"`,
    outputMap,
    audioMap,
    '-c:v libx264',
    '-preset medium',
    '-crf 23',
    '-c:a aac',
    '-b:a 192k',
    '-y',
    `"${outputPath}"`
  ].filter(Boolean).join(' ')

  return command
}

