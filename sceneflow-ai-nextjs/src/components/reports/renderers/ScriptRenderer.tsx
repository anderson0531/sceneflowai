import { ScriptData } from '@/lib/types/reports'
import React from 'react'

interface RendererProps {
  data: ScriptData
}

export const ScriptRenderer = React.forwardRef<HTMLDivElement, RendererProps>(({ data }, ref) => {
  return (
    <div ref={ref} className="report-container script-format p-8 font-mono text-black bg-white text-sm">
      <div className="text-center mb-12">
        <h1 className="text-2xl underline">{data.title?.toUpperCase() || 'UNTITLED'}</h1>
        {data.author && <p className="mt-2">by {data.author}</p>}
      </div>
      
      {data.script?.scenes?.map((scene, sIndex) => (
        <div key={sIndex} className="mb-6 print:break-inside-avoid">
          {/* Scene Heading */}
          {scene.heading && (
            <h2 className="font-bold mb-2">
              {typeof scene.heading === 'string' ? scene.heading.toUpperCase() : scene.heading.text.toUpperCase()}
            </h2>
          )}
          
          {/* Visual Description / Action */}
          {scene.visualDescription && (
            <p className="mb-4 whitespace-pre-wrap">{scene.visualDescription}</p>
          )}
          {scene.action && (
            <p className="mb-4 whitespace-pre-wrap">{scene.action}</p>
          )}
          
          {/* Dialogue */}
          {scene.dialogue?.map((d, dIndex) => (
            <div key={dIndex} className="mb-4">
              <p className="mt-4 mb-0 ml-[35%]">{d.character.toUpperCase()}</p>
              {d.parenthetical && (
                <p className="mb-0 ml-[30%]">({d.parenthetical})</p>
              )}
              <p className="mb-0 ml-[25%] mr-[15%] whitespace-pre-wrap">{d.text}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
})

ScriptRenderer.displayName = 'ScriptRenderer'

