'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, PlayCircle, Info, Play, Maximize2 } from 'lucide-react';
import {
  VIDEO_CATEGORIES,
  buildUseCaseExampleHash,
  getDefaultExampleId,
  getUseCaseExample,
  parseUseCaseExampleHash,
} from '@/config/landing/useCaseExamples';
import { useTranslations } from 'next-intl';
import { ExpandedImageModal } from '@/components/landing/ExpandedImageModal';

export { VIDEO_CATEGORIES } from '@/config/landing/useCaseExamples';

const IMAGE_PREVIEW_HISTORY_KEY = 'useCaseImagePreview';

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

  useEffect(() => {
    setFailed(false);
  }, [src]);

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
      key={src}
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

function UseCaseConceptInset({
  illustrationSrc,
  label,
  conceptLabel,
  expandLabel,
  size,
  onExpandIllustration,
}: {
  illustrationSrc?: string;
  label: string;
  conceptLabel: string;
  expandLabel: string;
  size: 'preview' | 'card';
  onExpandIllustration?: (url: string) => void;
}) {
  if (!illustrationSrc || !onExpandIllustration) return null;

  const widthClass = size === 'preview' ? 'w-[28%] min-w-[88px]' : 'w-[22%] min-w-[64px]';

  return (
    <div
      className={`pointer-events-auto absolute bottom-2 left-2 z-20 ${widthClass}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative overflow-hidden rounded-md border-2 border-white/25 shadow-lg ring-1 ring-black/40">
        <UseCaseThumbnail
          key={illustrationSrc}
          src={illustrationSrc}
          alt={`${label} — ${conceptLabel}`}
          className="aspect-video w-full object-cover"
          fallbackLabel={conceptLabel}
        />
        <span className="absolute top-1 left-1 max-w-[calc(100%-1.5rem)] truncate rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
          {conceptLabel}
        </span>
        <ThumbnailExpandButton
          expandLabel={expandLabel}
          className="absolute top-1 right-1 z-10"
          onExpand={(e) => {
            e.stopPropagation();
            onExpandIllustration(illustrationSrc);
          }}
        />
      </div>
    </div>
  );
}

function UseCaseDualMedia({
  videoPosterSrc,
  illustrationSrc,
  label,
  conceptLabel,
  videoPreviewLabel,
  expandLabel,
  fallbackLabel,
  size,
  onExpandIllustration,
  children,
}: {
  videoPosterSrc?: string;
  illustrationSrc?: string;
  label: string;
  conceptLabel: string;
  videoPreviewLabel: string;
  expandLabel: string;
  fallbackLabel: string;
  size: 'preview' | 'card';
  onExpandIllustration?: (url: string) => void;
  children?: React.ReactNode;
}) {
  const [posterFailed, setPosterFailed] = useState(false);
  const primarySrc = (!posterFailed && videoPosterSrc) || illustrationSrc;

  if (!primarySrc) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
      <UseCaseThumbnail
        key={primarySrc}
        src={primarySrc}
        alt={`${label} — ${videoPreviewLabel}`}
        className="h-full w-full object-cover"
        fallbackLabel={fallbackLabel}
        onError={() => setPosterFailed(true)}
      />
      <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur-sm">
        {videoPreviewLabel}
      </span>
      <UseCaseConceptInset
        illustrationSrc={illustrationSrc}
        label={label}
        conceptLabel={conceptLabel}
        expandLabel={expandLabel}
        size={size}
        onExpandIllustration={onExpandIllustration}
      />
      {children}
    </div>
  );
}

function UseCaseVideoPreview({
  videoSrc,
  videoPosterSrc,
  illustrationSrc,
  label,
  previewKey,
  demoComingSoonLabel,
  conceptLabel,
  videoPreviewLabel,
  expandLabel,
  onExpandIllustration,
}: {
  videoSrc: string;
  videoPosterSrc?: string;
  illustrationSrc?: string;
  label: string;
  previewKey: string;
  demoComingSoonLabel: string;
  conceptLabel: string;
  videoPreviewLabel: string;
  expandLabel: string;
  onExpandIllustration?: (url: string) => void;
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

  const primaryPoster = (!posterFailed && videoPosterSrc) || illustrationSrc;
  const showPoster = Boolean(primaryPoster);

  return (
    <div className="relative w-full aspect-video max-h-[400px] bg-black">
      {!isPlaying ? (
        showPoster ? (
          <div className="relative h-full w-full">
            <UseCaseThumbnail
              key={primaryPoster}
              src={primaryPoster!}
              alt={`${label} — ${videoPreviewLabel}`}
              className="h-full w-full object-cover"
              fallbackLabel={demoComingSoonLabel}
              onError={() => setPosterFailed(true)}
            />
            <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur-sm">
              {videoPreviewLabel}
            </span>
            <UseCaseConceptInset
              illustrationSrc={illustrationSrc}
              label={label}
              conceptLabel={conceptLabel}
              expandLabel={expandLabel}
              size="preview"
              onExpandIllustration={onExpandIllustration}
            />
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
          </div>
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
          poster={videoPosterSrc}
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
          illustrationSrc: source?.illustrationSrc,
          videoPosterSrc: source?.videoPosterSrc,
          videoEnabled: source?.videoEnabled,
        }
      }),
    }));
  }, [tCategories]);

  const videoPanelRef = useRef<HTMLDivElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const pushedHistoryRef = useRef(false);
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategoryId ?? localizedCategories[0]?.id ?? VIDEO_CATEGORIES[0].id
  );
  const [activeExampleId, setActiveExampleId] = useState<string>(
    getDefaultExampleId(initialCategoryId ?? localizedCategories[0]?.id ?? VIDEO_CATEGORIES[0].id) ??
      localizedCategories[0]?.examples[0]?.id ??
      VIDEO_CATEGORIES[0].examples[0].id
  );

  const closeExpandedImage = useCallback(() => {
    setExpandedImage(null);
    if (pushedHistoryRef.current) {
      pushedHistoryRef.current = false;
      window.history.back();
    }
  }, []);

  const openExpandedImage = useCallback((url: string) => {
    setExpandedImage(url);
    window.history.pushState({ [IMAGE_PREVIEW_HISTORY_KEY]: true }, '');
    pushedHistoryRef.current = true;
  }, []);

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
    setIsMounted(true);
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
  }, [initialCategoryId, localizedCategories]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [syncFromHash]);

  useEffect(() => {
    if (!expandedImage) return;

    const onPopState = () => {
      if (expandedImage) {
        setExpandedImage(null);
        pushedHistoryRef.current = false;
      }
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
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

  const handleExampleClick = (categoryId: string, exampleId: string) => {
    selectExample(categoryId, exampleId);
    videoPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const hasVisualMedia = Boolean(activeExample.videoPosterSrc || activeExample.illustrationSrc);

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
            <div className="flex flex-row items-center gap-2 text-cyan-300">
              <PlayCircle className="h-5 w-5 shrink-0 self-center" />
              <span className="text-sm font-semibold uppercase leading-none tracking-wider">
                {tUi('useCases')}
              </span>
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
                          {activeExample.videoEnabled && activeExample.videoSrc?.trim() ? (
                            <UseCaseVideoPreview
                              previewKey={`${cat.id}-${activeExample.id}-${activeExample.videoSrc}`}
                              videoSrc={activeExample.videoSrc}
                              videoPosterSrc={activeExample.videoPosterSrc}
                              illustrationSrc={activeExample.illustrationSrc}
                              label={activeExample.label}
                              demoComingSoonLabel={tUi('demoComingSoon')}
                              conceptLabel={tUi('conceptPreview')}
                              videoPreviewLabel={tUi('videoPreview')}
                              expandLabel={tUi('expandImage')}
                              onExpandIllustration={openExpandedImage}
                            />
                          ) : hasVisualMedia ? (
                            <UseCaseDualMedia
                              videoPosterSrc={activeExample.videoPosterSrc}
                              illustrationSrc={activeExample.illustrationSrc}
                              label={activeExample.label}
                              conceptLabel={tUi('conceptPreview')}
                              videoPreviewLabel={tUi('videoPreview')}
                              expandLabel={tUi('expandImage')}
                              fallbackLabel={tUi('demoComingSoon')}
                              size="preview"
                              onExpandIllustration={openExpandedImage}
                            >
                              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                                <p className="text-xs text-slate-300 uppercase tracking-wider">
                                  {tUi('demoComingSoon')}
                                </p>
                              </div>
                            </UseCaseDualMedia>
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
                            const exHasMedia = Boolean(ex.videoPosterSrc || ex.illustrationSrc);

                            return (
                              <button
                                key={ex.id}
                                type="button"
                                onClick={() => handleExampleClick(cat.id, ex.id)}
                                aria-current={isActive ? 'true' : undefined}
                                className={`relative rounded-lg border transition-all cursor-pointer h-full flex flex-col justify-start text-left overflow-hidden ${
                                  isActive
                                    ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-900/20'
                                    : 'bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-950/60'
                                }`}
                                data-hash={exampleHash}
                              >
                                {exHasMedia ? (
                                  <UseCaseDualMedia
                                    videoPosterSrc={ex.videoPosterSrc}
                                    illustrationSrc={ex.illustrationSrc}
                                    label={ex.label}
                                    conceptLabel={tUi('conceptPreview')}
                                    videoPreviewLabel={tUi('videoPreview')}
                                    expandLabel={tUi('expandImage')}
                                    fallbackLabel={ex.label}
                                    size="card"
                                    onExpandIllustration={openExpandedImage}
                                  />
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
                              </button>
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
              {tUi('selectExample')}
            </p>
          </div>
        </div>
      </motion.div>

      {isMounted &&
        createPortal(
          <AnimatePresence>
            {expandedImage ? (
              <ExpandedImageModal
                imageUrl={expandedImage}
                closeLabel={tUi('closePreview')}
                expandImageLabel={tUi('expandImage')}
                onClose={closeExpandedImage}
              />
            ) : null}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
