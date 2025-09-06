'use client'

import { motion } from 'framer-motion'

export function DemocratizationSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Democratizing Professional Video Production
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Transform your ideas into professional videos without the complexity, time, and costs of traditional methods
          </p>
        </motion.div>
        
        {/* Before vs After Comparison */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
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
              
              <div className="flex items-center space-x-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-400 text-lg">🌍</span>
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">Accessible to everyone</p>
                  <p className="text-indigo-300 text-sm">Democratized video creation</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Transformation Message */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full">
            <span className="text-blue-400 text-lg mr-2">➡️</span>
            <span className="text-white font-medium">
              SceneFlow AI removes all traditional barriers, making professional video production accessible to creators of all skill levels.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
