'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getLoginUrl } from '@/lib/auth/postLoginRedirect';

const SIGNUP_URL = getLoginUrl({ mode: 'signup' });

export default function FloatingCTA() {
  const t = useTranslations('floatingCta');
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercent = scrollY / (docHeight - windowHeight);
      const shouldShow = scrollY > 800 && scrollPercent < 0.85;
      setIsVisible(shouldShow && !isDismissed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => setIsDismissed(false), 60000);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-gradient-to-t from-slate-950 via-slate-950/98 to-slate-950/90 border-t border-slate-800/50 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 max-w-md mx-auto">
              <button
                onClick={() => {
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-semibold rounded-xl transition-all"
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">{t('seePricing')}</span>
              </button>
              <Link
                href={SIGNUP_URL}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg transition-all"
              >
                <span className="text-sm">{t('tryNine')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="hidden md:flex fixed bottom-6 right-6 z-50 items-center gap-2"
          >
          <Link
            href={SIGNUP_URL}
            className="group relative inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 hover:from-cyan-400 hover:via-purple-400 hover:to-amber-400 text-white font-semibold rounded-xl shadow-2xl shadow-purple-500/30 transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 blur-lg opacity-50 group-hover:opacity-70 transition-opacity -z-10" />
            <span className="mr-2">{t('tryForNine')}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <button
            onClick={handleDismiss}
            className="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white transition-all duration-200 backdrop-blur-sm"
            aria-label={t('dismiss')}
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
