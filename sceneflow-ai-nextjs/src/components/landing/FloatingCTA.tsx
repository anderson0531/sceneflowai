'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

export default function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero section (approximately 800px)
      // and hide when near pricing section
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercent = scrollY / (docHeight - windowHeight);
      
      // Show between 15% and 85% of page scroll
      const shouldShow = scrollY > 800 && scrollPercent < 0.85;
      setIsVisible(shouldShow && !isDismissed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    // Reset after 60 seconds so it can show again
    setTimeout(() => setIsDismissed(false), 60000);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
        >
          {/* Main CTA Button */}
          <Link
            href="/?signup=1"
            className="group relative inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 hover:from-cyan-400 hover:via-purple-400 hover:to-amber-400 text-white font-semibold rounded-xl shadow-2xl shadow-purple-500/30 transition-all duration-300 hover:scale-105"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 blur-lg opacity-50 group-hover:opacity-70 transition-opacity -z-10" />
            
            <span className="mr-2">Start Free Trial</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white transition-all duration-200 backdrop-blur-sm"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
