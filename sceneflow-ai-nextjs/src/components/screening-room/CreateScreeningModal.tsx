/**
 * Create Screening Modal
 * 
 * Modal for creating new screening sessions with options for:
 * - Title and description
 * - Access type (public, password, invite-only)
 * - Expiration date
 * - Feedback settings (emoji, biometrics, demographics)
 * - Viewer limits
 * 
 * @see /api/screening for API integration
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Copy,
  Check,
  Link2,
  Lock,
  Globe,
  Users,
  Calendar,
  Camera,
  Smile,
  UserCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface ProjectOption {
  id: string
  title: string
}

interface CreateScreeningModalProps {
  isOpen: boolean
  onClose: () => void
  /** Single project ID (if opening from a specific project context) */
  projectId?: string
  projectTitle?: string
  /** List of projects to choose from (for dashboard context) */
  projects?: ProjectOption[]
  streamId?: string
  onScreeningCreated?: (screening: CreatedScreening) => void
  /** Alias for onScreeningCreated for compatibility */
  onSuccess?: () => void
}

interface CreatedScreening {
  id: string
  title: string
  shareUrl: string
  fullShareUrl?: string
  accessType: string
  expiresAt: string
}

type AccessType = 'public' | 'password' | 'invite-only'

// ============================================================================
// Component
// ============================================================================

