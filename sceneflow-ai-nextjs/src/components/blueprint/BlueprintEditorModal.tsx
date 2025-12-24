'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  FileText, 
  Users, 
  Sparkles, 
  MessageSquare,
  Save,
  Trash2,
  Wand2,
  MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'

type EditorType = 'concept' | 'character' | 'world'

interface TabConfig {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const tabConfigs: Record<EditorType, TabConfig[]> = {
  concept: [
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'enhance', label: 'AI Enhance', icon: Sparkles },
    { id: 'notes', label: 'Notes', icon: MessageSquare },
  ],
  character: [
    { id: 'profile', label: 'Profile', icon: Users },
    { id: 'backstory', label: 'Backstory', icon: FileText },
    { id: 'appearance', label: 'Appearance', icon: Wand2 },
    { id: 'enhance', label: 'AI Enhance', icon: Sparkles },
  ],
  world: [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'rules', label: 'Rules & Logic', icon: FileText },
    { id: 'enhance', label: 'AI Enhance', icon: Sparkles },
  ],
}

interface BlueprintEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  onDelete?: () => void
  item: any
  type: EditorType
}

export default function BlueprintEditorModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  item,
  type,
}: BlueprintEditorModalProps) {
  const [activeTab, setActiveTab] = useState(tabConfigs[type]?.[0]?.id || 'content')
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [formData, setFormData] = useState(item)

  const tabs = tabConfigs[type] || tabConfigs.concept

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setFormData(item)
      setActiveTab(tabConfigs[type]?.[0]?.id || 'content')
      setHasChanges(false)
    }
  }, [item, type])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      // Save: Cmd/Ctrl + S
      if (modifier && e.key === 's') {
        e.preventDefault()
        if (hasChanges) {
          handleSave()
        }
        return
      }

      // Close: Escape
      if (e.key === 'Escape') {
        handleClose()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasChanges])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(formData)
      setHasChanges(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  const updateFormData = useCallback((updates: Partial<typeof formData>) => {
    setFormData((prev: any) => ({ ...prev, ...updates }))
    setHasChanges(true)
  }, [])

  if (!item) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-8 lg:inset-12 bg-slate-900 rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">
                  {formData?.title || 'Untitled'}
                </h2>
                {hasChanges && (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                    Unsaved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onDelete && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this item?')) {
                        onDelete()
                      }
                    }}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 py-2 border-b border-white/10 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                      activeTab === tab.id
                        ? "bg-purple-600 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                {activeTab === 'content' && (
                  <ContentTabPanel 
                    data={formData} 
                    onChange={updateFormData} 
                  />
                )}
                {activeTab === 'profile' && (
                  <ProfileTabPanel 
                    data={formData} 
                    onChange={updateFormData} 
                  />
                )}
                {activeTab === 'backstory' && (
                  <BackstoryTabPanel 
                    data={formData} 
                    onChange={updateFormData} 
                  />
                )}
                {activeTab === 'appearance' && (
                  <AppearanceTabPanel 
                    data={formData} 
                    onChange={updateFormData} 
                  />
                )}
                {activeTab === 'details' && (
                  <DetailsTabPanel 
                    data={formData} 
                    onChange={updateFormData} 
                  />
                )}
                {activeTab === 'locations' && (
                  <LocationsTabPanel 
                    data={formData} 
                    onChange={updateFormData} 
                  />
                )}
                {activeTab === 'rules' && (
                  <RulesTabPanel 
                    data={formData} 
                    onChange={updateFormData} 
                  />
                )}
                {activeTab === 'notes' && (
                  <NotesTabPanel 
                    data={formData} 
                    onChange={updateFormData} 
                  />
                )}
                {activeTab === 'enhance' && (
                  <EnhanceTabPanel 
                    data={formData} 
                    onEnhance={(enhanced) => {
                      setFormData(enhanced)
                      setHasChanges(true)
                    }} 
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-slate-800/50">
              <div className="text-sm text-white/40">
                {formData?.lastModified && (
                  <>Last saved: {new Date(formData.lastModified).toLocaleString()}</>
                )}
                <span className="ml-4 text-white/20">⌘S to save • Esc to close</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                    hasChanges
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  )}
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================
// Tab Panel Components
// ============================================

interface TabPanelProps {
  data: any
  onChange: (updates: any) => void
}

