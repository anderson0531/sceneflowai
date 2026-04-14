'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Key, CheckCircle, XCircle, Loader, AlertCircle, ExternalLink, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'

export default function BYOKPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [vertexApiKey, setVertexApiKey] = useState('')
  const [vertexConfig, setVertexConfig] = useState<{
    configured: boolean
    keyHint?: string
    updatedAt?: string
  }>({ configured: false })

  useEffect(() => {
    if (session?.user) {
      fetchVertexConfig()
    }
  }, [session])

  const fetchVertexConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/byok/vertex')
      if (response.ok) {
        const data = await response.json()
        setVertexConfig({
          configured: Boolean(data.configured),
          keyHint: data.keyHint,
          updatedAt: data.updatedAt,
        })
      }
    } catch (error) {
      console.error('Failed to fetch Vertex config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveVertexKey = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/byok/vertex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: vertexApiKey }),
      })

      const data = await response.json()
      if (response.ok) {
        toast.success('Vertex AI key saved securely')
        setVertexApiKey('')
        setVertexConfig({
          configured: true,
          keyHint: data.keyHint,
          updatedAt: data.updatedAt,
        })
      } else {
        toast.error(data.error || 'Failed to save Vertex AI key')
      }
    } catch (error) {
      console.error('Failed to save Vertex AI key:', error)
      toast.error('Failed to save Vertex AI key')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveVertexKey = async () => {
    setRemoving(true)
    try {
      const response = await fetch('/api/settings/byok/vertex', {
        method: 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove key')
      }
      setVertexConfig({ configured: false })
      setVertexApiKey('')
      toast.success('Vertex AI key removed')
    } catch (error) {
      console.error('Failed to remove Vertex AI key:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove key')
    } finally {
      setRemoving(false)
    }
  }

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
                Configure your Vertex AI key for SceneFlow generation
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
                  Your key is encrypted at rest and never returned to the client after saving.
                  SceneFlow only stores masked key metadata for status display.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold">Vertex AI</h3>
                  {vertexConfig.configured ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <p className="text-gray-400 text-sm">Google Vertex-powered generation key</p>
              </div>
              {vertexConfig.configured && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  Configured
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="vertex-api-key" className="text-sm font-medium text-dark-text block">
                  Vertex AI API Key
                </label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="vertex-api-key"
                    type="password"
                    value={vertexApiKey}
                    onChange={(e) => setVertexApiKey(e.target.value)}
                    placeholder={vertexConfig.configured ? 'Enter a new key to rotate' : 'Enter your Vertex AI API key'}
                    className="bg-dark-bg border-dark-border text-white"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    onClick={handleSaveVertexKey}
                    disabled={saving || !vertexApiKey.trim()}
                    className="bg-sf-primary hover:bg-sf-accent text-white flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </div>

              {vertexConfig.configured && (
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Stored key: <span className="text-gray-300">{vertexConfig.keyHint || 'Configured'}</span></p>
                  {vertexConfig.updatedAt && (
                    <p>Last updated: {new Date(vertexConfig.updatedAt).toLocaleString()}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span>Get your API key:</span>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sf-primary hover:underline flex items-center gap-1"
                  >
                    Google Cloud Console
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {vertexConfig.configured && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemoveVertexKey}
                    disabled={removing}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                  >
                    {removing ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

