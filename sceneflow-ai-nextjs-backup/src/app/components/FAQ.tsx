'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: "What is the BYOK (Bring Your Own Key) model?",
      answer: "BYOK means you provide your own Google Gemini API key for AI generation. This gives you direct control over your AI costs and ensures you're only paying for what you use. SceneFlow AI provides the workflow tools and platform access."
    },
    {
      question: "What happens if I don't provide my own API key?",
      answer: "You can still access all SceneFlow AI workflow tools, storyboarding, and project management features. However, you'll need a Gemini API key to generate actual video content and AI-powered assets."
    },
    {
      question: "How do Project Credits work?",
      answer: "Credits are consumed when you use AI generation features like creating storyboards, scene directions, or video clips. Each action costs a certain number of credits based on complexity. Your subscription provides a monthly credit allowance."
    },
    {
      question: "What AI models do you use?",
      answer: "We use Google's Gemini models for text analysis, image generation, and video creation. These are state-of-the-art multimodal AI models that provide professional-quality outputs for creative projects."
    },
    {
      question: "Can I cancel my subscription at any time?",
      answer: "Yes, you can cancel your subscription at any time. Your access continues until the end of your current billing period. No long-term contracts or cancellation fees."
    },
    {
      question: "Do I need video editing experience?",
      answer: "No! SceneFlow AI is designed for creators of all skill levels. Our AI workflow tools guide you through the entire process, from ideation to final output. You can focus on your creative vision while AI handles the technical complexity."
    },
    {
      question: "Can I use my own assets and branding?",
      answer: "Absolutely! You can upload your own images, logos, and brand elements. SceneFlow AI will incorporate these into your generated content, ensuring your projects maintain your unique brand identity."
    },
    {
      question: "Why does the trial cost $5?",
      answer: "Our $5 trial fee covers the operational costs of providing professional-grade AI visualization tools. This small investment ensures dedicated, high-speed access for serious creators and helps us maintain the quality of service you deserve. Think of it as the price of a latte for access to premium creative tools."
    }
  ]

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-24 bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold mb-6">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Everything you need to know about SceneFlow AI and how it can transform your creative workflow.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-800/50 transition-colors duration-200"
              >
                <span className="text-lg font-medium text-white">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              
              {openIndex === index && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-6 pb-4 border-t border-gray-800"
                >
                  <p className="text-gray-300 leading-relaxed pt-4">{faq.answer}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-gray-400 mb-6">
            Still have questions? We&apos;re here to help you succeed.
          </p>
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105">
            Contact Support
          </button>
        </motion.div>
      </div>
    </section>
  )
}
