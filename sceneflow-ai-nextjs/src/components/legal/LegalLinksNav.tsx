import Link from 'next/link'
import { LEGAL_PAGES } from '@/config/legal/legalPages'

type LegalLinksNavProps = {
  activeHref?: string
  className?: string
  linkClassName?: string
  activeLinkClassName?: string
}

export function LegalLinksNav({
  activeHref,
  className = 'flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm',
  linkClassName = 'text-gray-400 hover:text-white transition-colors underline-offset-4 hover:underline',
  activeLinkClassName = 'text-purple-300 font-medium underline',
}: LegalLinksNavProps) {
  return (
    <nav aria-label="Trust & Safety" className={className}>
      {LEGAL_PAGES.map((page) => {
        const isActive = activeHref === page.href
        return (
          <Link
            key={page.href}
            href={page.href}
            className={isActive ? activeLinkClassName : linkClassName}
            aria-current={isActive ? 'page' : undefined}
          >
            {page.label}
          </Link>
        )
      })}
    </nav>
  )
}
