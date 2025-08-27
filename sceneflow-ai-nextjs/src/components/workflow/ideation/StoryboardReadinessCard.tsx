'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  FileText, 
  Clock, 
  Users, 
  MapPin, 
  Palette, 
  Camera, 
  Volume2, 
  Zap, 
  Monitor, 
  Shield, 
  Puzzle, 
  Lightbulb
} from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'

interface StoryboardReadinessAttribute {
  value: string
  source: string
}

interface StoryboardReadinessAttributes {
  sr_beats?: StoryboardReadinessAttribute
  sr_actStructure?: StoryboardReadinessAttribute
  sr_runtime?: StoryboardReadinessAttribute
  sr_sceneCount?: StoryboardReadinessAttribute
  sr_characters?: StoryboardReadinessAttribute
  sr_locations?: StoryboardReadinessAttribute
  sr_visualStyle?: StoryboardReadinessAttribute
  sr_cinematography?: StoryboardReadinessAttribute
  sr_audio?: StoryboardReadinessAttribute
  sr_pacing?: StoryboardReadinessAttribute
  sr_platformDeliverables?: StoryboardReadinessAttribute
  sr_branding?: StoryboardReadinessAttribute
  sr_propsContinuity?: StoryboardReadinessAttribute
  sr_accessibility?: StoryboardReadinessAttribute
  sr_storyboardHints?: StoryboardReadinessAttribute
}

const attributeConfig = {
  sr_beats: { label: 'Story Beats', icon: FileText, description: 'Key story moments and structure' },
  sr_actStructure: { label: 'Act Structure', icon: FileText, description: 'Narrative act breakdown' },
  sr_runtime: { label: 'Runtime', icon: Clock, description: 'Total video duration' },
  sr_sceneCount: { label: 'Scene Count', icon: FileText, description: 'Number of scenes' },
  sr_characters: { label: 'Characters', icon: Users, description: 'Character descriptions and roles' },
  sr_locations: { label: 'Locations', icon: MapPin, description: 'Setting and environment details' },
  sr_visualStyle: { label: 'Visual Style', icon: Palette, description: 'Overall visual aesthetic' },
  sr_cinematography: { label: 'Cinematography', icon: Camera, description: 'Camera work and framing' },
  sr_audio: { label: 'Audio Style', icon: Volume2, description: 'Sound design and music' },
  sr_pacing: { label: 'Pacing', icon: Zap, description: 'Rhythm and timing' },
  sr_platformDeliverables: { label: 'Platform Deliverables', icon: Monitor, description: 'Format requirements' },
  sr_branding: { label: 'Branding', icon: Shield, description: 'Brand guidelines and elements' },
  sr_propsContinuity: { label: 'Props & Continuity', icon: Puzzle, description: 'Object consistency' },
  sr_accessibility: { label: 'Accessibility', icon: Users, description: 'Inclusive design considerations' },
  sr_storyboardHints: { label: 'Storyboard Hints', icon: Lightbulb, description: 'Additional guidance' }
}

