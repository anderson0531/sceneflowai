'use client'

import React, { useEffect, useMemo, useState } from 'react'
import ChatWindow from '../collab/ChatWindow'

type Item = {
  id: string
  title?: string
  logline?: string
  synopsis?: string
}

export default function OwnerCollabPanel({
  open,
  onClose,
  sessionId,
  activeVariantId,
  onSelectVariant,
}: {
  open: boolean
  onClose: () => void
  sessionId: string | null
  activeVariantId: string | null
  onSelectVariant: (id: string) => void
}) {
  const [tab, setTab] = useState<'feedback' | 'chat'>('feedback')
  const [items, setItems] = useState<Item[]>([])
  const [feedback, setFeedback] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(false)

  const visibleItemIds = useMemo(() => {
    if (!items.length) return [] as string[]
    if (activeVariantId) return [activeVariantId]
    return items.map((i) => i.id)
  }, [items, activeVariantId])

  useEffect(() => {
    if (!open || !sessionId) return
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/collab/session.get?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const j = await res.json().catch(() => null)
        if (mounted && j?.success && Array.isArray(j.items)) {
          setItems(j.items)
        }
      } catch {}
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [open, sessionId])

  useEffect(() => {
    if (!open || !sessionId || !visibleItemIds.length) return
    let cancelled = false
    ;(async () => {
      const map: Record<string, any[]> = {}
      for (const id of visibleItemIds) {
        try {
          const r = await fetch(`/api/collab/feedback.list?sessionId=${sessionId}&scopeId=${encodeURIComponent(id)}`, { cache: 'no-store' })
          const j = await r.json()
          if (j?.success) map[id] = j.feedback || []
        } catch {}
      }
      if (!cancelled) setFeedback(map)
    })()
    return () => {
      cancelled = true
    }
  }, [open, sessionId, visibleItemIds.join('|')])

  const parseComment = (c: string) => {
    try {
      const lastBrace = c.lastIndexOf('{')
      if (lastBrace >= 0) {
        const json = c.slice(lastBrace)
        return JSON.parse(json)
      }
    } catch {}
    return null
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-gray-950 border-l border-gray-800 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <div className="text-white font-semibold">Collaboration</div>
          <div className="ml-auto flex items-center gap-2">
            <button className={`text-sm px-2 py-1 rounded ${tab==='feedback'?'bg-gray-800 text-white':'text-gray-300 hover:bg-gray-800/60'}`} onClick={()=>setTab('feedback')}>Feedback</button>
            <button className={`text-sm px-2 py-1 rounded ${tab==='chat'?'bg-gray-800 text-white':'text-gray-300 hover:bg-gray-800/60'}`} onClick={()=>setTab('chat')}>Chat</button>
            <button className="text-sm px-2 py-1 rounded bg-gray-800 text-gray-200" onClick={onClose}>Close</button>
          </div>
        </div>
        {tab === 'feedback' ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading && <div className="text-sm text-gray-400">Loading…</div>}
            {!loading && items.length === 0 && (
              <div className="text-sm text-gray-400">No session or items found.</div>
            )}
            {items.map((it) => (
              <div key={it.id} className={`rounded border ${activeVariantId===it.id?'border-blue-600':'border-gray-800'} bg-gray-900/50 p-3`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-white font-medium">{it.title || `Variant ${it.id}`}</div>
                    {it.logline && <div className="text-gray-300 text-sm mt-1">{it.logline}</div>}
                  </div>
                  <button className="text-xs px-2 py-1 rounded bg-gray-800" onClick={() => onSelectVariant(it.id)}>Open</button>
                </div>
                <div className="mt-2 space-y-2">
                  {(feedback[it.id]||[]).slice().reverse().slice(0,6).map((f: any) => {
                    const parsed = typeof f.comment === 'string' ? parseComment(f.comment) : null
                    return (
                      <div key={f.id} className="text-xs text-gray-300 rounded border border-gray-800 p-2">
                        <div className="text-gray-400 mb-1">
                          <span className="text-yellow-500">{Number(f.score)||''}</span> {f.alias?`— ${String(f.alias)}`:''}
                          <span className="text-gray-500 ml-2">{new Date(f.createdAt).toLocaleString()}</span>
                        </div>
                        {parsed ? (
                          <div className="space-y-1">
                            {parsed.strengths && <div><span className="text-gray-400">Strengths:</span> {parsed.strengths}</div>}
                            {parsed.concerns && <div><span className="text-gray-400">Concerns:</span> {parsed.concerns}</div>}
                            {parsed.suggestions && <div><span className="text-gray-400">Suggestions:</span> {parsed.suggestions}</div>}
                            {parsed.questions && <div><span className="text-gray-400">Questions:</span> {parsed.questions}</div>}
                          </div>
                        ) : (
                          <div>{String(f.comment || '')}</div>
                        )}
                        <div className="mt-2 flex gap-2">
                          <button className="px-2 py-0.5 rounded bg-gray-800 text-gray-200 text-[11px]" onClick={()=> onSelectVariant(it.id)}>Go to Variant</button>
                        </div>
                      </div>
                    )
                  })}
                  {(feedback[it.id]||[]).length === 0 && (
                    <div className="text-xs text-gray-500">No feedback yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            {sessionId ? (
              <ChatWindow sessionId={sessionId} role="owner" reviewer={{ reviewerId: 'owner', name: 'Owner' }} />
            ) : (
              <div className="text-sm text-gray-400">Start a collaboration session to chat with reviewers.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


