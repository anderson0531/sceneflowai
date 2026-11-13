import React, { Suspense } from 'react'
import { ContinuityClientPortal } from '@/components/continuity/ContinuityClientPortal'

type Props = { params: Promise<{ token: string }> }

export default async function ShareContinuityPage({ params }: Props) {
  const { token } = await params
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ContinuityClientPortal token={token} />
    </Suspense>
  )
}
