'use server'

import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

function isAdmin(email: string | null | undefined): boolean {
  const list = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return !!(email && list.includes(email.toLowerCase()))
}

export default async function AdminPage() {
  // Temporarily allow access to admin page without restriction

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-6 text-sf-text-primary">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-xl border border-sf-border p-4 bg-sf-surface">
          <h2 className="font-semibold mb-2">Pricing</h2>
          <p className="text-sf-text-secondary text-sm">Manage OpenAI pricing rows in `ai_pricing`.</p>
        </section>
        <section className="rounded-xl border border-sf-border p-4 bg-sf-surface">
          <h2 className="font-semibold mb-2">Credits</h2>
          <p className="text-sf-text-secondary text-sm">View credit ledger, grant credits, and refunds.</p>
        </section>
        <section className="rounded-xl border border-sf-border p-4 bg-sf-surface">
          <h2 className="font-semibold mb-2">Usage</h2>
          <p className="text-sf-text-secondary text-sm">Inspect AI usage logs and recent requests.</p>
        </section>
        <section className="rounded-xl border border-sf-border p-4 bg-sf-surface">
          <h2 className="font-semibold mb-2">Users</h2>
          <p className="text-sf-text-secondary text-sm">Search users and adjust balances.</p>
        </section>
      </div>
    </div>
  ) as any
}


