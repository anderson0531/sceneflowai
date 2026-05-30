'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, PlayCircle, Info } from 'lucide-react';
import {
  VIDEO_CATEGORIES,
  buildUseCaseExampleHash,
  getDefaultExampleId,
  getUseCaseExample,
  hasUseCaseExampleVideo,
  parseUseCaseExampleHash,
} from '@/config/landing/useCaseExamples';

export { VIDEO_CATEGORIES } from '@/config/landing/useCaseExamples';

interface ProductionComparisonVisualProps {
  initialCategoryId?: string
}

export const ProductionComparisonVisual = ({ initialCategoryId }: ProductionComparisonVisualProps) => {
  const videoPanelRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategoryId ?? VIDEO_CATEGORIES[0].id
  );
  const [activeExampleId, setActiveExampleId] = useState<string>(
    getDefaultExampleId(initialCategoryId ?? VIDEO_CATEGORIES[0].id) ??
      VIDEO_CATEGORIES[0].examples[0].id
  );

  const selectExample = useCallback(
    (categoryId: string, exampleId: string, updateHash = true) => {
      setActiveCategory(categoryId);
      setActiveExampleId(exampleId);

      if (updateHash && typeof window !== 'undefined') {
        const nextHash = buildUseCaseExampleHash(categoryId, exampleId);
        if (window.location.hash.slice(1) !== nextHash) {
          window.location.hash = nextHash;
        }
      }
    },
    []
  );

  const syncFromHash = useCallback(() => {
    const hash = window.location.hash.slice(1);
    const parsed = parseUseCaseExampleHash(hash);
    if (parsed) {
      setActiveCategory(parsed.categoryId);
      setActiveExampleId(parsed.exampleId);
    }
  }, []);

  useEffect(() => {
    if (initialCategoryId && VIDEO_CATEGORIES.some((cat) => cat.id === initialCategoryId)) {
      const defaultExampleId = getDefaultExampleId(initialCategoryId);
      if (defaultExampleId) {
        setActiveCategory(initialCategoryId);
        const parsed = parseUseCaseExampleHash(window.location.hash.slice(1));
        if (!parsed || parsed.categoryId !== initialCategoryId) {
          setActiveExampleId(defaultExampleId);
        }
      }
    }
  }, [initialCategoryId]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [syncFromHash]);

  const activeCategoryData =
    VIDEO_CATEGORIES.find((cat) => cat.id === activeCategory) ?? VIDEO_CATEGORIES[0];
  const activeExample =
    getUseCaseExample(activeCategoryData.id, activeExampleId) ??
    activeCategoryData.examples[0];

  const handleCategoryClick = (categoryId: string) => {
    const defaultExampleId = getDefaultExampleId(categoryId);
    if (!defaultExampleId) return;
    selectExample(categoryId, defaultExampleId);
  };

  const handleExampleClick = (
    categoryId: string,
    exampleId: string,
    e: React.MouseEvent<HTMLAnchorElement>
  ) => {
    e.preventDefault();
    selectExample(categoryId, exampleId);
    videoPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

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
            <div className="text-xs text-slate-400 font-medium bg-slate-900 px-2 py-1 rounded border border-white/5">
              {VIDEO_CATEGORIES.length} SECTORS
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden flex-col md:flex-row">
            {/* Sidebar Categories */}
            <div className="min-h-0 w-full md:w-1/3 overflow-y-auto border-r border-white/10 bg-slate-950/50 flex md:flex-col overflow-x-auto md:overflow-x-hidden border-b md:border-b-0">
              {VIDEO_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`w-full text-left p-4 transition-all border-b border-white/5 group whitespace-nowrap md:whitespace-normal shrink-0 ${
                    activeCategory === cat.id
                      ? 'bg-cyan-500/10 text-cyan-400 border-r-0 md:border-r-2 md:border-b-0 border-b-2 border-cyan-500'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <p className="text-sm font-bold leading-tight">{cat.title}</p>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="relative min-h-0 w-full md:w-2/3 overflow-y-auto bg-slate-900/50 p-4">
              <AnimatePresence mode="wait">
                {VIDEO_CATEGORIES.map(
                  (cat) =>
                    cat.id === activeCategory && (
                      <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-4"
                      >
                        <div className="mb-4 hidden md:block">
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <Video className="w-4 h-4 text-cyan-400" />
                            {cat.title}
                          </h4>
                          <div className="h-0.5 w-12 bg-cyan-500/50 mt-1 rounded-full" />
                        </div>

                        <div
                          ref={videoPanelRef}
                          className="mb-4 rounded-lg border border-cyan-500/20 bg-slate-950/80 overflow-hidden shadow-xl"
                        >
                          <div className="border-b border-white/5 bg-slate-900/80 px-3 py-2">
                            <p className="text-xs font-medium text-cyan-300/90 truncate">
                              {activeExample.label}
                            </p>
                          </div>
                          {hasUseCaseExampleVideo(activeExample) ? (
                            <video
                              key={`${cat.id}-${activeExample.id}-${activeExample.videoSrc}`}
                              src={activeExample.videoSrc}
                              controls
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full aspect-video bg-black object-contain max-h-[400px]"
                            />
                          ) : (
                            <div className="w-full aspect-video bg-slate-950 flex flex-col items-center justify-center gap-2 max-h-[400px] px-6 text-center">
                              <p className="text-xs text-slate-500 uppercase tracking-wider">
                                Demo coming soon
                              </p>
                              <p className="text-sm text-slate-400">{activeExample.label}</p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {cat.examples.map((ex) => {
                            const isActive =
                              activeCategory === cat.id && activeExampleId === ex.id;
                            const exampleHash = buildUseCaseExampleHash(cat.id, ex.id);

                            return (
                              <a
                                key={ex.id}
                                href={`#${exampleHash}`}
                                onClick={(e) => handleExampleClick(cat.id, ex.id, e)}
                                aria-current={isActive ? 'true' : undefined}
                                className={`relative p-3 rounded-lg border transition-all cursor-pointer h-full flex flex-col justify-start no-underline ${
                                  isActive
                                    ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-900/20'
                                    : 'bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-950/60'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2 gap-2">
                                  <span
                                    className={`text-sm font-semibold ${
                                      isActive ? 'text-cyan-300' : 'text-slate-300'
                                    }`}
                                  >
                                    {ex.label}
                                  </span>
                                  <Info
                                    className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                                      isActive
                                        ? 'opacity-100 text-cyan-400'
                                        : 'opacity-30 text-slate-500'
                                    }`}
                                  />
                                </div>

                                <p
                                  className={`text-sm mt-auto transition-colors duration-200 leading-relaxed ${
                                    isActive ? 'text-slate-200' : 'text-slate-400'
                                  }`}
                                >
                                  {ex.description}
                                </p>

                                {!hasUseCaseExampleVideo(ex) && (
                                  <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">
                                    Video placeholder
                                  </p>
                                )}
                              </a>
                            );
                          })}
                        </div>
                      </motion.div>
                    )
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Instruction */}
          <div className="shrink-0 border-t border-white/10 bg-slate-950 p-2 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
              Select an example to preview its demo
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
