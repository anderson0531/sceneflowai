import { useMemo, useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Node, mergeAttributes, Mark } from '@tiptap/core'
import { Button } from '@/components/ui/Button'
import { useCue } from '@/store/useCueStore'

// Basic screenplay block nodes (Slugline, Action, Character, Dialogue, Parenthetical, Transition)
const ScreenplayBlock = (name: string, className: string) => Node.create({
  name,
  group: 'block',
  content: 'text*',
  parseHTML() {
    return [{ tag: `p[data-type="${name}"]` }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes({ 'data-type': name, class: className }), 0]
  },
})

// Typography tuned for screenplay layout
const Slugline = ScreenplayBlock('slugline', 'uppercase tracking-wider text-gray-200 font-semibold mt-6 mb-2')
const ActionBlock = ScreenplayBlock('action', 'text-gray-100 my-2')
// Custom Character block: render as centered label "CHARACTER: NAME" for easier identification
const Character = Node.create({
  name: 'character',
  group: 'block',
  content: 'text*',
  parseHTML() {
    return [
      { tag: 'p[data-type="character"]' },
      { tag: 'center' }
    ]
  },
  renderHTML({ HTMLAttributes }) {
    // Ensure content hole (0) is the only child of its parent to satisfy ProseMirror spec
    return [
      'center',
      mergeAttributes({ 'data-type': 'character', class: 'uppercase tracking-wide text-gray-200 font-semibold text-center my-1' }, HTMLAttributes),
      ['span', { class: 'text-gray-400 mr-2 select-none' }, 'CHARACTER: '],
      ['span', { class: 'inline-block' }, 0]
    ]
  }
})
const Dialogue = ScreenplayBlock('dialogue', 'text-gray-100 ml-[144px] mr-[144px] leading-7')
const Parenthetical = ScreenplayBlock('parenthetical', 'italic text-gray-300 ml-[160px] mr-[160px]')
const Transition = ScreenplayBlock('transition', 'uppercase tracking-wide text-gray-300 text-right mr-6 mt-4')

