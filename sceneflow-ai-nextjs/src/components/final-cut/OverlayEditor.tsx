'use client'

import React, { useState } from 'react'
import {
  X,
  Plus,
  Type,
  Image as ImageIcon,
  Subtitles,
  FileText,
  Trash2,
  GripVertical,
  Clock,
  Move
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { 
  Overlay, 
  TextOverlay, 
  ImageOverlay, 
  SubtitleOverlay, 
  ChapterCardOverlay,
  OverlayType,
  OverlayAnimation
} from '@/lib/types/finalCut'

// ============================================================================
// Types
// ============================================================================

export interface OverlayEditorProps {
  /** Segment ID being edited */
  segmentId: string
  /** Existing overlays */
  overlays: Overlay[]
  /** Callback to close editor */
  onClose: () => void
  /** Callback when overlays are updated */
  onUpdate: (overlays: Overlay[]) => void
}

// ============================================================================
// Constants
// ============================================================================

const OVERLAY_TYPE_OPTIONS: Array<{
  type: OverlayType
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    type: 'text',
    label: 'Text',
    description: 'Titles, captions, lower thirds',
    icon: <Type className="w-5 h-5" />
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Logos, watermarks, graphics',
    icon: <ImageIcon className="w-5 h-5" />
  },
  {
    type: 'subtitle',
    label: 'Subtitle',
    description: 'Subtitle text track',
    icon: <Subtitles className="w-5 h-5" />
  },
  {
    type: 'chapter-card',
    label: 'Chapter Card',
    description: 'Scene dividers, title cards',
    icon: <FileText className="w-5 h-5" />
  }
]

const ANIMATION_OPTIONS: Array<{
  value: OverlayAnimation['type']
  label: string
}> = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
  { value: 'scale', label: 'Scale' }
]

const POSITION_PRESETS = [
  { label: 'Top Left', x: 10, y: 10, anchor: 'top-left' as const },
  { label: 'Top Center', x: 50, y: 10, anchor: 'top-center' as const },
  { label: 'Top Right', x: 90, y: 10, anchor: 'top-right' as const },
  { label: 'Center', x: 50, y: 50, anchor: 'center' as const },
  { label: 'Bottom Left', x: 10, y: 90, anchor: 'bottom-left' as const },
  { label: 'Bottom Center', x: 50, y: 90, anchor: 'bottom-center' as const },
  { label: 'Bottom Right', x: 90, y: 90, anchor: 'bottom-right' as const }
]

// ============================================================================
// Helper: Generate ID
// ============================================================================

