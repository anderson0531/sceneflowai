import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/adminUtils'
import { CreditGrantCard } from '@/components/admin/CreditGrantCard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // Server-side admin check
  const session = await getServerSession(authOptions as any)
  
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect('/dashboard/settings')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">Admin Panel</h2>
        <p className="text-gray-400">
          Manage system functions, user credits, and administrative controls.
        </p>
      </div>

      {/* Admin Function Cards */}
      <div className="grid grid-cols-1 gap-6">
        <CreditGrantCard />
        
        {/* Future admin cards can be added here */}
        {/* Example:
        <CreditChargeCard />
        <UserManagementCard />
        <SystemSettingsCard />
        */}
      </div>
    </div>
  )
}

