'use client'

import React from 'react'
import { X, Subtitles, Download, Loader, Globe } from 'lucide-react'

interface MobileMenuSheetProps {
  open: boolean
  onClose: () => void
  showCaptions: boolean
  onToggleCaptions: () => void
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  onDownloadMP4: () => void
  isRendering: boolean
  supportedLanguages: Array<{ code: string; name: string }>
}

export function MobileMenuSheet({
  open,
  onClose,
  showCaptions,
  onToggleCaptions,
  selectedLanguage,
  onLanguageChange,
  onDownloadMP4,
  isRendering,
  supportedLanguages
}: MobileMenuSheetProps) {
  if (!open) return null

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
          
          {/* MP4 Download */}
          <button
            onClick={() => {
              onDownloadMP4()
              onClose()
            }}
            disabled={isRendering}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
          >
            {isRendering ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span className="text-base font-medium">Rendering...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span className="text-base font-medium">Export to MP4</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

