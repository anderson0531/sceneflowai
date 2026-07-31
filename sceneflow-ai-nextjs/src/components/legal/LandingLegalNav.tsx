import Link from 'next/link'
import { LEGAL_HUB_PAGE, LEGAL_PAGES } from '@/config/legal/legalPages'

export function LandingLegalNav() {
  return (
    <nav
      aria-label="Legal policies and contact"
      className="border-b border-gray-800 bg-gray-950/95 text-center px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
        {LEGAL_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="text-gray-400 hover:text-purple-300 transition-colors underline-offset-4 hover:underline"
          >
            {page.label}
          </Link>
        ))}
        <Link
          href={LEGAL_HUB_PAGE.href}
          className="text-gray-500 hover:text-purple-300 transition-colors underline-offset-4 hover:underline"
        >
          {LEGAL_HUB_PAGE.label}
        </Link>
      </div>
    </nav>
  )
}
