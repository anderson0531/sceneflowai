import React, { useState } from 'react'
import { trackCta } from '@/lib/analytics'

export function GuidanceRail({ onInsert }: { onInsert: (text: string) => void }) {
  const [open, setOpen] = useState(true)
  const examples = [
    { id: 'ex1', text: '60s brand launch for eco water bottle; urban outdoors; confident, modern tone.' },
    { id: 'ex2', text: '90s founder profile; office + workshop; hopeful tone; include 3 chapter beats.' },
    { id: 'ex3', text: '30s recipe how-to; overhead shots; upbeat; end with CTA to subscribe.' },
  ]

  const insert = (e: { id: string; text: string }) => {
    onInsert(e.text)
    trackCta({ event: 'blueprint_example_inserted', label: e.id })
  }

  return (
    <aside className="hidden lg:block space-y-2">
      <button className="text-xs text-gray-400 hover:text-gray-200" onClick={() => { setOpen(!open); trackCta({ event: 'guidance_toggled', value: open ? 0 : 1 }) }}>
        {open ? 'Hide Guidance' : 'Show Guidance'}
      </button>
      {open && (
        <div className="space-y-2">
          <div className="text-sm text-gray-300 font-semibold">Examples</div>
          {examples.map((e) => (
            <button key={e.id} onClick={() => insert(e)} className="w-full text-left text-sm px-2 py-2 rounded border border-gray-700 text-gray-300 hover:bg-gray-800">
              {e.text}
            </button>
          ))}
          <div className="text-sm text-gray-300 font-semibold pt-2">Tips</div>
          <ul className="text-sm text-gray-400 list-disc pl-5 space-y-1">
            <li>Specify runtime, audience, tone, locations, and characters.</li>
            <li>Include brand, product, or visual style references.</li>
          </ul>
        </div>
      )}
    </aside>
  )
}



