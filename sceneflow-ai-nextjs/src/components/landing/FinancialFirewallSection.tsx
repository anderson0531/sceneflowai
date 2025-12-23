'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Sparkles, Check, ArrowRight, Monitor, Film, Mic2, Play } from 'lucide-react';

// Firewall Lock Illustration
const FirewallIllustration = () => {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Main Container */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Left Side - Screening Room Engine */}
        <div className="flex items-center gap-4">
          {/* Input Components */}
          <div className="flex flex-col gap-3">
            {/* Gemini 2.5 Pro */}
            <motion.div
              className="flex items-center gap-3 bg-slate-800/80 backdrop-blur px-4 py-3 rounded-xl border border-blue-500/30"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Gemini 2.5 Pro</p>
                <p className="text-gray-400 text-xs">Script & Logic</p>
              </div>
            </motion.div>

            {/* Imagen 3 */}
            <motion.div
              className="flex items-center gap-3 bg-slate-800/80 backdrop-blur px-4 py-3 rounded-xl border border-purple-500/30"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Imagen 3</p>
                <p className="text-gray-400 text-xs">Storyboards</p>
              </div>
            </motion.div>

            {/* ElevenLabs */}
            <motion.div
              className="flex items-center gap-3 bg-slate-800/80 backdrop-blur px-4 py-3 rounded-xl border border-green-500/30"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <Mic2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">ElevenLabs</p>
                <p className="text-gray-400 text-xs">Voice Preview</p>
              </div>
            </motion.div>
          </div>

          {/* Arrow to Firewall */}
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="w-16 h-0.5 bg-gradient-to-r from-cyan-500 to-amber-500" />
            <ArrowRight className="w-5 h-5 text-cyan-400" />
          </motion.div>

          {/* The Firewall / Lock */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {/* Glowing background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-2xl" />
            
            {/* Lock Container */}
            <div className="relative bg-gradient-to-br from-amber-500/20 to-orange-600/20 backdrop-blur-sm p-6 rounded-2xl border-2 border-amber-500/40">
              {/* Monitor with Storyboards */}
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 mb-4">
                <div className="bg-slate-800 rounded-lg p-2 grid grid-cols-3 gap-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.div
                      key={i}
                      className="aspect-video bg-gradient-to-br from-slate-600 to-slate-700 rounded-sm"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
                {/* Monitor stand */}
                <div className="flex justify-center mt-2">
                  <div className="w-8 h-2 bg-slate-700 rounded-t" />
                </div>
              </div>

              {/* Lock Icon */}
              <motion.div
                className="absolute -right-4 -bottom-4 w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-amber-400/50"
                animate={{ 
                  boxShadow: [
                    '0 0 20px rgba(245, 158, 11, 0.3)',
                    '0 0 40px rgba(245, 158, 11, 0.5)',
                    '0 0 20px rgba(245, 158, 11, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Lock className="w-8 h-8 text-white" />
              </motion.div>

              {/* Director Chair Icon */}
              <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center">
                <Eye className="w-5 h-5 text-cyan-400" />
              </div>
            </div>

            {/* Next.js/FFmpeg Label */}
            <motion.div
              className="mt-4 flex justify-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
            >
              <div className="bg-slate-800 px-4 py-2 rounded-full border border-slate-600 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300 text-sm font-medium">Next.js / FFmpeg</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Arrow to Output */}
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="w-16 h-0.5 bg-gradient-to-r from-amber-500 to-cyan-500" />
            <ArrowRight className="w-5 h-5 text-amber-400" />
          </motion.div>

          {/* Output - Film Reels */}
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="relative">
              {/* Stacked film reels */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border-4 border-slate-500 flex items-center justify-center"
                  style={{
                    position: i === 0 ? 'relative' : 'absolute',
                    top: i * -8,
                    left: i * 8,
                    zIndex: 3 - i
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-700" />
                  {/* Film holes */}
                  {[0, 1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className="absolute w-2 h-2 bg-slate-900 rounded-full"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) rotate(${j * 90}deg) translateY(-20px)`
                      }}
                    />
                  ))}
                </motion.div>
              ))}
            </div>
            <p className="text-gray-400 text-xs mt-6">Final Render</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

// Feature Item Component
const FeatureItem = ({ 
  icon: Icon, 
  title, 
  description, 
  color,
  delay 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  color: string;
  delay: number;
}) => {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600 border-blue-500/30',
    purple: 'from-purple-500 to-purple-600 border-purple-500/30',
    green: 'from-green-500 to-green-600 border-green-500/30',
    cyan: 'from-cyan-500 to-cyan-600 border-cyan-500/30',
  };

  return (
    <motion.div
      className="flex items-start gap-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h4 className="text-white font-semibold text-lg mb-1">{title}</h4>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function FinancialFirewallSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 30%, rgba(245, 158, 11, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 70% 70%, rgba(6, 182, 212, 0.08) 0%, transparent 40%)
            `
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
          <div className="inline-flex items-center px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
            <Shield className="w-4 h-4 text-amber-400 mr-2" />
            <span className="text-sm font-medium text-amber-400">The Solution</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            The{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              &apos;Financial Firewall&apos;
            </span>
            <br className="hidden sm:block" />
            for Video Production
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            <span className="text-white font-semibold">Core Concept:</span> Decouple Direction (inexpensive) from Rendering (expensive).
          </p>
        </motion.div>

        {/* Illustration */}
        <div className="mb-16 overflow-x-auto pb-4">
          <div className="min-w-[800px]">
            <FirewallIllustration />
          </div>
        </div>

        {/* Screening Room Engine Features */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            <span className="text-amber-400">&apos;Screening Room&apos;</span> Engine
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureItem
              icon={Sparkles}
              title="Logic"
              description="Gemini 2.5 Pro generates scripts and scene descriptions at minimal cost."
              color="blue"
              delay={0.1}
            />
            <FeatureItem
              icon={Film}
              title="Visuals"
              description="Imagen 3 generates static storyboards and character-consistent assets."
              color="purple"
              delay={0.2}
            />
            <FeatureItem
              icon={Eye}
              title="Preview"
              description="Client-side animation (Ken Burns) allows directors to 'watch' the film at near-zero cost."
              color="green"
              delay={0.3}
            />
            <FeatureItem
              icon={Play}
              title="Render"
              description="Only finalized, approved scenes trigger expensive Veo 3.1 video generation."
              color="cyan"
              delay={0.4}
            />
          </div>
        </motion.div>

        {/* Key Metric Badge */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur-xl opacity-30" />
            
            {/* Badge */}
            <div className="relative bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6 rounded-2xl border-2 border-amber-400/50 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium mb-1">Key Metric</p>
                  <p className="text-white text-2xl font-bold">
                    Reduces the &apos;Prompt-to-Video&apos; ratio from <span className="text-slate-900">20:1</span> to <span className="text-slate-900">3:1</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
