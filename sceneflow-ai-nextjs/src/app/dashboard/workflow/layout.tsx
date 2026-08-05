import { AppMessagesProvider } from '@/components/i18n/AppMessagesProvider'

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
  return <AppMessagesProvider surfaces={['production']}>{children}</AppMessagesProvider>
}
