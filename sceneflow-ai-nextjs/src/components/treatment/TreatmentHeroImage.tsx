'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  RefreshCw, 
  Pencil, 
  ImageOff, 
  Sparkles,
  Film
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { type GeneratedImage, type AspectRatio } from '@/types/treatment-visuals'

interface TreatmentHeroImageProps {
  image: GeneratedImage | null
  title: string
  subtitle?: string
  genre?: string
  aspectRatio?: AspectRatio
  onRegenerate?: () => void
  onEditPrompt?: () => void
  isGenerating?: boolean
  error?: string | null // External error message from parent
  className?: string
}

/**
 * Hero Image component for the Film Treatment title page.
 * Displays a poster-style cinematic image with title overlay.
 */
export function TreatmentHeroImage({
  image,
  title,
  subtitle,
  genre,
  aspectRatio = '16:9',
  onRegenerate,
  onEditPrompt,
  isGenerating = false,
  error: externalError,
  className
}: TreatmentHeroImageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // Debug: Log what we receive
  console.log('[TreatmentHeroImage] Render:', {
    hasUrl: !!image?.url,
    urlPreview: image?.url?.substring(0, 60),
    status: image?.status,
    imageError,
    isGenerating
  })
  
  // Reset image error when URL changes (e.g., after regeneration)
  useEffect(() => {
    console.log('[TreatmentHeroImage] URL changed, resetting imageError. New URL:', image?.url?.substring(0, 60))
    setImageError(false)
  }, [image?.url])
  
  // Get the display URL - use direct URL for public GCS URLs (no query params)
  // Only proxy signed URLs (which have query params like ?GoogleAccessId=...)
  const getDisplayUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined
    
    // Check if this is a GCS URL
    const isGcsUrl = url.includes('storage.googleapis.com') || url.includes('storage.cloud.google.com')
    
    if (isGcsUrl) {
      // If URL has query params (signed URL), use proxy to avoid encoding issues
      // If no query params (public URL), use directly
      const hasQueryParams = url.includes('?')
      if (hasQueryParams) {
        console.log('[TreatmentHeroImage] Using proxy for signed URL')
        return `/api/proxy/image?url=${encodeURIComponent(url)}`
      } else {
        console.log('[TreatmentHeroImage] Using direct public URL')
        return url
      }
    }
    
    return url
  }
  
  const displayUrl = getDisplayUrl(image?.url)
  
  // Calculate aspect ratio padding
  const aspectRatioPadding = {
    '16:9': 'pb-[56.25%]',      // 9/16 = 0.5625
    '2.39:1': 'pb-[41.84%]',    // 1/2.39 = 0.4184
    '1:1': 'pb-[100%]',
    '3:4': 'pb-[133.33%]',
    '4:3': 'pb-[75%]'
  }[aspectRatio]
  
  // Consider image ready if URL exists and either no status or status is 'ready'
  // This handles both fresh API responses and database-loaded images
  const hasImage = image?.url && (image.status === 'ready' || !image.status) && !imageError
  
  return (
    <div 
      className={cn(
        'relative w-full rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
        'border border-slate-700/50',
        'group',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Aspect ratio container */}
      <div className={cn('relative w-full', aspectRatioPadding)}>
        {/* Image or placeholder */}
        {hasImage && displayUrl ? (
          <img
            src={displayUrl}
            alt={`${title} - Hero Image`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => {
              console.log('[TreatmentHeroImage] Image failed to load:', displayUrl?.substring(0, 60))
              setImageError(true)
            }}
            onLoad={() => console.log('[TreatmentHeroImage] Image loaded successfully')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            {isGenerating || image?.status === 'generating' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Sparkles className="w-12 h-12 text-amber-400 animate-pulse" />
                  <div className="absolute inset-0 animate-spin">
                    <RefreshCw className="w-12 h-12 text-cyan-400 opacity-50" />
                  </div>
                </div>
                <span className="text-sm text-slate-400 animate-pulse">
                  Generating hero image...
                </span>
              </div>
            ) : image?.status === 'error' || externalError ? (
              <div className="flex flex-col items-center gap-2 text-red-400">
                <ImageOff className="w-10 h-10" />
                <span className="text-sm">Failed to generate</span>
                {(externalError || image?.error) && (
                  <span className="text-xs text-slate-500 max-w-xs text-center">
                    {externalError || image?.error}
                  </span>
                )}
                {onRegenerate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRegenerate}
                    className="mt-2 border-red-500/30 hover:border-red-400/50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Film className="w-16 h-16 opacity-30" />
                <span className="text-sm">Hero image not generated</span>
                {onRegenerate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRegenerate}
                    className="mt-2"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Hero Image
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Gradient overlay for text readability */}
        {hasImage && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        )}
        
        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-4xl">
            {genre && (
              <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 rounded-full mb-3 border border-amber-400/20">
                {genre}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-lg sm:text-xl text-slate-300 drop-shadow-md">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {/* Hover controls */}
        {hasImage && (onRegenerate || onEditPrompt) && (
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
                onClick={onEditPrompt}
                className="bg-black/50 hover:bg-black/70 backdrop-blur-sm"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            )}
            {onRegenerate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRegenerate}
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
  )
}

export default TreatmentHeroImage
