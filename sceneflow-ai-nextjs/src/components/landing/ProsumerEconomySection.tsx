'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Briefcase, Camera, Youtube, Building2, GraduationCap, Smartphone, Server, Video, Clapperboard, ArrowRight, Sparkles } from 'lucide-react';

// Mid-Market Storyteller Illustration
const StorytellerIllustration = () => {
  return (
    <div className="relative w-full h-48">
      {/* Studio Setup */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative">
          {/* Backdrop/Screen */}
          <div className="w-48 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg border border-slate-600 shadow-xl relative overflow-hidden">
            {/* Content on screen */}
            <div className="absolute inset-2 bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Clapperboard className="w-12 h-12 text-white/40" />
              </motion.div>
            </div>
            {/* Timeline at bottom */}
            <div className="absolute bottom-2 left-2 right-2 h-2 bg-slate-900 rounded overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                initial={{ width: '0%' }}
                animate={{ width: '60%' }}
                transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
              />
            </div>
          </div>

          {/* Camera */}
          <motion.div
            className="absolute -left-12 top-1/2 transform -translate-y-1/2"
            animate={{ rotate: [0, 3, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <div className="w-10 h-8 bg-slate-800 rounded border border-slate-600 flex items-center justify-center">
              <Camera className="w-5 h-5 text-red-400" />
            </div>
            {/* Tripod */}
            <div className="w-1 h-8 bg-slate-700 mx-auto" />
            <div className="flex justify-center gap-2">
              <div className="w-1 h-4 bg-slate-700 transform -rotate-12" />
              <div className="w-1 h-4 bg-slate-700 transform rotate-12" />
            </div>
          </motion.div>

          {/* Lights */}
          <motion.div
            className="absolute -right-8 -top-4 w-8 h-8 bg-yellow-400 rounded-full"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ boxShadow: '0 0 20px rgba(250, 204, 21, 0.6)' }}
          />

          {/* Director Chair */}
          <div className="absolute -right-16 bottom-0">
            <div className="w-10 h-12 relative">
              <div className="w-10 h-6 bg-slate-700 rounded-t border border-slate-600" />
              <div className="w-8 h-1 bg-red-600 mx-auto mt-0.5" />
              <div className="flex justify-between mt-1 px-1">
                <div className="w-1 h-4 bg-slate-700 transform -rotate-6" />
                <div className="w-1 h-4 bg-slate-700 transform rotate-6" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// The Gap Illustration - TikTok vs Hollywood
const GapIllustration = () => {
  return (
    <div className="relative w-full h-48">
      <motion.div
        className="absolute inset-0 flex items-center justify-center gap-6"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Mobile Apps Side (TikTok, etc) */}
        <div className="relative">
          <motion.div
            className="w-16 h-28 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border-2 border-slate-600 overflow-hidden"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {/* Phone screen */}
            <div className="absolute inset-1 bg-slate-900 rounded-lg flex flex-col items-center justify-center gap-1">
              <Smartphone className="w-6 h-6 text-pink-400" />
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-pink-400" />
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <div className="w-2 h-2 rounded-full bg-red-400" />
              </div>
            </div>
          </motion.div>
          <p className="text-center mt-2 text-gray-400 text-xs">Mobile Apps</p>
        </div>

        {/* Gap Arrow */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500" />
          <motion.div
            className="text-purple-400 text-xs font-semibold"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            THE GAP
          </motion.div>
          <div className="w-12 h-0.5 bg-gradient-to-r from-purple-500 to-green-500" />
        </div>

        {/* Hollywood Side */}
        <div className="relative">
          <motion.div
            className="relative"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            {/* Server Farm */}
            <div className="w-20 h-20 bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-lg border border-green-500/30 p-1.5 grid grid-cols-2 gap-1">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="bg-slate-800 rounded flex items-center justify-center border border-slate-700"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                >
                  <Server className="w-4 h-4 text-green-400" />
                </motion.div>
              ))}
            </div>
            {/* Stage lights on top */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 flex gap-1">
              <motion.div
                className="w-3 h-3 bg-green-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.div
                className="w-3 h-3 bg-green-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
              />
            </div>
          </motion.div>
          <p className="text-center mt-2 text-gray-400 text-xs">Render Farms</p>
        </div>
      </motion.div>
    </div>
  );
};

// Market Timing Illustration
const MarketTimingIllustration = () => {
  return (
    <div className="relative w-full h-48">
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-4">
          {/* Old Video Player */}
          <div className="relative">
            <div className="w-20 h-14 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center">
              <Video className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-center mt-1 text-gray-500 text-xs">Short-form</p>
          </div>

          {/* Arrow */}
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ArrowRight className="w-6 h-6 text-amber-400" />
          </motion.div>

          {/* New Cinema Quality */}
          <div className="relative">
            <motion.div
              className="w-24 h-16 bg-gradient-to-br from-amber-900/30 to-amber-800/30 rounded-lg border-2 border-amber-500/50 flex items-center justify-center"
              animate={{ 
                boxShadow: [
                  '0 0 10px rgba(245, 158, 11, 0.2)',
                  '0 0 20px rgba(245, 158, 11, 0.4)',
                  '0 0 10px rgba(245, 158, 11, 0.2)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Clapperboard className="w-10 h-10 text-amber-400" />
            </motion.div>
            <p className="text-center mt-1 text-amber-400 text-xs font-medium">&apos;Cinema-Quality&apos;</p>
            <p className="text-center text-gray-500 text-xs">Long-form</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Column Card Component
const ColumnCard = ({
  title,
  badge,
  badgeColor,
  illustration: Illustration,
  points,
  delay
}: {
  title: string;
  badge: string;
  badgeColor: string;
  illustration: React.ComponentType;
  points: { icon: React.ElementType; text: string }[];
  delay: number;
}) => {
  const badgeColors: Record<string, string> = {
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-300"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      {/* Badge */}
      <div className="p-6 pb-0">
        <div className={`inline-flex px-3 py-1.5 rounded-full border text-sm font-medium ${badgeColors[badgeColor]}`}>
          {badge}
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-4">
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>

      {/* Illustration */}
      <div className="px-4">
        <Illustration />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Points */}
      <div className="p-6 pt-4 space-y-3">
        {points.map((point, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
              <point.icon className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-gray-300 text-sm">{point.text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default function ProsumerEconomySection() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 50%, rgba(245, 158, 11, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 75% 50%, rgba(168, 85, 247, 0.08) 0%, transparent 40%)
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
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <Users className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-sm font-medium text-purple-400">Target Market</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Powering the{' '}
            <span className="bg-gradient-to-r from-amber-400 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              &apos;Prosumer&apos;
            </span>
            <br className="hidden sm:block" />
            Creator Economy
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Hollywood tools for non-Hollywood budgets. We&apos;re building for the creator
            who demands professional quality without the professional price tag.
          </p>
        </motion.div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ColumnCard
            badge="Target"
            badgeColor="amber"
            title="The 'Mid-Market' Storyteller"
            illustration={StorytellerIllustration}
            points={[
              { icon: Camera, text: 'Indie Filmmakers' },
              { icon: Youtube, text: 'YouTubers & Creators' },
              { icon: Building2, text: 'Agencies & Studios' },
              { icon: GraduationCap, text: 'Educators & Trainers' },
            ]}
            delay={0.1}
          />

          <ColumnCard
            badge="The Gap"
            badgeColor="purple"
            title="Between 'TikTok Toys' and 'Hollywood Pipelines'"
            illustration={GapIllustration}
            points={[
              { icon: Smartphone, text: 'Simple mobile apps lack control' },
              { icon: Server, text: 'Maya/Unreal require expertise' },
              { icon: Sparkles, text: 'SceneFlow bridges the divide' },
            ]}
            delay={0.2}
          />

          <ColumnCard
            badge="Market Timing"
            badgeColor="cyan"
            title="YouTube is Shifting..."
            illustration={MarketTimingIllustration}
            points={[
              { icon: TrendingUp, text: 'Long-form content is rising' },
              { icon: Clapperboard, text: 'Cinema-quality is expected' },
              { icon: Briefcase, text: 'Creators need pro tools, not render farms' },
            ]}
            delay={0.3}
          />
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-xl text-gray-300 mb-6">
            <span className="text-white font-semibold">Creators need tools that offer Hollywood control</span>
            {' '}without Hollywood render farms.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
              <span className="text-2xl">🎬</span>
              <span className="text-gray-300 text-sm">Professional Grade</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
              <span className="text-2xl">💰</span>
              <span className="text-gray-300 text-sm">Creator Budget</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
              <span className="text-2xl">⚡</span>
              <span className="text-gray-300 text-sm">10x Faster</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
