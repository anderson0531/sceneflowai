/**
 * ImageMaskEditor - Canvas-based mask painting component
 * 
 * Allows users to paint regions on an image to define areas for editing.
 * White painted areas = regions to edit (inpaint)
 * Black areas = regions to preserve
 * 
 * Features:
 * - Adjustable brush size
 * - Undo/redo support
 * - Clear mask
 * - Export mask as base64
 * - Overlay preview on source image
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import { 
  Paintbrush, 
  Eraser, 
  Undo2, 
  Redo2, 
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageMaskEditorProps {
  /** Source image URL to paint on */
  imageUrl: string
  /** Canvas width (default: auto from image) */
  width?: number
  /** Canvas height (default: auto from image) */
  height?: number
  /** Called when mask changes with base64 mask data */
  onMaskChange?: (maskBase64: string) => void
  /** Initial mask (base64) to load */
  initialMask?: string
  /** CSS class for container */
  className?: string
}

interface HistoryState {
  imageData: ImageData
}

export function ImageMaskEditor({
  imageUrl,
  width,
  height,
  onMaskChange,
  initialMask,
  className
}: ImageMaskEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(30)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [showOverlay, setShowOverlay] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 })
  
  // Undo/redo history
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Load source image and initialize canvas
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      const overlayCanvas = overlayCanvasRef.current
      if (!canvas || !overlayCanvas) return
      
      // Calculate canvas size
      const maxWidth = width || containerRef.current?.clientWidth || 800
      const maxHeight = height || 600
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1)
      const canvasWidth = Math.round(img.width * scale)
      const canvasHeight = Math.round(img.height * scale)
      
      setCanvasSize({ width: canvasWidth, height: canvasHeight })
      
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      overlayCanvas.width = canvasWidth
      overlayCanvas.height = canvasHeight
      
      // Draw source image on overlay canvas
      const overlayCtx = overlayCanvas.getContext('2d')
      if (overlayCtx) {
        overlayCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight)
      }
      
      // Initialize mask canvas with black (preserve all)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)
        
        // Load initial mask if provided
        if (initialMask) {
          const maskImg = new Image()
          maskImg.onload = () => {
            ctx.drawImage(maskImg, 0, 0, canvasWidth, canvasHeight)
            saveToHistory()
          }
          maskImg.src = initialMask
        } else {
          saveToHistory()
        }
      }
      
      setImageLoaded(true)
    }
    img.onerror = () => {
      console.error('[ImageMaskEditor] Failed to load image:', imageUrl)
    }
    img.src = imageUrl
  }, [imageUrl, width, height, initialMask])
  
  // Save current state to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Trim future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ imageData })
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    }
    
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])
  
  // Get canvas coordinates from mouse/touch event
  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      }
    }
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }, [])
  
  // Draw on canvas
  const draw = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = tool === 'brush' ? 'white' : 'black'
    ctx.fill()
    
    // Notify parent of mask change
    if (onMaskChange) {
      onMaskChange(canvas.toDataURL('image/png'))
    }
  }, [brushSize, tool, onMaskChange])
  
  // Draw line between two points (for smooth strokes)
  const drawLine = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = tool === 'brush' ? 'white' : 'black'
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    
    // Notify parent of mask change
    if (onMaskChange) {
      onMaskChange(canvas.toDataURL('image/png'))
    }
  }, [brushSize, tool, onMaskChange])
  
  // Mouse/touch event handlers
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  
  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const pos = getCoordinates(e)
    lastPosRef.current = pos
    draw(pos.x, pos.y)
  }, [getCoordinates, draw])
  
  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    
    const pos = getCoordinates(e)
    if (lastPosRef.current) {
      drawLine(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y)
    }
    lastPosRef.current = pos
  }, [isDrawing, getCoordinates, drawLine])
  
  const handleEnd = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)
      lastPosRef.current = null
      saveToHistory()
    }
  }, [isDrawing, saveToHistory])
  
  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const newIndex = historyIndex - 1
    ctx.putImageData(history[newIndex].imageData, 0, 0)
    setHistoryIndex(newIndex)
    
    if (onMaskChange) {
      onMaskChange(canvas.toDataURL('image/png'))
    }
  }, [history, historyIndex, onMaskChange])
  
  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const newIndex = historyIndex + 1
    ctx.putImageData(history[newIndex].imageData, 0, 0)
    setHistoryIndex(newIndex)
    
    if (onMaskChange) {
      onMaskChange(canvas.toDataURL('image/png'))
    }
  }, [history, historyIndex, onMaskChange])
  
  // Clear mask
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveToHistory()
    
    if (onMaskChange) {
      onMaskChange(canvas.toDataURL('image/png'))
    }
  }, [saveToHistory, onMaskChange])
  
  // Export mask as base64
  const getMaskBase64 = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    return canvas.toDataURL('image/png')
  }, [])
  
  return (
    <div className={cn('flex flex-col gap-4', className)} ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tool selection */}
        <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
          <Button
            size="sm"
            variant={tool === 'brush' ? 'default' : 'ghost'}
            onClick={() => setTool('brush')}
            className="h-8 w-8 p-0"
            title="Brush (paint area to edit)"
          >
            <Paintbrush className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={tool === 'eraser' ? 'default' : 'ghost'}
            onClick={() => setTool('eraser')}
            className="h-8 w-8 p-0"
            title="Eraser (remove from edit area)"
          >
            <Eraser className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Brush size slider */}
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-slate-400 w-12">Size: {brushSize}</span>
          <Slider
            value={[brushSize]}
            onValueChange={(v) => setBrushSize(v[0])}
            min={5}
            max={100}
            step={1}
            className="w-24"
          />
        </div>
        
        {/* Undo/Redo */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="h-8 w-8 p-0"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="h-8 w-8 p-0"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Clear */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClear}
          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
          title="Clear mask"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        {/* Toggle overlay */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowOverlay(!showOverlay)}
          className="h-8 w-8 p-0"
          title={showOverlay ? 'Hide image overlay' : 'Show image overlay'}
        >
          {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
      </div>
      
      {/* Canvas container */}
      <div 
        className="relative border border-slate-600 rounded-lg overflow-hidden bg-slate-900"
        style={{ 
          width: canvasSize.width, 
          height: canvasSize.height,
          maxWidth: '100%'
        }}
      >
        {/* Overlay canvas (source image) */}
        <canvas
          ref={overlayCanvasRef}
          className={cn(
            'absolute inset-0 pointer-events-none transition-opacity',
            showOverlay ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: canvasSize.width, height: canvasSize.height }}
        />
        
        {/* Mask canvas (interactive) */}
        <canvas
          ref={canvasRef}
          className={cn(
            'absolute inset-0 cursor-crosshair',
            showOverlay ? 'opacity-50' : 'opacity-100'
          )}
          style={{ 
            width: canvasSize.width, 
            height: canvasSize.height,
            mixBlendMode: showOverlay ? 'screen' : 'normal'
          }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        
        {/* Brush preview cursor */}
        {imageLoaded && (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-white/50"
            style={{
              width: brushSize,
              height: brushSize,
              transform: 'translate(-50%, -50%)',
              display: 'none' // Enable with mouse tracking if desired
            }}
          />
        )}
      </div>
      
      {/* Instructions */}
      <p className="text-xs text-slate-400">
        Paint white areas to mark regions for editing. Black areas will be preserved.
      </p>
    </div>
  )
}

export default ImageMaskEditor
