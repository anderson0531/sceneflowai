'use client'

import React, { useState } from 'react'
import { timingAnalysisService } from '@/lib/orchestration/TimingAnalysisService'

export default function Phase3Audio() {
  const [voiceCasting, setVoiceCasting] = useState<Record<string, { provider:string; voiceId:string }>>({
    Narrator: { provider: 'elevenlabs', voiceId: '' }
  })
  const [audioUrl, setAudioUrl] = useState('')
  const [shots, setShots] = useState<Array<{ id: string; text: string }>>([
    { id: 's1', text: 'Establishing of room.' },
    { id: 's2', text: 'Character delivers line.' }
  ])
  const [timing, setTiming] = useState<Array<{ shotId: string; startSec: number; durationSec: number }>>([])

  const analyze = async () => {
    const map = await timingAnalysisService.analyze(audioUrl, shots)
    setTiming(map)
  }

  const lock = async () => {
    // TODO: persist timing map & lock phase
    alert('Phase 3 locked')
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Phase 3: Audio Production & Timing Lock</h1>
      <div className="space-y-2">
        <div className="text-sm text-gray-600">Master Audio URL</div>
        <input value={audioUrl} onChange={e=>setAudioUrl(e.target.value)} className="w-full border rounded p-2" placeholder="https://.../audio.mp3" />
      </div>
      <div className="space-y-2">
        <div className="text-sm text-gray-600">Voice Casting</div>
        <div className="text-xs text-gray-500">Bind character names to provider voice IDs.</div>
        <div className="space-y-2">
          {Object.keys(voiceCasting).map(name => (
            <div key={name} className="flex gap-2 items-center">
              <div className="w-32 text-sm">{name}</div>
              <input value={voiceCasting[name].provider} onChange={e=> setVoiceCasting(prev=> ({ ...prev, [name]: { ...prev[name], provider: e.target.value } }))} className="border rounded p-1 text-sm" placeholder="provider" />
              <input value={voiceCasting[name].voiceId} onChange={e=> setVoiceCasting(prev=> ({ ...prev, [name]: { ...prev[name], voiceId: e.target.value } }))} className="border rounded p-1 text-sm" placeholder="voiceId" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <button onClick={analyze} className="border rounded px-3 py-2">Analyze Timing</button>
      </div>
      {timing.length>0 && (
        <div className="border rounded p-4">
          <div className="text-sm text-gray-600 mb-2">Timing Map</div>
          <div className="text-xs">
            {timing.map((t)=> (
              <div key={t.shotId}>{t.shotId}: start {t.startSec}s, duration {t.durationSec}s</div>
            ))}
          </div>
          <button onClick={lock} className="mt-3 border rounded px-3 py-2">Lock Timing</button>
        </div>
      )}
    </div>
  )
}
