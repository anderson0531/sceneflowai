'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FileText, Edit, Eye, Sparkles, Loader, Play, Square, Volume2, Image as ImageIcon, Wand2, ChevronRight, Music, Volume as VolumeIcon, Upload, StopCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { getCuratedElevenVoices, type CuratedVoice } from '@/lib/tts/voices'
import { ScenePromptBuilder } from './ScenePromptBuilder'
import ScenePromptDrawer from './ScenePromptDrawer'
import { AudioMixer, type AudioTrack } from './AudioMixer'

interface ScriptPanelProps {
  script: any
  onScriptChange: (script: any) => void
  isGenerating: boolean
  onExpandScene?: (sceneNumber: number) => Promise<void>
  onExpandAllScenes?: () => Promise<void>
  onGenerateSceneImage?: (sceneIdx: number, customPrompt?: string) => Promise<void>
  characters?: Array<{ name: string; description: string }>
  projectId?: string
  visualStyle?: string
}

export function ScriptPanel({ script, onScriptChange, isGenerating, onExpandScene, onExpandAllScenes, onGenerateSceneImage, characters = [], projectId, visualStyle }: ScriptPanelProps) {
  const [expandingScenes, setExpandingScenes] = useState<Set<number>>(new Set())
  const [editMode, setEditMode] = useState(false)
  const [selectedScene, setSelectedScene] = useState<number | null>(null)
  const [scriptText, setScriptText] = useState('')
  
  // Audio playback state
  const [voices, setVoices] = useState<Array<CuratedVoice>>([])
  const [enabled, setEnabled] = useState<boolean>(false)
  const [loadingSceneId, setLoadingSceneId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined)
  const queueAbortRef = useRef<{ abort: boolean }>({ abort: false })
  
  // Image generation state
  const [generatingImageForScene, setGeneratingImageForScene] = useState<number | null>(null)
  
  // Scene prompt builder state
  const [sceneBuilderOpen, setSceneBuilderOpen] = useState(false)
  const [sceneBuilderIdx, setSceneBuilderIdx] = useState<number | null>(null)
  const [scenePrompts, setScenePrompts] = useState<Record<number, string>>({})
  
  // Scene prompt drawer state (new editor)
  const [sceneDrawerOpen, setSceneDrawerOpen] = useState(false)
  const [sceneDrawerIdx, setSceneDrawerIdx] = useState<number | null>(null)
  
  // Audio features state
  const [generatingSFX, setGeneratingSFX] = useState<{sceneIdx: number, sfxIdx: number} | null>(null)
  const [generatingMusic, setGeneratingMusic] = useState<number | null>(null)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [isPlayingMixed, setIsPlayingMixed] = useState(false)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const playbackAbortRef = useRef(false)

  const scenes = script?.script?.scenes || []

  React.useEffect(() => {
    console.log('[ScriptPanel] Props received:', {
      hasScript: !!script,
      scriptKeys: script ? Object.keys(script) : [],
      hasNestedScript: !!script?.script,
      nestedScriptKeys: script?.script ? Object.keys(script.script) : [],
      sceneCount: scenes.length,
      firstScene: scenes[0] ? { 
        heading: scenes[0].heading, 
        duration: scenes[0].duration 
      } : 'NO SCENES'
    })
  }, [script, scenes])

  // Fetch ElevenLabs voices
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const fetcher = async () => {
          const res = await fetch('/api/tts/elevenlabs/voices', { cache: 'no-store' })
          const data = await res.json().catch(() => null)
          if (data?.enabled && Array.isArray(data.voices)) {
            return data.voices.map((v: any) => ({ id: v.id, name: v.name })) as Array<{ id: string; name: string }>
          }
          return []
        }
        const { voices: curated, defaultVoiceId } = await getCuratedElevenVoices(fetcher)
        if (!mounted) return
        if (curated.length > 0) {
          setEnabled(true)
          setVoices(curated)
          setSelectedVoiceId(defaultVoiceId || curated[0].id)
        } else {
          setEnabled(false)
          setVoices([])
          setSelectedVoiceId(undefined)
        }
      } catch {
        if (!mounted) return
        setEnabled(false)
        setVoices([])
        setSelectedVoiceId(undefined)
      }
    })()
    return () => { mounted = false }
  }, [])

  const stopAudio = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    } catch {}
    audioRef.current = null
    setLoadingSceneId(null)
    queueAbortRef.current.abort = true
  }

  function buildSceneNarrationText(scene: any): string {
    const parts: string[] = []
    
    if (scene.heading) {
      parts.push(scene.heading)
    }
    
    if (scene.action) {
      parts.push(scene.action)
    }
    
    if (scene.dialogue && scene.dialogue.length > 0) {
      scene.dialogue.forEach((d: any) => {
        parts.push(`${d.character} says: ${d.line}`)
      })
    }
    
    return parts.join('. ')
  }

  async function playTextChunks(texts: string[]) {
    queueAbortRef.current.abort = false
    for (const t of texts) {
      if (queueAbortRef.current.abort) break
      const resp = await fetch('/api/tts/elevenlabs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, voiceId: selectedVoiceId || voices[0]?.id })
      })
      if (!resp.ok) throw new Error('TTS failed')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error('Audio error'))
        audio.play().catch(reject)
      })
    }
  }

  const playScene = async (sceneIdx: number) => {
    if (!scenes || scenes.length === 0) return
    stopAudio()
    setLoadingSceneId(sceneIdx)
    const scene = scenes[sceneIdx]
    if (!scene) return
    
    const fullText = buildSceneNarrationText(scene)
    if (!fullText.trim()) {
      stopAudio()
      return
    }
    
    // Chunk to ~1200 chars to avoid long clips
    const chunks: string[] = []
    const maxLen = 1200
    let cursor = 0
    while (cursor < fullText.length) {
      chunks.push(fullText.slice(cursor, cursor + maxLen))
      cursor += maxLen
    }
    
    try {
      if (!selectedVoiceId && (!voices || !voices.length)) throw new Error('No voice available')
      await playTextChunks(chunks)
      stopAudio()
    } catch {
      stopAudio()
    }
  }

  // Audio generation functions
  const generateSFX = async (sceneIdx: number, sfxIdx: number) => {
    const scene = scenes[sceneIdx]
    const sfx = scene?.sfx?.[sfxIdx]
    if (!sfx) return

    setGeneratingSFX({ sceneIdx, sfxIdx })
    try {
      const response = await fetch('/api/tts/elevenlabs/sound-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sfx.description, duration: 2.0 })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'SFX generation failed')
      }

      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      
      // Update scene with audio URL
      await saveSceneAudio(sceneIdx, 'sfx', audioUrl, sfxIdx)
    } catch (error: any) {
      console.error('[SFX Generation] Error:', error)
      alert(`Failed to generate sound effect: ${error.message}`)
    } finally {
      setGeneratingSFX(null)
    }
  }

  const generateMusic = async (sceneIdx: number) => {
    const scene = scenes[sceneIdx]
    const music = scene?.music
    if (!music) return

    setGeneratingMusic(sceneIdx)
    try {
      const duration = scene.duration || 30
      const response = await fetch('/api/tts/google/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: music.description, duration })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Music generation failed')
      }

      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      
      // Update scene with audio URL
      await saveSceneAudio(sceneIdx, 'music', audioUrl)
    } catch (error: any) {
      console.error('[Music Generation] Error:', error)
      alert(`Failed to generate music: ${error.message}`)
    } finally {
      setGeneratingMusic(null)
    }
  }

  const uploadAudio = async (sceneIdx: number, type: 'sfx' | 'music', sfxIdx?: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/mp3,audio/wav,audio/ogg,audio/webm'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.details || 'Upload failed')
        }

        const data = await response.json()
        await saveSceneAudio(sceneIdx, type, data.audioUrl, sfxIdx)
      } catch (error: any) {
        console.error('[Audio Upload] Error:', error)
        alert(`Failed to upload audio: ${error.message}`)
      }
    }

    input.click()
  }

  const saveSceneAudio = async (sceneIdx: number, audioType: 'sfx' | 'music', audioUrl: string, sfxIdx?: number) => {
    const updatedScenes = [...scenes]
    
    if (audioType === 'sfx' && sfxIdx !== undefined) {
      if (!updatedScenes[sceneIdx].sfx) updatedScenes[sceneIdx].sfx = []
      updatedScenes[sceneIdx].sfx[sfxIdx].audioUrl = audioUrl
    } else if (audioType === 'music') {
      if (!updatedScenes[sceneIdx].music) updatedScenes[sceneIdx].music = { description: '' }
      updatedScenes[sceneIdx].music.audioUrl = audioUrl
    }

    // Update local state
    const updatedScript = {
      ...script,
      script: {
        ...script.script,
        scenes: updatedScenes
      }
    }
    onScriptChange(updatedScript)

    // Save to database if projectId is available
    if (projectId) {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              visionPhase: {
                ...script,
                script: { scenes: updatedScenes }
              }
            }
          })
        })
      } catch (error) {
        console.error('[Save Audio] Error:', error)
      }
    }
  }

  const playAllScenes = async () => {
    playbackAbortRef.current = false
    setIsPlayingAll(true)
    
    for (let i = 0; i < scenes.length; i++) {
      if (playbackAbortRef.current) break
      await playScene(i)
      await new Promise(resolve => setTimeout(resolve, 1000))  // 1s gap between scenes
    }
    
    setIsPlayingAll(false)
  }

  const stopAllAudio = () => {
    playbackAbortRef.current = true
    stopAudio()
    setIsPlayingAll(false)
    setIsPlayingMixed(false)
  }

  // Parse action text for inline SFX and Music
  const parseScriptForAudio = (action: string) => {
    if (!action) return []
    const lines = action.split('\n')
    const parsed: Array<{type: 'text' | 'sfx' | 'music', content: string}> = []
    
    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('SFX:')) {
        parsed.push({ type: 'sfx', content: trimmed.replace('SFX:', '').trim() })
      } else if (trimmed.startsWith('Music:')) {
        parsed.push({ type: 'music', content: trimmed.replace('Music:', '').trim() })
      } else if (trimmed) {
        parsed.push({ type: 'text', content: line })
      }
    })
    
    return parsed
  }

  // Quick play SFX (generate and play immediately)
  const generateAndPlaySFX = async (description: string) => {
    try {
      const response = await fetch('/api/tts/elevenlabs/sound-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description, duration: 2.0 })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'SFX generation failed' }))
        throw new Error(error.details || error.error || 'SFX generation failed')
      }
      
      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      audio.play()
    } catch (error: any) {
      console.error('[SFX Playback] Error:', error)
      alert(`Failed to play sound effect: ${error.message}`)
    }
  }

  // Quick play Music (generate and play immediately)
  const generateAndPlayMusic = async (description: string, duration: number = 30) => {
    try {
      const response = await fetch('/api/tts/elevenlabs/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description, duration })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Music generation failed' }))
        throw new Error(error.details || error.error || 'Music generation failed')
      }
      
      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      audio.play()
    } catch (error: any) {
      console.error('[Music Playback] Error:', error)
      alert(`Failed to play music: ${error.message}`)
    }
  }

  const handleGenerateImage = async (sceneIdx: number) => {
    if (!onGenerateSceneImage) return
    setGeneratingImageForScene(sceneIdx)
    try {
      const customPrompt = scenePrompts[sceneIdx]
      await onGenerateSceneImage(sceneIdx, customPrompt)
    } finally {
      setGeneratingImageForScene(null)
    }
  }

  const handleOpenSceneBuilder = (sceneIdx: number) => {
    setSceneBuilderIdx(sceneIdx)
    setSceneBuilderOpen(true)
  }

  const handleOpenSceneDrawer = (sceneIdx: number) => {
    setSceneDrawerIdx(sceneIdx)
    setSceneDrawerOpen(true)
  }

  const handleApplyScenePrompt = (prompt: string) => {
    if (sceneBuilderIdx !== null) {
      setScenePrompts(prev => ({ ...prev, [sceneBuilderIdx]: prompt }))
    }
    setSceneBuilderOpen(false)
    setSceneBuilderIdx(null)
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-sf-primary" />
          <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">Production Script</h2>
          {isGenerating && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <Loader className="w-3 h-3 animate-spin" />
              Generating...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Voice Selector */}
          {enabled && voices.length > 0 && (
            <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
              <SelectTrigger className="h-9 text-sm min-w-[160px]">
                <Volume2 className="w-4 h-4 mr-1" />
                <SelectValue placeholder="Voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-sm">
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Stop button if playing */}
          {loadingSceneId !== null && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopAudio}
              className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
            >
              <Square className="w-4 h-4" />
              <span className="hidden sm:inline">Stop</span>
            </Button>
          )}
          
          {/* Full Script Playback Controls */}
          {scenes.length > 0 && enabled && (
            <>
              {!isPlayingAll ? (
                <Button
                  size="sm"
                  onClick={playAllScenes}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                >
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Play Full Script</span>
                  <span className="sm:hidden">Play All</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={stopAllAudio}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
                >
                  <StopCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Stop All</span>
                  <span className="sm:hidden">Stop</span>
                </Button>
              )}
            </>
          )}
          
          {scenes.some((s: any) => !s.isExpanded) && onExpandAllScenes && (
            <Button
              size="sm"
              onClick={onExpandAllScenes}
              disabled={isGenerating}
              className="bg-sf-primary text-white hover:bg-sf-accent disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate All</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
            <span>{editMode ? 'Preview' : 'Edit'}</span>
          </Button>
        </div>
      </div>
      
      {/* Script Content */}
      <div className="flex-1 overflow-y-auto">
        {!script || isGenerating ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            {isGenerating ? (
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-sf-primary" />
                <p>Generating script...</p>
              </div>
            ) : (
              <p>No script generated yet</p>
            )}
          </div>
        ) : editMode ? (
          <textarea 
            value={scriptText || JSON.stringify(script, null, 2)}
            onChange={(e) => setScriptText(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            placeholder="Edit your script here..."
          />
        ) : (
          <div className="p-4 space-y-6">
            {/* Script Details Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {script.title}
                  </h3>
                  {script.logline && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      {script.logline}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {scenes.length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Scenes</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Duration</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {Math.floor((script.totalDuration || 0) / 60)} min
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Characters</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {(script.characters || []).length}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg Scene</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {scenes.length > 0 ? Math.floor((script.totalDuration || 0) / scenes.length) : 0}s
                  </div>
                </div>
              </div>
            </div>
            
            {/* Scenes */}
            {scenes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                  No script scenes available
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Try regenerating the script
                </p>
              </div>
            ) : (
              scenes.map((scene: any, idx: number) => (
                <SceneCard 
                  key={idx}
                  scene={scene}
                  sceneNumber={idx + 1}
                  isSelected={selectedScene === idx}
                  onClick={() => setSelectedScene(idx)}
                  onExpand={onExpandScene}
                  isExpanding={expandingScenes.has(scene.sceneNumber)}
                  onPlayScene={playScene}
                  isPlaying={loadingSceneId === idx}
                  audioEnabled={enabled}
                  sceneIdx={idx}
                  onGenerateImage={handleGenerateImage}
                  isGeneratingImage={generatingImageForScene === idx}
                  onOpenPromptBuilder={handleOpenSceneBuilder}
                  onOpenPromptDrawer={handleOpenSceneDrawer}
                  scenePrompt={scenePrompts[idx]}
                  onPromptChange={(sceneIdx, prompt) => setScenePrompts(prev => ({ ...prev, [sceneIdx]: prompt }))}
                  parseScriptForAudio={parseScriptForAudio}
                  generateAndPlaySFX={generateAndPlaySFX}
                  generateAndPlayMusic={generateAndPlayMusic}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Scene Prompt Builder Modal */}
      {sceneBuilderIdx !== null && (
        <ScenePromptBuilder
          open={sceneBuilderOpen}
          onClose={() => {
            setSceneBuilderOpen(false)
            setSceneBuilderIdx(null)
          }}
          initialPrompt={scenePrompts[sceneBuilderIdx] || scenes[sceneBuilderIdx]?.visualDescription || ''}
          sceneHeading={scenes[sceneBuilderIdx]?.heading || `Scene ${sceneBuilderIdx + 1}`}
          availableCharacters={characters}
          onApply={handleApplyScenePrompt}
        />
      )}

      {/* Scene Prompt Drawer (New Editor with AI Assist) */}
      {sceneDrawerIdx !== null && projectId && (
        <ScenePromptDrawer
          open={sceneDrawerOpen}
          onClose={() => {
            setSceneDrawerOpen(false)
            setSceneDrawerIdx(null)
          }}
          scene={scenes[sceneDrawerIdx]}
          characters={characters}
          visualStyle={visualStyle || 'Cinematic'}
          projectId={projectId}
          onSceneImageGenerated={(imageUrl, sceneNumber) => {
            // Trigger refresh - the parent component should listen for scene-updated event
            window.dispatchEvent(new CustomEvent('scene-updated', {
              detail: { sceneNumber, imageUrl }
            }))
          }}
        />
      )}
    </div>
  )
}

interface SceneCardProps {
  scene: any
  sceneNumber: number
  isSelected: boolean
  onClick: () => void
  onExpand?: (sceneNumber: number) => Promise<void>
  isExpanding?: boolean
  onPlayScene?: (sceneIdx: number) => Promise<void>
  isPlaying?: boolean
  audioEnabled?: boolean
  sceneIdx: number
  onGenerateImage?: (sceneIdx: number) => Promise<void>
  isGeneratingImage?: boolean
  onOpenPromptBuilder?: (sceneIdx: number) => void
  onOpenPromptDrawer?: (sceneIdx: number) => void
  scenePrompt?: string
  onPromptChange?: (sceneIdx: number, prompt: string) => void
  // Audio functions - inline play
  parseScriptForAudio?: (action: string) => Array<{type: 'text' | 'sfx' | 'music', content: string}>
  generateAndPlaySFX?: (description: string) => Promise<void>
  generateAndPlayMusic?: (description: string, duration?: number) => Promise<void>
}

function SceneCard({ scene, sceneNumber, isSelected, onClick, onExpand, isExpanding, onPlayScene, isPlaying, audioEnabled, sceneIdx, onGenerateImage, isGeneratingImage, onOpenPromptBuilder, onOpenPromptDrawer, scenePrompt, onPromptChange, parseScriptForAudio, generateAndPlaySFX, generateAndPlayMusic }: SceneCardProps) {
  const isOutline = !scene.isExpanded && scene.summary
  const [isOpen, setIsOpen] = useState(false)
  
  const handleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onExpand && !isExpanding) {
      await onExpand(scene.sceneNumber)
    }
  }
  
  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onPlayScene && !isPlaying) {
      await onPlayScene(sceneIdx)
    }
  }
  
  const handleGenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onGenerateImage && !isGeneratingImage) {
      await onGenerateImage(sceneIdx)
    }
  }

  const handleOpenBuilder = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onOpenPromptBuilder) {
      onOpenPromptBuilder(sceneIdx)
    }
  }

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }
  
  return (
    <div 
      className={`p-4 rounded-lg border transition-all ${
        isSelected 
          ? 'border-sf-primary bg-blue-50 dark:bg-blue-950/30 ring-2 ring-sf-primary' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${isOutline ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}
    >
      {/* Collapsible Header */}
      <div 
        onClick={toggleOpen}
        className="flex items-center justify-between cursor-pointer mb-3"
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={`w-4 h-4 transition-transform text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-90' : ''}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">SCENE {sceneNumber}</span>
          {scene.heading && (
            <span className="text-sm text-gray-600 dark:text-gray-400">{scene.heading}</span>
          )}
          {scene.duration && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{scene.duration}s</span>
          )}
          {isOutline && (
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200">
              Outline
            </span>
          )}
          
          {/* Audio Play Button */}
          {audioEnabled && !isOutline && (
            <Button
              size="sm"
              onClick={handlePlay}
              disabled={isPlaying}
              className="h-6 w-6 p-0 rounded-full bg-sf-primary text-white hover:bg-sf-accent disabled:opacity-50"
              title="Play scene narration"
            >
              {isPlaying ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {isOutline && onExpand && (
            <Button
              size="sm"
              onClick={handleExpand}
              disabled={isExpanding}
              className="bg-sf-primary text-white hover:bg-sf-accent disabled:opacity-50 text-xs px-2 py-1 h-auto"
            >
              {isExpanding ? <Loader className="w-3 h-3 animate-spin" /> : 'Generate'}
            </Button>
          )}
          
          {/* Generate Image Buttons (for expanded scenes) */}
          {!isOutline && onGenerateImage && scene.visualDescription && (
            <>
              <Button
                size="sm"
                onClick={handleOpenBuilder}
                disabled={isGeneratingImage}
                className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-xs px-2 py-1 h-auto"
                title="Open prompt builder"
              >
                <Wand2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
                className="bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 text-xs px-2 py-1 h-auto flex items-center gap-1"
                title="Quick generate image"
              >
                {isGeneratingImage ? (
                  <Loader className="w-3 h-3 animate-spin" />
                ) : (
                  <ImageIcon className="w-3 h-3" />
                )}
                <span>{scene.imageUrl ? 'Regenerate' : 'Generate'} Image</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-3">
          {/* Prompt textarea hidden - accessible via drawer/builder */}
          
          {/* Scene Image - Prominent Storyboard Display */}
          {!isOutline && scene.imageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 shadow-md max-w-3xl mx-auto">
              <img 
                src={scene.imageUrl} 
                alt={scene.heading}
                className="w-full h-auto object-cover"
              />
            </div>
          )}
          
          {scene.heading && (
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{scene.heading}</div>
          )}
          
          {/* Show summary for outlines, action for expanded scenes */}
          {isOutline && scene.summary && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">{scene.summary}</div>
          )}
          
          {!isOutline && scene.action && (
            <div className="mb-2 space-y-1">
              {parseScriptForAudio?.(scene.action).map((item: any, i: number) => {
                if (item.type === 'sfx') {
                  return (
                    <div key={i} className="flex items-center gap-2 my-2 bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                      <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">SFX:</span>
                      <span className="text-sm italic text-gray-700 dark:text-gray-300 flex-1">{item.content}</span>
                      <Button 
                        size="sm" 
                        onClick={() => generateAndPlaySFX?.(item.content)}
                        className="text-xs px-2 py-1 h-auto bg-purple-600 hover:bg-purple-700"
                        title="Play sound effect"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  )
                } else if (item.type === 'music') {
                  return (
                    <div key={i} className="flex items-center gap-2 my-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Music:</span>
                      <span className="text-sm italic text-gray-700 dark:text-gray-300 flex-1">{item.content}</span>
                      <Button 
                        size="sm" 
                        onClick={() => generateAndPlayMusic?.(item.content, scene.duration || 30)}
                        className="text-xs px-2 py-1 h-auto bg-blue-600 hover:bg-blue-700"
                        title="Play music"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  )
                } else {
                  return (
                    <div key={i} className="text-sm text-gray-700 dark:text-gray-300">{item.content}</div>
                  )
                }
              })}
            </div>
          )}
          
          {!isOutline && scene.dialogue && scene.dialogue.length > 0 && (
            <div className="space-y-1">
              {scene.dialogue.map((d: any, i: number) => (
                <div key={i} className="text-sm ml-4">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{d.character}:</span>
                  <span className="ml-2 italic text-gray-700 dark:text-gray-300">"{d.line}"</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

