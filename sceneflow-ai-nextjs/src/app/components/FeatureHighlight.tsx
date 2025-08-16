'use client'

import { motion } from 'framer-motion'
import { Zap, Users, Shield, Globe } from 'lucide-react'

export function FeatureHighlight() {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Generate complete storyboards in under 2 minutes, not hours.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Work seamlessly with your team. Share projects, get feedback, and iterate together.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Your content is secure. BYOK model ensures complete data privacy and control.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Globe,
      title: 'Global AI Models',
      description: 'Powered by Google Gemini and Veo for state-of-the-art AI generation.',
      color: 'from-pink-500 to-pink-600'
    }
  ]

  return (
    <section id="features" className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl font-bold mb-6">Built for Speed and Quality</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            SceneFlow AI combines cutting-edge technology with intuitive design to deliver professional results faster than ever.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            
            return (
              <motion.div 
                key={index}
                className="text-center group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className={`w-20 h-20 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
