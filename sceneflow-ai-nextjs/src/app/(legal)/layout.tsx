import { LegalPageChrome } from '@/components/legal/LegalPageChrome'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <LegalPageChrome>{children}</LegalPageChrome>
}
