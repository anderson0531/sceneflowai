import React, { Suspense } from 'react'
import { ShowcaseOrderStatusClient } from '@/components/showcase/ShowcaseOrderStatusClient'

type PageProps = {
  params: Promise<{ orderId: string }>
}

export default async function ShowcaseOrderStatusPage({ params }: PageProps) {
  const { orderId } = await params
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06080E] flex items-center justify-center text-slate-300 text-sm">
          Loading your Keepsake Cinema order...
        </div>
      }
    >
      <ShowcaseOrderStatusClient orderId={orderId} />
    </Suspense>
  )
}
