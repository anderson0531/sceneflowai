'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent';
import { isPrelaunchAccessModeEnabled } from '@/lib/billing/prelaunchAccess';
import { openPrelaunchAccessModal } from '@/components/landing/PrelaunchAccessModal';
import { localizeUsdText } from '@/lib/i18n/landingCurrency';

const SIGNUP_URL = getSignupUrlForTier('explorer');
const DISMISS_STORAGE_KEY = 'sceneflow-floating-cta-dismissed';

export default function FloatingCTA() {
  const locale = useLocale();
  const t = useTranslations('floatingCta');
  const prelaunchOnly = isPrelaunchAccessModeEnabled();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [cookieBannerOpen, setCookieBannerOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage?.getItem(DISMISS_STORAGE_KEY) === '1') {
        setIsDismissed(true);
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  useEffect(() => {
    const syncCookieBannerState = () => {
      const hasStoredConsent = Boolean(window.localStorage?.getItem('sceneflow-cookie-consent'));
      const isDomOpen = Boolean(document.querySelector('[data-cookie-banner-open="true"]'));
      setCookieBannerOpen(!hasStoredConsent || isDomOpen);
    };

    syncCookieBannerState();
    window.addEventListener('sceneflow:cookie-consent-updated', syncCookieBannerState);
    window.addEventListener('storage', syncCookieBannerState);
    return () => {
      window.removeEventListener('sceneflow:cookie-consent-updated', syncCookieBannerState);
      window.removeEventListener('storage', syncCookieBannerState);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const denom = Math.max(1, docHeight - windowHeight);
      const scrollPercent = scrollY / denom;
      const shouldShow = scrollY > 800 && scrollPercent < 0.85;
      setIsVisible(shouldShow && !isDismissed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      window.sessionStorage?.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {
      // ignore storage access errors
    }
  };

  return (
    <AnimatePresence>
      {isVisible && !cookieBannerOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="xl:hidden fixed bottom-0 left-0 right-0 z-50 px-2.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-950 via-slate-950/98 to-slate-950/92 border-t border-slate-800/60 backdrop-blur-md"
        >
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <button
              type="button"
              title={t('seePricing')}
              onClick={() => {
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex-1 min-w-0 min-h-[44px] flex items-center justify-center gap-1.5 px-2.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold rounded-xl transition-all"
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span className="text-xs min-[390px]:text-sm leading-tight whitespace-normal text-center">
                {t('seePricing')}
              </span>
            </button>
            {prelaunchOnly ? (
              <button
                type="button"
                title={t.has('requestAccess') ? t('requestAccess') : 'Request Access'}
                onClick={() => {
                  if (!openPrelaunchAccessModal({ tier: 'explorer', source: 'floating-cta' })) {
                    window.location.href = SIGNUP_URL;
                  }
                }}
                className="flex-1 min-w-0 min-h-[44px] flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 text-slate-950 font-semibold rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
              >
                <span className="text-xs min-[390px]:text-sm leading-tight whitespace-normal text-center">
                  {t.has('requestAccess') ? t('requestAccess') : 'Request Access'}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            ) : (
              <Link
                href={SIGNUP_URL}
                title={localizeUsdText(t('tryNine'), locale)}
                className="flex-1 min-w-0 min-h-[44px] flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 text-slate-950 font-semibold rounded-xl shadow-lg shadow-cyan-500/25 transition-all"
              >
                <span className="text-xs min-[390px]:text-sm leading-tight whitespace-normal text-center">
                  {localizeUsdText(t('tryNine'), locale)}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white transition-colors"
              aria-label={t('dismiss')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
