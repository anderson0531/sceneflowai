'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Dices, RefreshCw, Flame, AlertTriangle, Ban, Volume2, VolumeX, Maximize2 } from 'lucide-react';

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
            poster="/demo/slot-machine-poster.jpg"
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

// Problem Point Card Component
const ProblemCard = ({ 
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
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
      </div>
      <div>
        <h4 className="text-white font-semibold text-lg md:text-xl mb-1">{title}</h4>
        <p className="text-gray-400 text-sm md:text-base leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function SlotMachineSection() {
  return (
    <section id="problem" className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(239, 68, 68, 0.1) 0%, transparent 40%),
              radial-gradient(circle at 80% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 40%)
            `
          }}
        />
        {/* Circuit pattern on edges */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px),
                             linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-6">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-400 mr-2" />
            <span className="text-sm md:text-base font-medium text-red-400">The Industry Problem</span>
          </div>
          <h2 className="landing-section-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6">
            GenAI Video is a{' '}
            <span className="landing-gradient-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              &apos;Slot Machine&apos;
            </span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto">
            Current tools force creators to gamble their budget on every iteration. 
            It&apos;s time to break the cycle.
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Slot Machine Video Illustration */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <SlotMachineVideo />
          </motion.div>

          {/* Right: Problem Points */}
          <div className="space-y-8">
            <ProblemCard
              icon={Ban}
              title="The Workflow Gap"
              description="Current tools (Sora, Runway, Pika) combine 'Creative Decisioning' and 'Pixel Generation' into one expensive step. You can't iterate on your story without paying for full video renders."
              delay={0.2}
            />
            <ProblemCard
              icon={Dices}
              title="The Cost of Iteration"
              description="Professional storytelling requires roughly 20 iterations to perfect a scene. Doing this with high-fidelity video models is financially unsustainable—each 're-roll' burns through your budget."
              delay={0.4}
            />
            <ProblemCard
              icon={Flame}
              title="The Result"
              description="Creators are burning budget on 'rerolls' rather than refining their stories. The slot machine model means you're gambling, not directing."
              delay={0.6}
            />

            {/* Call to Action */}
            <motion.div
              className="pt-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/20 rounded-xl p-6">
                <p className="text-amber-400 font-semibold text-base md:text-lg lg:text-xl mb-2">
                  💡 What if you could iterate infinitely before spending on video?
                </p>
                <p className="text-gray-400 text-sm md:text-base mb-4">
                  SceneFlow AI decouples creative direction from expensive rendering—so you perfect your vision first.
                </p>
                <a 
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-lg shadow-lg shadow-amber-500/25 transition-all duration-300"
                >
                  See How It Works
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
