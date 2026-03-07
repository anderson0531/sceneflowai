/**
 * HeadlessRenderService - GCP Cloud Run headless browser video rendering
 * 
 * Provides deterministic 4K video rendering using Puppeteer + Chromium in a
 * headless GCP environment. Uses "Seek, Draw, Commit" frame-stepping for
 * guaranteed watermark rendering without race conditions.
 * 
 * Key Features:
 * - Frame-by-frame control (no dropped frames)
 * - Pre-installed fonts (Inter) for consistent watermarks
 * - Software GL rendering via SwiftShader
 * - Synchronous GPU flush before frame capture
 * - Direct GCS streaming for large files
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

import type { Browser, Page } from 'puppeteer-core'

// =============================================================================
// Types (mirrored from LocalRenderService for compatibility)
// =============================================================================

export interface HeadlessRenderSegment {
  segmentId: string
  assetUrl: string
  assetType: 'video' | 'image'
  startTime: number
  duration: number
  volume?: number
}

export interface HeadlessRenderAudioClip {
  url: string
  startTime: number
  duration: number
  volume: number
  type: 'narration' | 'dialogue' | 'music' | 'sfx'
}

export interface HeadlessRenderTextOverlay {
  id: string
  text: string
  subtext?: string
  position: { x: number; y: number; anchor: string }
  style: {
    fontFamily: string
    fontSize: number
    fontWeight: number
    color: string
    backgroundColor?: string
    backgroundOpacity?: number
    textShadow?: boolean
  }
  timing: {
    startTime: number
    duration: number
    fadeInMs: number
    fadeOutMs: number
  }
}

export interface HeadlessRenderWatermark {
  type: 'text' | 'image'
  text?: string
  imageUrl?: string
  anchor: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  padding: number
  textStyle: {
    fontFamily: string
    fontSize: number
    fontWeight: number
    color: string
    opacity: number
    textShadow?: boolean
  }
  imageStyle: {
    width: number
    opacity: number
  }
}

export interface HeadlessRenderConfig {
  segments: HeadlessRenderSegment[]
  audioClips: HeadlessRenderAudioClip[]
  textOverlays?: HeadlessRenderTextOverlay[]
  watermark?: HeadlessRenderWatermark
  resolution: '720p' | '1080p' | '4k'
  fps: number
  totalDuration: number
  outputBucket?: string
  outputPath?: string
}

export interface HeadlessRenderProgress {
  phase: 'preparing' | 'rendering' | 'encoding' | 'uploading' | 'complete' | 'error'
  progress: number
  currentFrame?: number
  totalFrames?: number
  error?: string
}

export type HeadlessRenderProgressCallback = (progress: HeadlessRenderProgress) => void

export interface HeadlessRenderResult {
  success: boolean
  gcsUrl?: string
  duration?: number
  frameCount?: number
  error?: string
}

// =============================================================================
// Constants
// =============================================================================

const RESOLUTIONS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
} as const

/**
 * Puppeteer launch flags optimized for headless video rendering
 * These prevent background throttling and ensure consistent frame capture
 */
export const PUPPETEER_LAUNCH_ARGS = [
  // Prevent frame drops when "tab" isn't active
  '--disable-background-timer-throttling',
  // Ensure requestAnimationFrame and manual frame requests work at full speed
  '--disable-raf-throttling',
  // Disable renderer backgrounding
  '--disable-renderer-backgrounding',
  // Software GL for getImageData sync (required for GPU-less GCP instances)
  '--use-gl=swiftshader',
  // Keep watermark colors consistent in headless mode
  '--force-color-profile=srgb',
  // Required for Docker environments
  '--no-sandbox',
  '--disable-setuid-sandbox',
  // Disable GPU hardware acceleration (use SwiftShader software rendering)
  '--disable-gpu',
  // Disable dev shm usage (Docker memory optimization)
  '--disable-dev-shm-usage',
  // Disable extensions
  '--disable-extensions',
  // Single process mode for better memory management
  '--single-process',
  // Disable background networking
  '--disable-background-networking',
  // Disable sync
  '--disable-sync',
  // Disable translate
  '--disable-translate',
  // Mute audio
  '--mute-audio',
  // Hide scrollbars
  '--hide-scrollbars',
  // Disable infobars
  '--disable-infobars',
]

