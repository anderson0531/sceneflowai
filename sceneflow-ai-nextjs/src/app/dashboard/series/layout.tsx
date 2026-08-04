import { AppMessagesProvider } from '@/components/i18n/AppMessagesProvider'

export default function SeriesLayout({ children }: { children: React.ReactNode }) {
  return <AppMessagesProvider surfaces={['series']}>{children}</AppMessagesProvider>
}
