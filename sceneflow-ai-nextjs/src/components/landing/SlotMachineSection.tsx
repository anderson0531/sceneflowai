'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Dices, RefreshCw, Flame, AlertTriangle, Ban, Volume2, VolumeX, Maximize2, User, Users } from 'lucide-react';

// Video Illustration Component with Audio Toggle
const SlotMachineVideo = () => {
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
        <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-2xl blur-xl -z-10" />
        
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

// New Content Component
const NewSlotMachineContent = () => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-white">The Power of a 5-Person Crew in One Seat</h3>
        <p className="mt-2 text-gray-400">SceneFlow empowers a single user to manage the entire production workflow, from script to final render. This isn't just about saving money; it's about moving at the speed of your vision.</p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-lg border border-white/10 text-center">
          <Users className="w-10 h-10 mx-auto text-cyan-400" />
          <h4 className="mt-4 text-lg font-semibold text-white">Traditional Production</h4>
          <p className="text-sm text-gray-400">Director, Producer, Editor, Cinematographer, Gaffer</p>
          <p className="mt-2 text-2xl font-bold text-cyan-400">5+ People</p>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-lg border border-white/10 text-center">
          <User className="w-10 h-10 mx-auto text-amber-400" />
          <h4 className="mt-4 text-lg font-semibold text-white">SceneFlow Production</h4>
          <p className="text-sm text-gray-400">The Director (You)</p>
          <p className="mt-2 text-2xl font-bold text-amber-400">1 Person</p>
        </div>
      </div>
    </div>
  );
};

export default function SlotMachineSection() {
  return (
    <section id="problem" className="py-20 sm:py-28 bg-gray-950 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 text-sm font-medium text-red-300 bg-red-500/10 border border-red-500/30 rounded-full"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Dices className="w-5 h-5" />
            The Old Way
          </motion.div>
          
          <motion.h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Stop Gambling. Start Producing.
          </motion.h2>

          <motion.p 
            className="mt-4 text-lg text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Traditional video production is slow, expensive, and requires a large team. SceneFlow collapses the entire studio into a single interface.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mt-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <NewSlotMachineContent />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <SlotMachineVideo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
