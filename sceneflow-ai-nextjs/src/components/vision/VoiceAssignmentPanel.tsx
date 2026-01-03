'use client'

import React, { useState, useEffect } from 'react'
import { Volume2, Play } from 'lucide-react'

interface VoiceAssignmentPanelProps {
  characters: Array<{ name: string; description?: string }>
  voiceAssignments: {
    narrator: string
    characters: Record<string, string>
    voiceover: string
  }
  onUpdateNarrator: (voiceId: string) => void
  onUpdateVoiceover: (voiceId: string) => void
  onUpdateCharacter: (characterName: string, voiceId: string) => void
}

interface Voice {
  id: string
  name: string
  gender?: string
}

export function VoiceAssignmentPanel({
  characters,
  voiceAssignments,
  onUpdateNarrator,
  onUpdateVoiceover,
  onUpdateCharacter
}: VoiceAssignmentPanelProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch available voices
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const res = await fetch('/api/tts/google/voices', { cache: 'no-store' })
        const data = await res.json()
        if (data?.enabled && Array.isArray(data.voices)) {
          setVoices(data.voices)
        }
      } catch (error) {
        console.error('[VoicePanel] Failed to fetch voices:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchVoices()
  }, [])

  const handlePreview = async (voiceId: string) => {
    try {
      const response = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'This is a preview of the selected voice for your script.',
          voiceId
        })
      })

      if (!response.ok) throw new Error('Preview failed')

      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      audio.play()
    } catch (error) {
      console.error('[VoicePanel] Preview error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Loading voices...</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-white">
        <Volume2 className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Voice Assignments</h3>
      </div>

      {/* Narrator Voice */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Narrator
        </label>
        <div className="flex gap-2">
          <select
            value={voiceAssignments.narrator}
            onChange={(e) => onUpdateNarrator(e.target.value)}
            className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {voices.map(voice => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => handlePreview(voiceAssignments.narrator)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-colors"
            title="Preview voice"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Voice for action descriptions and scene transitions
        </p>
      </div>

      {/* Character Voices */}
      {characters.length > 0 && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-gray-300">
            Characters ({characters.length})
          </label>
          
          <div className="space-y-3">
            {characters.map((character) => {
              const assignedVoice = voiceAssignments.characters[character.name] || voiceAssignments.narrator
              
              return (
                <div key={character.name} className="space-y-2">
                  <div className="text-xs font-medium text-gray-400">
                    {character.name}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={assignedVoice}
                      onChange={(e) => onUpdateCharacter(character.name, e.target.value)}
                      className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {voices.map(voice => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handlePreview(assignedVoice)}
                      className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-colors"
                      title="Preview voice"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Narration Voice */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Narration
        </label>
        <div className="flex gap-2">
          <select
            value={voiceAssignments.voiceover}
            onChange={(e) => onUpdateVoiceover(e.target.value)}
            className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {voices.map(voice => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => handlePreview(voiceAssignments.voiceover)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-colors"
            title="Preview voice"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Voice for scene narration
        </p>
      </div>

      {/* Help Text */}
      <div className="pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 space-y-2">
          <p>💡 <strong>Tip:</strong> Assign different voices to characters for better dialogue distinction.</p>
          <p>🎙️ Currently using Google Studio voices for premium quality.</p>
        </div>
      </div>
    </div>
  )
}

