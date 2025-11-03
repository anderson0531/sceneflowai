'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { toast } from 'sonner'
import { useGuideStore } from '@/store/useGuideStore'
import { PencilLine, Wand2, X, Check, Loader2, Film } from 'lucide-react'

type Variant = {
  id: string
  label?: string
  title?: string
  logline?: string
  synopsis?: string
  content?: string
  tone_description?: string
  style?: string
  visual_style?: string
  target_audience?: string
}

type Props = {
  open: boolean
  variant: Variant | null
  onClose: () => void
  onApply: (patch: Partial<Variant>) => void
}

export default function VariantEditorDrawer({ open, variant, onClose, onApply }: Props) {
  const [tab, setTab] = useState<'edit'|'flow'|'filmType'>('edit')
  const [draft, setDraft] = useState<(Partial<Variant> & { id?: string }) | null>(null)
  const [aiInstr, setAiInstr] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showInfo, setShowInfo] = useState<boolean>(true)
  const [appliedMessage, setAppliedMessage] = useState<string>('')
  const dirtyRef = useRef(false)
  const { markJustApplied } = useGuideStore() as any
  const [split, setSplit] = useState<number>(50)
  const draggingRef = useRef<boolean>(false)

  useEffect(() => {
    if (!open) return
    setTab('edit')
    setAiInstr('')
    setProgress(0)
    setAiLoading(false)
    setDraft(variant ? { ...variant, content: variant.synopsis || variant.content } : null)
    dirtyRef.current = false
    try { setShowInfo(localStorage.getItem('variantEditor.hideInfo') !== '1') } catch {}
  }, [open, variant])

  const startProgress = () => {
    setProgress(5)
    const id = setInterval(() => setProgress(p => (p < 90 ? p + Math.ceil(Math.random()*5) : p)), 600)
    return () => clearInterval(id)
  }

  const handleRefine = async () => {
    if (!variant) return
    const stop = startProgress()
    setAiLoading(true)
    try {
      const res = await fetch('/api/ideation/refine-treatment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, instructions: aiInstr || 'Improve clarity and concision; keep style consistent' })
      })
      const json = await res.json().catch(() => null)
      if (json?.success && json?.draft) {
        setDraft({ ...(draft || {} as any), ...json.draft })
        setTab('edit')
      }
    } catch {}
    stop()
    setProgress(100)
    setTimeout(() => setAiLoading(false), 300)
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const onAnyChange = () => { dirtyRef.current = true }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      const isCmd = e.metaKey || e.ctrlKey
      if (isCmd && e.key === 'Enter') {
        e.preventDefault()
        if (!draft || !variant) return
        onApply(draft)
        ;(useGuideStore.getState() as any).markJustApplied?.(variant.id)
        setAppliedMessage('Treatment updated')
        setTimeout(()=>setAppliedMessage(''), 1500)
        dirtyRef.current = false
        toast('Treatment updated', { action: { label: 'Undo', onClick: () => (useGuideStore.getState() as any).undoLastEdit() } })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, draft, variant, onApply])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return
      const vw = window.innerWidth
      const rightPanelMax = Math.min(vw, 1100)
      // Assume drawer is aligned right; use clientX to compute relative left width
      const leftWidth = Math.max(20, Math.min(80, (e.clientX / rightPanelMax) * 100))
      setSplit(leftWidth)
    }
    function onUp() { draggingRef.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v)=>{ if(!v) {
      if (dirtyRef.current && !confirm('Discard unsaved changes?')) { return }
      onClose()
    } }}>
      <DialogContent className="fixed right-0 left-auto top-0 bottom-0 translate-x-0 translate-y-0 ml-auto w-[min(100vw,1100px)] max-w-full overflow-hidden rounded-none border-l bg-gray-950 pr-[env(safe-area-inset-right)]">
        <DialogHeader className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60">
          <DialogTitle className="text-xl font-bold text-white">
            {variant?.title ? `Refine "${variant.title}"` : 'Refine Your Treatment'}
          </DialogTitle>
          <div className="text-sm text-gray-400 mt-1">
            Polish your concept with direct editing or AI assistance
            </div>
          {appliedMessage && (
            <div className="mt-2 text-xs text-emerald-300" role="status" aria-live="polite">{appliedMessage}</div>
          )}
        </DialogHeader>
        <div className="flex flex-col h-[calc(100dvh-56px)]">
          {/* Tabs */}
          <div className="px-6 sm:px-8 pb-3 border-b border-gray-700 flex items-center gap-3">
            {(['edit','flow','filmType'] as const).map(k => (
              <button 
                key={k}
                onClick={()=>setTab(k)} 
                className={`relative text-sm px-4 py-2 rounded-lg font-medium transition-all ${
                  tab===k
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {k==='edit' ? (
                  <>
                    <PencilLine className="w-4 h-4 inline-block mr-1.5" />
                    Edit
                  </>
                ) : k==='flow' ? (
                  <>
                    <Wand2 className="w-4 h-4 inline-block mr-1.5" />
                    Flow Assist
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 inline-block mr-1.5" />
                    Film Type
                  </>
                )}
                {tab===k && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500" />}
              </button>
            ))}
            {(progress>0 && progress<100) && (
              <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-xs text-blue-300 font-medium">Refining… {progress}%</span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 space-y-4">
            {tab==='edit' && (
              <>
                {/* Mobile / small screens: stacked */}
                <div className="lg:hidden grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Original</div>
                      <div className="text-[10px] text-gray-500 px-2 py-0.5 rounded bg-gray-800/50 border border-gray-700">Read-only</div>
                  </div>
                  <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Title</label>
                        <div className="w-full px-3 py-2.5 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-200">{variant?.title || '—'}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Logline</label>
                        <div className="w-full px-3 py-2.5 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-200 whitespace-pre-wrap min-h-[3rem]">{variant?.logline || '—'}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Synopsis</label>
                        <div className="w-full px-3 py-2.5 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-200 whitespace-pre-wrap leading-relaxed min-h-[12rem]">{variant?.synopsis || variant?.content || '—'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Your Edits</div>
                      <div className="text-[10px] text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">Live Preview</div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-300 mb-1.5 block">Title</label>
                        <input 
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                          placeholder="Enter a compelling title..."
                          value={draft?.title||''} 
                          onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), title:e.target.value})) }} 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-300 mb-1.5 block">Logline</label>
                        <textarea 
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" 
                          rows={3}
                          placeholder="One sentence that hooks the reader..."
                          value={draft?.logline||''} 
                          onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), logline:e.target.value})) }} 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-300 mb-1.5 block">Synopsis</label>
                        <textarea 
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" 
                          rows={12}
                          placeholder="Tell the story of your project..."
                          value={draft?.synopsis||draft?.content||''} 
                          onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), synopsis:e.target.value, content:e.target.value})) }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Desktop: resizable split */}
                <div className="hidden lg:flex gap-3 items-stretch select-none">
                  {/* Original (read-only) */}
                  <div className="space-y-3 shrink-0" style={{ width: `${split}%` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Original</div>
                      <div className="text-[10px] text-gray-500 px-2 py-0.5 rounded bg-gray-800/50 border border-gray-700">Read-only</div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Title</label>
                        <div className="w-full px-3 py-2.5 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-200">{variant?.title || '—'}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Logline</label>
                        <div className="w-full px-3 py-2.5 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-200 whitespace-pre-wrap min-h-[3rem]">{variant?.logline || '—'}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Synopsis</label>
                        <div className="w-full px-3 py-2.5 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-200 whitespace-pre-wrap leading-relaxed min-h-[12rem]">{variant?.synopsis || variant?.content || '—'}</div>
                      </div>
                    </div>
                  </div>
                  {/* Resize handle */}
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    className="w-1 shrink-0 bg-gray-700 rounded cursor-col-resize hover:bg-gray-600 transition-colors"
                    onMouseDown={() => { draggingRef.current = true }}
                    title="Drag to resize"
                  />
                  {/* Draft (editable) */}
                  <div className="space-y-3 flex-1" style={{ width: `${100 - split}%` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Your Edits</div>
                      <div className="text-[10px] text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">Live Preview</div>
                    </div>
                    <div className="space-y-3">
                  <div>
                        <label className="text-xs font-medium text-gray-300 mb-1.5 block">Title</label>
                        <input 
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                          placeholder="Enter a compelling title..."
                          value={draft?.title||''} 
                          onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), title:e.target.value})) }} 
                        />
                  </div>
                  <div>
                        <label className="text-xs font-medium text-gray-300 mb-1.5 block">Logline</label>
                        <textarea 
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" 
                          rows={3}
                          placeholder="One sentence that hooks the reader..."
                          value={draft?.logline||''} 
                          onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), logline:e.target.value})) }} 
                        />
                  </div>
                  <div>
                        <label className="text-xs font-medium text-gray-300 mb-1.5 block">Synopsis</label>
                        <textarea 
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" 
                          rows={12}
                          placeholder="Tell the story of your project..."
                          value={draft?.synopsis||draft?.content||''} 
                          onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), synopsis:e.target.value, content:e.target.value})) }} 
                        />
                      </div>
                  </div>
                  </div>
                </div>
              </>
            )}

            {tab==='flow' && (
              <div className="space-y-4">
                {/* Header with icon and description */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <Wand2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                      <h3 className="text-sm font-semibold text-white mb-1">AI-Powered Refinement</h3>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Describe what you'd like to improve and our AI will refine your treatment while preserving its essence.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Instructions textarea */}
                <div>
                  <label className="text-xs font-medium text-gray-300 mb-2 block">Refinement Instructions</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-900 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none" 
                    rows={6}
                    placeholder={`Examples:
• Shorten to 90 words, keep the emotional core
• Make tone more hopeful and inspiring
• Target Gen Z audience with modern references
• Emphasize the character transformation arc`}
                    value={aiInstr} 
                    onChange={e=>setAiInstr(e.target.value)} 
                  />
                  <div className="mt-2 text-xs text-gray-400">
                    💡 Tip: Be specific about what to change and what to preserve
                  </div>
                </div>
                
                {/* Action button */}
                <div className="flex gap-3 justify-end pt-2">
                  <Button 
                    onClick={handleRefine} 
                    disabled={aiLoading || !aiInstr.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed px-6"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Refining...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Refine Treatment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {tab==='filmType' && (
              <div className="space-y-4">
                {/* Header with icon and description */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Film className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">Regenerate with Different Film Type</h3>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Change the length and structure of your treatment by selecting a different film format. This will regenerate the entire treatment.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Film type selector */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-gray-300 mb-2 block">Select Film Type</label>
                  <Select onValueChange={(value) => {
                    if (window.confirm('This will regenerate the entire treatment with the new film type. Continue?')) {
                      window.dispatchEvent(new CustomEvent('sf:regenerate-treatment', { detail: { filmType: value } }))
                      onClose()
                    }
                  }}>
                    <SelectTrigger className="w-full border-gray-600 bg-gray-900 text-white">
                      <SelectValue placeholder="Choose a film type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="micro_short">
                        <div>
                          <div className="font-semibold">Micro (&lt; 5 min)</div>
                          <div className="text-xs text-gray-400">Short-form content, social media, quick narratives</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="short_film">
                        <div>
                          <div className="font-semibold">Short (5-30 min)</div>
                          <div className="text-xs text-gray-400">Festival shorts, web series episodes, concise storytelling</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="featurette">
                        <div>
                          <div className="font-semibold">Featurette (30-60 min)</div>
                          <div className="text-xs text-gray-400">Mid-length documentaries, educational content, extended narratives</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="feature_length">
                        <div>
                          <div className="font-semibold">Feature (60-120 min)</div>
                          <div className="text-xs text-gray-400">Full-length films, comprehensive documentaries, theatrical releases</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="epic">
                        <div>
                          <div className="font-semibold">Epic (120-180 min)</div>
                          <div className="text-xs text-gray-400">Extended features, serialized content, immersive experiences</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-2 text-xs text-amber-400">
                    ⚠️ Warning: All current edits will be lost when regenerating
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-4 border-t border-gray-700 bg-gradient-to-t from-gray-950 via-gray-950 to-gray-950/80 backdrop-blur-sm sticky bottom-0">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={()=>{ if (dirtyRef.current && !confirm('Discard unsaved changes?')) return; onClose() }} 
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-500 transition-all"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
              <div className="flex items-center gap-3">
                {dirtyRef.current && (
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Unsaved changes
                  </div>
                )}
                <Button 
                  onClick={()=> { if(!draft || !variant) return; onApply(draft); (useGuideStore.getState() as any).markJustApplied?.(variant.id); setAppliedMessage('Treatment updated'); setTimeout(()=>setAppliedMessage(''), 1500); dirtyRef.current = false; toast('Treatment updated', { action: { label: 'Undo', onClick: () => (useGuideStore.getState() as any).undoLastEdit() } }); }} 
                  className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 px-6 transition-all hover:scale-105"
                  title="Cmd/Ctrl+Enter"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Update Treatment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


