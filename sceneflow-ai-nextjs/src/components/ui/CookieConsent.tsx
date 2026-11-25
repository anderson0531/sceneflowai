'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X, Cookie, Settings } from 'lucide-react'
import Link from 'next/link'
import { getLocaleDirection, normalizeLocale } from '@/i18n/locale'
import { resolveClientUiLocale, UI_LOCALE_CHANGE_EVENT } from '@/i18n/useUiLocale'

const COOKIE_CONSENT_KEY = 'sceneflow-cookie-consent'

type SupportedCookieLocale =
  | 'en'
  | 'es'
  | 'pt'
  | 'hi'
  | 'zh-CN'
  | 'ar'
  | 'th'
  | 'ja'
  | 'ko'
  | 'de'
  | 'fr'
  | 'it'
  | 'nl'
  | 'ru'

interface CookieLocaleCopy {
  bannerHeading: string
  bannerBody: string
  bannerConsentNote: string
  learnMore: string
  customize: string
  essentialOnly: string
  acceptAll: string
  modalTitle: string
  modalDescriptionPrefix: string
  privacyPolicyLink: string
  modalDescriptionSuffix: string
  essentialTitle: string
  essentialDescription: string
  analyticsTitle: string
  analyticsDescription: string
  marketingTitle: string
  marketingDescription: string
  savePreferences: string
  closeAriaLabel: string
}

