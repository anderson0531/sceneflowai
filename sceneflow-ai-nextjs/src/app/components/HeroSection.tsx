'use client'

import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { Clapperboard, Play, Target, Layout, Video, Film, Lightbulb, BookOpen, Settings, Eye } from 'lucide-react'

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
      <div className="absolute inset-0 bg-gradient-to-r from-sf-primary/10 to-sf-accent/10"></div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-sf-primary/20 to-sf-accent/20 text-sf-primary rounded-full text-sm font-medium mb-8 border border-sf-primary/30">
            <Film className="w-5 h-5 mr-2" />
            AI-Powered Video Production Studio
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
            Transform Ideas into Professional
            <span className="block bg-gradient-to-r from-sf-primary via-sf-accent to-sf-primary/80 bg-clip-text text-transparent mt-2">
              Videos in Minutes. Not Days.
            </span>
          </h1>
          
          {/* Optimized Content Section with Proper Hierarchy */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Democratize Professional Video Production with AI
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed">
              SceneFlow AI automates the entire video production process, turning a simple concept into a complete video package with AI Story Generation, professional storyboards, scene direction, video generation, review, and optimization. From short films to feature-length productions.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button 
              onClick={scrollToPricing}
              size="lg" 
              className="bg-sf-primary hover:bg-sf-accent text-sf-background text-lg px-10 py-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              Start Video Production Now
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
          
          {/* Hero Visual - Value Proposition Illustration */}
          <div className="relative max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-10 border border-gray-700">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Democratizing Professional Video Production
                </h3>
                <p className="text-lg text-gray-300 max-w-3xl mx-auto">
                  Transform your ideas into professional videos without the complexity, time, and costs of traditional methods
                </p>
              </div>
              
              {/* Before vs After Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Before: Traditional Method */}
                <div className="text-center">
                  <div className="mb-6">
                    <div className="inline-flex items-center px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full mb-4">
                      <span className="text-red-400 text-sm font-medium">❌ Traditional Method</span>
                    </div>
                    <h4 className="text-xl font-semibold text-white mb-2">Complex & Expensive</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-red-400 text-lg">💸</span>
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Multiple tool stack subscriptions</p>
                        <p className="text-red-300 text-sm">$200+/month across platforms</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-400 text-lg">⏰</span>
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Weeks of planning</p>
                        <p className="text-orange-300 text-sm">Complex production workflows</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-yellow-400 text-lg">🎓</span>
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Years of training required</p>
                        <p className="text-yellow-300 text-sm">Professional skills needed</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                      <div className="w-10 h-10 bg-gray-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-lg">🚫</span>
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Limited to professionals</p>
                        <p className="text-gray-300 text-sm">High barrier to entry</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* After: SceneFlow AI Solution */}
                <div className="text-center">
                  <div className="mb-6">
                    <div className="inline-flex items-center px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full mb-4">
                      <span className="text-green-400 text-sm font-medium">✅ SceneFlow AI Solution</span>
                    </div>
                    <h4 className="text-xl font-semibold text-white mb-2">Simple & Accessible</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 text-lg">💚</span>
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">One automated platform subscription</p>
                        <p className="text-green-300 text-sm">$5-399/month all-inclusive</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 text-lg">⚡</span>
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Minutes, not weeks</p>
                        <p className="text-blue-300 text-sm">AI-powered automation</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-400 text-lg">🤖</span>
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">No technical skills needed</p>
                        <p className="text-purple-300 text-sm">AI handles the complexity</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                      <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-teal-400 text-lg">🌍</span>
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Accessible to everyone</p>
                        <p className="text-teal-300 text-sm">Democratized video creation</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Transformation Highlight */}
              <div className="text-center p-6 bg-gradient-to-r from-sf-primary/20 to-sf-accent/20 border border-sf-primary/30 rounded-xl">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-sf-primary rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <span className="text-sf-primary font-semibold text-lg">Transformation</span>
                </div>
                <p className="text-sf-text-primary text-sm">
                  SceneFlow AI removes all traditional barriers, making professional video production accessible to creators of all skill levels
                </p>
              </div>
            </div>
            
            {/* Video Demo Placeholder */}
            <div className="mt-8 bg-black rounded-lg p-4">
              <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-sf-primary to-sf-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-gray-400 text-sm">Auto-playing transformation demonstration</p>
                  <p className="text-gray-500 text-xs">See how SceneFlow AI removes barriers to professional video creation</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
