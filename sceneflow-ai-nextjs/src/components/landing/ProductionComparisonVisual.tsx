'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, PlayCircle, Info, Play, Maximize2, X } from 'lucide-react';
import {
  VIDEO_CATEGORIES,
  buildUseCaseExampleHash,
  getDefaultExampleId,
  getUseCaseExample,
  parseUseCaseExampleHash,
} from '@/config/landing/useCaseExamples';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export { VIDEO_CATEGORIES } from '@/config/landing/useCaseExamples';

function ThumbnailExpandButton({
  onExpand,
  expandLabel,
  className,
}: {
  onExpand: (e: React.MouseEvent) => void;
  expandLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className={`rounded-lg bg-black/50 p-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white ${className ?? ''}`}
      aria-label={expandLabel}
    >
      <Maximize2 className="h-4 w-4" />
    </button>
  );
}

function UseCaseThumbnail({
  src,
  alt,
  className,
  fallbackLabel,
  onError,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  onError?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-slate-900 px-3 text-center ${className ?? ''}`}
      >
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          {fallbackLabel ?? alt}
        </p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="eager"
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}

function UseCaseVideoPreview({
  videoSrc,
  thumbnailSrc,
  label,
  previewKey,
  demoComingSoonLabel,
  expandLabel,
  onExpandImage,
}: {
  videoSrc: string;
  thumbnailSrc?: string;
  label: string;
  previewKey: string;
  demoComingSoonLabel: string;
  expandLabel: string;
  onExpandImage?: (url: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setPosterFailed(false);
  }, [previewKey]);

  useEffect(() => {
    if (!isPlaying) return;
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {});
  }, [isPlaying, previewKey]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const showPoster = Boolean(thumbnailSrc) && !posterFailed;

  return (
    <div className="relative w-full aspect-video max-h-[400px] bg-black">
      {!isPlaying ? (
        showPoster ? (
          <>
            <UseCaseThumbnail
              src={thumbnailSrc!}
              alt={label}
              className="h-full w-full object-cover"
              fallbackLabel={demoComingSoonLabel}
              onError={() => setPosterFailed(true)}
            />
            {onExpandImage ? (
              <ThumbnailExpandButton
                expandLabel={expandLabel}
                className="absolute top-2 right-2 z-20"
                onExpand={(e) => {
                  e.stopPropagation();
                  onExpandImage(thumbnailSrc!);
                }}
              />
            ) : null}
            <button
              type="button"
              onClick={handlePlay}
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
              aria-label={`Play demo: ${label}`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 border border-white/20 backdrop-blur-sm">
                <Play className="h-7 w-7 fill-white text-white ml-0.5" />
              </div>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handlePlay}
            className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center"
            aria-label={`Play demo: ${label}`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/40">
              <Play className="h-7 w-7 fill-cyan-300 text-cyan-300 ml-0.5" />
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{demoComingSoonLabel}</p>
            <p className="text-sm text-slate-400">{label}</p>
          </button>
        )
      ) : (
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          muted
          playsInline
          preload="none"
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}

interface ProductionComparisonVisualProps {
  initialCategoryId?: string
}

export const ProductionComparisonVisual = ({ initialCategoryId }: ProductionComparisonVisualProps) => {
  const tUi = useTranslations('useCases.ui');
  const tCategories = useTranslations('useCases');
  const entertainmentStats = tCategories.raw('entertainmentStats') as {
    title: string
    footnote: string
    stats: Array<{ value: string; label: string }>
  } | null
  const localizedCategories = useMemo(() => {
    const translated = tCategories.raw('categories') as Array<{
      id: string;
      title: string;
      qualifyingStatement?: string;
      examples: Array<{ id: string; label: string; description: string }>;
    }>;
    return translated.map((cat) => ({
      ...cat,
      examples: cat.examples.map((ex) => {
        const source = getUseCaseExample(cat.id, ex.id)
        return {
          ...ex,
          videoSrc: source?.videoSrc,
          thumbnailSrc: source?.thumbnailSrc,
        }
      }),
    }));
  }, [tCategories]);

  const videoPanelRef = useRef<HTMLDivElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategoryId ?? localizedCategories[0]?.id ?? VIDEO_CATEGORIES[0].id
  );
  const [activeExampleId, setActiveExampleId] = useState<string>(
    getDefaultExampleId(initialCategoryId ?? localizedCategories[0]?.id ?? VIDEO_CATEGORIES[0].id) ??
      localizedCategories[0]?.examples[0]?.id ??
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
    if (initialCategoryId && localizedCategories.some((cat) => cat.id === initialCategoryId)) {
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

  useEffect(() => {
    if (!expandedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedImage(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expandedImage]);

  const activeCategoryData =
    localizedCategories.find((cat) => cat.id === activeCategory) ?? localizedCategories[0];
  const activeExample =
    activeCategoryData.examples.find((ex) => ex.id === activeExampleId) ??
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
              <p className="text-sm font-semibold uppercase tracking-wider">{tUi('useCases')}</p>
            </div>
            <div className="text-xs text-slate-400 font-medium bg-slate-900 px-2 py-1 rounded border border-white/5">
              {tUi('sectors', { count: localizedCategories.length })}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden flex-col md:flex-row">
            {/* Sidebar Categories */}
            <div className="min-h-0 w-full md:w-1/3 overflow-y-auto border-r border-white/10 bg-slate-950/50 flex md:flex-col overflow-x-auto md:overflow-x-hidden border-b md:border-b-0">
              {localizedCategories.map((cat) => (
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
                {localizedCategories.map(
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
                          {cat.qualifyingStatement ? (
                            <p className="mt-3 text-xs text-slate-400 leading-relaxed border-l-2 border-cyan-500/30 pl-3">
                              {cat.qualifyingStatement}
                            </p>
                          ) : null}
                        </div>

                        {cat.qualifyingStatement ? (
                          <p className="mb-4 text-xs text-slate-400 leading-relaxed border-l-2 border-cyan-500/30 pl-3 md:hidden">
                            {cat.qualifyingStatement}
                          </p>
                        ) : null}

                        {cat.id === 'entertainment' && entertainmentStats ? (
                          <div className="mb-4 rounded-lg border border-violet-500/20 bg-violet-950/30 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300 mb-3">
                              {entertainmentStats.title}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {entertainmentStats.stats.map((stat) => (
                                <div
                                  key={stat.label}
                                  className="rounded-md bg-slate-950/60 px-2 py-2 text-center border border-white/5"
                                >
                                  <div className="text-sm font-bold text-violet-200">{stat.value}</div>
                                  <div className="text-[10px] text-slate-500 leading-snug mt-0.5">
                                    {stat.label}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">
                              {entertainmentStats.footnote}
                            </p>
                          </div>
                        ) : null}

                        <div
                          ref={videoPanelRef}
                          className="mb-4 rounded-lg border border-cyan-500/20 bg-slate-950/80 overflow-hidden shadow-xl"
                        >
                          <div className="border-b border-white/5 bg-slate-900/80 px-3 py-2">
                            <p className="text-xs font-medium text-cyan-300/90 truncate">
                              {activeExample.label}
                            </p>
                          </div>
                          {activeExample.videoSrc?.trim() ? (
                            <UseCaseVideoPreview
                              previewKey={`${cat.id}-${activeExample.id}-${activeExample.videoSrc}`}
                              videoSrc={activeExample.videoSrc}
                              thumbnailSrc={activeExample.thumbnailSrc}
                              label={activeExample.label}
                              demoComingSoonLabel={tUi('demoComingSoon')}
                              expandLabel={tUi('expandImage')}
                              onExpandImage={setExpandedImage}
                            />
                          ) : activeExample.thumbnailSrc ? (
                            <div className="relative w-full aspect-video max-h-[400px] bg-slate-950">
                              <UseCaseThumbnail
                                src={activeExample.thumbnailSrc}
                                alt={activeExample.label}
                                className="h-full w-full object-cover"
                                fallbackLabel={tUi('demoComingSoon')}
                              />
                              <ThumbnailExpandButton
                                expandLabel={tUi('expandImage')}
                                className="absolute top-2 right-2 z-10"
                                onExpand={(e) => {
                                  e.stopPropagation();
                                  setExpandedImage(activeExample.thumbnailSrc!);
                                }}
                              />
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 pointer-events-none">
                                <p className="text-xs text-slate-300 uppercase tracking-wider">
                                  {tUi('demoComingSoon')}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full aspect-video bg-slate-950 flex flex-col items-center justify-center gap-2 max-h-[400px] px-6 text-center">
                              <p className="text-xs text-slate-500 uppercase tracking-wider">
                                {tUi('demoComingSoon')}
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
                                className={`relative rounded-lg border transition-all cursor-pointer h-full flex flex-col justify-start no-underline overflow-hidden ${
                                  isActive
                                    ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-900/20'
                                    : 'bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-950/60'
                                }`}
                              >
                                {ex.thumbnailSrc ? (
                                  <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                                    <UseCaseThumbnail
                                      src={ex.thumbnailSrc}
                                      alt={ex.label}
                                      className="h-full w-full object-cover"
                                      fallbackLabel={ex.label}
                                    />
                                    <ThumbnailExpandButton
                                      expandLabel={tUi('expandImage')}
                                      className="absolute top-2 right-2 z-10"
                                      onExpand={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setExpandedImage(ex.thumbnailSrc!);
                                      }}
                                    />
                                  </div>
                                ) : null}
                                <div className="p-3 flex flex-col flex-1">
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
                                </div>
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

      <AnimatePresence>
        {expandedImage ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
            className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/90 p-4 backdrop-blur-md md:p-12"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative flex h-full w-full max-w-7xl items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                className="absolute -top-12 right-0 flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
                {tUi('closePreview')}
              </button>
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                <img
                  src={expandedImage}
                  alt={tUi('expandImage')}
                  className="h-full w-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
