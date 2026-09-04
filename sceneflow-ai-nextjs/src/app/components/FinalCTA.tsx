'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { NotifyCapture } from '@/components/landing/NotifyCapture'
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent'

export function FinalCTA() {
  const t = useTranslations('finalCta')

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-purple-500/5 to-gray-950"></div>

      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6">{t('title')}</h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">{t('subtitle')}</p>

          <div className="flex justify-center">
            <NotifyCapture source="final-cta" />
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={getSignupUrlForTier('explorer')} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                {t('cta')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href={t('ctaSecondaryHref')} className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-purple-500/40 text-purple-300 hover:bg-purple-500/10">
                {t('ctaSecondary')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
