import { BlueprintFrame } from '@/types/blueprint-storyboard'
import { Button } from '@/components/ui/Button'

export function BlueprintStoryboard({ frames, onEdit }: { frames: BlueprintFrame[]; onEdit?: (frame: BlueprintFrame)=>void }) {
  const total = frames.reduce((s, f) => s + (f.durationSec || 0), 0)
  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-400">{frames.length} frames • {total}s total</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {frames.map(frame => (
          <div key={frame.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Optional image preview */}
            {frame.imageUrl ? (
              <div className="aspect-video w-full bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={frame.imageUrl} alt={frame.slugline || 'Frame'} className="w-full h-full object-cover" />
              </div>
            ) : null}

            <div className="p-5">
              {frame.slugline && <div className="text-xs font-mono text-gray-500 mb-2">{frame.slugline}</div>}
              <div className="text-[12px] uppercase tracking-wide text-gray-500">Shot</div>
              <div className="text-lg font-semibold text-gray-900 mb-3">{frame.shot}</div>

              <div className="text-[12px] uppercase tracking-wide text-gray-500">Description</div>
              <div className="text-gray-800 mb-3 leading-relaxed">{frame.description}</div>

              <div className="text-[12px] uppercase tracking-wide text-gray-500">Image Prompt</div>
              <div className="text-gray-800 mb-4 break-words">{frame.imagePrompt}</div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Audio</div>
                  <div className="text-gray-800">{frame.audioCues}</div>
                </div>
                <div>
                  <div className="text-gray-500">Duration</div>
                  <div className="text-gray-800">{frame.durationSec}s</div>
                </div>
                <div>
                  <div className="text-gray-500">Mood</div>
                  <div className="text-gray-800">{frame.mood || '—'}</div>
                </div>
              </div>

              {(frame.camera || frame.lighting) && (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  {frame.camera && <div><div className="text-gray-500">Camera</div><div className="text-gray-800">{frame.camera}</div></div>}
                  {frame.lighting && <div><div className="text-gray-500">Lighting</div><div className="text-gray-800">{frame.lighting}</div></div>}
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={()=> navigator.clipboard.writeText(frame.imagePrompt)}>Copy Prompt</Button>
                <Button variant="outline" size="sm">Generate Image</Button>
                {onEdit && <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={()=>onEdit(frame)}>Refine</Button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


