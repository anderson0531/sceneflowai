import React, { Suspense } from 'react'
import { ClientIntakeExperience } from '@/components/intake/ClientIntakeExperience'

type Props = { params: Promise<{ token: string }> }

export default async function EmbedClientIntakePage({ params }: Props) {
  const { token } = await params
  return (
    <Suspense fallback={<div className="min-h-[600px] bg-slate-950" />}>
      <ClientIntakeExperience token={token} embedded={true} />
    </Suspense>
  )
}