function simpleFountainToBlocks(text: string) {
  const lines = (text || '').split(/\r?\n/)
  const blocks: Array<{ type: string; text: string }> = []
  let lastWasCharacter = false
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.trim() === '') { lastWasCharacter = false; blocks.push({ type: 'action', text: '' }); continue }
    if (/^(INT\.|EXT\.|INT\/EXT\.)/i.test(line)) { blocks.push({ type: 'slugline', text: line }); lastWasCharacter = false; continue }
    // Character with inline parenthetical, e.g., "ANYA (V.O.)"
    const charWithParen = line.match(/^([A-Z][A-Z0-9 .\-']{0,39})\s*\(([^)]+)\)$/)
    if (charWithParen) {
      const name = (charWithParen[1] || '').trim()
      const paren = (charWithParen[2] || '').trim()
      if (name) {
        blocks.push({ type: 'character', text: name })
        if (paren) blocks.push({ type: 'parenthetical', text: `(${paren})` })
        lastWasCharacter = true
        continue
      }
    }
    if (/^[A-Z][A-Z0-9 .\-']+$/.test(line) && line.length <= 40) { blocks.push({ type: 'character', text: line }); lastWasCharacter = true; continue }
    if (/^\(.+\)$/.test(line)) { blocks.push({ type: 'parenthetical', text: line }); continue }
    if (/(TO:|CUT TO:|FADE OUT\.|FADE IN\.|DISSOLVE TO:)$/i.test(line)) { blocks.push({ type: 'transition', text: line }); lastWasCharacter = false; continue }
    if (lastWasCharacter) { blocks.push({ type: 'dialogue', text: line }) } else { blocks.push({ type: 'action', text: line }) }
  }
  return blocks
}

// Inline comment highlight mark
const CommentMark = Mark.create({
  name: 'comment',
  inclusive: false,
  addAttributes() {
    return {
      id: { default: '' },
      resolved: { default: false }
    }
  },
  parseHTML() { return [{ tag: 'span[data-comment-id]' }] },
  renderHTML({ HTMLAttributes }) {
    const attrs: any = { 'data-comment-id': HTMLAttributes.id || '', class: `comment-anchor ${HTMLAttributes.resolved ? 'opacity-40' : 'bg-yellow-900/30 ring-1 ring-yellow-600/40'} rounded-sm` }
    return ['span', attrs, 0]
  }
})

// Suggestion marks for track changes
const SuggestAdd = Mark.create({
  name: 'suggestAdd',
  inclusive: true,
  addAttributes() { return { id: { default: '' } } },
  parseHTML() { return [{ tag: 'span[data-suggest="add"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['span', { 'data-suggest': 'add', 'data-suggest-id': HTMLAttributes.id || '', class: 'bg-blue-900/30 text-blue-200 ring-1 ring-blue-700/40 rounded-sm' }, 0]
  }
})

const SuggestDel = Mark.create({
  name: 'suggestDel',
  inclusive: false,
  addAttributes() { return { id: { default: '' } } },
  parseHTML() { return [{ tag: 'span[data-suggest="del"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['span', { 'data-suggest': 'del', 'data-suggest-id': HTMLAttributes.id || '', class: 'line-through text-red-300 bg-red-900/20 rounded-sm' }, 0]
  }
})

export function ScriptEditor({ fountain, onReady, containerRef, onComment, onAskFlow, suggesting }: { fountain: string; onReady?: (editor: any) => void; containerRef?: React.Ref<HTMLDivElement>; onComment?: (sel: { from: number; to: number; text: string }) => void; onAskFlow?: (payload: { prompt: string; context: string }) => void; suggesting?: boolean }) {
  const { invokeCue } = useCue()
  const content = useMemo(() => {
    try {
      // Try fountain-js if available for better parsing
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const f = require('fountain-js')
      const parsed = f.parse(fountain || '')
      // Fallback to simple blocks if parser doesn't provide structured tokens
      const blocks = simpleFountainToBlocks(parsed?.script ? fountain : fountain)
      return { type: 'doc', content: blocks.map(b => ({ type: b.type, content: b.text ? [{ type: 'text', text: b.text }] : [] })) }
    } catch {
      const blocks = simpleFountainToBlocks(fountain || '')
      return { type: 'doc', content: blocks.map(b => ({ type: b.type, content: b.text ? [{ type: 'text', text: b.text }] : [] })) }
    }
  }, [fountain])

  const editor = useEditor({
    extensions: [StarterKit, Slugline, ActionBlock, Character, Dialogue, Parenthetical, Transition, CommentMark, SuggestAdd, SuggestDel],
    content,
    autofocus: 'end',
    editable: true,
    editorProps: {
      handleKeyDown(view, event) {
        const ed: any = (view as any).editor
        const isSuggesting = !!ed?.storage?.suggesting
        const state = view.state
        const {$from} = state.selection as any
        const parent = $from.parent
        const typeName: string = parent?.type?.name
        const isEmpty = !parent?.textContent || parent.textContent.trim() === ''

        // Suggesting mode: intercept typing and deletions
        if (isSuggesting) {
          // Insertions (single char)
          if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key && event.key.length === 1) {
            event.preventDefault()
            const id = `sa_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
            ed.chain().focus().insertContent({ type: 'text', text: event.key, marks: [{ type: 'suggestAdd', attrs: { id } }] }).run()
            return true
          }
          // Backspace/Delete => mark as suggestDel
          if (event.key === 'Backspace' || event.key === 'Delete') {
            const { from, to } = state.selection
            event.preventDefault()
            let selFrom = from, selTo = to
            if (from === to) {
              if (event.key === 'Backspace' && from > 1) { selFrom = from - 1; selTo = from }
              else if (event.key === 'Delete') { selFrom = from; selTo = from + 1 }
            }
            if (selTo > selFrom) {
              ed.chain().focus().setTextSelection({ from: selFrom, to: selTo }).setMark('suggestDel', { id: `sd_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }).setTextSelection({ from: to, to }).run()
            }
            return true
          }
        }

        // Tab cycles through block types when line is empty
        if (event.key === 'Tab') {
          if (isEmpty) {
            event.preventDefault()
            try {
              const cycle: string[] = ['action', 'character', 'parenthetical', 'dialogue']
              const current: string = typeName || 'action'
              const idx: number = Math.max(0, cycle.indexOf(current))
              const nextNode: string = cycle[(idx + 1) % cycle.length]
              ;(view as any).editor?.chain().focus().toggleNode(current, nextNode).run()
            } catch {}
            return true
          }
        }

        // Predict next element on Enter
        if (event.key === 'Enter' && !event.shiftKey) {
          let nextType: string | null = null
          if (typeName === 'character') nextType = 'dialogue'
          else if (typeName === 'dialogue') nextType = 'character'
          else if (typeName === 'slugline') nextType = 'action'
          if (nextType) {
            event.preventDefault()
            ;(view as any).editor?.chain().focus().insertContent({ type: nextType, content: [] }).run()
            return true
          }
        }
        return false
      }
    },
    onUpdate({ editor }) {
      // Auto-detect slugline if line begins with INT. or EXT.
      try {
        const { state } = editor
        const {$from} = state.selection as any
        const parent = $from.parent
        const text: string = (parent?.textContent || '').trim()
        if (/^(INT\.|EXT\.|INT\/EXT\.)/i.test(text) && parent?.type?.name !== 'slugline') {
          editor.chain().focus().toggleNode(parent.type?.name || 'action', 'slugline').run()
        }
      } catch {}
    }
  })

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onReady) onReady(editor)
    // expose editor instance on container for parent access
    try { if (editor && (pageRef as any).current) { ((pageRef as any).current as any).__editor = editor } } catch {}
  }, [editor, onReady])

  // Sync suggesting mode flag into editor storage
  useEffect(() => {
    try { if (editor) (editor as any).storage = { ...(editor as any).storage, suggesting: !!suggesting } } catch {}
  }, [editor, suggesting])

  // ----- Autocomplete -----
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestItems, setSuggestItems] = useState<string[]>([])
  const [suggestIndex, setSuggestIndex] = useState(0)
  const pageRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<{ left: number; top: number }>({ left: 0, top: 0 })

  const collectFromDoc = (type: string): string[] => {
    if (!editor) return []
    const names: Set<string> = new Set()
    editor.state.doc.descendants((node: any) => {
      if (node.type?.name === type) {
        const t = String(node.textContent || '').trim()
        if (t) names.add(t)
      }
      return true
    })
    return Array.from(names)
  }

  const updateSuggestions = () => {
    if (!editor) return
    const state = editor.state
    const {$from} = state.selection as any
    const parent = $from.parent
    const typeName: string = parent?.type?.name
    const text: string = String(parent?.textContent || '')
    if (typeName !== 'character' && typeName !== 'slugline') { setSuggestOpen(false); return }
    const all = typeName === 'character' ? collectFromDoc('character') : collectFromDoc('slugline')
    const prefix = text.trim().toUpperCase()
    const list = all.filter(v => !prefix || v.toUpperCase().startsWith(prefix)).slice(0, 8)
    setSuggestItems(list)
    setSuggestIndex(0)
    try {
      const coords = (editor.view as any).coordsAtPos(state.selection.from)
      const container = pageRef.current?.getBoundingClientRect()
      if (coords && container) setAnchor({ left: coords.left - container.left, top: coords.bottom - container.top })
    } catch {}
    setSuggestOpen(list.length > 0)
  }

  useEffect(() => {
    if (!editor) return
    const onSel = () => updateSuggestions()
    const onTrans = () => updateSuggestions()
    editor.on('selectionUpdate', onSel)
    editor.on('transaction', onTrans)
    return () => { editor.off('selectionUpdate', onSel); editor.off('transaction', onTrans) }
  }, [editor])

  const applySuggestion = (value: string) => {
    if (!editor) return
    editor.chain().focus().command(({ tr }: any) => {
      const {$from} = tr.selection as any
      const parent = $from.parent
      const from = $from.before()
      const to = from + parent.nodeSize - 2
      tr = tr.deleteRange(from, to)
      tr = tr.insertText(value, from)
      ;(editor.view as any).dispatch(tr)
      return true
    }).run()
    setSuggestOpen(false)
  }

  return (
    <div className="w-full">
      {/* Page container centered */}
      <div ref={(el)=>{ (pageRef as any).current = el; if (typeof containerRef === 'function') containerRef(el as any); else if (containerRef && 'current' in (containerRef as any)) (containerRef as any).current = el }} className="relative mx-auto my-4 rounded-md border border-gray-800 bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
           style={{ width: 816, /* ~8.5in at 96dpi */ }}>
        <div className="p-8" style={{ fontFamily: '"Courier Prime", "Courier New", Courier, monospace' }}>
          <EditorContent editor={editor} className="prose prose-invert max-w-none text-[15px] leading-8" />
          {suggestOpen && (
            <div className="absolute z-10 bg-gray-900 border border-gray-700 rounded-md shadow-lg text-sm" style={{ left: anchor.left, top: anchor.top }}>
              {suggestItems.map((it, idx) => (
                <div key={it+idx}
                     className={`px-3 py-1 cursor-pointer ${idx===suggestIndex ? 'bg-blue-600/30 text-white' : 'text-gray-200'}`}
                     onMouseDown={(e)=>{ e.preventDefault(); applySuggestion(it) }}>
                  {it}
                </div>
              ))}
            </div>
          )}

          {/* Floating selection toolbar */}
          <SelectionToolbar editor={editor} onAskFlow={({ prompt, context })=>{
            try {
              if (onAskFlow) onAskFlow({ prompt, context })
              else invokeCue({ type: 'text', content: `${prompt}\n\nCONTEXT:\n${context}` })
            } catch {}
          }} onComment={() => {
            const { state } = editor
            const { from, to } = state.selection
            const text = state.doc.textBetween(from, to).trim()
            if (!text) return
            onComment && onComment({ from, to, text })
          }} />
        </div>
      </div>
    </div>
  )
}

