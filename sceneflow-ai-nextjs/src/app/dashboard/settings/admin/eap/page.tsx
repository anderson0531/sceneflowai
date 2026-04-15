import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/adminUtils'
import { EapAdminManager } from '@/components/admin/EapAdminManager'

export const dynamic = 'force-dynamic'

export default async function EapAdminPage() {
  const session = await getServerSession(authOptions as any)
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect('/dashboard/settings')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">EAP Admin</h2>
        <p className="text-gray-400">
          Full review workflow for Early Access applications.
        </p>
      </div>
      <EapAdminManager />
    </div>
  )
}
