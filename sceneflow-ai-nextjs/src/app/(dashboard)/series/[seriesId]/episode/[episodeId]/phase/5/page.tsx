'use client'

import React, { useState } from 'react'

type Strip = { id: string; startSec: number; durationSec: number; url?: string }

export default function Phase5NLE() {
  const [audioUrl, setAudioUrl] = useState('')
  const [lengthSec, setLengthSec] = useState(60)
  const [strips, setStrips] = useState<Strip[]>([
    { id: 's1', startSec: 0, durationSec: 8 },
    { id: 's2', startSec: 8, durationSec: 8 }
  ])

  const trim = (id: string, delta: number) => {
    setStrips(prev => prev.map(s => s.id===id ? { ...s, durationSec: Math.max(1, s.durationSec + delta) } : s))
  }

  const exportFinal = async () => {
    // TODO: trigger assembly & export job
    alert('Export started (stub)')
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Phase 5: Assembly & Editing</h1>
      <div className="space-y-2">
        <div className="text-sm text-gray-600">Master Audio URL</div>
        <input value={audioUrl} onChange={e=>setAudioUrl(e.target.value)} className="w-full border rounded p-2" placeholder="https://.../audio.mp3" />
      </div>
      <div className="space-y-2">
        <div className="text-sm text-gray-600">Timeline</div>
        <div className="w-full h-2 bg-gray-200 rounded" />
        <div className="text-xs text-gray-500">Length: {lengthSec}s</div>
      </div>
      <div className="space-y-3">
        <div className="text-sm text-gray-600">Video Strips</div>
        <div className="space-y-2">
          {strips.map(s => (
            <div key={s.id} className="border rounded p-3 flex items-center justify-between">
              <div className="text-sm">{s.id} — start {s.startSec}s, duration {s.durationSec}s</div>
              <div className="flex gap-2">
                <button onClick={()=>trim(s.id, -1)} className="border rounded px-2 text-sm">-1s</button>
                <button onClick={()=>trim(s.id, +1)} className="border rounded px-2 text-sm">+1s</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={exportFinal} className="border rounded px-3 py-2">Export Final (MP4)</button>
    </div>
  )
}
