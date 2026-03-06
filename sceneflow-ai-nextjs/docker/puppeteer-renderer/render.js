/**
 * SceneFlow AI Headless Video Renderer - Cloud Run Job Entry Point
 * 
 * This script runs in a Docker container on GCP Cloud Run Jobs.
 * It receives a job spec from GCS, renders the video using Puppeteer,
 * and uploads the result back to GCS.
 * 
 * Environment Variables:
 * - JOB_SPEC_PATH: GCS path to the render job specification JSON
 * - GCS_BUCKET: Target bucket for output files
 * - CALLBACK_URL: Optional webhook to call when render completes
 * - PUPPETEER_EXECUTABLE_PATH: Path to Chromium binary
 */

const { Storage } = require('@google-cloud/storage');
const puppeteer = require('puppeteer-core');

// =============================================================================
// Configuration
// =============================================================================

const PUPPETEER_LAUNCH_ARGS = [
  '--disable-background-timer-throttling',
  '--disable-raf-throttling',
  '--disable-renderer-backgrounding',
  '--use-gl=swiftshader',
  '--force-color-profile=srgb',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--single-process',
  '--disable-background-networking',
  '--disable-sync',
  '--disable-translate',
  '--mute-audio',
  '--hide-scrollbars',
  '--disable-infobars',
];

const RESOLUTIONS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
};

// =============================================================================
// Main Render Function
// =============================================================================

async function main() {
  console.log('[Render] SceneFlow Headless Renderer starting...');
  console.log('[Render] Node version:', process.version);
  console.log('[Render] Chromium path:', process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium');
  
  const storage = new Storage();
  let browser = null;
  
  try {
    // Get job spec from environment
    const jobSpecPath = process.env.JOB_SPEC_PATH;
    const gcsBucket = process.env.GCS_BUCKET;
    const callbackUrl = process.env.CALLBACK_URL;
    
    if (!jobSpecPath) {
      throw new Error('JOB_SPEC_PATH environment variable is required');
    }
    
    if (!gcsBucket) {
      throw new Error('GCS_BUCKET environment variable is required');
    }
    
    console.log('[Render] Job spec path:', jobSpecPath);
    console.log('[Render] Output bucket:', gcsBucket);
    
    // Download job spec from GCS
    console.log('[Render] Downloading job spec...');
    const jobSpecBucket = jobSpecPath.split('/')[0];
    const jobSpecFile = jobSpecPath.split('/').slice(1).join('/');
    
    const [jobSpecData] = await storage.bucket(jobSpecBucket).file(jobSpecFile).download();
    const config = JSON.parse(jobSpecData.toString());
    
    console.log('[Render] Job config loaded:', {
      resolution: config.resolution,
      fps: config.fps,
      duration: config.totalDuration,
      segments: config.segments?.length || 0,
      hasWatermark: !!config.watermark,
    });
    
    // Initialize Puppeteer
    console.log('[Render] Launching browser...');
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: true,
      args: PUPPETEER_LAUNCH_ARGS,
    });
    
    const page = await browser.newPage();
    const { width, height } = RESOLUTIONS[config.resolution] || RESOLUTIONS['1080p'];
    const totalFrames = Math.ceil(config.totalDuration * config.fps);
    const frameDuration = 1 / config.fps;
    
    console.log(`[Render] Rendering ${width}x${height} @ ${config.fps}fps, ${totalFrames} frames`);
    
    // Set viewport
    await page.setViewport({ width, height });
    
    // Generate and load render page
    const renderPageHTML = generateRenderPageHTML(config, width, height);
    await page.setContent(renderPageHTML);
    
    // Wait for assets to load
    console.log('[Render] Loading assets...');
    await page.evaluate(async () => {
      await window.waitForAssetsToLoad();
    });
    
    // Start recording
    console.log('[Render] Starting MediaRecorder...');
    const recordingPromise = page.evaluate(() => {
      return new Promise((resolve, reject) => {
        window.startRecording(resolve, reject);
      });
    });
    
    // Frame-stepping render loop
    console.log('[Render] Beginning frame-by-frame render...');
    const startTime = Date.now();
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const currentTime = frame * frameDuration;
      
      await page.evaluate(async (time) => {
        await window.renderFrame(time);
      }, currentTime);
      
      // Log progress every 30 frames (1 second at 30fps)
      if (frame % 30 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = ((frame / totalFrames) * 100).toFixed(1);
        const fps = frame / elapsed;
        console.log(`[Render] Progress: ${progress}% (${frame}/${totalFrames} frames, ${fps.toFixed(1)} fps)`);
      }
    }
    
    // Stop recording
    console.log('[Render] Stopping MediaRecorder...');
    await page.evaluate(() => {
      window.stopRecording();
    });
    
    // Get base64 video data
    const base64Data = await recordingPromise;
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log(`[Render] Video encoded: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Upload to GCS
    const outputPath = config.outputPath || `renders/${Date.now()}.webm`;
    console.log(`[Render] Uploading to gs://${gcsBucket}/${outputPath}`);
    
    await storage.bucket(gcsBucket).file(outputPath).save(buffer, {
      contentType: 'video/webm',
      resumable: false,
    });
    
    const outputUrl = `https://storage.googleapis.com/${gcsBucket}/${outputPath}`;
    console.log('[Render] Upload complete:', outputUrl);
    
    // Call webhook if specified
    if (callbackUrl) {
      console.log('[Render] Calling callback URL:', callbackUrl);
      try {
        await fetch(callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            outputUrl,
            duration: config.totalDuration,
            frameCount: totalFrames,
            resolution: config.resolution,
          }),
        });
      } catch (callbackError) {
        console.error('[Render] Callback failed:', callbackError.message);
      }
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`[Render] ✅ Render complete in ${totalTime.toFixed(1)}s`);
    console.log(`[Render] Average speed: ${(totalFrames / totalTime).toFixed(1)} fps`);
    
  } catch (error) {
    console.error('[Render] ❌ Render failed:', error.message);
    console.error(error.stack);
    process.exit(1);
    
  } finally {
    if (browser) {
      await browser.close();
      console.log('[Render] Browser closed');
    }
  }
}

