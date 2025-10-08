'use client'

import React, { useState } from 'react'

export default function Phase1Treatment() {
  const [concept, setConcept] = useState('')
  const [treatments, setTreatments] = useState<string[]>([])
  const [selected, setSelected] = useState<number|null>(null)
  const [analysis, setAnalysis] = useState<string>('')

  const generate = async () => {
    // TODO: call cue/respond for multiple treatments
    setTreatments([
      'Treatment A - aligned to blueprint',
      'Treatment B - alternative angle'
    ])
  }

  const analyze = async (idx: number) => {
    setSelected(idx)
    // TODO: call continuity analysis API
    setAnalysis('Continuity OK. Minor style suggestions applied.')
  }

  const lock = async () => {
    if (selected == null) return
    // TODO: lock Phase 1 via API
    alert('Phase 1 locked')
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Phase 1: Ideation & Treatment</h1>
      <div className="space-y-2">
        <label className="text-sm text-gray-600">Episode Concept</label>
        <textarea value={concept} onChange={e=>setConcept(e.target.value)} className="w-full border rounded p-2" rows={4} />
        <button onClick={generate} className="border rounded px-3 py-2">Generate Treatments</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {treatments.map((t, i)=> (
          <div key={i} className={`border rounded p-4 ${selected===i?'ring-2 ring-blue-500':''}`}>
            <div className="text-sm whitespace-pre-wrap">{t}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={()=>analyze(i)} className="border rounded px-2 py-1 text-sm">Continuity Analysis</button>
            </div>
          </div>
        ))}
      </div>
      {selected!=null && (
        <div className="border rounded p-4">
          <div className="text-sm text-gray-600">Analysis</div>
          <div className="text-sm">{analysis}</div>
          <button onClick={lock} className="mt-3 border rounded px-3 py-2">Lock Treatment</button>
        </div>
      )}
    </div>
  )
}
