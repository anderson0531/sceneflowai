'use client'

import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Users, CheckCircle2, Shirt } from 'lucide-react'
import type { CharacterSelectionProps } from './types'

/**
 * Unified character selection section for image generation dialogs.
 * Features:
 * - Shadcn Checkbox cards with avatar thumbnails
 * - "Has reference image" indicator (emerald)
 * - Per-character wardrobe dropdown (purple-themed)
 * - Default wardrobe marking from scene-level assignments
 */
export function CharacterSelectionSection({
  characters,
  selectedCharacterNames,
  onSelectionChange,
  selectedWardrobes,
  onWardrobeChange,
  sceneWardrobes,
  className,
}: CharacterSelectionProps) {
  if (characters.length === 0) return null

  const toggleCharacter = (name: string) => {
    onSelectionChange(
      selectedCharacterNames.includes(name)
        ? selectedCharacterNames.filter(n => n !== name)
        : [...selectedCharacterNames, name]
    )
  }

  return (
    <div className={cn('space-y-3 p-3 rounded border border-slate-700 bg-slate-800/50', className)}>
      <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
        <Users className="w-4 h-4 text-cyan-400" />
        Characters in Scene
      </h4>
      <p className="text-xs text-slate-400">Select characters to include for identity consistency</p>
      <div className="space-y-2">
        {characters.map((char) => {
          const isSelected = selectedCharacterNames.includes(char.name)
          const hasWardrobes = char.wardrobes && char.wardrobes.length > 0
          const currentWardrobeId = selectedWardrobes?.[char.name] || ''
          const sceneDefaultWardrobeId = sceneWardrobes?.[char.name] || ''

          return (
            <div key={char.name} className="space-y-0">
              {/* Character card */}
              <div
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
                  isSelected
                    ? 'border-cyan-500/50 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                )}
                onClick={() => toggleCharacter(char.name)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    onSelectionChange(
                      checked
                        ? [...selectedCharacterNames, char.name]
                        : selectedCharacterNames.filter(n => n !== char.name)
                    )
                  }}
                />
                {/* Avatar */}
                {char.referenceImage ? (
                  <img
                    src={char.referenceImage}
                    alt={char.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{char.name}</p>
                  {char.referenceImage && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Has reference image
                    </p>
                  )}
                </div>
              </div>

              {/* Wardrobe dropdown — only when selected and wardrobes exist */}
              {isSelected && hasWardrobes && onWardrobeChange && (
                <div className="ml-14 mt-1 mb-1">
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-purple-500/30 bg-purple-500/5">
                    <Shirt className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <Select
                      value={currentWardrobeId || sceneDefaultWardrobeId || ''}
                      onValueChange={(v) => onWardrobeChange(char.name, v)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-slate-900 border-purple-500/30">
                        <SelectValue placeholder="Select wardrobe..." />
                      </SelectTrigger>
                      <SelectContent>
                        {char.wardrobes!.map((w) => {
                          const isDefault = w.id === sceneDefaultWardrobeId
                          const hasCostumeRef = !!(w as any).fullBodyUrl
                          return (
                            <SelectItem key={w.id} value={w.id}>
                              <span className="flex items-center gap-2">
                                {hasCostumeRef && (
                                  <span className="text-[10px] text-green-500" title="Costume reference image available">📷</span>
                                )}
                                {w.name}
                                {isDefault && (
                                  <span className="text-[10px] text-purple-400 ml-1">(scene default)</span>
                                )}
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
