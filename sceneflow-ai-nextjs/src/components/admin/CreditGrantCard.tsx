'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Coins, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface GrantResult {
  success: boolean
  message?: string
  data?: {
    userId: string
    creditsGranted: number
    previousBalance: number
    newBalance: number
    addonCredits: number
  }
  error?: string
}

export function CreditGrantCard() {
  const [userIdOrEmail, setUserIdOrEmail] = useState('')
  const [credits, setCredits] = useState<string>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GrantResult | null>(null)

  const quickAmounts = [
    { label: '1M', value: 1000000 },
    { label: '100K', value: 100000 },
    { label: '10K', value: 10000 },
    { label: '1K', value: 1000 },
  ]

  const handleQuickAmount = (amount: number) => {
    setCredits(amount.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const creditsNum = parseInt(credits, 10)
      if (isNaN(creditsNum) || creditsNum <= 0) {
        setResult({
          success: false,
          error: 'Please enter a valid positive number of credits'
        })
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/credits/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIdOrEmail,
          credits: creditsNum,
          reason: reason || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.message,
          data: data.data,
        })
        // Reset form on success
        setUserIdOrEmail('')
        setCredits('')
        setReason('')
      } else {
        setResult({
          success: false,
          error: data.message || data.error || 'Failed to grant credits',
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'An unexpected error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-dark-card rounded-xl border border-dark-border p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
          <Coins className="w-5 h-5 text-sf-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Grant Credits</h3>
          <p className="text-sm text-gray-400">Add credits to any user account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User ID or Email */}
        <div>
          <label htmlFor="userIdOrEmail" className="block text-sm font-medium text-gray-300 mb-2">
            User ID or Email
          </label>
          <input
            id="userIdOrEmail"
            type="text"
            value={userIdOrEmail}
            onChange={(e) => setUserIdOrEmail(e.target.value)}
            placeholder="user@example.com or UUID"
            required
            className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sf-primary focus:border-transparent"
          />
        </div>

        {/* Credits Amount */}
        <div>
          <label htmlFor="credits" className="block text-sm font-medium text-gray-300 mb-2">
            Credits Amount
          </label>
          <input
            id="credits"
            type="number"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            placeholder="1000000"
            required
            min="1"
            className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sf-primary focus:border-transparent"
          />
          
          {/* Quick Amount Buttons */}
          <div className="flex gap-2 mt-2">
            {quickAmounts.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleQuickAmount(value)}
                className="px-3 py-1 text-xs bg-dark-bg border border-dark-border rounded-lg text-gray-300 hover:bg-sf-primary/20 hover:border-sf-primary hover:text-sf-primary transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Reason (Optional) */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-2">
            Reason <span className="text-gray-500">(optional)</span>
          </label>
          <input
            id="reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Admin grant, testing, etc."
            className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sf-primary focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-sf-primary hover:bg-sf-accent text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Granting Credits...
            </>
          ) : (
            <>
              <Coins className="w-4 h-4 mr-2" />
              Grant Credits
            </>
          )}
        </Button>
      </form>

      {/* Result Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-4 rounded-lg border ${
            result.success
              ? 'bg-green-900/20 border-green-500/50'
              : 'bg-red-900/20 border-red-500/50'
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              {result.success ? (
                <>
                  <p className="text-green-400 font-medium">{result.message}</p>
                  {result.data && (
                    <div className="mt-2 text-sm text-gray-300 space-y-1">
                      <p>User: {result.data.userId}</p>
                      <p>Credits Granted: {result.data.creditsGranted.toLocaleString()}</p>
                      <p>Previous Balance: {result.data.previousBalance.toLocaleString()}</p>
                      <p className="text-green-400 font-medium">
                        New Balance: {result.data.newBalance.toLocaleString()}
                      </p>
                      <p>Addon Credits: {result.data.addonCredits.toLocaleString()}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-red-400">{result.error || 'Failed to grant credits'}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

