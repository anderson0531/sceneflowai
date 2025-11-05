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
  
  constructor(apiKey: string) {
    this.client = new Client(apiKey)
  }
  
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
      // Get Ken Burns parameters
      const kenBurnsParams = this.getKenBurnsParams(scene.kenBurnsIntensity)
      
      // Create image element with Ken Burns animation
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
            startScale: kenBurnsParams.startScale,
            startX: kenBurnsParams.startX,
            startY: kenBurnsParams.startY,
            endScale: kenBurnsParams.endScale,
            endX: kenBurnsParams.endX,
            endY: kenBurnsParams.endY,
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
  
  private getKenBurnsParams(intensity: 'subtle' | 'medium' | 'dramatic') {
    switch (intensity) {
      case 'subtle':
        return {
          startScale: 100,
          endScale: 110,
          startX: '0%',
          startY: '0%',
          endX: '5%',
          endY: '5%'
        }
      case 'medium':
        return {
          startScale: 100,
          endScale: 120,
          startX: '0%',
          startY: '0%',
          endX: '10%',
          endY: '10%'
        }
      case 'dramatic':
        return {
          startScale: 100,
          endScale: 130,
          startX: '0%',
          startY: '0%',
          endX: '15%',
          endY: '15%'
        }
    }
  }
  
  async getRenderStatus(renderId: string): Promise<'queued' | 'rendering' | 'succeeded' | 'failed'> {
    const render = await this.client.fetchRender(renderId)
    return render.status as any
  }
}
