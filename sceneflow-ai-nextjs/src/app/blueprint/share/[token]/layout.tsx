import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blueprint Review | SceneFlow',
  description: 'Review a shared story blueprint and leave structured feedback.',
}

export default function BlueprintShareLayout({ children }: { children: React.ReactNode }) {
  return children
}
