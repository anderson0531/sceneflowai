'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { 
  RefreshCw, 
  Pencil, 
  ImageOff, 
  Sparkles,
  Film,
  Wand2,
  Upload,
  Download,
  Loader
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { type GeneratedImage, type AspectRatio } from '@/types/treatment-visuals'

interface TreatmentHeroImageProps {
  image: GeneratedImage | null
  title: string
  subtitle?: string
  genre?: string
  aspectRatio?: AspectRatio
  onRegenerate?: () => void
  onEditPrompt?: () => void
  onUpload?: (file: File) => void
  onDownload?: () => void
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
  onUpload,
  onDownload,
  isGenerating = false,
  error: externalError,
  className
}: TreatmentHeroImageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onUpload) {
      onUpload(file)
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  // Handle download
  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else if (image?.url) {
      // Default download behavior
      const link = document.createElement('a')
      link.href = image.url
      link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_poster.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
  
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
        
        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        
        {/* Hover controls - unified icon buttons matching SceneGallery */}
        {hasImage && (
          <div 
            className={cn(
              'absolute top-4 right-4 flex gap-2 transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            {/* Regenerate (Sparkles - indigo) */}
            {onRegenerate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                    disabled={isGenerating}
                    className="p-3 bg-indigo-600/80 hover:bg-indigo-600 rounded-full transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-white" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Regenerate Image</TooltipContent>
              </Tooltip>
            )}
            
            {/* Edit Prompt (Wand2 - purple) */}
            {onEditPrompt && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditPrompt(); }}
                    className="p-3 bg-purple-600/80 hover:bg-purple-600 rounded-full transition-colors"
                  >
                    <Wand2 className="w-5 h-5 text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Edit Prompt</TooltipContent>
              </Tooltip>
            )}
            
            {/* Upload (Upload - emerald) */}
            {onUpload && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="p-3 bg-emerald-600/80 hover:bg-emerald-600 rounded-full transition-colors"
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Upload Image</TooltipContent>
              </Tooltip>
            )}
            
            {/* Download (Download - cyan) */}
            {image?.url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                    className="p-3 bg-cyan-600/80 hover:bg-cyan-600 rounded-full transition-colors"
                  >
                    <Download className="w-5 h-5 text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Download Image</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TreatmentHeroImage
