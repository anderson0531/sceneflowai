'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

export default function SharePage({ params }: { params: { token: string } }) {
  const token = params.token
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [activity, setActivity] = useState<any>({ scores: [], comments: [], recommendations: [], chat: [] })
  const etagRef = useRef<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/collab/session/${token}`)
      const json = await res.json()
      setSession(json?.session ? json : null)
      setLoading(false)
      try { const pid = localStorage.getItem(`collab:${token}:pid`); if (pid) setParticipantId(pid) } catch {}
    })()
  }, [token])

  useEffect(() => {
    const timer = setInterval(async () => {
      if (!session) return
      const res = await fetch(`/api/collab/session/${token}/activity`, { headers: etagRef.current ? { 'If-None-Match': etagRef.current } as any : undefined })
      if (res.status === 304) return
      const et = res.headers.get('ETag')
      const json = await res.json()
      if (et) etagRef.current = et
      if (json?.success) setActivity(json)
    }, 4000)
    return () => clearInterval(timer)
  }, [token, session])

  async function register() {
    const res = await fetch(`/api/collab/session/${token}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email }) })
    const json = await res.json()
    if (json?.participantId) {
      setParticipantId(json.participantId)
      try { localStorage.setItem(`collab:${token}:pid`, json.participantId) } catch {}
    }
  }

  if (loading) return <div className="p-6 text-gray-200">Loading…</div>
  if (!session) return <div className="p-6 text-gray-200">Collaboration session not found or closed.</div>
  if (!participantId) {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-3">
        <div className="text-white text-xl font-semibold">Join Collaboration</div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Name</div>
          <input className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-gray-100" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Email</div>
          <input className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-gray-100" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <button onClick={register} className="px-4 py-2 rounded bg-blue-600 text-white">Continue</button>
      </div>
    )
  }

  const variants = (session?.session?.payload?.variants || []) as any[]
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-2xl font-semibold">Collaboration</div>
          <div className="text-xs text-gray-400">Participants: {(session?.participants || []).map((p:any)=>p.name).join(', ')}</div>
        </div>
        <a href="/" className="text-sm text-gray-300 border border-gray-700 rounded px-3 py-1">Leave session</a>
      </div>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex gap-2">
            {variants.slice(0,3).map((v:any) => (
              <a key={v.id} href={`#v-${v.id}`} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-800">Variant {v.label || v.id}</a>
            ))}
          </div>
          {variants.slice(0,3).map((v:any) => (
            <div key={v.id} id={`v-${v.id}`} className="p-3 rounded border border-gray-800 bg-gray-900/50">
              <div className="text-white text-lg font-semibold">{v.title || `Variant ${v.label || v.id}`}</div>
              {v.logline && <div className="text-gray-300 mt-1">{v.logline}</div>}
              <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap leading-7">{v.synopsis || v.content || ''}</div>
              {Array.isArray(v.themes) && v.themes.length>0 && (
                <div className="mt-2 text-xs text-gray-400">Themes: <span className="text-gray-200">{v.themes.join(', ')}</span></div>
              )}
            </div>
          ))}
        </div>
        <div>
          <div className="rounded border border-gray-800 bg-gray-900/60">
            <div className="border-b border-gray-800 px-3 py-2 text-sm text-white font-semibold">Activity</div>
            <div className="p-3 space-y-3 max-h-[70vh] overflow-auto">
              <div>
                <div className="text-xs text-gray-400 mb-1">Chat</div>
                <div className="space-y-2 text-sm">
                  {(activity.chat || []).slice().reverse().map((m:any) => (
                    <div key={m.id} className="text-gray-200">{m.content}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Comments</div>
                <div className="space-y-2 text-sm">
                  {(activity.comments || []).map((c:any) => (
                    <div key={c.id} className="text-gray-200">[{c.variantId}] {c.section}{c.path?`/${c.path}`:''}: {c.content}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Recommendations</div>
                <div className="space-y-2 text-sm">
                  {(activity.recommendations || []).map((r:any) => (
                    <div key={r.id} className="text-gray-200">[{r.variantId}] {r.title}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Scores</div>
                <div className="space-y-2 text-sm">
                  {(activity.scores || []).map((s:any, idx:number) => (
                    <div key={idx} className="text-gray-200">[{s.variantId}] {s.score}/5</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


