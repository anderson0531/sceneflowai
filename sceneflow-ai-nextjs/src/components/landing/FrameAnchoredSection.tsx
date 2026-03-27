'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Anchor, Sparkles, Film, Clapperboard, Check, Zap, Image, Brain, Edit3, Volume2, VolumeX, Maximize2, Target } from 'lucide-react';

// Frame-Anchored Precision Video Component
const FrameAnchoredVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className={`relative w-full mx-auto transition-all duration-300 ${isExpanded ? 'max-w-3xl' : 'max-w-md'}`}>
      <motion.div
        className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/30 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        layout
      >
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl -z-10" />
        
        {/* Video */}
        <div className="aspect-[4/3] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          >
            <source src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/one-take-frame-anchored.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Video controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all opacity-60 hover:opacity-100"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white/80" />
              ) : (
                <Volume2 className="w-4 h-4 text-white/80" />
              )}
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all opacity-60 hover:opacity-100"
              title={isExpanded ? 'Shrink' : 'Expand'}
            >
              <Maximize2 className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Feature Card Component for precision features
const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  delay 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  delay: number;
}) => {
  return (
    <motion.div
      className="flex items-start gap-4"
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
      </div>
      <div>
        <h4 className="text-white font-semibold text-lg md:text-xl mb-1">{title}</h4>
        <p className="text-gray-400 text-sm md:text-base leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

const NewFrameAnchoredContent = () => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-white">Your Brand, Protected</h3>
        <p className="mt-2 text-gray-400">Frame-Anchored Precision™ is your guarantee that characters, subjects, and styles look identical every time. This isn't just a technical feature; it's professional brand integrity.</p>
      </div>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-800 rounded-lg"><Check className="w-6 h-6 text-green-400" /></div>
          <div>
            <h4 className="font-semibold text-white">Character Consistency</h4>
            <p className="text-gray-400">Your main character looks the same in scene 1 and scene 100.</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-800 rounded-lg"><Check className="w-6 h-6 text-green-400" /></div>
          <div>
            <h4 className="font-semibold text-white">Style Lock</h4>
            <p className="text-gray-400">Maintain a consistent visual aesthetic across your entire series.</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-800 rounded-lg"><Check className="w-6 h-6 text-green-400" /></div>
          <div>
            <h4 className="font-semibold text-white">Brand Asset Integrity</h4>
            <p className="text-gray-400">Logos and branded assets are rendered perfectly every time.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FrameAnchoredSection() {
  return (
    <section id="precision" className="py-20 sm:py-28 bg-gray-950 overflow-hidden">
      <div className="container mx-auto px-4">
        
        <div className="text-center max-w-3xl mx-auto">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 text-sm font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 rounded-full"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Anchor className="w-5 h-5" />
            Business Protection #2
          </motion.div>
          
          <motion.h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Frame-Anchored Precision™
          </motion.h2>

          <motion.p 
            className="mt-4 text-lg text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Our core technology ensures that every frame builds on the last, giving you unparalleled control and consistency.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mt-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <NewFrameAnchoredContent />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <FrameAnchoredVideo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