export default function StoryboardReadinessCard() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSourceInfo, setShowSourceInfo] = useState(false)
  
  const { storyboardReadiness, templateState } = useEnhancedStore()

  // Calculate completion status
  const totalAttributes = Object.keys(attributeConfig).length
  const populatedAttributes = Object.values(storyboardReadiness).filter(attr => attr?.value).length
  const completionPercentage = Math.round((populatedAttributes / totalAttributes) * 100)
  
  const hasTemplateSource = templateState.templateApplied && templateState.templateSource

  const getAttributeStatus = (key: string) => {
    const attr = storyboardReadiness[key as keyof StoryboardReadinessAttributes]
    if (!attr) return 'missing'
    if (attr.source === 'template') return 'template'
    return 'manual'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'template':
        return <FileText className="w-4 h-4 text-sf-primary" />
      case 'manual':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'missing':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'template':
        return 'border-sf-primary/30 bg-sf-primary/10'
      case 'manual':
        return 'border-green-500/30 bg-green-500/10'
      case 'missing':
        return 'border-yellow-500/30 bg-yellow-500/10'
      default:
        return 'border-yellow-500/30 bg-yellow-500/10'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-sf-surface-light border border-sf-border-subtle rounded-xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-sf-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-sf-text-primary">
              Storyboard Readiness
            </h3>
            <p className="text-sm text-sf-text-secondary">
              Complete these attributes to generate your storyboard
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Template Status Badge */}
          {hasTemplateSource && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-sf-primary/20 text-sf-primary rounded-full text-sm font-medium">
              <FileText className="w-4 h-4" />
              Template Applied
            </div>
          )}
          
          {/* Completion Badge */}
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            completionPercentage === 100 
              ? 'bg-green-500/20 text-green-500' 
              : completionPercentage >= 50 
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'bg-red-500/20 text-red-500'
          }`}>
            {completionPercentage}% Complete
          </div>
          
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-sf-surface-medium transition-colors"
          >
            {isExpanded ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-sf-text-primary">Completion Progress</span>
          <span className="text-sm text-sf-text-secondary">{populatedAttributes}/{totalAttributes} attributes</span>
        </div>
        <div className="w-full bg-sf-surface-medium rounded-full h-2">
          <motion.div
            className="h-2 bg-gradient-to-r from-sf-primary to-sf-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Template Source Info */}
      {hasTemplateSource && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-4 bg-sf-primary/10 border border-sf-primary/30 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-sf-primary" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-sf-text-primary">
                Template Applied: {templateState.templateSource}
              </h4>
              <p className="text-xs text-sf-text-secondary">
                All storyboard readiness attributes have been automatically populated from this template, eliminating blank canvas paralysis.
              </p>
            </div>
            <button
              onClick={() => setShowSourceInfo(!showSourceInfo)}
              className="text-xs text-sf-primary hover:text-sf-accent transition-colors"
            >
              {showSourceInfo ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          {showSourceInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-sf-primary/20"
            >
              <p className="text-xs text-sf-text-secondary">
                This template provides a complete foundation for your storyboard, including:
              </p>
              <ul className="mt-2 space-y-1">
                <li className="text-xs text-sf-text-secondary flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-sf-primary" />
                  Pre-defined story structure and beats
                </li>
                <li className="text-xs text-sf-text-secondary flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-sf-primary" />
                  Visual style and cinematography guidelines
                </li>
                <li className="text-xs text-sf-text-secondary flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-sf-primary" />
                  Character and location specifications
                </li>
                <li className="text-xs text-sf-text-secondary flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-sf-primary" />
                  Audio and pacing recommendations
                </li>
              </ul>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Attributes Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {Object.entries(attributeConfig).map(([key, config]) => {
              const status = getAttributeStatus(key)
              const attr = storyboardReadiness[key as keyof StoryboardReadinessAttributes]
              const IconComponent = config.icon
              
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    getStatusColor(status)
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-medium text-sf-text-primary">
                          {config.label}
                        </h4>
                        {attr?.source === 'template' && (
                          <span className="px-2 py-0.5 bg-sf-primary/20 text-sf-primary text-xs rounded-full">
                            Template
                          </span>
                        )}
                      </div>
                      
                      {attr?.value ? (
                        <p className="text-sm text-sf-text-primary mb-1">
                          {attr.value}
                        </p>
                      ) : (
                        <p className="text-sm text-sf-text-secondary italic">
                          Not specified
                        </p>
                      )}
                      
                      <p className="text-xs text-sf-text-secondary">
                        {config.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-sf-text-secondary">
          {completionPercentage === 100 ? (
            <span className="text-green-500 font-medium">Ready for storyboard generation!</span>
          ) : (
            <span>
              {totalAttributes - populatedAttributes} more attributes needed
            </span>
          )}
        </div>
        
        <div className="flex gap-3">
          {!hasTemplateSource && (
            <button className="px-4 py-2 bg-sf-primary text-sf-background rounded-lg hover:bg-sf-accent transition-colors text-sm font-medium">
              Browse Templates
            </button>
          )}
          
          {completionPercentage === 100 && (
            <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
              Generate Storyboard
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
