'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, DollarSign, Layers, User, Users, Video, PlayCircle, Info } from 'lucide-react';

const VIDEO_CATEGORIES = [
  {
    id: 'property',
    title: "Property, Spaces & Hospitality",
    videoSrc: '/demo/property-hospitality.mp4',
    examples: [
      { label: "Residential Real Estate", description: "Automated listing tours featuring the agent's cloned voice and avatar identity." },
      { label: "Commercial Real Estate", description: "Investor pitch videos showing floor plans, 3D renderings of future developments, and neighborhood data." },
      { label: "Short-Term Rentals", description: "Automated \"Digital Welcome Books\" that walk guests through house features and local \"best of\" spots." },
      { label: "Hospitality & Tourism", description: "Hotel virtual tours and narrated travel itineraries for agencies." },
      { label: "Museum & Gallery Guides", description: "Multi-language audio-visual \"tours\" for exhibitions that can be updated JIT as exhibits change." }
    ]
  },
  {
    id: 'knowledge',
    title: "Knowledge, Training & Education",
    examples: [
      { label: "K-12 & Higher Ed", description: "30-minute curriculum modules that can be instantly localized for ESL students or global campuses." },
      { label: "Corporate L&D", description: "Compliance training, safety protocols, and new-hire onboarding that stays consistent across global offices." },
      { label: "Software SaaS Tutorials", description: "Automated \"walk-throughs\" using UI screenshots as reference images for F2V motion." },
      { label: "Niche Skill Tutoring", description: "Professional \"How-To\" series for cooking, DIY, or technical certifications." },
      { label: "Medical/Patient Education", description: "Narrated explanations of surgical procedures or medication management for hospitals and clinics." }
    ]
  },
  {
    id: 'jit',
    title: "JIT Media & Information",
    examples: [
      { label: "Hyper-Local News", description: "Automated daily news briefs for small towns or specific neighborhoods where a film crew is too expensive." },
      { label: "Financial & Market Recaps", description: "Turning daily stock market or crypto data into 3-minute narrated visual digests." },
      { label: "Sports Commentary", description: "Automated \"recap\" videos using game stats and static photography turned into F2V action." },
      { label: "True Crime & Historical Docs", description: "Using the Reference Library to keep historical figures consistent across a multi-part documentary series." },
      { label: "Weather & Emergency Alerts", description: "Multilingual emergency broadcasts that need to be generated and published in minutes across social platforms." }
    ]
  },
  {
    id: 'b2b',
    title: "B2B Marketing & Sales",
    examples: [
      { label: "Product Explainer Videos", description: "Turning a static product catalog into a cinematic series of \"Why You Need This\" videos." },
      { label: "Case Study/Testimonials", description: "Using client headshots and project photos to create high-end visual success stories." },
      { label: "Recruitment & Branding", description: "Giving candidates a narrated \"day in the life\" tour of the office and culture." },
      { label: "Conference & Event Promos", description: "Automated \"Speaker Bio\" videos and \"What to Expect\" guides for large-scale events." }
    ]
  },
  {
    id: 'public',
    title: "Public Sector & Advocacy",
    examples: [
      { label: "NGO Impact Reports", description: "Turning data and field photography into emotive, narrated videos for donors." },
      { label: "Public Health Announcements", description: "Universal messaging (vaccination, hygiene, safety) that needs to hit 70+ languages with perfect clarity." },
      { label: "Legal & Insurance Explainers", description: "Helping clients understand complex contracts or claim processes through narrated visual breakdowns." },
      { label: "Religious & Spiritual Teachings", description: "Converting sermons or texts into a consistent, narrated daily video series for global congregations." }
    ]
  }
];

