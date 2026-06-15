'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Video, User, Briefcase, ArrowRight, Users, Store, Clapperboard } from 'lucide-react';

import { ProductionComparisonVisual } from './ProductionComparisonVisual';
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent';
import { getDefaultCategoryIdForPersona } from '@/config/landing/valuePropCopy';
import { SECTION_NARRATION_AUDIO } from '@/config/landing/landingVisualMedia';
import { SectionNarrationButton } from '@/components/landing/SectionNarrationButton';
import {
  SectionCollapseBody,
  SectionCollapseToggle,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse';
import { cn } from '@/lib/utils';

const SECTION_ID = 'use-cases';

type Persona = 'creator' | 'team' | 'productionShop' | 'agency' | 'filmProduction';

const PERSONA_IDS: Persona[] = ['creator', 'team', 'productionShop', 'agency', 'filmProduction'];

type TabPersona = {
  id: Persona;
  label: string;
  icon: React.ElementType;
  gradient: string;
};

const PERSONA_HASH_MAP: Record<string, Persona> = {
  'use-cases-creator': 'creator',
  'use-cases-team': 'team',
  'use-cases-production-shop': 'productionShop',
  'use-cases-agency': 'agency',
  'use-cases-film-production': 'filmProduction',
};

const PERSONA_STYLES: Record<Persona, Pick<TabPersona, 'icon' | 'gradient'>> = {
  creator: { icon: Video, gradient: 'from-amber-500 to-orange-600' },
  team: { icon: Users, gradient: 'from-emerald-500 to-teal-600' },
  productionShop: { icon: Store, gradient: 'from-violet-500 to-purple-600' },
  agency: { icon: Briefcase, gradient: 'from-cyan-500 to-blue-600' },
  filmProduction: { icon: Clapperboard, gradient: 'from-rose-500 to-indigo-600' },
};

const SEGMENT_CTA_HREFS: Record<Persona, string> = {
  creator: getSignupUrlForTier('explorer'),
  team: '/early-access',
  productionShop: '#production-verticals',
  agency: '#pricing',
  filmProduction: getSignupUrlForTier('explorer'),
};

function buildTabPersonas(t: ReturnType<typeof useTranslations<'useCases'>>): TabPersona[] {
  return PERSONA_IDS.map((id) => ({
    id,
    label: (t.raw(`personas.${id}`) as { label: string }).label,
    ...PERSONA_STYLES[id],
  }));
}

export default function UseCasesSection() {
  const t = useTranslations('useCases');
  const tAudience = useTranslations('audiencePaths');
  const { isOpen } = useLandingSectionCollapse(SECTION_ID);

  const personas = useMemo(() => buildTabPersonas(t), [t]);

  const audiencePaths = useMemo(
    () =>
      tAudience.raw('paths') as Array<{
        id: string;
        label: string;
        useCases: string[];
      }>,
    [tAudience]
  );

  const [activePersona, setActivePersona] = useState<Persona>('creator');
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    getDefaultCategoryIdForPersona('creator')
  );

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (PERSONA_HASH_MAP[hash]) {
        setActivePersona(PERSONA_HASH_MAP[hash]);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  useEffect(() => {
    setActiveCategoryId(getDefaultCategoryIdForPersona(activePersona));
  }, [activePersona]);

  const activeLocalizedPath = audiencePaths.find((path) => path.id === activePersona);
  const activeCta = {
    label: t(`segmentCtas.${activePersona}.label`),
    subtext: t(`segmentCtas.${activePersona}.subtext`),
    href: SEGMENT_CTA_HREFS[activePersona],
  };
  const isExternalSignup = activePersona === 'creator' || activePersona === 'filmProduction';

  return (
    <section
      id={SECTION_ID}
      className={cn(
        'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden scroll-mt-20',
        isOpen ? 'py-24' : 'pt-24 pb-8'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <SectionCollapseToggle sectionId={SECTION_ID} className="absolute right-0 top-0" />
          <div className="inline-flex flex-row items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <User className="w-4 h-4 shrink-0 self-center text-purple-400" />
            <span className="text-purple-300 text-sm font-medium leading-none">{t('badge')}</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              {t('title')}{' '}
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 bg-clip-text text-transparent">
                {t('titleAccent')}
              </span>
            </h2>
            <SectionNarrationButton src={SECTION_NARRATION_AUDIO[SECTION_ID]} />
          </div>

          <p className="text-gray-400 max-w-2xl mx-auto text-lg">{t('subtitle')}</p>
          <p className="text-slate-400 max-w-3xl mx-auto text-sm leading-relaxed mt-4">
            {t('qualifyingStatement')}
          </p>
        </motion.div>

        <SectionCollapseBody sectionId={SECTION_ID}>
          <motion.div
            className="flex justify-center mb-8 px-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="inline-flex flex-wrap justify-center gap-1 p-1.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 max-w-full">
              {personas.map((persona) => {
                const Icon = persona.icon;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setActivePersona(persona.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium transition-all duration-300
                      ${
                        activePersona === persona.id
                          ? `bg-gradient-to-r ${persona.gradient} text-white shadow-lg`
                          : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">{persona.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            id="production-verticals"
            className="mb-20 mt-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {activeLocalizedPath && (
              <p className="text-center text-base text-gray-400 mb-4 max-w-2xl mx-auto">
                <span className="text-gray-300 font-medium">
                  {tAudience('examplesFor', { label: activeLocalizedPath.label })}
                </span>{' '}
                {activeLocalizedPath.useCases.slice(0, 3).join(', ')}
                {tAudience('andMore')}
              </p>
            )}
            <ProductionComparisonVisual initialCategoryId={activeCategoryId} />
          </motion.div>

          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {isExternalSignup ? (
              <button
                type="button"
                onClick={() => {
                  window.location.href = activeCta.href;
                }}
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white font-semibold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
              >
                {activeCta.label}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <Link
                href={activeCta.href}
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white font-semibold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
              >
                {activeCta.label}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            {activeCta.subtext && (
              <p className="text-gray-500 text-base mt-3">{activeCta.subtext}</p>
            )}
            {activePersona !== 'creator' && activePersona !== 'filmProduction' && (
              <p className="text-gray-600 text-sm mt-2">
                {t('ui.orPrefix')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = getSignupUrlForTier('explorer');
                  }}
                  className="text-purple-400 hover:text-purple-300 underline-offset-2 hover:underline"
                >
                  {t('ui.orStartExplorer')}
                </button>
              </p>
            )}
          </motion.div>
        </SectionCollapseBody>
      </div>
    </section>
  );
}
