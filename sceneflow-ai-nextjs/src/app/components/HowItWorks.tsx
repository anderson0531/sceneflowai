'use client'

import { motion } from 'framer-motion'
import { FileText, Clapperboard, Video, Share2 } from 'lucide-react'


export function HowItWorks() {

  const steps = [
    {
      icon: <FileText className="w-10 h-10 text-sf-primary" />,
      title: '1. Scripting',
      description: 'Start with an idea and our AI will help you craft a professional script.',
    },
    {
      icon: <Clapperboard className="w-10 h-10 text-sf-primary" />,
      title: '2. Storyboarding',
      description: 'Visualize your script with an AI-generated storyboard.',
    },
    {
      icon: <Video className="w-10 h-10 text-sf-primary" />,
      title: '3. Video Generation',
      description: 'Turn your script and storyboard into a video with a single click.',
    },
    {
      icon: <Share2 className="w-10 h-10 text-sf-primary" />,
      title: '4. Share',
      description: 'Share your video with the world.',
    },
  ]
  return (
    <section id="how-it-works" className="py-24 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold">How It Works</h2>
          <p className="text-lg text-gray-400 mt-4">
            Create professional videos in minutes, not days.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                {step.icon}
              </div>
              <h3 className="text-2xl font-semibold mb-4">{step.title}</h3>
              <p className="text-gray-400">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