// --- Selection Toolbar Component ---
function SelectionToolbar({ editor, onAskFlow, onComment }: { editor: any; onAskFlow: (payload: { prompt: string; context: string })=>void; onComment: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<{ left:number; top:number }>({ left: 0, top: 0 })
  const [menuOpen, setMenuOpen] = useState(false)
  const [freeText, setFreeText] = useState('')
  const templates = ['Punch up dialogue', 'Enhance visuals', 'Tighten pacing', 'Shorten']

  const update = () => {
    if (!editor) return
    const { state, view } = editor
    const { from, to } = state.selection
    const text = state.doc.textBetween(from, to).trim()
    if (!text) { setVisible(false); setMenuOpen(false); return }
    try {
      const coords = view.coordsAtPos(to)
      const container = (view.dom as HTMLElement).getBoundingClientRect()
      setPos({ left: coords.left - container.left, top: coords.top - container.top - 36 })
      setVisible(true)
    } catch { setVisible(false) }
  }

  useEffect(() => {
    if (!editor) return
    const onSel = () => update()
    editor.on('selectionUpdate', onSel)
    return () => editor.off('selectionUpdate', onSel)
  }, [editor])

  if (!visible) return null
  const send = (template?: string) => {
    const { state } = editor
    const { from, to } = state.selection
    const text = state.doc.textBetween(from, to).trim()
    const prompt = [template || '', freeText || ''].filter(Boolean).join('\n')
    onAskFlow({ prompt, context: text })
    setMenuOpen(false)
  }

  return (
    <div ref={ref} className="absolute z-20" style={{ left: pos.left, top: pos.top }}>
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 shadow-lg rounded-md px-2 py-1">
        <Button variant="secondary" size="sm" onClick={()=>setMenuOpen(v=>!v)}>Ask Flow</Button>
        <Button variant="ghost" size="sm" onClick={onComment}>Comment</Button>
      </div>
      {menuOpen && (
        <div className="mt-2 w-[300px] bg-gray-900 border border-gray-700 rounded-md p-2 shadow-xl">
          <div className="text-xs text-gray-400 mb-2">Quick prompts</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {templates.map(t => (
              <Button key={t} variant="ghost" size="sm" onClick={()=>send(t)}>{t}</Button>
            ))}
          </div>
          <textarea className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 mb-2" placeholder="Custom instruction" value={freeText} onChange={e=>setFreeText(e.target.value)} />
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={()=>setMenuOpen(false)}>Close</Button>
            <Button variant="primary" size="sm" onClick={()=>send()}>Send</Button>
          </div>
        </div>
      )}
    </div>
  )
}


