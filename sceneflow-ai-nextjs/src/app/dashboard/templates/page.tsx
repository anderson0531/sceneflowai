'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Grid, List, Eye, ArrowRight, Plus, Save, RotateCcw, ChevronDown, X, Clock, Monitor, Palette, Users, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react'
import { useTemplateStore } from '@/store/templateStore'
import { useEnhancedStore } from '@/store/enhancedStore'
import { TemplateManager } from '@/components/workflow/TemplateManager'
import { templateRegistry, type TemplateMeta, loadTemplateByPath, getTemplateReadinessPreview, validateTemplateCompleteness } from '@/services/TemplateService'
import { useRouter } from 'next/navigation'

// Tooltip component for field explanations
const FieldTooltip = ({ 
  children, 
  tooltip, 
  position = "top" 
}: { 
  children: React.ReactNode
  tooltip: string
  position?: "top" | "bottom" | "left" | "right"
}) => {
  const [showTooltip, setShowTooltip] = useState(false)

  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2"
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-2"
      >
        {children}
        <HelpCircle className="w-4 h-4 text-sf-text-secondary hover:text-sf-primary transition-colors cursor-help" />
      </div>
      
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-50 px-3 py-2 bg-black text-white text-sm rounded-lg border border-gray-600 shadow-xl max-w-xs whitespace-normal ${positionClasses[position]}`}
          >
            {tooltip}
            <div className={`absolute w-2 h-2 bg-black border border-gray-600 transform rotate-45 ${
              position === "top" ? "top-full left-1/2 -translate-x-1/2 -translate-y-1" :
              position === "bottom" ? "bottom-full left-1/2 -translate-x-1/2 translate-y-1" :
              position === "left" ? "left-full top-1/2 -translate-y-1/2 -translate-x-1" :
              "right-full top-1/2 -translate-y-1/2 translate-x-1"
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Field definitions with tooltips
const fieldTooltips = {
  // Template Overview fields
  duration: "The total runtime of the video in seconds. This determines pacing and content density.",
  platform: "The primary platform where this video will be published (YouTube, Instagram, TikTok, etc.).",
  tone: "The emotional and stylistic approach of the video (Professional, Casual, Energetic, etc.).",
  narrative_structure: "The storytelling framework used to organize the video content. Common structures include:\n• ps_cta: Problem-Solution-Call to Action\n• hv_cta: Hook-Value-Call to Action\n• three_act: Traditional three-act structure\n• problem_solution: Problem-focused narrative",
  orientation: "The aspect ratio of the video (16:9 for landscape, 9:16 for portrait, 1:1 for square).",
  category: "The content category that best describes this video type (Explainer, Commercial, Testimonial, etc.).",
  
  // Core Structure fields
  beats: "The key narrative moments or story beats that structure the video. Each beat serves a specific purpose in the storytelling arc.",
  act_structure: "The dramatic structure organizing the video into acts or major sections (e.g., three-act, problem-solution, etc.).",
  runtime_sec: "The exact duration in seconds, used for precise timing and pacing calculations.",
  scene_count: "The number of distinct scenes or shots planned for the video.",
  
  // Production Elements fields
  characters: "The people or personas featured in the video, including their roles and characteristics.",
  locations: "The physical or virtual settings where the video takes place.",
  visual_style: "The aesthetic approach including color schemes, typography, and overall visual direction.",
  cinematography: "Camera techniques, shot types, and visual storytelling methods used.",
  
  // Technical Specifications fields
  audio: "Sound elements including voice-over style, background music, and sound effects.",
  pacing: "The rhythm and tempo of cuts, transitions, and content delivery.",
  platform_deliverables: "Platform-specific requirements like captions, end cards, and format variations.",
  branding: "Brand integration elements including logos, colors, and messaging guidelines.",
  
  // Quality Assurance fields
  props_continuity: "Ensuring visual consistency of objects and elements throughout the video.",
  accessibility: "Making the video accessible to viewers with disabilities (captions, descriptions, etc.).",
  hints: "Additional guidance or tips for production and post-production processes."
}

const categories = [
  'all',
  'social-media',
  'marketing',
  'corporate',
  'educational',
  'news',
  'tv-movies'
]

const categoryData = {
  'social-media': {
    name: 'Social Media & Viral Content',
    description: 'Short-form social media, brand announcements',
    targetAudience: 'Creators, small businesses, digital marketers',
    narrativeFramework: 'Hook-Value-CTA Model',
    examples: ['Behind-the-Scenes Showcase', 'UGC Product Review', 'Hook-Value-CTA', 'How It\'s Made BTS'],
    color: 'bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600',
    icon: '📱',
    templateCount: 4
  },
  'marketing': {
    name: 'Marketing & Commercials',
    description: 'Advertisements, product promotion, explainer videos',
    targetAudience: 'Marketing teams, agencies, e-commerce businesses',
    narrativeFramework: 'Problem-Agitate-Solve (PAS) or Context-Action-Result (CAR)',
    examples: ['Launch Teaser', 'Event Recap', 'Product Commercial'],
    color: 'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-600',
    icon: '🎯',
    templateCount: 3
  },
  'corporate': {
    name: 'Corporate & Business Communication',
    description: 'Employee training, onboarding, internal communications',
    targetAudience: 'Corporate L&D, HR, sales enablement teams',
    narrativeFramework: 'The Narrative Arc, Corporate Storytelling',
    examples: ['Corporate Overview', 'Customer Story', 'Founder Message'],
    color: 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600',
    icon: '🏢',
    templateCount: 3
  },
  'educational': {
    name: 'Educational & Training Content',
    description: 'eLearning, skill development, instructional guides',
    targetAudience: 'Educators, trainers, content creators',
    narrativeFramework: 'Grand Argument, Microlearning',
    examples: ['SaaS Product Explainer', 'Feature Update Spotlight', 'Onboarding Walkthrough', 'How It Works'],
    color: 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-600',
    icon: '📚',
    templateCount: 4
  },
  'news': {
    name: 'News & Documentaries',
    description: 'Factual reporting, human interest stories',
    targetAudience: 'Journalists, documentarians, news agencies',
    narrativeFramework: 'Factual Narrative, Three-Act Documentary Structure',
    examples: ['Event Recap', 'Corporate Overview'],
    color: 'bg-gradient-to-br from-slate-600 via-gray-700 to-slate-800',
    icon: '📰',
    templateCount: 2
  },
  'tv-movies': {
    name: 'TV Shows & Movies',
    description: 'Episodic storytelling, short films',
    targetAudience: 'Screenwriters, independent filmmakers',
    narrativeFramework: 'Three-Act and Five-Act Narrative Structures',
    examples: ['Three-Act Film Scene'],
    color: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-600',
    icon: '🎬',
    templateCount: 1
  }
}

const sortOptions = [
  'Relevance',
  'Duration (Short to Long)',
  'Duration (Long to Short)',
  'Name A-Z',
  'Name Z-A',
  'Most Popular'
]

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSort, setSelectedSort] = useState('Relevance')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<TemplateMeta | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [templateDetails, setTemplateDetails] = useState<any>(null)
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({})
  
  const { setCoreConcept, applyTemplate } = useEnhancedStore()
  const router = useRouter()



  const filteredTemplates = useMemo(() => {
    return templateRegistry.templates.filter((template: TemplateMeta) => {
      const matchesSearch = searchQuery === '' || 
                           template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.use_case.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === 'all' || 
                             (() => {
                               // Map template categories to new category system based on actual template registry
                               const templateCategory = template.category || template.structure || ''
                               if (selectedCategory === 'social-media') {
                                 return templateCategory.includes('short_form_social') || templateCategory.includes('hv_cta')
                               } else if (selectedCategory === 'marketing') {
                                 return templateCategory.includes('marketing_promotional') || templateCategory.includes('ps_cta')
                               } else if (selectedCategory === 'corporate') {
                                 return templateCategory.includes('testimonial_brand') || templateCategory.includes('corporate')
                               } else if (selectedCategory === 'educational') {
                                 return templateCategory.includes('explainer_educational') || templateCategory.includes('ps_cta')
                               } else if (selectedCategory === 'news') {
                                 return templateCategory.includes('marketing_promotional') || templateCategory.includes('testimonial_brand')
                               } else if (selectedCategory === 'tv-movies') {
                                 return templateCategory.includes('film_scene') || templateCategory.includes('three_act')
                               }
                               return false
                             })()
      
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a: TemplateMeta, b: TemplateMeta) => {
      switch (selectedSort) {
        case 'Duration (Short to Long)':
          return (a.duration || 0) - (b.duration || 0)
        case 'Duration (Long to Short)':
          return (b.duration || 0) - (a.duration || 0)
        case 'Name A-Z':
          return a.name.localeCompare(b.name)
        case 'Name Z-A':
          return b.name.localeCompare(a.name)
        default:
          return 0
      }
    })
  }, [filteredTemplates, selectedSort])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedSort('Relevance')
  }

  const hasActiveFilters = searchQuery || selectedCategory !== 'all'

  const handlePreview = async (template: TemplateMeta, e: React.MouseEvent) => {
    e.stopPropagation()
    setPreviewTemplate(template)
    setShowPreview(true)
    
    // Load template details for preview
    try {
      setIsLoadingTemplate(true)
      const fullTemplate = await loadTemplateByPath(template.path)
      if (fullTemplate) {
        const readinessPreview = getTemplateReadinessPreview(fullTemplate)
        setTemplateDetails({ ...fullTemplate, readinessPreview })
      }
    } catch (error) {
      console.error('Error loading template details:', error)
    } finally {
      setIsLoadingTemplate(false)
    }
  }

  const closePreview = () => {
    setShowPreview(false)
    setPreviewTemplate(null)
    setTemplateDetails(null)
  }

  const handleUseTemplate = async (template: TemplateMeta, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      setIsLoadingTemplate(true)
      
      // Apply template to project with complete storyboard readiness population
      const success = await applyTemplate(template.path)
      
      if (success) {
        // Navigate to ideation page where template will be applied
        router.push('/dashboard/workflow/ideation')
      } else {
        alert('Failed to apply template. Please try again.')
      }
    } catch (error) {
      console.error('Error applying template:', error)
      alert('Error applying template. Please try again.')
    } finally {
      setIsLoadingTemplate(false)
    }
  }

  const toggleCardExpansion = (category: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  return (
    <div className="min-h-screen bg-sf-background text-sf-text-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-sf-text-primary mb-2">
                Creator Templates
              </h1>
              <p className="text-sf-text-secondary text-xl">
                Choose a best-practice template, preview its outline, or create your own.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg bg-sf-surface-light hover:bg-sf-surface-medium transition-colors"
                title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
              >
                {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg bg-sf-surface-light hover:bg-sf-surface-medium transition-colors"
                title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
              >
                {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Streamlined Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sf-text-secondary w-5 h-5" />
              <input
                type="text"
                placeholder="Search templates by name or use case..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-4 bg-sf-surface-light border border-sf-border-subtle rounded-lg focus:ring-2 focus:ring-sf-primary focus:border-transparent transition-all text-base"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sf-text-secondary hover:text-sf-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Showcase */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-sf-text-primary mb-6">Choose Your Template Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.filter(cat => cat !== 'all').map(category => {
              const catData = categoryData[category as keyof typeof categoryData]
              const isSelected = selectedCategory === category
              const isExpanded = expandedCards[category] || false
              return (
                <div
                  key={category}
                  className={`${catData.color} rounded-xl p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                    isSelected ? 'ring-4 ring-white/30 scale-105 shadow-2xl' : 'hover:shadow-xl'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-6xl drop-shadow-lg">{catData.icon}</span>
                      <h3 className="text-3xl font-bold text-gray-900 drop-shadow-sm">{catData.name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-gray-900 drop-shadow-sm">{catData.templateCount}</div>
                      <div className="text-base text-gray-800 drop-shadow-sm font-semibold">templates</div>
                    </div>
                  </div>
                  
                  <p className="text-gray-800 mb-4 text-lg leading-relaxed font-semibold drop-shadow-sm">{catData.description}</p>
                  
                  {/* Show/Hide Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCardExpansion(category)
                    }}
                    className="w-full mb-4 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-gray-900 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {isExpanded ? (
                      <>
                        <span>Hide Details</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Show Details</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                  
                  {/* Expandable Details Section */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                            <p className="text-base font-bold text-gray-900 mb-1 drop-shadow-sm">Target Audience</p>
                            <p className="text-lg text-gray-800 font-semibold drop-shadow-sm">{catData.targetAudience}</p>
                          </div>
                          
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                            <p className="text-base font-bold text-gray-900 mb-1 drop-shadow-sm">Narrative Framework</p>
                            <p className="text-lg text-gray-800 font-semibold drop-shadow-sm">{catData.narrativeFramework}</p>
                          </div>
                          
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                            <p className="text-base font-bold text-gray-900 mb-1 drop-shadow-sm">Example Templates</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {catData.examples.map((example, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-white/30 border border-white/40 rounded-full text-base text-gray-900 font-bold drop-shadow-sm">
                                  {example}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {isSelected && (
                    <div className="mt-4 pt-3 border-t border-white/30">
                      <div className="text-center text-lg text-gray-900 font-bold drop-shadow-sm">
                        ✓ {catData.templateCount} templates selected
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>



        {/* Results Summary */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sf-text-secondary">
              {filteredTemplates.length} of {templateRegistry.templates.length} templates
              {selectedCategory !== 'all' && (
                <span className="ml-2 text-sf-primary font-medium">
                  in {categoryData[selectedCategory as keyof typeof categoryData]?.name}
                </span>
              )}
            </p>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-3 py-1.5 text-sm bg-sf-surface-light text-sf-text-secondary hover:bg-sf-surface-medium hover:text-sf-text-primary rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Category
              </button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Template Library Section */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key="templates"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2' 
                    : 'grid-cols-1'
                }`}
              >
                {sortedTemplates.map((template: TemplateMeta) => (
                  <div
                    key={template.id}
                    className={`bg-sf-surface-light border border-sf-border-subtle rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer ${
                      selectedTemplate?.id === template.id 
                        ? 'ring-2 ring-sf-primary bg-sf-surface-medium' 
                        : 'hover:bg-sf-surface-medium'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-sf-text-primary mb-2 line-clamp-2">
                        {template.name}
                      </h3>
                      <p className="text-sf-text-secondary text-sm mb-3 line-clamp-2">
                        {template.use_case}
                      </p>
                    </div>

                    {/* Enhanced Metadata Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2 py-1 bg-sf-primary/20 text-sf-primary text-xs font-medium rounded-md">
                        {template.structure}
                      </span>
                      <span className="px-2 py-1 bg-sf-accent/20 text-sf-accent text-xs font-medium rounded-md">
                        {template.duration}s
                      </span>
                      <span className="px-2 py-1 bg-sf-surface-medium text-sf-text-secondary text-xs font-medium rounded-md">
                        {template.orientation}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        className="flex-1 px-4 py-2.5 bg-sf-surface-medium text-sf-text-primary rounded-lg hover:bg-sf-surface-dark transition-colors flex items-center justify-center gap-2"
                        onClick={(e) => handlePreview(template, e)}
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button
                        className="flex-1 px-4 py-2.5 bg-sf-primary text-sf-background rounded-lg hover:bg-sf-accent transition-colors flex items-center justify-center gap-2"
                        onClick={(e) => handleUseTemplate(template, e)}
                        disabled={isLoadingTemplate}
                      >
                        {isLoadingTemplate ? (
                          <div className="w-4 h-4 border-2 border-sf-background border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            Use Template
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                    
                    <p className="text-xs text-sf-text-secondary mt-3 text-center">
                      Applies to Spark Studio and pre-fills Storyboard
                    </p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Template Editor Section */}
          <div className="lg:col-span-1">
            <div className="bg-sf-surface-light border border-sf-border-subtle rounded-xl p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-sf-text-primary mb-4">
                Creator Template
              </h2>
              
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div className="p-4 bg-sf-surface-medium rounded-lg">
                    <h3 className="font-medium text-sf-text-primary mb-2">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-sm text-sf-text-secondary">
                      {selectedTemplate.use_case}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sf-text-primary mb-3">Template Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-sf-surface-medium rounded">
                        <span className="text-sm text-sf-text-primary">Category</span>
                        <span className="text-xs text-sf-text-secondary bg-sf-surface-light px-2 py-1 rounded">
                          {selectedTemplate.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-sf-surface-medium rounded">
                        <span className="text-sm text-sf-text-primary">Structure</span>
                        <span className="text-xs text-sf-text-secondary bg-sf-surface-light px-2 py-1 rounded">
                          {selectedTemplate.structure}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-sf-surface-medium rounded">
                        <span className="text-sm text-sf-text-primary">Platform</span>
                        <span className="text-xs text-sf-text-secondary bg-sf-surface-light px-2 py-1 rounded">
                          {selectedTemplate.platform}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-sf-surface-medium rounded">
                        <span className="text-sm text-sf-text-primary">Tone</span>
                        <span className="text-xs text-sf-text-secondary bg-sf-surface-light px-2 py-1 rounded">
                          {selectedTemplate.tone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-sf-border-subtle">
                    <button
                      className="w-full px-4 py-3 bg-sf-primary text-sf-background rounded-lg hover:bg-sf-accent transition-colors font-medium"
                      onClick={() => handleUseTemplate(selectedTemplate, {} as any)}
                      disabled={isLoadingTemplate}
                    >
                      {isLoadingTemplate ? 'Applying Template...' : 'Apply to Concept'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-sf-surface-medium rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-sf-text-secondary" />
                  </div>
                  <p className="text-sf-text-secondary">
                    Select a template to view details and apply to your concept
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Template Preview Modal with Storyboard Readiness */}
      <AnimatePresence>
        {showPreview && previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closePreview}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-sf-surface-light border border-sf-border-subtle rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhanced Modal Header */}
              <div className="bg-gradient-to-r from-sf-surface-light to-sf-surface-medium border-b border-sf-border-subtle p-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-sf-primary/20 rounded-2xl flex items-center justify-center">
                        <div className="w-8 h-8 bg-sf-primary rounded-xl"></div>
                      </div>
                      <div>
                        <h2 className="text-4xl font-bold text-sf-text-primary leading-tight mb-2">
                          {previewTemplate.name}
                        </h2>
                        <p className="text-sf-text-secondary text-xl font-medium">
                          Template Preview - Complete Storyboard Readiness
                        </p>
                      </div>
                    </div>
                    
                    {/* Quick Stats Bar */}
                    <div className="flex items-center gap-8 mt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-sf-primary/20 rounded-xl flex items-center justify-center">
                          <Clock className="w-6 h-6 text-sf-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-sf-text-secondary mb-1">Duration</p>
                          <p className="text-xl font-bold text-sf-text-primary">
                            {templateDetails?.estimated_duration || previewTemplate.duration}s
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-sf-accent/20 rounded-xl flex items-center justify-center">
                          <Monitor className="w-6 h-6 text-sf-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-sf-text-secondary mb-1">Platform</p>
                          <p className="text-xl font-bold text-sf-text-primary">
                            {templateDetails?.platform || 'Multi-platform'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-sf-primary/20 rounded-xl flex items-center justify-center">
                          <Palette className="w-6 h-6 text-sf-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-sf-text-secondary mb-1">Tone</p>
                          <p className="text-xl font-bold text-sf-text-primary">
                            {templateDetails?.tone || 'Professional'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={closePreview}
                    className="p-4 rounded-2xl hover:bg-sf-surface-medium transition-colors group"
                  >
                    <X className="w-8 h-8 text-sf-text-secondary group-hover:text-sf-text-primary transition-colors" />
                  </button>
                </div>
              </div>

              {/* Modal Content with Improved Layout */}
              <div className="overflow-y-auto max-h-[calc(90vh-280px)]">
                {isLoadingTemplate ? (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 bg-sf-surface-medium rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                      <div className="w-12 h-12 bg-sf-primary rounded-2xl"></div>
                    </div>
                    <p className="text-sf-text-secondary text-xl font-medium">Loading template details...</p>
                  </div>
                ) : templateDetails ? (
                  <div className="p-8 space-y-10">
                    {/* Template Overview - Enhanced Section */}
                    <div className="bg-sf-surface-medium rounded-2xl p-8 border border-sf-border-subtle">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-sf-text-primary flex items-center gap-3">
                          <div className="w-3 h-3 bg-sf-primary rounded-full"></div>
                          Template Overview
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <p className="text-sf-text-secondary leading-relaxed text-xl font-medium">
                              {templateDetails.use_case}
                            </p>
                          </div>

                          {/* Key Details with Better Visual Hierarchy */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-5 p-5 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle hover:border-sf-primary/30 transition-colors">
                              <div className="w-12 h-12 bg-sf-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Clock className="w-6 h-6 text-sf-primary" />
                              </div>
                              <div>
                                <FieldTooltip tooltip={fieldTooltips.duration}>
                                  <p className="text-base font-semibold text-sf-text-secondary mb-1">Duration</p>
                                </FieldTooltip>
                                <p className="text-2xl font-bold text-sf-text-primary">{templateDetails.estimated_duration} seconds</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-5 p-5 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle hover:border-sf-accent/30 transition-colors">
                              <div className="w-12 h-12 bg-sf-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Monitor className="w-6 h-6 text-sf-accent" />
                              </div>
                              <div>
                                <FieldTooltip tooltip={fieldTooltips.platform}>
                                  <p className="text-base font-semibold text-sf-text-secondary mb-1">Platform</p>
                                </FieldTooltip>
                                <p className="text-2xl font-bold text-sf-text-primary">{templateDetails.platform}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-5 p-5 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle hover:border-sf-primary/30 transition-colors">
                              <div className="w-12 h-12 bg-sf-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Palette className="w-6 h-6 text-sf-primary" />
                              </div>
                              <div>
                                <FieldTooltip tooltip={fieldTooltips.tone}>
                                  <p className="text-base font-semibold text-sf-text-secondary mb-1">Tone</p>
                                </FieldTooltip>
                                <p className="text-2xl font-bold text-sf-text-primary">{templateDetails.tone}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xl font-bold text-sf-text-primary mb-5">Structure & Format</h4>
                          <div className="space-y-4">
                            <div className="p-5 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle">
                              <FieldTooltip tooltip={fieldTooltips.narrative_structure}>
                                <p className="text-base font-semibold text-sf-text-secondary mb-2">Narrative Structure</p>
                              </FieldTooltip>
                              <p className="text-xl font-bold text-sf-text-primary">{templateDetails.narrative_structure}</p>
                            </div>
                            
                            <div className="p-5 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle">
                              <FieldTooltip tooltip={fieldTooltips.orientation}>
                                <p className="text-base font-semibold text-sf-text-secondary mb-2">Aspect Ratio</p>
                              </FieldTooltip>
                              <p className="text-xl font-bold text-sf-text-primary">{templateDetails.orientation}</p>
                            </div>
                            
                            <div className="p-5 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle">
                              <FieldTooltip tooltip={fieldTooltips.category}>
                                <p className="text-base font-semibold text-sf-text-secondary mb-2">Category</p>
                              </FieldTooltip>
                              <p className="text-xl font-bold text-sf-text-primary capitalize">{templateDetails.category}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Storyboard Readiness Section - Enhanced Display */}
                    <div className="bg-sf-surface-medium rounded-2xl p-8 border border-sf-border-subtle">
                      <div className="flex items-center gap-5 mb-8">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <h3 className="text-2xl font-bold text-sf-text-primary">
                          Storyboard Readiness Attributes
                        </h3>
                        {templateDetails.readinessPreview?.completeness === 'Complete' ? (
                          <div className="flex items-center gap-3 px-5 py-3 bg-green-500/20 text-green-400 rounded-full border-2 border-green-500/40">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-base font-bold">Complete</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-5 py-3 bg-yellow-500/20 text-yellow-400 rounded-full border-2 border-yellow-500/40">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-base font-bold">Incomplete</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-sf-surface-light rounded-xl p-6 mb-8 border-2 border-sf-border-subtle">
                        <p className="text-sf-text-secondary text-center leading-relaxed text-lg font-medium">
                          <strong className="text-sf-text-primary text-xl">This template will automatically populate ALL storyboard readiness fields, eliminating blank canvas paralysis.</strong>
                        </p>
                      </div>

                      {/* Organized Attributes in Logical Groups */}
                      <div className="space-y-8">
                        {/* Core Structure Group */}
                        <div>
                          <h4 className="text-xl font-bold text-sf-text-primary mb-4 flex items-center gap-3">
                            <div className="w-2 h-2 bg-sf-primary rounded-full"></div>
                            Core Structure
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {['beats', 'act_structure', 'runtime_sec', 'scene_count'].map(key => (
                              templateDetails.storyboard_readiness[key] && (
                                <div key={key} className="p-5 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle hover:border-sf-primary/30 transition-colors">
                                  <FieldTooltip tooltip={fieldTooltips[key as keyof typeof fieldTooltips]}>
                                    <p className="text-sm font-bold text-sf-text-secondary mb-2 uppercase tracking-wide">
                                      {key.replace(/_/g, ' ')}
                                    </p>
                                  </FieldTooltip>
                                  <p className="text-lg font-semibold text-sf-text-primary leading-relaxed">
                                    {String(templateDetails.storyboard_readiness[key])}
                                  </p>
                                </div>
                              )
                            ))}
                          </div>
                        </div>

                        {/* Production Elements Group */}
                        <div>
                          <h4 className="text-xl font-bold text-sf-text-primary mb-4 flex items-center gap-3">
                            <div className="w-2 h-2 bg-sf-accent rounded-full"></div>
                            Production Elements
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {['characters', 'locations', 'visual_style', 'cinematography'].map(key => (
                              templateDetails.storyboard_readiness[key] && (
                                <div key={key} className="p-5 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle hover:border-sf-accent/30 transition-colors">
                                  <FieldTooltip tooltip={fieldTooltips[key as keyof typeof fieldTooltips]}>
                                    <p className="text-sm font-bold text-sf-text-secondary mb-2 uppercase tracking-wide">
                                      {key.replace(/_/g, ' ')}
                                    </p>
                                  </FieldTooltip>
                                  <p className="text-lg font-semibold text-sf-text-primary leading-relaxed">
                                    {String(templateDetails.storyboard_readiness[key])}
                                  </p>
                                </div>
                              )
                            ))}
                          </div>
                        </div>

                        {/* Technical Specifications Group */}
                        <div>
                          <h4 className="text-xl font-bold text-sf-text-primary mb-4 flex items-center gap-3">
                            <div className="w-2 h-2 bg-sf-primary rounded-full"></div>
                            Technical Specifications
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {['audio', 'pacing', 'platform_deliverables', 'branding'].map(key => (
                              templateDetails.storyboard_readiness[key] && (
                                <div key={key} className="p-5 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle hover:border-sf-primary/30 transition-colors">
                                  <FieldTooltip tooltip={fieldTooltips[key as keyof typeof fieldTooltips]}>
                                    <p className="text-sm font-bold text-sf-text-secondary mb-2 uppercase tracking-wide">
                                      {key.replace(/_/g, ' ')}
                                    </p>
                                  </FieldTooltip>
                                  <p className="text-lg font-semibold text-sf-text-primary leading-relaxed">
                                    {String(templateDetails.storyboard_readiness[key])}
                                  </p>
                                </div>
                              )
                            ))}
                          </div>
                        </div>

                        {/* Quality Assurance Group */}
                        <div>
                          <h4 className="text-xl font-bold text-sf-text-primary mb-4 flex items-center gap-3">
                            <div className="w-2 h-2 bg-sf-accent rounded-full"></div>
                            Quality Assurance
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {['props_continuity', 'accessibility', 'hints'].map(key => (
                              templateDetails.storyboard_readiness[key] && (
                                <div key={key} className="p-5 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle hover:border-sf-accent/30 transition-colors">
                                  <FieldTooltip tooltip={fieldTooltips[key as keyof typeof fieldTooltips]}>
                                    <p className="text-sm font-bold text-sf-text-secondary mb-2 uppercase tracking-wide">
                                      {key.replace(/_/g, ' ')}
                                    </p>
                                  </FieldTooltip>
                                  <p className="text-lg font-semibold text-sf-text-primary leading-relaxed">
                                    {String(templateDetails.storyboard_readiness[key])}
                                  </p>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      </div>

                      {templateDetails.readinessPreview?.missingFields && templateDetails.readinessPreview.missingFields.length > 0 && (
                        <div className="mt-8 p-6 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl">
                          <h4 className="text-base font-bold text-yellow-400 mb-4 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5" />
                            Missing Fields
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {templateDetails.readinessPreview.missingFields.map((field: string) => (
                              <span key={field} className="px-4 py-2 bg-yellow-500/20 text-yellow-400 text-sm font-medium rounded-full border border-yellow-500/40">
                                {field.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Scenes Preview - Enhanced Layout */}
                    <div className="bg-sf-surface-medium rounded-2xl p-8 border border-sf-border-subtle">
                      <h3 className="text-2xl font-bold text-sf-text-primary mb-6 flex items-center gap-3">
                        <div className="w-3 h-3 bg-sf-primary rounded-full"></div>
                        Scene Structure ({templateDetails.scenes?.length || 0} scenes)
                      </h3>
                      <div className="space-y-4">
                        {templateDetails.scenes?.map((scene: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-6 bg-sf-surface-light rounded-xl border-2 border-sf-border-subtle hover:border-sf-primary/40 transition-colors">
                            <div className="flex items-center gap-5">
                              <div className="w-10 h-10 bg-sf-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <span className="text-lg font-bold text-sf-primary">{index + 1}</span>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-sf-text-primary mb-2">
                                  {scene.scene_name}
                                </p>
                                <p className="text-base text-sf-text-secondary leading-relaxed">
                                  {scene.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Clock className="w-5 h-5 text-sf-text-secondary" />
                              <span className="text-lg font-bold text-sf-text-primary bg-sf-surface-medium px-4 py-2 rounded-full border border-sf-border-subtle">
                                {scene.scene_duration}s
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 bg-sf-surface-medium rounded-full flex items-center justify-center mx-auto mb-8">
                      <AlertCircle className="w-12 h-12 text-sf-text-secondary" />
                    </div>
                    <p className="text-sf-text-secondary text-xl font-medium">Failed to load template details</p>
                  </div>
                )}
              </div>

              {/* Enhanced Modal Footer */}
              <div className="bg-gradient-to-r from-sf-surface-light to-sf-surface-medium border-t border-sf-border-subtle p-8">
                <div className="flex items-center justify-between">
                  <button
                    onClick={closePreview}
                    className="px-8 py-4 bg-sf-surface-medium text-sf-text-primary rounded-xl hover:bg-sf-surface-dark transition-colors border-2 border-sf-border-subtle hover:border-sf-border font-semibold text-lg"
                  >
                    Close Preview
                  </button>
                  <button
                    className="px-10 py-4 bg-sf-primary text-sf-background rounded-xl hover:bg-sf-accent transition-colors font-bold text-lg flex items-center gap-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                    onClick={() => {
                      if (previewTemplate) {
                        handleUseTemplate(previewTemplate, {} as any)
                        closePreview()
                      }
                    }}
                    disabled={isLoadingTemplate}
                  >
                    {isLoadingTemplate ? (
                      <>
                        <div className="w-5 h-5 border-2 border-sf-background border-t-transparent rounded-full animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        Use This Template
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


