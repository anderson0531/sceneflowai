import { FilmTreatmentData } from '@/lib/types/reports'
import React from 'react'

interface RendererProps {
  data: FilmTreatmentData
}

export const TreatmentRenderer = React.forwardRef<HTMLDivElement, RendererProps>(({ data }, ref) => {
  return (
    <div ref={ref} className="report-container p-8 font-serif text-gray-900 bg-white">
      <h1 className="text-3xl font-bold text-center mb-2">{data.title || 'Untitled'}</h1>
      {data.author_writer && <p className="text-center text-gray-600 mb-1">by {data.author_writer}</p>}
      {data.date && <p className="text-center text-gray-500 text-sm mb-10">{data.date}</p>}
      
      {data.logline && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-1 mb-4">Logline</h2>
          <p className="italic">{data.logline}</p>
        </section>
      )}
      
      {data.synopsis && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-1 mb-4">Synopsis</h2>
          <p className="whitespace-pre-wrap">{data.synopsis}</p>
        </section>
      )}
      
      {data.character_descriptions && data.character_descriptions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-1 mb-4">Characters</h2>
          {data.character_descriptions.map((char, index) => (
            <div key={index} className="mb-4">
              <h3 className="font-bold uppercase">{char.name}</h3>
              {char.role && <p className="text-sm text-gray-600 italic">{char.role}</p>}
              {char.description && <p className="mt-1">{char.description}</p>}
            </div>
          ))}
        </section>
      )}
      
      {data.beats && data.beats.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-1 mb-4">Story Beats</h2>
          <ol className="list-decimal pl-5">
            {data.beats.map((beat, index) => (
              <li key={index} className="mb-3">
                <strong>{beat.title}</strong>
                {beat.minutes && <span className="text-gray-600"> ({beat.minutes} min)</span>}
                {beat.synopsis && <p className="mt-1">{beat.synopsis}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
      
      {data.visual_style && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-1 mb-4">Visual Style</h2>
          <p>{data.visual_style}</p>
        </section>
      )}
      
      {data.tone && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-1 mb-4">Tone</h2>
          <p>{data.tone}</p>
        </section>
      )}
    </div>
  )
})

TreatmentRenderer.displayName = 'TreatmentRenderer'

