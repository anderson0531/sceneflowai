import { StoryboardData } from '@/lib/types/reports'
import React from 'react'

interface RendererProps {
  data: StoryboardData
}

export const StoryboardRenderer = React.forwardRef<HTMLDivElement, RendererProps>(({ data }, ref) => {
  return (
    <div ref={ref} className="report-container p-8 font-sans text-gray-900 bg-white">
      <h1 className="text-3xl font-bold text-center mb-10">{data.title} - Storyboard</h1>
      
      <div className="grid grid-cols-2 gap-6">
        {data.frames.map((frame, index) => (
          <div key={index} className="border p-4 print:break-inside-avoid">
            <h3 className="font-bold mb-2">Scene {frame.sceneNumber}</h3>
            
            {frame.imageUrl && (
              <div className="relative w-full aspect-video bg-gray-100 mb-2">
                <img 
                  src={frame.imageUrl} 
                  alt={`Scene ${frame.sceneNumber}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {frame.visualDescription && (
              <p className="text-sm mb-2">{frame.visualDescription}</p>
            )}
            
            <div className="text-xs text-gray-600 space-y-1">
              {frame.shotType && <p><strong>Shot:</strong> {frame.shotType}</p>}
              {frame.cameraAngle && <p><strong>Camera:</strong> {frame.cameraAngle}</p>}
              {frame.lighting && <p><strong>Lighting:</strong> {frame.lighting}</p>}
              {frame.duration && <p><strong>Duration:</strong> {frame.duration}s</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

StoryboardRenderer.displayName = 'StoryboardRenderer'

