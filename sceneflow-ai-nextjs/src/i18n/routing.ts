import { defineRouting } from 'next-intl/routing'
import { DEFAULT_LANDING_LOCALE, LANDING_LOCALES } from './locale'

export const landingRouting = defineRouting({
  locales: LANDING_LOCALES,
  defaultLocale: DEFAULT_LANDING_LOCALE,
  localePrefix: 'never',
  localeCookie: {
    name: 'sf-landing-locale',
  },
})
