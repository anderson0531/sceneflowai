'use client'

import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { Clapperboard, Play, Target, Layout, Video } from 'lucide-react'

export function HeroSection() {
  const scrollToPricing = () => {
    const element = document.getElementById('pricing')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const openDemoModal = () => {
    // TODO: Implement demo modal
    alert('Demo modal would open here with embedded product demo video')
  }

  return (
    <motion.section 
      className="min-h-screen flex items-center justify-center relative overflow-hidden py-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 rounded-full text-sm font-medium mb-8 border border-blue-500/30">
            <Clapperboard className="w-5 h-5 mr-2" />
            AI-Powered Video Production Studio
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
            Transform Ideas into Professional
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mt-2">
              Videos in Minutes. Not Days.
            </span>
          </h1>
          
          {/* Optimized Content Section with Proper Hierarchy */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Instantly Transform Your Vision Into Video
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed">
              SceneFlow AI automates the entire pre-production process, turning a simple concept into a complete package with professional ready-to-use storyboards, scene direction, and screened videos.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button 
              onClick={scrollToPricing}
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg px-10 py-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              Choose Your Plan
            </Button>
            <Button 
              onClick={openDemoModal}
              size="lg" 
              className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 hover:border-gray-500 text-white hover:text-white text-lg px-10 py-5 transition-all duration-300 backdrop-blur-sm"
            >
              <Play className="w-6 h-6 mr-3" />
              Watch the 1-minute demo
            </Button>
          </div>
          
          {/* Hero Visual - Video Demonstration */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Text Prompt Input</h3>
                  <p className="text-sm text-gray-400">&quot;Create a product launch video&quot;</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Layout className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Generated Storyboard</h3>
                  <p className="text-sm text-gray-400">AI-powered visual planning</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Synthesized Video</h3>
                  <p className="text-sm text-gray-400">Professional final output</p>
                </div>
              </div>
              
              {/* Video Demo Placeholder */}
              <div className="mt-8 bg-black rounded-lg p-4">
                <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-gray-400 text-sm">Auto-playing video demonstration</p>
                    <p className="text-gray-500 text-xs">Showcasing final output quality</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
