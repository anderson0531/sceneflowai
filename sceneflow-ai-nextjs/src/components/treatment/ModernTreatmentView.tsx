'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { 
  Sparkles, 
  RefreshCw, 
  Download,
  Share2,
  Settings2,
  Sun,
  Moon,
  Palette,
  Coins
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TreatmentHeroImage } from './TreatmentHeroImage'
import { CharacterPortraitCard } from './CharacterPortraitCard'
import { ActAnchorSection } from './ActAnchorSection'
import { KeyPropDisplay } from './KeyPropDisplay'
import { 
  type TreatmentVisuals, 
  type TreatmentMood,
  type CharacterPortrait,
  type ActAnchor,
  type KeyProp,
  type GeneratedImage,
  type TonePalette,
  calculateTreatmentCredits,
  TONE_PALETTE_COLORS
} from '@/types/treatment-visuals'
import type { FilmTreatmentData } from '@/lib/types/reports'

interface ModernTreatmentViewProps {
  /** Film treatment data from the store/API */
  treatment: FilmTreatmentData
  /** Treatment visuals (images, tone strips) - optional, can be generated on demand */
  visuals?: TreatmentVisuals | null
  /** Callback when visuals need to be generated */
  onGenerateVisuals?: () => Promise<void>
  /** Callback when a specific visual needs regeneration */
  onRegenerateVisual?: (type: 'hero' | 'character' | 'act' | 'keyProp', id?: string | number) => Promise<void>
  /** Callback for mood change */
  onMoodChange?: (mood: TreatmentMood) => void
  /** Whether visuals are currently being generated */
  isGenerating?: boolean
  /** Show generation controls */
  showControls?: boolean
  /** Additional className */
  className?: string
}

/**
 * Modern Treatment View - Visually-rich Film Treatment layout
 * 
 * Displays a Film Treatment with:
 * - Hero image (poster-style title card)
 * - Character portraits (trading card style)
 * - Act anchors (wide cinematic establishing shots)
 * - Key prop display (MacGuffin visualization)
 * - Tone strips (abstract mood indicators)
 */
