'use client'

import { motion } from 'framer-motion'
import { Clock, Zap, Rocket, Wand2, CheckCircle } from 'lucide-react'

export function ProblemSolution() {
  return (
    <section className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl font-bold mb-6">The Problems We Solve</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Traditional video production is slow, expensive, and requires years of experience. SceneFlow AI solves these challenges with our complete 6-step workflow.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* For Professionals */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 h-full">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-sf-primary/20 rounded-2xl flex items-center justify-center mr-4">
                  <Rocket className="w-8 h-8 text-sf-primary" />
                </div>
                <h3 className="text-2xl font-bold">Stop Wasting Days on Pre-Production</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-red-400">Pain Points:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <Clock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Manual storyboarding takes days</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Clock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Tedious shot lists and planning</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Clock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Creative block and revisions</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Clock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Time-consuming logistics</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-sf-accent">Solution:</h4>
                  <p className="text-gray-300 mb-4">
                    SceneFlow AI automates the entire pre-production process, turning your ideas into professional film packages in minutes.
                  </p>
                  <div className="flex items-center text-sm">
                    <Zap className="w-5 h-5 text-sf-accent mr-2" />
                    <span className="text-sf-accent font-medium">10x faster pre-production</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* For New Creators */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 h-full">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mr-4">
                  <Wand2 className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold">Create Videos That Look Professional, Instantly</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-red-400">Pain Points:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <Clock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Lack of technical knowledge</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Clock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Complex software learning curve</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Clock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Achieving cinematic look</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Clock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">Getting started without experience</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-sf-accent">Solution:</h4>
                  <p className="text-gray-300 mb-4">
                    Our AI-powered tools provide professional-grade results regardless of your experience level, with built-in best practices and industry standards.
                  </p>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-5 h-5 text-sf-accent mr-2" />
                    <span className="text-sf-accent font-medium">Professional results, zero experience required</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
