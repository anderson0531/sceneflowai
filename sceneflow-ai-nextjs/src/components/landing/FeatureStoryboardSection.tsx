'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, PlayCircle, Clock3, Maximize2, X } from 'lucide-react';
import NextImage from 'next/image';
import { useState } from 'react';

type FeatureStoryboardItem = {
  id: number;
  title: string;
  description: string;
  videoSlot: string;
  screenshotSlot: string;
  screenshotUrl?: string;
  videoUrl?: string;
};

// ... (FEATURE_STORYBOARD_ITEMS stay the same)

function StoryboardCard({ 
  item, 
  onExpand 
}: { 
  item: FeatureStoryboardItem; 
  onExpand: (url: string) => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-semibold text-purple-200">
          {item.id}
        </span>
        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.description}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-dashed border-white/20 bg-slate-950/70 p-4">
          <p className="mb-2 inline-flex items-center justify-between text-xs font-medium uppercase tracking-wide text-cyan-300">
            <span className="flex items-center gap-2">
              <Camera className="h-3.5 w-3.5" />
              Screenshot
            </span>
            {item.screenshotUrl && (
              <button 
                onClick={() => onExpand(item.screenshotUrl!)}
                className="hover:text-white transition-colors"
                title="Expand Image"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            )}
          </p>
          <div 
            className={`aspect-video rounded-lg border border-white/10 bg-slate-900/70 overflow-hidden flex items-center justify-center relative group ${item.screenshotUrl ? 'cursor-zoom-in' : ''}`}
            onClick={() => item.screenshotUrl && onExpand(item.screenshotUrl)}
          >
            {item.screenshotUrl ? (
              <>
                <NextImage 
                  src={item.screenshotUrl} 
                  alt={item.title}
                  width={640}
                  height={360}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
                </div>
              </>
            ) : (
              <div className="p-3 text-xs text-slate-400">
                {item.screenshotSlot}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-white/20 bg-slate-950/70 p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-300">
            <PlayCircle className="h-3.5 w-3.5" />
            Feature Video
          </p>
          <div className="aspect-video rounded-lg border border-white/10 bg-slate-900/70 overflow-hidden flex items-center justify-center">
            {item.videoUrl ? (
              <video 
                src={item.videoUrl} 
                className="w-full h-full object-cover"
                autoPlay 
                muted 
                loop 
                playsInline 
              />
            ) : (
              <div className="p-3 text-xs text-slate-400">
                {item.videoSlot}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function FeatureStoryboardSection() {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  return (
    <section id="feature-storyboard" className="bg-slate-950 py-20 sm:py-24 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-purple-200">
            <Clock3 className="h-3.5 w-3.5" />
            Feature Deep Dive
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Product Walkthrough
          </h2>
          <p className="mt-4 text-base text-slate-300">
            A complete guide to the SceneFlow AI Studio workflow, from initial concept to final cinematic output.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {FEATURE_STORYBOARD_ITEMS.map((item) => (
            <StoryboardCard 
              key={item.id} 
              item={item} 
              onExpand={setExpandedImage} 
            />
          ))}
        </div>
      </div>

      {/* Lightbox / Expand Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-12 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <X className="w-5 h-5" />
                Close Preview
              </button>
              
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <NextImage
                  src={expandedImage}
                  alt="Expanded view"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