// =============================================================================
// HeadlessRenderService Class
// =============================================================================

export class HeadlessRenderService {
  private browser: Browser | null = null
  private page: Page | null = null
  private isRendering = false
  private abortController: AbortController | null = null

  /**
   * Initialize the headless browser with optimized settings
   */
  async initialize(): Promise<void> {
    const puppeteer = await import('puppeteer-core')
    
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
    
    console.log('[HeadlessRender] Launching browser with executable:', executablePath)
    
    this.browser = await puppeteer.default.launch({
      executablePath,
      headless: true,
      args: PUPPETEER_LAUNCH_ARGS,
    })
    
    this.page = await this.browser.newPage()
    
    console.log('[HeadlessRender] Browser initialized successfully')
  }

  /**
   * Clean up browser resources
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {})
      this.page = null
    }
    if (this.browser) {
      await this.browser.close().catch(() => {})
      this.browser = null
    }
    console.log('[HeadlessRender] Browser resources cleaned up')
  }

  /**
   * Abort any in-progress render
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.isRendering = false
  }

  /**
   * Render video using "Seek, Draw, Commit" frame-stepping
   * 
   * This method:
   * 1. Sets up a canvas with the render configuration
   * 2. Steps through each frame at precise timestamps
   * 3. Draws video frame, overlays, and watermark
   * 4. Forces GPU sync with getImageData
   * 5. Captures frame to MediaRecorder
   * 6. Streams output to GCS
   */
  async render(
    config: HeadlessRenderConfig,
    onProgress?: HeadlessRenderProgressCallback
  ): Promise<HeadlessRenderResult> {
    if (this.isRendering) {
      return { success: false, error: 'Render already in progress' }
    }

    if (!this.page) {
      return { success: false, error: 'Browser not initialized. Call initialize() first.' }
    }

    this.isRendering = true
    this.abortController = new AbortController()
    const signal = this.abortController.signal

    try {
      onProgress?.({ phase: 'preparing', progress: 0 })

      const { width, height } = RESOLUTIONS[config.resolution]
      const totalFrames = Math.ceil(config.totalDuration * config.fps)
      const frameDuration = 1 / config.fps

      console.log(`[HeadlessRender] Starting render: ${width}x${height} @ ${config.fps}fps, ${totalFrames} frames`)

      // Set viewport to match render resolution
      await this.page.setViewport({ width, height })

      // Create the render page with canvas and video elements
      await this.page.setContent(this.generateRenderPageHTML(config, width, height))

      // Wait for assets to load
      onProgress?.({ phase: 'preparing', progress: 20 })
      await this.page.evaluate(async () => {
        // @ts-expect-error - waitForAssetsToLoad is defined in the page
        await window.waitForAssetsToLoad()
      })

      onProgress?.({ phase: 'preparing', progress: 40 })

      // Initialize MediaRecorder in the page
      const recordingPromise = this.page.evaluate(() => {
        return new Promise<string>((resolve, reject) => {
          // @ts-expect-error - startRecording is defined in the page
          window.startRecording(resolve, reject)
        })
      })

      onProgress?.({ phase: 'rendering', progress: 50 })

      // Frame-stepping render loop
      for (let frame = 0; frame < totalFrames; frame++) {
        if (signal.aborted) {
          throw new Error('Render aborted')
        }

        const currentTime = frame * frameDuration

        // Execute the "Seek, Draw, Commit" cycle
        await this.page.evaluate(async (time: number) => {
          // @ts-expect-error - renderFrame is defined in the page
          await window.renderFrame(time)
        }, currentTime)

        // Report progress every 10 frames
        if (frame % 10 === 0) {
          const progress = 50 + Math.round((frame / totalFrames) * 40)
          onProgress?.({
            phase: 'rendering',
            progress,
            currentFrame: frame,
            totalFrames,
          })
        }
      }

      // Stop recording and get the blob
      onProgress?.({ phase: 'encoding', progress: 92 })
      
      await this.page.evaluate(() => {
        // @ts-expect-error - stopRecording is defined in the page
        window.stopRecording()
      })

      // Wait for the recording to finish and get base64 data
      const base64Data = await recordingPromise

      onProgress?.({ phase: 'uploading', progress: 95 })

      // Upload to GCS if bucket is specified
      let gcsUrl: string | undefined
      if (config.outputBucket && config.outputPath) {
        gcsUrl = await this.uploadToGCS(base64Data, config.outputBucket, config.outputPath)
      }

      onProgress?.({ phase: 'complete', progress: 100 })

      return {
        success: true,
        gcsUrl,
        duration: config.totalDuration,
        frameCount: totalFrames,
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown render error'
      console.error('[HeadlessRender] Render failed:', errorMessage)
      onProgress?.({ phase: 'error', progress: 0, error: errorMessage })
      return { success: false, error: errorMessage }

    } finally {
      this.isRendering = false
      this.abortController = null
    }
  }

  /**
   * Generate the HTML page that will handle rendering
   * This page contains the canvas, video elements, and rendering logic
   */
  private generateRenderPageHTML(config: HeadlessRenderConfig, width: number, height: number): string {
    const configJson = JSON.stringify(config)
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: black; overflow: hidden; }
    #hidden-canvas, #output-canvas { display: none; }
  </style>
</head>
<body>
  <canvas id="hidden-canvas" width="${width}" height="${height}"></canvas>
  <canvas id="output-canvas" width="${width}" height="${height}"></canvas>
  
  <script>
    // Render configuration
    const config = ${configJson};
    const width = ${width};
    const height = ${height};
    
    // Canvas setup with double-buffer pattern
    const hiddenCanvas = document.getElementById('hidden-canvas');
    const outputCanvas = document.getElementById('output-canvas');
    const hiddenCtx = hiddenCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
    const outputCtx = outputCanvas.getContext('2d', { alpha: false, desynchronized: false });
    
    // Asset storage
    const videoElements = {};
    const imageElements = {};
    let watermarkImage = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    let resolveRecording = null;
    let rejectRecording = null;
    
    // Track for frame capture
    let stream = null;
    let canvasTrack = null;
    
    /**
     * Wait for all video and image assets to load
     */
    window.waitForAssetsToLoad = async function() {
      console.log('[Page] Loading assets...');
      
      const loadPromises = [];
      
      // Load video segments
      for (const segment of config.segments) {
        if (segment.assetType === 'video') {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.muted = true;
          video.preload = 'auto';
          video.src = segment.assetUrl;
          
          loadPromises.push(new Promise((resolve, reject) => {
            video.onloadeddata = () => {
              console.log('[Page] Video loaded:', segment.segmentId);
              resolve();
            };
            video.onerror = () => reject(new Error('Failed to load video: ' + segment.assetUrl));
          }));
          
          videoElements[segment.segmentId] = video;
        } else if (segment.assetType === 'image') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = segment.assetUrl;
          
          loadPromises.push(new Promise((resolve, reject) => {
            img.onload = () => {
              console.log('[Page] Image loaded:', segment.segmentId);
              resolve();
            };
            img.onerror = () => reject(new Error('Failed to load image: ' + segment.assetUrl));
          }));
          
          imageElements[segment.segmentId] = img;
        }
      }
      
      // Load watermark image if specified
      if (config.watermark?.type === 'image' && config.watermark.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = config.watermark.imageUrl;
        
        loadPromises.push(new Promise((resolve, reject) => {
          img.onload = () => {
            watermarkImage = img;
            console.log('[Page] Watermark image loaded');
            resolve();
          };
          img.onerror = () => reject(new Error('Failed to load watermark image'));
        }));
      }
      
      // Preload fonts
      if (document.fonts) {
        loadPromises.push(
          document.fonts.load('500 32px "Inter", Arial, sans-serif')
            .then(() => console.log('[Page] Inter font loaded'))
            .catch(() => console.warn('[Page] Inter font not available, using fallback'))
        );
      }
      
      await Promise.all(loadPromises);
      console.log('[Page] All assets loaded');
    };
    
