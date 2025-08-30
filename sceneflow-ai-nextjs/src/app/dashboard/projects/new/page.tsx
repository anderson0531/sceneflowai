'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Lightbulb, Upload, MessageSquare, Sparkles } from 'lucide-react'
import { useCue } from '@/store/useCueStore'
import { useGuideStore } from '@/store/useGuideStore'
import ProjectInitializationService from '@/services/ProjectInitializationService'
import { allTemplates, BeatTemplate } from '@/types/beatTemplates'

export default function NewProjectPage() {
  const router = useRouter()
  const { invokeCue } = useCue()
  const { initializeProject } = useGuideStore()
  const [projectIdea, setProjectIdea] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)



  const handleGenerateProject = async () => {
    if (!projectIdea.trim()) return

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
      console.log('🆔 Generated project ID:', projectId);
      
      // Use ProjectInitializationService to generate content
      const service = ProjectInitializationService.getInstance()
      const result = await service.initializeProject({
        projectIdea,
        projectId
      })

      if (result.success && result.project) {
        console.log('✅ Project generated successfully, updating store...');
        
        // Initialize the project in the store
        initializeProject(result.project)
        
        // Force a small delay to ensure store update is processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Complete progress
        setGenerationProgress(100)
        
        // Wait a moment then redirect to Spark Studio
        setTimeout(() => {
          console.log('🚀 Redirecting to Spark Studio...');
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

  const handleUploadFile = async () => {
    // Create a hidden file input element
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.pdf,.docx,.doc,.txt,.rtf'
    fileInput.style.display = 'none'
    
    fileInput.onchange = async (event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      
      if (!file) return
      
      try {
        setIsUploading(true)
        setUploadProgress(0)
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('File size must be less than 10MB')
          setIsUploading(false)
          return
        }
        
        // Validate file type
        const validTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'text/plain',
          'application/rtf'
        ]
        
        if (!validTypes.includes(file.type)) {
          alert('Please select a valid document file (PDF, DOCX, DOC, TXT, or RTF)')
          setIsUploading(false)
          return
        }
        
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 100)
        
        // Convert document to text
        let extractedText = ''
        
        if (file.type === 'text/plain') {
          // Handle plain text files
          extractedText = await file.text()
        } else if (file.type === 'application/pdf') {
          // Handle PDF files
          extractedText = await extractTextFromPDF(file)
        } else if (file.type.includes('word')) {
          // Handle Word documents
          extractedText = await extractTextFromWord(file)
        } else if (file.type === 'application/rtf') {
          // Handle RTF files
          extractedText = await extractTextFromRTF(file)
        }
        
        // Update progress to 100%
        setUploadProgress(100)
        clearInterval(progressInterval)
        
        // Update the project idea textarea with extracted text
        if (extractedText.trim()) {
          setProjectIdea(extractedText.trim())
          // Show success message
          alert('Document uploaded and converted successfully! The text has been added to your project idea.')
        } else {
          alert('Could not extract text from the document. Please try a different file or type your idea manually.')
        }
        
      } catch (error) {
        console.error('Error processing document:', error)
        alert('Error processing document. Please try again or type your idea manually.')
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
        // Clean up the file input
        document.body.removeChild(fileInput)
      }
    }
    
    // Add file input to DOM and trigger click
    document.body.appendChild(fileInput)
    fileInput.click()
  }

  // Helper function to extract text from PDF
  const extractTextFromPDF = async (file: File): Promise<string> => {
    // For now, we'll use a simple approach with PDF.js
    // In production, you might want to use a server-side service
    try {
      // This is a simplified implementation
      // In a real app, you'd use PDF.js or a similar library
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          // For demo purposes, return a placeholder
          // In production, implement actual PDF text extraction
          resolve(`[PDF Content from ${file.name}]\n\nThis is a placeholder for the actual PDF content. In production, this would extract the real text from your PDF document.`)
        }
        reader.readAsArrayBuffer(file)
      })
    } catch (error) {
      throw new Error('Failed to extract text from PDF')
    }
  }

  // Helper function to extract text from Word documents
  const extractTextFromWord = async (file: File): Promise<string> => {
    try {
      // For now, return a placeholder
      // In production, you'd use a library like mammoth.js
      return `[Word Document Content from ${file.name}]\n\nThis is a placeholder for the actual Word document content. In production, this would extract the real text from your Word document.`
    } catch (error) {
      throw new Error('Failed to extract text from Word document')
    }
  }

  // Helper function to extract text from RTF files
  const extractTextFromRTF = async (file: File): Promise<string> => {
    try {
      // For now, return a placeholder
      // In production, you'd use an RTF parser library
      return `[RTF Document Content from ${file.name}]\n\nThis is a placeholder for the actual RTF content. In production, this would extract the real text from your RTF document.`
    } catch (error) {
      throw new Error('Failed to extract text from RTF document')
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
              <h1 className="text-4xl md:text-5xl font-bold text-white">The Spark Studio</h1>
              <p className="text-xl text-gray-400 mt-2">Ideation & Brainstorming</p>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="mb-12">
          {/* Project Idea Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Describe Your Project Idea</h2>
            </div>
            
            <textarea
              value={projectIdea}
              onChange={(e) => setProjectIdea(e.target.value)}
              placeholder="Tell us about your video project... What's the story? Who's the audience? What's the key message? What tone are you going for?"
              className="w-full h-48 bg-gray-800 border border-gray-600 rounded-xl p-4 text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            

            
            <div className="mt-4 space-y-4">
              <div className="text-sm text-gray-400">
                💡 <strong>Pro tip:</strong> Be as detailed as possible. Cue will use this to generate comprehensive baseline content.
              </div>
              
              <div className="pt-4 border-t border-gray-700/50">
                <Button
                  onClick={handleUploadFile}
                  disabled={isUploading}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 font-medium py-3 px-6 transition-all duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Processing Document...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </>
                  )}
                </Button>
                
                {/* Upload Progress Bar */}
                {isUploading && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 text-center">
                      {uploadProgress < 90 ? 'Processing document...' : 'Finalizing...'}
                    </div>
                  </div>
                )}
                
                <div className="mt-2 text-xs text-gray-500">
                  📄 <strong>Supported formats:</strong> PDF, DOCX, DOC, TXT, or any text-based document with your project details, script, or story outline.
                </div>
              </div>
            </div>
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
              <MessageSquare className="w-6 h-6 text-green-400" />
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
          className="flex justify-center items-center mb-8"
        >
          <Button
            onClick={handleGenerateProject}
            disabled={!projectIdea.trim() || isGenerating}
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
                Create Project Baseline
              </>
            )}
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


      </div>
    </div>
  )
}
