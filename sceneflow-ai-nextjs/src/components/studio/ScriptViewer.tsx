"use client"
import { useMemo, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DndContext as _ignore } from '@dnd-kit/core'
import { Button } from '@/components/ui/Button'
import { LayoutPanelLeft, PanelRightOpen, Volume2, Square, History } from 'lucide-react'
import { ScriptEditor } from '@/components/studio/ScriptEditor'
function ChangesPanel({ editorContainerRef }: { editorContainerRef: React.RefObject<HTMLDivElement | null> }) {
  const [items, setItems] = useState<Array<{ id: string; type: 'add'|'del'; text: string }>>([])

  const refresh = () => {
    try {
      const root = editorContainerRef.current
      if (!root) return
      const adds = Array.from(root.querySelectorAll('[data-suggest="add"]')) as HTMLElement[]
      const dels = Array.from(root.querySelectorAll('[data-suggest="del"]')) as HTMLElement[]
      const newItems: Array<{ id: string; type: 'add'|'del'; text: string }> = []
      adds.forEach(el => newItems.push({ id: el.getAttribute('data-suggest-id') || '', type: 'add', text: el.textContent || '' }))
      dels.forEach(el => newItems.push({ id: el.getAttribute('data-suggest-id') || '', type: 'del', text: el.textContent || '' }))
      setItems(newItems)
    } catch {}
  }

  useEffect(() => {
    refresh()
  })

  const accept = (id: string, type: 'add'|'del') => {
    try {
      const ed: any = (editorContainerRef.current as any)?.__editor
      if (!ed) return
      const root = editorContainerRef.current!
      const sel = root.querySelectorAll(`[data-suggest-id='${id}'][data-suggest='${type}']`)
      sel.forEach(el => {
        if (type === 'add') {
          // unwrap span to keep inserted text
          const span = el as HTMLElement
          const parent = span.parentNode as HTMLElement
          while (span.firstChild) parent.insertBefore(span.firstChild, span)
          parent.removeChild(span)
        } else {
          // deletion: remove the content
          el.parentNode?.removeChild(el)
        }
      })
      refresh()
    } catch {}
  }

  const reject = (id: string, type: 'add'|'del') => {
    try {
      const root = editorContainerRef.current!
      const sel = root.querySelectorAll(`[data-suggest-id='${id}'][data-suggest='${type}']`)
      sel.forEach(el => {
        if (type === 'add') {
          // remove the inserted text entirely
          el.parentNode?.removeChild(el)
        } else {
          // for deletions, unwrap to restore original text appearance
          const span = el as HTMLElement
          const parent = span.parentNode as HTMLElement
          while (span.firstChild) parent.insertBefore(span.firstChild, span)
          parent.removeChild(span)
        }
      })
      refresh()
    } catch {}
  }

  const gotoChange = (id: string, type: 'add'|'del') => {
    const el = editorContainerRef.current?.querySelector(`[data-suggest-id='${id}'][data-suggest='${type}']`)
    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="space-y-2 text-sm text-gray-300">
      {items.length === 0 ? (
        <div className="bg-gray-800/60 rounded border border-gray-700 p-3">No pending suggestions.</div>
      ) : items.map(it => (
        <div key={it.id} className="bg-gray-800/60 rounded border border-gray-700 p-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs text-gray-400">{it.type === 'add' ? 'Addition' : 'Deletion'}</div>
              <div className={`${it.type==='add'?'text-blue-200':'text-red-200'}`}>{it.text}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={()=>gotoChange(it.id, it.type)}>Go to</Button>
              <Button variant="secondary" size="sm" onClick={()=>reject(it.id, it.type)}>Reject</Button>
              <Button variant="primary" size="sm" onClick={()=>accept(it.id, it.type)}>Accept</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Simple diff component (line-by-line)
function DiffView({ original, suggestion }: { original: string; suggestion: string }) {
  const o = (original || '').split('\n')
  const s = (suggestion || '').split('\n')
  const max = Math.max(o.length, s.length)
  const rows = [] as any[]
  for (let i=0;i<max;i++) {
    const ol = o[i] || ''
    const sl = s[i] || ''
    let type: 'same'|'add'|'del' = 'same'
    if (ol !== sl) {
      if (!ol && sl) type='add'; else if (ol && !sl) type='del'; else type='add'
    }
    rows.push({ ol, sl, type })
  }
  return (
    <div className="text-xs">
      {rows.map((r, i)=> (
        <div key={i} className="grid grid-cols-2 gap-2">
          <div className={`px-2 py-1 rounded ${r.type==='del'?'bg-red-900/30 text-red-200':'bg-gray-800/50 text-gray-400'}`}>{r.ol}</div>
          <div className={`px-2 py-1 rounded ${r.type==='add'?'bg-green-900/30 text-green-200':'bg-gray-800/50 text-gray-200'}`}>{r.sl}</div>
        </div>
      ))}
    </div>
  )
}

export default function ScriptViewer({ fountainText }: { fountainText: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) {
    return (
      <div className="flex-1 min-h-0 grid grid-cols-[auto,1fr,auto]">
        <div />
        <div className="p-6 text-sm text-gray-400">Loading script…</div>
        <div />
      </div>
    )
  }
  const router = useRouter()
  const { currentProject, updateProject } = useStore()
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [suggesting, setSuggesting] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [locked, setLocked] = useState(false)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const [scenes, setScenes] = useState<Array<{ id: string; index: number; text: string }>>([])
  const [activeScene, setActiveScene] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  // AI Inspector state
  const [inspectorTab, setInspectorTab] = useState<'flow'|'comments'|'voices'|'changes'|'history'|'settings'>('flow')
  const [aiOriginal, setAiOriginal] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  // Comments state
  type CommentReply = { id: string; text: string; createdAt: number }
  type CommentThread = { id: string; from: number; to: number; text: string; resolved: boolean; replies: CommentReply[] }
  const [comments, setComments] = useState<CommentThread[]>([])
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)

  const addCommentThread = ({ from, to, text }: { from:number; to:number; text:string }) => {
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
    setComments(prev => [...prev, { id, from, to, text, resolved: false, replies: [] }])
    setRightOpen(true); setInspectorTab('comments'); setActiveCommentId(id)
    // apply mark in editor to visualize anchor
    try {
      const ed: any = (editorContainerRef.current as any)?.__editor
      if (ed) ed.chain().focus().setMark('comment', { id, resolved: false }).run()
    } catch {}
  }

  const scrollToComment = (id: string) => {
    try {
      const ed: any = (editorContainerRef.current as any)?.__editor
      if (!ed) return
      // naive approach: find first decoration span
      const el = editorContainerRef.current?.querySelector(`[data-comment-id='${id}']`)
      if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch {}
  }
  const [voiceOptions, setVoiceOptions] = useState<Array<{ id: string; name: string }>>([])
  const [charVoices, setCharVoices] = useState<Record<string, string>>({ Narrator: '' })
  const [isReading, setIsReading] = useState(false)
  const isReadingRef = useRef(false)
  useEffect(()=>{ isReadingRef.current = isReading }, [isReading])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playIdx, setPlayIdx] = useState(0)
  const [playTotal, setPlayTotal] = useState(0)
  const [ttsError, setTtsError] = useState<string | null>(null)

  // Preload ElevenLabs voices on mount so dropdowns are populated immediately
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/tts/elevenlabs/voices')
        const data = await resp.json().catch(() => ({}))
        if (data && Array.isArray(data.voices)) {
          setVoiceOptions(data.voices.map((v: any) => ({ id: v.id, name: v.name })))
        }
      } catch {}
    })()
  }, [])

  // Collect character names when opening Voices panel so assignments appear
  useEffect(() => {
    if (inspectorTab !== 'voices') return
    try {
      const names: Set<string> = new Set()
      const ed: any = (editorContainerRef.current as any)?.__editor
      if (ed) {
        ed.state.doc.descendants((node: any) => {
          if (node.type?.name === 'character') {
            let t = String(node.textContent || '').trim()
            // Normalize formats like "CHARACTER: BRIAN" or "BRIAN (character)"
            t = t.replace(/^\s*character\s*:\s*/i, '').replace(/\(character\)/i, '').replace(/\s+/g, ' ').trim()
            if (t) names.add(t.toUpperCase())
          }
          return true
        })
      }
      // Always also scan DOM for centered headings and labeled characters
      const root = (editorContainerRef.current as any) as HTMLElement
      if (root) {
        const els = Array.from(root.querySelectorAll("p[data-type='character']")) as HTMLElement[]
        els.forEach(el => { let t = String(el.textContent || '').trim(); t = t.replace(/^\s*character\s*:\s*/i, '').replace(/\(character\)/i, '').replace(/\s+/g, ' ').trim(); if (t) names.add(t.toUpperCase()) })
        const centers = Array.from(root.querySelectorAll('center')) as HTMLElement[]
        centers.forEach(el => { let t = String(el.textContent || '').trim(); t = t.replace(/^\s*character\s*:\s*/i, '').replace(/\(character\)/i, '').replace(/\s+/g, ' ').trim(); if (t) names.add(t.toUpperCase()) })
      }
      if (names.size > 0) {
        setCharVoices(prev => {
          const next = { ...prev }
          names.forEach(n => { if (!(n in next)) next[n] = '' })
          // Keep Narrator at all times
          if (!('Narrator' in next)) next['Narrator'] = ''
          return next
        })
      }
    } catch {}
  }, [inspectorTab])

  const chunkText = (text: string, maxLen: number = 480): string[] => {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim()
    if (!normalized) return []
    const sentences = normalized.split(/(?<=[.!?])\s+(?=[A-Z(\[])/)
    const chunks: string[] = []
    let current = ''
    for (const s of sentences) {
      if ((current + ' ' + s).trim().length > maxLen) {
        if (current) chunks.push(current.trim())
        if (s.length > maxLen) {
          for (let i = 0; i < s.length; i += maxLen) {
            chunks.push(s.slice(i, i + maxLen))
          }
          current = ''
        } else {
          current = s
        }
      } else {
        current = (current ? current + ' ' : '') + s
      }
    }
    if (current) chunks.push(current.trim())
    return chunks
  }

  // --- Snapshots (Version History) ---
  type Snapshot = { id: string; createdAt: number; text: string; json: any }
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)

  const SNAP_KEY = 'sf_script_snapshots'
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SNAP_KEY) : null
      if (raw) setSnapshots(JSON.parse(raw))
    } catch {}
  }, [])
  useEffect(() => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem(SNAP_KEY, JSON.stringify(snapshots)) } catch {}
  }, [snapshots])

  const saveSnapshot = () => {
    try {
      const ed: any = (editorContainerRef.current as any)?.__editor
      if (!ed) return
      const text = ed.getText()
      const json = ed.getJSON()
      const sn: Snapshot = { id: `v_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, createdAt: Date.now(), text, json }
      setSnapshots(prev => [sn, ...prev].slice(0, 50))
      setRightOpen(true); setInspectorTab('history'); setSelectedSnapshotId(sn.id)
    } catch {}
  }

  const restoreSnapshot = (snap: Snapshot) => {
    try {
      const ed: any = (editorContainerRef.current as any)?.__editor
      if (!ed) return
      ed.commands.setContent(snap.json)
    } catch {}
  }

  function ReplyBox({ onSubmit }: { onSubmit: (text: string)=>void }) {
    const [val, setVal] = useState('')
    return (
      <div className="flex items-center gap-2">
        <input className="flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100 text-sm" placeholder="Reply..." value={val} onChange={e=>setVal(e.target.value)} />
        <Button variant="primary" size="sm" onClick={()=>{ onSubmit(val); setVal('') }}>Send</Button>
      </div>
    )
  }

  function SortableSceneItem({ item, onClick }: { item: { id: string; index: number; text: string }, onClick: ()=>void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
    const style = { transform: CSS.Transform.toString(transform), transition } as any
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <button
          className={`w-full text-left px-2 py-1 rounded border text-sm ${activeScene===item.id ? 'bg-blue-600/20 border-blue-600 text-blue-200' : 'bg-gray-800/60 border-gray-700 text-gray-200'}`}
          onClick={onClick}>
          {item.index + 1}. {item.text}
        </button>
      </div>
    )
  }
  // Lazy import to avoid SSR issues
  const html = useMemo(() => {
    if (!fountainText) return ''
    try {
      // @ts-ignore - imported at runtime by consumer after installing dependency
      const fountain = require('fountain-js')
      const parsed = fountain.parse(fountainText)
      return parsed?.html?.script || ''
    } catch {
      return fountainText
    }
  }, [fountainText])

  return (
    <div className="flex flex-col h-full">
      {/* Header with stepper and toolbar */}
      <div className="border-b border-gray-800 bg-gray-900/60 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left spacer to center/right-align toolbar content */}
          <div />
          {/* Toolbar placeholders */}
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-300 font-medium truncate max-w-[180px]">Untitled Script</div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Saved
            </div>
            {/* Editing / Suggesting toggle */}
            <div className="ml-2 flex items-center gap-1 text-xs">
              <button disabled={locked} className={`px-2 py-1 rounded ${!suggesting?'bg-blue-600/20 text-blue-300 border border-blue-600':'bg-gray-800/60 text-gray-300 border border-gray-700'} ${locked?'opacity-50 cursor-not-allowed':''}`} onClick={()=>setSuggesting(false)}>Editing</button>
              <button disabled={locked} className={`px-2 py-1 rounded ${suggesting?'bg-blue-600/20 text-blue-300 border border-blue-600':'bg-gray-800/60 text-gray-300 border border-gray-700'} ${locked?'opacity-50 cursor-not-allowed':''}`} onClick={()=>setSuggesting(true)}>Suggesting</button>
            </div>
            {locked && <span className="ml-1 px-2 py-1 rounded border border-amber-600 text-amber-300 text-xs bg-amber-900/20">Locked</span>}
            <Button variant="primary" size="sm" onClick={()=>setHandoffOpen(true)}>Generate Storyboard</Button>
            {/* History button */}
            <Button variant="ghost" size="sm" onClick={()=>{ setRightOpen(true); setInspectorTab('history') }}>
              <History className="w-4 h-4" />
              <span className="ml-1 hidden sm:inline">History</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 min-h-0 grid grid-cols-[auto,1fr,auto]" style={{ gridTemplateColumns: `${leftOpen ? '250px' : '0px'} 1fr ${rightOpen ? '320px' : '0px'}` }}>
        {/* Left Navigator */}
        <div className={`${leftOpen ? 'border-r border-gray-800' : ''} overflow-auto bg-gray-900/40`}> 
          {leftOpen && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">Navigator</div>
                <Button variant="ghost" size="sm" onClick={()=>setLeftOpen(false)}><LayoutPanelLeft className="w-4 h-4" /></Button>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over })=>{
                if (!over || active.id === over.id) return
                const from = scenes.findIndex(s=>s.id===String(active.id))
                const to = scenes.findIndex(s=>s.id===String(over.id))
                if (from===-1 || to===-1) return
                const newOrder = arrayMove(scenes, from, to)
                // TODO: update editor content order here (omitted for brevity in this snippet since it already exists earlier)
                setScenes(newOrder.map((s, i)=> ({ ...s, index: i })))
              }}>
                <SortableContext items={scenes.map(s=>s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {scenes.map(s => (
                      <SortableSceneItem key={s.id} item={s} onClick={()=>{
                        const el = editorContainerRef.current?.querySelector(`[data-type='slugline'][data-id='${s.id}']`)
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>

        {/* Center Editor */}
        <div className="overflow-auto bg-gray-900/20">
          <div className="p-6">
            {/* TipTap-based script editor rendering parsed Fountain */}
            <ScriptEditor fountain={fountainText} suggesting={suggesting} containerRef={(el:any)=>{ (editorContainerRef as any).current = el; if (el) (el as any).__editor = (el as any).__editor || undefined }} onReady={(ed)=>{
              // Build Navigator from sluglines; fall back to character headings if no sluglines
              const refreshScenes = () => {
                try {
                  const next: Array<{ id: string; index: number; text: string }> = []
                  let foundSlug = false
                  ed.state.doc.descendants((node: any, pos: number) => {
                    const name = node.type?.name
                    if (name === 'slugline') {
                      foundSlug = true
                      const text = String(node.textContent || '').trim()
                      const id = `sc_${pos || next.length}`
                      try { const dom = (ed.view as any).nodeDOM(pos) as HTMLElement; if (dom) dom.setAttribute('data-id', id) } catch {}
                      next.push({ id, index: next.length, text: text || `Scene ${next.length + 1}` })
                    }
                    return true
                  })
                  if (!foundSlug) {
                    ed.state.doc.descendants((node: any, pos: number) => {
                      const name = node.type?.name
                      if (name === 'character') {
                        let text = String(node.textContent || '').trim()
                        text = text.replace(/^\s*character\s*:\s*/i, '').replace(/\(character\)/i, '').replace(/\s+/g, ' ').trim()
                        const id = `ch_${pos || next.length}`
                        try { const dom = (ed.view as any).nodeDOM(pos) as HTMLElement; if (dom) dom.setAttribute('data-id', id) } catch {}
                        next.push({ id, index: next.length, text: text || `Beat ${next.length + 1}` })
                      }
                      return true
                    })
                  }
                  // Only update when changed to avoid excessive re-renders/DND churn
                  const same = next.length === scenes.length && next.every((s, i) => s.id === scenes[i]?.id && s.text === scenes[i]?.text)
                  if (!same) setScenes(next)
                } catch {}
              }
              refreshScenes()
              try {
                ed.on('transaction', refreshScenes)
              } catch {}
              // Clean up on unmount
              try {
                return () => { try { (ed as any).off?.('transaction', refreshScenes) } catch {} }
              } catch {}
              if (locked) { try { ed.setEditable(false) } catch {} }
            }} onAskFlow={async ({ prompt, context }: any) => {
              try {
                setRightOpen(true)
                setInspectorTab('flow')
                setAiOriginal(context)
                setAiLoading(true)
                const resp = await fetch('/api/cue/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: `${prompt}\n\nCONTEXT:\n${context}` }] }) })
                const json = await resp.json()
                setAiSuggestion(json?.reply || '')
              } finally { setAiLoading(false) }
            }} onComment={(sel)=> addCommentThread(sel)} />
          </div>
        </div>

        {/* Right Inspector */}
        <div className={`${rightOpen ? 'border-l border-gray-800' : ''} overflow-auto bg-gray-900/40`}>
          {rightOpen && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">Inspector</div>
                <Button variant="ghost" size="sm" onClick={()=>setRightOpen(false)}><PanelRightOpen className="w-4 h-4" /></Button>
              </div>
              <div className="mb-3 flex items-center gap-2 text-xs">
                <button className={`px-2 py-1 rounded ${inspectorTab==='flow'?'bg-blue-600/20 text-blue-300 border border-blue-600':'bg-gray-800/60 text-gray-300 border border-gray-700'}`} onClick={()=>setInspectorTab('flow')}>Flow</button>
                <button className={`px-2 py-1 rounded ${inspectorTab==='comments'?'bg-blue-600/20 text-blue-300 border border-blue-600':'bg-gray-800/60 text-gray-300 border border-gray-700'}`} onClick={()=>setInspectorTab('comments')}>Comments</button>
                <button className={`px-2 py-1 rounded ${inspectorTab==='voices'?'bg-blue-600/20 text-blue-300 border border-blue-600':'bg-gray-800/60 text-gray-300 border border-gray-700'}`} onClick={()=>setInspectorTab('voices')}>Voices</button>
                <button className={`px-2 py-1 rounded ${inspectorTab==='changes'?'bg-blue-600/20 text-blue-300 border border-blue-600':'bg-gray-800/60 text-gray-300 border border-gray-700'}`} onClick={()=>setInspectorTab('changes')}>Changes</button>
                <button className={`px-2 py-1 rounded ${inspectorTab==='history'?'bg-blue-600/20 text-blue-300 border border-blue-600':'bg-gray-800/60 text-gray-300 border border-gray-700'}`} onClick={()=>setInspectorTab('history')}>History</button>
                <button className={`px-2 py-1 rounded ${inspectorTab==='settings'?'bg-blue-600/20 text-blue-300 border border-blue-600':'bg-gray-800/60 text-gray-300 border border-gray-700'}`} onClick={()=>setInspectorTab('settings')}>Settings</button>
              </div>
              {inspectorTab==='flow' && (
                <div className="space-y-3 text-sm text-gray-300">
                  {aiLoading ? (
                    <div className="bg-gray-800/60 rounded border border-gray-700 p-3">Generating suggestion…</div>
                  ) : aiSuggestion ? (
                    <div className="bg-gray-800/60 rounded border border-gray-700 p-3">
                      <div className="text-xs text-gray-400 mb-2">Diff</div>
                      <DiffView original={aiOriginal} suggestion={aiSuggestion} />
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={()=>{ setAiSuggestion(''); setAiOriginal('') }}>Discard</Button>
                        <Button variant="secondary" onClick={()=>{ /* regenerate can reuse last prompt */ }}>Regenerate</Button>
                        <Button variant="primary" onClick={()=>{
                          const ed: any = (editorContainerRef.current as any)?.__editor
                          if (!ed) return
                          ed.chain().focus().command(({ tr }: any) => {
                            const { from, to } = ed.state.selection
                            tr = tr.insertText(aiSuggestion, from, to)
                            ed.view.dispatch(tr)
                            return true
                          }).run()
                          setAiSuggestion('')
                        }}>Accept Changes</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800/60 rounded border border-gray-700 p-3">Run Ask Flow on a selection to see suggestions.</div>
                  )}
                </div>
              )}
              {inspectorTab==='voices' && (
                <div className="space-y-4 text-sm text-gray-300">
                  <div className="text-xs text-gray-400">Assign voices to characters</div>
                {ttsError && (
                  <div className="bg-red-900/30 border border-red-700 text-red-200 rounded px-3 py-2 text-xs">{ttsError}</div>
                )}
                  <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                    {Object.keys(charVoices).length===0 && <div className="text-gray-500">No characters detected yet.</div>}
                    {Object.keys(charVoices).map(name => (
                      <div key={name} className="flex items-center justify-between gap-2 bg-gray-800/50 border border-gray-700 rounded px-2 py-1">
                        <div className="font-medium text-gray-200">{name}</div>
                        <select className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-100"
                                value={charVoices[name]}
                                onChange={e=> setCharVoices(prev => ({ ...prev, [name]: e.target.value }))}>
                          <option value="">System</option>
                          {voiceOptions.map(v=> (<option key={v.id} value={v.id}>{v.name}</option>))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    {!isReading ? (
                      <Button variant="primary" onClick={async ()=>{
                        try {
                          setIsReading(true)
                          setTtsError(null)
                          const ed: any = (editorContainerRef.current as any)?.__editor
                          console.log('[TableRead] start, editor ready:', !!ed)
                          // Build sequence across the entire document (fallback to DOM if editor is not ready)
                          const seq: Array<{ text: string; pos:number; dom:HTMLElement|null; who:string }> = []
                          let lastChar = ''
                          if (ed) {
                            ed.state.doc.descendants((node:any, pos:number)=>{
                              const typeName = node.type?.name
                              const text = String(node.textContent||'').trim()
                              if (!typeName) return true
                              if (typeName==='character') {
                                const norm = text.replace(/^\s*character\s*:\s*/i, '').replace(/\(character\)/i, '').replace(/\s+/g,' ').trim().toUpperCase()
                                lastChar = norm
                              } else if (typeName==='dialogue') {
                                const dom = (ed.view as any).nodeDOM(pos) as HTMLElement
                                seq.push({ text, pos, dom, who: lastChar })
                              } else if (['slugline','action','parenthetical','transition'].includes(typeName)) {
                                if (text) {
                                  const dom = (ed.view as any).nodeDOM(pos) as HTMLElement
                                  seq.push({ text, pos, dom, who: 'Narrator' })
                                }
                              }
                              return true
                            })
                          } else {
                            const root = (editorContainerRef.current as any) as HTMLElement
                            const nodes = root ? Array.from(root.querySelectorAll('p[data-type], center')) as HTMLElement[] : []
                            nodes.forEach((el)=>{
                              const tag = el.tagName.toLowerCase()
                              const typeName = tag === 'center' ? 'character' : (el.getAttribute('data-type') || '')
                              let text = String(el.textContent||'').trim()
                              if (!text) return
                              if (typeName==='character') {
                                text = text.replace(/^\s*character\s*:\s*/i, '').replace(/\(character\)/i, '').replace(/\s+/g, ' ').trim()
                                lastChar = text.toUpperCase()
                              } else if (typeName==='dialogue') {
                                seq.push({ text, pos: 0, dom: el, who: lastChar })
                              } else if (['slugline','action','parenthetical','transition'].includes(typeName)) {
                                seq.push({ text, pos: 0, dom: el, who: 'Narrator' })
                              }
                            })
                          }
                          // Filter out headings-only blocks (e.g., CENTER headings without dialog following)
                          const cleaned: typeof seq = []
                          for (let i=0;i<seq.length;i++) {
                            const cur = seq[i]
                            if (cur.who === 'Narrator') { cleaned.push(cur); continue }
                            // If this is a character line that looks like a center heading, skip adding as standalone text
                            if (/^<[a-zA-Z][^>]*>/.test(cur.text)) continue
                            cleaned.push(cur)
                          }
                          const playSeq = cleaned
                          if (seq.length === 0) {
                            console.warn('[TableRead] No content found to play')
                            setTtsError('No script content found to play. Try regenerating or reload the page.')
                            // Ensure UI returns to idle state when nothing to play
                            setIsReading(false)
                            return
                          }
                          // Build fine-grained blocks to ensure fast-start (short segments)
                          const blocks: Array<{ who:string; text:string; dom?:HTMLElement|null }> = []
                          for (const it of playSeq) {
                            const pieces = chunkText(it.text, 240)
                            for (const p of pieces) blocks.push({ who: it.who, text: p, dom: it.dom })
                          }
                          setPlayIdx(0); setPlayTotal(blocks.length)

                          // Stream TTS from server to reduce client roundtrips
                          const payload = { blocks: blocks.map(({who, text})=>({who, text})), voiceMap: charVoices, narratorVoiceId: charVoices['Narrator'] || undefined }
                          const resp = await fetch('/api/tts/table-read', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
                          if (!resp.ok || !resp.body) {
                            const d = await resp.text().catch(()=> '')
                            setTtsError(`Table Read failed: ${resp.status} ${d}`)
                            return
                          }
                          const reader = resp.body.getReader()
                          let buffer = new Uint8Array(0)
                          let pending = 0
                          let whoForPending = ''
                          const boundary = new TextEncoder().encode('--SFBND--')
                          const newline = 10
                          const decodeLine = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

                          const append = (src: Uint8Array) => {
                            const merged = new Uint8Array(buffer.length + src.length)
                            merged.set(buffer)
                            merged.set(src, buffer.length)
                            buffer = merged
                          }

                          let blockIndex = 0
                          while (isReadingRef.current) {
                            const { value, done } = await reader.read()
                            if (done) break
                            if (value) append(value)

                            // If waiting for audio bytes
                            while (isReadingRef.current) {
                              if (pending > 0) {
                                if (buffer.length < pending) break
                                const audioBytes = buffer.slice(0, pending)
                                buffer = buffer.slice(pending)
                                pending = 0
                                // Play this audio chunk
                                const url = URL.createObjectURL(new Blob([audioBytes], { type: 'audio/mpeg' }))
                                try {
                                  await new Promise<void>((resolve, reject) => {
                                    const audio = new Audio(url)
                                    audioRef.current = audio
                                    const cleanup = () => { URL.revokeObjectURL(url); if (audioRef.current === audio) audioRef.current = null }
                                    audio.onended = () => { cleanup(); resolve() }
                                    audio.onpause = () => { if (!isReadingRef.current) { cleanup(); resolve() } }
                                    audio.onerror = () => { cleanup(); reject(new Error('Failed to play streamed audio')) }
                                    audio.play().catch(reject)
                                  })
                                } catch (e:any) {
                                  console.error('[TableRead] Streamed playback error:', e)
                                  setTtsError(e?.message || 'Streamed playback error')
                                  isReadingRef.current = false
                                  break
                                }
                                setPlayIdx(++blockIndex)
                                continue
                              }

                              // Parse boundary line
                              let nl = buffer.indexOf(newline)
                              if (nl === -1) break
                              const line1 = buffer.slice(0, nl)
                              buffer = buffer.slice(nl + 1)
                              const l1 = decodeLine(line1).trim()
                              if (l1 !== '--SFBND--') continue

                              // Parse META line
                              nl = buffer.indexOf(newline)
                              if (nl === -1) break
                              const line2 = buffer.slice(0, nl)
                              buffer = buffer.slice(nl + 1)
                              const meta = decodeLine(line2).trim() // META:who:length
                              if (!meta.startsWith('META:')) continue
                              const parts = meta.slice(5).split(':')
                              whoForPending = parts[0] || 'Narrator'
                              pending = Math.max(0, parseInt(parts[1] || '0', 10))
                              // highlight associated DOM if known
                              const blk = blocks[blockIndex]
                              if (blk?.dom) blk.dom.classList.add('ring-2','ring-blue-500','bg-blue-900/10')
                            }
                          }
                        } finally {
                          setIsReading(false)
                          setPlayIdx(0); setPlayTotal(0)
                        }
                      }}>Play Table Read</Button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-400">Playing {Math.min(playIdx, playTotal)} / {playTotal}</div>
                        <Button variant="ghost" onClick={()=>{ setIsReading(false); try { audioRef.current?.pause(); } catch {} }}>Stop</Button>
                      </div>
                    )}
                    {!isReading && (
                      <Button variant="secondary" onClick={async ()=>{
                        try {
                          setTtsError(null)
                          const sample = 'This is a short narrator test.'
                          const resp = await fetch('/api/tts/elevenlabs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: sample, voiceId: charVoices['Narrator'] || undefined }) })
                          if (!resp.ok) {
                            let detail = ''
                            try { const j = await resp.json(); detail = j?.error || j?.details || '' } catch { detail = await resp.text().catch(()=> '') }
                            setTtsError(`TTS error (${resp.status}): ${detail || 'Unknown error'}`)
                            return
                          }
                          const ct = resp.headers.get('Content-Type') || ''
                          if (!ct.includes('audio')) {
                            let detail = ''
                            try { const j = await resp.json(); detail = j?.error || j?.details || '' } catch { detail = await resp.text().catch(()=> '') }
                            setTtsError(`TTS provider returned non-audio content: ${detail || ct}`)
                            return
                          }
                          const blob = await resp.blob()
                          const url = URL.createObjectURL(blob)
                          const audio = new Audio(url)
                          audioRef.current = audio
                          audio.onended = () => { URL.revokeObjectURL(url) }
                          audio.play()
                        } catch (e:any) {
                          setTtsError(`Test playback failed: ${e?.message || 'unknown'}`)
                        }
                      }}>Test Narrator</Button>
                    )}
                  </div>
                </div>
              )}
              {inspectorTab==='changes' && (
                <ChangesPanel editorContainerRef={editorContainerRef} />
              )}
              {inspectorTab==='history' && (
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">Version snapshots</div>
                    <Button variant="secondary" size="sm" onClick={saveSnapshot}>Save Snapshot</Button>
                  </div>
                  {snapshots.length === 0 ? (
                    <div className="bg-gray-800/60 rounded border border-gray-700 p-3">No snapshots yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {snapshots.map(s => (
                        <div key={s.id} className={`rounded border ${selectedSnapshotId===s.id?'border-blue-700 bg-gray-800/60':'border-gray-700 bg-gray-900/40'}`}>
                          <div className="p-2 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-gray-100">{new Date(s.createdAt).toLocaleString()}</div>
                              <div className="text-xs text-gray-500">{Math.max(1, s.text.split('\n').length)} lines</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={()=>{ setSelectedSnapshotId(s.id) }}>Diff</Button>
                              <Button variant="primary" size="sm" onClick={()=>restoreSnapshot(s)}>Restore</Button>
                            </div>
                          </div>
                          {selectedSnapshotId===s.id && (
                            <div className="p-2">
                              <div className="text-xs text-gray-400 mb-1">Diff with current</div>
                              <DiffView original={s.text} suggestion={(editorContainerRef.current as any)?.__editor?.getText?.() || ''} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {inspectorTab==='comments' && (
                <div className="space-y-3 text-sm text-gray-300">
                  {comments.length === 0 ? (
                    <div className="bg-gray-800/60 rounded border border-gray-700 p-3">No comments yet. Select text and click Comment.</div>
                  ) : (
                    <div className="space-y-2">
                      {comments.map(thread => (
                        <div key={thread.id} className={`rounded border ${thread.resolved?'border-gray-700 bg-gray-800/40':'border-blue-700/50 bg-gray-800/60'}`}>
                          <div className="p-2 border-b border-gray-700 flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs text-gray-400">Selection</div>
                              <div className="text-gray-100 whitespace-pre-wrap break-words">{thread.text}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={()=>{ setActiveCommentId(thread.id); scrollToComment(thread.id) }}>Go to</Button>
                              {thread.resolved ? (
                                <Button variant="secondary" size="sm" onClick={()=>{
                                  setComments(prev => prev.map(t => t.id===thread.id ? { ...t, resolved: false } : t))
                                  try { const ed: any = (editorContainerRef.current as any)?.__editor; ed?.chain().focus().updateAttributes('comment', { id: thread.id, resolved: false }).run() } catch {}
                                }}>Reopen</Button>
                              ) : (
                                <Button variant="secondary" size="sm" onClick={()=>{
                                  setComments(prev => prev.map(t => t.id===thread.id ? { ...t, resolved: true } : t))
                                  try { const ed: any = (editorContainerRef.current as any)?.__editor; ed?.chain().focus().updateAttributes('comment', { id: thread.id, resolved: true }).run() } catch {}
                                }}>Resolve</Button>
                              )}
                            </div>
                          </div>
                          <div className="p-2 space-y-2">
                            {thread.replies.map(r => (
                              <div key={r.id} className="text-gray-200 bg-gray-900/60 rounded px-2 py-1">{r.text}</div>
                            ))}
                            <ReplyBox onSubmit={(text)=>{
                              if (!text.trim()) return
                              setComments(prev => prev.map(t => t.id===thread.id ? { ...t, replies: [...t.replies, { id: `r_${Date.now()}`, text, createdAt: Date.now() }] } : t))
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {inspectorTab==='settings' && (
                <div className="bg-gray-800/60 rounded border border-gray-700 p-3 text-sm text-gray-300">Settings & options.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Panel toggles (floating) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {!leftOpen && <Button variant="ghost" size="sm" onClick={()=>setLeftOpen(true)}><LayoutPanelLeft className="w-4 h-4 mr-2" />Open Navigator</Button>}
        {!rightOpen && <Button variant="ghost" size="sm" onClick={()=>setRightOpen(true)}><PanelRightOpen className="w-4 h-4 mr-2" />Open Inspector</Button>}
      </div>

      {/* Handoff confirmation modal */}
      {handoffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={()=>setHandoffOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-xl">
            <div className="text-lg font-semibold text-gray-100 mb-1">Finalize Blueprint</div>
            <div className="text-sm text-gray-300 mb-4">This will finalize the Blueprint and begin Step 2: Vision. Continue?</div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={()=>setHandoffOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={()=>{
                setLocked(true)
                setHandoffOpen(false)
                try { const ed: any = (editorContainerRef.current as any)?.__editor; ed?.setEditable(false) } catch {}
                // Optionally signal next step
                try { window.dispatchEvent(new CustomEvent('studio.goto.vision')) } catch {}
                // Seed selectedIdea if missing so storyboard auto-generates
                try {
                  if (currentProject) {
                    const blocks = collectBlocksFromEditor(editorContainerRef)
                    const sluglines = blocks.filter(b=>b.type==='slugline' && (b.text||'').trim()).map(b=>b.text.trim())
                    let outline: string[] = []
                    if (sluglines.length) outline = sluglines
                    else {
                      const text = (blocks||[]).map(b=>b.text||'').join('\n').trim()
                      const paras = text.split(/\n{2,}/).filter(Boolean)
                      const parts = (paras.length? paras: [text]).slice(0,6)
                      outline = parts.map((t,i)=>`Scene ${i+1}: ${t.replace(/\s+/g,' ').slice(0,140)}`)
                    }
                    const synopsis = (blocks||[]).map(b=>b.text||'').join(' ').replace(/\s+/g,' ').trim().slice(0,300)
                    const selectedIdea = currentProject.metadata?.selectedIdea || {
                      id: `auto_${Date.now()}`,
                      title: currentProject.title || 'Storyboard Draft',
                      synopsis: synopsis || 'Auto-generated from script.',
                      scene_outline: outline.length? outline: ['Open on the central setting; introduce protagonist.'],
                      thumbnail_prompt: 'Cinematic still from the key moment',
                      strength_rating: 3.5,
                      targetAudience: currentProject.metadata?.targetAudience || 'General',
                      genre: currentProject.metadata?.genre || 'General',
                      tone: currentProject.metadata?.tone || 'Professional'
                    }
                    updateProject(currentProject.id, { metadata: { ...currentProject.metadata, selectedIdea, scriptBlocks: blocks, fountain: fountainText } } as any)
                  }
                } catch {}
                try { router.push(`/projects/${currentProject?.id || 'current'}/vision`) } catch {}
              }}>Continue</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ----- Export helpers -----
function collectBlocksFromEditor(editorContainerRef: React.RefObject<HTMLDivElement | null>): Array<{ type:string; text:string }> {
  try {
    const ed: any = (editorContainerRef.current as any)?.__editor
    if (!ed) return []
    const blocks: Array<{ type:string; text:string }> = []
    ed.state.doc.descendants((node:any)=>{
      const t = String(node.textContent || '')
      const name = node.type?.name
      if (name && ['slugline','action','character','dialogue','parenthetical','transition'].includes(name)) {
        blocks.push({ type: name, text: t })
      }
      return true
    })
    return blocks
  } catch { return [] }
}

function toFountain(blocks: Array<{ type:string; text:string }>): string {
  const lines: string[] = []
  let lastType = ''
  for (const b of blocks) {
    if (b.type === 'slugline') lines.push(b.text.trim())
    else if (b.type === 'character') lines.push(b.text.trim().toUpperCase())
    else if (b.type === 'parenthetical') lines.push(b.text.trim().startsWith('(') ? b.text.trim() : `(${b.text.trim()})`)
    else if (b.type === 'dialogue') lines.push(b.text)
    else if (b.type === 'transition') lines.push(b.text.trim().toUpperCase())
    else lines.push(b.text)
    if (!(b.type === 'dialogue' && lastType === 'dialogue')) lines.push('')
    lastType = b.type
  }
  return lines.join('\n').replace(/\n+$/,'\n')
}

function escapeHtml(s: string) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function clsFor(type: string) {
  if (type==='slugline') return 'slugline'
  if (type==='action') return 'action'
  if (type==='character') return 'character'
  if (type==='dialogue') return 'dialogue'
  if (type==='parenthetical') return 'parenthetical'
  if (type==='transition') return 'transition'
  return 'action'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

