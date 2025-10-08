"use client";
import { useEffect, useMemo, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function PerConceptBadge({ sessionLink, scopeId }: { sessionLink: string; scopeId: string }) {
  const sessionId = useMemo(()=> {
    try {
      const url = new URL(sessionLink)
      return (url.pathname.split('/').pop() || '').split('?')[0]
    } catch { return (sessionLink.split('/').pop() || '').split('?')[0] }
  }, [sessionLink])
  const [count, setCount] = useState<number>(0)
  const [avg, setAvg] = useState<number | null>(null)

  useEffect(()=>{
    const load = async ()=>{
      const res = await fetch(`/api/collab/feedback.list?sessionId=${sessionId}`, { cache: 'no-store' }).catch(()=>null)
      const json = await res?.json().catch(()=>null)
      const totals = json?.totalsByScopeId || {}
      const bucket = totals[scopeId]
      if (bucket) { setCount(bucket.count || 0); setAvg(typeof bucket.avg === 'number' ? bucket.avg : null) }
    }
    load()
  }, [sessionId, scopeId])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-[10px] text-gray-300 px-1.5 py-0.5 rounded border border-gray-700/70 min-w-[24px] text-center">{count || 0}</div>
        </TooltipTrigger>
        <TooltipContent className="bg-gray-700 text-white border border-gray-600">{avg!=null ? `Avg ${avg.toFixed(1)} • ${count}` : `${count} feedback`}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}


