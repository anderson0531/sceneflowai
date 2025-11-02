'use client';

import { useEditorStore } from '@/store/editorStore';

export function EffectsPanel() {
  const { tracks } = useEditorStore();
  
  const allClips = tracks.flatMap(track => track.clips);
  const clipsWithEffects = allClips.filter(clip => clip.effects.length > 0);
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Effects</h3>
      <div className="space-y-2">
        {clipsWithEffects.map(clip => (
          <div
            key={clip.id}
            className="bg-gray-800 rounded p-2 hover:bg-gray-700 transition-colors"
          >
            <div className="text-sm text-white font-medium truncate">{clip.id}</div>
            <div className="text-xs text-gray-400 mt-1">
              {clip.effects.map(e => e.type).join(', ')}
            </div>
          </div>
        ))}
        {clipsWithEffects.length === 0 && (
          <div className="text-gray-400 text-sm text-center py-8">
            No effects applied
          </div>
        )}
      </div>
    </div>
  );
}

