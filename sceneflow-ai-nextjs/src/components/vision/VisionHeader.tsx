'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Users, Camera, Save, Share2, Copy, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface VisionHeaderProps {
  project: any
  activePanel: 'script' | 'characters' | 'scenes'
  onPanelChange: (panel: 'script' | 'characters' | 'scenes') => void
}

export function VisionHeader({ project, activePanel, onPanelChange }: VisionHeaderProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)
    try {
      const response = await fetch('/api/vision/create-share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })

      const data = await response.json()
      if (data.success) {
        setShareUrl(data.shareUrl)
      } else {
        throw new Error(data.error || 'Failed to create share link')
      }
    } catch (error) {
      console.error('[Share] Error:', error)
      alert('Failed to create share link. Please try again.')
    } finally {
      setIsSharing(false)
    }
  }

  const copyToClipboard = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('[Copy] Error:', error)
        alert('Failed to copy link. Please copy manually.')
      }
    }
  }

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
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleShare}
            disabled={isSharing}
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isSharing ? 'Creating Link...' : 'Share'}
            </span>
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

      {/* Share Modal */}
      {shareUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Share Screening Room
              </h3>
              <button
                onClick={() => setShareUrl(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Anyone with this link can view your Screening Room presentation. 
              They won't need a Sceneflow account.
            </p>
            
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>• Viewers can watch with full audio and translations</p>
              <p>• They cannot edit or download your project</p>
              <p>• You can disable this link anytime</p>
            </div>
            
            <button
              onClick={() => setShareUrl(null)}
              className="w-full mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

