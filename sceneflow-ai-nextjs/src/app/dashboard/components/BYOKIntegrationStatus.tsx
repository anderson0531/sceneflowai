'use client'

import { motion } from 'framer-motion'
import { Key, CheckCircle, XCircle, AlertCircle, Settings, Plus, Zap, Shield, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function BYOKIntegrationStatus() {
  // Mock data for BYOK integrations
  const byokIntegrations = [
    {
      id: 'gemini-veo',
      name: 'Google Gemini Veo',
      status: 'active',
      description: 'AI video generation platform',
      lastUsed: '2 hours ago',
      apiKeyStatus: 'valid',
      creditsRemaining: 1250,
      tier: 'Pro'
    },
    {
      id: 'runway',
      name: 'Runway ML',
      status: 'active',
      description: 'Professional video editing AI',
      lastUsed: '1 day ago',
      apiKeyStatus: 'valid',
      creditsRemaining: 800,
      tier: 'Standard'
    },
    {
      id: 'openai-sora',
      name: 'OpenAI Sora',
      status: 'inactive',
      description: 'Text-to-video generation',
      lastUsed: 'Never',
      apiKeyStatus: 'missing',
      creditsRemaining: 0,
      tier: 'N/A'
    },
    {
      id: 'stability-ai',
      name: 'Stability AI',
      status: 'warning',
      description: 'Creative AI platform',
      lastUsed: '3 days ago',
      apiKeyStatus: 'expired',
      creditsRemaining: 150,
      tier: 'Basic'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'inactive':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/40'
      case 'inactive':
        return 'bg-red-500/20 text-red-300 border-red-500/40'
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
    }
  }

  const getApiKeyStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-500/20 text-green-300'
      case 'expired':
        return 'bg-red-500/20 text-red-300'
      case 'missing':
        return 'bg-gray-500/20 text-gray-300'
      default:
        return 'bg-gray-500/20 text-gray-300'
    }
  }

  const activeIntegrations = byokIntegrations.filter(i => i.status === 'active').length
  const totalIntegrations = byokIntegrations.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">BYOK Integrations</h2>
        <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
          <Key className="w-4 h-4 text-purple-400" />
        </div>
      </div>

      {/* Integration Status Overview */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-gray-300">Platform Status</span>
          </div>
          <span className="text-sm text-gray-400">{activeIntegrations}/{totalIntegrations} Active</span>
        </div>
        
        {/* Status Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
          <div 
            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${(activeIntegrations / totalIntegrations) * 100}%` }}
          ></div>
        </div>
        
        <p className="text-xs text-gray-400">
          {activeIntegrations === totalIntegrations 
            ? 'All platforms operational' 
            : `${totalIntegrations - activeIntegrations} platform${totalIntegrations - activeIntegrations !== 1 ? 's' : ''} need attention`
          }
        </p>
      </div>

      {/* Platform List */}
      <div className="space-y-3 mb-6">
        {byokIntegrations.map((integration) => (
          <div key={integration.id} className="p-3 bg-gray-900/30 rounded-lg border border-gray-700">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{integration.name}</div>
                  <div className="text-xs text-gray-400">{integration.description}</div>
                </div>
              </div>
              {getStatusIcon(integration.status)}
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Last used: {integration.lastUsed}</span>
              <span className={`px-2 py-1 rounded-full ${getApiKeyStatusColor(integration.apiKeyStatus)}`}>
                {integration.apiKeyStatus}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-gray-400">Credits: {integration.creditsRemaining.toLocaleString()}</span>
              <span className="text-gray-400">Tier: {integration.tier}</span>
            </div>
            
            {integration.status === 'active' ? (
              <Link href={`/dashboard/settings/byok/${integration.id}`}>
                <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </Link>
            ) : (
              <Link href={`/dashboard/settings/byok/${integration.id}`}>
                <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  <Key className="w-4 h-4 mr-2" />
                  Setup
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Add New Integration */}
      <Link href="/dashboard/settings/byok">
        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add BYOK Integration
        </Button>
      </Link>
      
      {/* Quick Actions */}
      <div className="mt-4 space-y-2">
        <Link href="/dashboard/settings/byok">
          <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
            <Settings className="w-4 h-4 mr-2" />
            Manage All Platforms
          </Button>
        </Link>
        <Link href="/dashboard/analytics/byok">
          <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
            <Zap className="w-4 h-4 mr-2" />
            Usage Analytics
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}
