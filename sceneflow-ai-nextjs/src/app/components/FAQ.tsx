'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'

export function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: 'What is SceneFlow AI?',
      answer:
        'SceneFlow AI is an AI-powered virtual production studio that transforms your creative ideas into professional films. Write a simple concept, and our AI generates scripts, creates consistent characters, produces stunning visuals, and adds professional voice acting—all in one seamless platform.',
    },
    {
      question: 'How does the $5 trial work?',
      answer:
        'For the price of a coffee, you get 1,000 credits to explore the full platform. That\'s enough to generate scripts, create character portraits, produce video clips, and add voice acting. No subscription required—just a one-time payment to see what SceneFlow can do for your creative projects.',
    },
    {
      question: 'Do I need technical skills or video editing experience?',
      answer:
        'Absolutely not! SceneFlow AI handles all the technical complexity. If you can describe your idea in words, you can create professional videos. Our AI manages script formatting, visual consistency, voice synthesis, and video assembly automatically.',
    },
    {
      question: 'How does character consistency work?',
      answer:
        'Our AI maintains character identity across all scenes in your production. Once you define a character\'s appearance, personality, and voice, SceneFlow ensures they look and sound consistent throughout your entire film—no manual tracking or editing required.',
    },
    {
      question: 'What types of content can I create?',
      answer:
        'SceneFlow AI supports a wide range of creative projects: short films, narrative stories, marketing videos, educational content, social media clips, animated explainers, and more. Our platform adapts to your creative vision, whether you\'re making a 30-second ad or a 10-minute documentary.',
    },
    {
      question: 'How long does it take to create a video?',
      answer:
        'Most users go from initial idea to finished video in under an hour. Script generation takes seconds, character creation is instant, and video production happens in real-time. What used to require weeks of pre-production now happens in a single creative session.',
    },
  ]

  return (
    <section id="faq" className="py-24 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-amber-500/10 border border-cyan-500/20 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-cyan-400 mr-2" />
            <span className="text-sm font-medium text-gray-300">Got Questions?</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-gray-400">
            Everything you need to know about SceneFlow AI
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
              className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-hidden hover:border-cyan-500/20 transition-colors"
            >
              <button
                onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                className="w-full text-left p-6 flex justify-between items-center gap-4"
              >
                <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${
                    activeIndex === index ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {activeIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6">
                      <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
