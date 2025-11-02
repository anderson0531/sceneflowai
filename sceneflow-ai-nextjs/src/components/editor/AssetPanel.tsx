'use client';

import { useEditorStore } from '@/store/editorStore';

export function AssetPanel() {
  const { assets } = useEditorStore();
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Assets</h3>
      <div className="space-y-2">
        {assets.map(asset => (
          <div
            key={asset.id}
            className="bg-gray-800 rounded p-2 hover:bg-gray-700 cursor-pointer transition-colors"
          >
            <div className="text-sm text-white font-medium truncate">{asset.title}</div>
            <div className="text-xs text-gray-400 mt-1">
              {asset.type} • {(asset.durationInFrames / 30).toFixed(1)}s
            </div>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="text-gray-400 text-sm text-center py-8">
            No assets loaded
          </div>
        )}
      </div>
    </div>
  );
}

