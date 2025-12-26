'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { 
  RefreshCw, 
  Pencil, 
  ImageOff, 
  User,
  Crown,
  Skull,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { type CharacterPortrait, type GeneratedImage } from '@/types/treatment-visuals'

interface CharacterPortraitCardProps {
  portrait: CharacterPortrait
  onRegenerate?: (characterId: string) => void
  onEditPrompt?: (characterId: string) => void
  isGenerating?: boolean
  className?: string
}

/**
 * Character Portrait Card - "Trading Card" style display
 * Shows a neutral-background portrait with character bio
 */
export function CharacterPortraitCard({
  portrait,
  onRegenerate,
  onEditPrompt,
  isGenerating = false,
  className
}: CharacterPortraitCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  const { characterId, characterName, role, portrait: image, bio } = portrait
  
  const hasImage = image?.url && image.status === 'ready' && !imageError
  
  // Role icon and color
  const roleConfig = {
    protagonist: { 
      icon: Crown, 
      color: 'text-amber-400', 
      bgColor: 'bg-amber-400/10',
      borderColor: 'border-amber-400/30',
      label: 'Protagonist'
    },
    antagonist: { 
      icon: Skull, 
      color: 'text-red-400', 
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/30',
      label: 'Antagonist'
    },
    supporting: { 
      icon: Users, 
      color: 'text-blue-400', 
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/30',
      label: 'Supporting'
    },
    narrator: { 
      icon: User, 
      color: 'text-purple-400', 
      bgColor: 'bg-purple-400/10',
      borderColor: 'border-purple-400/30',
      label: 'Narrator'
    }
  }[role] || { 
    icon: User, 
    color: 'text-slate-400', 
    bgColor: 'bg-slate-400/10',
    borderColor: 'border-slate-400/30',
    label: 'Character'
  }
  
  const RoleIcon = roleConfig.icon
  
  return (
    <div 
      className={cn(
        'flex gap-4 p-4 rounded-xl',
        'bg-slate-800/50 border border-slate-700/50',
        'hover:border-slate-600/50 transition-colors',
        'group',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Portrait image */}
      <div className="relative flex-shrink-0 w-24 h-32 sm:w-28 sm:h-36 rounded-lg overflow-hidden bg-slate-700/50">
        {hasImage ? (
          <>
            <img
              src={image.url}
              alt={`${characterName} portrait`}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            {/* Hover controls */}
            {(onRegenerate || onEditPrompt) && (
              <div 
                className={cn(
                  'absolute inset-0 flex items-center justify-center gap-1 bg-black/60 transition-opacity duration-200',
                  isHovered ? 'opacity-100' : 'opacity-0'
                )}
              >
                {onEditPrompt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditPrompt(characterId)}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRegenerate(characterId)}
                    disabled={isGenerating}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', isGenerating && 'animate-spin')} />
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isGenerating || image?.status === 'generating' ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="text-[10px] text-slate-400">Generating...</span>
              </div>
            ) : image?.status === 'error' ? (
              <div className="flex flex-col items-center gap-1 text-red-400">
                <ImageOff className="w-6 h-6" />
                <span className="text-[10px]">Error</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <User className="w-8 h-8 opacity-40" />
                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRegenerate(characterId)}
                    className="h-6 px-2 text-[10px]"
                  >
                    Generate
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Character info */}
      <div className="flex-1 min-w-0">
        {/* Role badge */}
        <div className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider mb-2',
          roleConfig.bgColor,
          roleConfig.color,
          'border',
          roleConfig.borderColor
        )}>
          <RoleIcon className="w-2.5 h-2.5" />
          {roleConfig.label}
        </div>
        
        {/* Name */}
        <h3 className="text-lg font-semibold text-white leading-tight">
          {characterName}
        </h3>
        
        {/* Bio */}
        {bio && (
          <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-4">
            {bio}
          </p>
        )}
      </div>
    </div>
  )
}

export default CharacterPortraitCard
