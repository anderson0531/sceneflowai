'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, Play, Loader, Mic, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface VoiceClonePanelProps {
  onVoiceCreated: (voiceId: string, voiceName: string) => void
  characterName?: string
}

export function VoiceClonePanel({ onVoiceCreated, characterName }: VoiceClonePanelProps) {
  const [voiceName, setVoiceName] = useState(characterName ? `${characterName}'s Voice` : '')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.includes('audio')
    )
    
    if (droppedFiles.length === 0) {
      toast.error('Please drop audio files only (MP3, WAV, WebM, OGG)')
      return
    }
    
    setFiles(prev => [...prev, ...droppedFiles].slice(0, 25))
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles].slice(0, 25))
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleCloneVoice = async () => {
    if (!voiceName.trim()) {
      toast.error('Please enter a name for your voice')
      return
    }

    if (files.length === 0) {
      toast.error('Please upload at least one audio sample')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('name', voiceName.trim())
      formData.append('description', description.trim())
      
      for (const file of files) {
        formData.append('files', file)
      }

      const response = await fetch('/api/tts/elevenlabs/voice-clone', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone voice')
      }

      toast.success(`Voice "${voiceName}" created successfully!`)
      onVoiceCreated(data.voice.id, data.voice.name)
    } catch (error) {
      console.error('[Voice Clone] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to clone voice')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <Mic className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-1">Clone a Voice</p>
          <p className="text-blue-400/80">
            Upload audio recordings of the voice you want to clone. For best results:
          </p>
          <ul className="text-xs text-blue-400/70 mt-1 space-y-0.5 list-disc list-inside">
            <li>Use high-quality recordings with minimal background noise</li>
            <li>Include 30 seconds to 2 minutes of clear speech</li>
            <li>Multiple samples improve accuracy</li>
          </ul>
        </div>
      </div>

      {/* Voice Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Voice Name</label>
        <input
          type="text"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="Enter a name for this voice..."
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Description (Optional) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Description <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the voice characteristics..."
          rows={2}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {/* Drop Zone */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Audio Samples</label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${dragActive 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-gray-700 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800/50'
            }
          `}
        >
          <Upload className={`w-8 h-8 mb-2 ${dragActive ? 'text-blue-400' : 'text-gray-500'}`} />
          <p className="text-sm text-gray-400 text-center">
            <span className="text-blue-400 font-medium">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">MP3, WAV, WebM, OGG (max 25 files)</p>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{files.length} file(s) selected</span>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear all
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded border border-gray-700"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-sm text-gray-300 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clone Button */}
      <Button
        onClick={handleCloneVoice}
        disabled={isUploading || !voiceName.trim() || files.length === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isUploading ? (
          <>
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Cloning Voice...
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            Clone Voice
          </>
        )}
      </Button>
    </div>
  )
}
