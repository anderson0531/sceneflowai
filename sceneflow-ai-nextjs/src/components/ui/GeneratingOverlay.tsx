import React from 'react'

type GeneratingOverlayProps = {
  visible?: boolean
  title?: string
  progress?: number // 0-100
  subtext?: string
}

export function GeneratingOverlay({ visible = false, title = 'Generating…', progress = 0, subtext }: GeneratingOverlayProps) {
  if (!visible) return null
  const pct = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0))

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
      <div className="w-[min(92vw,520px)] rounded-lg border border-gray-800 bg-gray-950/90 shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <svg className="w-5 h-5 text-sf-primary animate-spin" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
          </svg>
          <div className="text-base font-semibold text-gray-100">{title}</div>
        </div>
        {subtext ? <div className="text-sm text-gray-400 mb-4">{subtext}</div> : (
          <div className="text-sm text-gray-400 mb-4">This can take ~30–60 seconds depending on provider load.</div>
        )}
        <div className="h-2 w-full rounded bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded bg-gradient-to-r from-[#22c55e] via-[#06b6d4] to-[#60a5fa] transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 text-right text-xs text-gray-400" aria-live="polite">{pct}%</div>
      </div>
    </div>
  )
}

export default GeneratingOverlay


