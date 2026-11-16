'use client'

import { useEffect, useRef } from 'react'
import { Mic, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface DictationTextareaProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  rows?: number
  disabled?: boolean
  /** BCP-47 or ISO language code for multilingual speech recognition (e.g. 'en', 'es', 'pt', 'hi', 'zh-CN', 'ar', 'th') */
  lang?: string
  /** Optional text direction ('ltr' | 'rtl'); auto-inferred as 'rtl' for Arabic when omitted */
  dir?: 'ltr' | 'rtl'
  listeningHint?: string
  startLabel?: string
  stopLabel?: string
}

export function DictationTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  rows = 5,
  disabled = false,
  lang,
  dir,
  listeningHint,
  startLabel,
  stopLabel,
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
  } = useSpeechRecognition({ lang })

  const effectiveDir =
    dir ?? (lang && /^(?:ar|he|fa|ur)(?:[-_]|$)/i.test(lang.trim()) ? 'rtl' : undefined)
  const isRtl = effectiveDir === 'rtl'

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
    <div dir={effectiveDir} className="flex flex-col gap-1.5">
      <div className="relative">
        <Textarea
          dir={effectiveDir}
          lang={lang}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn(isRtl ? 'pl-10' : 'pr-10', 'resize-none', className)}
        />
        {showMic && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={disabled}
            title={isRecording ? stopLabel || 'Stop dictation' : startLabel || 'Start dictation'}
            aria-label={isRecording ? stopLabel || 'Stop dictation' : startLabel || 'Start dictation'}
            className={cn(
              'absolute top-2 p-1.5 rounded-md transition-colors',
              isRtl ? 'left-2' : 'right-2',
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
          {listeningHint || 'Listening… speak naturally, then tap stop.'}
        </p>
      )}
      {micError && !isRecording && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Microphone: {micError}</p>
      )}
    </div>
  )
}