export function CreateScreeningModal({
  isOpen,
  onClose,
  projectId: initialProjectId,
  projectTitle = 'Untitled Project',
  projects = [],
  streamId,
  onScreeningCreated,
  onSuccess,
}: CreateScreeningModalProps) {
  // Determine if we're in project selection mode
  const hasProjectList = projects.length > 0
  const defaultProjectId = initialProjectId || (projects.length === 1 ? projects[0].id : '')
  const defaultProjectTitle = initialProjectId 
    ? projectTitle 
    : projects.length === 1 
      ? projects[0].title 
      : ''
  
  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId)
  const [title, setTitle] = useState(defaultProjectTitle ? `${defaultProjectTitle} - Screening` : '')
  const [description, setDescription] = useState('')
  const [accessType, setAccessType] = useState<AccessType>('public')
  const [password, setPassword] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [maxViewers, setMaxViewers] = useState<number | undefined>(undefined)
  
  // Feedback options
  const [feedbackEnabled, setFeedbackEnabled] = useState(true)
  const [collectBiometrics, setCollectBiometrics] = useState(true)
  const [collectDemographics, setCollectDemographics] = useState(true)
  
  // UI state
  const [isCreating, setIsCreating] = useState(false)
  const [createdScreening, setCreatedScreening] = useState<CreatedScreening | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // ============================================================================
  // Create Screening
  // ============================================================================
  
  // Handle project selection change
  const handleProjectChange = (newProjectId: string) => {
    setSelectedProjectId(newProjectId)
    const selectedProject = projects.find(p => p.id === newProjectId)
    if (selectedProject) {
      setTitle(`${selectedProject.title} - Screening`)
    }
  }
  
  const handleCreate = async () => {
    const effectiveProjectId = selectedProjectId || initialProjectId
    
    if (!effectiveProjectId) {
      setError('Please select a project')
      return
    }
    
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    
    if (accessType === 'password' && !password.trim()) {
      setError('Password is required for password-protected screenings')
      return
    }
    
    setIsCreating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: effectiveProjectId,
          streamId,
          title: title.trim(),
          description: description.trim() || undefined,
          accessType,
          password: accessType === 'password' ? password : undefined,
          expiresInDays,
          maxViewers: maxViewers || undefined,
          feedbackEnabled,
          collectBiometrics,
          collectDemographics,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create screening')
      }
      
      const data = await response.json()
      const screening = {
        ...data.screening,
        fullShareUrl: data.screening.shareUrl || data.screening.fullShareUrl,
      }
      setCreatedScreening(screening)
      onScreeningCreated?.(screening)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Failed to create screening')
    } finally {
      setIsCreating(false)
    }
  }
  
  // ============================================================================
  // Copy Link
  // ============================================================================
  
  const handleCopyLink = async () => {
    if (!createdScreening?.fullShareUrl) return
    
    try {
      await navigator.clipboard.writeText(createdScreening.fullShareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  // ============================================================================
  // Reset and Close
  // ============================================================================
  
  const handleClose = () => {
    setTitle(projectTitle + ' - Screening')
    setDescription('')
    setAccessType('public')
    setPassword('')
    setExpiresInDays(7)
    setMaxViewers(undefined)
    setFeedbackEnabled(true)
    setCollectBiometrics(true)
    setCollectDemographics(true)
    setCreatedScreening(null)
    setError(null)
    setSelectedProjectId(defaultProjectId)
    setTitle(defaultProjectTitle ? `${defaultProjectTitle} - Screening` : '')
    onClose()
  }
  
  if (!isOpen) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">
              {createdScreening ? 'Screening Created!' : 'Create Screening'}
            </h2>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {createdScreening ? (
              // Success State
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">
                  {createdScreening.title}
                </h3>
                
                <p className="text-gray-400 text-sm mb-6">
                  Share this link with your test audience
                </p>
                
                {/* Share Link */}
                <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg mb-4">
                  <Link2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={createdScreening.fullShareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-white text-sm truncate outline-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Details */}
                <div className="text-left space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Access</span>
                    <span className="text-white capitalize flex items-center gap-1">
                      {createdScreening.accessType === 'password' && <Lock className="w-4 h-4" />}
                      {createdScreening.accessType === 'public' && <Globe className="w-4 h-4" />}
                      {createdScreening.accessType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Expires</span>
                    <span className="text-white">
                      {new Date(createdScreening.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {/* Open Link Button */}
                <Button
                  className="w-full mt-6 bg-purple-600 hover:bg-purple-700"
                  onClick={() => window.open(createdScreening.fullShareUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Screening
                </Button>
              </div>
            ) : (
              // Form
              <div className="space-y-6">
                {/* Project Selector (when multiple projects available) */}
                {hasProjectList && projects.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Project
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Choose a project...</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Screening title"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Instructions for viewers..."
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                {/* Access Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Access Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['public', 'password', 'invite-only'] as AccessType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setAccessType(type)}
                        className={cn(
                          "p-3 rounded-lg border text-sm font-medium transition-colors",
                          accessType === type
                            ? "border-purple-500 bg-purple-500/10 text-purple-400"
                            : "border-gray-700 text-gray-400 hover:border-gray-600"
                        )}
                      >
                        {type === 'public' && <Globe className="w-4 h-4 mx-auto mb-1" />}
                        {type === 'password' && <Lock className="w-4 h-4 mx-auto mb-1" />}
                        {type === 'invite-only' && <Users className="w-4 h-4 mx-auto mb-1" />}
                        <span className="capitalize">{type.replace('-', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Password (conditional) */}
                {accessType === 'password' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <Input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password for viewers"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                )}
                
                {/* Expiration & Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Expires In
                    </label>
                    <select
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value={1}>1 day</option>
                      <option value={3}>3 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Users className="w-4 h-4 inline mr-1" />
                      Max Viewers
                    </label>
                    <Input
                      type="number"
                      value={maxViewers || ''}
                      onChange={(e) => setMaxViewers(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Unlimited"
                      min={1}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
                
                {/* Feedback Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Feedback Collection
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={feedbackEnabled}
                        onChange={(e) => setFeedbackEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500 bg-gray-800"
                      />
                      <Smile className="w-5 h-5 text-yellow-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Emoji Reactions</div>
                        <div className="text-gray-400 text-xs">Allow viewers to react with emojis</div>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={collectBiometrics}
                        onChange={(e) => setCollectBiometrics(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500 bg-gray-800"
                      />
                      <Camera className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Facial Reaction Sensing</div>
                        <div className="text-gray-400 text-xs">Detect emotions via camera (opt-in)</div>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={collectDemographics}
                        onChange={(e) => setCollectDemographics(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500 bg-gray-800"
                      />
                      <UserCircle className="w-5 h-5 text-green-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Demographics</div>
                        <div className="text-gray-400 text-xs">Collect age/gender for segmentation</div>
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          {!createdScreening && (
            <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Create Screening
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CreateScreeningModal
