import type { Metadata } from 'next'
import { LEGAL_COMPANY_NAME, LEGAL_SERVICE_NAME, LEGAL_WEBSITE } from '@/config/legal/legalCopy'

export type LegalPageId =
  | 'privacy'
  | 'terms'
  | 'trust-safety'
  | 'refunds'
  | 'contact'
  | 'legal'

export type LegalPageEntry = {
  id: LegalPageId
  href: `/${string}`
  title: string
  label: string
  description: string
}

export const LEGAL_PAGES: readonly LegalPageEntry[] = [
  {
    id: 'privacy',
    href: '/privacy',
    title: 'Privacy Policy',
    label: 'Privacy Policy',
    description: `How ${LEGAL_COMPANY_NAME} collects, uses, and protects your data when you use ${LEGAL_SERVICE_NAME}.`,
  },
  {
    id: 'terms',
    href: '/terms',
    title: 'Terms of Service',
    label: 'Terms of Service',
    description: `Terms governing your use of ${LEGAL_SERVICE_NAME}, operated by ${LEGAL_COMPANY_NAME}.`,
  },
  {
    id: 'trust-safety',
    href: '/trust-safety',
    title: 'Trust & Safety',
    label: 'Trust & Safety',
    description: `Responsible AI guardrails, content moderation, and enforcement policies for ${LEGAL_SERVICE_NAME}.`,
  },
  {
    id: 'refunds',
    href: '/refunds',
    title: 'Refund Policy',
    label: 'Refund Policy',
    description: `Refund eligibility, billing support, and cancellation terms for ${LEGAL_SERVICE_NAME} purchases.`,
  },
  {
    id: 'contact',
    href: '/contact',
    title: 'Contact Us',
    label: 'Contact Us',
    description: `Contact ${LEGAL_COMPANY_NAME} for support, trust and safety, abuse reports, and legal inquiries.`,
  },
] as const

export const LEGAL_HUB_PAGE: LegalPageEntry = {
  id: 'legal',
  href: '/legal',
  title: 'Legal',
  label: 'Legal',
  description: `Legal documents, policies, and contact information for ${LEGAL_SERVICE_NAME}.`,
}

export const LEGAL_SITEMAP_PATHS = ['/', ...LEGAL_PAGES.map((page) => page.href), LEGAL_HUB_PAGE.href] as const

export function getLegalPageByHref(pathname: string): LegalPageEntry | undefined {
  return LEGAL_PAGES.find((page) => page.href === pathname)
}

export function getLegalPageById(id: LegalPageId): LegalPageEntry {
  if (id === 'legal') return LEGAL_HUB_PAGE
  const page = LEGAL_PAGES.find((entry) => entry.id === id)
  if (!page) throw new Error(`Unknown legal page id: ${id}`)
  return page
}

export function buildLegalMetadata(page: LegalPageEntry): Metadata {
  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: page.href,
    },
    openGraph: {
      title: `${page.title} | ${LEGAL_SERVICE_NAME}`,
      description: page.description,
      url: `${LEGAL_WEBSITE}${page.href}`,
      siteName: LEGAL_SERVICE_NAME,
      type: 'website',
    },
  }
}
