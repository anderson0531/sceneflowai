/**
 * Smart Prompt Control Modules
 * 
 * Accordion-based control modules for the Video Editing Dialog's Smart Prompt interface.
 * Each module controls a specific aspect of video generation.
 * 
 * @module SmartPromptModules
 */

'use client'

import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import {
  Video,
  Activity,
  Palette,
  Wand2,
  Camera,
  Focus,
  Timer,
  Zap,
  User,
  Eye,
  Mic,
  Heart,
  Sun,
  Film,
  Sparkles,
  Droplets,
  AlertTriangle,
  Lock,
} from 'lucide-react'

import {
  CameraControlSettings,
  PerformanceSettings,
  VisualStyleSettings,
  MagicEditSettings,
  CameraMovementType,
  ShotFramingType,
  CameraVelocity,
  FocusMode,
  LipSyncPriority,
  EyeContactMode,
  VisualStylePreset,
  LightingStyle,
  ColorGradingPreset,
  MagicEditSelectionMethod,
  MagicEditOperationType,
} from './types'

// ============================================================================
// Shared Components
// ============================================================================

interface ModuleHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  badge?: { text: string; variant: 'coming-soon' | 'beta' | 'new' }
}

function ModuleHeader({ icon, title, subtitle, badge }: ModuleHeaderProps) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-sf-primary/20 to-sf-primary/5 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          {badge && (
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded font-medium",
              badge.variant === 'coming-soon' && "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
              badge.variant === 'beta' && "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
              badge.variant === 'new' && "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300",
            )}>
              {badge.text}
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{subtitle}</span>
        )}
      </div>
    </div>
  )
}

interface ControlRowProps {
  icon?: React.ReactNode
  label: string
  children: React.ReactNode
  disabled?: boolean
  comingSoon?: boolean
}

