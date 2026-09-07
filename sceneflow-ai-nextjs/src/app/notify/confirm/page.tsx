import Link from 'next/link'
import type { Metadata } from 'next'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { NOTIFY_COPY } from '@/config/landing/valuePropCopy'
import { confirmWaitlistEmail, type ConfirmWaitlistResult } from '@/lib/email/waitlistConfirm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Confirm your SceneFlow launch email',
  robots: { index: false, follow: false },
}

type ConfirmPageProps = {
  searchParams: Promise<{ email?: string; token?: string; exp?: string }>
}

function copyFor(result: ConfirmWaitlistResult): { title: string; body: string; ok: boolean } {
  if (result === 'confirmed' || result === 'already') {
    return { title: NOTIFY_COPY.confirmTitle, body: NOTIFY_COPY.confirmBody, ok: true }
  }
  if (result === 'expired') {
    return {
      title: NOTIFY_COPY.confirmExpiredTitle,
      body: NOTIFY_COPY.confirmExpiredBody,
      ok: false,
    }
  }
  return {
    title: NOTIFY_COPY.confirmInvalidTitle,
    body: NOTIFY_COPY.confirmInvalidBody,
    ok: false,
  }
}

export default async function NotifyConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams
  const email = typeof params.email === 'string' ? params.email : ''
  const token = typeof params.token === 'string' ? params.token : ''
  const exp = typeof params.exp === 'string' ? params.exp : ''

  const result: ConfirmWaitlistResult =
    email && token && exp ? await confirmWaitlistEmail(email, token, exp) : 'invalid'
  const copy = copyFor(result)
  const Icon = copy.ok ? CheckCircle2 : AlertCircle

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 px-4 py-16 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center shadow-xl shadow-slate-950/40">
        <Icon
          className={`mx-auto mb-4 h-10 w-10 ${copy.ok ? 'text-emerald-400' : 'text-amber-400'}`}
          aria-hidden
        />
        <h1 className="text-2xl font-bold md:text-3xl">{copy.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400 md:text-base">{copy.body}</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-gradient-to-r from-cyan-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {NOTIFY_COPY.confirmHome}
        </Link>
      </div>
    </div>
  )
}