const COOKIE_CONSENT_COPY: Record<SupportedCookieLocale, CookieLocaleCopy> = {
  en: {
    bannerHeading: 'We value your privacy',
    bannerBody: 'We use cookies to enhance browsing, analyze traffic, and personalize content.',
    bannerConsentNote: 'By clicking "Accept All", you consent to our use of cookies.',
    learnMore: 'Learn more',
    customize: 'Customize',
    essentialOnly: 'Essential',
    acceptAll: 'Accept All',
    modalTitle: 'Cookie Preferences',
    modalDescriptionPrefix:
      'We use cookies to enhance your experience. You can customize your preferences below. For more details, see our ',
    privacyPolicyLink: 'Privacy Policy',
    modalDescriptionSuffix: '.',
    essentialTitle: 'Essential Cookies',
    essentialDescription: 'Required for the website to function. Cannot be disabled.',
    analyticsTitle: 'Analytics Cookies',
    analyticsDescription: 'Help us understand how visitors interact with our website.',
    marketingTitle: 'Marketing Cookies',
    marketingDescription: 'Used to deliver relevant advertisements and track campaign performance.',
    savePreferences: 'Save Preferences',
    closeAriaLabel: 'Close cookie preferences',
  },
  es: {
    bannerHeading: 'Valoramos tu privacidad',
    bannerBody:
      'Usamos cookies para mejorar la navegación, analizar el tráfico y personalizar el contenido.',
    bannerConsentNote: 'Al hacer clic en «Aceptar todo», aceptas nuestro uso de cookies.',
    learnMore: 'Más información',
    customize: 'Personalizar',
    essentialOnly: 'Esenciales',
    acceptAll: 'Aceptar todo',
    modalTitle: 'Preferencias de cookies',
    modalDescriptionPrefix:
      'Usamos cookies para mejorar tu experiencia. Puedes personalizar tus preferencias abajo. Consulta nuestra ',
    privacyPolicyLink: 'Política de privacidad',
    modalDescriptionSuffix: '.',
    essentialTitle: 'Cookies esenciales',
    essentialDescription: 'Necesarias para el funcionamiento del sitio. No se pueden desactivar.',
    analyticsTitle: 'Cookies de análisis',
    analyticsDescription: 'Nos ayudan a comprender cómo interactúan los visitantes con el sitio.',
    marketingTitle: 'Cookies de marketing',
    marketingDescription: 'Se utilizan para mostrar anuncios relevantes y medir campañas.',
    savePreferences: 'Guardar preferencias',
    closeAriaLabel: 'Cerrar preferencias de cookies',
  },
  pt: {
    bannerHeading: 'Valorizamos a sua privacidade',
    bannerBody:
      'Usamos cookies para melhorar a navegação, analisar o tráfego e personalizar o conteúdo.',
    bannerConsentNote: 'Ao clicar em "Aceitar tudo", você concorda com o uso de cookies.',
    learnMore: 'Saiba mais',
    customize: 'Personalizar',
    essentialOnly: 'Essenciais',
    acceptAll: 'Aceitar tudo',
    modalTitle: 'Preferências de cookies',
    modalDescriptionPrefix:
      'Usamos cookies para aprimorar sua experiência. Personalize suas preferências abaixo ou consulte nossa ',
    privacyPolicyLink: 'Política de Privacidade',
    modalDescriptionSuffix: '.',
    essentialTitle: 'Cookies essenciais',
    essentialDescription: 'Necessários para o funcionamento do site. Não podem ser desativados.',
    analyticsTitle: 'Cookies de análise',
    analyticsDescription: 'Ajudam a entender como os visitantes interagem com o nosso site.',
    marketingTitle: 'Cookies de marketing',
    marketingDescription: 'Usados para exibir anúncios relevantes e medir o desempenho de campanhas.',
    savePreferences: 'Salvar preferências',
    closeAriaLabel: 'Fechar preferências de cookies',
  },
  hi: {
    bannerHeading: 'हम आपकी गोपनीयता का सम्मान करते हैं',
    bannerBody:
      'हम ब्राउज़िंग बेहतर बनाने, ट्रैफ़िक समझने और सामग्री को वैयक्तिकृत करने के लिए कुकीज़ का उपयोग करते हैं।',
    bannerConsentNote: '"सभी स्वीकार करें" पर क्लिक करके आप कुकीज़ के उपयोग की सहमति देते हैं।',
    learnMore: 'और जानें',
    customize: 'कस्टमाइज़',
    essentialOnly: 'आवश्यक',
    acceptAll: 'सभी स्वीकार करें',
    modalTitle: 'कुकी प्राथमिकताएँ',
    modalDescriptionPrefix:
      'हम आपके अनुभव को बेहतर बनाने के लिए कुकीज़ का उपयोग करते हैं। नीचे अपनी प्राथमिकताएँ चुनें या हमारी ',
    privacyPolicyLink: 'गोपनीयता नीति',
    modalDescriptionSuffix: ' देखें।',
    essentialTitle: 'आवश्यक कुकीज़',
    essentialDescription: 'वेबसाइट के सही रूप से कार्य करने के लिए आवश्यक। इन्हें बंद नहीं किया जा सकता।',
    analyticsTitle: 'एनालिटिक्स कुकीज़',
    analyticsDescription: 'यह समझने में मदद करती हैं कि आगंतुक वेबसाइट के साथ कैसे इंटरैक्ट करते हैं।',
    marketingTitle: 'मार्केटिंग कुकीज़',
    marketingDescription: 'प्रासंगिक विज्ञापन दिखाने और अभियान प्रदर्शन मापने के लिए उपयोग की जाती हैं।',
    savePreferences: 'प्राथमिकताएँ सहेजें',
    closeAriaLabel: 'कुकी प्राथमिकताएँ बंद करें',
  },
  'zh-CN': {
    bannerHeading: '我们重视您的隐私',
    bannerBody: '我们使用 Cookie 来优化浏览体验、分析访问流量并提供个性化内容。',
    bannerConsentNote: '点击“全部接受”即表示您同意我们使用 Cookie。',
    learnMore: '了解更多',
    customize: '自定义',
    essentialOnly: '仅必要项',
    acceptAll: '全部接受',
    modalTitle: 'Cookie 偏好设置',
    modalDescriptionPrefix: '我们使用 Cookie 提升您的使用体验。您可以在下方自定义偏好，详情请参阅我们的',
    privacyPolicyLink: '隐私政策',
    modalDescriptionSuffix: '。',
    essentialTitle: '必要 Cookie',
    essentialDescription: '保障网站正常运行所必需，无法关闭。',
    analyticsTitle: '分析类 Cookie',
    analyticsDescription: '帮助我们了解访客如何与网站互动并持续改进体验。',
    marketingTitle: '营销类 Cookie',
    marketingDescription: '用于提供相关推广内容并衡量营销活动效果。',
    savePreferences: '保存设置',
    closeAriaLabel: '关闭 Cookie 偏好设置',
  },
  ar: {
    bannerHeading: 'نحن نقدّر خصوصيتك',
    bannerBody:
      'نستخدم ملفات تعريف الارتباط لتحسين التصفح وتحليل الزيارات وتخصيص المحتوى.',
    bannerConsentNote: 'بالنقر على «قبول الكل»، فإنك توافق على استخدامنا لملفات تعريف الارتباط.',
    learnMore: 'معرفة المزيد',
    customize: 'تخصيص',
    essentialOnly: 'الأساسية فقط',
    acceptAll: 'قبول الكل',
    modalTitle: 'تفضيلات ملفات تعريف الارتباط',
    modalDescriptionPrefix:
      'نستخدم ملفات تعريف الارتباط لتحسين تجربتك. يمكنك تخصيص تفضيلاتك أدناه، وللمزيد راجع ',
    privacyPolicyLink: 'سياسة الخصوصية',
    modalDescriptionSuffix: '.',
    essentialTitle: 'ملفات تعريف الارتباط الأساسية',
    essentialDescription: 'ضرورية لعمل الموقع بشكل صحيح ولا يمكن تعطيلها.',
    analyticsTitle: 'ملفات تعريف الارتباط التحليلية',
    analyticsDescription: 'تساعدنا على فهم كيفية تفاعل الزوار مع موقعنا.',
    marketingTitle: 'ملفات تعريف الارتباط التسويقية',
    marketingDescription: 'تُستخدم لتقديم إعلانات ملائمة وقياس أداء الحملات.',
    savePreferences: 'حفظ التفضيلات',
    closeAriaLabel: 'إغلاق تفضيلات ملفات تعريف الارتباط',
  },
  th: {
    bannerHeading: 'เราให้ความสำคัญกับความเป็นส่วนตัวของคุณ',
    bannerBody:
      'เราใช้คุกกี้เพื่อยกระดับการใช้งาน วิเคราะห์การเข้าชม และปรับแต่งเนื้อหาให้เหมาะสม',
    bannerConsentNote: 'การคลิก "ยอมรับทั้งหมด" ถือว่าคุณยินยอมให้เราใช้คุกกี้',
    learnMore: 'เรียนรู้เพิ่มเติม',
    customize: 'ตั้งค่า',
    essentialOnly: 'เฉพาะที่จำเป็น',
    acceptAll: 'ยอมรับทั้งหมด',
    modalTitle: 'การตั้งค่าคุกกี้',
    modalDescriptionPrefix:
      'เราใช้คุกกี้เพื่อพัฒนาประสบการณ์ของคุณ คุณสามารถปรับแต่งการตั้งค่าด้านล่าง หรืออ่านรายละเอียดใน ',
    privacyPolicyLink: 'นโยบายความเป็นส่วนตัว',
    modalDescriptionSuffix: '',
    essentialTitle: 'คุกกี้ที่จำเป็น',
    essentialDescription: 'จำเป็นต่อการทำงานพื้นฐานของเว็บไซต์ ไม่สามารถปิดใช้งานได้',
    analyticsTitle: 'คุกกี้เพื่อการวิเคราะห์',
    analyticsDescription: 'ช่วยให้เราเข้าใจวิธีที่ผู้เข้าชมใช้งานเว็บไซต์ของเรา',
    marketingTitle: 'คุกกี้เพื่อการตลาด',
    marketingDescription: 'ใช้เพื่อนำเสนอโฆษณาที่ตรงความสนใจและวัดผลแคมเปญ',
    savePreferences: 'บันทึกการตั้งค่า',
    closeAriaLabel: 'ปิดหน้าต่างตั้งค่าคุกกี้',
  },
  ja: {
    bannerHeading: 'プライバシーを大切にしています',
    bannerBody:
      '閲覧体験の向上、トラフィック分析、コンテンツのパーソナライズのために Cookie を使用しています。',
    bannerConsentNote: '「すべて許可」をクリックすると、Cookie の使用に同意したものとみなされます。',
    learnMore: '詳細を見る',
    customize: '設定',
    essentialOnly: '必須のみ',
    acceptAll: 'すべて許可',
    modalTitle: 'Cookie の設定',
    modalDescriptionPrefix:
      'より良い体験を提供するために Cookie を使用しています。以下で設定をカスタマイズできます。詳しくは',
    privacyPolicyLink: 'プライバシーポリシー',
    modalDescriptionSuffix: 'をご覧ください。',
    essentialTitle: '必須 Cookie',
    essentialDescription: 'サイトの基本機能に不可欠なため、無効にすることはできません。',
    analyticsTitle: '分析 Cookie',
    analyticsDescription: 'サイトの利用状況を把握し、サービス改善に役立てます。',
    marketingTitle: 'マーケティング Cookie',
    marketingDescription: '関連性の高い広告配信やキャンペーン効果の測定に使用されます。',
    savePreferences: '設定を保存',
    closeAriaLabel: 'Cookie の設定を閉じる',
  },
  ko: {
    bannerHeading: '개인정보를 소중히 여깁니다',
    bannerBody:
      '탐색 경험 향상, 트래픽 분석 및 콘텐츠 개인화를 위해 쿠키를 사용합니다.',
    bannerConsentNote: '"모두 허용"을 클릭하면 쿠키 사용에 동의하게 됩니다.',
    learnMore: '자세히 보기',
    customize: '맞춤 설정',
    essentialOnly: '필수만',
    acceptAll: '모두 허용',
    modalTitle: '쿠키 기본 설정',
    modalDescriptionPrefix:
      '더 나은 서비스 제공을 위해 쿠키를 사용합니다. 아래에서 설정을 조정할 수 있으며, 자세한 내용은 ',
    privacyPolicyLink: '개인정보 처리방침',
    modalDescriptionSuffix: '을 확인해 주세요.',
    essentialTitle: '필수 쿠키',
    essentialDescription: '웹사이트가 정상적으로 작동하는 데 필요하며 비활성화할 수 없습니다.',
    analyticsTitle: '분석 쿠키',
    analyticsDescription: '방문자가 웹사이트와 상호작용하는 방식을 이해하는 데 도움이 됩니다.',
    marketingTitle: '마케팅 쿠키',
    marketingDescription: '관련성 높은 광고를 제공하고 캠페인 성과를 측정하는 데 사용됩니다.',
    savePreferences: '설정 저장',
    closeAriaLabel: '쿠키 기본 설정 닫기',
  },
  de: {
    bannerHeading: 'Wir schützen Ihre Privatsphäre',
    bannerBody:
      'Wir verwenden Cookies, um die Nutzung zu verbessern, den Datenverkehr zu analysieren und Inhalte zu personalisieren.',
    bannerConsentNote: 'Mit Klick auf „Alle akzeptieren“ stimmen Sie der Verwendung von Cookies zu.',
    learnMore: 'Mehr erfahren',
    customize: 'Anpassen',
    essentialOnly: 'Nur notwendige',
    acceptAll: 'Alle akzeptieren',
    modalTitle: 'Cookie-Einstellungen',
    modalDescriptionPrefix:
      'Wir verwenden Cookies, um Ihr Erlebnis zu verbessern. Sie können Ihre Einstellungen unten anpassen. Weitere Details finden Sie in unserer ',
    privacyPolicyLink: 'Datenschutzerklärung',
    modalDescriptionSuffix: '.',
    essentialTitle: 'Notwendige Cookies',
    essentialDescription: 'Für die Grundfunktionen der Website erforderlich. Können nicht deaktiviert werden.',
    analyticsTitle: 'Analyse-Cookies',
    analyticsDescription: 'Helfen uns zu verstehen, wie Besucher mit unserer Website interagieren.',
    marketingTitle: 'Marketing-Cookies',
    marketingDescription: 'Dienen der Anzeige relevanter Werbung und der Messung von Kampagnen.',
    savePreferences: 'Einstellungen speichern',
    closeAriaLabel: 'Cookie-Einstellungen schließen',
  },
  fr: {
    bannerHeading: 'Nous respectons votre vie privée',
    bannerBody:
      'Nous utilisons des cookies pour améliorer la navigation, analyser le trafic et personnaliser le contenu.',
    bannerConsentNote: 'En cliquant sur « Tout accepter », vous consentez à l’utilisation des cookies.',
    learnMore: 'En savoir plus',
    customize: 'Personnaliser',
    essentialOnly: 'Essentiels',
    acceptAll: 'Tout accepter',
    modalTitle: 'Préférences des cookies',
    modalDescriptionPrefix:
      'Nous utilisons des cookies pour améliorer votre expérience. Personnalisez vos choix ci-dessous ou consultez notre ',
    privacyPolicyLink: 'Politique de confidentialité',
    modalDescriptionSuffix: '.',
    essentialTitle: 'Cookies essentiels',
    essentialDescription: 'Indispensables au bon fonctionnement du site. Ne peuvent pas être désactivés.',
    analyticsTitle: 'Cookies d’analyse',
    analyticsDescription: 'Nous aident à comprendre comment les visiteurs interagissent avec le site.',
    marketingTitle: 'Cookies marketing',
    marketingDescription: 'Utilisés pour afficher des annonces pertinentes et mesurer les campagnes.',
    savePreferences: 'Enregistrer',
    closeAriaLabel: 'Fermer les préférences des cookies',
  },
  it: {
    bannerHeading: 'Teniamo alla tua privacy',
    bannerBody:
      'Utilizziamo i cookie per migliorare la navigazione, analizzare il traffico e personalizzare i contenuti.',
    bannerConsentNote: 'Cliccando su "Accetta tutto", acconsenti all’uso dei cookie.',
    learnMore: 'Scopri di più',
    customize: 'Personalizza',
    essentialOnly: 'Essenziali',
    acceptAll: 'Accetta tutto',
    modalTitle: 'Preferenze sui cookie',
    modalDescriptionPrefix:
      'Utilizziamo i cookie per migliorare la tua esperienza. Puoi personalizzare le preferenze qui sotto o consultare la nostra ',
    privacyPolicyLink: 'Informativa sulla privacy',
    modalDescriptionSuffix: '.',
    essentialTitle: 'Cookie essenziali',
    essentialDescription: 'Necessari per il funzionamento del sito. Non possono essere disattivati.',
    analyticsTitle: 'Cookie analitici',
    analyticsDescription: 'Ci aiutano a capire come i visitatori interagiscono con il nostro sito.',
    marketingTitle: 'Cookie di marketing',
    marketingDescription: 'Utilizzati per mostrare annunci pertinenti e misurare le campagne.',
    savePreferences: 'Salva preferenze',
    closeAriaLabel: 'Chiudi preferenze sui cookie',
  },
  nl: {
    bannerHeading: 'Wij respecteren je privacy',
    bannerBody:
      'We gebruiken cookies om je browse-ervaring te verbeteren, verkeer te analyseren en inhoud te personaliseren.',
    bannerConsentNote: 'Door op "Alles accepteren" te klikken, stem je in met ons gebruik van cookies.',
    learnMore: 'Meer informatie',
    customize: 'Aanpassen',
    essentialOnly: 'Alleen noodzakelijk',
    acceptAll: 'Alles accepteren',
    modalTitle: 'Cookievoorkeuren',
    modalDescriptionPrefix:
      'We gebruiken cookies om je ervaring te verbeteren. Pas je voorkeuren hieronder aan of bekijk ons ',
    privacyPolicyLink: 'Privacybeleid',
    modalDescriptionSuffix: '.',
    essentialTitle: 'Noodzakelijke cookies',
    essentialDescription: 'Vereist voor de basiswerking van de website. Kunnen niet worden uitgeschakeld.',
    analyticsTitle: 'Analytische cookies',
    analyticsDescription: 'Helpen ons te begrijpen hoe bezoekers onze website gebruiken.',
    marketingTitle: 'Marketingcookies',
    marketingDescription: 'Worden gebruikt om relevante advertenties te tonen en campagnes te meten.',
    savePreferences: 'Voorkeuren opslaan',
    closeAriaLabel: 'Cookievoorkeuren sluiten',
  },
  ru: {
    bannerHeading: 'Мы ценим вашу конфиденциальность',
    bannerBody:
      'Мы используем файлы cookie для улучшения работы сайта, анализа трафика и персонализации контента.',
    bannerConsentNote: 'Нажимая «Принять все», вы соглашаетесь на использование файлов cookie.',
    learnMore: 'Подробнее',
    customize: 'Настроить',
    essentialOnly: 'Только важные',
    acceptAll: 'Принять все',
    modalTitle: 'Настройки файлов cookie',
    modalDescriptionPrefix:
      'Мы используем файлы cookie для улучшения работы сервиса. Вы можете изменить настройки ниже или ознакомиться с нашей ',
    privacyPolicyLink: 'Политикой конфиденциальности',
    modalDescriptionSuffix: '.',
    essentialTitle: 'Необходимые cookie',
    essentialDescription: 'Обязательны для корректной работы сайта и не могут быть отключены.',
    analyticsTitle: 'Аналитические cookie',
    analyticsDescription: 'Помогают понять, как посетители взаимодействуют с нашим сайтом.',
    marketingTitle: 'Маркетинговые cookie',
    marketingDescription: 'Используются для показа релевантной рекламы и оценки эффективности кампаний.',
    savePreferences: 'Сохранить настройки',
    closeAriaLabel: 'Закрыть настройки файлов cookie',
  },
}