function generateId(): string {
  return `overlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// OverlayEditor Component
// ============================================================================

export function OverlayEditor({
  segmentId,
  overlays: initialOverlays,
  onClose,
  onUpdate
}: OverlayEditorProps) {
  const [overlays, setOverlays] = useState<Overlay[]>(initialOverlays)
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  
  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId)
  
  // Add new overlay
  const handleAddOverlay = (type: OverlayType) => {
    const baseOverlay = {
      id: generateId(),
      type,
      segmentId,
      startTime: 0,
      duration: 3000,
      position: {
        x: 50,
        y: 50,
        anchor: 'center' as const
      },
      animationIn: { type: 'fade' as const, duration: 300, easing: 'ease-out' as const },
      animationOut: { type: 'fade' as const, duration: 300, easing: 'ease-in' as const }
    }
    
    let newOverlay: Overlay
    
    switch (type) {
      case 'text':
        newOverlay = {
          ...baseOverlay,
          type: 'text',
          content: 'New Text',
          style: {
            fontFamily: 'Inter',
            fontSize: 24,
            fontWeight: 600,
            color: '#ffffff',
            textAlign: 'center'
          }
        } as TextOverlay
        break
      case 'image':
        newOverlay = {
          ...baseOverlay,
          type: 'image',
          imageUrl: '',
          opacity: 100,
          scale: 1
        } as ImageOverlay
        break
      case 'subtitle':
        newOverlay = {
          ...baseOverlay,
          type: 'subtitle',
          text: 'Subtitle text',
          language: 'en',
          style: {
            fontFamily: 'Inter',
            fontSize: 18,
            fontWeight: 500,
            color: '#ffffff',
            backgroundColor: '#000000',
            backgroundOpacity: 75,
            position: 'bottom',
            marginBottom: 50
          }
        } as SubtitleOverlay
        break
      case 'chapter-card':
        newOverlay = {
          ...baseOverlay,
          type: 'chapter-card',
          title: 'Chapter Title',
          subtitle: 'Optional subtitle',
          backgroundType: 'solid',
          backgroundColor: '#000000',
          style: {
            fontFamily: 'Inter',
            fontSize: 48,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center'
          }
        } as ChapterCardOverlay
        break
      default:
        return
    }
    
    setOverlays([...overlays, newOverlay])
    setSelectedOverlayId(newOverlay.id)
    setShowAddMenu(false)
  }
  
  // Delete overlay
  const handleDeleteOverlay = (id: string) => {
    setOverlays(overlays.filter(o => o.id !== id))
    if (selectedOverlayId === id) {
      setSelectedOverlayId(null)
    }
  }
  
  // Update overlay
  const updateOverlay = (id: string, updates: Partial<Overlay>) => {
    setOverlays(overlays.map(o => 
      o.id === id ? { ...o, ...updates } as Overlay : o
    ))
  }
  
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="font-semibold text-white">Overlay Editor</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Overlay List */}
      <div className="p-4 border-b border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <Label>Overlays</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="text-blue-400 hover:text-blue-300"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        
        {/* Add Menu */}
        {showAddMenu && (
          <div className="grid grid-cols-2 gap-2 p-2 bg-gray-800/50 rounded-lg">
            {OVERLAY_TYPE_OPTIONS.map((option) => (
              <button
                key={option.type}
                onClick={() => handleAddOverlay(option.type)}
                className="flex items-center gap-2 p-2 rounded-lg border border-gray-700 hover:border-gray-600 bg-gray-800 text-left transition-colors"
              >
                <div className="text-gray-400">{option.icon}</div>
                <span className="text-sm text-gray-200">{option.label}</span>
              </button>
            ))}
          </div>
        )}
        
        {/* Overlay List */}
        {overlays.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            No overlays yet. Click "Add" to create one.
          </div>
        ) : (
          <div className="space-y-1">
            {overlays.map((overlay) => (
              <div
                key={overlay.id}
                onClick={() => setSelectedOverlayId(overlay.id)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                  selectedOverlayId === overlay.id
                    ? "bg-blue-500/20 border border-blue-500/50"
                    : "bg-gray-800/50 border border-transparent hover:border-gray-700"
                )}
              >
                <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">
                    {overlay.type === 'text' && (overlay as TextOverlay).content}
                    {overlay.type === 'image' && 'Image Overlay'}
                    {overlay.type === 'subtitle' && (overlay as SubtitleOverlay).text}
                    {overlay.type === 'chapter-card' && (overlay as ChapterCardOverlay).title}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {overlay.startTime / 1000}s - {(overlay.startTime + overlay.duration) / 1000}s
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteOverlay(overlay.id)
                  }}
                  className="text-gray-400 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Selected Overlay Editor */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedOverlay ? (
          <>
            {/* Timing */}
            <div className="space-y-2">
              <Label>Timing</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Start (s)</label>
                  <Input
                    type="number"
                    value={selectedOverlay.startTime / 1000}
                    onChange={(e) => updateOverlay(selectedOverlay.id, {
                      startTime: parseFloat(e.target.value) * 1000
                    })}
                    className="bg-gray-800 border-gray-700"
                    step={0.1}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Duration (s)</label>
                  <Input
                    type="number"
                    value={selectedOverlay.duration / 1000}
                    onChange={(e) => updateOverlay(selectedOverlay.id, {
                      duration: parseFloat(e.target.value) * 1000
                    })}
                    className="bg-gray-800 border-gray-700"
                    step={0.1}
                  />
                </div>
              </div>
            </div>
            
            {/* Position Presets */}
            <div className="space-y-2">
              <Label>Position</Label>
              <div className="grid grid-cols-3 gap-1">
                {POSITION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => updateOverlay(selectedOverlay.id, {
                      position: {
                        x: preset.x,
                        y: preset.y,
                        anchor: preset.anchor
                      }
                    })}
                    className={cn(
                      "p-1.5 rounded text-xs border transition-colors",
                      selectedOverlay.position.anchor === preset.anchor
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                    )}
                  >
                    {preset.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Type-specific editors */}
            {selectedOverlay.type === 'text' && (
              <TextOverlayEditor
                overlay={selectedOverlay as TextOverlay}
                onUpdate={(updates) => updateOverlay(selectedOverlay.id, updates)}
              />
            )}
            
            {selectedOverlay.type === 'chapter-card' && (
              <ChapterCardEditor
                overlay={selectedOverlay as ChapterCardOverlay}
                onUpdate={(updates) => updateOverlay(selectedOverlay.id, updates)}
              />
            )}
            
            {/* Animations */}
            <div className="space-y-2">
              <Label>Animation In</Label>
              <div className="grid grid-cols-3 gap-1">
                {ANIMATION_OPTIONS.slice(0, 6).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateOverlay(selectedOverlay.id, {
                      animationIn: {
                        type: option.value,
                        duration: selectedOverlay.animationIn?.duration || 300,
                        easing: 'ease-out'
                      }
                    })}
                    className={cn(
                      "p-1.5 rounded text-xs border transition-colors",
                      selectedOverlay.animationIn?.type === option.value
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 text-sm py-8">
            Select an overlay to edit its properties
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-800 flex gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={() => onUpdate(overlays)}
          className="flex-1"
        >
          Apply
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-editors
// ============================================================================

function TextOverlayEditor({
  overlay,
  onUpdate
}: {
  overlay: TextOverlay
  onUpdate: (updates: Partial<TextOverlay>) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Text Content</Label>
        <Textarea
          value={overlay.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className="bg-gray-800 border-gray-700"
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Font Size</Label>
          <Input
            type="number"
            value={overlay.style.fontSize}
            onChange={(e) => onUpdate({
              style: { ...overlay.style, fontSize: parseInt(e.target.value) }
            })}
            className="bg-gray-800 border-gray-700"
          />
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <Input
            type="color"
            value={overlay.style.color}
            onChange={(e) => onUpdate({
              style: { ...overlay.style, color: e.target.value }
            })}
            className="bg-gray-800 border-gray-700 h-9"
          />
        </div>
      </div>
    </div>
  )
}

function ChapterCardEditor({
  overlay,
  onUpdate
}: {
  overlay: ChapterCardOverlay
  onUpdate: (updates: Partial<ChapterCardOverlay>) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={overlay.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="bg-gray-800 border-gray-700"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Subtitle (optional)</Label>
        <Input
          value={overlay.subtitle || ''}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          className="bg-gray-800 border-gray-700"
          placeholder="Optional subtitle"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Background</Label>
        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={overlay.backgroundColor || '#000000'}
            onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
            className="bg-gray-800 border-gray-700 w-12 h-9"
          />
          <select
            value={overlay.backgroundType}
            onChange={(e) => onUpdate({ 
              backgroundType: e.target.value as ChapterCardOverlay['backgroundType'] 
            })}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm"
          >
            <option value="solid">Solid</option>
            <option value="gradient">Gradient</option>
            <option value="blur-behind">Blur Behind</option>
          </select>
        </div>
      </div>
    </div>
  )
}
