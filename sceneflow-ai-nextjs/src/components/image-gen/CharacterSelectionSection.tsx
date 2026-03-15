'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Users, Check, ChevronDown, ChevronUp, Shirt, Info } from 'lucide-react'
import type { CharacterSelectionProps } from './types'

/**
 * Unified character costume reference selection for image generation dialogs.
 * 
 * Displays a grid of costume reference image tiles (matching Location & Props pattern):
 * - One tile per wardrobe that has a costume reference image (fullBodyUrl or headshotUrl)
 * - One tile per character's base referenceImage if no wardrobes have images
 * - Characters without any images get a fallback icon tile
 * - Selection tracks both character name AND wardrobe ID for precise costume locking
 * 
 * Collapsible with header showing selected count badge when closed.
 */
export function CharacterSelectionSection({
  characters,
  selectedCharacterNames,
  onSelectionChange,
  selectedWardrobes,
  onWardrobeChange,
  sceneWardrobes,
  isCollapsed,
  onToggleCollapsed,
  noTalentHint,
  className,
}: CharacterSelectionProps) {
  // Filter out narrator/voiceover-only characters — they have no visual representation
  const visualCharacters = characters.filter(c => {
    return c.type !== 'narrator' && c.type !== 'description'
  })

  if (visualCharacters.length === 0) return null

  // Build a flat list of selectable "costume tiles"
  // Each tile = one wardrobe with a costume reference image
  // Base portraits are NOT included — they're only used as source images
  // for generating costume references, not as standalone selectable options
  interface CostumeTile {
    characterName: string
    wardrobeId?: string
    wardrobeName?: string
    imageUrl?: string
    label: string
    sublabel: string
    isSceneDefault?: boolean
  }

  const tiles: CostumeTile[] = []

  for (const char of visualCharacters) {
    const wardrobesWithImages = (char.wardrobes || []).filter(
      (w) => (w as any).fullBodyUrl || (w as any).headshotUrl
    )

    // Deduplicate: if two wardrobes share the same image URL, keep only the first
    const seenImageUrls = new Set<string>()
    const uniqueWardrobesWithImages = wardrobesWithImages.filter((w) => {
      const imgUrl = (w as any).fullBodyUrl || (w as any).headshotUrl
      if (seenImageUrls.has(imgUrl)) return false
      seenImageUrls.add(imgUrl)
      return true
    })

    if (uniqueWardrobesWithImages.length > 0) {
      // One tile per wardrobe that has a costume image (deduplicated)
      for (const w of uniqueWardrobesWithImages) {
        const imgUrl = (w as any).fullBodyUrl || (w as any).headshotUrl
        tiles.push({
          characterName: char.name,
          wardrobeId: w.id,
          wardrobeName: w.name,
          imageUrl: imgUrl,
          label: char.name,
          sublabel: w.name,
          isSceneDefault: sceneWardrobes?.[char.name] === w.id,
        })
      }
      // NOTE: Base portrait tiles are intentionally NOT added here.
      // Base portraits exist only as source images for generating costume
      // references, not as selectable options in the image generation dialog.
    } else if (char.referenceImage) {
      // No wardrobe images — show base portrait
      tiles.push({
        characterName: char.name,
        wardrobeId: undefined,
        wardrobeName: undefined,
        imageUrl: char.referenceImage,
        label: char.name,
        sublabel: 'Reference',
      })
    } else {
      // No images at all — fallback icon tile
      tiles.push({
        characterName: char.name,
        wardrobeId: undefined,
        wardrobeName: undefined,
        imageUrl: undefined,
        label: char.name,
        sublabel: char.wardrobes?.length ? 'No costume images' : 'No reference',
      })
    }
  }

  // A tile is selected if the character name is selected AND
  // (if wardrobeId exists) that specific wardrobe is the selected wardrobe for the character
  const isTileSelected = (tile: CostumeTile): boolean => {
    if (!selectedCharacterNames.includes(tile.characterName)) return false
    if (tile.wardrobeId) {
      return selectedWardrobes?.[tile.characterName] === tile.wardrobeId
    }
    // Base portrait / no wardrobe — selected if character is selected and no wardrobe chosen
    return !selectedWardrobes?.[tile.characterName]
  }

  const handleTileClick = (tile: CostumeTile) => {
    const isCurrentlySelected = isTileSelected(tile)

    if (isCurrentlySelected) {
      // Deselect this character entirely
      onSelectionChange(selectedCharacterNames.filter(n => n !== tile.characterName))
      if (onWardrobeChange && tile.wardrobeId) {
        onWardrobeChange(tile.characterName, '')
      }
    } else {
      // Select this character (and this specific wardrobe if applicable)
      if (!selectedCharacterNames.includes(tile.characterName)) {
        onSelectionChange([...selectedCharacterNames, tile.characterName])
      }
      if (onWardrobeChange && tile.wardrobeId) {
        onWardrobeChange(tile.characterName, tile.wardrobeId)
      } else if (onWardrobeChange) {
        // Selecting base portrait — clear wardrobe
        onWardrobeChange(tile.characterName, '')
      }
    }
  }

  const selectedCount = selectedCharacterNames.length
  const isCollapsedState = isCollapsed ?? false

  return (
    <div className={cn('space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50', className)}>
      {/* Collapsible header */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex items-center gap-2 w-full text-left"
      >
        <Shirt className="w-4 h-4 text-cyan-400" />
        <h4 className="text-sm font-medium text-slate-200 flex-1">Talent Costume References</h4>
        {selectedCount > 0 && (
          <Badge variant="secondary" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-0">
            {selectedCount} selected
          </Badge>
        )}
        {isCollapsedState ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {!isCollapsedState && (
        <>
          <p className="text-xs text-slate-400">Select costume references to include for character identity & wardrobe consistency</p>

          {/* No-talent hint for title sequences, VFX-only, etc. */}
          {noTalentHint && (
            <div className="flex items-start gap-2 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20">
              <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-300/90">
                No characters detected for this segment. You can still select costume references manually if characters appear in the frame.
              </p>
            </div>
          )}

          {/* Convenience buttons */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  onSelectionChange([])
                  // Clear all wardrobe selections too
                  if (onWardrobeChange) {
                    for (const name of selectedCharacterNames) {
                      onWardrobeChange(name, '')
                    }
                  }
                }}
                className="h-6 text-[10px] text-slate-400 hover:text-slate-300 px-2 rounded"
              >
                Unselect All
              </button>
            </div>
          )}

          {/* Costume grid — matches Location & Props visual pattern */}
          <div className="grid grid-cols-4 gap-2">
            {tiles.map((tile, idx) => {
              const isSelected = isTileSelected(tile)
              return (
                <button
                  key={`${tile.characterName}-${tile.wardrobeId || 'base'}-${idx}`}
                  type="button"
                  onClick={() => handleTileClick(tile)}
                  className={cn(
                    'relative rounded-lg overflow-hidden border-2 transition-all aspect-[3/4]',
                    isSelected
                      ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                      : 'border-slate-700 hover:border-slate-500'
                  )}
                  title={`${tile.label}${tile.wardrobeName ? ` — ${tile.wardrobeName}` : ''}`}
                >
                  {tile.imageUrl ? (
                    <img
                      src={tile.imageUrl}
                      alt={tile.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <Users className="w-8 h-8 text-slate-500" />
                    </div>
                  )}
                  {/* Selection check */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {/* Scene default badge */}
                  {tile.isSceneDefault && (
                    <div className="absolute top-1 left-1">
                      <Badge variant="secondary" className="text-[8px] bg-purple-500/80 text-white border-0 px-1 py-0">
                        Default
                      </Badge>
                    </div>
                  )}
                  {/* Name + wardrobe overlay */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 pt-4">
                    <p className="text-[10px] text-white font-medium truncate">{tile.label}</p>
                    {tile.sublabel && (
                      <p className="text-[9px] text-slate-300 truncate">{tile.sublabel}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-slate-500">
            Selected costumes will be included as reference images for character identity & wardrobe consistency.
          </p>
        </>
      )}
    </div>
  )
}
