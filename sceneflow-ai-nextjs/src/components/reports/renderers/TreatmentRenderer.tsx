import { FilmTreatmentData } from '@/lib/types/reports'
import React from 'react'

interface RendererProps {
  data: FilmTreatmentData
}

export const TreatmentRenderer = React.forwardRef<HTMLDivElement, RendererProps>(({ data }, ref) => {
  return (
    <div ref={ref} className="report-wrapper">
      <style>{`
        @media print {
          @page {
            size: letter;
            margin: 0.75in 1in 0.75in 1in;
          }
          
          .report-header {
            display: flex;
            justify-content: space-between;
            width: 100%;
            font-size: 10pt;
            color: #666 !important;
            margin-bottom: 0.5in;
          }
          
          .report-footer {
            display: flex;
            justify-content: space-between;
            width: 100%;
            font-size: 10pt;
            color: #666 !important;
            margin-top: 0.5in;
          }
          
          .print-only {
            display: none;
          }
        }
        
        @media print {
          .print-only {
            display: block;
          }
        }
      `}</style>
      <div className="print-only report-header">
        <span>{data.title || 'Untitled'}</span>
        <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <div className="report-container p-8 font-serif !text-gray-900 bg-white">
        <h1 className="text-3xl font-bold text-center mb-2 !text-black">{data.title || 'Untitled'}</h1>
      {data.author_writer && <p className="text-center !text-gray-600 mb-1">by {data.author_writer}</p>}
      
      {data.logline && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b border-gray-300 pb-1 mb-4 !text-black">Logline</h2>
          <p className="italic !text-gray-900">{data.logline}</p>
        </section>
      )}
      
      {data.synopsis && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b border-gray-300 pb-1 mb-4 !text-black">Synopsis</h2>
          <p className="whitespace-pre-wrap !text-gray-900">{data.synopsis}</p>
        </section>
      )}
      
      {data.character_descriptions && data.character_descriptions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b border-gray-300 pb-1 mb-4 !text-black">Characters</h2>
          {data.character_descriptions.map((char, index) => (
            <div key={index} className="mb-4">
              <h3 className="font-bold uppercase !text-black">{char.name}</h3>
              {char.role && <p className="text-sm !text-gray-600 italic">{char.role}</p>}
              {char.description && <p className="mt-1 !text-gray-900">{char.description}</p>}
            </div>
          ))}
        </section>
      )}
      
      {data.beats && data.beats.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b border-gray-300 pb-1 mb-4 !text-black">Story Beats</h2>
          <ol className="list-decimal pl-5 !text-gray-900">
            {data.beats.map((beat, index) => (
              <li key={index} className="mb-3 !text-gray-900">
                <strong className="!text-black">{beat.title}</strong>
                {beat.minutes && <span className="!text-gray-600"> ({beat.minutes} min)</span>}
                {beat.synopsis && <p className="mt-1 !text-gray-900">{beat.synopsis}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
      
      {data.visual_style && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b border-gray-300 pb-1 mb-4 !text-black">Visual Style</h2>
          <p className="!text-gray-900">{data.visual_style}</p>
        </section>
      )}
      
      {data.tone && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b border-gray-300 pb-1 mb-4 !text-black">Tone</h2>
          <p className="!text-gray-900">{data.tone}</p>
        </section>
      )}
      </div>
      <div className="print-only report-footer">
        <span>SceneFlow AI: Accelerate Your Vision</span>
        <span>Page <span className="page-number"></span></span>
      </div>
    </div>
  )
})

TreatmentRenderer.displayName = 'TreatmentRenderer'

