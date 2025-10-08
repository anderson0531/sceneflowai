"use client";
import { useEffect, useMemo, useState } from 'react'
import { useCollabChat } from '@/hooks/useCollabChat'
import ChatWindow from '@/components/collab/ChatWindow'
import { Button } from '@/components/ui/Button'
import { Users, Link as LinkIcon, RefreshCcw, Loader2, ChevronRight, ChevronDown, MessageCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function OwnerCollabCard({ sessionLink, onApplyRound }: { sessionLink: string | null; onApplyRound?: (concepts:any[])=>void }) {
  const [copied, setCopied] = useState(false)
  const [analytics, setAnalytics] = useState<{ count: number; avg?: number } | null>(null)
  const [round, setRound] = useState<number>(1)
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [recentFeedback, setRecentFeedback] = useState<any[]>([])
  const sessionId = useMemo(()=> {
    if (!sessionLink) return ''
    try {
      const url = new URL(sessionLink)
      const parts = url.pathname.split('/').filter(Boolean)
      return (parts.pop() || '').split('?')[0]
    } catch {
      const parts = sessionLink.split('?')[0].split('/').filter(Boolean)
      return parts.pop() || ''
    }
  }, [sessionLink])
  const token = useMemo(()=> {
    if (!sessionLink) return ''
    try {
      const url = new URL(sessionLink)
      return url.searchParams.get('t') || ''
    } catch {
      const q = sessionLink.split('?')[1] || ''
      const params = new URLSearchParams(q)
      return params.get('t') || ''
    }
  }, [sessionLink])

  useEffect(()=>{
    let timer: any
    const load = async ()=>{
      if (!sessionId) return
      // Fetch feedback
      const res = await fetch(`/api/collab/feedback.list?sessionId=${sessionId}`, { cache: 'no-store' }).catch(()=>null)
      const json = await res?.json().catch(()=>null)
      const list = Array.isArray(json?.feedback) ? json.feedback : []
      const nextCount = list.length
      const nextAvg = nextCount ? (list.reduce((s: number, f: any)=> s + Number(f.score||0), 0) / nextCount) : undefined
      setAnalytics(prev => {
        const safeCount = Math.max(prev?.count || 0, nextCount)
        return { count: safeCount, avg: nextAvg ?? prev?.avg }
      })
      // Capture latest text feedback
      const withComments = list.filter((f: any)=> typeof f.comment === 'string' && f.comment.trim().length > 0)
      setRecentFeedback(withComments.slice(-5))
      // Fetch session round (best effort)
      const qp = token ? `&t=${encodeURIComponent(token)}` : ''
      const sres = await fetch(`/api/collab/session.get?sessionId=${sessionId}${qp}`, { cache: 'no-store' }).catch(()=>null)
      const sjson = await sres?.json().catch(()=>null)
      if (sjson?.success && sjson.session?.round) setRound(Number(sjson.session.round)||1)
    }
    load()
    timer = setInterval(load, 5000)
    return ()=> { if (timer) clearInterval(timer) }
  }, [sessionId])

  const chat = useCollabChat({ sessionId, channel: 'general', pollMs: 3000 })
  useEffect(()=> { setMessages(chat.messages) }, [chat.messages])

  const send = async () => { if (!text.trim()) return; await chat.send(text, 'owner'); setText('') }

  const copy = async ()=>{
    if (!sessionLink) return
    await navigator.clipboard.writeText(sessionLink)
    setCopied(true); setTimeout(()=>setCopied(false), 1200)
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 space-y-3">
      <div className="flex items-center justify-between">
      <div className="text-sm text-gray-300 flex items-center gap-2">
        <button className="text-gray-300 hover:text-white" onClick={()=> setIsOpen(v=>!v)} aria-label={isOpen?'Hide collaboration':'Show collaboration'}>
          {isOpen ? <ChevronDown className="w-4 h-4 inline"/> : <ChevronRight className="w-4 h-4 inline"/>}
        </button>
        <Users className="w-4 h-4" /> Collaboration
        {analytics && (
          <span className="text-gray-400">• {analytics.count} feedback{analytics.count===1?'':'s'}{analytics.avg?` • avg ${(analytics.avg).toFixed(1)}`:''}</span>
        )}
      </div>
        <div className="flex items-center gap-2">
        {sessionLink ? (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={copy}>{copied ? 'Copied' : <><LinkIcon className="w-4 h-4 mr-1"/>Copy Link</>}</Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Copy collaboration link</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={()=>window.open(sessionLink!, '_blank')}>Open</Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Open reviewer page</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={async ()=>{
                    if (!sessionId) return
                    const res = await fetch(`/api/collab/feedback.list?sessionId=${sessionId}`, { cache: 'no-store' }).catch(()=>null)
                    const json = await res?.json().catch(()=>null)
                    const list = Array.isArray(json?.feedback) ? json.feedback : []
                    const avg = list.length ? (list.reduce((s: number, f: any)=> s + Number(f.score||0), 0) / list.length) : undefined
                    setAnalytics({ count: list.length, avg })
                  }}><RefreshCcw className="w-4 h-4"/></Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Refresh analytics</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          <Button variant="ghost" size="sm" disabled><Loader2 className="w-4 h-4 animate-spin"/></Button>
        )}
        </div>
      </div>
      {isOpen && (
        <>
          {/* Analytics */}
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
            <div className="rounded border border-gray-800 p-2 bg-gray-900/60"><div className="text-gray-400">Feedback</div><div className="text-white text-lg">{analytics?.count ?? 0}</div></div>
            <div className="rounded border border-gray-800 p-2 bg-gray-900/60"><div className="text-gray-400">Average</div><div className="text-white text-lg">{analytics?.avg ? analytics!.avg!.toFixed(1) : '-'}</div></div>
            <div className="rounded border border-gray-800 p-2 bg-gray-900/60"><div className="text-gray-400">Round</div><div className="text-white text-lg">{round}</div></div>
          </div>
          {/* Recent feedback */}
          <div className="rounded border border-gray-800 p-2 bg-gray-900/60 text-xs text-gray-300">
            <div className="text-gray-400 mb-1">Recent feedback</div>
            {recentFeedback.length === 0 ? (
              <div className="text-gray-500">No comments yet</div>
            ) : (
              <ul className="space-y-1">
                {recentFeedback.map((f: any)=> (
                  <li key={f.id} className="text-gray-300">
                    <span className="text-yellow-500">{Number(f.score)||''}</span>{f.comment?`: ${String(f.comment)}`:''} <span className="text-gray-500">{f.alias?`— ${String(f.alias)}`:''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ChatWindow sessionId={sessionId} role="owner" />
        </>
      )}
    </div>
  )
}


