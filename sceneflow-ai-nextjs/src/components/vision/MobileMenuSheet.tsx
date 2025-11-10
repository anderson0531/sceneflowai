'use client'

import React from 'react'
import { X, Subtitles, CircleDot, Square, Download, Trash2, Loader2, Globe, AlertCircle } from 'lucide-react'

interface MobileMenuSheetProps {
  open: boolean
  onClose: () => void
  showCaptions: boolean
  onToggleCaptions: () => void
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  onStartRecording: () => void
  onStopRecording: () => void
  onSaveRecording: () => void
  onDiscardRecording: () => void
  isRecording: boolean
  isPreparing: boolean
  hasRecording: boolean
  recorderSupported: boolean
  recorderSupportHint: string
  recordingDurationLabel: string
  supportedLanguages: Array<{ code: string; name: string }>
}

export function MobileMenuSheet({
  open,
  onClose,
  showCaptions,
  onToggleCaptions,
  selectedLanguage,
  onLanguageChange,
  onStartRecording,
  onStopRecording,
  onSaveRecording,
  onDiscardRecording,
  isRecording,
  isPreparing,
  hasRecording,
  recorderSupported,
  recorderSupportHint,
  recordingDurationLabel,
  supportedLanguages
}: MobileMenuSheetProps) {
  if (!open) return null

  const showDuration = isRecording || hasRecording
  const handleToggleRecording = () => {
    if (isRecording) {
      onStopRecording()
    } else {
      onStartRecording()
    }
    onClose()
  }
  const handleSaveRecordingClick = () => {
    onSaveRecording()
    onClose()
  }
  const handleDiscardRecordingClick = () => {
    onDiscardRecording()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 bg-gray-900 border-t border-gray-700 rounded-t-2xl z-50 lg:hidden transform transition-transform duration-300 max-h-[80vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Menu</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Menu Items */}
        <div className="p-4 space-y-2">
          {/* Captions Toggle */}
          <button
            onClick={() => {
              onToggleCaptions()
            }}
            className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[56px]"
          >
            <div className="flex items-center gap-3">
              <Subtitles className="w-5 h-5" />
              <span className="text-base font-medium">Captions</span>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors ${
              showCaptions ? 'bg-blue-500' : 'bg-gray-600'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                showCaptions ? 'translate-x-5' : 'translate-x-0.5'
              } mt-0.5`} />
            </div>
          </button>
          
          {/* Language Selector */}
          <div className="p-4 rounded-lg bg-gray-800/50 min-h-[56px]">
            <label className="flex items-center gap-3 mb-2 text-white">
              <Globe className="w-5 h-5" />
              <span className="text-base font-medium">Language</span>
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                onLanguageChange(e.target.value)
              }}
              className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-base"
            >
              {supportedLanguages.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-gray-800 text-white">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Screen Recording */}
          <div className="p-4 rounded-lg bg-gray-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-white">Screen Recording</span>
              {showDuration && (
                <span className={`text-sm tabular-nums ${isRecording ? 'text-rose-300' : 'text-gray-300'}`}>
                  {recordingDurationLabel}
                </span>
              )}
            </div>
            <button
              onClick={handleToggleRecording}
              disabled={isPreparing || (!recorderSupported && !isRecording)}
              className={`w-full flex items-center justify-center gap-3 p-4 rounded-lg transition-colors min-h-[56px] ${
                isRecording ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-700'
              } ${(!recorderSupported && !isRecording) || isPreparing ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isPreparing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-base font-medium">Preparing…</span>
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-5 h-5" />
                  <span className="text-base font-medium">Stop Recording</span>
                </>
              ) : (
                <>
                  <CircleDot className="w-5 h-5 text-rose-200" />
                  <span className="text-base font-medium">Record Playback</span>
                </>
              )}
            </button>
            {!recorderSupported && !isRecording && (
              <div className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-100 px-3 py-3 text-sm">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <span>{recorderSupportHint}</span>
              </div>
            )}
            {hasRecording && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveRecordingClick}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-base font-medium">Save</span>
                </button>
                <button
                  onClick={handleDiscardRecordingClick}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-base font-medium">Discard</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

