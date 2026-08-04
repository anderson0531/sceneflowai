import { AppMessagesProvider } from '@/components/i18n/AppMessagesProvider'
import { StudioLayoutClient } from './StudioLayoutClient'

/**
 * Server boundary that loads the Blueprint Studio chrome catalog. The resizable
 * panel layout stays a client component underneath.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppMessagesProvider surfaces={['blueprint']}>
      <StudioLayoutClient>{children}</StudioLayoutClient>
    </AppMessagesProvider>
  )
}
