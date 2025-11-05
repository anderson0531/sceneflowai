'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'

interface ProjectLimits {
  canCreateProject: boolean
  currentProjects: number
  maxProjects: number | null
}

export function ProjectLimitBanner({ userId }: { userId: string }) {
  const [limits, setLimits] = useState<ProjectLimits | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    
    const fetchLimits = async () => {
      try {
        const res = await fetch('/api/subscription/limits')
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.limits?.projects) {
            setLimits(data.limits.projects)
          }
        }
      } catch (error) {
        console.error('Failed to fetch limits:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchLimits()
  }, [userId])
  
  if (loading || !limits || !limits.maxProjects || dismissed) {
    return null
  }
  
  const isNearLimit = limits.currentProjects >= limits.maxProjects - 1
  const isAtLimit = !limits.canCreateProject
  
  if (!isNearLimit && !isAtLimit) {
    return null
  }
  
  return (
    <div className={`border-l-4 p-4 mb-4 rounded-r-lg ${
      isAtLimit 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-400' 
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-400'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <AlertCircle className={`h-5 w-5 mt-0.5 mr-3 ${
            isAtLimit ? 'text-red-400' : 'text-amber-400'
          }`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              isAtLimit ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'
            }`}>
              {isAtLimit 
                ? `Project limit reached (${limits.currentProjects}/${limits.maxProjects})`
                : `Approaching project limit (${limits.currentProjects}/${limits.maxProjects})`
              }
            </p>
            <p className={`text-sm mt-1 ${
              isAtLimit ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
            }`}>
              {isAtLimit
                ? 'You\'ve reached the maximum number of active projects for your plan. '
                : 'You\'re approaching the maximum number of active projects. '
              }
              <a 
                href="/pricing" 
                className="font-medium underline hover:no-underline"
              >
                Upgrade to Starter
              </a>
              {' '}for unlimited projects.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`ml-4 flex-shrink-0 ${
            isAtLimit ? 'text-red-400 hover:text-red-600' : 'text-amber-400 hover:text-amber-600'
          }`}
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
