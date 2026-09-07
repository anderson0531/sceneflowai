import Link from 'next/link'
import type { Metadata } from 'next'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { NOTIFY_COPY } from '@/config/landing/valuePropCopy'
import {
  unsubscribeWaitlistEmail,
  type UnsubscribeWaitlistResult,
} from '@/lib/email/waitlistConfirm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Unsubscribe from SceneFlow launch emails',
  robots: { index: false, follow: false },
}

type UnsubscribePageProps = {
  searchParams: Promise<{ email?: string; token?: string }>
}

function copyFor(result: UnsubscribeWaitlistResult): { title: string; body: string; ok: boolean } {
  if (result === 'unsubscribed' || result === 'already') {
    return {
      title: 'You’re unsubscribed.',
      body: 'We will not send SceneFlow November launch emails to this address. You can sign up again from the landing page if you change your mind.',
      ok: true,
    }
  }
  return {
    title: 'That link isn’t valid.',
    body: 'Use the unsubscribe link from a recent SceneFlow email, or write support@sceneflowai.studio.',
    ok: false,
  }
}

export default async function NotifyUnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams
  const email = typeof params.email === 'string' ? params.email : ''
  const token = typeof params.token === 'string' ? params.token : ''
  const result: UnsubscribeWaitlistResult =
    email && token ? await unsubscribeWaitlistEmail(email, token) : 'invalid'
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
