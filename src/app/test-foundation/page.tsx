'use client'

import React from 'react'
import { FoundationTest } from '@/components/FoundationTest'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function TestFoundationPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>SceneFlow Foundation Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            This page tests the foundation components to ensure they're working correctly.
          </p>
          <FoundationTest />
        </CardContent>
      </Card>
    </div>
  )
}