const ProductionComparisonVisual = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(VIDEO_CATEGORIES[0].id);
  const [hoveredExample, setHoveredExample] = useState<{catId: string, index: number} | null>(null);

  return (
    <div className="relative flex h-full min-h-[22rem] w-full flex-col mx-auto max-w-2xl">
      <motion.div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-emerald-500/20 rounded-2xl blur-xl -z-10" />
        
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-800/80 p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <PlayCircle className="w-5 h-5" />
              <p className="text-sm font-semibold uppercase tracking-wider">Example Use Cases</p>
            </div>
            <div className="text-[10px] text-slate-400 font-medium bg-slate-900 px-2 py-1 rounded border border-white/5">
              5 SECTORS
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Sidebar Categories */}
            <div className="min-h-0 w-1/3 overflow-y-auto border-r border-white/10 bg-slate-950/50">
              {VIDEO_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left p-4 transition-all border-b border-white/5 group ${
                    activeCategory === cat.id 
                      ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-r-cyan-500' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-bold leading-tight">{cat.title}</p>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="relative min-h-0 w-2/3 overflow-y-auto bg-slate-900/50 p-4">
              <AnimatePresence mode="wait">
                {VIDEO_CATEGORIES.map((cat) => cat.id === activeCategory && (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-2"
                  >
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Video className="w-4 h-4 text-cyan-400" />
                        {cat.title}
                      </h4>
                      <div className="h-0.5 w-12 bg-cyan-500/50 mt-1 rounded-full" />
                    </div>

                    <div className="mb-3 rounded-lg border border-cyan-500/20 bg-slate-950/80 overflow-hidden">
                      {cat.videoSrc ? (
                        <video
                          key={cat.videoSrc}
                          src={cat.videoSrc}
                          controls
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full aspect-video bg-black"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-slate-950 flex items-center justify-center">
                          <p className="text-xs text-slate-500 uppercase tracking-wider">
                            Video placeholder
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      {cat.examples.map((ex, idx) => (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredExample({ catId: cat.id, index: idx })}
                          onMouseLeave={() => setHoveredExample(null)}
                          className={`relative p-3 rounded-lg border transition-all cursor-default ${
                            hoveredExample?.catId === cat.id && hoveredExample?.index === idx
                              ? 'bg-cyan-500/10 border-cyan-500/40'
                              : 'bg-slate-950/40 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${
                              hoveredExample?.catId === cat.id && hoveredExample?.index === idx
                                ? 'text-cyan-300'
                                : 'text-slate-300'
                            }`}>
                              {ex.label}
                            </span>
                            <Info className={`w-3 h-3 transition-opacity ${
                              hoveredExample?.catId === cat.id && hoveredExample?.index === idx
                                ? 'opacity-100 text-cyan-400'
                                : 'opacity-30 text-slate-500'
                            }`} />
                          </div>
                          
                          <AnimatePresence>
                            {hoveredExample?.catId === cat.id && hoveredExample?.index === idx && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed italic border-t border-white/5 pt-2">
                                  {ex.description}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Instruction */}
          <div className="shrink-0 border-t border-white/10 bg-slate-950 p-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Hover items for production details
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ComparisonContent = () => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-white">Traditional production overhead vs SceneFlow speed</h3>
        <p className="mt-2 text-gray-400">
          Traditional production often requires multiple specialists, longer scheduling windows, and higher up-front costs.
          SceneFlow gives one creator the tools to move from concept to finished video in one workflow.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="bg-slate-900/50 p-6 rounded-lg border border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-red-300" />
              <div>
                <h4 className="text-lg font-semibold text-white">Traditional production model</h4>
                <p className="text-sm text-gray-400">Multiple vendors, specialist roles, and approval handoffs</p>
              </div>
            </div>
            <span className="text-sm px-2 py-1 rounded-md bg-red-500/20 text-red-200">Higher friction</span>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md border border-white/10 bg-slate-950/70 p-3 text-sm text-gray-300 inline-flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-300" />
              5+ roles
            </div>
            <div className="rounded-md border border-white/10 bg-slate-950/70 p-3 text-sm text-gray-300 inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-300" />
              Weeks to launch
            </div>
            <div className="rounded-md border border-white/10 bg-slate-950/70 p-3 text-sm text-gray-300 inline-flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-red-300" />
              Higher fixed costs
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-lg border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-emerald-300" />
              <div>
                <h4 className="text-lg font-semibold text-white">SceneFlow automated production</h4>
                <p className="text-sm text-gray-400">One platform from blueprint to final cut and publish-ready assets</p>
              </div>
            </div>
            <span className="text-sm px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-200">Lower barrier</span>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md border border-white/10 bg-slate-950/70 p-3 text-sm text-gray-300 inline-flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-300" />
              1 creator workflow
            </div>
            <div className="rounded-md border border-white/10 bg-slate-950/70 p-3 text-sm text-gray-300 inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-300" />
              Same-day iteration
            </div>
            <div className="rounded-md border border-white/10 bg-slate-950/70 p-3 text-sm text-gray-300 inline-flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-300" />
              Transparent credit budget
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SlotMachineSection() {
  return (
    <section id="comparison" className="py-20 sm:py-28 bg-gray-950 overflow-hidden scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 text-sm font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 rounded-full"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Clock className="w-5 h-5" />
            Traditional vs SceneFlow
          </motion.div>
          
          <motion.h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Remove production cost and time barriers
          </motion.h2>

          <motion.p 
            className="mt-4 text-lg text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Compare the complexity of traditional video production teams with a single automated SceneFlow workflow.
            The result is faster delivery, lower overhead, and more room to iterate.
          </motion.p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2 md:items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <ComparisonContent />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex h-full min-h-0"
          >
            <ProductionComparisonVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
