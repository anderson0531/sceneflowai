'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Film, Eye, Volume2, VolumeX, Maximize2, FileText, Play, Target, DollarSign, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Video Illustration Component with Audio Toggle
const FirewallVideo = () => {
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
        className="relative rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        layout
      >
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-2xl blur-xl -z-10" />
        
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
            <source src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/financial-firewall-illustration.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Video controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* Audio toggle button - minimal and transparent */}
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
            
            {/* Expand/Fullscreen button */}
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

// New Content Component - Focus on Financial Firewall Benefits
const NewFirewallContent = () => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-white">Predictable ROI</h3>
        <p className="mt-2 text-gray-400">Iterate for free. Only pay when you're 100% ready to publish. This is budget certainty, allowing you to experiment and perfect your vision without financial risk.</p>
      </div>
      <div className="bg-slate-900/50 p-6 rounded-lg border border-white/10">
        <div className="flex items-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
          <div className="ml-4">
            <h4 className="text-lg font-semibold text-white">SceneFlow Method</h4>
            <p className="text-sm text-gray-400">Fixed cost per published scene. Free iterations.</p>
          </div>
          <p className="ml-auto text-xl font-bold text-green-400">$9</p>
        </div>
      </div>
      <div className="bg-slate-900/50 p-6 rounded-lg border border-white/10">
        <div className="flex items-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <div className="ml-4">
            <h4 className="text-lg font-semibold text-white">"Slot Machine" Method</h4>
            <p className="text-sm text-gray-400">Pay-per-generation. Costs spiral with each re-roll.</p>
          </div>
          <p className="ml-auto text-xl font-bold text-red-400">$25 - $250+</p>
        </div>
      </div>
    </div>
  );
};

export default function FinancialFirewallSection() {
  return (
    <section id="firewall" className="py-20 sm:py-28 bg-gray-950 overflow-hidden">
      <div className="container mx-auto px-4">
        
        <div className="text-center max-w-3xl mx-auto">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <DollarSign className="w-5 h-5" />
            Business Protection #1
          </motion.div>
          
          <motion.h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            The Financial Firewall™
          </motion.h2>

          <motion.p 
            className="mt-4 text-lg text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Our unique credit system acts as a financial firewall. You're not gambling on generations; you're investing in outcomes.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mt-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <NewFirewallContent />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <FirewallVideo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
