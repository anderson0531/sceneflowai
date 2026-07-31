import type { Metadata } from 'next'
import Link from 'next/link'
import { buildLegalMetadata, LEGAL_HUB_PAGE, LEGAL_PAGES } from '@/config/legal/legalPages'
import { LEGAL_COMPANY_NAME, LEGAL_SERVICE_NAME } from '@/config/legal/legalCopy'

export const metadata: Metadata = buildLegalMetadata(LEGAL_HUB_PAGE)

export default function LegalHubPage() {
  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-2">{LEGAL_HUB_PAGE.title}</h1>
      <p className="text-gray-400 mb-8">
        Legal documents and contact information for {LEGAL_SERVICE_NAME}, operated by {LEGAL_COMPANY_NAME}.
      </p>

      <div className="space-y-4">
        {LEGAL_PAGES.map((page) => (
          <section
            key={page.href}
            className="bg-gray-800/40 border border-gray-700 rounded-xl p-6 hover:border-purple-500/40 transition-colors"
          >
            <h2 className="text-xl font-semibold text-white mb-2">
              <Link href={page.href} className="text-purple-400 hover:text-purple-300">
                {page.title}
              </Link>
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">{page.description}</p>
            <Link href={page.href} className="text-sm text-purple-400 hover:text-purple-300">
              Read {page.title} →
            </Link>
          </section>
        ))}
      </div>
    </>
  )
}
