'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function SlotMachineSection() {
  const t = useTranslations('comparison')
  return (
    <section id="comparison" className="py-20 sm:py-28 bg-gray-950 overflow-hidden scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">{t('title')}</h2>
          <p className="text-gray-400">{t('subtitle')}</p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(6,182,212,0.3)] border border-cyan-500/20"
          >
            <img 
              src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Gemini_Generated_Image_y6ocnvy6ocnvy6oc.jpeg" 
              alt={t('imageAlt')}
              className="w-full h-auto object-cover"
            />
          </motion.div>
          <p className="mt-4 text-center text-sm text-gray-500 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500/70" />
            {t('caption')}
          </p>
        </div>
      </div>
    </section>
  );
}
