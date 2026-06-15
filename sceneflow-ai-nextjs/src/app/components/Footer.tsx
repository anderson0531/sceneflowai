'use client'

import { Mail, ExternalLink, Youtube } from 'lucide-react'
import Image from 'next/image'
import { SceneFlowStudioBrand } from '@/components/layout/SceneFlowStudioBrand'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { getLandingLocalePath } from '@/i18n/locale'

export function Footer() {
  const t = useTranslations('footer')
  const locale = useLocale()

  const footerLinks = {
    product: [
      { name: t('links.features'), href: '#features' },
      { name: t('links.pricing'), href: '#pricing' },
      { name: t('links.howItWorks'), href: '#how-it-works' },
    ],
    resources: [
      { name: t('links.gettingStarted'), href: '#how-it-works' },
      { name: t('links.pricing'), href: '#pricing' },
    ],
    legal: [
      { name: t('links.privacy'), href: '/privacy' },
      { name: t('links.terms'), href: '/terms' },
      { name: t('links.trustSafety'), href: '/trust-safety' },
      { name: t('links.refunds'), href: '/refunds' },
      { name: t('links.contact'), href: '/contact' },
    ],
  }

  const socialLinks = [
    { name: 'Email', icon: Mail, href: 'mailto:brian@sfai.studio' },
    {
      name: 'YouTube',
      icon: Youtube,
      href: 'https://www.youtube.com/channel/UCSXGf2gMfCRtktBCrFBDc0g/',
    },
  ]

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="border-t border-gray-800 py-16 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          <div className="col-span-1 lg:col-span-2">
            <div className="mb-6">
              <SceneFlowStudioBrand
                href={getLandingLocalePath(locale)}
                variant="landing"
                nameClassName="text-white"
              />
            </div>
            <p className="text-gray-400 max-w-md mb-6">{t('description')}</p>

            <div className="flex space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
                    target={social.href.startsWith('http') ? '_blank' : undefined}
                    rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{t('product')}</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <button
                    onClick={() => scrollToSection(link.href.slice(1))}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{t('resources')}</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <button
                    onClick={() => scrollToSection(link.href.slice(1))}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{t('legal')}</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-10">
          <div className="text-center mb-8">
            <p className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              {t('tagline')}
            </p>
            <p className="text-gray-500 mt-2">{t('taglineSub')}</p>
          </div>

          <div className="flex flex-col items-center gap-3 pt-6 border-t border-gray-800/50 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs text-gray-400">{t('securePayments')}</span>
            </div>
            <p className="text-xs text-gray-500 text-center max-w-lg">{t('morLine')}</p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-gray-800/50">
            <div className="text-center md:text-left">
              <p className="text-gray-500 text-sm">{t('copyright')}</p>
              <p className="text-gray-600 text-xs mt-1">{t('address')}</p>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <div className="flex items-center gap-2">
                <Image
                  src="/images/google-cloud-logo.png"
                  alt="Google Cloud"
                  width={16}
                  height={16}
                />
                <span className="text-xs text-gray-400">{t('poweredBy')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
