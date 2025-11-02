import { SceneDirectionData } from '@/lib/types/reports'
import React from 'react'

interface RendererProps {
  data: SceneDirectionData
}

export const SceneDirectionRenderer = React.forwardRef<HTMLDivElement, RendererProps>(({ data }, ref) => {
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
        <span>{data.title}</span>
        <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <div className="report-container p-8 font-sans !text-gray-900 bg-white">
        <h1 className="text-3xl font-bold text-center mb-10 !text-black">{data.title} - Scene Direction</h1>
      
      {data.scenes.map((scene, index) => (
        <div key={index} className="mb-8 pb-6 border-b border-gray-300 print:break-inside-avoid">
          <h2 className="text-xl font-bold mb-3 !text-black">Scene {scene.sceneNumber}</h2>
          {scene.heading && <p className="font-semibold mb-2 !text-black">{scene.heading}</p>}
          
          {scene.visualDescription && (
            <p className="mb-4 whitespace-pre-wrap !text-gray-900">{scene.visualDescription}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            {scene.shotType && (
              <div>
                <strong className="!text-gray-700">Shot Type:</strong>
                <p className="!text-gray-900">{scene.shotType}</p>
              </div>
            )}
            {scene.cameraAngle && (
              <div>
                <strong className="!text-gray-700">Camera Angle:</strong>
                <p className="!text-gray-900">{scene.cameraAngle}</p>
              </div>
            )}
            {scene.lighting && (
              <div>
                <strong className="!text-gray-700">Lighting:</strong>
                <p className="!text-gray-900">{scene.lighting}</p>
              </div>
            )}
            {scene.mood && (
              <div>
                <strong className="!text-gray-700">Mood:</strong>
                <p className="!text-gray-900">{scene.mood}</p>
              </div>
            )}
            {scene.duration && (
              <div>
                <strong className="!text-gray-700">Duration:</strong>
                <p className="!text-gray-900">{scene.duration}s</p>
              </div>
            )}
          </div>
        </div>
      ))}
      </div>
      <div className="print-only report-footer">
        <span>SceneFlow AI: Accelerate Your Vision</span>
        <span>Page <span className="page-number"></span></span>
      </div>
    </div>
  )
})

SceneDirectionRenderer.displayName = 'SceneDirectionRenderer'

