'use client'

import { useEffect, useState } from 'react'
import { Image as ImageIcon, Info, Play, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BYOKSettings, VisionProject } from '@/types/vision'

export interface BYOKSettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: BYOKSettings
  onUpdateSettings: (settings: BYOKSettings) => void
  project: VisionProject | null
  projectId: string
}

export function BYOKSettingsPanel({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  project,
  projectId,
}: BYOKSettingsPanelProps) {
  const [imageQuality, setImageQuality] = useState<'max' | 'auto'>('auto')
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    if (project?.metadata?.imageQuality) {
      setImageQuality(project.metadata.imageQuality)
    }
  }, [project])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generation Settings</DialogTitle>
          <DialogDescription>
            Configure providers, models, and quality settings for all generation tasks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Image Generation
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <Select
                value={settings.imageProvider}
                onValueChange={(value) => onUpdateSettings({ ...settings, imageProvider: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google Imagen 3</SelectItem>
                  <SelectItem value="openai">OpenAI DALL-E</SelectItem>
                  <SelectItem value="stability">Stability AI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Model</label>
              <Select
                value={settings.imageModel}
                onValueChange={(value) => onUpdateSettings({ ...settings, imageModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.imageProvider === 'google' && (
                    <>
                      <SelectItem value="imagen-3.0-generate-001">Imagen 3.0</SelectItem>
                      <SelectItem value="imagen-3.0-fast-generate-001">Imagen 3.0 Fast</SelectItem>
                    </>
                  )}
                  {settings.imageProvider === 'openai' && (
                    <>
                      <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                      <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                    </>
                  )}
                  {settings.imageProvider === 'stability' && (
                    <>
                      <SelectItem value="stable-diffusion-xl">SDXL</SelectItem>
                      <SelectItem value="stable-diffusion-3">SD3</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Quality</label>
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  Show Comparison
                </button>
              </div>
              <Select
                value={imageQuality}
                onValueChange={async (value: 'max' | 'auto') => {
                  setImageQuality(value)
                  try {
                    await fetch(`/api/projects/${projectId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        metadata: {
                          ...project?.metadata,
                          imageQuality: value,
                        },
                      }),
                    })
                  } catch (error) {
                    console.error('Failed to save image quality:', error)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Auto (Recommended)</span>
                      <span className="text-xs text-gray-500">Balanced quality and speed</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="max">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Maximum Quality</span>
                      <span className="text-xs text-gray-500">Highest detail, slower generation</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {showComparison && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs space-y-2">
                  <div>
                    <strong className="text-blue-900 dark:text-blue-100">Auto Quality:</strong>
                    <p className="text-blue-700 dark:text-blue-300">Fast generation with good detail. Best for iteration.</p>
                  </div>
                  <div>
                    <strong className="text-blue-900 dark:text-blue-100">Max Quality:</strong>
                    <p className="text-blue-700 dark:text-blue-300">Highest resolution and detail. Best for final production.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Audio Generation (TTS)
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <Select
                value={settings.audioProvider}
                onValueChange={(value) => onUpdateSettings({ ...settings, audioProvider: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google TTS</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Model</label>
              <Select
                value={settings.audioModel}
                onValueChange={(value) => onUpdateSettings({ ...settings, audioModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.audioProvider === 'google' && (
                    <>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="wavenet">WaveNet</SelectItem>
                      <SelectItem value="neural2">Neural2</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                    </>
                  )}
                  {settings.audioProvider === 'elevenlabs' && (
                    <>
                      <SelectItem value="eleven_multilingual_v2">Multilingual v2</SelectItem>
                      <SelectItem value="eleven_turbo_v2">Turbo v2</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Play className="w-4 h-4" />
              Video Generation
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <Select
                value={settings.videoProvider}
                onValueChange={(value) => onUpdateSettings({ ...settings, videoProvider: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="runway">Runway Gen-3</SelectItem>
                  <SelectItem value="pika">Pika Labs</SelectItem>
                  <SelectItem value="kling">Kling AI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Model</label>
              <Select
                value={settings.videoModel}
                onValueChange={(value) => onUpdateSettings({ ...settings, videoModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.videoProvider === 'runway' && (
                    <>
                      <SelectItem value="gen3-alpha">Gen-3 Alpha</SelectItem>
                      <SelectItem value="gen3-turbo">Gen-3 Turbo</SelectItem>
                    </>
                  )}
                  {settings.videoProvider === 'pika' && (
                    <>
                      <SelectItem value="pika-1.0">Pika 1.0</SelectItem>
                      <SelectItem value="pika-1.5">Pika 1.5</SelectItem>
                    </>
                  )}
                  {settings.videoProvider === 'kling' && (
                    <>
                      <SelectItem value="kling-v1">Kling v1</SelectItem>
                      <SelectItem value="kling-v1.5">Kling v1.5</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={async () => {
              try {
                const existingMetadata = project?.metadata || {}
                await fetch(`/api/projects/${projectId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    metadata: {
                      ...existingMetadata,
                      byokSettings: settings,
                      imageQuality: imageQuality,
                    },
                  }),
                })
                console.log('[BYOK Settings] Saved settings:', settings, 'imageQuality:', imageQuality)
                onClose()
              } catch (error) {
                console.error('[BYOK Settings] Failed to save:', error)
              }
            }}
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BYOKSettingsPanel
