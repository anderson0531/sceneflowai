import React from 'react'

export function BlueprintTopbar({ creditEstimate }: { creditEstimate?: string }) {
  return (
    <div className="w-full mb-3 sm:mb-4 flex items-center justify-between bg-gray-900/50 border border-gray-700/50 rounded-lg px-4 py-3">
      <div>
        <div className="text-lg sm:text-xl font-bold text-white">The Blueprint</div>
        <div className="text-xs text-gray-400">Describe your project vision. AI will draft a treatment and assets.</div>
      </div>
      {creditEstimate && (
        <div className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700/70">{creditEstimate}</div>
      )}
    </div>
  )
}


