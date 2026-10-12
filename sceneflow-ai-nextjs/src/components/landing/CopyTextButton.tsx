'use client'

import { useState } from 'react'

export function CopyTextButton({
  text,
  label,
  copiedLabel = 'Copied',
  className = '',
}: {
  text: string
  label: string
  copiedLabel?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 2000)
        })
      }}
      className={`rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs font-semibold text-white transition-colors hover:border-cyan-400/50 hover:text-cyan-200 ${className}`}
    >
      {copied ? copiedLabel : label}
    </button>
  )
}
