'use client'

import { motion } from 'framer-motion'
import { Key, CheckCircle, XCircle, AlertCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function BYOKIntegrationStatus() {
  // Mock data - replace with real backend data
  const byokIntegrations = [
    {
      id: 'gemini-veo',
      name: 'Gemini Veo',
      status: 'active',
      description: 'Google\'s video AI platform',
      lastUsed: '2 hours ago'
    },
    {
      id: 'runway',
      name: 'Runway',
      status: 'active',
      description: 'Creative AI video generation',
      lastUsed: '1 day ago'
    },
    {
      id: 'openai-sora',
      name: 'OpenAI Sora',
      status: 'inactive',
      description: 'Advanced video AI (requires setup)',
      lastUsed: 'Never'
    },
    {
      id: 'stability-ai',
      name: 'Stability AI',
      status: 'pending',
      description: 'Creative AI tools (pending approval)',
      lastUsed: 'Never'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'inactive':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/40'
      case 'inactive':
        return 'bg-red-500/20 text-red-300 border-red-500/40'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
    }
  }

  const activeCount = byokIntegrations.filter(i => i.status === 'active').length
  const totalCount = byokIntegrations.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/60 to-gray-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">BYOK Integrations</h3>
              <p className="text-sm text-gray-400">{activeCount}/{totalCount} Active</p>
            </div>
          </div>
          <Link href="/dashboard/settings/byok">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {byokIntegrations.map((integration) => (
          <div key={integration.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(integration.status)}
                  <span className="text-sm font-medium text-white">{integration.name}</span>
                </div>
                <p className="text-xs text-gray-400">{integration.description}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(integration.status)}`}>
                {integration.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Last used: {integration.lastUsed}</span>
              {integration.status === 'inactive' && (
                <Link href="/dashboard/settings/byok">
                  <Button size="sm" variant="outline" className="text-xs border-orange-500/50 text-orange-300 hover:text-white hover:border-orange-400/70">
                    Setup
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}

        {/* Add New Integration */}
        <div className="mt-6">
          <Link href="/dashboard/settings/byok">
            <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
              <Key className="w-4 h-4 mr-2" />
              Add BYOK Integration
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