function resolveCookieBannerLocale(pathname: string | null): SupportedCookieLocale {
  const firstSeg = pathname?.split('/').filter(Boolean)[0]
  const fromPath = firstSeg ? normalizeLocale(firstSeg) : undefined
  if (fromPath && fromPath in COOKIE_CONSENT_COPY) {
    return fromPath as SupportedCookieLocale
  }
  const clientLocale = normalizeLocale(resolveClientUiLocale())
  if (clientLocale && clientLocale in COOKIE_CONSENT_COPY) {
    return clientLocale as SupportedCookieLocale
  }
  return 'en'
}

interface CookiePreferences {
  essential: boolean // Always true - required for site to work
  analytics: boolean
  marketing: boolean
  consentDate: string
}

export function CookieConsent() {
  const pathname = usePathname()
  const [locale, setLocale] = useState<SupportedCookieLocale>('en')
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    consentDate: ''
  })

  useEffect(() => {
    setLocale(resolveCookieBannerLocale(pathname))
    const onLocaleChange = () => setLocale(resolveCookieBannerLocale(pathname))
    window.addEventListener(UI_LOCALE_CHANGE_EVENT, onLocaleChange)
    return () => window.removeEventListener(UI_LOCALE_CHANGE_EVENT, onLocaleChange)
  }, [pathname])

  useEffect(() => {
    // Check if user has already consented
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) {
      // Delay showing banner slightly for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    } else {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences
        setPreferences(parsed)
      } catch {
        // Invalid stored data, show banner again
        setShowBanner(true)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sceneflow:cookie-consent-updated'))
    }
  }, [showBanner])

  const saveConsent = (prefs: CookiePreferences) => {
    const withDate = { ...prefs, consentDate: new Date().toISOString() }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(withDate))
    setPreferences(withDate)
    setShowBanner(false)
    setShowSettings(false)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sceneflow:cookie-consent-updated'))
    }
  }

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      consentDate: ''
    })
  }

  const handleEssentialOnly = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      consentDate: ''
    })
  }

  const handleSavePreferences = () => {
    saveConsent(preferences)
  }

  if (!showBanner) return null

  const copy = COOKIE_CONSENT_COPY[locale] ?? COOKIE_CONSENT_COPY.en
  const dir = getLocaleDirection(locale)

  return (
    <>
      {/* Backdrop for settings modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/60 z-[9998]" 
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Main Banner */}
      <div
        data-cookie-banner-open="true"
        lang={locale}
        dir={dir}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-2.5 md:p-4"
      >
        <div className="max-w-4xl mx-auto">
          {showSettings ? (
            /* Detailed Settings Panel */
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-[85dvh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">{copy.modalTitle}</h3>
                  </div>
                  <button 
                    type="button"
                    aria-label={copy.closeAriaLabel}
                    onClick={() => setShowSettings(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-6">
                  {copy.modalDescriptionPrefix}
                  <Link href="/privacy" className="text-purple-400 hover:underline">
                    {copy.privacyPolicyLink}
                  </Link>
                  {copy.modalDescriptionSuffix}
                </p>

                <div className="space-y-4">
                  {/* Essential Cookies - Always On */}
                  <div className="flex items-center justify-between gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div>
                      <h4 className="font-medium text-white">{copy.essentialTitle}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {copy.essentialDescription}
                      </p>
                    </div>
                    <div className="relative shrink-0">
                      <div className="w-12 h-6 bg-purple-600 rounded-full">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-center justify-between gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div>
                      <h4 className="font-medium text-white">{copy.analyticsTitle}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {copy.analyticsDescription}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferences.analytics}
                      aria-label={copy.analyticsTitle}
                      onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                      className="relative shrink-0"
                    >
                      <div className={`w-12 h-6 rounded-full transition-colors ${preferences.analytics ? 'bg-purple-600' : 'bg-gray-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${preferences.analytics ? 'right-1' : 'left-1'}`}></div>
                      </div>
                    </button>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-center justify-between gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div>
                      <h4 className="font-medium text-white">{copy.marketingTitle}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {copy.marketingDescription}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferences.marketing}
                      aria-label={copy.marketingTitle}
                      onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                      className="relative shrink-0"
                    >
                      <div className={`w-12 h-6 rounded-full transition-colors ${preferences.marketing ? 'bg-purple-600' : 'bg-gray-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${preferences.marketing ? 'right-1' : 'left-1'}`}></div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {copy.savePreferences}
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    {copy.acceptAll}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Simple Banner — compact bar on mobile (< md), rich horizontal strip on desktop */
            <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-xl shadow-2xl p-3.5 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2.5 md:gap-4">
                <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-purple-400" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-white text-xs md:text-base font-semibold md:font-medium mb-0.5 md:mb-1">
                    {copy.bannerHeading}
                  </h3>
                  <p className="text-gray-300 md:text-gray-400 text-[11px] md:text-sm leading-snug md:leading-normal">
                    {copy.bannerBody}
                    <span className="hidden sm:inline">
                      {' '}{copy.bannerConsentNote}
                    </span>
                    <Link href="/privacy" className="text-purple-400 hover:underline ms-1 whitespace-nowrap">
                      {copy.learnMore}
                    </Link>
                  </p>
                </div>

                <div className="grid grid-cols-3 md:flex md:flex-wrap gap-1.5 md:gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="px-2.5 py-1.5 md:px-4 md:py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg text-xs md:text-sm font-medium transition-colors"
                  >
                    {copy.customize}
                  </button>
                  <button
                    type="button"
                    onClick={handleEssentialOnly}
                    className="px-2.5 py-1.5 md:px-4 md:py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg text-xs md:text-sm font-medium transition-colors"
                  >
                    {copy.essentialOnly}
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="px-2.5 py-1.5 md:px-4 md:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs md:text-sm font-semibold md:font-medium transition-colors"
                  >
                    {copy.acceptAll}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/**
 * Hook to check cookie consent status
 * Use this to conditionally load analytics/marketing scripts
 */
export function useCookieConsent(): CookiePreferences | null {
  const [consent, setConsent] = useState<CookiePreferences | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (stored) {
      try {
        setConsent(JSON.parse(stored))
      } catch {
        setConsent(null)
      }
    }
  }, [])

  return consent
}
