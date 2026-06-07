import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export async function headers() {
  return {
    'Content-Security-Policy': 'frame-ancestors *',
  }
}

export default function PreVisEmbedLayout({ children }: { children: React.ReactNode }) {
  return children
}
