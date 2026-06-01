import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LANDING_LOCALE, isLandingLocale } from './locale'
import { mergeMessages } from './mergeMessages'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale =
    requested && isLandingLocale(requested) ? requested : DEFAULT_LANDING_LOCALE

  const enMessages = (await import('../../messages/en.json')).default

  if (locale === 'en') {
    return {
      locale,
      messages: enMessages,
    }
  }

  const localeMessages = (await import(`../../messages/${locale}.json`)).default

  return {
    locale,
    messages: mergeMessages(enMessages, localeMessages),
  }
})
