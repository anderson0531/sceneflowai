'use client'
import React, { useState, useCallback, useRef } from 'react'
import { trackCta } from '@/lib/analytics'
import { Lightbulb, X, Pin, ChevronRight, ArrowRight, PanelRightClose } from 'lucide-react'

interface Variant {
  id: string
  text: string
  pinned?: boolean
}

interface IdeationPanelProps {
  onInsert: (text: string) => void
  onClose?: () => void
  hideHeader?: boolean
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

// Renamed from InspirationPanel for semantic clarity
export function IdeationPanel({ onInsert, onClose, hideHeader = false }: IdeationPanelProps) {
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
        setKeyword('')
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

  return (
    <div className="h-full flex flex-col border-l border-gray-800/80 bg-gray-950/95 backdrop-blur-xl">
      {/* Header - hidden when embedded in SidePanelTabs */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-950/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-gray-100 font-medium">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/30">
              <Lightbulb size={16} className="text-blue-400" />
            </div>
            Ideation
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
              title="Close panel"
            >
              <PanelRightClose size={18} />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Keyword Input */}
        <div className="space-y-2">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter topic or keyword..."
                disabled={isGenerating}
                className="w-full text-sm px-4 py-2.5 pr-10 rounded-xl border border-gray-700/60 bg-gray-900/60 text-gray-100 placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 disabled:opacity-50"
              />
              {keyword && !isGenerating && (
                <button
                  onClick={() => setKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => keyword.trim() && generateVariants(keyword)}
              disabled={isGenerating || !keyword.trim()}
              title="Generate ideas"
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isGenerating ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Lightbulb size={16} />
                  <span className="hidden sm:inline">Generate</span>
                </>
              )}
            </button>
          </div>
          
          {/* Quick Tags */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.slice(0, 6).map(tag => (
              <button
                key={tag}
                onClick={() => handleQuickTag(tag)}
                disabled={isGenerating}
                className="text-xs px-2.5 py-1 rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-300 hover:bg-gray-700/60 hover:border-blue-500/40 hover:text-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <ChevronRight size={10} />
            Click Generate or press Enter
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
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 flex items-center justify-center mb-4 border border-blue-500/20">
              <Lightbulb size={28} className="text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-100 mb-1.5">
              Get Inspired
            </h3>
            <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
              Enter a topic above to generate creative ideas
            </p>
          </div>
        )}

        {/* Variants Display */}
        {displayItems.length > 0 && (
          <div className="space-y-2.5">
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
              <div key={variant.id} className="group relative">
                {editingId === variant.id ? (
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
                  <div 
                    onClick={() => insert(variant)}
                    onDoubleClick={() => startEdit(variant)}
                    className="group relative p-3 rounded-xl border border-gray-700/50 bg-gray-900/50 hover:bg-gray-800/70 hover:border-blue-500/40 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-blue-500/5"
                  >
                    <p className="text-sm text-gray-200 leading-relaxed mb-2 pr-5">
                      {variant.text}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 group-hover:text-blue-400 transition-colors duration-200">Click to insert</span>
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-blue-400" />
                    </div>
                    
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => togglePin(variant.id, e)}
                        className={`p-1 rounded-lg transition-all duration-200 ${variant.pinned ? 'text-amber-400 bg-amber-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'}`}
                        title={variant.pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin size={10} fill={variant.pinned ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Tips Section */}
      <div className="px-4 py-3 space-y-1.5 border-t border-gray-800/60 bg-gradient-to-t from-gray-950 to-gray-950/80">
        <div className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
          <span className="text-amber-400">💡</span> Tips
        </div>
        <ul className="text-[10px] text-gray-500 space-y-0.5 pl-1">
          <li className="flex items-start gap-1.5"><span className="text-gray-600">•</span> Click to insert, double-click to edit</li>
          <li className="flex items-start gap-1.5"><span className="text-gray-600">•</span> Pin favorites with the pin icon</li>
        </ul>
      </div>
    </div>
  )
}
