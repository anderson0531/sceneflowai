'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Layers, User, Users, Volume2, VolumeX, Maximize2 } from 'lucide-react';

const ProductionComparisonVideo = () => {
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
        <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-emerald-500/20 rounded-2xl blur-xl -z-10" />
        
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
            <source src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/slot-machine-illustration.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
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

        <div className="grid md:grid-cols-2 gap-12 items-center mt-16">
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
          >
            <ProductionComparisonVideo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
