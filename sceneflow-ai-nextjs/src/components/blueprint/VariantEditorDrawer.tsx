'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { toast } from 'sonner'
import { useGuideStore } from '@/store/useGuideStore'

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
  const [tab, setTab] = useState<'edit'|'flow'>('edit')
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
          <DialogTitle>Edit Variant{variant?.label ? ` ${variant.label}` : ''}</DialogTitle>
          {showInfo && (
            <div className="mt-2 text-xs text-gray-400 flex items-start justify-between gap-3">
              <div role="status" aria-live="polite">Editing does not change the original until you apply.</div>
              <button className="text-xs text-gray-300 hover:text-white" onClick={()=>{ setShowInfo(false); try{ localStorage.setItem('variantEditor.hideInfo','1') }catch{} }}>Dismiss</button>
            </div>
          )}
          {appliedMessage && (
            <div className="mt-2 text-xs text-emerald-300" role="status" aria-live="polite">{appliedMessage}</div>
          )}
        </DialogHeader>
        <div className="flex flex-col h-[calc(100dvh-56px)]">
          {/* Tabs */}
          <div className="px-6 sm:px-8 pb-2 border-b border-gray-800 flex items-center gap-2">
            {(['edit','flow'] as const).map(k => (
              <button key={k} onClick={()=>setTab(k)} className={`text-sm px-3 py-1.5 rounded ${tab===k? 'bg-gray-800 text-white':'text-gray-300 hover:bg-gray-800/60'}`}>{k==='edit'?'Edit':'Flow Assist'}</button>
            ))}
            <div className="ml-auto text-xs text-gray-400">{progress>0 && progress<100 ? `Refining… ${progress}%` : aiLoading ? 'Finalizing…' : ''}</div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 space-y-4">
            {tab==='edit' && (
              <>
                {/* Mobile / small screens: stacked */}
                <div className="lg:hidden grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <div className="text-xs text-gray-400 mb-1">Original Title</div>
                    <div className="w-full px-3 py-2 rounded border border-gray-800 bg-gray-900 text-gray-300">{variant?.title || '—'}</div>
                    <div className="text-xs text-gray-400 mb-1">Original Logline</div>
                    <div className="w-full px-3 py-2 rounded border border-gray-800 bg-gray-900 text-gray-300 whitespace-pre-wrap">{variant?.logline || '—'}</div>
                    <div className="text-xs text-gray-400 mb-1">Original Synopsis</div>
                    <div className="w-full px-3 py-2 rounded border border-gray-800 bg-gray-900 text-gray-300 whitespace-pre-wrap leading-7 min-h-[10rem]">{variant?.synopsis || variant?.content || '—'}</div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Title</div>
                      <input className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-gray-100" value={draft?.title||''} onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), title:e.target.value})) }} />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Logline</div>
                      <textarea className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-gray-100" rows={2} value={draft?.logline||''} onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), logline:e.target.value})) }} />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Synopsis / Body</div>
                      <textarea className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-gray-100" rows={10} value={draft?.synopsis||draft?.content||''} onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), synopsis:e.target.value, content:e.target.value})) }} />
                    </div>
                  </div>
                </div>
                {/* Desktop: resizable split */}
                <div className="hidden lg:flex gap-2 items-stretch select-none">
                  {/* Original (read-only) */}
                  <div className="space-y-3 shrink-0" style={{ width: `${split}%` }}>
                  <div className="text-xs text-gray-400 mb-1">Original Title</div>
                  <div className="w-full px-3 py-2 rounded border border-gray-800 bg-gray-900 text-gray-300">{variant?.title || '—'}</div>
                  <div className="text-xs text-gray-400 mb-1">Original Logline</div>
                  <div className="w-full px-3 py-2 rounded border border-gray-800 bg-gray-900 text-gray-300 whitespace-pre-wrap">{variant?.logline || '—'}</div>
                  <div className="text-xs text-gray-400 mb-1">Original Synopsis</div>
                  <div className="w-full px-3 py-2 rounded border border-gray-800 bg-gray-900 text-gray-300 whitespace-pre-wrap leading-7 min-h-[10rem]">{variant?.synopsis || variant?.content || '—'}</div>
                  </div>
                  {/* Resize handle */}
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    className="w-1 shrink-0 bg-gray-800 rounded cursor-col-resize"
                    onMouseDown={() => { draggingRef.current = true }}
                    title="Drag to resize"
                  />
                  {/* Draft (editable) */}
                  <div className="space-y-3 flex-1" style={{ width: `${100 - split}%` }}>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Title</div>
                    <input className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-gray-100" value={draft?.title||''} onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), title:e.target.value})) }} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Logline</div>
                    <textarea className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-gray-100" rows={2} value={draft?.logline||''} onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), logline:e.target.value})) }} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Synopsis / Body</div>
                    <textarea className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-gray-100" rows={10} value={draft?.synopsis||draft?.content||''} onChange={e=>{ onAnyChange(); setDraft(d=>({...(d||{} as any), synopsis:e.target.value, content:e.target.value})) }} />
                  </div>
                  </div>
                </div>
              </>
            )}

            {tab==='flow' && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">What should change?</div>
                  <textarea className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-gray-100" rows={5} placeholder="E.g., shorten to 90 words, make tone more hopeful, target Gen Z" value={aiInstr} onChange={e=>setAiInstr(e.target.value)} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button onClick={handleRefine} disabled={aiLoading} className="bg-sf-primary text-sf-background hover:bg-sf-accent disabled:opacity-50">Refine with AI</Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-4 border-t border-gray-800 flex items-center justify-between sticky bottom-0 bg-gray-950">
            <Button 
              variant="outline" 
              onClick={()=>{ if (dirtyRef.current && !confirm('Discard unsaved changes?')) return; onClose() }} 
              className="border-gray-700 text-gray-200"
            >
              Close
            </Button>
            <Button 
              onClick={()=> { if(!draft || !variant) return; onApply(draft); (useGuideStore.getState() as any).markJustApplied?.(variant.id); setAppliedMessage('Treatment updated'); setTimeout(()=>setAppliedMessage(''), 1500); dirtyRef.current = false; toast('Treatment updated', { action: { label: 'Undo', onClick: () => (useGuideStore.getState() as any).undoLastEdit() } }); }} 
              className="bg-blue-600 hover:bg-blue-500 text-white"
              title="Cmd/Ctrl+Enter"
            >
              Update Treatment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


