import React from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'

export function Breadcrumbs() {
  const pathname = usePathname()
  const params = useParams() as any
  const seriesId = params?.seriesId
  const episodeId = params?.episodeId
  const phase = pathname?.match(/\/phase\/(\d+)/)?.[1]

  const parts: Array<{ label: string; href?: string }> = []
  if (seriesId) parts.push({ label: 'Series', href: `/series/${seriesId}/continuity` })
  if (episodeId) parts.push({ label: 'Episode', href: `/series/${seriesId}/episode/${episodeId}/phase/1` })
  if (phase) parts.push({ label: `Phase ${phase}` })

  if (parts.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-sm text-gray-400">
      {parts.map((p, idx) => (
        <span key={idx} className="inline-flex items-center gap-2">
          {idx > 0 && <span className="opacity-50">/</span>}
          {p.href ? (
            <Link href={p.href} className="hover:text-white">
              {p.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-gray-200">
              {p.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
