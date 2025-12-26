'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { type ToneStrip as ToneStripType, TONE_PALETTE_COLORS } from '@/types/treatment-visuals'

interface ToneStripProps {
  toneStrip: ToneStripType | null
  className?: string
}

/**
 * ToneStrip component - Abstract color/texture gradient bar
 * Communicates the mood and color grading of a section
 */
export function ToneStrip({ toneStrip, className }: ToneStripProps) {
  if (!toneStrip) return null
  
  // Use generated image if available, otherwise create CSS gradient
  const hasGeneratedImage = toneStrip.generatedUrl && toneStrip.status === 'ready'
  
  // Get palette colors
  const paletteData = TONE_PALETTE_COLORS[toneStrip.palette] || {
    colors: ['#1a1a2e', '#16213e', '#4a5568', '#2d3748'],
    textures: ['neutral', 'subtle']
  }
  
  const colors = toneStrip.colors.length > 0 ? toneStrip.colors : paletteData.colors
  
  // Create gradient string
  const gradientStops = colors.map((color, i) => {
    const position = (i / (colors.length - 1)) * 100
    return `${color} ${position}%`
  }).join(', ')
  
  const gradientStyle = {
    background: hasGeneratedImage 
      ? `url(${toneStrip.generatedUrl})`
      : `linear-gradient(90deg, ${gradientStops})`
  }
  
  return (
    <div 
      className={cn(
        'w-full h-6 rounded-sm overflow-hidden',
        'shadow-inner',
        className
      )}
      style={gradientStyle}
      title={`Mood: ${toneStrip.palette}`}
    >
      {/* Subtle texture overlay */}
      <div 
        className="w-full h-full"
        style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          mixBlendMode: 'overlay'
        }}
      />
    </div>
  )
}

/**
 * Inline ToneStrip - Thinner version for inline use
 */
export function ToneStripInline({ toneStrip, className }: ToneStripProps) {
  if (!toneStrip) return null
  
  const paletteData = TONE_PALETTE_COLORS[toneStrip.palette] || {
    colors: ['#1a1a2e', '#16213e', '#4a5568', '#2d3748'],
    textures: ['neutral']
  }
  
  const colors = toneStrip.colors.length > 0 ? toneStrip.colors : paletteData.colors
  
  const gradientStops = colors.map((color, i) => {
    const position = (i / (colors.length - 1)) * 100
    return `${color} ${position}%`
  }).join(', ')
  
  return (
    <div 
      className={cn(
        'w-full h-1.5 rounded-full overflow-hidden',
        className
      )}
      style={{
        background: `linear-gradient(90deg, ${gradientStops})`
      }}
      title={`Mood: ${toneStrip.palette}`}
    />
  )
}

export default ToneStrip