function ContentTabPanel({ data, onChange }: TabPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
        <input
          type="text"
          value={data?.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
          placeholder="Enter title..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
        <textarea
          value={data?.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={8}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="Describe your concept..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Genre / Category</label>
        <input
          type="text"
          value={data?.genre || ''}
          onChange={(e) => onChange({ genre: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
          placeholder="e.g., Sci-Fi, Drama, Comedy..."
        />
      </div>
    </div>
  )
}

function ProfileTabPanel({ data, onChange }: TabPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Character Name</label>
          <input
            type="text"
            value={data?.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            placeholder="Enter name..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Role</label>
          <input
            type="text"
            value={data?.role || ''}
            onChange={(e) => onChange({ role: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            placeholder="e.g., Protagonist, Antagonist, Support..."
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Age</label>
          <input
            type="text"
            value={data?.age || ''}
            onChange={(e) => onChange({ age: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            placeholder="e.g., 35"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Gender</label>
          <input
            type="text"
            value={data?.gender || ''}
            onChange={(e) => onChange({ gender: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            placeholder="e.g., Male, Female, Non-binary..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Ethnicity</label>
          <input
            type="text"
            value={data?.ethnicity || ''}
            onChange={(e) => onChange({ ethnicity: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            placeholder="e.g., Asian, African, Caucasian..."
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Personality Traits</label>
        <textarea
          value={data?.personality || ''}
          onChange={(e) => onChange({ personality: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="Describe key personality traits..."
        />
      </div>
    </div>
  )
}

function BackstoryTabPanel({ data, onChange }: TabPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Background Story</label>
        <textarea
          value={data?.backstory || ''}
          onChange={(e) => onChange({ backstory: e.target.value })}
          rows={10}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="Write the character's background story..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Motivations</label>
        <textarea
          value={data?.motivations || ''}
          onChange={(e) => onChange({ motivations: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="What drives this character?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Conflicts</label>
        <textarea
          value={data?.conflicts || ''}
          onChange={(e) => onChange({ conflicts: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="Internal and external conflicts..."
        />
      </div>
    </div>
  )
}

function AppearanceTabPanel({ data, onChange }: TabPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Physical Description</label>
        <textarea
          value={data?.appearance || ''}
          onChange={(e) => onChange({ appearance: e.target.value })}
          rows={6}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="Describe physical appearance, height, build, distinguishing features..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Wardrobe / Style</label>
        <textarea
          value={data?.wardrobe || ''}
          onChange={(e) => onChange({ wardrobe: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="Typical clothing, style preferences..."
        />
      </div>
    </div>
  )
}

function DetailsTabPanel({ data, onChange }: TabPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">World Name</label>
        <input
          type="text"
          value={data?.worldName || ''}
          onChange={(e) => onChange({ worldName: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
          placeholder="Name of the world or setting..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Time Period</label>
        <input
          type="text"
          value={data?.timePeriod || ''}
          onChange={(e) => onChange({ timePeriod: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
          placeholder="e.g., 2150 AD, Medieval, Present Day..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Overview</label>
        <textarea
          value={data?.worldOverview || ''}
          onChange={(e) => onChange({ worldOverview: e.target.value })}
          rows={8}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="Describe the world, its history, culture..."
        />
      </div>
    </div>
  )
}

function LocationsTabPanel({ data, onChange }: TabPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Key Locations</label>
        <textarea
          value={data?.locations || ''}
          onChange={(e) => onChange({ locations: e.target.value })}
          rows={10}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="List and describe important locations in your world..."
        />
      </div>
    </div>
  )
}

function RulesTabPanel({ data, onChange }: TabPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">World Rules & Logic</label>
        <textarea
          value={data?.rules || ''}
          onChange={(e) => onChange({ rules: e.target.value })}
          rows={8}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="Define the rules that govern your world (physics, magic, technology, society)..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Technology Level</label>
        <textarea
          value={data?.technology || ''}
          onChange={(e) => onChange({ technology: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="Describe the technological capabilities..."
        />
      </div>
    </div>
  )
}

function NotesTabPanel({ data, onChange }: TabPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Notes</label>
        <textarea
          value={data?.notes || ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={12}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-white/40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
          placeholder="Additional notes, ideas, reminders..."
        />
      </div>
    </div>
  )
}

interface EnhanceTabPanelProps {
  data: any
  onEnhance: (enhanced: any) => void
}

function EnhanceTabPanel({ data, onEnhance }: EnhanceTabPanelProps) {
  const [isEnhancing, setIsEnhancing] = useState(false)

  const handleEnhance = async () => {
    setIsEnhancing(true)
    try {
      // TODO: Call AI enhancement API
      // const response = await fetch('/api/ideation/enhance', {
      //   method: 'POST',
      //   body: JSON.stringify(data),
      // })
      // const enhanced = await response.json()
      // onEnhance(enhanced)
      
      // Mock enhancement for now
      await new Promise(resolve => setTimeout(resolve, 2000))
      onEnhance({
        ...data,
        enhanced: true,
        lastEnhanced: new Date().toISOString(),
      })
    } finally {
      setIsEnhancing(false)
    }
  }

  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-10 h-10 text-purple-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">AI Enhancement</h3>
      <p className="text-white/60 max-w-md mx-auto mb-8">
        Use AI to improve your content with better descriptions, 
        more vivid details, and professional polish.
      </p>
      <button
        onClick={handleEnhance}
        disabled={isEnhancing}
        className={cn(
          "px-6 py-3 rounded-lg font-medium transition-all",
          isEnhancing
            ? "bg-white/10 text-white/40 cursor-not-allowed"
            : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25"
        )}
      >
        {isEnhancing ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Enhancing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Enhance with AI
          </span>
        )}
      </button>
      {data?.lastEnhanced && (
        <p className="mt-4 text-sm text-white/40">
          Last enhanced: {new Date(data.lastEnhanced).toLocaleString()}
        </p>
      )}
    </div>
  )
}

export type { EditorType, BlueprintEditorModalProps }
