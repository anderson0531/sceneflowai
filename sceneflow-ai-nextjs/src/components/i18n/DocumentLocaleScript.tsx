import {
  APP_SURFACE_PATH_PREFIX,
  ENGLISH_UNTIL_TRANSLATE_PREFIXES,
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
 *
 * Pipeline demo and share routes stay English until the viewer picks a language
 * in the translate control. A marketing locale on `<html lang>` makes Google
 * Translate activate on its own.
 */
export function DocumentLocaleScript() {
  const script = `(function(){try{
var path=location.pathname;
var hold=${JSON.stringify([...ENGLISH_UNTIL_TRANSLATE_PREFIXES])}.some(function(p){return path===p||path.indexOf(p+'/')===0});
if(hold){
var held=document.documentElement;
held.lang='en';
held.dir='ltr';
held.setAttribute('translate','no');
document.cookie='googtrans=; path=/; max-age=0';
document.cookie='googtrans=; path=/; max-age=0; domain='+location.hostname;
document.cookie='sf-gt-active=; path=/; max-age=0';
return;
}
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
