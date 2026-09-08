import {
  APP_SURFACE_PATH_PREFIX,
  RTL_LOCALES,
  UI_LOCALE_COOKIE,
  LANDING_LOCALE_COOKIE,
} from '@/i18n/locale'

/**
 * Sets `<html lang>` and `<html dir>` from the locale cookie before first paint.
 *
 * The root layout deliberately does not read cookies: doing so would opt every
 * route — including the static marketing and legal pages — into dynamic
 * rendering. This runs synchronously in `<head>` instead, so the document
 * direction is correct before anything is painted and there is no flash.
 * Server-rendered app surfaces still resolve the locale properly via
 * `resolveUiLocale()` in their own layouts.
 *
 * Only marketing routes inherit the landing cookie. `document.documentElement.lang`
 * is the client-side locale source for app chrome, so letting the marketing
 * choice through on `/dashboard` gave those users a partially translated studio
 * without an explicit in-app language choice.
 */
export function DocumentLocaleScript() {
  const script = `(function(){try{
var c=document.cookie,r=/(?:^|;\\s*)([^=]+)=([^;]*)/g,m,v={};
while((m=r.exec(c))){v[m[1].trim()]=m[2]}
var l=v[${JSON.stringify(UI_LOCALE_COOKIE)}];
if(!l&&location.pathname.indexOf(${JSON.stringify(APP_SURFACE_PATH_PREFIX)})!==0){l=v[${JSON.stringify(LANDING_LOCALE_COOKIE)}]}
if(!l)return;
l=decodeURIComponent(l);
var e=document.documentElement;
e.lang=l;
e.dir=${JSON.stringify([...RTL_LOCALES])}.indexOf(l.split('-')[0])>-1?'rtl':'ltr';
}catch(e){}})();`

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
