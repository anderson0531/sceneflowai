'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function SetupDatabasePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSetup = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch('/api/setup/database', {
        method: 'POST'
      })

      const data = await response.json()
      setResult(data)

      if (!data.success) {
        setError(data.error || 'Setup failed')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Database Setup</h1>
          <p className="text-gray-400">
            Initialize your Supabase database by creating all required tables.
          </p>
          <p className="text-sm text-amber-300 mt-2">
            ⚠️ Run this once after deploying to a fresh database.
          </p>
        </div>

        {/* Setup Button */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Step 1: Initialize Database</h2>
          <p className="text-sm text-gray-400 mb-4">
            Click the button below to create all database tables (users, projects, collaboration tables, etc.)
          </p>
          
          <Button
            onClick={handleSetup}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Tables...
              </>
            ) : (
              <>
                Initialize Database
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className={`border rounded-lg p-6 ${result.success ? 'bg-emerald-900/20 border-emerald-800' : 'bg-red-900/20 border-red-800'}`}>
            <div className="flex items-center gap-2 mb-4">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <h3 className={`text-lg font-semibold ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.success ? 'Setup Successful!' : 'Setup Failed'}
              </h3>
            </div>

            {result.message && (
              <p className={`text-sm mb-4 ${result.success ? 'text-emerald-200' : 'text-red-200'}`}>
                {result.message}
              </p>
            )}

            {result.logs && result.logs.length > 0 && (
              <div className="bg-gray-950 border border-gray-800 rounded p-4 max-h-96 overflow-y-auto">
                <div className="text-xs font-mono space-y-1">
                  {result.logs.map((log: string, i: number) => (
                    <div
                      key={i}
                      className={`
                        ${log.includes('✅') ? 'text-emerald-400' : ''}
                        ${log.includes('❌') ? 'text-red-400' : ''}
                        ${log.includes('🔧') || log.includes('🎉') ? 'text-blue-400 font-semibold' : ''}
                        ${!log.includes('✅') && !log.includes('❌') && !log.includes('🔧') && !log.includes('🎉') ? 'text-gray-400' : ''}
                      `}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.success && (
              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800 rounded">
                <p className="text-sm text-blue-200">
                  ✨ <strong>Next step:</strong> Go to the dashboard and try creating a project!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && !result && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-400" />
              <h3 className="text-lg font-semibold text-red-300">Error</h3>
            </div>
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">What This Does</h3>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>• Creates all database tables in your Supabase database</li>
            <li>• Sets up proper relationships and foreign keys</li>
            <li>• Safe to run multiple times (won't drop existing data)</li>
            <li>• Takes about 5-10 seconds to complete</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-3">After Setup</h3>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>• Navigate to <a href="/dashboard/studio/new-project" className="text-blue-400 hover:underline">/dashboard/studio/new-project</a></li>
            <li>• Create your first project from a Film Treatment</li>
            <li>• All features should work normally</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

