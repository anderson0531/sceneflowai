'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Edit3,
  Eye,
  EyeOff,
  Download,
  Upload
} from 'lucide-react'
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

interface CredentialForm {
  provider: AIProvider
  credentials: any
  isSubmitting: boolean
  validationStatus: 'idle' | 'validating' | 'verified' | 'failed'
  errorMessage: string
}

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null)
  const [credentialForm, setCredentialForm] = useState<CredentialForm>({
    provider: AIProvider.GOOGLE_VEO,
    credentials: {},
    isSubmitting: false,
    validationStatus: 'idle',
    errorMessage: ''
  })

  // Load providers on component mount
  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings/providers', {
        headers: {
          'x-user-id': 'demo_user_001' // In production, get from auth context
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProviders(data.data || [])
      } else {
        console.error('Failed to load providers')
      }
    } catch (error) {
      console.error('Error loading providers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddProvider = async () => {
    try {
      setCredentialForm(prev => ({ ...prev, isSubmitting: true, validationStatus: 'validating' }))
      
      const response = await fetch('/api/settings/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo_user_001'
        },
        body: JSON.stringify({
          provider: credentialForm.provider,
          credentials: credentialForm.credentials
        })
      })

      if (response.ok) {
        setCredentialForm(prev => ({ ...prev, validationStatus: 'verified' }))
        setShowAddForm(false)
        setCredentialForm({
          provider: AIProvider.GOOGLE_VEO,
          credentials: {},
          isSubmitting: false,
          validationStatus: 'idle',
          errorMessage: ''
        })
        await loadProviders() // Refresh the list
      } else {
        const errorData = await response.json()
        setCredentialForm(prev => ({
          ...prev,
          validationStatus: 'failed',
          errorMessage: errorData.details || errorData.error || 'Validation failed'
        }))
      }
    } catch (error) {
      setCredentialForm(prev => ({
        ...prev,
        validationStatus: 'failed',
        errorMessage: 'Network error occurred'
      }))
    } finally {
      setCredentialForm(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  const handleRemoveProvider = async (provider: AIProvider) => {
    if (!confirm(`Are you sure you want to remove ${getProviderDisplayName(provider)}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/settings/providers?provider=${provider}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': 'demo_user_001'
        }
      })

      if (response.ok) {
        await loadProviders() // Refresh the list
      } else {
        console.error('Failed to remove provider')
      }
    } catch (error) {
      console.error('Error removing provider:', error)
    }
  }

  const handleToggleProvider = async (provider: AIProvider, isEnabled: boolean) => {
    try {
      const response = await fetch('/api/settings/providers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo_user_001'
        },
        body: JSON.stringify({
          provider,
          is_valid: isEnabled
        })
      })

      if (response.ok) {
        await loadProviders() // Refresh the list
      } else {
        console.error('Failed to toggle provider')
      }
    } catch (error) {
      console.error('Error toggling provider:', error)
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

  const getProviderDescription = (provider: AIProvider): string => {
    const descriptions = {
      [AIProvider.GOOGLE_VEO]: 'Google\'s advanced AI video generation model with cinematic quality',
      [AIProvider.RUNWAY]: 'Professional AI video generation platform for creative professionals',
      [AIProvider.STABILITY_AI]: 'High-quality AI video generation with stable diffusion technology'
    }
    return descriptions[provider] || 'AI video generation provider'
  }

  const getProviderIcon = (provider: AIProvider): string => {
    const icons = {
      [AIProvider.GOOGLE_VEO]: '🎬',
      [AIProvider.RUNWAY]: '🎭',
      [AIProvider.STABILITY_AI]: '⚡'
    }
    return icons[provider] || '🤖'
  }

  const getCredentialFields = (provider: AIProvider) => {
    switch (provider) {
      case AIProvider.GOOGLE_VEO:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Account JSON
              </label>
              <textarea
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Paste your Google Cloud service account JSON here..."
                value={credentialForm.credentials.json || ''}
                onChange={(e) => setCredentialForm(prev => ({
                  ...prev,
                  credentials: { json: e.target.value }
                }))}
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload your Google Cloud service account JSON file
              </p>
            </div>
          </div>
        )
      
      case AIProvider.RUNWAY:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your Runway ML API key"
                value={credentialForm.credentials.apiKey || ''}
                onChange={(e) => setCredentialForm(prev => ({
                  ...prev,
                  credentials: { apiKey: e.target.value }
                }))}
              />
              <p className="text-sm text-gray-500 mt-1">
                Get your API key from the Runway ML dashboard
              </p>
            </div>
          </div>
        )
      
      case AIProvider.STABILITY_AI:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your Stability AI API key"
                value={credentialForm.credentials.apiKey || ''}
                onChange={(e) => setCredentialForm(prev => ({
                  ...prev,
                  credentials: { apiKey: e.target.value }
                }))}
              />
              <p className="text-sm text-gray-500 mt-1">
                Get your API key from the Stability AI platform
              </p>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  const getValidationStatusIcon = () => {
    switch (credentialForm.validationStatus) {
      case 'validating':
        return <AlertCircle className="w-5 h-5 text-yellow-500 animate-pulse" />
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  const getValidationStatusText = () => {
    switch (credentialForm.validationStatus) {
      case 'validating':
        return 'Validating credentials...'
      case 'verified':
        return 'Credentials verified successfully!'
      case 'failed':
        return 'Validation failed'
      default:
        return ''
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600 mt-2">
            Connect your AI video generation providers to start creating amazing content
          </p>
        </motion.div>

        {/* Add Provider Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </button>
        </motion.div>

        {/* Add Provider Form */}
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg shadow-md p-6 mb-8"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add New Provider</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Provider
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={credentialForm.provider}
                  onChange={(e) => setCredentialForm(prev => ({
                    ...prev,
                    provider: e.target.value as AIProvider,
                    credentials: {},
                    validationStatus: 'idle',
                    errorMessage: ''
                  }))}
                >
                  <option value={AIProvider.GOOGLE_VEO}>🎬 Google Veo</option>
                  <option value={AIProvider.RUNWAY}>🎭 Runway ML</option>
                  <option value={AIProvider.STABILITY_AI}>⚡ Stability AI</option>
                </select>
              </div>

              {/* Provider Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getProviderIcon(credentialForm.provider)}</span>
                  <div>
                    <h3 className="font-medium text-blue-900">
                      {getProviderDisplayName(credentialForm.provider)}
                    </h3>
                    <p className="text-sm text-blue-700">
                      {getProviderDescription(credentialForm.provider)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Credential Fields */}
              {getCredentialFields(credentialForm.provider)}

              {/* Validation Status */}
              {credentialForm.validationStatus !== 'idle' && (
                <div className={`p-4 rounded-lg ${
                  credentialForm.validationStatus === 'verified' ? 'bg-green-50' :
                  credentialForm.validationStatus === 'failed' ? 'bg-red-50' :
                  'bg-yellow-50'
                }`}>
                  <div className="flex items-center space-x-2">
                    {getValidationStatusIcon()}
                    <span className={`font-medium ${
                      credentialForm.validationStatus === 'verified' ? 'text-green-800' :
                      credentialForm.validationStatus === 'failed' ? 'text-red-800' :
                      'text-yellow-800'
                    }`}>
                      {getValidationStatusText()}
                    </span>
                  </div>
                  {credentialForm.errorMessage && (
                    <p className="text-sm text-red-700 mt-2">
                      {credentialForm.errorMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProvider}
                  disabled={credentialForm.isSubmitting || !credentialForm.credentials.json && !credentialForm.credentials.apiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {credentialForm.isSubmitting ? 'Adding...' : 'Add Provider'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Providers List */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          {providers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No providers configured</h3>
              <p className="text-gray-500 mb-4">
                Get started by adding your first AI video generation provider
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </button>
            </div>
          ) : (
            providers.map((provider, index) => (
              <motion.div
                key={provider.provider}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{provider.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {provider.displayName}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          provider.status === 'connected' ? 'bg-green-100 text-green-800' :
                          provider.status === 'disconnected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {provider.status === 'connected' ? 'Connected' :
                           provider.status === 'disconnected' ? 'Disconnected' :
                           'Not Configured'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{provider.description}</p>
                      
                      {provider.capabilities && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-sm">
                            <span className="text-gray-500">Max Duration:</span>
                            <span className="ml-2 font-medium">{provider.capabilities.maxDuration}s</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Quality:</span>
                            <span className="ml-2 font-medium">{provider.capabilities.qualityOptions?.join(', ')}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Motion:</span>
                            <span className="ml-2 font-medium">{provider.capabilities.motionIntensityRange?.min}-{provider.capabilities.motionIntensityRange?.max}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">FPS:</span>
                            <span className="ml-2 font-medium">{provider.capabilities.fpsRange?.min}-{provider.capabilities.fpsRange?.max}</span>
                          </div>
                        </div>
                      )}
                      
                      {provider.lastTested && (
                        <p className="text-sm text-gray-500">
                          Last tested: {new Date(provider.lastTested).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleProvider(provider.provider, !provider.isConnected)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                        provider.isConnected
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {provider.isConnected ? 'Disable' : 'Enable'}
                    </button>
                    
                    <button
                      onClick={() => handleRemoveProvider(provider.provider)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      title="Remove provider"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  )
}
