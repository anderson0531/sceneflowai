'use client'

import { useEffect, useRef } from 'react'
import { Mic, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface DictationTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  rows?: number
  disabled?: boolean
}

export function DictationTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 5,
  disabled = false,
}: DictationTextareaProps) {
  const {
    supported: sttSupported,
    isSecure,
    isRecording,
    transcript,
    error: micError,
    start,
    stop,
    setTranscript,
  } = useSpeechRecognition()

  const baseRef = useRef('')

  useEffect(() => {
    if (!transcript) return
    const base = baseRef.current.trim()
    onChange(base ? `${base} ${transcript}` : transcript)
  }, [transcript, onChange])

  // A field that goes read-only mid-utterance would keep appending transcript
  // it can no longer show, so stop the recogniser with it.
  useEffect(() => {
    if (disabled && isRecording) stop()
  }, [disabled, isRecording, stop])

  const handleMicClick = () => {
    if (!sttSupported || !isSecure || disabled) return

    if (isRecording) {
      stop()
      baseRef.current = value
      setTranscript('')
    } else {
      baseRef.current = value
      setTranscript('')
      start()
    }
  }

  const showMic = sttSupported && isSecure

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn('pr-10 resize-none', className)}
        />
        {showMic && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={disabled}
            aria-label={isRecording ? 'Stop dictation' : 'Start dictation'}
            className={cn(
              'absolute right-2 top-2 p-1.5 rounded-md transition-colors',
              isRecording
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              disabled && 'opacity-40 pointer-events-none'
            )}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
      </div>
      {isRecording && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Listening… speak your instructions, then tap stop.
        </p>
      )}
      {micError && !isRecording && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Microphone: {micError}</p>
      )}
    </div>
  )
}
