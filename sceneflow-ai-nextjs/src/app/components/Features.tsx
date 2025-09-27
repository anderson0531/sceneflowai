'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Clapperboard, BrainCircuit, Bot } from 'lucide-react'

export function Features() {

  const features = [
    {
      icon: <Clapperboard className="w-8 h-8 text-sf-primary" />,
      title: 'Blueprint Storyboard',
      description: 'Visually plan your video with AI-generated storyboards that bring your script to life.',
      details: ['Scene detection', 'Shot suggestions', 'Visual consistency'],
    },
    {
      icon: <BrainCircuit className="w-8 h-8 text-sf-primary" />,
      title: 'AI-Powered Scripting',
      description: 'Generate compelling scripts from a simple idea, or enhance your existing work with AI suggestions.',
      details: ['Multiple formats', 'Character voices', 'Pacing analysis'],
    },
    {
      icon: <Bot className="w-8 h-8 text-sf-primary" />,
      title: 'Automated Video Generation',
      description: 'Turn your script and storyboard into a professional video with a single click.',
      details: ['AI voiceovers', 'Stock footage', 'Custom branding'],
    },
  ]

  return (
    <section id="features" className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold">A New Way to Create</h2>
          <p className="text-lg text-gray-400 mt-4">
            SceneFlow AI provides a complete 6-step workflow to take your ideas from concept to final video.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
              className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700/50 text-center"
            >
              <div className="w-16 h-16 bg-sf-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
              <p className="text-gray-400 mb-6">{feature.description}</p>

              <ul className="text-left space-y-3">
                {feature.details.map((detail, i) => (
                  <li key={i} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span className="text-gray-300">{detail}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
