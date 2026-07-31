'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { LegalLinksNav } from '@/components/legal/LegalLinksNav'
import {
  LEGAL_ADDRESS,
  LEGAL_COMPANY_NAME,
  LEGAL_FOOTER_ADDRESS,
  LEGAL_SERVICE_NAME,
  LEGAL_SUPPORT_EMAIL,
  LEGAL_WEBSITE,
} from '@/config/legal/legalCopy'

type LegalPageChromeProps = {
  children: React.ReactNode
}

export function LegalPageChrome({ children }: LegalPageChromeProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="border-b border-gray-800 bg-gray-950/90">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <LegalLinksNav
            activeHref={pathname ?? undefined}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
            linkClassName="text-gray-400 hover:text-purple-300 transition-colors"
            activeLinkClassName="text-purple-300 font-medium"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {children}

        <footer className="mt-12 pt-8 border-t border-gray-800 space-y-4">
          <LegalLinksNav
            activeHref={pathname ?? undefined}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
            linkClassName="text-purple-400 hover:text-purple-300 transition-colors"
            activeLinkClassName="text-purple-300 font-semibold"
          />
          <p className="text-gray-400 text-sm">
            <strong className="text-gray-300">{LEGAL_COMPANY_NAME}</strong> operates {LEGAL_SERVICE_NAME}.
            <br />
            {LEGAL_ADDRESS}
            <br />
            Support:{' '}
            <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="text-purple-400 hover:text-purple-300">
              {LEGAL_SUPPORT_EMAIL}
            </a>
            <br />
            Website:{' '}
            <a href={LEGAL_WEBSITE} className="text-purple-400 hover:text-purple-300">
              {LEGAL_WEBSITE}
            </a>
          </p>
          <p className="text-gray-500 text-xs">{LEGAL_FOOTER_ADDRESS}</p>
        </footer>
      </div>
    </div>
  )
}
