'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  RefreshCw, 
  Pencil, 
  ImageOff, 
  Mountain,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ToneStrip } from './ToneStrip'
import { type ActAnchor, type GeneratedImage } from '@/types/treatment-visuals'

interface ActAnchorSectionProps {
  actAnchor: ActAnchor
  onRegenerateImage?: (actNumber: number) => void
  onEditPrompt?: (actNumber: number) => void
  isGenerating?: boolean
  className?: string
}

/**
 * Act Anchor Section - Wide cinematic establishing shot with prose content
 * Uses 2.39:1 (ultra-wide cinematic) aspect ratio
 */
export function ActAnchorSection({
  actAnchor,
  onRegenerateImage,
  onEditPrompt,
  isGenerating = false,
  className
}: ActAnchorSectionProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  const { actNumber, title, establishingShot, toneStrip, content } = actAnchor
  
  const hasImage = establishingShot?.url && establishingShot.status === 'ready' && !imageError
  
  // Act number styling
  const actLabels = ['I', 'II', 'III']
  const actLabel = actLabels[actNumber - 1] || actNumber.toString()
  
  return (
    <section className={cn('space-y-4', className)}>
      {/* Tone strip divider */}
      {toneStrip && (
        <ToneStrip toneStrip={toneStrip} className="my-6" />
      )}
      
      {/* Establishing shot */}
      <div 
        className="relative w-full rounded-xl overflow-hidden bg-slate-800/50 border border-slate-700/50 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 2.39:1 aspect ratio container */}
        <div className="relative w-full pb-[41.84%]">
          {hasImage ? (
            <>
              <img
                src={establishingShot.url}
                alt={`Act ${actLabel} - Establishing Shot`}
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/30" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              {isGenerating || establishingShot?.status === 'generating' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
                  </div>
                  <span className="text-sm text-slate-400 animate-pulse">
                    Generating establishing shot...
                  </span>
                </div>
              ) : establishingShot?.status === 'error' ? (
                <div className="flex flex-col items-center gap-2 text-red-400">
                  <ImageOff className="w-8 h-8" />
                  <span className="text-sm">Failed to generate</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <Mountain className="w-12 h-12 opacity-30" />
                  <span className="text-sm">Establishing shot not generated</span>
                  {onRegenerateImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRegenerateImage(actNumber)}
                      className="mt-2"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Image
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Act label overlay */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
            <div className="flex items-center gap-3">
              <span className="text-4xl sm:text-5xl font-bold text-white/90 drop-shadow-lg font-serif">
                Act {actLabel}
              </span>
              {title && (
                <span className="text-lg sm:text-xl text-white/70 drop-shadow-md">
                  {title}
                </span>
              )}
            </div>
          </div>
          
          {/* Hover controls */}
          {hasImage && (onRegenerateImage || onEditPrompt) && (
            <div 
              className={cn(
                'absolute top-4 right-4 flex gap-2 transition-opacity duration-200',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              {onEditPrompt && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEditPrompt(actNumber)}
                  className="bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
              {onRegenerateImage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRegenerateImage(actNumber)}
                  disabled={isGenerating}
                  className="bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isGenerating && 'animate-spin')} />
                  Regenerate
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Act content prose */}
      {content && (
        <div className="px-2 sm:px-4">
          <div className="prose prose-invert prose-slate max-w-none">
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

export default ActAnchorSection
