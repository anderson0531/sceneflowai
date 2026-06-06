'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, PlayCircle, Clock3, Maximize2, X, Play, Pause, Volume2, VolumeX, Maximize, ChevronDown, ChevronUp, CheckCircle2, ExternalLink } from 'lucide-react';
import NextImage from 'next/image';
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { StudioVideoWatermark } from '@/components/landing/StudioVideoWatermark';
import { CollaborationDemosPanel } from '@/components/landing/SamplesSection';
import { FEATURE_CHAPTERS } from '@/config/landing/featureStoryboardCopy';
import { FEATURE_STORYBOARD_MEDIA } from '@/config/landing/featureStoryboardMedia';
import { getFeatureStoryboardScreenshot } from '@/config/landing/landingVisualMedia';
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse';
import { cn } from '@/lib/utils';

const SECTION_ID = 'feature-storyboard';

type FeatureStoryboardMessageItem = {
  id: string;
  title: string;
  description: string;
  keyFeatures: string[];
  screenshotSlot: string;
  videoSlot: string;
  underTheHood?: {
    title: string;
    body: string;
    bullets: string[];
  };
};

type FeatureStoryboardItem = Omit<FeatureStoryboardMessageItem, 'id'> & {
  id: number;
  screenshotUrl?: string;
  videoUrl?: string;
};

type StoryboardUiStrings = {
  screenshot: string;
  video: string;
  featureVideo: string;
  keyFeatures: string;
  openScreenshot: string;
  openFeatureVideo: string;
  expandImage: string;
  closePreview: string;
};

type VideoAriaLabels = {
  play: string;
  pause: string;
  mute: string;
  unmute: string;
  expandVideo: string;
};

function MediaAssetLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-400/90 hover:text-cyan-300 transition-colors break-all"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </a>
  );
}

function FeatureBulletText({ text }: { text: string }) {
  const parts = text.split('—');
  if (parts.length > 1) {
    return (
      <span className="text-base text-slate-300">
        <strong className="text-white font-medium">{parts[0].trim()}</strong>
        {' — '}
        {parts.slice(1).join('—').trim()}
      </span>
    );
  }
  return <span className="text-base text-slate-300">{text}</span>;
}

function FeatureVideoPlayer({
  src,
  onExpand,
  className = 'w-full h-full object-cover',
  autoPlay = true,
  showExpand = true,
  ariaLabels,
}: {
  src: string;
  onExpand?: (e: React.MouseEvent) => void;
  className?: string;
  autoPlay?: boolean;
  showExpand?: boolean;
  ariaLabels: VideoAriaLabels;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full group bg-black cursor-pointer overflow-hidden rounded-lg"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className={className}
        autoPlay={autoPlay}
        muted={isMuted}
        loop
        playsInline
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload"
      />

      <StudioVideoWatermark />

      {/* Controls Overlay */}
      <div className="absolute inset-0 z-20 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-cyan-400 transition"
              aria-label={isPlaying ? ariaLabels.pause : ariaLabels.play}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleMute}
              className="text-white hover:text-cyan-400 transition"
              aria-label={isMuted ? ariaLabels.unmute : ariaLabels.mute}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
          {showExpand && onExpand && (
            <button
              onClick={onExpand}
              className="text-white hover:text-cyan-400 transition"
              aria-label={ariaLabels.expandVideo}
            >
              <Maximize className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Play Overlay (Visible when paused) */}
      {!isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 transition-transform group-hover:scale-110">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>
      )}
    </div>
  );
}

