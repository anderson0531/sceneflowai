'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useOverlayStore } from '../store/useOverlayStore'

const ProcessingOverlay = () => {
  const { isVisible, message, estimatedDuration, startTime } = useOverlayStore()
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isVisible && startTime && estimatedDuration > 0) {
      document.body.style.overflow = 'hidden'
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const estimatedMs = estimatedDuration * 1000
        const pct = Math.min((elapsed / estimatedMs) * 100, 99)
        setProgress(pct)
        if (pct >= 99 && intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }, 100)
    } else {
      setProgress(0)
      document.body.style.overflow = 'auto'
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      document.body.style.overflow = 'auto'
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isVisible, startTime, estimatedDuration])

  if (!isVisible) return null

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`
    const minutes = (seconds / 60).toFixed(1)
    return `${minutes} minutes`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center mb-4">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Processing Request...</h3>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{message}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Estimated time: {formatTime(estimatedDuration)}. Please do not refresh the page.</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-linear" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-right text-xs mt-1 text-gray-500">{progress.toFixed(1)}% (Estimated)</div>
      </div>
    </div>
  )
}

export default ProcessingOverlay


