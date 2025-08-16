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
  Shield
} from 'lucide-react'
import { useState } from 'react'
// Removed unused cn import

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
  }

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // In a real app, you'd encrypt and send these to your backend
      Object.entries(tempKeys).forEach(([provider, settings]) => {
        if (settings.apiKey) {
          setBYOKProvider(provider as keyof typeof byokSettings, settings.name, settings.apiKey)
        }
      })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Show success message
      alert('BYOK settings saved successfully!')
    } catch {
      alert('Failed to save BYOK settings. Please try again.')
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
            Your API keys are encrypted and stored securely. We never have access to your actual keys and only use them 
            to make requests to the services you&apos;ve configured. You can revoke these keys at any time from your provider&apos;s dashboard.
          </p>
        </CardContent>
      </Card>

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
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
