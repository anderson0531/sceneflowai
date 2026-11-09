'use client'

import { AlertTriangle, LifeBuoy } from 'lucide-react'
import { evaluateGenerationError } from '@/lib/errors/generationErrorIntelligence'
import { openSupportErrorReport } from '@/components/vision/ReportGenerationErrorDialog'

export const ImageErrorPlaceholder = ({ error }: { error: string }) => {
  const evaluated = evaluateGenerationError({ mediaType: 'still', rawError: error })
  return (
    <div className="w-full h-48 rounded-t-xl overflow-hidden bg-red-900/20 flex flex-col items-center justify-center text-center p-4 border-b border-red-700">
      <AlertTriangle className="w-7 h-7 text-red-400 mb-2" />
      <p className="text-sm font-semibold text-red-200">{evaluated.title}</p>
      <p className="text-xs text-red-300/90 mt-1 max-w-xs">{evaluated.explanation}</p>
      {evaluated.canReportToSupport && (
        <button
          type="button"
          onClick={() =>
            openSupportErrorReport({
              mediaType: 'still',
              rawError: error,
              technicalDetails: error,
              title: evaluated.title,
              explanation: evaluated.explanation,
            })
          }
          className="mt-2.5 inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-900/50"
        >
          <LifeBuoy className="h-3 w-3" />
          Report to Support
        </button>
      )}
    </div>
  )
}
