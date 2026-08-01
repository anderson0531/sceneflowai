import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import {
  LEGAL_HUB_PAGE,
  LEGAL_PAGES,
  LEGAL_SITEMAP_PATHS,
} from '@/config/legal/legalPages'

describe('legal page discoverability', () => {
  it('registers all required policy routes', () => {
    const hrefs = LEGAL_PAGES.map((page) => page.href)
    expect(hrefs).toEqual([
      '/privacy',
      '/terms',
      '/trust-safety',
      '/refunds',
      '/contact',
    ])
  })

  it('includes legal routes in sitemap config', () => {
    expect(LEGAL_SITEMAP_PATHS).toContain('/')
    expect(LEGAL_SITEMAP_PATHS).toContain('/privacy')
    expect(LEGAL_SITEMAP_PATHS).toContain('/terms')
    expect(LEGAL_SITEMAP_PATHS).toContain('/trust-safety')
    expect(LEGAL_SITEMAP_PATHS).toContain('/refunds')
    expect(LEGAL_SITEMAP_PATHS).toContain('/contact')
    expect(LEGAL_SITEMAP_PATHS).toContain(LEGAL_HUB_PAGE.href)
  })

  it('renders server-side legal links on the landing page', () => {
    const landingPage = readFileSync(
      join(process.cwd(), 'src/app/page.tsx'),
      'utf8'
    )
    expect(landingPage).toContain('LandingLegalNav')
  })

  it('exposes English policy labels in landing legal nav', () => {
    expect(LEGAL_HUB_PAGE.label).toBe('Trust & Safety')
    expect(LEGAL_HUB_PAGE.title).toBe('Trust & Safety')

    const labels = LEGAL_PAGES.map((page) => page.label)
    expect(labels).toContain('Privacy Policy')
    expect(labels).toContain('Terms of Service')
    expect(labels).toContain('Trust & Safety')
    expect(labels).toContain('Refund Policy')
    expect(labels).toContain('Contact Us')

    const landingNav = readFileSync(
      join(process.cwd(), 'src/components/legal/LandingLegalNav.tsx'),
      'utf8'
    )
    expect(landingNav).toContain('LEGAL_PAGES')
    expect(landingNav).toContain('aria-label="Trust & Safety policies and contact"')
  })

  it('wraps legal pages with shared chrome and nav', () => {
    const legalLayout = readFileSync(
      join(process.cwd(), 'src/app/(legal)/layout.tsx'),
      'utf8'
    )
    expect(legalLayout).toContain('LegalPageChrome')
  })

  it('exports page metadata from legal routes', () => {
    for (const page of ['privacy', 'terms', 'trust-safety', 'refunds', 'contact']) {
      const content = readFileSync(
        join(process.cwd(), `src/app/(legal)/${page}/page.tsx`),
        'utf8'
      )
      expect(content).toContain('export const metadata')
      expect(content).not.toContain("'use client'")
    }
  })

  it('defines sitemap and robots routes', () => {
    expect(readFileSync(join(process.cwd(), 'src/app/sitemap.ts'), 'utf8')).toContain(
      'LEGAL_SITEMAP_PATHS'
    )
    expect(readFileSync(join(process.cwd(), 'src/app/robots.ts'), 'utf8')).toContain(
      'sitemap.xml'
    )
  })

  it('redirects legacy sfai.studio hostnames to sceneflowai.studio', () => {
    const nextConfig = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8')
    expect(nextConfig).toContain("value: \"sfai.studio\"")
    expect(nextConfig).toContain("value: \"www.sfai.studio\"")
    expect(nextConfig).toContain('https://sceneflowai.studio/:path*')
    expect(nextConfig).toContain('permanent: true')
  })
})
