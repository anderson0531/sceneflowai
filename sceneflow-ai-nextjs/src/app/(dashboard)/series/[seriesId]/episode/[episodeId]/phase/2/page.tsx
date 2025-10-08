'use client'

import React, { useState } from 'react'
import { continuityService } from '@/lib/orchestration/ContinuityService'

export default function Phase2VisualScript() {
  const [script, setScript] = useState('INT. ROOM - DAY\nA character speaks...')
  const [shots, setShots] = useState<Array<{ id:string; text:string; keyframeUrl?:string; vdp?:string }>>([
    { id: 's1', text: 'Establishing of room.' },
    { id: 's2', text: 'Character delivers line.' }
  ])

  const inject = async () => {
    const series = await continuityService.getSeries('series-1')
    const enhanced = continuityService.enhanceVDP(series, shots.map(s=>({ id: s.id, text: s.text })))
    setShots(shots.map(s=> ({ ...s, vdp: enhanced.find(e=>e.id===s.id)?.vdp })))
  }

  const lock = async () => {
    // TODO: persist Visual Script & lock phase
    alert('Phase 2 locked')
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Phase 2: Script & Visualization</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="text-sm text-gray-600">Script</div>
          <textarea value={script} onChange={e=>setScript(e.target.value)} className="w-full border rounded p-2 min-h-[300px]" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Shots</div>
            <button onClick={inject} className="border rounded px-3 py-1.5 text-sm">Inject Continuity</button>
          </div>
          <div className="space-y-3">
            {shots.map(s=> (
              <div key={s.id} className="border rounded p-3">
                <div className="text-sm font-medium">{s.text}</div>
                {s.vdp && <div className="text-xs text-gray-600 whitespace-pre-wrap mt-1">{s.vdp}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <button onClick={lock} className="border rounded px-3 py-2">Lock Visual Script</button>
    </div>
  )
}
