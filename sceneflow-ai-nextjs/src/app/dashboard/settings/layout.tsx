import { AppMessagesProvider } from '@/components/i18n/AppMessagesProvider'
import { SettingsLayoutClient } from './SettingsLayoutClient'

/**
 * Server boundary that loads the Settings chrome catalog. The nav, which needs
 * the session and the current pathname, stays a client component underneath.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppMessagesProvider surfaces={['settings']}>
      <SettingsLayoutClient>{children}</SettingsLayoutClient>
    </AppMessagesProvider>
  )
}
