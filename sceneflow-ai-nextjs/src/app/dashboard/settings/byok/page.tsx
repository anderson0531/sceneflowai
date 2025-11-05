'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Key, CheckCircle, XCircle, Loader, AlertCircle, ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'

export default function BYOKPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [providers, setProviders] = useState<Record<string, { configured: boolean; apiKey: string }>>({})
  const [localApiKeys, setLocalApiKeys] = useState<Record<string, string>>({})

  useEffect(() => {
    if (session?.user) {
      fetchProviderConfigs()
    }
  }, [session])

  const fetchProviderConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/providers')
      if (response.ok) {
        const data = await response.json()
        // Initialize providers state
        const providerState: Record<string, { configured: boolean; apiKey: string }> = {}
        if (data.providers) {
          data.providers.forEach((p: any) => {
            providerState[p.provider] = {
              configured: p.is_valid || false,
              apiKey: p.is_valid ? '••••••••' : '',
            }
          })
        }
        setProviders(providerState)
      }
    } catch (error) {
      console.error('Failed to fetch provider configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProvider = async (provider: string, apiKey: string) => {
    setSaving(prev => ({ ...prev, [provider]: true }))
    try {
      const response = await fetch('/api/settings/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          credentials: { apiKey },
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast.success(`${provider} API key configured successfully`)
        setProviders(prev => ({
          ...prev,
          [provider]: { configured: true, apiKey: '••••••••' },
        }))
      } else {
        toast.error(data.error || `Failed to configure ${provider}`)
      }
    } catch (error) {
      console.error(`Failed to save ${provider}:`, error)
      toast.error(`Failed to configure ${provider}`)
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }))
    }
  }

  const providerConfigs = [
    {
      name: 'Google Gemini',
      key: 'google-gemini',
      description: 'LLM and text analysis',
      getKeyUrl: 'https://console.cloud.google.com/apis/credentials',
    },
    {
      name: 'OpenAI',
      key: 'openai',
      description: 'LLM and DALL-E image generation',
      getKeyUrl: 'https://platform.openai.com/api-keys',
    },
    {
      name: 'Anthropic Claude',
      key: 'anthropic',
      description: 'LLM and analysis',
      getKeyUrl: 'https://console.anthropic.com/settings/keys',
    },
    {
      name: 'Google Veo',
      key: 'google-veo',
      description: 'Video generation',
      getKeyUrl: 'https://console.cloud.google.com/apis/credentials',
    },
    {
      name: 'Runway',
      key: 'runway',
      description: 'Video generation',
      getKeyUrl: 'https://app.runwayml.com/account/settings',
    },
    {
      name: 'Stability AI',
      key: 'stability-ai',
      description: 'Image generation',
      getKeyUrl: 'https://platform.stability.ai/account/keys',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-sf-primary" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card className="bg-dark-card border-dark-border text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-sf-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Bring Your Own Key (BYOK)</CardTitle>
              <CardDescription className="text-gray-400">
                Configure your own API keys to use with SceneFlow AI services
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-semibold mb-1">Why use BYOK?</p>
                <p className="text-blue-300">
                  Using your own API keys allows you to pay directly to providers and may reduce costs. 
                  SceneFlow charges a 20% platform fee when using BYOK.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {providerConfigs.map((provider) => {
              const config = providers[provider.key] || { configured: false, apiKey: '' }
              const localApiKey = localApiKeys[provider.key] || ''
              const isSaving = saving[provider.key] || false

              return (
                <div
                  key={provider.key}
                  className="p-4 bg-dark-bg rounded-lg border border-dark-border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{provider.name}</h3>
                        {config.configured ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">{provider.description}</p>
                    </div>
                    {config.configured && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        Configured
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor={`${provider.key}-key`} className="text-sm font-medium text-dark-text block">
                        API Key
                      </label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id={`${provider.key}-key`}
                          type="password"
                          value={config.configured ? config.apiKey : localApiKey}
                          onChange={(e) => setLocalApiKeys(prev => ({ ...prev, [provider.key]: e.target.value }))}
                          placeholder={config.configured ? '••••••••' : 'Enter your API key'}
                          disabled={config.configured}
                          className="bg-dark-bg border-dark-border text-white"
                        />
                        <Button
                          type="button"
                          onClick={() => handleSaveProvider(provider.key, localApiKey)}
                          disabled={isSaving || config.configured || !localApiKey}
                          className="bg-sf-primary hover:bg-sf-accent text-white flex items-center gap-2"
                        >
                          {isSaving ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : config.configured ? (
                            'Update'
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Get your API key:</span>
                      <a
                        href={provider.getKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sf-primary hover:underline flex items-center gap-1"
                      >
                        {provider.name} Dashboard
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

