'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Play, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type LanguageId = 'en' | 'es' | 'pt' | 'hi' | 'zh'

interface ScreeningRoomPreviewProps {
  previewTitle: string
}

export function ScreeningRoomPreview({ previewTitle }: ScreeningRoomPreviewProps) {
  const t = useTranslations('screeningRoom')
  const [activeLang, setActiveLang] = useState<LanguageId>('en')
  const [activeStep, setActiveStep] = useState(1)

  const languages = t.raw('languages') as Array<{
    id: LanguageId
    label: string
    flag: string
  }>
  const steps = t.raw('steps') as Array<{ id: string; label: string }>

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 overflow-hidden shadow-xl">
      <div className="border-b border-slate-700/50 px-5 py-3 bg-slate-800/40">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 border border-indigo-500/25 px-3 py-1 text-xs font-medium text-indigo-200">
          {t('badge')}
        </span>
      </div>

      <div className="p-5 lg:p-6 space-y-5">
        <div>
          <p className="text-xs text-slate-400 mb-2">{t('languagePrompt')}</p>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setActiveLang(lang.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  activeLang === lang.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-indigo-500/40 hover:text-white'
                )}
              >
                <span>{lang.label}</span>
                <span aria-hidden>{lang.flag}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 text-xs">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveStep(index)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 transition-colors text-left',
                  activeStep === index
                    ? 'text-indigo-300 font-semibold'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <span className="text-slate-500 mr-1">{index + 1}.</span>
                {step.label}
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" aria-hidden />
              )}
            </div>
          ))}
        </div>

        <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-700/50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${previewTitle}-${activeLang}-${activeStep}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <p className="text-[10px] uppercase tracking-widest text-indigo-400/80">
                  {t('previewLabel')} · {languages.find((l) => l.id === activeLang)?.label}
                </p>
                <h4 className="text-lg md:text-xl font-semibold text-white max-w-md">
                  {previewTitle}
                </h4>
                <p className="text-sm text-slate-400 max-w-sm">
                  {steps[activeStep]?.label}
                </p>
              </motion.div>
            </AnimatePresence>
            <button
              type="button"
              className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/80 text-white hover:bg-indigo-500 transition-colors"
              aria-label="Play preview"
            >
              <Play className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScreeningRoomPreview
