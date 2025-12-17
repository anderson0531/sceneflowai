/**
 * Client-side video frame extraction utilities
 * 
 * Uses HTML5 Canvas API to extract frames from video elements.
 * This is used as a fallback when server-side FFmpeg is unavailable.
 */

/**
 * Extract a frame from a video at a specific time
 * @param videoUrl - URL of the video
 * @param timeSeconds - Time in seconds to extract frame (use -1 for last frame)
 * @returns Base64 encoded JPEG image
 */
export async function extractVideoFrame(
  videoUrl: string,
  timeSeconds: number = -1
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    
    const cleanup = () => {
      video.remove()
    }
    
    video.onloadedmetadata = () => {
      // If timeSeconds is -1, seek to near the end
      const targetTime = timeSeconds < 0 
        ? Math.max(0, video.duration - 0.1) // 0.1s before end
        : Math.min(timeSeconds, video.duration)
      
      video.currentTime = targetTime
    }
    
    video.onseeked = () => {
      try {
        // Create canvas matching video dimensions
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          reject(new Error('Could not get canvas context'))
          return
        }
        
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Convert to base64 JPEG
        const base64 = canvas.toDataURL('image/jpeg', 0.9)
        
        cleanup()
        resolve(base64)
      } catch (error) {
        cleanup()
        reject(error)
      }
    }
    
    video.onerror = () => {
      cleanup()
      reject(new Error(`Failed to load video: ${video.error?.message || 'Unknown error'}`))
    }
    
    // Set timeout for loading
    setTimeout(() => {
      cleanup()
      reject(new Error('Video load timeout'))
    }, 30000)
    
    video.src = videoUrl
    video.load()
  })
}

/**
 * Extract the last frame from a video
 * @param videoUrl - URL of the video
 * @returns Base64 encoded JPEG image
 */
export async function extractLastFrame(videoUrl: string): Promise<string> {
  return extractVideoFrame(videoUrl, -1)
}

/**
 * Extract a thumbnail from a video (first frame or middle)
 * @param videoUrl - URL of the video
 * @param position - 'start', 'middle', or 'end'
 * @returns Base64 encoded JPEG image
 */
export async function extractThumbnail(
  videoUrl: string,
  position: 'start' | 'middle' | 'end' = 'middle'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    
    const cleanup = () => {
      video.remove()
    }
    
    video.onloadedmetadata = () => {
      let targetTime: number
      switch (position) {
        case 'start':
          targetTime = 0.1
          break
        case 'end':
          targetTime = Math.max(0, video.duration - 0.1)
          break
        case 'middle':
        default:
          targetTime = video.duration / 2
          break
      }
      
      video.currentTime = targetTime
    }
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        // Use smaller dimensions for thumbnails
        const scale = Math.min(1, 320 / video.videoWidth)
        canvas.width = Math.floor(video.videoWidth * scale)
        canvas.height = Math.floor(video.videoHeight * scale)
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          reject(new Error('Could not get canvas context'))
          return
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const base64 = canvas.toDataURL('image/jpeg', 0.8)
        
        cleanup()
        resolve(base64)
      } catch (error) {
        cleanup()
        reject(error)
      }
    }
    
    video.onerror = () => {
      cleanup()
      reject(new Error(`Failed to load video: ${video.error?.message || 'Unknown error'}`))
    }
    
    setTimeout(() => {
      cleanup()
      reject(new Error('Video load timeout'))
    }, 30000)
    
    video.src = videoUrl
    video.load()
  })
}

/**
 * Upload a base64 image to the server for storage
 * Uses dedicated /api/segments/upload-frame endpoint for client-side frame extraction
 * @param base64Image - Base64 encoded image
 * @param filename - Desired filename
 * @returns URL of the uploaded image
 */
export async function uploadFrameToServer(
  base64Image: string,
  filename: string
): Promise<string> {
  const response = await fetch('/api/segments/upload-frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      image: base64Image,
      filename,
    }),
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error('[uploadFrameToServer] Upload failed:', response.status, errorData)
    throw new Error(`Failed to upload frame: ${errorData.error || response.statusText}`)
  }
  
  const data = await response.json()
  return data.url
}

/**
 * Extract and upload last frame from a video
 * Client-side alternative to server-side FFmpeg extraction
 * 
 * @param videoUrl - URL of the video
 * @param segmentId - Segment ID for naming
 * @returns URL of the uploaded frame
 */
export async function extractAndUploadLastFrame(
  videoUrl: string,
  segmentId: string
): Promise<string> {
  const base64 = await extractLastFrame(videoUrl)
  const url = await uploadFrameToServer(base64, `segments/${segmentId}/last_frame.jpg`)
  return url
}
