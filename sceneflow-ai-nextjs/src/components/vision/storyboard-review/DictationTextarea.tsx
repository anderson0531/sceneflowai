'use client'

import { useEffect } from 'react'
import { Mic, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface DictationTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  rows?: number
}

export function DictationTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 5,
}: DictationTextareaProps) {
  const {
    supported: sttSupported,
    isRecording,
    transcript,
    error: micError,
    start,
    stop,
    setTranscript,
  } = useSpeechRecognition()

  useEffect(() => {
    if (!isRecording && transcript && transcript !== value) {
      onChange(transcript)
    }
  }, [isRecording, transcript, onChange, value])

  const handleMicClick = () => {
    if (isRecording) {
      stop()
      if (transcript) onChange(transcript)
    } else {
      setTranscript(value)
      start()
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full bg-gray-800 border border-gray-700 rounded-md p-3 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none min-h-[120px]"
        />
        {sttSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            aria-label={isRecording ? 'Stop dictation' : 'Start dictation'}
            className={cn(
              'absolute right-2 top-2 p-1.5 rounded-md transition-colors',
              isRecording
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
            )}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
      </div>
      {isRecording && (
        <p className="text-xs text-emerald-400">Listening… speak your feedback, then tap stop.</p>
      )}
      {micError && !isRecording && (
        <p className="text-xs text-amber-400">Microphone: {micError}</p>
      )}
    </div>
  )
}