function StoryboardCard({
  item,
  onExpand,
  onExpandVideo,
  ui,
  closeLabel,
  viewDetailsLabel,
  videoAriaLabels,
  underTheHoodLabel,
}: {
  item: FeatureStoryboardItem;
  onExpand: (url: string) => void;
  onExpandVideo: (url: string) => void;
  ui: StoryboardUiStrings;
  closeLabel: string;
  viewDetailsLabel: string;
  videoAriaLabels: VideoAriaLabels;
  underTheHoodLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-5 md:p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-base font-semibold text-purple-200">
            {item.id}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl md:text-2xl font-bold text-white">{item.title}</h3>
            {!isOpen && (
              <>
                <p className="mt-1 text-base text-slate-400 line-clamp-1 max-w-2xl">{item.description}</p>
                <div className="mt-2 hidden sm:flex flex-wrap items-center gap-2 max-w-2xl">
                  {item.keyFeatures.slice(0, 2).map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-slate-300"
                    >
                      <CheckCircle2 className="h-3 w-3 text-purple-400 shrink-0" />
                      <span className="line-clamp-1">{feature.split('—')[0].trim()}</span>
                    </span>
                  ))}
                  {item.screenshotUrl && (
                    <a
                      href={item.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      <Camera className="h-3 w-3 shrink-0" />
                      {ui.screenshot}
                    </a>
                  )}
                  {item.videoUrl && (
                    <a
                      href={item.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 hover:text-violet-200 transition-colors"
                    >
                      <PlayCircle className="h-3 w-3 shrink-0" />
                      {ui.video}
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-500 hidden sm:inline">
            {isOpen ? closeLabel : viewDetailsLabel}
          </span>
          <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="p-6 md:p-8 pt-0 border-t border-white/5">
              <p className="mt-4 text-base leading-relaxed text-slate-300 max-w-4xl">{item.description}</p>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {/* Screenshot Column */}
                <div className="rounded-2xl border border-dashed border-white/20 bg-slate-950/70 p-5 md:p-6">
                  <p className="mb-4 inline-flex items-center justify-between w-full text-sm font-medium uppercase tracking-wider text-cyan-300">
                    <span className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      {ui.screenshot}
                    </span>
                    {item.screenshotUrl && (
                      <button
                        onClick={() => onExpand(item.screenshotUrl!)}
                        className="hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg"
                        title={ui.expandImage}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    )}
                  </p>
                  <div
                    className={`aspect-video rounded-xl border border-white/10 bg-slate-900/70 overflow-hidden flex items-center justify-center relative group ${item.screenshotUrl ? 'cursor-zoom-in' : ''}`}
                    onClick={() => item.screenshotUrl && onExpand(item.screenshotUrl)}
                  >
                    {item.screenshotUrl ? (
                      <>
                        <NextImage
                          src={item.screenshotUrl}
                          alt={item.title}
                          width={1280}
                          height={720}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20">
                            <Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 text-sm text-slate-400">{item.screenshotSlot}</div>
                    )}
                  </div>
                  {item.screenshotUrl && (
                    <MediaAssetLink href={item.screenshotUrl} label={ui.openScreenshot} />
                  )}
                </div>

                {/* Video Column */}
                <div className="rounded-2xl border border-dashed border-white/20 bg-slate-950/70 p-5 md:p-6">
                  <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-violet-300">
                    <PlayCircle className="h-4 w-4" />
                    {ui.featureVideo}
                  </p>
                  <div className="aspect-video rounded-xl border border-white/10 bg-slate-900/70 overflow-hidden flex items-center justify-center relative group shadow-2xl">
                    {item.videoUrl ? (
                      <FeatureVideoPlayer
                        src={item.videoUrl}
                        ariaLabels={videoAriaLabels}
                        onExpand={(e) => {
                          e.stopPropagation();
                          onExpandVideo(item.videoUrl!);
                        }}
                      />
                    ) : (
                      <div className="p-3 text-sm text-slate-400">{item.videoSlot}</div>
                    )}
                  </div>
                  {item.videoUrl && (
                    <MediaAssetLink href={item.videoUrl} label={ui.openFeatureVideo} />
                  )}
                </div>
              </div>

              <div className="mt-8 max-w-4xl">
                <p className="text-sm font-medium uppercase tracking-wider text-cyan-300/90 mb-3">
                  {ui.keyFeatures}
                </p>
                <ul className="space-y-2.5">
                  {item.keyFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                      <FeatureBulletText text={feature} />
                    </li>
                  ))}
                </ul>
              </div>

              {item.underTheHood && (
                <details className="mt-6 max-w-4xl rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden group">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-violet-300 hover:bg-white/5 list-none [&::-webkit-details-marker]:hidden">
                    <span>{underTheHoodLabel}</span>
                    <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4 pt-1 border-t border-white/5">
                    <p className="text-sm text-slate-400 mb-3">{item.underTheHood.body}</p>
                    <ul className="space-y-2">
                      {item.underTheHood.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-violet-400" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function WalkthroughChapter({
  chapterId,
  label,
  isOpen,
  onToggle,
  expandLabel,
  collapseLabel,
  children,
}: {
  chapterId: string;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  expandLabel: string;
  collapseLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div id={`walkthrough-chapter-${chapterId}`} className="rounded-2xl border border-white/10 bg-slate-900/30 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-base font-semibold text-white">{label}</span>
        <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
          {isOpen ? collapseLabel : expandLabel}
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FeatureStoryboardSection() {
  const t = useTranslations('platformWalkthrough');
  const tUi = useTranslations('platformWalkthrough.ui');
  const tCommon = useTranslations('common');
  const { isOpen } = useLandingSectionCollapse(SECTION_ID);

  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

  const ui: StoryboardUiStrings = {
    screenshot: tUi('screenshot'),
    video: tUi('video'),
    featureVideo: tUi('featureVideo'),
    keyFeatures: tUi('keyFeatures'),
    openScreenshot: tUi('openScreenshot'),
    openFeatureVideo: tUi('openFeatureVideo'),
    expandImage: tUi('expandImage'),
    closePreview: tUi('closePreview'),
  };

  const videoAriaLabels: VideoAriaLabels = {
    play: tCommon('play'),
    pause: tCommon('pause'),
    mute: tCommon('mute'),
    unmute: tCommon('unmute'),
    expandVideo: tCommon('expandVideo'),
  };

  const locale = useLocale();

  const chapterLabels = t.raw('chapters') as Array<{
    id: string;
    label: string;
    defaultExpanded: boolean;
  }>;

  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      FEATURE_CHAPTERS.map((chapter) => [
        chapter.id,
        chapter.defaultExpanded,
      ])
    )
  );

  const toggleChapter = useCallback((chapterId: string) => {
    setOpenChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const chapterId = (event as CustomEvent<string>).detail;
      if (!chapterId) return;
      setOpenChapters((prev) => ({ ...prev, [chapterId]: true }));
      window.setTimeout(() => {
        document
          .getElementById(`walkthrough-chapter-${chapterId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    };
    window.addEventListener('sceneflow:expand-walkthrough-chapter', handler);
    return () => window.removeEventListener('sceneflow:expand-walkthrough-chapter', handler);
  }, []);

  const itemsById = useMemo(() => {
    const rawItems = t.raw('items') as FeatureStoryboardMessageItem[];
    return new Map<number, FeatureStoryboardItem>(
      rawItems.map((item) => {
        const id = Number(item.id);
        const media = FEATURE_STORYBOARD_MEDIA[id] ?? {};
        return [
          id,
          {
            title: item.title,
            description: item.description,
            keyFeatures: item.keyFeatures,
            screenshotSlot: item.screenshotSlot,
            videoSlot: item.videoSlot,
            underTheHood: item.underTheHood,
            id,
            screenshotUrl: getFeatureStoryboardScreenshot(id, locale),
            videoUrl: media.videoUrl,
          },
        ];
      })
    );
  }, [t, locale]);

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'bg-slate-950 relative scroll-mt-20 overflow-hidden',
        isOpen ? 'py-20 sm:py-24' : 'pt-20 pb-8 sm:pt-24 sm:pb-10'
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.08),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.06),transparent_45%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto max-w-3xl text-center"
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <p className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-purple-200">
            <Clock3 className="h-3.5 w-3.5" />
            {t('badge')}
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-base text-slate-300">{t('subtitle')}</p>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
        <div className="mt-12">
          <CollaborationDemosPanel />
        </div>

        <div className="mt-20 pt-12 border-t border-white/10 space-y-4 max-w-7xl mx-auto">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">{t('subheading')}</p>
            <p className="mt-2 text-sm text-slate-400">{t('chapterHint')}</p>
          </div>
          {FEATURE_CHAPTERS.map((chapter) => {
            const label =
              chapterLabels.find((entry) => entry.id === chapter.id)?.label ?? chapter.label;
            const chapterItems = chapter.cardIds
              .map((id) => itemsById.get(id))
              .filter((item): item is FeatureStoryboardItem => !!item);

            return (
              <WalkthroughChapter
                key={chapter.id}
                chapterId={chapter.id}
                label={label}
                isOpen={!!openChapters[chapter.id]}
                onToggle={() => toggleChapter(chapter.id)}
                expandLabel={t('expandChapter')}
                collapseLabel={t('collapseChapter')}
              >
                {chapterItems.map((item) => (
                  <StoryboardCard
                    key={item.id}
                    item={item}
                    onExpand={setExpandedImage}
                    onExpandVideo={setExpandedVideo}
                    ui={ui}
                    closeLabel={t('close')}
                    viewDetailsLabel={t('viewDetails')}
                    videoAriaLabels={videoAriaLabels}
                    underTheHoodLabel={t('underTheHoodLabel')}
                  />
                ))}
              </WalkthroughChapter>
            );
          })}
        </div>
        </SectionCollapseBody>
      </div>

      {/* Lightbox / Expand Modal (Image) */}
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
                {ui.closePreview}
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

      {/* Video Modal */}
      <AnimatePresence>
        {expandedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedVideo(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-12 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl w-full aspect-video flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setExpandedVideo(null)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <X className="w-5 h-5" />
                {ui.closePreview}
              </button>

              <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                <FeatureVideoPlayer
                  src={expandedVideo}
                  autoPlay={true}
                  showExpand={false}
                  className="w-full h-full object-contain"
                  ariaLabels={videoAriaLabels}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