function ControlRow({ icon, label, children, disabled, comingSoon }: ControlRowProps) {
  return (
    <div className={cn(
      "flex items-center justify-between py-2",
      disabled && "opacity-50 pointer-events-none"
    )}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400 w-4 h-4">{icon}</span>}
        <Label className="text-xs text-gray-600 dark:text-gray-400">{label}</Label>
        {comingSoon && (
          <span className="text-[8px] px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
            Soon
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  )
}

interface SliderControlProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  showValue?: boolean
}

function SliderControl({ value, onChange, min = 0, max = 100, step = 1, disabled, showValue = true }: SliderControlProps) {
  return (
    <div className="flex items-center gap-2 w-32">
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="flex-1"
      />
      {showValue && (
        <span className="text-[10px] text-gray-500 w-8 text-right">{value}%</span>
      )}
    </div>
  )
}

// ============================================================================
// Camera & Temporal Module
// ============================================================================

interface CameraModuleProps {
  settings: CameraControlSettings
  onChange: (settings: CameraControlSettings) => void
}

const CAMERA_MOVEMENTS: { value: CameraMovementType; label: string }[] = [
  { value: 'static', label: 'Static' },
  { value: 'dolly-in', label: 'Dolly In' },
  { value: 'pull-out', label: 'Pull Out' },
  { value: 'pan-left', label: 'Pan Left' },
  { value: 'pan-right', label: 'Pan Right' },
  { value: 'tilt-up', label: 'Tilt Up' },
  { value: 'tilt-down', label: 'Tilt Down' },
  { value: 'crane', label: 'Crane' },
  { value: 'handheld', label: 'Handheld' },
  { value: 'steadicam', label: 'Steadicam' },
  { value: 'track', label: 'Track' },
  { value: 'orbit', label: 'Orbit' },
  { value: 'whip-pan', label: 'Whip Pan' },
]

const SHOT_FRAMINGS: { value: ShotFramingType; label: string }[] = [
  { value: 'extreme-wide', label: 'Extreme Wide' },
  { value: 'wide', label: 'Wide' },
  { value: 'medium-wide', label: 'Medium Wide' },
  { value: 'medium', label: 'Medium' },
  { value: 'medium-close', label: 'Medium Close' },
  { value: 'close-up', label: 'Close-Up' },
  { value: 'extreme-close-up', label: 'Extreme Close-Up' },
  { value: 'over-shoulder', label: 'Over Shoulder' },
  { value: 'two-shot', label: 'Two-Shot' },
  { value: 'insert', label: 'Insert' },
]

export function CameraModule({ settings, onChange }: CameraModuleProps) {
  const update = <K extends keyof CameraControlSettings>(key: K, value: CameraControlSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <AccordionItem value="camera" className="border rounded-lg px-3 mb-2">
      <AccordionTrigger className="hover:no-underline py-3">
        <ModuleHeader
          icon={<Video className="w-4 h-4 text-sf-primary" />}
          title="Camera & Temporal"
          subtitle="Movement, framing, pacing"
        />
      </AccordionTrigger>
      <AccordionContent className="pb-3">
        <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-3">
          {/* Movement Type */}
          <ControlRow icon={<Camera className="w-3.5 h-3.5" />} label="Movement">
            <Select value={settings.movementType} onValueChange={(v) => update('movementType', v as CameraMovementType)}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMERA_MOVEMENTS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlRow>

          {/* Velocity */}
          <ControlRow icon={<Zap className="w-3.5 h-3.5" />} label="Velocity">
            <Select value={settings.velocity} onValueChange={(v) => update('velocity', v as CameraVelocity)}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow" className="text-xs">Slow</SelectItem>
                <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                <SelectItem value="fast" className="text-xs">Fast</SelectItem>
              </SelectContent>
            </Select>
          </ControlRow>

          {/* Shot Framing */}
          <ControlRow icon={<Focus className="w-3.5 h-3.5" />} label="Framing">
            <Select value={settings.shotFraming} onValueChange={(v) => update('shotFraming', v as ShotFramingType)}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHOT_FRAMINGS.map(f => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlRow>

          {/* Focus Mode */}
          <ControlRow icon={<Eye className="w-3.5 h-3.5" />} label="Focus">
            <Select value={settings.focusMode} onValueChange={(v) => update('focusMode', v as FocusMode)}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="locked" className="text-xs">Locked</SelectItem>
                <SelectItem value="rack" className="text-xs">Rack Focus</SelectItem>
                <SelectItem value="follow" className="text-xs">Follow</SelectItem>
                <SelectItem value="deep" className="text-xs">Deep Focus</SelectItem>
              </SelectContent>
            </Select>
          </ControlRow>

          {/* Motion Intensity Slider */}
          <ControlRow icon={<Activity className="w-3.5 h-3.5" />} label="Motion Intensity">
            <SliderControl
              value={settings.motionIntensity}
              onChange={(v) => update('motionIntensity', v)}
            />
          </ControlRow>

          {/* Pacing Style */}
          <ControlRow icon={<Timer className="w-3.5 h-3.5" />} label="Pacing">
            <Select value={settings.pacingStyle} onValueChange={(v) => update('pacingStyle', v as CameraControlSettings['pacingStyle'])}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contemplative" className="text-xs">Contemplative</SelectItem>
                <SelectItem value="natural" className="text-xs">Natural</SelectItem>
                <SelectItem value="dynamic" className="text-xs">Dynamic</SelectItem>
                <SelectItem value="frenetic" className="text-xs">Frenetic</SelectItem>
              </SelectContent>
            </Select>
          </ControlRow>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// ============================================================================
// Performance & Dialog Sync Module
// ============================================================================

interface PerformanceModuleProps {
  settings: PerformanceSettings
  onChange: (settings: PerformanceSettings) => void
  characters?: Array<{ name: string }>
}

export function PerformanceModule({ settings, onChange, characters = [] }: PerformanceModuleProps) {
  const update = <K extends keyof PerformanceSettings>(key: K, value: PerformanceSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <AccordionItem value="performance" className="border rounded-lg px-3 mb-2">
      <AccordionTrigger className="hover:no-underline py-3">
        <ModuleHeader
          icon={<User className="w-4 h-4 text-sf-primary" />}
          title="Performance & Dialog"
          subtitle="Acting, expressions, sync"
          badge={{ text: 'Lip-Sync Soon', variant: 'coming-soon' }}
        />
      </AccordionTrigger>
      <AccordionContent className="pb-3">
        <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-3">
          {/* Primary Character */}
          {characters.length > 0 && (
            <ControlRow icon={<User className="w-3.5 h-3.5" />} label="Focus Character">
              <Select value={settings.primaryCharacter || ''} onValueChange={(v) => update('primaryCharacter', v || undefined)}>
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">Any</SelectItem>
                  {characters.map(c => (
                    <SelectItem key={c.name} value={c.name} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlRow>
          )}

          {/* Expression Intensity */}
          <ControlRow icon={<Heart className="w-3.5 h-3.5" />} label="Expression">
            <SliderControl
              value={settings.expressionIntensity}
              onChange={(v) => update('expressionIntensity', v)}
            />
          </ControlRow>

          {/* Micro-expressions Toggle */}
          <ControlRow icon={<Sparkles className="w-3.5 h-3.5" />} label="Micro-expressions">
            <Switch
              checked={settings.microExpressionsEnabled}
              onCheckedChange={(v) => update('microExpressionsEnabled', v)}
            />
          </ControlRow>

          {/* Eye Contact */}
          <ControlRow icon={<Eye className="w-3.5 h-3.5" />} label="Eye Contact">
            <Select value={settings.eyeContactMode} onValueChange={(v) => update('eyeContactMode', v as EyeContactMode)}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="natural" className="text-xs">Natural</SelectItem>
                <SelectItem value="camera-aware" className="text-xs">Camera Aware</SelectItem>
                <SelectItem value="avoid" className="text-xs">Avoidant</SelectItem>
                <SelectItem value="scene-specific" className="text-xs">Scene-Specific</SelectItem>
              </SelectContent>
            </Select>
          </ControlRow>

          {/* Body Language */}
          <ControlRow icon={<Activity className="w-3.5 h-3.5" />} label="Body Language">
            <SliderControl
              value={settings.bodyLanguageIntensity}
              onChange={(v) => update('bodyLanguageIntensity', v)}
            />
          </ControlRow>

          {/* Emotional State (text input) */}
          <ControlRow icon={<Heart className="w-3.5 h-3.5" />} label="Emotional State">
            <Input
              value={settings.emotionalState || ''}
              onChange={(e) => update('emotionalState', e.target.value || undefined)}
              placeholder="e.g., tense"
              className="w-28 h-7 text-xs"
            />
          </ControlRow>

          {/* Lip-Sync (Coming Soon) */}
          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-1">
              <Mic className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">Lip-Sync</span>
              <span className="text-[8px] px-1 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 rounded">
                Coming Soon
              </span>
            </div>
            <p className="text-[10px] text-amber-700 dark:text-amber-300">
              Automatic lip-sync with dialogue audio will be available when Veo supports audio-guided generation.
            </p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// ============================================================================
// Visual Style Module
// ============================================================================

interface VisualStyleModuleProps {
  settings: VisualStyleSettings
  onChange: (settings: VisualStyleSettings) => void
}

const STYLE_PRESETS: { value: VisualStylePreset; label: string }[] = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'music-video', label: 'Music Video' },
  { value: 'horror', label: 'Horror' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'noir', label: 'Noir' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'custom', label: 'Custom' },
]

const LIGHTING_STYLES: { value: LightingStyle; label: string }[] = [
  { value: 'natural', label: 'Natural' },
  { value: 'studio', label: 'Studio' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'soft', label: 'Soft' },
  { value: 'high-key', label: 'High-Key' },
  { value: 'low-key', label: 'Low-Key' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'blue-hour', label: 'Blue Hour' },
  { value: 'neon', label: 'Neon' },
  { value: 'practical', label: 'Practical' },
]

const COLOR_GRADINGS: { value: ColorGradingPreset; label: string }[] = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'warm', label: 'Warm' },
  { value: 'cool', label: 'Cool' },
  { value: 'teal-orange', label: 'Teal & Orange' },
  { value: 'bleach-bypass', label: 'Bleach Bypass' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'high-contrast', label: 'High Contrast' },
  { value: 'desaturated', label: 'Desaturated' },
  { value: 'vibrant', label: 'Vibrant' },
]

export function VisualStyleModule({ settings, onChange }: VisualStyleModuleProps) {
  const update = <K extends keyof VisualStyleSettings>(key: K, value: VisualStyleSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const isCustom = settings.stylePreset === 'custom'

  return (
    <AccordionItem value="visual-style" className="border rounded-lg px-3 mb-2">
      <AccordionTrigger className="hover:no-underline py-3">
        <ModuleHeader
          icon={<Palette className="w-4 h-4 text-sf-primary" />}
          title="Visual Style"
          subtitle="Lighting, color, atmosphere"
        />
      </AccordionTrigger>
      <AccordionContent className="pb-3">
        <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-3">
          {/* Style Preset */}
          <ControlRow icon={<Film className="w-3.5 h-3.5" />} label="Style Preset">
            <Select value={settings.stylePreset} onValueChange={(v) => update('stylePreset', v as VisualStylePreset)}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_PRESETS.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlRow>

          {/* Lighting (always visible) */}
          <ControlRow icon={<Sun className="w-3.5 h-3.5" />} label="Lighting">
            <Select value={settings.lighting} onValueChange={(v) => update('lighting', v as LightingStyle)}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIGHTING_STYLES.map(l => (
                  <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlRow>

          {/* Color Grading */}
          <ControlRow icon={<Palette className="w-3.5 h-3.5" />} label="Color Grade">
            <Select value={settings.colorGrading} onValueChange={(v) => update('colorGrading', v as ColorGradingPreset)}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_GRADINGS.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlRow>

          {/* Advanced controls (shown in custom mode or always?) */}
          {isCustom && (
            <>
              {/* Saturation */}
              <ControlRow label="Saturation">
                <SliderControl
                  value={settings.saturation}
                  onChange={(v) => update('saturation', v)}
                />
              </ControlRow>

              {/* Contrast */}
              <ControlRow label="Contrast">
                <SliderControl
                  value={settings.contrast}
                  onChange={(v) => update('contrast', v)}
                />
              </ControlRow>

              {/* Lighting Intensity */}
              <ControlRow label="Light Intensity">
                <SliderControl
                  value={settings.lightingIntensity}
                  onChange={(v) => update('lightingIntensity', v)}
                />
              </ControlRow>
            </>
          )}

          {/* Film Grain */}
          <ControlRow icon={<Sparkles className="w-3.5 h-3.5" />} label="Film Grain">
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.filmGrainEnabled}
                onCheckedChange={(v) => update('filmGrainEnabled', v)}
              />
              {settings.filmGrainEnabled && (
                <SliderControl
                  value={settings.filmGrainIntensity}
                  onChange={(v) => update('filmGrainIntensity', v)}
                  showValue={false}
                />
              )}
            </div>
          </ControlRow>

          {/* Depth of Field */}
          <ControlRow icon={<Focus className="w-3.5 h-3.5" />} label="Depth of Field">
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.depthOfFieldEnabled}
                onCheckedChange={(v) => update('depthOfFieldEnabled', v)}
              />
              {settings.depthOfFieldEnabled && (
                <Select value={settings.apertureStyle} onValueChange={(v) => update('apertureStyle', v as VisualStyleSettings['apertureStyle'])}>
                  <SelectTrigger className="w-20 h-6 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wide" className="text-xs">Wide</SelectItem>
                    <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                    <SelectItem value="shallow" className="text-xs">Shallow</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </ControlRow>

          {/* Atmosphere */}
          <ControlRow icon={<Droplets className="w-3.5 h-3.5" />} label="Atmosphere">
            <Select value={settings.atmosphereType || 'none'} onValueChange={(v) => update('atmosphereType', v === 'none' ? undefined : v as VisualStyleSettings['atmosphereType'])}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">None</SelectItem>
                <SelectItem value="haze" className="text-xs">Haze</SelectItem>
                <SelectItem value="fog" className="text-xs">Fog</SelectItem>
                <SelectItem value="rain" className="text-xs">Rain</SelectItem>
                <SelectItem value="snow" className="text-xs">Snow</SelectItem>
                <SelectItem value="dust" className="text-xs">Dust</SelectItem>
              </SelectContent>
            </Select>
          </ControlRow>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// ============================================================================
// Magic Edit Module (In-Painting)
// ============================================================================

interface MagicEditModuleProps {
  settings: MagicEditSettings
  onChange: (settings: MagicEditSettings) => void
}

export function MagicEditModule({ settings, onChange }: MagicEditModuleProps) {
  const update = <K extends keyof MagicEditSettings>(key: K, value: MagicEditSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <AccordionItem value="magic-edit" className="border rounded-lg px-3 mb-2">
      <AccordionTrigger className="hover:no-underline py-3">
        <ModuleHeader
          icon={<Wand2 className="w-4 h-4 text-sf-primary" />}
          title="Magic Edit"
          subtitle="Object manipulation"
          badge={{ text: 'Coming Soon', variant: 'coming-soon' }}
        />
      </AccordionTrigger>
      <AccordionContent className="pb-3">
        <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
          {/* Coming Soon Notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Video Inpainting Not Yet Available</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">
                  This feature will allow targeted object manipulation (add, remove, replace, modify) once available in the Veo API.
                </p>
              </div>
            </div>
          </div>

          {/* Preview Controls (disabled) */}
          <div className="opacity-50 pointer-events-none space-y-1">
            {/* Enable Toggle */}
            <ControlRow icon={<Wand2 className="w-3.5 h-3.5" />} label="Enable Magic Edit" disabled>
              <Switch checked={settings.enabled} disabled />
            </ControlRow>

            {/* Operation Type */}
            <ControlRow label="Operation" disabled>
              <Select value={settings.operationType} disabled>
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="replace" className="text-xs">Replace</SelectItem>
                  <SelectItem value="remove" className="text-xs">Remove</SelectItem>
                  <SelectItem value="add" className="text-xs">Add</SelectItem>
                  <SelectItem value="modify" className="text-xs">Modify</SelectItem>
                  <SelectItem value="style-transfer" className="text-xs">Style Transfer</SelectItem>
                </SelectContent>
              </Select>
            </ControlRow>

            {/* Target Description */}
            <ControlRow label="Target" disabled>
              <Input
                value={settings.targetDescription}
                placeholder="What to edit..."
                className="w-28 h-7 text-xs"
                disabled
              />
            </ControlRow>

            {/* Preserve Faces */}
            <ControlRow icon={<Lock className="w-3.5 h-3.5" />} label="Preserve Faces" disabled>
              <Switch checked={settings.preserveFaces} disabled />
            </ControlRow>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// ============================================================================
// Smart Prompt Control Deck (All Modules Combined)
// ============================================================================

interface SmartPromptControlDeckProps {
  cameraSettings: CameraControlSettings
  onCameraChange: (settings: CameraControlSettings) => void
  performanceSettings: PerformanceSettings
  onPerformanceChange: (settings: PerformanceSettings) => void
  visualStyleSettings: VisualStyleSettings
  onVisualStyleChange: (settings: VisualStyleSettings) => void
  magicEditSettings: MagicEditSettings
  onMagicEditChange: (settings: MagicEditSettings) => void
  characters?: Array<{ name: string }>
  defaultOpen?: string[]
}

export function SmartPromptControlDeck({
  cameraSettings,
  onCameraChange,
  performanceSettings,
  onPerformanceChange,
  visualStyleSettings,
  onVisualStyleChange,
  magicEditSettings,
  onMagicEditChange,
  characters,
  defaultOpen = ['camera'],
}: SmartPromptControlDeckProps) {
  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
      <CameraModule settings={cameraSettings} onChange={onCameraChange} />
      <PerformanceModule settings={performanceSettings} onChange={onPerformanceChange} characters={characters} />
      <VisualStyleModule settings={visualStyleSettings} onChange={onVisualStyleChange} />
      <MagicEditModule settings={magicEditSettings} onChange={onMagicEditChange} />
    </Accordion>
  )
}