    /**
     * Start MediaRecorder
     */
    window.startRecording = function(resolve, reject) {
      resolveRecording = resolve;
      rejectRecording = reject;
      recordedChunks = [];
      
      // Use captureStream(0) for manual frame capture
      stream = outputCanvas.captureStream(0);
      canvasTrack = stream.getVideoTracks()[0];
      
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: config.resolution === '4k' ? 20000000 : 8000000,
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.toString().split(',')[1];
          resolveRecording(base64);
        };
        reader.onerror = () => rejectRecording(new Error('Failed to read recording'));
        reader.readAsDataURL(blob);
      };
      
      mediaRecorder.start();
      console.log('[Page] MediaRecorder started');
    };
    
    /**
     * Stop MediaRecorder
     */
    window.stopRecording = function() {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('[Page] MediaRecorder stopped');
      }
    };
    
    /**
     * Render a single frame at the specified time
     * Implements "Seek, Draw, Commit" pattern
     */
    window.renderFrame = async function(currentTime) {
      // Step 1: SEEK - Find the active segment and seek to correct time
      let activeSegment = null;
      let localTime = 0;
      
      for (const segment of config.segments) {
        const segmentEnd = segment.startTime + segment.duration;
        if (currentTime >= segment.startTime && currentTime < segmentEnd) {
          activeSegment = segment;
          localTime = currentTime - segment.startTime;
          break;
        }
      }
      
      // Step 2: DRAW to hidden canvas
      // Clear hidden canvas
      hiddenCtx.fillStyle = '#000000';
      hiddenCtx.fillRect(0, 0, width, height);
      
      if (activeSegment) {
        if (activeSegment.assetType === 'video') {
          const video = videoElements[activeSegment.segmentId];
          if (video) {
            // Seek video to exact frame
            video.currentTime = localTime;
            
            // Wait for seek to complete
            await new Promise(resolve => {
              if (video.readyState >= 2) {
                resolve();
              } else {
                video.onseeked = resolve;
              }
            });
            
            // Draw video frame
            hiddenCtx.drawImage(video, 0, 0, width, height);
          }
        } else if (activeSegment.assetType === 'image') {
          const img = imageElements[activeSegment.segmentId];
          if (img) {
            hiddenCtx.drawImage(img, 0, 0, width, height);
          }
        }
      }
      
      // Step 3: Draw text overlays
      if (config.textOverlays) {
        drawTextOverlays(currentTime, config.textOverlays);
      }
      
      // Step 4: Draw watermark (always last/on top)
      if (config.watermark) {
        drawWatermark(config.watermark);
      }
      
      // Step 5: COMMIT - Atomic copy to output canvas
      outputCtx.drawImage(hiddenCanvas, 0, 0);
      
      // Step 6: SYNCHRONOUS FLUSH - Force GPU to complete all operations
      outputCtx.getImageData(0, 0, 1, 1);
      
      // Step 7: Request frame capture
      if (canvasTrack && canvasTrack.requestFrame) {
        canvasTrack.requestFrame();
      }
    };
    
    /**
     * Draw text overlays to hidden canvas
     */
    function drawTextOverlays(currentTime, overlays) {
      hiddenCtx.save();
      hiddenCtx.globalAlpha = 1.0;
      
      for (const overlay of overlays) {
        const { timing, style, position } = overlay;
        const endTime = timing.duration === -1 ? Infinity : timing.startTime + timing.duration;
        
        if (currentTime < timing.startTime || currentTime > endTime) continue;
        
        // Calculate opacity for fade
        let opacity = 1;
        const fadeInEnd = timing.startTime + timing.fadeInMs / 1000;
        const fadeOutStart = endTime - timing.fadeOutMs / 1000;
        
        if (currentTime < fadeInEnd) {
          opacity = (currentTime - timing.startTime) / (timing.fadeInMs / 1000);
        } else if (currentTime > fadeOutStart && timing.duration !== -1) {
          opacity = (endTime - currentTime) / (timing.fadeOutMs / 1000);
        }
        
        opacity = Math.max(0, Math.min(1, opacity));
        
        const x = (position.x / 100) * width;
        const y = (position.y / 100) * height;
        const fontSize = (style.fontSize / 100) * height;
        
        hiddenCtx.font = style.fontWeight + ' ' + fontSize + 'px "' + style.fontFamily + '", Arial, sans-serif';
        hiddenCtx.textBaseline = 'middle';
        
        if (position.anchor.includes('center')) hiddenCtx.textAlign = 'center';
        else if (position.anchor.includes('right')) hiddenCtx.textAlign = 'right';
        else hiddenCtx.textAlign = 'left';
        
        // Draw shadow if enabled
        if (style.textShadow) {
          hiddenCtx.fillStyle = '#000000';
          hiddenCtx.globalAlpha = opacity * 0.5;
          hiddenCtx.fillText(overlay.text, x + 2, y + 2);
        }
        
        // Draw text
        hiddenCtx.fillStyle = style.color;
        hiddenCtx.globalAlpha = opacity;
        hiddenCtx.fillText(overlay.text, x, y);
      }
      
      hiddenCtx.restore();
    }
    
    /**
     * Draw watermark to hidden canvas
     */
    function drawWatermark(watermark) {
      hiddenCtx.save();
      
      const { anchor, padding, type } = watermark;
      
      // Calculate position
      let x, y;
      
      if (anchor.includes('left')) x = padding;
      else if (anchor.includes('right')) x = width - padding;
      else x = width / 2;
      
      if (anchor.includes('top')) y = padding;
      else if (anchor.includes('bottom')) y = height - padding;
      else y = height / 2;
      
      if (type === 'text' && watermark.text) {
        const { textStyle } = watermark;
        const fontSize = (textStyle.fontSize / 100) * height;
        
        // Use Inter with fallback
        hiddenCtx.font = textStyle.fontWeight + ' ' + fontSize + 'px "Inter", "' + textStyle.fontFamily + '", Arial, sans-serif';
        hiddenCtx.globalAlpha = textStyle.opacity;
        
        // Alignment
        if (anchor.includes('left')) hiddenCtx.textAlign = 'left';
        else if (anchor.includes('right')) hiddenCtx.textAlign = 'right';
        else hiddenCtx.textAlign = 'center';
        
        if (anchor.includes('top')) hiddenCtx.textBaseline = 'top';
        else if (anchor.includes('bottom')) hiddenCtx.textBaseline = 'bottom';
        else hiddenCtx.textBaseline = 'middle';
        
        // Shadow
        if (textStyle.textShadow) {
          hiddenCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          hiddenCtx.fillText(watermark.text, x + 2, y + 2);
        }
        
        // Text
        hiddenCtx.fillStyle = textStyle.color;
        hiddenCtx.fillText(watermark.text, x, y);
        
        console.log('[Page] Watermark drawn:', watermark.text, 'at', x, y);
        
      } else if (type === 'image' && watermarkImage) {
        const { imageStyle } = watermark;
        const targetWidth = (imageStyle.width / 100) * width;
        const aspectRatio = watermarkImage.naturalHeight / watermarkImage.naturalWidth;
        const targetHeight = targetWidth * aspectRatio;
        
        hiddenCtx.globalAlpha = imageStyle.opacity;
        
        let drawX = x, drawY = y;
        if (anchor.includes('right')) drawX = x - targetWidth;
        else if (!anchor.includes('left')) drawX = x - targetWidth / 2;
        if (anchor.includes('bottom')) drawY = y - targetHeight;
        else if (!anchor.includes('top')) drawY = y - targetHeight / 2;
        
        hiddenCtx.drawImage(watermarkImage, drawX, drawY, targetWidth, targetHeight);
      }
      
      hiddenCtx.restore();
    }
    
    console.log('[Page] Render page initialized');
  </script>
</body>
</html>
    `
  }

  /**
   * Upload base64 video data to Google Cloud Storage
   */
  private async uploadToGCS(base64Data: string, bucket: string, path: string): Promise<string> {
    const { Storage } = await import('@google-cloud/storage')
    const storage = new Storage()
    
    const buffer = Buffer.from(base64Data, 'base64')
    const file = storage.bucket(bucket).file(path)
    
    await file.save(buffer, {
      contentType: 'video/webm',
      resumable: false,
    })
    
    console.log(`[HeadlessRender] Uploaded to gs://${bucket}/${path}`)
    
    return `https://storage.googleapis.com/${bucket}/${path}`
  }
}

// Lazy singleton pattern to prevent TDZ during module initialization
let _headlessRenderServiceInstance: HeadlessRenderService | null = null

export function getHeadlessRenderService(): HeadlessRenderService {
  if (!_headlessRenderServiceInstance) {
    _headlessRenderServiceInstance = new HeadlessRenderService()
  }
  return _headlessRenderServiceInstance
}

// @deprecated Use getHeadlessRenderService() instead - kept for backward compatibility
export const headlessRenderService = { get: getHeadlessRenderService }
