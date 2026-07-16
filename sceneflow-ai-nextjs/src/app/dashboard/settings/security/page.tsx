'use client'
export const dynamic = 'force-dynamic'

import { Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductEmptyState } from '@/components/product'

export default function SecurityPage() {
  return (
    <Card className="border-gray-700/60 bg-gray-800/60 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5 text-sf-primary" />
          Security
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ProductEmptyState
          icon={<Shield className="h-8 w-8 text-gray-500" />}
          title="Security settings coming soon"
          description="Password management, two-factor authentication, and session controls are being rebuilt."
          accent="product"
        />
      </CardContent>
    </Card>
  )
}
