'use client'

import React from 'react'
import { X, Subtitles, Globe, FileText, Upload } from 'lucide-react'

interface MobileMenuSheetProps {
  open: boolean
  onClose: () => void
  showCaptions: boolean
  onToggleCaptions: () => void
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  supportedLanguages: Array<{ code: string; name: string }>
  onExportDialogue?: () => void
  onImportDialogue?: () => void
  exportCopied?: boolean
}

export function MobileMenuSheet({
  open,
  onClose,
  showCaptions,
  onToggleCaptions,
  selectedLanguage,
  onLanguageChange,
  supportedLanguages,
  onExportDialogue,
  onImportDialogue,
  exportCopied
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
          
          {/* Translation Export/Import */}
          {(onExportDialogue || onImportDialogue) && (
            <div className="p-4 rounded-lg bg-amber-900/30 border border-amber-700/50 min-h-[56px]">
              <label className="flex items-center gap-3 mb-3 text-amber-400">
                <Globe className="w-5 h-5" />
                <span className="text-base font-medium">Manual Translation</span>
              </label>
              <p className="text-xs text-amber-200/70 mb-3">Export dialogue, translate via Google Translate, then import</p>
              <div className="flex gap-2">
                {onExportDialogue && (
                  <button
                    onClick={() => { onExportDialogue(); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    {exportCopied ? 'Copied!' : 'Export'}
                  </button>
                )}
                {onImportDialogue && (
                  <button
                    onClick={() => { onImportDialogue(); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

