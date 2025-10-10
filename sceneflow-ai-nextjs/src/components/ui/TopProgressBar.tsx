import React from 'react'

type TopProgressBarProps = {
  visible?: boolean
  progress?: number // 0-100
}

export function TopProgressBar({ visible = false, progress = 0 }: TopProgressBarProps) {
  if (!visible) return null

  const pct = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0))

  return (
    <div
      aria-live="polite"
      aria-label="Generation progress"
      className="fixed left-0 right-0 top-0 z-[100] h-1 bg-transparent shadow-[0_1px_6px_rgba(0,0,0,0.15)]"
    >
      <div
        className="h-full bg-gradient-to-r from-[#22c55e] via-[#06b6d4] to-[#60a5fa] transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default TopProgressBar


