import { Client, Source, Image, Audio, Pan } from 'creatomate'

export interface SceneRenderData {
  sceneNumber: number
  imageUrl: string
  duration: number // seconds
  audioTracks: {
    narration?: string
    dialogue?: Array<{ url: string; startTime: number }>
    sfx?: Array<{ url: string; startTime: number }>
    music?: string
  }
  kenBurnsIntensity: 'subtle' | 'medium' | 'dramatic'
}

export interface RenderOptions {
  width: number // 1920 for 1080p
  height: number // 1080 for 1080p
  fps: number // 30
  quality: 'standard' | 'high' | 'ultra'
  format: 'mp4'
}

export class CreatomateRenderService {
  private client: Client
  private apiKey: string
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.client = new Client(apiKey)
  }
  
  /**
   * Submit render job and return renderId immediately (without waiting for completion)
   * Uses Creatomate REST API directly to create render without waiting
   */
  async submitRender(
    scenes: SceneRenderData[],
    options: RenderOptions,
    projectTitle: string
  ): Promise<string> {
    // Build Creatomate source (composition)
    const source = this.buildSource(scenes, options)
    const sourcePayload = typeof (source as any)?.toMap === 'function' ? (source as any).toMap() : source
    this.logPayloadSummary(sourcePayload, scenes)
    
    try {
      // Use Creatomate REST API directly to create render without waiting
      // This avoids the client library's render() method which waits for completion
      // Convert source to JSON for API request
      // Create render via REST API
      const response = await fetch('https://api.creatomate.com/v1/renders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: sourcePayload,
          output_format: options.format,
          frame_rate: options.fps,
          max_width: options.width,
          max_height: options.height,
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Creatomate API error: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      try {
        console.log('[Creatomate] REST response payload:', JSON.stringify(data, null, 2))
      } catch {
        console.log('[Creatomate] REST response payload (unserializable):', data)
      }

      const {
        renderId: restRenderId,
        status: restStatus,
        url: restUrl,
      } = this.extractRenderInfo(data)

      if (!restRenderId) {
        const apiErrorMessage = typeof (data as any)?.error === 'string'
          ? (data as any).error
          : (data as any)?.error?.message
            || (data as any)?.message
            || `Render response missing id (status: ${restStatus || 'unknown'})`
        const details = restUrl ? ` - status: ${restStatus || 'unknown'}, url: ${restUrl}` : restStatus ? ` - status: ${restStatus}` : ''
        throw new Error(`${apiErrorMessage}${details}`)
      }
      
      console.log('[Creatomate] Render job created via REST API:', restRenderId)
      return restRenderId
    } catch (error: any) {
      console.error('[Creatomate] Error creating render via REST API:', error)
      
      // Fallback: Try using client library with a longer timeout
      try {
        console.log('[Creatomate] Falling back to client library method...')
        const renders = await this.client.render({
          source: sourcePayload,
          outputFormat: options.format,
          frameRate: options.fps,
          maxWidth: options.width,
          maxHeight: options.height,
        }, 30) // 30 second timeout as fallback
        
        try {
          console.log('[Creatomate] Client library response:', JSON.stringify(renders, null, 2))
        } catch {
          console.log('[Creatomate] Client library response (unserializable):', renders)
        }

        const { renderId: fallbackRenderId, status: fallbackStatus, url: fallbackUrl } = this.extractRenderInfo(renders)

        if (!fallbackRenderId) {
          throw new Error(`Render submitted but no renderId available${fallbackStatus ? ` (status: ${fallbackStatus})` : ''}${fallbackUrl ? `, url: ${fallbackUrl}` : ''}`)
        }
        
        return fallbackRenderId
      } catch (fallbackError: any) {
        // If both methods fail, throw the original error
        const fallbackMessage = fallbackError?.message || 'Unknown error'
        const originalMessage = error?.message || fallbackMessage
        throw new Error(`Failed to submit render job: ${originalMessage}`)
      }
    }
  }

  private logPayloadSummary(sourcePayload: any, scenes: SceneRenderData[]) {
    try {
      const elements: any[] = Array.isArray(sourcePayload?.elements) ? sourcePayload.elements : []
      const totalDuration = typeof sourcePayload?.duration === 'number'
        ? sourcePayload.duration
        : Number(sourcePayload?.duration) || null

      let firstElementTime = elements.length > 0 ? Number(elements[0]?.time ?? 0) : null
      let lastElementEnd: number | null = null
      let zeroDurationElements = 0

      for (const element of elements) {
        const startTime = Number(element?.time ?? 0)
        const duration = element?.duration != null ? Number(element.duration) : null

        if (firstElementTime === null || startTime < firstElementTime) {
          firstElementTime = startTime
        }

        const elementEnd = duration != null ? startTime + duration : null
        if (elementEnd != null) {
          if (lastElementEnd === null || elementEnd > lastElementEnd) {
            lastElementEnd = elementEnd
          }
        }

        if (duration === 0) {
          zeroDurationElements += 1
        }
      }

      const imageCount = elements.filter(el => el?.type === 'image').length
      const audioCount = elements.filter(el => el?.type === 'audio').length

      const sceneDurations = scenes.map(scene => Number(scene.duration || 0))

      console.log('[Creatomate] Render payload summary:', {
        totalDurationSeconds: totalDuration,
        elementCount: elements.length,
        imageCount,
        audioCount,
        firstElementTime,
        lastElementEnd,
        zeroDurationElements,
        sceneCount: scenes.length,
        sceneDurationsSample: sceneDurations.slice(0, 5),
        sceneDurationsTotal: sceneDurations.reduce((sum, d) => sum + d, 0)
      })
    } catch (error) {
      console.error('[Creatomate] Failed to summarize render payload:', error)
    }
  }

  private extractRenderInfo(payload: any): { renderId?: string | null; status?: string | null; url?: string | null } {
    if (!payload) return { renderId: null, status: null, url: null }

    const record = Array.isArray(payload) ? payload[0] : payload
    if (!record || typeof record !== 'object') {
      return { renderId: null, status: null, url: null }
    }

    const renderId = record.id || record.renderId || record.render_id || record?.data?.id || null
    const status = record.status || null
    const url = record.url || record.render_url || null

    return { renderId, status, url }
  }

  /**
   * Get render URL when render is complete
   */
  async getRenderUrl(renderId: string): Promise<string | null> {
    const render = await this.client.fetchRender(renderId)
    if (render.status === 'succeeded' && render.url) {
      return render.url
    }
    return null
  }

  /**
   * Render video and wait for completion (legacy method for backward compatibility)
   */
  async renderVideo(
    scenes: SceneRenderData[],
    options: RenderOptions,
    projectTitle: string
  ): Promise<string> {
    // Build Creatomate source (composition)
    const source = this.buildSource(scenes, options)
    
    // Submit render job (Creatomate handles polling internally with timeout)
    const renders = await this.client.render({
      source: source as any,
      outputFormat: options.format,
      frameRate: options.fps,
      maxWidth: options.width,
      maxHeight: options.height,
    }, 300) // 5 minute timeout
    
    if (renders.length === 0) {
      throw new Error('No renders created')
    }
    
    // Return video URL
    const render = renders[0]
    if (!render.url) {
      throw new Error('Render completed but no URL available')
    }
    
    return render.url
  }
  
  private buildSource(scenes: SceneRenderData[], options: RenderOptions): Source {
    const { width, height, fps } = options
    
    // Calculate total duration
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0)
    
    // Build composition with all elements
    const elements: any[] = []
    let currentTime = 0
    
    for (const scene of scenes) {
      // Get pan parameters
      const panParams = this.getPanParams(scene.kenBurnsIntensity)
      
      // Create image element with pan animation
      const imageElement = new Image({
        source: scene.imageUrl,
        time: currentTime,
        duration: scene.duration,
        width: '100%',
        height: '100%',
        fit: 'cover',
        animations: [
          new Pan({
            scope: 'element',
            startScale: panParams.startScale,
            startX: panParams.startX,
            startY: panParams.startY,
            endScale: panParams.endScale,
            endX: panParams.endX,
            endY: panParams.endY,
            duration: scene.duration,
            easing: 'linear'
          })
        ]
      })
      
      elements.push(imageElement)
      
      // Add narration audio
      if (scene.audioTracks.narration) {
        elements.push(new Audio({
          source: scene.audioTracks.narration,
          time: currentTime,
          duration: scene.duration,
          volume: 100
        }))
      }
      
      // Add dialogue tracks
      if (scene.audioTracks.dialogue) {
        for (const dialogue of scene.audioTracks.dialogue) {
          elements.push(new Audio({
            source: dialogue.url,
            time: currentTime + dialogue.startTime,
            volume: 100
          }))
        }
      }
      
      // Add SFX tracks
      if (scene.audioTracks.sfx) {
        for (const sfx of scene.audioTracks.sfx) {
          elements.push(new Audio({
            source: sfx.url,
            time: currentTime + sfx.startTime,
            volume: 80 // Slightly lower volume for SFX
          }))
        }
      }
      
      // Add music (loops if shorter than scene)
      if (scene.audioTracks.music) {
        elements.push(new Audio({
          source: scene.audioTracks.music,
          time: currentTime,
          duration: scene.duration,
          volume: 30, // Background music at 30%
          loop: true
        }))
      }
      
      currentTime += scene.duration
    }
    
    // Create source with all elements
    return new Source({
      outputFormat: options.format,
      width,
      height,
      frameRate: fps,
      duration: totalDuration,
      elements
    })
  }
  
  private getPanParams(intensity: 'subtle' | 'medium' | 'dramatic') {
    // Pan-only effect (no scaling)
    switch (intensity) {
      case 'subtle':
        return {
          startScale: 100,
          endScale: 100,
          startX: '0%',
          startY: '0%',
          endX: '-3%',
          endY: '-3%'
        }
      case 'medium':
        return {
          startScale: 100,
          endScale: 100,
          startX: '0%',
          startY: '0%',
          endX: '-5%',
          endY: '-5%'
        }
      case 'dramatic':
        return {
          startScale: 100,
          endScale: 100,
          startX: '0%',
          startY: '0%',
          endX: '-8%',
          endY: '-8%'
        }
    }
  }
  
  async getRenderStatus(renderId: string): Promise<'queued' | 'rendering' | 'succeeded' | 'failed'> {
    const render = await this.client.fetchRender(renderId)
    return render.status as any
  }
}

