import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/adminUtils'
import { IntroductionAnimaticScriptView } from '@/components/admin/IntroductionAnimaticScriptView'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Introduction Animatic Script — SceneFlow Admin',
  robots: { index: false, follow: false },
}

export default async function IntroductionAnimaticScriptPage() {
  // Unreleased marketing copy — gate server-side rather than relying on obscurity.
  const session = await getServerSession(authOptions as any)
  const email = (session as { user?: { email?: string | null } } | null)?.user?.email

  if (!isAdminEmail(email)) {
    redirect('/dashboard')
  }

  return <IntroductionAnimaticScriptView />
}
