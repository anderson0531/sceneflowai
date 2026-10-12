'use client'

import { useState } from 'react'
import { CopyTextButton } from '@/components/landing/CopyTextButton'
import {
  formatHeroVideoScript,
  getHeroSectionScript,
  type HeroVideoScript,
} from '@/config/landing/heroSectionScripts'

export function HeroScriptDialog({ scriptId }: { scriptId: HeroVideoScript['id'] }) {
  const script = getHeroSectionScript(scriptId)
  const [open, setOpen] = useState(false)
  const text = formatHeroVideoScript(script)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm font-semibold text-cyan-200 underline-offset-4 hover:underline"
      >
        Copy script
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`hero-script-${script.id}`}
        >
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <h3 id={`hero-script-${script.id}`} className="text-sm font-semibold text-white">
                {script.eyebrow}
              </h3>
              <div className="flex items-center gap-2">
                <CopyTextButton text={text} label="Copy script" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-gray-300 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto px-4 py-4 text-sm text-gray-200">
              {script.beats.map((beat, index) => (
                <section key={beat.label}>
                  <p className="font-semibold text-white">
                    {index + 1}. {beat.label}
                  </p>
                  <p className="mt-1">
                    <span className="text-gray-400">Narration: </span>
                    {beat.narration}
                  </p>
                  <p className="mt-1">
                    <span className="text-gray-400">Picture: </span>
                    {beat.picture}
                  </p>
                  <p className="mt-1">
                    <span className="text-gray-400">Settle on: </span>
                    {beat.settle}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
