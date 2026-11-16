import type { Metadata } from 'next'
import { isCharterWhopPlanConfigured } from '@/lib/billing/tierCatalog'
import { FoundingOperatorsClient } from '@/components/landing/FoundingOperatorsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Founding Video Service Operator Charter | SceneFlow Studio',
  description:
    'Launch a high-margin White-Label Video Memoir, Real Estate Tour, or Corporate Training studio with 90 days of SceneFlow Pro + 18,000 production credits.',
}

export default function FoundingOperatorsPage() {
  const charterPlanConfigured = isCharterWhopPlanConfigured('founding_operator')
  return <FoundingOperatorsClient charterPlanConfigured={charterPlanConfigured} />
}
