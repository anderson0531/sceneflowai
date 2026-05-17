'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, PlayCircle, Info } from 'lucide-react';

export const VIDEO_CATEGORIES = [
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
    videoSrc: 'https://storage.googleapis.com/sceneflow-assets/demo/living-wall.mp4',
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
    videoSrc: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/signal.mp4',
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
    videoSrc: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Demo.mp4',
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
    videoSrc: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/NGO.mp4',
    examples: [
      { label: "NGO Impact Reports", description: "Turning data and field photography into emotive, narrated videos for donors." },
      { label: "Public Health Announcements", description: "Universal messaging (vaccination, hygiene, safety) that needs to hit 70+ languages with perfect clarity." },
      { label: "Legal & Insurance Explainers", description: "Helping clients understand complex contracts or claim processes through narrated visual breakdowns." },
      { label: "Religious & Spiritual Teachings", description: "Converting sermons or texts into a consistent, narrated daily video series for global congregations." }
    ]
  }
];

export const ProductionComparisonVisual = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(VIDEO_CATEGORIES[0].id);
  const [hoveredExample, setHoveredExample] = useState<{catId: string, index: number} | null>(null);

  return (
    <div className="relative flex h-full min-h-[22rem] w-full flex-col mx-auto max-w-4xl">
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
              <p className="text-sm font-semibold uppercase tracking-wider">Use Cases</p>
            </div>
            <div className="text-[10px] text-slate-400 font-medium bg-slate-900 px-2 py-1 rounded border border-white/5">
              5 SECTORS
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden flex-col md:flex-row">
            {/* Sidebar Categories */}
            <div className="min-h-0 w-full md:w-1/3 overflow-y-auto border-r border-white/10 bg-slate-950/50 flex md:flex-col overflow-x-auto md:overflow-x-hidden border-b md:border-b-0">
              {VIDEO_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left p-4 transition-all border-b border-white/5 group whitespace-nowrap md:whitespace-normal shrink-0 ${
                    activeCategory === cat.id 
                      ? 'bg-cyan-500/10 text-cyan-400 border-r-0 md:border-r-2 md:border-b-0 border-b-2 border-cyan-500' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-bold leading-tight">{cat.title}</p>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="relative min-h-0 w-full md:w-2/3 overflow-y-auto bg-slate-900/50 p-4">
              <AnimatePresence mode="wait">
                {VIDEO_CATEGORIES.map((cat) => cat.id === activeCategory && (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="mb-4 hidden md:block">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Video className="w-4 h-4 text-cyan-400" />
                        {cat.title}
                      </h4>
                      <div className="h-0.5 w-12 bg-cyan-500/50 mt-1 rounded-full" />
                    </div>

                    <div className="mb-4 rounded-lg border border-cyan-500/20 bg-slate-950/80 overflow-hidden shadow-xl">
                      {cat.videoSrc ? (
                        <video
                          key={cat.videoSrc}
                          src={cat.videoSrc}
                          controls
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full aspect-video bg-black object-contain max-h-[400px]"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-slate-950 flex items-center justify-center max-h-[400px]">
                          <p className="text-xs text-slate-500 uppercase tracking-wider">
                            Video placeholder
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {cat.examples.map((ex, idx) => (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredExample({ catId: cat.id, index: idx })}
                          onMouseLeave={() => setHoveredExample(null)}
                          className={`relative p-3 rounded-lg border transition-all cursor-default h-full flex flex-col justify-start ${
                            hoveredExample?.catId === cat.id && hoveredExample?.index === idx
                              ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-900/20'
                              : 'bg-slate-950/40 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold ${
                              hoveredExample?.catId === cat.id && hoveredExample?.index === idx
                                ? 'text-cyan-300'
                                : 'text-slate-300'
                            }`}>
                              {ex.label}
                            </span>
                            <Info className={`w-3.5 h-3.5 transition-opacity ${
                              hoveredExample?.catId === cat.id && hoveredExample?.index === idx
                                ? 'opacity-100 text-cyan-400'
                                : 'opacity-30 text-slate-500'
                            }`} />
                          </div>
                          
                          <p className={`text-[11px] mt-auto transition-colors duration-200 leading-relaxed ${
                             hoveredExample?.catId === cat.id && hoveredExample?.index === idx 
                              ? 'text-slate-200' 
                              : 'text-slate-400'
                          }`}>
                            {ex.description}
                          </p>
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
              Select category to view production details
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