export function ModernTreatmentView({
  treatment,
  visuals,
  onGenerateVisuals,
  onRegenerateVisual,
  onMoodChange,
  isGenerating = false,
  showControls = true,
  className
}: ModernTreatmentViewProps) {
  const [showMoodPanel, setShowMoodPanel] = useState(false)
  
  // Extract treatment data
  const {
    title = 'Untitled',
    logline,
    synopsis,
    genre,
    author_writer,
    date,
    setting,
    protagonist,
    antagonist,
    tone,
    visual_style,
    themes,
    act_breakdown,
    character_descriptions,
    beats
  } = treatment
  
  // Derive character portraits from treatment data
  const characterPortraits: CharacterPortrait[] = useMemo(() => {
    const portraits: CharacterPortrait[] = []
    
    // Add protagonist if exists
    if (protagonist) {
      portraits.push({
        characterId: 'protagonist',
        characterName: protagonist.split(':')[0].trim() || protagonist,
        role: 'protagonist',
        portrait: visuals?.characterPortraits?.find(p => p.characterId === 'protagonist')?.portrait || null,
        bio: protagonist.includes(':') ? protagonist.split(':').slice(1).join(':').trim() : undefined
      })
    }
    
    // Add antagonist if exists
    if (antagonist) {
      portraits.push({
        characterId: 'antagonist',
        characterName: antagonist.split(':')[0].trim() || antagonist,
        role: 'antagonist',
        portrait: visuals?.characterPortraits?.find(p => p.characterId === 'antagonist')?.portrait || null,
        bio: antagonist.includes(':') ? antagonist.split(':').slice(1).join(':').trim() : undefined
      })
    }
    
    // Add character descriptions
    character_descriptions?.forEach((char, i) => {
      const existingPortrait = visuals?.characterPortraits?.find(p => p.characterId === `char-${i}`)
      portraits.push({
        characterId: `char-${i}`,
        characterName: char.name,
        role: (char.role?.toLowerCase() as CharacterPortrait['role']) || 'supporting',
        portrait: existingPortrait?.portrait || null,
        bio: char.description
      })
    })
    
    return portraits
  }, [protagonist, antagonist, character_descriptions, visuals?.characterPortraits])
  
  // Derive act anchors from treatment data
  const actAnchors: ActAnchor[] = useMemo(() => {
    const anchors: ActAnchor[] = []
    
    if (act_breakdown) {
      if (act_breakdown.act1) {
        anchors.push({
          actNumber: 1,
          title: 'Setup',
          establishingShot: visuals?.actAnchors?.find(a => a.actNumber === 1)?.establishingShot || null,
          toneStrip: visuals?.actAnchors?.find(a => a.actNumber === 1)?.toneStrip || null,
          content: act_breakdown.act1,
          mood: 'hopeful'
        })
      }
      if (act_breakdown.act2) {
        anchors.push({
          actNumber: 2,
          title: 'Confrontation',
          establishingShot: visuals?.actAnchors?.find(a => a.actNumber === 2)?.establishingShot || null,
          toneStrip: visuals?.actAnchors?.find(a => a.actNumber === 2)?.toneStrip || null,
          content: act_breakdown.act2,
          mood: 'tense'
        })
      }
      if (act_breakdown.act3) {
        anchors.push({
          actNumber: 3,
          title: 'Resolution',
          establishingShot: visuals?.actAnchors?.find(a => a.actNumber === 3)?.establishingShot || null,
          toneStrip: visuals?.actAnchors?.find(a => a.actNumber === 3)?.toneStrip || null,
          content: act_breakdown.act3,
          mood: 'hopeful'
        })
      }
    }
    
    return anchors
  }, [act_breakdown, visuals?.actAnchors])
  
  // Calculate estimated credits
  const estimatedCredits = useMemo(() => {
    return calculateTreatmentCredits(characterPortraits.length, true, true)
  }, [characterPortraits.length])
  
  // Format themes
  const formattedThemes = useMemo(() => {
    if (!themes) return null
    if (Array.isArray(themes)) return themes.join(' • ')
    return themes
  }, [themes])
  
  // Handle visual regeneration
  const handleRegenerateHero = useCallback(() => {
    onRegenerateVisual?.('hero')
  }, [onRegenerateVisual])
  
  const handleRegenerateCharacter = useCallback((characterId: string) => {
    onRegenerateVisual?.('character', characterId)
  }, [onRegenerateVisual])
  
  const handleRegenerateAct = useCallback((actNumber: number) => {
    onRegenerateVisual?.('act', actNumber)
  }, [onRegenerateVisual])
  
  return (
    <div className={cn('max-w-4xl mx-auto space-y-8', className)}>
      {/* Controls bar */}
      {showControls && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-slate-300">
              Modern Treatment View
            </span>
            <span className="text-xs text-slate-500">
              (Visual Enhancement)
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Credit estimate */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 text-xs">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">~{estimatedCredits} credits</span>
            </div>
            
            {/* Mood toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoodPanel(!showMoodPanel)}
              className="h-8"
            >
              <Palette className="w-4 h-4 mr-1.5" />
              Mood
            </Button>
            
            {/* Generate all visuals */}
            {onGenerateVisuals && (
              <Button
                variant="default"
                size="sm"
                onClick={onGenerateVisuals}
                disabled={isGenerating}
                className="h-8"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Generate Visuals
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Mood panel */}
      {showMoodPanel && onMoodChange && (
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Regenerate Vibe</span>
            <span className="text-xs text-slate-500">Changes only the visuals, not the text</span>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {(['dark', 'balanced', 'light', 'stylized'] as TreatmentMood[]).map(mood => (
              <button
                key={mood}
                onClick={() => onMoodChange(mood)}
                className={cn(
                  'p-3 rounded-lg border text-sm font-medium transition-colors',
                  visuals?.mood === mood
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                    : 'bg-slate-700/50 border-slate-600/50 text-slate-400 hover:border-slate-500'
                )}
              >
                {mood === 'dark' && <Moon className="w-4 h-4 mx-auto mb-1" />}
                {mood === 'balanced' && <Settings2 className="w-4 h-4 mx-auto mb-1" />}
                {mood === 'light' && <Sun className="w-4 h-4 mx-auto mb-1" />}
                {mood === 'stylized' && <Palette className="w-4 h-4 mx-auto mb-1" />}
                <span className="capitalize">{mood}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* ============================================ */}
      {/* TITLE PAGE - Hero Image */}
      {/* ============================================ */}
      <TreatmentHeroImage
        image={visuals?.heroImage || null}
        title={title}
        subtitle={logline}
        genre={genre}
        aspectRatio="16:9"
        onRegenerate={handleRegenerateHero}
        isGenerating={isGenerating}
      />
      
      {/* ============================================ */}
      {/* LOGLINE Section */}
      {/* ============================================ */}
      {logline && (
        <section className="px-2 sm:px-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Logline
          </h2>
          <blockquote className="text-xl sm:text-2xl text-slate-200 font-serif italic leading-relaxed border-l-4 border-amber-500/50 pl-4">
            "{logline}"
          </blockquote>
          
          {/* Key prop inline with logline */}
          {visuals?.keyProp && (
            <div className="mt-6 flex justify-center">
              <KeyPropDisplay
                keyProp={visuals.keyProp}
                onRegenerate={() => onRegenerateVisual?.('keyProp')}
                isGenerating={isGenerating}
                variant="centered"
              />
            </div>
          )}
        </section>
      )}
      
      {/* ============================================ */}
      {/* METADATA Section */}
      {/* ============================================ */}
      <section className="px-2 sm:px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
          {genre && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Genre</span>
              <p className="text-sm text-slate-300 font-medium">{genre}</p>
            </div>
          )}
          {setting && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Setting</span>
              <p className="text-sm text-slate-300 font-medium">{setting}</p>
            </div>
          )}
          {tone && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Tone</span>
              <p className="text-sm text-slate-300 font-medium">{tone}</p>
            </div>
          )}
          {author_writer && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Written By</span>
              <p className="text-sm text-slate-300 font-medium">{author_writer}</p>
            </div>
          )}
        </div>
      </section>
      
      {/* ============================================ */}
      {/* SYNOPSIS Section */}
      {/* ============================================ */}
      {synopsis && (
        <section className="px-2 sm:px-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Synopsis
          </h2>
          <div className="prose prose-invert prose-slate max-w-none">
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {synopsis}
            </p>
          </div>
        </section>
      )}
      
      {/* ============================================ */}
      {/* CHARACTERS Section */}
      {/* ============================================ */}
      {characterPortraits.length > 0 && (
        <section className="px-2 sm:px-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Characters
          </h2>
          <div className="space-y-3">
            {characterPortraits.map(portrait => (
              <CharacterPortraitCard
                key={portrait.characterId}
                portrait={portrait}
                onRegenerate={handleRegenerateCharacter}
                isGenerating={isGenerating}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* ============================================ */}
      {/* THEMES Section */}
      {/* ============================================ */}
      {formattedThemes && (
        <section className="px-2 sm:px-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Themes
          </h2>
          <p className="text-slate-300 italic">{formattedThemes}</p>
        </section>
      )}
      
      {/* ============================================ */}
      {/* VISUAL STYLE Section */}
      {/* ============================================ */}
      {visual_style && (
        <section className="px-2 sm:px-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Visual Style
          </h2>
          <p className="text-slate-300">{visual_style}</p>
        </section>
      )}
      
      {/* ============================================ */}
      {/* ACT BREAKDOWN Sections */}
      {/* ============================================ */}
      {actAnchors.length > 0 && (
        <div className="space-y-12 mt-12">
          {actAnchors.map(anchor => (
            <ActAnchorSection
              key={anchor.actNumber}
              actAnchor={anchor}
              onRegenerateImage={handleRegenerateAct}
              isGenerating={isGenerating}
            />
          ))}
        </div>
      )}
      
      {/* ============================================ */}
      {/* STORY BEATS Section (if no act breakdown) */}
      {/* ============================================ */}
      {beats && beats.length > 0 && actAnchors.length === 0 && (
        <section className="px-2 sm:px-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Story Beats
          </h2>
          <ol className="space-y-4">
            {beats.map((beat, index) => (
              <li 
                key={index}
                className="flex gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{beat.title}</h3>
                    <span className="text-xs text-slate-500">({beat.minutes} min)</span>
                  </div>
                  {beat.synopsis && (
                    <p className="text-sm text-slate-400">{beat.synopsis}</p>
                  )}
                  {beat.intent && (
                    <p className="text-xs text-slate-500 mt-1 italic">{beat.intent}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      
      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="pt-8 pb-4 px-2 sm:px-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>SceneFlow AI: Accelerate Your Vision</span>
          {date && <span>{date}</span>}
        </div>
      </footer>
    </div>
  )
}

export default ModernTreatmentView
