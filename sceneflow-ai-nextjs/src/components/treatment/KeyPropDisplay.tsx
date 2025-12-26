'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  RefreshCw, 
  Pencil, 
  ImageOff, 
  Key,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { type KeyProp, type GeneratedImage } from '@/types/treatment-visuals'

interface KeyPropDisplayProps {
  keyProp: KeyProp | null
  onRegenerate?: () => void
  onEditPrompt?: () => void
  isGenerating?: boolean
  className?: string
  /** Display variant: centered in text or floating */
  variant?: 'centered' | 'floating'
}

/**
 * Key Prop Display - MacGuffin/central object product shot
 * Shows the central physical object of the story
 */
export function KeyPropDisplay({
  keyProp,
  onRegenerate,
  onEditPrompt,
  isGenerating = false,
  variant = 'centered',
  className
}: KeyPropDisplayProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  if (!keyProp) return null
  
  const { name, description, image, centralToPlot } = keyProp
  const hasImage = image?.url && image.status === 'ready' && !imageError
  
  const containerClasses = variant === 'floating'
    ? 'float-right ml-6 mb-4 w-48'
    : 'mx-auto w-52'
  
  return (
    <div 
      className={cn(
        containerClasses,
        'relative rounded-xl overflow-hidden',
        'bg-gradient-to-b from-slate-800 to-slate-900',
        'border border-slate-700/50',
        'group',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image container - 1:1 aspect ratio */}
      <div className="relative w-full pb-[100%]">
        {hasImage ? (
          <>
            <img
              src={image.url}
              alt={`${name} - Key Prop`}
              className="absolute inset-0 w-full h-full object-contain p-4"
              onError={() => setImageError(true)}
            />
            {/* Subtle vignette */}
            <div className="absolute inset-0 pointer-events-none" 
              style={{
                background: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.3) 100%)'
              }} 
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {isGenerating || image?.status === 'generating' ? (
              <div className="flex flex-col items-center gap-2">
                <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
                <span className="text-xs text-slate-400 animate-pulse text-center">
                  Generating...
                </span>
              </div>
            ) : image?.status === 'error' ? (
              <div className="flex flex-col items-center gap-2 text-red-400">
                <ImageOff className="w-6 h-6" />
                <span className="text-xs">Error</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Key className="w-10 h-10 opacity-30" />
                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRegenerate}
                    className="h-7 text-xs"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generate
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Hover controls */}
        {hasImage && (onRegenerate || onEditPrompt) && (
          <div 
            className={cn(
              'absolute top-2 right-2 flex gap-1 transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            {onEditPrompt && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditPrompt}
                className="h-7 w-7 p-0 bg-black/50 hover:bg-black/70"
              >
                <Pencil className="w-3 h-3" />
              </Button>
            )}
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={isGenerating}
                className="h-7 w-7 p-0 bg-black/50 hover:bg-black/70"
              >
                <RefreshCw className={cn('w-3 h-3', isGenerating && 'animate-spin')} />
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Label */}
      <div className="px-3 pb-3 text-center">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{description}</p>
        )}
        {centralToPlot && (
          <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400 bg-amber-400/10 rounded-full border border-amber-400/20">
            Central to Plot
          </span>
        )}
      </div>
    </div>
  )
}

export default KeyPropDisplay