// =============================================================================
// HTML Page Generator
// =============================================================================

function generateRenderPageHTML(config, width, height) {
  const configJson = JSON.stringify(config);
  
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
    const config = ${configJson};
    const width = ${width};
    const height = ${height};
    
    const hiddenCanvas = document.getElementById('hidden-canvas');
    const outputCanvas = document.getElementById('output-canvas');
    const hiddenCtx = hiddenCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
    const outputCtx = outputCanvas.getContext('2d', { alpha: false, desynchronized: false });
    
    const videoElements = {};
    const imageElements = {};
    let watermarkImage = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    let resolveRecording = null;
    let rejectRecording = null;
    let stream = null;
    let canvasTrack = null;
    
    window.waitForAssetsToLoad = async function() {
      console.log('[Page] Loading assets...');
      const loadPromises = [];
      
      for (const segment of config.segments) {
        if (segment.assetType === 'video') {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.muted = true;
          video.preload = 'auto';
          video.src = segment.assetUrl;
          
          loadPromises.push(new Promise((resolve, reject) => {
            video.onloadeddata = () => resolve();
            video.onerror = () => reject(new Error('Failed to load video: ' + segment.assetUrl));
          }));
          
          videoElements[segment.segmentId] = video;
        } else if (segment.assetType === 'image') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = segment.assetUrl;
          
          loadPromises.push(new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image: ' + segment.assetUrl));
          }));
          
          imageElements[segment.segmentId] = img;
        }
      }
      
      if (config.watermark?.type === 'image' && config.watermark.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = config.watermark.imageUrl;
        
        loadPromises.push(new Promise((resolve, reject) => {
          img.onload = () => { watermarkImage = img; resolve(); };
          img.onerror = () => reject(new Error('Failed to load watermark image'));
        }));
      }
      
      if (document.fonts) {
        loadPromises.push(
          document.fonts.load('500 32px "Inter", Arial, sans-serif').catch(() => {})
        );
      }
      
      await Promise.all(loadPromises);
      console.log('[Page] All assets loaded');
    };
    
    window.startRecording = function(resolve, reject) {
      resolveRecording = resolve;
      rejectRecording = reject;
      recordedChunks = [];
      
      stream = outputCanvas.captureStream(0);
      canvasTrack = stream.getVideoTracks()[0];
      
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: config.resolution === '4k' ? 20000000 : 8000000,
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => resolveRecording(reader.result.toString().split(',')[1]);
        reader.onerror = () => rejectRecording(new Error('Failed to read recording'));
        reader.readAsDataURL(blob);
      };
      
      mediaRecorder.start();
    };
    
    window.stopRecording = function() {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };
    
    window.renderFrame = async function(currentTime) {
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
      
      hiddenCtx.fillStyle = '#000000';
      hiddenCtx.fillRect(0, 0, width, height);
      
      if (activeSegment) {
        if (activeSegment.assetType === 'video') {
          const video = videoElements[activeSegment.segmentId];
          if (video) {
            video.currentTime = localTime;
            await new Promise(resolve => {
              if (video.readyState >= 2) resolve();
              else video.onseeked = resolve;
            });
            hiddenCtx.drawImage(video, 0, 0, width, height);
          }
        } else if (activeSegment.assetType === 'image') {
          const img = imageElements[activeSegment.segmentId];
          if (img) hiddenCtx.drawImage(img, 0, 0, width, height);
        }
      }
      
      if (config.textOverlays) drawTextOverlays(currentTime, config.textOverlays);
      if (config.watermark) drawWatermark(config.watermark);
      
      outputCtx.drawImage(hiddenCanvas, 0, 0);
      outputCtx.getImageData(0, 0, 1, 1);
      
      if (canvasTrack && canvasTrack.requestFrame) canvasTrack.requestFrame();
    };
    
    function drawTextOverlays(currentTime, overlays) {
      hiddenCtx.save();
      hiddenCtx.globalAlpha = 1.0;
      
      for (const overlay of overlays) {
        const { timing, style, position } = overlay;
        const endTime = timing.duration === -1 ? Infinity : timing.startTime + timing.duration;
        
        if (currentTime < timing.startTime || currentTime > endTime) continue;
        
        let opacity = 1;
        const fadeInEnd = timing.startTime + timing.fadeInMs / 1000;
        const fadeOutStart = endTime - timing.fadeOutMs / 1000;
        
        if (currentTime < fadeInEnd) opacity = (currentTime - timing.startTime) / (timing.fadeInMs / 1000);
        else if (currentTime > fadeOutStart && timing.duration !== -1) opacity = (endTime - currentTime) / (timing.fadeOutMs / 1000);
        opacity = Math.max(0, Math.min(1, opacity));
        
        const x = (position.x / 100) * width;
        const y = (position.y / 100) * height;
        const fontSize = (style.fontSize / 100) * height;
        
        hiddenCtx.font = style.fontWeight + ' ' + fontSize + 'px "' + style.fontFamily + '", Arial, sans-serif';
        hiddenCtx.textBaseline = 'middle';
        
        if (position.anchor.includes('center')) hiddenCtx.textAlign = 'center';
        else if (position.anchor.includes('right')) hiddenCtx.textAlign = 'right';
        else hiddenCtx.textAlign = 'left';
        
        if (style.textShadow) {
          hiddenCtx.fillStyle = '#000000';
          hiddenCtx.globalAlpha = opacity * 0.5;
          hiddenCtx.fillText(overlay.text, x + 2, y + 2);
        }
        
        hiddenCtx.fillStyle = style.color;
        hiddenCtx.globalAlpha = opacity;
        hiddenCtx.fillText(overlay.text, x, y);
      }
      
      hiddenCtx.restore();
    }
    
    function drawWatermark(watermark) {
      hiddenCtx.save();
      
      const { anchor, padding, type } = watermark;
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
        
        hiddenCtx.font = textStyle.fontWeight + ' ' + fontSize + 'px "Inter", "' + textStyle.fontFamily + '", Arial, sans-serif';
        hiddenCtx.globalAlpha = textStyle.opacity;
        
        if (anchor.includes('left')) hiddenCtx.textAlign = 'left';
        else if (anchor.includes('right')) hiddenCtx.textAlign = 'right';
        else hiddenCtx.textAlign = 'center';
        
        if (anchor.includes('top')) hiddenCtx.textBaseline = 'top';
        else if (anchor.includes('bottom')) hiddenCtx.textBaseline = 'bottom';
        else hiddenCtx.textBaseline = 'middle';
        
        if (textStyle.textShadow) {
          hiddenCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          hiddenCtx.fillText(watermark.text, x + 2, y + 2);
        }
        
        hiddenCtx.fillStyle = textStyle.color;
        hiddenCtx.fillText(watermark.text, x, y);
        
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
  `;
}

// Run main function
main().catch(error => {
  console.error('[Render] Fatal error:', error);
  process.exit(1);
});
