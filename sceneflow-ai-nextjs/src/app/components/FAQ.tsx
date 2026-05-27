'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'

export function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: 'How does the SceneFlow workflow run from idea to publish-ready video?',
      answer:
        'SceneFlow uses a structured workflow: Series (optional) → Blueprint → Production → Final Cut → Premiere. Blueprint defines story structure and target audience with Audience Resonance. Production generates script, storyboard, beat video, and rendered scene streams. Final Cut assembles selected streams into one master MP4 — not a timeline editor. Premiere handles screenings, analytics insights, YouTube publish, and export bundles.',
    },
    {
      question: 'How is SceneFlow different from Gemini Studio or Google Flow?',
      answer:
        'Gemini Studio and Google Flow focus on prompt-and-generate clips. SceneFlow bundles the full production workflow: structured phases with editable baselines, Reference Library and Beat Frames for consistency, Audience Resonance before expensive renders, automated Mixer and stream assembly, and Screening Room validation before publish — all in one guided studio.',
    },
    {
      question: 'Can I edit AI-generated scripts, visuals, and audio?',
      answer:
        'Yes. All generated output remains editable. You can rewrite scripts, adjust scene direction, regenerate specific beats, tune voiceover, and refine timing in the Production Mixer. Final Cut only stitches finished streams — creative changes stay upstream in Production.',
    },
    {
      question: 'How does Target Audience Resonance work now?',
      answer:
        'Director/Audience dual scoring has been deprecated. SceneFlow now uses Target Audience Resonance analysis at key points: Series, Blueprint, and script-level review in Production. You get actionable recommendations to optimize clarity, pacing, emotion, and audience fit before heavy rendering.',
    },
    {
      question: 'Can I produce multilingual listing or marketing videos?',
      answer:
        'Yes. You can generate and localize videos in 70+ languages with aligned timing workflows. Teams typically create one master cut, then produce language variants for global buyers, customers, or regional audiences.',
    },
    {
      question: 'What does Premiere do if Screening Room is the review phase?',
      answer:
        'Screening Room is the review surface inside Premiere — and for Production storyboard preview. Share /s/ links, collect stakeholder feedback and optional engagement analytics (with viewer consent), review Scoring and Visual insights, then publish via YouTube wizard or export bundles.',
    },
    {
      question: 'Do I need technical or editing experience?',
      answer:
        'No. SceneFlow is built for non-technical creators and teams. You start with guided inputs and editable AI baselines at each phase — not complex prompt engineering or multi-tool stacks.',
    },
    {
      question: 'How does the Explorer Plan work?',
      answer:
        'For $9, you get 750 credits to test the full workflow with a one-time purchase. It is designed as a practical test flight so you can run real concept-to-video tasks before choosing a monthly plan.',
    },
    {
      question: 'How are credits and BYOK handled?',
      answer:
        'Credits are tracked in-platform so teams can manage budget by workflow phase. Pro and Studio plans also support Bring Your Own Key (BYOK) for supported providers, giving additional cost control for organizations with existing provider contracts.',
    },
    {
      question: 'What can I realistically create with SceneFlow?',
      answer:
        'Teams use SceneFlow for real estate tours, education content, podcasts with visual storytelling, news explainers, branded campaigns, and cinematic episode series. The same workflow supports short-form and long-form production.',
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
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-cyan-400 mr-2" />
            <span className="text-sm md:text-base font-medium text-gray-300">Got Questions?</span>
          </div>
          <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          <p className="text-base md:text-lg lg:text-xl text-gray-400">
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
