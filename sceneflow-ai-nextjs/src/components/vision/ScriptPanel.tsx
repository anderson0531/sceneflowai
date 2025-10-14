'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FileText, Edit, Eye, Sparkles, Loader, Play, Square, Volume2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCuratedElevenVoices, type CuratedVoice } from '@/lib/tts/voices'

interface ScriptPanelProps {
  script: any
  onScriptChange: (script: any) => void
  isGenerating: boolean
  onExpandScene?: (sceneNumber: number) => Promise<void>
  onExpandAllScenes?: () => Promise<void>
  onGenerateSceneImage?: (sceneIdx: number) => Promise<void>
}

export function ScriptPanel({ script, onScriptChange, isGenerating, onExpandScene, onExpandAllScenes, onGenerateSceneImage }: ScriptPanelProps) {
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

  const handleGenerateImage = async (sceneIdx: number) => {
    if (!onGenerateSceneImage) return
    setGeneratingImageForScene(sceneIdx)
    try {
      await onGenerateSceneImage(sceneIdx)
    } finally {
      setGeneratingImageForScene(null)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-sf-primary" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Production Script</h2>
          {isGenerating && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <Loader className="w-3 h-3 animate-spin" />
              Generating...
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {/* Voice Selector */}
          {enabled && voices.length > 0 && (
            <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <Volume2 className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
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
          
          {scenes.some((s: any) => !s.isExpanded) && onExpandAllScenes && (
            <Button
              size="sm"
              onClick={onExpandAllScenes}
              disabled={isGenerating}
              className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Generate All Scenes</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="flex items-center gap-1"
          >
            {editMode ? <Eye className="w-4 h-4 text-gray-700 dark:text-gray-300" /> : <Edit className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
            <span className="hidden sm:inline">{editMode ? 'Preview' : 'Edit'}</span>
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
            {/* Title & Logline */}
            {script.title && (
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{script.title}</h3>
                {script.logline && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">{script.logline}</p>
                )}
              </div>
            )}
            
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
                />
              ))
            )}
          </div>
        )}
      </div>
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
}

function SceneCard({ scene, sceneNumber, isSelected, onClick, onExpand, isExpanding, onPlayScene, isPlaying, audioEnabled, sceneIdx, onGenerateImage, isGeneratingImage }: SceneCardProps) {
  const isOutline = !scene.isExpanded && scene.summary
  
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
  
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected 
          ? 'border-sf-primary bg-blue-50 dark:bg-blue-950/30 ring-2 ring-sf-primary' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${isOutline ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">SCENE {sceneNumber}</span>
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
          
          {/* Generate Image Button (for expanded scenes) */}
          {!isOutline && onGenerateImage && scene.visualDescription && (
            <Button
              size="sm"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 text-xs px-2 py-1 h-auto flex items-center gap-1"
              title="Generate image from visual description"
            >
              {isGeneratingImage ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                <ImageIcon className="w-3 h-3" />
              )}
              <span>{scene.imageUrl ? 'Regenerate' : 'Generate'} Image</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Scene Image - Prominent Storyboard Display */}
      {!isOutline && scene.imageUrl && (
        <div className="mb-4 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 shadow-md max-w-3xl">
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
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{scene.action}</div>
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
  )
}

