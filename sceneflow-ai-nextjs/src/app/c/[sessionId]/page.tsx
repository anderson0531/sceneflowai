"use client";
import { useEffect, useState } from 'react'
import { useCollabChat } from '@/hooks/useCollabChat'
import ChatWindow from '@/components/collab/ChatWindow'

export default function CollaborationPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params
  const [messages, setMessages] = useState<any[]>([])
  const [feedbackByItem, setFeedbackByItem] = useState<Record<string, any[]>>({})
  const [text, setText] = useState('')
  const [score, setScore] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reviewer, setReviewer] = useState<{ reviewerId: string; name: string } | null>(null)
  const [regOpen, setRegOpen] = useState<boolean>(false)
  const [scores, setScores] = useState<Record<string, { score: number; comment: string }>>({})
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})
  const [finishOpen, setFinishOpen] = useState(false)
  const [finished, setFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const init = async ()=>{
      setLoading(true)
      setLoadError(null)
      let hydrated = false
      try {
        // Pass through the token on first attempt so server can hydrate if store is cold
        const urlNow = typeof window !== 'undefined' ? new URL(window.location.href) : null
        const tParam = urlNow?.searchParams.get('t') || ''
        const qs = tParam ? `&t=${encodeURIComponent(tParam)}` : ''
        const s = await fetch(`/api/collab/session.get?sessionId=${encodeURIComponent(sessionId)}${qs}` , { cache: 'no-store' })
        if (s.ok) {
          const j = await s.json().catch(()=>null)
          const valid = j?.success && Array.isArray(j.items) && j.items.length > 0
          if (valid) {
            setItems(j.items)
            setActiveId(j.items[0]?.id || null)
            hydrated = true
          }
        }
      } catch {}

      if (!hydrated && typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href)
          const t = url.searchParams.get('t')
          if (t) {
            // Safer base64 decode without deprecated escape/unescape when possible
            let decoded = ''
            try {
              decoded = atob(decodeURIComponent(t))
            } catch {
              try { decoded = decodeURIComponent(escape(atob(decodeURIComponent(t)))) } catch {}
            }
            const json = JSON.parse(decoded)
            const arr = Array.isArray(json?.items) ? json.items : []
            if (arr.length) {
              await fetch('/api/collab/session.bootstrap', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ sessionId, items: arr })
              }).catch(()=>null)
              setItems(arr)
              setActiveId(arr[0]?.id || null)
              hydrated = true
            }
          }
        } catch {}
      }

      if (!hydrated) setLoadError('This collaboration session could not be loaded. The link may be expired.')
      setLoading(false)
    }
    init()
    // chat handled by hook below
    return () => {}
  }, [sessionId])

  useEffect(() => {
    // Load feedback per item for display
    const loadAll = async () => {
      const map: Record<string, any[]> = {}
      for (const it of items) {
        try {
          const r = await fetch(`/api/collab/feedback.list?sessionId=${sessionId}&scopeId=${encodeURIComponent(it.id)}`, { cache: 'no-store' })
          const j = await r.json()
          if (j?.success) map[it.id] = j.feedback || []
        } catch {}
      }
      setFeedbackByItem(map)
    }
    if (items.length) loadAll()
  }, [items, sessionId])

  const chat = useCollabChat({ sessionId, channel: 'general', reviewer, pollMs: 3000 })
  useEffect(()=> { setMessages(chat.messages) }, [chat.messages])
  const send = async () => { if (!text.trim() || !chat.canSend) return; await chat.send(text, 'collaborator'); setText('') }

  const submitFeedback = async () => {
    if (!score) return
    await fetch('/api/collab/feedback.submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, score, comment, scopeId: activeId, reviewerId: reviewer?.reviewerId, alias: reviewer?.name }) })
    setScore(0); setComment('')
  }

  const submitInline = async (scopeId: string) => {
    const entry = scores[scopeId] || { score: 0, comment: '' }
    if (!entry.score) return
    await fetch('/api/collab/feedback.submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, score: entry.score, comment: entry.comment, scopeId, reviewerId: reviewer?.reviewerId, alias: reviewer?.name }) })
    setSubmitted(prev => ({ ...prev, [scopeId]: true }))
  }

  const idxOf = (id: string | null) => (id ? items.findIndex(it=>it.id===id) : -1)
  const submitAll = async () => {
    // submit any ratings not yet sent but have a score
    const entries = Object.entries(scores)
    for (const [scopeId, val] of entries) {
      if (!submitted[scopeId] && val.score) {
        await submitInline(scopeId)
      }
    }
  }
  const goNext = async () => {
    const i = idxOf(activeId)
    if (i>=0 && i<items.length-1) {
      setActiveId(items[i+1].id)
    } else if (i===items.length-1) {
      setFinishOpen(true)
    }
  }
  const goPrev = () => { const i = idxOf(activeId); if (i>0) setActiveId(items[i-1].id) }
  const reviewedCount = items.filter((it:any)=> submitted[it.id]).length
  const totalCount = items.length
  const progressPct = totalCount ? Math.round((reviewedCount/totalCount)*100) : 0

  return (
    <>
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Collaboration</h1>
        {loading && (
          <div className="rounded border border-gray-800 p-6 bg-gray-900/60 text-center text-gray-300">Loading session…</div>
        )}
        {!loading && loadError && (
          <div className="rounded border border-red-800 p-6 bg-red-900/30 text-center text-red-200">{loadError}</div>
        )}
        {finished && (
          <div className="rounded border border-gray-800 p-6 bg-gray-900/60 text-center">
            <div className="text-xl font-semibold mb-2">Thanks for your feedback!</div>
            <div className="text-gray-300 mb-4">You reviewed {reviewedCount} of {totalCount} concept{totalCount===1?'':'s'}.</div>
            <a href="/" className="inline-block px-4 py-2 rounded bg-blue-600 hover:bg-blue-500">Close</a>
          </div>
        )}
        {!finished && !reviewer && !loading && (
          <div className="rounded border border-gray-800 p-3 bg-gray-900/50">
            <div className="text-sm text-gray-300 mb-2">Tell us who you are</div>
            <div className="flex items-center gap-2">
              <input id="rname" placeholder="Your name" className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1" />
              <input id="remail" placeholder="Your email" className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1" />
            <button className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500" onClick={async ()=>{
                const name = (document.getElementById('rname') as HTMLInputElement)?.value
                const email = (document.getElementById('remail') as HTMLInputElement)?.value
                const r = await fetch('/api/collab/reviewer.register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sessionId, name, email }) })
                const j = await r.json().catch(()=>null)
                if (j?.success) setReviewer({ reviewerId: j.reviewerId, name })
              }}>Continue</button>
            </div>
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="rounded border border-gray-800 p-3 bg-gray-900/50 space-y-3">
            <div className="text-sm text-gray-300 flex items-center justify-between">
              <span>Concepts</span>
              <span className="text-gray-400">Reviewed {reviewedCount}/{totalCount}</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded overflow-hidden">
              <div className="h-2 bg-blue-600" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="space-y-3">
              {items.map(it => (
                <div key={it.id} className={`rounded border ${activeId===it.id?'border-blue-600':'border-gray-800'} bg-gray-900/70 p-3`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white font-medium">{String(it.title || '')}</div>
                      {it.logline && (
                        <div className="text-gray-300 text-sm mt-1">
                          <span className="text-gray-400">Logline:</span> {String(it.logline)}
                        </div>
                      )}
                    </div>
                    <button onClick={()=>setActiveId(it.id)} className={`text-xs px-2 py-1 rounded ${activeId===it.id?'bg-blue-600':'bg-gray-800'}`}>{activeId===it.id?'Selected':'Review'}</button>
                  </div>
                  {it.details && (
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-300">
                      {it.details.genre && <div><span className="text-gray-400">Genre:</span> {String(it.details.genre)}</div>}
                      {it.details.duration && <div><span className="text-gray-400">Duration (approximate):</span> {String(it.details.duration)}</div>}
                      {it.details.targetAudience && <div><span className="text-gray-400">Audience:</span> {String(it.details.targetAudience)}</div>}
                      {it.details.tone && <div><span className="text-gray-400">Tone:</span> {String(it.details.tone)}</div>}
                      {it.details.structure && <div><span className="text-gray-400">Structure:</span> {String(it.details.structure)}</div>}
                    </div>
                  )}
                  {Array.isArray(it.characters) && it.characters.length > 0 && (
                    <div className="mt-2 text-xs text-gray-300">
                      <div className="text-gray-400 mb-1">Characters</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {it.characters.map((c:any, idx:number)=> (
                          <div key={idx} className="">
                            <div className="truncate"><span className="text-white">{String(c.name || '')}</span>{c.role?` — ${String(c.role)}`:''}</div>
                            {c.description && <div className="text-gray-400 truncate">{String(c.description)}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(it.beats) && it.beats.length > 0 && (
                    <div className="mt-2 text-xs text-gray-300">
                      <div className="text-gray-400 mb-1">Scenes</div>
                      <ol className="list-decimal list-inside space-y-0.5">
                        {it.beats.map((b:any)=> (
                          <li key={b.beat_number} className="flex justify-between gap-2">
                            <span className="truncate">{String(b.beat_title || '')}</span>
                            {b.duration_estimate && <span className="text-gray-500 shrink-0">{String(b.duration_estimate)}</span>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {/* Inline rating */}
                  <div className="mt-3 border-t border-gray-800 pt-3">
                    <div className="text-xs text-gray-300 mb-1">Your rating</div>
                    <div className="flex items-center gap-2">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={()=> setScores(prev => ({ ...prev, [it.id]: { score: n, comment: prev[it.id]?.comment || '' } }))} className={`px-2 py-1 rounded ${ (scores[it.id]?.score||0) >= n ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300'}`}>{n}</button>
                      ))}
                      <textarea value={scores[it.id]?.comment || ''} onBlur={()=> { if ((scores[it.id]?.score||0)>0) submitInline(it.id) }} onChange={e=> setScores(prev=> ({ ...prev, [it.id]: { score: prev[it.id]?.score||0, comment: (e.target as HTMLTextAreaElement).value } }))} placeholder="Optional comment" rows={2} className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs resize-y min-h-[40px]" />
                      <button onClick={()=>submitInline(it.id)} className="px-2 py-1 rounded bg-green-600 text-xs">Submit</button>
                    </div>
                    {activeId===it.id && (
                      <div className="mt-2 flex justify-end gap-2">
                        <button onClick={goPrev} className="px-2 py-1 rounded bg-gray-800 text-xs">Previous</button>
                        <button onClick={goNext} disabled={!submitted[it.id]} className={`px-2 py-1 rounded text-xs ${submitted[it.id] ? 'bg-blue-600' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>Next</button>
                      </div>
                    )}
                    {Array.isArray(feedbackByItem[it.id]) && feedbackByItem[it.id].length > 0 && (
                      <div className="mt-3 text-xs text-gray-300">
                        <div className="text-gray-400 mb-1">Recent feedback</div>
                        <ul className="space-y-1">
                          {feedbackByItem[it.id].slice(-3).map((f:any) => (
                            <li key={f.id} className="text-gray-300">
                              <span className="text-yellow-500">{Number(f.score)||''}</span>{f.comment?`: ${String(f.comment)}`:''} <span className="text-gray-500">{f.alias?`— ${String(f.alias)}`:''}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <ChatWindow sessionId={sessionId} reviewer={reviewer} role="collaborator" />
        {/* Overall feedback removed by request */}
      </div>
    </div>
    {finishOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={()=>setFinishOpen(false)} />
        <div className="relative w-full max-w-md mx-auto rounded-lg border border-gray-800 bg-gray-900 p-5 shadow-xl">
          <div className="text-lg font-semibold text-white mb-2">Submit all reviews?</div>
          <div className="text-sm text-gray-300 mb-3">We will submit any rated concepts you haven't submitted yet.</div>
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 rounded bg-gray-800" onClick={()=>setFinishOpen(false)}>Cancel</button>
            <button className="px-3 py-1 rounded bg-blue-600" onClick={async ()=>{ await submitAll(); setFinishOpen(false); setFinished(true) }}>Submit All</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}



