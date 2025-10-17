'use client'

import React from 'react'
import { Volume2, VolumeX } from 'lucide-react'

interface VolumeSliderProps {
  label: string
  value: number  // 0-1
  onChange: (value: number) => void
  className?: string
}

export function VolumeSlider({ label, value, onChange, className = '' }: VolumeSliderProps) {
  const percentage = Math.round(value * 100)
  const isMuted = value === 0

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 min-w-[100px]">
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-gray-400" />
        ) : (
          <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="100"
          value={percentage}
          onChange={(e) => onChange(parseInt(e.target.value) / 100)}
          className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
          }}
        />
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 min-w-[40px] text-right">
          {percentage}%
        </span>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  )
}

