'use client'

import React, { useState } from 'react'

type UpdateItem = {
  id: string
  type: 'character'|'location'|'aesthetic'|'episode-log'
  title: string
  summary: string
}

export default function ContinuityReview() {
  const [items, setItems] = useState<UpdateItem[]>([
    { id: 'u1', type: 'episode-log', title: 'Episode 3 Log Entry', summary: 'Add summary to episode log.' },
    { id: 'u2', type: 'aesthetic', title: 'New Visual Anchor', summary: 'Add still frame to anchors.' }
  ])

  const approve = (id: string) => {
    setItems(prev => prev.filter(i=>i.id!==id))
  }
  const reject = (id: string) => {
    setItems(prev => prev.filter(i=>i.id!==id))
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Phase 6: Continuity Updates</h1>
      <p className="text-gray-500">Review proposed updates to the Series Bible and approve or reject.</p>
      <div className="space-y-3">
        {items.length===0 && <div className="text-sm text-gray-500">No pending updates.</div>}
        {items.map(i => (
          <div key={i.id} className="border rounded p-4">
            <div className="text-sm font-medium">{i.title} <span className="text-xs text-gray-500">({i.type})</span></div>
            <div className="text-sm text-gray-600">{i.summary}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={()=>approve(i.id)} className="border rounded px-3 py-1.5 text-sm">Approve</button>
              <button onClick={()=>reject(i.id)} className="border rounded px-3 py-1.5 text-sm">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
