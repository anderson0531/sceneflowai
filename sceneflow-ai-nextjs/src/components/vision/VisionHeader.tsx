'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Users, Camera, Save, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface VisionHeaderProps {
  project: any
  activePanel: 'script' | 'characters' | 'scenes'
  onPanelChange: (panel: 'script' | 'characters' | 'scenes') => void
}

export function VisionHeader({ project, activePanel, onPanelChange }: VisionHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/studio/new-project" 
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project?.title || 'Vision'}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Script & Visual Development</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save Draft</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button className="bg-sf-primary text-white hover:bg-sf-accent flex items-center gap-2">
            <span>Continue to Direction</span>
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </Button>
        </div>
      </div>
      
      {/* Panel Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'script' as const, label: 'Script', icon: FileText },
          { id: 'characters' as const, label: 'Characters', icon: Users },
          { id: 'scenes' as const, label: 'Scenes', icon: Camera }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onPanelChange(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activePanel === id
                ? 'bg-sf-primary text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

