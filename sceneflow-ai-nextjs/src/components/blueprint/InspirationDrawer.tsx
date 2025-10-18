'use client'
import React, { useState, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { trackCta } from '@/lib/analytics'
import { Lightbulb, X, Pin, ChevronRight, ArrowRight } from 'lucide-react'

interface Variant {
  id: string
  text: string
  pinned?: boolean
}

interface InspirationDrawerProps {
  open: boolean
  onClose: () => void
  onInsert: (text: string) => void
}

const QUICK_TAGS = [
  'product demo',
  'tutorial',
  'brand story',
  'testimonial',
  'explainer',
  'behind the scenes',
  'announcement',
  'event recap'
]

export function InspirationDrawer({ open, onClose, onInsert }: InspirationDrawerProps) {
  const [keyword, setKeyword] = useState('')
  const [variants, setVariants] = useState<Variant[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const generateVariants = useCallback(async (kw: string) => {
    const cleanKeyword = kw.trim()
    if (!cleanKeyword || cleanKeyword.length < 2) return
    
    setIsGenerating(true)
    setError(null)
    trackCta({ event: 'inspiration_generate_clicked', label: cleanKeyword })
    
    try {
      const res = await fetch('/api/inspiration/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: cleanKeyword, count: 6 })
      })
      
      const data = await res.json()
      
      if (data.success && data.variants?.length > 0) {
        setVariants(data.variants.map((text: string, i: number) => ({
          id: `gen-${Date.now()}-${i}`,
          text,
          pinned: false
        })))
        setKeyword('') // Clear input after successful generation
      } else {
        setError(data.error || 'No variations generated')
        setTimeout(() => setError(null), 3000)
      }
    } catch (e) {
      console.error('Generation error:', e)
      setError('Network error. Please try again.')
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const handleQuickTag = (tag: string) => {
    setKeyword(tag)
    generateVariants(tag)
    trackCta({ event: 'inspiration_quick_tag_clicked', label: tag })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keyword.trim()) {
      e.preventDefault()
      generateVariants(keyword)
    }
  }

  const startEdit = (variant: Variant) => {
    setEditingId(variant.id)
    setEditText(variant.text)
    trackCta({ event: 'inspiration_edit_started', label: variant.id })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = (id: string) => {
    if (!editText.trim()) {
      cancelEdit()
      return
    }

    setVariants(prev => prev.map(v => 
      v.id === id ? { ...v, text: editText.trim() } : v
    ))
    cancelEdit()
    trackCta({ event: 'inspiration_edit_saved', label: id })
  }

  const insert = (variant: Variant) => {
    onInsert(variant.text)
    trackCta({ event: 'inspiration_inserted', label: variant.id })
    onClose() // Auto-close after insertion
  }

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setVariants(prev => prev.map(v => 
      v.id === id ? { ...v, pinned: !v.pinned } : v
    ))
    trackCta({ event: 'inspiration_pinned_toggled', label: id })
  }

  const clearGenerated = () => {
    setVariants([])
    setKeyword('')
    trackCta({ event: 'inspiration_cleared' })
  }

  const displayItems = variants.length > 0 
    ? [...variants.filter(v => v.pinned), ...variants.filter(v => !v.pinned)]
    : []

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="fixed right-0 left-auto top-0 bottom-0 translate-x-0 translate-y-0 ml-auto w-[min(100vw,400px)] max-w-full overflow-hidden rounded-none border-l bg-gray-950 pr-[env(safe-area-inset-right)]">
        <DialogHeader className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60">
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb size={18} className="text-sf-primary" />
            Inspiration
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[calc(100dvh-56px)]">
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 space-y-4">
            {/* Keyword Input */}
            <div className="space-y-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter topic or keyword..."
                disabled={isGenerating}
                className="w-full text-sm px-3 py-2 pr-10 rounded-lg border border-gray-700 bg-gray-900/50 text-gray-200 placeholder-gray-500 focus:border-sf-primary focus:ring-1 focus:ring-sf-primary focus:outline-none transition-all disabled:opacity-50"
              />
              {keyword && !isGenerating && (
                <button
                  onClick={() => setKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              )}
              {isGenerating && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-sf-primary border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            
            {/* Quick Tags */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.slice(0, 6).map(tag => (
                <button
                  key={tag}
                  onClick={() => handleQuickTag(tag)}
                  disabled={isGenerating}
                  className="text-xs px-2 py-1 rounded-md bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-sf-primary hover:text-sf-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <ChevronRight size={10} />
              Press Enter to generate or click a tag
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="text-xs text-red-300 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2 flex items-start gap-2">
              <span className="text-red-400">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Empty State */}
          {displayItems.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6">
              <div className="w-16 h-16 rounded-full bg-sf-primary/10 flex items-center justify-center mb-4">
                <Lightbulb size={32} className="text-sf-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Get Inspired
              </h3>
              <p className="text-sm text-gray-400 max-w-xs">
                Enter a topic or keyword above to generate creative blueprint variations
              </p>
            </div>
          )}

          {/* Variants Display */}
          {displayItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300 font-semibold">
                  {variants.length} Ideas
                </div>
                <button
                  onClick={clearGenerated}
                  className="text-[10px] px-2 py-0.5 rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                >
                  Clear
                </button>
              </div>

              {displayItems.map((variant) => (
              <div
                key={variant.id}
                className="group relative"
              >
                {editingId === variant.id ? (
                  // Edit Mode
                  <div className="space-y-1.5">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-sf-primary bg-gray-900 text-gray-200 focus:outline-none focus:ring-1 focus:ring-sf-primary resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          const updated = { ...variant, text: editText.trim() }
                          saveEdit(variant.id)
                          insert(updated)
                        }}
                        className="flex-1 text-xs px-2 py-1 rounded bg-sf-primary text-sf-background hover:bg-sf-accent"
                      >
                        Use This
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display Mode - Modern Card
                  <div 
                    onClick={() => insert(variant)}
                    onDoubleClick={() => startEdit(variant)}
                    className="group relative p-4 rounded-lg border border-gray-700/60 bg-gray-900/40 hover:bg-gray-800/60 hover:border-sf-primary/40 cursor-pointer transition-all duration-200"
                  >
                    <p className="text-sm text-gray-200 leading-relaxed mb-3 pr-6">
                      {variant.text}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="group-hover:text-sf-primary transition-colors">Click to insert</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-sf-primary" />
                    </div>
                    
                    {/* Pin Action */}
                    <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePin(variant.id, e)
                        }}
                        className={`p-1 rounded ${variant.pinned ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                        title={variant.pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin size={12} fill={variant.pinned ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              ))}
            </div>
          )}
          </div>
          
          {/* Tips Section - Always visible at bottom */}
          <div className="px-6 sm:px-8 py-3 space-y-1.5 border-t border-gray-800 bg-gray-950">
            <div className="text-xs text-gray-400 font-medium">💡 Pro Tips</div>
            <ul className="text-[11px] text-gray-500 space-y-0.5 pl-4">
              <li>• Double-click any idea to edit before using</li>
              <li>• Pin favorites to keep them at the top</li>
              <li>• Be specific: include duration, tone, and style</li>
              <li>• Use "Start Vision" on Treatment Variants below</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

