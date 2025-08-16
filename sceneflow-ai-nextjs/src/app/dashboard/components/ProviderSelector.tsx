'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Loader2, Settings } from 'lucide-react'
import { AIProvider } from '@/services/ai-providers/BaseAIProviderAdapter'

interface ProviderConfig {
  provider: AIProvider
  displayName: string
  description: string
  icon: string
  isConnected: boolean
  isConfigured: boolean
  capabilities: any
  lastTested: string | null
  status: 'connected' | 'disconnected' | 'not_configured'
}

interface ProviderSelectorProps {
  selectedProvider: AIProvider | null
  onProviderSelect: (provider: AIProvider) => void
  onConfigureProvider?: () => void
  className?: string
  disabled?: boolean
}

export default function ProviderSelector({
  selectedProvider,
  onProviderSelect,
  onConfigureProvider,
  className = '',
  disabled = false
}: ProviderSelectorProps) {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load providers on component mount
  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/settings/providers', {
        headers: {
          'x-user-id': 'demo_user_001' // In production, get from auth context
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProviders(data.data || [])
      } else {
        setError('Failed to load providers')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getProviderDisplayName = (provider: AIProvider): string => {
    const names = {
      [AIProvider.GOOGLE_VEO]: 'Google Veo',
      [AIProvider.RUNWAY]: 'Runway ML',
      [AIProvider.STABILITY_AI]: 'Stability AI'
    }
    return names[provider] || provider
  }

  const getProviderIcon = (provider: AIProvider): string => {
    const icons = {
      [AIProvider.GOOGLE_VEO]: '🎬',
      [AIProvider.RUNWAY]: '🎭',
      [AIProvider.STABILITY_AI]: '⚡'
    }
    return icons[provider] || '🤖'
  }

  const getSelectedProviderConfig = (): ProviderConfig | null => {
    if (!selectedProvider) return null
    return providers.find(p => p.provider === selectedProvider) || null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600'
      case 'disconnected':
        return 'text-red-600'
      case 'not_configured':
        return 'text-gray-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'disconnected':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'not_configured':
        return <AlertCircle className="w-4 h-4 text-gray-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const handleProviderSelect = (provider: AIProvider) => {
    onProviderSelect(provider)
    setIsOpen(false)
  }

  const connectedProviders = providers.filter(p => p.status === 'connected')
  const selectedConfig = getSelectedProviderConfig()

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        <span className="text-gray-500">Loading providers...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
        <button
          onClick={loadProviders}
          className="text-blue-600 hover:text-blue-700 text-sm underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (connectedProviders.length === 0) {
    return (
      <div className={`flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">No providers configured</span>
        </div>
        {onConfigureProvider && (
          <button
            onClick={onConfigureProvider}
            className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded hover:bg-yellow-200 transition-colors duration-200"
          >
            <Settings className="w-3 h-3 mr-1" />
            Configure
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selected Provider Display */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center space-x-3">
          {selectedConfig ? (
            <>
              <span className="text-xl">{getProviderIcon(selectedConfig.provider)}</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">
                  {getProviderDisplayName(selectedConfig.provider)}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedConfig.capabilities?.maxDuration}s max • {selectedConfig.capabilities?.qualityOptions?.[0] || 'Standard'} quality
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="text-xl">🤖</span>
              <div className="text-left">
                <div className="font-medium text-gray-900">Select Provider</div>
                <div className="text-sm text-gray-500">
                  Choose an AI provider for video generation
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedConfig && getStatusIcon(selectedConfig.status)}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto">
              {connectedProviders.map((provider) => (
                <button
                  key={provider.provider}
                  onClick={() => handleProviderSelect(provider.provider)}
                  className={`w-full flex items-center space-x-3 p-3 hover:bg-gray-50 transition-colors duration-200 ${
                    selectedProvider === provider.provider ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <span className="text-xl">{provider.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">
                      {getProviderDisplayName(provider.provider)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {provider.capabilities?.maxDuration}s max • {provider.capabilities?.qualityOptions?.[0] || 'Standard'} quality
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(provider.status)}
                    {selectedProvider === provider.provider && (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Footer with configure option */}
            {onConfigureProvider && (
              <div className="border-t border-gray-200 p-3 bg-gray-50">
                <button
                  onClick={onConfigureProvider}
                  className="w-full flex items-center justify-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configure More Providers</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provider Capabilities Display */}
      {selectedConfig && selectedConfig.capabilities && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-3 p-3 bg-gray-50 rounded-lg"
        >
          <div className="text-sm font-medium text-gray-700 mb-2">Provider Capabilities</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Duration:</span>
              <span className="ml-1 font-medium">Up to {selectedConfig.capabilities.maxDuration}s</span>
            </div>
            <div>
              <span className="text-gray-500">Quality:</span>
              <span className="ml-1 font-medium">{selectedConfig.capabilities.qualityOptions?.join(', ')}</span>
            </div>
            <div>
              <span className="text-gray-500">Motion:</span>
              <span className="ml-1 font-medium">{selectedConfig.capabilities.motionIntensityRange?.min}-{selectedConfig.capabilities.motionIntensityRange?.max}</span>
            </div>
            <div>
              <span className="text-gray-500">FPS:</span>
              <span className="ml-1 font-medium">{selectedConfig.capabilities.fpsRange?.min}-{selectedConfig.capabilities.fpsRange?.max}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
