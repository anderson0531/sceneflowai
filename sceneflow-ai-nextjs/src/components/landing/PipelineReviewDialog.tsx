'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  href: string
  onClose: () => void
  closeLabel?: string
}

export function PipelineReviewDialog({
  open,
  title,
  href,
  onClose,
  closeLabel = 'Close',
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !href || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[70] bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <iframe
        key={href}
        src={href}
        title={title}
        className="h-full w-full border-0 bg-black"
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute end-3 top-3 z-10 rounded-full border border-white/20 bg-black/70 p-2 text-white shadow-lg hover:bg-black"
        aria-label={closeLabel}
      >
        <X className="h-5 w-5" />
      </button>
    </div>,
    document.body
  )
}
