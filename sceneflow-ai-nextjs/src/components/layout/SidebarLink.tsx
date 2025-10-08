import React from 'react'
import Link from 'next/link'

type Props = {
  href: string
  label: string
  active?: boolean
  blocked?: boolean
  byok?: boolean
  locked?: boolean
  onClick?: () => void
}

export function SidebarLink({ href, label, active, blocked, byok, locked, onClick }: Props) {
  const className = `block px-3 py-2 rounded ${active ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'} ${blocked ? 'opacity-60 cursor-not-allowed' : ''}`
  const content = (
    <span className="flex items-center gap-2">
      <span className="truncate">{label}</span>
      {byok && <span className="text-[10px] px-1 rounded bg-orange-500/20 text-orange-300">BYOK</span>}
      {locked && <span className="text-[10px] px-1 rounded bg-blue-500/20 text-blue-300">Locked</span>}
    </span>
  )
  if (blocked) {
    return (
      <span
        role="link"
        aria-disabled="true"
        className={className}
        tabIndex={-1}
        title={byok ? 'Bring Your Own Key required' : 'Complete earlier phases first'}
      >
        {content}
      </span>
    )
  }
  return (
    <Link href={href} className={className} onClick={onClick} aria-current={active ? 'page' : undefined}>
      {content}
    </Link>
  )
}
