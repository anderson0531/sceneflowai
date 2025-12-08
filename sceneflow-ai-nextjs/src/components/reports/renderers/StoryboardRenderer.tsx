import { StoryboardData } from '@/lib/types/reports'
import React from 'react'

interface RendererProps {
  data: StoryboardData
}

export const StoryboardRenderer = React.forwardRef<HTMLDivElement, RendererProps>(({ data }, ref) => {
  return (
    <div ref={ref} className="report-wrapper">
      <style>{`
        /* Header and footer styles - visible by default for preview */
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
        
        @media print {
          @page {
            size: letter;
            margin: 0.75in 1in 0.75in 1in;
          }
        }
      `}</style>
      <div className="report-header">
        <span>{data.title}</span>
        <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <div className="report-container p-8 font-sans !text-gray-900 bg-white">
        <h1 className="text-3xl font-bold text-center mb-10 !text-black">{data.title} - Storyboard</h1>
      
      <div className="grid grid-cols-2 gap-6">
        {data.frames.map((frame, index) => (
          <div key={`${index}-${frame.imageUrl || 'no-image'}`} className="border border-gray-300 p-4 print:break-inside-avoid">
            <h3 className="font-bold mb-2 !text-black">Scene {frame.sceneNumber}</h3>
            
            {frame.imageUrl && (
              <div className="relative w-full aspect-video bg-gray-100 mb-2">
                <img 
                  src={frame.imageUrl} 
                  alt={`Scene ${frame.sceneNumber}`}
                  className="w-full h-full object-cover"
                  key={frame.imageUrl}
                />
              </div>
            )}
            
            {frame.visualDescription && (
              <p className="text-sm mb-2 !text-gray-900">{frame.visualDescription}</p>
            )}
            
            <div className="text-xs !text-gray-600 space-y-1">
              {frame.shotType && <p><strong className="!text-black">Shot:</strong> {frame.shotType}</p>}
              {frame.cameraAngle && <p><strong className="!text-black">Camera:</strong> {frame.cameraAngle}</p>}
              {frame.lighting && <p><strong className="!text-black">Lighting:</strong> {frame.lighting}</p>}
              {frame.duration && <p><strong className="!text-black">Duration:</strong> {frame.duration}s</p>}
            </div>
          </div>
        ))}
      </div>
      </div>
      <div className="report-footer">
        <span>SceneFlow AI: Accelerate Your Vision</span>
        <span>Page <span className="page-number"></span></span>
      </div>
    </div>
  )
})

StoryboardRenderer.displayName = 'StoryboardRenderer'

