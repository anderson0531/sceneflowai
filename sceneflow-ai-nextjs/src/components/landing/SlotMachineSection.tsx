'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Dices, RefreshCw, Flame, AlertTriangle, Ban, DollarSign, Film, Clapperboard } from 'lucide-react';

// Animated Slot Machine Illustration Component
const SlotMachineIllustration = () => {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Slot Machine Body */}
      <motion.div 
        className="relative bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-3xl p-6 border-4 border-amber-500/40 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Top Crown */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-amber-400 to-amber-600 px-8 py-2 rounded-xl border-2 border-amber-300/50 shadow-lg">
          <span className="text-slate-900 font-bold text-sm tracking-wider">GenAI VIDEO</span>
        </div>

        {/* Reels Container */}
        <div className="bg-slate-950 rounded-2xl p-4 mt-4 border-2 border-slate-600">
          <div className="flex justify-center gap-3">
            {/* Reel 1 - Camera */}
            <motion.div 
              className="w-20 h-24 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg border border-slate-600 flex items-center justify-center overflow-hidden"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            >
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-lg">
                <Film className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            {/* Reel 2 - Dollar (spinning) */}
            <motion.div 
              className="w-20 h-24 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg border border-slate-600 flex items-center justify-center overflow-hidden"
              animate={{ y: [0, -80, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            >
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-lg">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            {/* Reel 3 - Clapperboard */}
            <motion.div 
              className="w-20 h-24 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg border border-slate-600 flex items-center justify-center overflow-hidden"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.4 }}
            >
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-lg">
                <Clapperboard className="w-8 h-8 text-white" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Pull Handle */}
        <motion.div 
          className="absolute -right-8 top-1/2 transform -translate-y-1/2"
          animate={{ rotate: [0, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="w-6 h-32 bg-gradient-to-b from-slate-500 to-slate-700 rounded-full border-2 border-slate-400">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-full border-4 border-red-400 shadow-lg" />
          </div>
        </motion.div>

        {/* RE-ROLL Button */}
        <motion.div 
          className="mt-4 flex justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 px-8 py-3 rounded-xl border-2 border-amber-400 shadow-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-slate-900" />
            <span className="text-slate-900 font-bold">RE-ROLL</span>
          </div>
        </motion.div>

        {/* Burning Budget Visual */}
        <motion.div 
          className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex items-end gap-1"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
        >
          {/* Film strip going into fire */}
          <div className="relative">
            <motion.div 
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-16 h-20 bg-gradient-to-b from-slate-700 to-transparent rounded-t-lg border-x-2 border-t-2 border-slate-600"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(255,255,255,0.1) 6px, rgba(255,255,255,0.1) 8px)'
              }}
            />
            {/* Fire */}
            <motion.div
              className="relative"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Flame className="w-12 h-12 text-orange-500" />
              <Flame className="w-10 h-10 text-yellow-500 absolute top-1 left-1" />
              <Flame className="w-8 h-8 text-red-600 absolute top-2 left-2" />
            </motion.div>
          </div>

          {/* Falling coins */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full border-2 border-amber-300 flex items-center justify-center"
              animate={{ 
                y: [0, 60, 0],
                opacity: [1, 0, 1],
                rotate: [0, 360]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                delay: i * 0.3
              }}
            >
              <span className="text-xs font-bold text-slate-900">$</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* "budget" label on slot machine */}
      <motion.div 
        className="absolute top-24 left-6 bg-slate-800 px-3 py-1 rounded border border-slate-600"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
      >
        <span className="text-amber-400 text-xs font-mono">budget</span>
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
      <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-red-400" />
      </div>
      <div>
        <h4 className="text-white font-semibold text-lg mb-1">{title}</h4>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function SlotMachineSection() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
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
            <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
            <span className="text-sm font-medium text-red-400">The Industry Problem</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            GenAI Video is a{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              &apos;Slot Machine&apos;
            </span>
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Current tools force creators to gamble their budget on every iteration. 
            It&apos;s time to break the cycle.
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Slot Machine Illustration */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <SlotMachineIllustration />
            {/* Extra space for the fire animation */}
            <div className="h-16" />
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
                <p className="text-amber-400 font-semibold text-lg mb-2">
                  💡 What if you could iterate infinitely before spending on video?
                </p>
                <p className="text-gray-400 text-sm">
                  SceneFlow AI decouples creative direction from expensive rendering—so you perfect your vision first.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
