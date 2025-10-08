'use client'

import React, { useEffect, useState } from 'react'
import { VideoProductionService } from '@/lib/orchestration/VideoProductionService'
import { getVideoAdapter } from '@/lib/providers'
import { registerDefaultAdapters } from '@/lib/providers/registerDefaultAdapters'

const svc = new VideoProductionService(getVideoAdapter as any)

export default function Phase4Video() {
  const [provider, setProvider] = useState('veo')
  const [shots, setShots] = useState<Array<{ id:string; keyframeUrl:string; vdp:string; durationSec:number; takes?: Array<{ url:string; provider:string }> }>>([
    { id:'s1', keyframeUrl:'/window.svg', vdp:'Establishing shot...', durationSec:8 },
    { id:'s2', keyframeUrl:'/window.svg', vdp:'Character line...', durationSec:8 }
  ])

  useEffect(()=>{ registerDefaultAdapters() }, [])

  const genTakes = async (shotId: string) => {
    const shot = shots.find(s=>s.id===shotId)!
    try {
      const takes = await svc.generateTakes(provider, shot, 2)
      setShots(prev => prev.map(s => s.id===shotId ? { ...s, takes: takes.map(t=>({ url: t.clipUrl, provider: t.provider })) } : s))
    } catch (e) {
      alert('Adapter not registered for provider: ' + provider)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Phase 4: Video Production (I+T+V)</h1>
      <div className="flex gap-2 items-center">
        <div className="text-sm text-gray-600">Provider</div>
        <input value={provider} onChange={e=>setProvider(e.target.value)} className="border rounded p-1 text-sm" placeholder="veo|sora|runway" />
      </div>
      <div className="space-y-3">
        {shots.map(s => (
          <div key={s.id} className="border rounded p-3">
            <div className="text-sm font-medium mb-1">Shot {s.id}</div>
            <div className="text-xs text-gray-600 mb-2">{s.vdp} — {s.durationSec}s</div>
            <div className="flex gap-2">
              <button onClick={()=>genTakes(s.id)} className="border rounded px-3 py-1.5 text-sm">Generate Takes</button>
            </div>
            {s.takes && s.takes.length>0 && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                {s.takes.map((t, i)=> (
                  <video key={i} controls className="w-full rounded border">
                    <source src={t.url} />
                  </video>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
