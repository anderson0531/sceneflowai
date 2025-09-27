'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export function FAQ() {
  // const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // const faqs = [
  //   {
  //     question: 'What is SceneFlow AI?',
  //     answer:
  //       'SceneFlow AI is a comprehensive video creation platform that uses AI to help you go from idea to finished video in a fraction of the time. It includes tools for scripting, storyboarding, video generation, and more.',
  //   },
  //   {
  //     question: 'Who is SceneFlow AI for?',
  //     answer:
  //       'SceneFlow AI is for anyone who wants to create professional videos quickly and easily. This includes content creators, marketers, educators, and businesses of all sizes.',
  //   },
  //   {
  //     question: 'How much does SceneFlow AI cost?',
  //     answer:
  //       'SceneFlow AI offers a variety of pricing plans to fit your needs. We have a free plan with limited features, as well as paid plans with more advanced features and higher usage limits. You can find more details on our pricing page.',
  //   },
  //   {
  //     question: 'What kind of videos can I create?',
  //     answer:
  //       'You can create a wide variety of videos with SceneFlow AI, including marketing videos, educational videos, social media videos, and more. Our AI tools are designed to be flexible and adaptable to your creative vision.',
  //   },
  // ]

  return (
    <section id="faq" className="py-24 bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold">Frequently Asked Questions</h2>
          <p className="text-lg text-gray-400 mt-4">
            Have a question? We've got answers.
          </p>
        </div>

        {/* <div className="space-y-6">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50"
            >
              <button
                onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                className="w-full text-left flex justify-between items-center"
              >
                <h3 className="text-xl font-semibold">{faq.question}</h3>
                <ChevronDown
                  className={`w-6 h-6 transition-transform ${
                    activeIndex === index ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {activeIndex === index && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <p className="text-gray-400">{faq.answer}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div> */}
      </div>
    </section>
  )
}
