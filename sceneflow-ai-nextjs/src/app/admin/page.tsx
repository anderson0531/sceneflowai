import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { ArrowRight, Activity, Coins, FileText, ShieldAlert, ShieldCheck, Wrench } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/adminUtils'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { email?: string | null }
  } | null

  if (!session?.user?.email) {
    redirect('/login?returnUrl=/admin')
  }

  if (!isAdminEmail(session.user.email)) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/35 bg-gray-900 p-8 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
          <h1 className="text-xl font-bold">Admin Access Required</h1>
          <p className="text-sm text-gray-400">
            Signed in as <strong className="text-gray-200">{session.user.email}</strong>, which does not have administrator permissions.
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

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">SceneFlow Admin Console</h1>
            <p className="text-sm text-gray-400 mt-1">
              Signed in as <span className="text-cyan-400 font-medium">{session.user.email}</span>
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors self-start sm:self-auto"
          >
            Studio Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Primary Highlight Card: Pre-Launch Access & Credits */}
        <Link
          href="/admin/access"
          className="block rounded-2xl border border-emerald-500/45 bg-gradient-to-br from-emerald-950/35 via-gray-900 to-gray-900 p-6 transition-all hover:border-emerald-400/70 shadow-lg"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pre-Launch Gate Active • Whop Checkout Paused</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                Pre-Launch Access Requests &amp; User Credits Control
              </h2>
              <p className="text-sm text-gray-300 max-w-2xl">
                Review incoming Studio access requests, pre-approve user emails, grant or revoke workspace tiers, and set exact credit balances or top-ups for any user.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shrink-0">
              Manage Access &amp; Credits <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/dol/credits"
            className="rounded-xl border border-gray-800 p-5 bg-gray-900/70 transition-colors hover:border-cyan-500/40 hover:bg-gray-900"
          >
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <h2>Credit Economics &amp; Cost Telemetry</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Inspect model pricing, credit burn margins, and usage cost analytics.
            </p>
          </Link>

          <Link
            href="/admin/dol/production-health"
            className="rounded-xl border border-gray-800 p-5 bg-gray-900/70 transition-colors hover:border-cyan-500/40 hover:bg-gray-900"
          >
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h2>Production Health &amp; Monitoring</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Check AI generation pipeline health, video rendering status, and DOL metrics.
            </p>
          </Link>

          <Link
            href="/admin/diagnostics"
            className="rounded-xl border border-gray-800 p-5 bg-gray-900/70 transition-colors hover:border-cyan-500/40 hover:bg-gray-900"
          >
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <h2>System Diagnostics</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Verify environment configuration, storage connectivity, and API provider readiness.
            </p>
          </Link>

          <Link
            href="/admin/scripts/introduction-animatic"
            className="rounded-xl border border-gray-800 p-5 bg-gray-900/70 transition-colors hover:border-cyan-500/40 hover:bg-gray-900"
          >
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
              <FileText className="w-4 h-4 text-purple-400" />
              <h2>Introduction Animatic Script</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Beat-by-beat narration and frame prompts in six languages, with Google Docs export.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
