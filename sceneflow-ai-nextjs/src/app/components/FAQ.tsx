'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'

export function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const faqs = [
    // AI-Guided Production FAQs
    {
      question: 'How does AI-guided production work for ideas, scripts, and videos?',
      answer:
        'SceneFlow AI guides you through a seamless 4-phase workflow: Ideation → Script → Storyboard → Video. Start by describing your concept in plain language, and our AI generates a professional screenplay with proper formatting, scene breakdowns, and character arcs. From there, it creates visual storyboards for each scene and produces video with AI-generated imagery and voice acting. The AI handles all technical complexity while you focus on creative decisions.',
    },
    {
      question: 'Can I customize the AI-generated scripts and storyboards?',
      answer:
        'Absolutely! Every AI output is fully editable. Refine dialogue, adjust scene pacing, modify character descriptions, or completely rewrite sections. SceneFlow AI treats your edits as creative direction—the system learns your preferences and adapts future suggestions accordingly. You maintain complete creative control while the AI accelerates your workflow.',
    },
    // AI Editing Tools FAQs
    {
      question: 'What AI editing tools are available for frames and video?',
      answer:
        'SceneFlow AI provides powerful frame-by-frame and video editing tools: regenerate individual frames with refined prompts, adjust timing and pacing, swap voice actors, modify scene transitions, and fine-tune visual consistency. The AI Segment Editor lets you isolate and regenerate specific portions of your video without affecting the rest. All edits preserve your character consistency and visual style.',
    },
    {
      question: "How do I fix a single frame or video segment I don't like?",
      answer:
        'Use the Segment Editor to select any frame or video clip you want to change. Describe what you want different—"make the lighting warmer," "change the character\'s expression to surprised," or "add rain to the background." The AI regenerates just that segment while maintaining continuity with surrounding frames. You can iterate as many times as needed until it\'s perfect.',
    },
    // Screening Room FAQs
    {
      question: 'What is the Screening Room for storyboard and video reviews?',
      answer:
        'The Screening Room is your collaborative review hub. Share your storyboards and video drafts with team members, clients, or stakeholders via secure shareable links. Reviewers can leave timestamped comments on specific frames or scenes, suggest edits, and approve final cuts. All feedback is centralized in one place, eliminating scattered email threads and version confusion.',
    },
    {
      question: 'How does collaborative feedback work in the Screening Room?',
      answer:
        'Invite reviewers by sharing a unique link—no account required for viewers. They can watch your video, pause at any moment, and leave comments tied to specific timecodes. You\'ll see all feedback in a threaded format, can respond to comments, mark them as resolved, and track which suggestions have been addressed. It\'s like Google Docs collaboration, but for video.',
    },
    // Director Scoring FAQs
    {
      question: 'How does Director and Audience scoring work?',
      answer:
        'SceneFlow AI provides two scoring perspectives: Director Score evaluates technical craft (pacing, visual consistency, audio quality, narrative structure) while Audience Score predicts emotional engagement and entertainment value. Both scores update in real-time as you edit, helping you balance artistic vision with audience appeal. See exactly which scenes need work and why.',
    },
    {
      question: 'How does scoring integrate with AI editing tools?',
      answer:
        'Scores aren\'t just numbers—they\'re actionable. Click on any low-scoring scene to see specific AI recommendations: "This scene\'s pacing feels rushed—consider adding 2 seconds to the emotional beat" or "Audio levels drop here—regenerate with clearer voice acting." One-click applies the AI\'s suggested fix, or use it as guidance for your own edits. The system learns what works for your style.',
    },
    // General Platform FAQs
    {
      question: 'How does the $5 trial work?',
      answer:
        'For the price of a coffee, you get 1,000 credits to explore the full platform. That\'s enough to generate scripts, create character portraits, produce video clips, and add voice acting. No subscription required—just a one-time payment to see what SceneFlow can do for your creative projects.',
    },
    {
      question: 'Do I need technical skills or video editing experience?',
      answer:
        'Not at all! SceneFlow AI handles all the technical complexity. If you can describe your idea in words, you can create professional videos. Our AI manages script formatting, visual consistency, voice synthesis, and video assembly automatically. The interface is designed for creators, not engineers.',
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
