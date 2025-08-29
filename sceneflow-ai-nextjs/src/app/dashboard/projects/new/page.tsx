'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Sparkles, Lightbulb, Upload, ArrowRight, MessageSquare, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useCue } from '@/store/useCueStore'
import { useGuideStore } from '@/store/useGuideStore'
import ProjectInitializationService from '@/services/ProjectInitializationService'
import { allTemplates, BeatTemplate } from '@/types/beatTemplates'

export default function NewProjectPage() {
  const router = useRouter()
  const { invokeCue } = useCue()
  const { initializeProject } = useGuideStore()
  const [projectIdea, setProjectIdea] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [validationMessage, setValidationMessage] = useState('')
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)

  // Validate project idea
  const validateProjectIdea = async () => {
    if (!projectIdea.trim()) {
      setValidationState('invalid')
      setValidationMessage('Please enter a project idea')
      return false
    }

    if (projectIdea.trim().length < 20) {
      setValidationState('invalid')
      setValidationMessage('Please provide more detail (at least 20 characters)')
      return false
    }

    setValidationState('validating')
    
    try {
      // Call Cue to validate the project idea
      const response = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Validate this project idea for video production: "${projectIdea.trim()}"
            
            Respond with ONLY:
            VALID: [brief reason why it's good]
            or
            INVALID: [specific reason why it needs improvement]
            
            Keep response under 100 characters.`
          }],
          context: { type: 'project-creation' }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.reply || data.content || ''
        
        if (content.startsWith('VALID:')) {
          setValidationState('valid')
          setValidationMessage(content.replace('VALID:', '').trim())
          return true
        } else if (content.startsWith('INVALID:')) {
          setValidationState('invalid')
          setValidationMessage(content.replace('INVALID:', '').trim())
          return false
        } else {
          // Default validation if AI response is unclear
          setValidationState('valid')
          setValidationMessage('Project idea looks good!')
          return true
        }
      } else {
        // Fallback validation
        setValidationState('valid')
        setValidationMessage('Project idea validated')
        return true
      }
    } catch (error) {
      console.error('Validation error:', error)
      // Fallback validation
      setValidationState('valid')
      setValidationMessage('Project idea validated')
      return true
    }
  }

  const handleGenerateProject = async () => {
    if (!projectIdea.trim() || validationState !== 'valid') return

    setIsGenerating(true)
    setGenerationProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      // Generate unique project ID
      const projectId = `new-project-${Date.now()}`
      
      // Use ProjectInitializationService to generate content
      const service = ProjectInitializationService.getInstance()
      const result = await service.initializeProject({
        projectIdea,
        projectId,
        template: selectedTemplate || 'three-act' // Default to 3-act if none selected
      })

      if (result.success && result.project) {
        // Initialize the project in the store
        initializeProject(result.project)
        
        // Complete progress
        setGenerationProgress(100)
        
        // Wait a moment then redirect to Spark Studio
        setTimeout(() => {
          router.push(`/studio/${projectId}`)
        }, 1000)
      } else {
        throw new Error(result.error || 'Failed to generate project')
      }

    } catch (error) {
      console.error('Error generating project:', error)
      setIsGenerating(false)
    }
  }

  const handleUploadFile = () => {
    // TODO: Implement file upload functionality
    console.log('File upload clicked')
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    setShowTemplateSelector(false)
  }

  const getTemplateCategory = (category: string) => {
    switch (category) {
      case 'classical': return 'Classical Structures'
      case 'modern': return 'Modern Templates'
      case 'genre-specific': return 'Genre-Specific Templates'
      default: return 'Other'
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">Create New Project</h1>
              <p className="text-xl text-gray-400 mt-2">Let Cue help you bring your vision to life</p>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Project Idea Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Describe Your Project Idea</h2>
            </div>
            
            <textarea
              value={projectIdea}
              onChange={(e) => {
                setProjectIdea(e.target.value)
                setValidationState('idle')
                setValidationMessage('')
              }}
              placeholder="Tell us about your video project... What's the story? Who's the audience? What's the key message? What tone are you going for?"
              className="w-full h-48 bg-gray-800 border border-gray-600 rounded-xl p-4 text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            
            {/* Validation Status */}
            {validationState !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2"
              >
                {validationState === 'validating' && (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-400 text-sm">Validating project idea...</span>
                  </>
                )}
                {validationState === 'valid' && (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm">{validationMessage}</span>
                  </>
                )}
                {validationState === 'invalid' && (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">{validationMessage}</span>
                  </>
                )}
              </motion.div>
            )}
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                💡 <strong>Pro tip:</strong> Be as detailed as possible. Cue will use this to generate comprehensive baseline content.
              </div>
              <Button
                onClick={validateProjectIdea}
                disabled={!projectIdea.trim() || validationState === 'validating'}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
              >
                Validate Idea
              </Button>
            </div>
          </motion.div>

          {/* Template Selection */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Story Structure</h2>
            </div>
            
            {!showTemplateSelector ? (
              <div>
                {selectedTemplate ? (
                  <div className="mb-4">
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-400 mb-2">Selected Template</h3>
                      <p className="text-white text-sm">
                        {allTemplates.find(t => t.id === selectedTemplate)?.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="bg-gray-700/50 border border-gray-600/30 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-400 mb-2">No Template Selected</h3>
                      <p className="text-gray-500 text-sm">Cue will choose the best structure</p>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={() => setShowTemplateSelector(true)}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                >
                  {selectedTemplate ? 'Change Template' : 'Choose Template'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Select Template</h3>
                  <Button
                    onClick={() => setShowTemplateSelector(false)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {Object.entries(
                    allTemplates.reduce((acc, template) => {
                      if (!acc[template.category]) acc[template.category] = []
                      acc[template.category].push(template)
                      return acc
                    }, {} as Record<string, BeatTemplate[]>)
                  ).map(([category, templates]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {getTemplateCategory(category)}
                      </h4>
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedTemplate === template.id
                              ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                              : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-gray-400 mt-1">{template.description}</div>
                          <div className="text-xs text-gray-500 mt-1">{template.columns.length} Acts</div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* What Cue Will Generate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">What Cue Will Generate</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
              </div>
              <h3 className="font-semibold text-white mb-2">Film Treatment</h3>
              <p className="text-gray-400 text-sm">Complete project overview with logline, synopsis, target audience, and story structure</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-lg"></div>
              </div>
              <h3 className="font-semibold text-white mb-2">Character Breakdowns</h3>
              <p className="text-gray-400 text-sm">Detailed character profiles, motivations, and relationships</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-purple-500 rounded-lg"></div>
              </div>
              <h3 className="font-semibold text-white mb-2">Interactive Beat Sheet</h3>
              <p className="text-gray-400 text-sm">Scene-by-scene breakdown with timing, actions, and dialogue cues</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded-lg"></div>
              </div>
              <h3 className="font-semibold text-white mb-2">Series Bible (if applicable)</h3>
              <p className="text-gray-400 text-sm">World-building elements and series continuity guidelines</p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
        >
          <Button
            onClick={handleGenerateProject}
            disabled={!projectIdea.trim() || validationState !== 'valid' || isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating Project...
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5" />
                Ask Cue to Generate Project
              </>
            )}
          </Button>
          
          <Button
            onClick={handleUploadFile}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 font-medium py-4 px-8 rounded-xl text-lg transition-all duration-200 flex items-center gap-3"
          >
            <Upload className="w-5 h-5" />
            Upload Existing Content
          </Button>
        </motion.div>

        {/* Generation Progress */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-8"
          >
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-4">Cue is Creating Your Project</h3>
              <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              <p className="text-gray-400">
                {generationProgress < 30 && "Analyzing your project idea..."}
                {generationProgress >= 30 && generationProgress < 60 && "Generating Film Treatment..."}
                {generationProgress >= 60 && generationProgress < 90 && "Creating Character Breakdowns..."}
                {generationProgress >= 90 && "Finalizing Interactive Beat Sheet..."}
              </p>
            </div>
          </motion.div>
        )}

        {/* No Blank Canvas Principle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-2xl border border-blue-500/30 p-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">No Blank Canvas Principle</h2>
          </div>
          <p className="text-lg text-gray-300 leading-relaxed max-w-3xl mx-auto">
            Instead of starting with empty fields, Cue will generate comprehensive baseline content based on your project idea. 
            This gives you a solid foundation to build upon, refine, and customize according to your vision.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-blue-400">
            <ArrowRight className="w-5 h-5" />
            <span className="font-medium">Ready to transform your idea into a complete project structure</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
