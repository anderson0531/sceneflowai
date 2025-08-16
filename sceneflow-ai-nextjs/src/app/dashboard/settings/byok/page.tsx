'use client'

import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Save,
  Shield,
  Loader2
} from 'lucide-react'
import { useState, useEffect } from 'react'

const providers = {
  llmProvider: {
    name: 'LLM Provider',
    description: 'AI language model for text generation and analysis',
    options: [
      { value: 'google-gemini', label: 'Google Gemini', description: 'Advanced AI model for creative tasks' },
      { value: 'openai', label: 'OpenAI GPT', description: 'Powerful language model for various tasks' },
      { value: 'anthropic', label: 'Anthropic Claude', description: 'Safe and helpful AI assistant' }
    ]
  },
  imageGenerationProvider: {
    name: 'Image Generation Provider',
    description: 'AI service for creating visual assets and storyboards',
    options: [
      { value: 'google-gemini', label: 'Google Gemini', description: 'Advanced image generation with text' },
      { value: 'openai-dalle', label: 'OpenAI DALL-E', description: 'High-quality image creation' },
      { value: 'stability-ai', label: 'Stability AI', description: 'Fast and creative image generation' }
    ]
  },
  videoGenerationProvider: {
    name: 'Video Generation Provider',
    description: 'AI service for creating video clips and animations',
    options: [
      { value: 'google-veo', label: 'Google Veo', description: 'High-quality video generation' },
      { value: 'runway', label: 'Runway ML', description: 'Professional video editing AI' },
      { value: 'pika-labs', label: 'Pika Labs', description: 'Creative video generation' }
    ]
  }
}

export default function BYOKSettingsPage() {
  const { byokSettings, setBYOKProvider } = useStore()
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [tempKeys, setTempKeys] = useState(byokSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load existing keys from localStorage on component mount
  useEffect(() => {
    const storedKeys = localStorage.getItem('byok-keys')
    if (storedKeys) {
      try {
        const parsedKeys = JSON.parse(storedKeys)
        setTempKeys(parsedKeys)
      } catch (err) {
        console.error('Failed to parse stored BYOK keys:', err)
      }
    }
  }, [])

  const handleProviderChange = (provider: keyof typeof byokSettings, value: string) => {
    setTempKeys(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        name: value as string,
        apiKey: '', // Clear API key when provider changes
        isConfigured: false
      }
    }))
    setError(null)
    setSuccess(null)
  }

  const handleApiKeyChange = (provider: keyof typeof byokSettings, apiKey: string) => {
    setTempKeys(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        apiKey,
        isConfigured: !!apiKey
      }
    }))
    setError(null)
    setSuccess(null)
  }

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Save to localStorage (in production, this would go to a secure API)
      localStorage.setItem('byok-keys', JSON.stringify(tempKeys))
      
      // Update local store
      Object.entries(tempKeys).forEach(([provider, settings]) => {
        if (settings.apiKey) {
          setBYOKProvider(provider as keyof typeof byokSettings, settings.name, settings.apiKey)
        }
      })
      
      setSuccess('BYOK settings saved successfully! Your API keys are now stored locally.')
      
      // Clear sensitive data from temp state
      setTempKeys(prev => {
        const cleared = { ...prev }
        Object.keys(cleared).forEach(key => {
          cleared[key as keyof typeof byokSettings].apiKey = ''
        })
        return cleared
      })
      
    } catch (err) {
      setError('Failed to save BYOK settings. Please try again.')
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = JSON.stringify(tempKeys) !== JSON.stringify(byokSettings)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">BYOK Settings</h1>
        <p className="text-muted-foreground">
          Configure your own API keys for AI services. This gives you more control over costs and providers.
        </p>
      </div>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Shield className="mr-2 h-5 w-5" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 text-sm">
            Your API keys are stored locally in your browser for demo purposes. In production, these would be encrypted 
            and stored securely on our servers. We never have access to your actual keys and only use them to make 
            requests to the services you&apos;ve configured. You can revoke these keys at any time from your provider&apos;s dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-700">
              <AlertCircle className="mr-2 h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-green-700">
              <CheckCircle className="mr-2 h-5 w-5" />
              <span className="font-medium">{success}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Configuration */}
      <div className="space-y-6">
        {Object.entries(providers).map(([providerKey, provider]) => {
          const currentSettings = tempKeys[providerKey as keyof typeof byokSettings]
          const isConfigured = currentSettings.isConfigured
          
          return (
            <Card key={providerKey}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  {provider.name}
                </CardTitle>
                <CardDescription>{provider.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Select Provider
                  </label>
                  <select
                    value={currentSettings.name}
                    onChange={(e) => handleProviderChange(providerKey as keyof typeof byokSettings, e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {provider.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <Input
                      type={showKeys[providerKey] ? 'text' : 'password'}
                      value={currentSettings.apiKey}
                      onChange={(e) => handleApiKeyChange(providerKey as keyof typeof byokSettings, e.target.value)}
                      placeholder="Enter your API key"
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(providerKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKeys[providerKey] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  {/* Provider Description */}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {provider.options.find(opt => opt.value === currentSettings.name)?.description}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  {isConfigured ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">Configured</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-600">Not configured</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          size="lg"
          className="min-w-[200px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Help Text */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <h3 className="font-medium text-foreground mb-2">Need help?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Get your Google Gemini API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a></li>
            <li>• Get your OpenAI API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a></li>
            <li>• Get your Stability AI key from <a href="https://platform.stability.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Stability AI</a></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
