'use client'

import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { CreditCard, Plus, Download, Calendar, Zap } from 'lucide-react'

export default function BillingSettingsPage() {
  const { user } = useStore()

  const creditHistory = [
    { date: '2024-01-20', amount: 500, type: 'purchase', description: 'Credit Package Purchase' },
    { date: '2024-01-15', amount: -50, type: 'usage', description: 'Video Generation' },
    { date: '2024-01-10', amount: -25, type: 'usage', description: 'Image Generation' },
    { date: '2024-01-05', amount: 1000, type: 'monthly', description: 'Monthly Credit Allocation' },
  ]

  const getCreditTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'text-green-600 bg-green-100'
      case 'usage':
        return 'text-red-600 bg-red-100'
      case 'monthly':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getCreditTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'Purchase'
      case 'usage':
        return 'Usage'
      case 'monthly':
        return 'Monthly'
      default:
        return 'Other'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Credits</h1>
        <p className="text-gray-600">
          Manage your subscription, credits, and billing information
        </p>
      </div>

      {/* Current Credit Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5" />
            Current Credit Balance
          </CardTitle>
          <CardDescription>
            Your available credits and usage information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {user?.credits?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-600">Available Credits</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {user?.monthlyCredits?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-600">Monthly Allocation</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {((user?.credits || 0) / (user?.monthlyCredits || 1) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Credit Usage</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Subscription Details
          </CardTitle>
          <CardDescription>
            Your current plan and billing cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Plan
              </label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900 capitalize">
                  {user?.subscriptionTier || 'Free'} Plan
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Cycle
              </label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">Monthly</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Credit History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Credit History
          </CardTitle>
          <CardDescription>
            Recent credit transactions and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {creditHistory.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${getCreditTypeColor(transaction.type)}`}>
                    {getCreditTypeLabel(transaction.type)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{transaction.description}</div>
                    <div className="text-sm text-gray-600">{transaction.date}</div>
                  </div>
                </div>
                <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Full History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Quick Actions</CardTitle>
          <CardDescription className="text-blue-700">
            Common billing and credit actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Buy More Credits
            </Button>
            <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              <CreditCard className="mr-2 h-4 w-4" />
              Update Payment Method
            </Button>
            <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              <Download className="mr-2 h-4 w-4" />
              Download Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
