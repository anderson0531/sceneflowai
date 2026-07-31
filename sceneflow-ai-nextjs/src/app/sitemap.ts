import type { MetadataRoute } from 'next'
import { LEGAL_SITEMAP_PATHS } from '@/config/legal/legalPages'

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^\/+/, '')}`
  return 'https://sceneflowai.studio'
}

const SITE_URL = resolveSiteUrl()

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return LEGAL_SITEMAP_PATHS.map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
