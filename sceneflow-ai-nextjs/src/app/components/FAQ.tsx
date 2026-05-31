'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function FAQ() {
  const t = useTranslations('faq')
  const faqs = t.raw('items') as Array<{ question: string; answer: string }>
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

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
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-cyan-400 mr-2" />
            <span className="text-sm md:text-base font-medium text-gray-300">{t('badge')}</span>
          </div>
          <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-gray-400">{t('subtitle')}</p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.question}
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
