'use client'

import React, { createContext, useContext, useMemo } from 'react'
import type { DetailedSceneDirection } from '@/types/scene-direction'

/**
 * Scene Direction Context
 * 
 * Provides persistent access to scene direction throughout the production workflow.
 * This ensures camera, lighting, talent direction, and audio considerations
 * flow consistently from script through frame and video generation.
 */

export interface SceneDirectionContextValue {
  /** Full detailed scene direction from the script phase */
  direction: DetailedSceneDirection | null
  
  /** Whether scene direction is available */
  hasDirection: boolean
  
  /** Quick accessors for common production needs */
  cameraWork: string | null
  lightingMood: string | null
  emotionalBeat: string | null
  talentBlocking: string | null
  atmosphere: string | null
  
  /** Build a direction summary for prompt injection */
  getDirectionSummary: () => string
  
  /** Get specific direction elements for frame generation */
  getFrameDirectionContext: () => FrameDirectionContext
  
  /** Get specific direction elements for F2V generation */
  getVideoDirectionContext: () => VideoDirectionContext
}

export interface FrameDirectionContext {
  shotTypes: string[]
  cameraAngle: string
  cameraMovement: string
  lensChoice: string
  lighting: {
    mood: string
    timeOfDay: string
    keyLight: string
    colorTemperature: string
  }
  scene: {
    location: string
    atmosphere: string
    keyProps: string[]
  }
  talent: {
    emotionalBeat: string
    blocking: string
  }
}

export interface VideoDirectionContext {
  cameraMovement: string
  emotionalBeat: string
  talentActions: string[]
  blocking: string
  atmosphere: string
  audioConsiderations: string
}

const SceneDirectionContext = createContext<SceneDirectionContextValue | null>(null)

interface SceneDirectionProviderProps {
  direction: DetailedSceneDirection | null | undefined
  children: React.ReactNode
}

export function SceneDirectionProvider({ 
  direction, 
  children 
}: SceneDirectionProviderProps) {
  const value = useMemo<SceneDirectionContextValue>(() => {
    const hasDirection = !!direction
    
    const getDirectionSummary = (): string => {
      if (!direction) return ''
      
      const parts: string[] = []
      
      if (direction.camera?.movement) {
        parts.push(`Camera: ${direction.camera.movement}`)
      }
      if (direction.camera?.shots?.length) {
        parts.push(`Shot: ${direction.camera.shots[0]}`)
      }
      if (direction.lighting?.overallMood) {
        parts.push(`Lighting: ${direction.lighting.overallMood}`)
      }
      if (direction.talent?.emotionalBeat) {
        parts.push(`Emotion: ${direction.talent.emotionalBeat}`)
      }
      if (direction.scene?.atmosphere) {
        parts.push(`Atmosphere: ${direction.scene.atmosphere}`)
      }
      
      return parts.join('. ')
    }
    
    const getFrameDirectionContext = (): FrameDirectionContext => {
      if (!direction) {
        return {
          shotTypes: [],
          cameraAngle: '',
          cameraMovement: '',
          lensChoice: '',
          lighting: { mood: '', timeOfDay: '', keyLight: '', colorTemperature: '' },
          scene: { location: '', atmosphere: '', keyProps: [] },
          talent: { emotionalBeat: '', blocking: '' }
        }
      }
      
      return {
        shotTypes: direction.camera?.shots || [],
        cameraAngle: direction.camera?.angle || '',
        cameraMovement: direction.camera?.movement || '',
        lensChoice: direction.camera?.lensChoice || '',
        lighting: {
          mood: direction.lighting?.overallMood || '',
          timeOfDay: direction.lighting?.timeOfDay || '',
          keyLight: direction.lighting?.keyLight || '',
          colorTemperature: direction.lighting?.colorTemperature || ''
        },
        scene: {
          location: direction.scene?.location || '',
          atmosphere: direction.scene?.atmosphere || '',
          keyProps: direction.scene?.keyProps || []
        },
        talent: {
          emotionalBeat: direction.talent?.emotionalBeat || '',
          blocking: direction.talent?.blocking || ''
        }
      }
    }
    
    const getVideoDirectionContext = (): VideoDirectionContext => {
      if (!direction) {
        return {
          cameraMovement: '',
          emotionalBeat: '',
          talentActions: [],
          blocking: '',
          atmosphere: '',
          audioConsiderations: ''
        }
      }
      
      return {
        cameraMovement: direction.camera?.movement || '',
        emotionalBeat: direction.talent?.emotionalBeat || '',
        talentActions: direction.talent?.keyActions || [],
        blocking: direction.talent?.blocking || '',
        atmosphere: direction.scene?.atmosphere || '',
        audioConsiderations: direction.audio?.considerations || ''
      }
    }
    
    return {
      direction: direction || null,
      hasDirection,
      cameraWork: direction?.camera?.movement || null,
      lightingMood: direction?.lighting?.overallMood || null,
      emotionalBeat: direction?.talent?.emotionalBeat || null,
      talentBlocking: direction?.talent?.blocking || null,
      atmosphere: direction?.scene?.atmosphere || null,
      getDirectionSummary,
      getFrameDirectionContext,
      getVideoDirectionContext
    }
  }, [direction])
  
  return (
    <SceneDirectionContext.Provider value={value}>
      {children}
    </SceneDirectionContext.Provider>
  )
}

/**
 * Hook to access scene direction context
 * 
 * @throws Error if used outside of SceneDirectionProvider
 */
export function useSceneDirection(): SceneDirectionContextValue {
  const context = useContext(SceneDirectionContext)
  
  if (!context) {
    throw new Error('useSceneDirection must be used within a SceneDirectionProvider')
  }
  
  return context
}

/**
 * Hook to optionally access scene direction context
 * Returns null if not within provider (safe for optional usage)
 */
export function useSceneDirectionOptional(): SceneDirectionContextValue | null {
  return useContext(SceneDirectionContext)
}
