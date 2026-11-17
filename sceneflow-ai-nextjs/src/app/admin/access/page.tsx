import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { ShieldAlert } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/adminUtils'
import { AdminAccessControlClient } from '@/components/admin/AdminAccessControlClient'

export const dynamic = 'force-dynamic'

export default async function AdminAccessPage() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { email?: string | null }
  } | null

  if (!session?.user?.email) {
    redirect('/login?returnUrl=/admin/access')
  }

  if (!isAdminEmail(session.user.email)) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/35 bg-gray-900 p-8 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
          <h1 className="text-xl font-bold">Admin Access Required</h1>
          <p className="text-sm text-gray-400">
            Signed in as <strong className="text-gray-200">{session.user.email}</strong>, which is not authorized for the SceneFlow Admin Console.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/dashboard/settings/billing"
              className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Billing &amp; Access
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <AdminAccessControlClient adminEmail={session.user.email} />
}
