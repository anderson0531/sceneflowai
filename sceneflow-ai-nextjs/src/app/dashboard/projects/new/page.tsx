'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Sparkles, Lightbulb, Upload, ArrowRight, MessageSquare } from 'lucide-react'
import { useCue } from '@/store/useCueStore'

export default function NewProjectPage() {
  const router = useRouter()
  const { invokeCue } = useCue()
  const [projectIdea, setProjectIdea] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)

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
      // Invoke Cue to generate baseline content
      await invokeCue({
        type: 'text',
        content: `Create a new project with the following idea: ${projectIdea}. Generate baseline Film Treatment, Character Breakdowns, and Interactive Beat Sheet following the No Blank Canvas principle.`
      })

      // Complete progress
      setGenerationProgress(100)
      
      // Wait a moment then redirect to existing Spark Studio with new project
      setTimeout(() => {
        router.push('/studio/new-project-123')
      }, 1000)

    } catch (error) {
      console.error('Error generating project:', error)
      setIsGenerating(false)
    }
  }

  const handleUploadFile = () => {
    // TODO: Implement file upload functionality
    console.log('File upload clicked')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Project Idea Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
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
            
            <div className="mt-4 text-sm text-gray-400">
              💡 <strong>Pro tip:</strong> Be as detailed as possible. Cue will use this to generate comprehensive baseline content.
            </div>
          </motion.div>

          {/* What Cue Will Generate */}
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
              <h2 className="text-2xl font-bold text-white">What Cue Will Generate</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold text-white">Film Treatment</h3>
                  <p className="text-gray-400 text-sm">Complete project overview with logline, synopsis, target audience, and story structure</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold text-white">Character Breakdowns</h3>
                  <p className="text-gray-400 text-sm">Detailed character profiles, motivations, and relationships</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold text-white">Interactive Beat Sheet</h3>
                  <p className="text-gray-400 text-sm">Scene-by-scene breakdown with timing, actions, and dialogue cues</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold text-white">Series Bible (if applicable)</h3>
                  <p className="text-gray-400 text-sm">World-building elements and series continuity guidelines</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button
            onClick={handleGenerateProject}
            disabled={!projectIdea.trim() || isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 flex items-center gap-3"
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
            className="mt-8 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6"
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
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-2xl border border-blue-500/30 p-8 text-center"
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
