import { SceneDirectionData } from '@/lib/types/reports'
import React from 'react'

interface RendererProps {
  data: SceneDirectionData
}

export const SceneDirectionRenderer = React.forwardRef<HTMLDivElement, RendererProps>(({ data }, ref) => {
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
        <h1 className="text-3xl font-bold text-center mb-10 !text-black">{data.title} - Scene Direction</h1>
      
      {data.scenes.map((scene, index) => (
        <div key={index} className="mb-8 pb-6 border-b border-gray-300 print:break-inside-avoid">
          <h2 className="text-xl font-bold mb-3 !text-black">Scene {scene.sceneNumber}</h2>
          {scene.heading && <p className="font-semibold mb-2 !text-black">{scene.heading}</p>}
          
          {scene.visualDescription && (
            <p className="mb-4 whitespace-pre-wrap !text-gray-900">{scene.visualDescription}</p>
          )}
          
          {/* Legacy simple fields (for backward compatibility) */}
          {(scene.shotType || scene.cameraAngle || scene.lighting || scene.mood || scene.duration) && (
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
          )}
          
          {/* Detailed Scene Direction */}
          {scene.sceneDirection && (
            <div className="space-y-4 mt-4">
              {/* Camera */}
              {scene.sceneDirection.camera && (
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="text-lg font-bold mb-3 !text-black">Camera</h3>
                  <div className="space-y-2 text-sm">
                    {scene.sceneDirection.camera.shots && scene.sceneDirection.camera.shots.length > 0 && (
                      <div>
                        <strong className="!text-gray-700">Shots: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.camera.shots.join(', ')}</span>
                      </div>
                    )}
                    {scene.sceneDirection.camera.angle && (
                      <div>
                        <strong className="!text-gray-700">Angle: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.camera.angle}</span>
                      </div>
                    )}
                    {scene.sceneDirection.camera.movement && (
                      <div>
                        <strong className="!text-gray-700">Movement: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.camera.movement}</span>
                      </div>
                    )}
                    {scene.sceneDirection.camera.lensChoice && (
                      <div>
                        <strong className="!text-gray-700">Lens Choice: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.camera.lensChoice}</span>
                      </div>
                    )}
                    {scene.sceneDirection.camera.focus && (
                      <div>
                        <strong className="!text-gray-700">Focus: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.camera.focus}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Lighting */}
              {scene.sceneDirection.lighting && (
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="text-lg font-bold mb-3 !text-black">Lighting</h3>
                  <div className="space-y-2 text-sm">
                    {scene.sceneDirection.lighting.overallMood && (
                      <div>
                        <strong className="!text-gray-700">Overall Mood: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.lighting.overallMood}</span>
                      </div>
                    )}
                    {scene.sceneDirection.lighting.timeOfDay && (
                      <div>
                        <strong className="!text-gray-700">Time of Day: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.lighting.timeOfDay}</span>
                      </div>
                    )}
                    {scene.sceneDirection.lighting.keyLight && (
                      <div>
                        <strong className="!text-gray-700">Key Light: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.lighting.keyLight}</span>
                      </div>
                    )}
                    {scene.sceneDirection.lighting.fillLight && (
                      <div>
                        <strong className="!text-gray-700">Fill Light: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.lighting.fillLight}</span>
                      </div>
                    )}
                    {scene.sceneDirection.lighting.backlight && (
                      <div>
                        <strong className="!text-gray-700">Backlight/Rim Light: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.lighting.backlight}</span>
                      </div>
                    )}
                    {scene.sceneDirection.lighting.practicals && (
                      <div>
                        <strong className="!text-gray-700">Practicals: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.lighting.practicals}</span>
                      </div>
                    )}
                    {scene.sceneDirection.lighting.colorTemperature && (
                      <div>
                        <strong className="!text-gray-700">Color Temperature: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.lighting.colorTemperature}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Scene */}
              {scene.sceneDirection.scene && (
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="text-lg font-bold mb-3 !text-black">Scene (Art Dept. & Set Dressing)</h3>
                  <div className="space-y-2 text-sm">
                    {scene.sceneDirection.scene.location && (
                      <div>
                        <strong className="!text-gray-700">Location: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.scene.location}</span>
                      </div>
                    )}
                    {scene.sceneDirection.scene.keyProps && scene.sceneDirection.scene.keyProps.length > 0 && (
                      <div>
                        <strong className="!text-gray-700">Key Props: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.scene.keyProps.join(', ')}</span>
                      </div>
                    )}
                    {scene.sceneDirection.scene.atmosphere && (
                      <div>
                        <strong className="!text-gray-700">Atmosphere: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.scene.atmosphere}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Talent */}
              {scene.sceneDirection.talent && (
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="text-lg font-bold mb-3 !text-black">Talent (Actor Direction & Blocking)</h3>
                  <div className="space-y-2 text-sm">
                    {scene.sceneDirection.talent.blocking && (
                      <div>
                        <strong className="!text-gray-700">Blocking: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.talent.blocking}</span>
                      </div>
                    )}
                    {scene.sceneDirection.talent.keyActions && scene.sceneDirection.talent.keyActions.length > 0 && (
                      <div>
                        <strong className="!text-gray-700">Key Actions: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.talent.keyActions.join(', ')}</span>
                      </div>
                    )}
                    {scene.sceneDirection.talent.emotionalBeat && (
                      <div>
                        <strong className="!text-gray-700">Emotional Beat: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.talent.emotionalBeat}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Audio */}
              {scene.sceneDirection.audio && (
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="text-lg font-bold mb-3 !text-black">Audio (Production Sound)</h3>
                  <div className="space-y-2 text-sm">
                    {scene.sceneDirection.audio.priorities && (
                      <div>
                        <strong className="!text-gray-700">Priorities: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.audio.priorities}</span>
                      </div>
                    )}
                    {scene.sceneDirection.audio.considerations && (
                      <div>
                        <strong className="!text-gray-700">Considerations: </strong>
                        <span className="!text-gray-900">{scene.sceneDirection.audio.considerations}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      </div>
      <div className="report-footer">
        <span>SceneFlow AI: Accelerate Your Vision</span>
        <span>Page <span className="page-number"></span></span>
      </div>
    </div>
  )
})

SceneDirectionRenderer.displayName = 'SceneDirectionRenderer'

