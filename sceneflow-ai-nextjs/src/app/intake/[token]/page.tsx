import React, { Suspense } from 'react'
import { ClientIntakeExperience } from '@/components/intake/ClientIntakeExperience'

type Props = { params: Promise<{ token: string }> }

export default async function ClientIntakePage({ params }: Props) {
  const { token } = await params
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ClientIntakeExperience token={token} embedded={false} />
    </Suspense>
  )
}
