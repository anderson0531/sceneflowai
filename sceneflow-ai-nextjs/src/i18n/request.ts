import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LANDING_LOCALE, isLandingLocale } from './locale'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale =
    requested && isLandingLocale(requested) ? requested : DEFAULT_LANDING_LOCALE

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
