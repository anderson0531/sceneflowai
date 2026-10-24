#!/usr/bin/env node
/**
 * Machine-translate the English app catalogs into every platform locale.
 *
 * Reuses the landing MT engine (provider chain, chunking, glossary and ICU
 * protection) but translates only keys whose English text changed since the last
 * build, using messages/app/_fingerprints.json. A full re-run of ~1,000 keys
 * across 38 locales is expensive; a typical change touches a handful of keys.
 *
 * Usage:
 *   npx tsx scripts/generate-app-locale-messages.ts
 *   npx tsx scripts/generate-app-locale-messages.ts --locales=es,ja --surfaces=blueprint
 *   npx tsx scripts/generate-app-locale-messages.ts --full --provider=vertex
 */

import { config } from 'dotenv'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { APP_SURFACES, type AppSurface } from '../src/i18n/appSurfaces.ts'
import { LOCALES, DEFAULT_LOCALE } from '../src/i18n/locale.ts'
import { protectAll, restoreGlossary } from '../src/lib/i18n/glossary.ts'
import {
  flattenMessages,
  unflattenMessages,
  translateFlatMessages,
  type TranslateProvider,
} from './lib/landingMessageTranslate.ts'
import {
  buildFingerprints,
  changedKeys,
  readEnglishSurface,
  readFingerprints,
} from './build-app-messages.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const APP_MESSAGES_DIR = join(ROOT, 'messages', 'app')
const FINGERPRINT_PATH = join(APP_MESSAGES_DIR, '_fingerprints.json')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

function arg(name: string): string | undefined {
  const match = process.argv.find((value) => value.startsWith(`--${name}=`))
  return match?.split('=')[1]
}

function localePath(locale: string, surface: AppSurface): string {
  return join(APP_MESSAGES_DIR, locale, `${surface}.json`)
}

/**
 * Curated native Studio UI terminology overrides for the 5 target locales
 * (`es`, `pt`, `hi`, `zh-CN`, `ar`). Short 1-2 word UI strings ("Story",
 * "Beats", "Characters", "Setting", "Play", "Close", "Running…", "Missing",
 * "Script") are ambiguous in general NMT without film-production context.
 */
const STUDIO_UI_OVERRIDES: Record<string, Partial<Record<AppSurface, Record<string, string>>>> = {
  es: {
    common: {
      'actions.save': 'Guardar',
      'actions.saveChanges': 'Guardar cambios',
      'actions.cancel': 'Cancelar',
      'actions.close': 'Cerrar',
      'actions.apply': 'Aplicar',
      'actions.applyChanges': 'Aplicar cambios',
      'actions.delete': 'Eliminar',
      'actions.remove': 'Quitar',
      'actions.edit': 'Editar',
      'actions.add': 'Añadir',
      'actions.duplicate': 'Duplicar',
      'actions.retry': 'Reintentar',
      'actions.refresh': 'Actualizar',
      'actions.back': 'Atrás',
      'actions.next': 'Siguiente',
      'actions.done': 'Listo',
      'actions.confirm': 'Confirmar',
      'actions.generate': 'Generar',
      'actions.regenerate': 'Regenerar',
      'actions.refine': 'Refinar',
      'actions.preview': 'Vista previa',
      'actions.download': 'Descargar',
      'actions.share': 'Compartir',
      'actions.copy': 'Copiar',
      'actions.copied': 'Copiado',
      'actions.search': 'Buscar',
      'actions.viewAll': 'Ver todo',
      'actions.learnMore': 'Más información',
      'actions.showMore': 'Mostrar más',
      'actions.showLess': 'Mostrar menos',
      'status.saving': 'Guardando…',
      'status.saved': 'Guardado',
      'status.saveFailed': 'Error al guardar',
      'status.loading': 'Cargando…',
      'status.generating': 'Generando…',
      'status.unsavedChanges': 'Cambios sin guardar',
      'status.processing': 'Procesando…',
      'status.ready': 'Listo',
      'status.failed': 'Fallido',
      'status.empty': 'Aún no hay nada aquí',
      'nav.dashboard': 'Panel',
      'nav.projects': 'Proyectos',
      'nav.startProject': 'Iniciar proyecto',
      'nav.settings': 'Ajustes',
      'nav.help': 'Ayuda',
      'nav.profile': 'Perfil',
      'nav.signIn': 'Iniciar sesión',
      'nav.signOut': 'Cerrar sesión',
      'nav.getStarted': 'Comenzar',
      'language.interfaceLanguage': 'Idioma de la interfaz',
      'language.storyLanguage': 'Idioma de la historia',
      'language.deliveryLanguages': 'Idiomas de entrega',
      'language.yourWording': 'Tu redacción',
      'language.viewOriginal': 'Ver original',
      'language.hideOriginal': 'Ocultar original',
      'language.translating': 'Traduciendo…',
      'language.englishRequired': 'Inglés obligatorio',
      'language.notTranslated': 'No traducido',
      'errors.tooLong': 'Este texto es demasiado largo.',
    },
    dashboard: {
      'home.noProjects': 'Aún no hay proyectos.',
      'projects.empty': 'Aún no hay proyectos.',
      'home.startProject': 'Iniciar proyecto',
    },
    settings: {
      'languages.storyTitle': 'Idioma de la historia',
      'languages.deliverySetInProduction': 'Se configura en Production Stage',
    },
    series: {
      'studio.empty': 'Aún no hay series',
      'detail.episodes': 'Episodios',
      'detail.generateEpisodes': 'Generar episodios',
      'continuity.aesthetics': 'Estética',
      'fields.seriesTitle': 'Título de la serie',
      'fields.setting': 'Ambientación',
      'fields.episodeTitle': 'Título del episodio',
      'fields.episodeSynopsis': 'Sinopsis del episodio',
      'toast.updated': 'Serie actualizada',
    },
    blueprint: {
      'tabs.core': 'Esencial',
      'tabs.story': 'Historia',
      'tabs.tone': 'Tono',
      'tabs.beats': 'Beats',
      'tabs.characters': 'Personajes',
      'tabs.charactersWithCount': 'Personajes ({count})',
      'sections.beats': 'Beats narrativos',
      'sections.characters': 'Personajes',
      'sections.charactersWithCount': 'Personajes ({count})',
      'fields.artStyle': 'Estilo artístico',
      'fields.setting': 'Ambientación',
      'fields.protagonist': 'Protagonista',
      'fields.beat': 'Beat {number}',
      'fields.beatTitle': 'Título del beat',
      'fields.beatDescription': 'Descripción del beat...',
      'fields.characterDescription': 'Descripción del personaje',
      'character.fatalFlaw': 'Defecto fatal',
      'character.arc': 'Arco del personaje',
      'heroImage.uploadImage': 'Subir imagen',
      'heroImage.failedToGenerate': 'No se pudo generar la imagen',
      'startProduction.beats': 'Beats',
      'startProduction.artStyle': 'Estilo artístico',
      'checklist.artStyle': 'Estilo artístico',
    },
    production: {
      'studio.script': 'Guion',
      'studio.characters': 'Personajes',
      'studio.scenes': 'Escenas',
      'script.generateScript': 'Generar guion',
      'script.regenerateScript': 'Regenerar guion',
      'script.reviewScript': 'Revisar guion',
      'script.narration': 'Narración',
      'express.running': 'Ejecutando…',
      'expressAudio.statusMissing': 'Faltante',
      'expressAudio.running': 'Ejecutando…',
      'expressScene.missing': 'Faltante',
      'expressScene.running': 'Ejecutando…',
      'expressGenerateAll.statusMissing': 'Faltante',
      'expressGenerateAll.missing': 'Faltante',
      'expressGenerateAll.running': 'Ejecutando…',
      'segments.addType.tabPrompt': 'Prompt',
      'segments.addType.beatOption': 'Beat {number} ({duration}s)',
      'audio.assets.syncFromScript': 'Sincronizar desde el guion',
      'audio.assets.close': 'Cerrar',
      'audio.assets.play': 'Reproducir',
      'audio.alignment.title': 'Alineación de audio del Beat {number}',
      'audio.syncFromScript': 'Sincronizar desde el guion',
      'audio.close': 'Cerrar',
      'audio.alignmentTitle': 'Alineación de audio del Beat {number}',
      'export.stream.beatLabel': 'Beat {number}',
      'reset.beatStructureOnly': 'Solo estructura de beats',
    },
  },
  pt: {
    common: {
      'actions.save': 'Salvar',
      'actions.saveChanges': 'Salvar alterações',
      'actions.cancel': 'Cancelar',
      'actions.close': 'Fechar',
      'actions.apply': 'Aplicar',
      'actions.applyChanges': 'Aplicar alterações',
      'actions.delete': 'Excluir',
      'actions.remove': 'Remover',
      'actions.edit': 'Editar',
      'actions.add': 'Adicionar',
      'actions.duplicate': 'Duplicar',
      'actions.retry': 'Tentar novamente',
      'actions.refresh': 'Atualizar',
      'actions.back': 'Voltar',
      'actions.next': 'Próximo',
      'actions.done': 'Concluído',
      'actions.confirm': 'Confirmar',
      'actions.generate': 'Gerar',
      'actions.regenerate': 'Regenerar',
      'actions.refine': 'Refinar',
      'actions.preview': 'Pré-visualizar',
      'actions.download': 'Baixar',
      'actions.share': 'Compartilhar',
      'actions.copy': 'Copiar',
      'actions.copied': 'Copiado',
      'actions.search': 'Pesquisar',
      'actions.viewAll': 'Ver tudo',
      'actions.learnMore': 'Saiba mais',
      'actions.showMore': 'Mostrar mais',
      'actions.showLess': 'Mostrar menos',
      'status.saving': 'Salvando…',
      'status.saved': 'Salvo',
      'status.saveFailed': 'Falha ao salvar',
      'status.loading': 'Carregando…',
      'status.generating': 'Gerando…',
      'status.unsavedChanges': 'Alterações não salvas',
      'status.processing': 'Processando…',
      'status.ready': 'Pronto',
      'status.failed': 'Falhou',
      'status.empty': 'Ainda não há nada aqui',
      'nav.dashboard': 'Painel',
      'nav.projects': 'Projetos',
      'nav.production': 'Production Stage',
      'nav.startProject': 'Iniciar projeto',
      'nav.settings': 'Configurações',
      'nav.help': 'Ajuda',
      'nav.profile': 'Perfil',
      'nav.signIn': 'Entrar',
      'nav.signOut': 'Sair',
      'nav.getStarted': 'Começar',
      'language.interfaceLanguage': 'Idioma da interface',
      'language.storyLanguage': 'Idioma da história',
      'language.deliveryLanguages': 'Idiomas de entrega',
      'language.yourWording': 'Sua redação',
      'language.viewOriginal': 'Ver original',
      'language.hideOriginal': 'Ocultar original',
      'language.translating': 'Traduzindo…',
      'language.englishRequired': 'Inglês obrigatório',
      'language.notTranslated': 'Não traduzido',
      'errors.tooLong': 'Este texto é muito longo.',
    },
    dashboard: {
      'home.noProjects': 'Ainda não há projetos.',
      'projects.empty': 'Ainda não há projetos.',
      'home.startProject': 'Iniciar projeto',
    },
    series: {
      'studio.empty': 'Ainda não há séries',
      'detail.episodes': 'Episódios',
      'detail.generateEpisodes': 'Gerar episódios',
      'fields.setting': 'Cenário',
    },
    blueprint: {
      'tabs.core': 'Essencial',
      'tabs.story': 'História',
      'tabs.tone': 'Tom',
      'tabs.beats': 'Beats',
      'tabs.characters': 'Personagens',
      'tabs.charactersWithCount': 'Personagens ({count})',
      'fields.artStyle': 'Estilo artístico',
      'fields.setting': 'Cenário',
      'fields.protagonist': 'Protagonista',
      'fields.beat': 'Beat {number}',
    },
    production: {
      'studio.script': 'Roteiro',
      'studio.characters': 'Personagens',
      'studio.scenes': 'Cenas',
      'script.generateScript': 'Gerar roteiro',
      'script.regenerateScript': 'Regenerar roteiro',
      'script.reviewScript': 'Revisar roteiro',
      'express.running': 'Executando…',
      'expressAudio.statusMissing': 'Ausente',
      'expressAudio.running': 'Executando…',
      'expressScene.missing': 'Ausente',
      'expressScene.running': 'Executando…',
      'expressGenerateAll.statusMissing': 'Ausente',
      'expressGenerateAll.missing': 'Ausente',
      'expressGenerateAll.running': 'Executando…',
      'segments.addType.tabPrompt': 'Prompt',
      'segments.addType.beatOption': 'Beat {number} ({duration}s)',
      'audio.assets.syncFromScript': 'Sincronizar do roteiro',
      'audio.assets.close': 'Fechar',
      'audio.assets.play': 'Reproduzir',
      'audio.alignment.title': 'Alinhamento de áudio do Beat {number}',
      'audio.syncFromScript': 'Sincronizar do roteiro',
      'audio.close': 'Fechar',
      'audio.alignmentTitle': 'Alinhamento de áudio do Beat {number}',
      'export.stream.beatLabel': 'Beat {number}',
    },
  },
  hi: {
    common: {
      'actions.save': 'सहेजें',
      'actions.saveChanges': 'बदलाव सहेजें',
      'actions.cancel': 'रद्द करें',
      'actions.close': 'बंद करें',
      'actions.apply': 'लागू करें',
      'actions.applyChanges': 'बदलाव लागू करें',
      'actions.delete': 'हटाएँ',
      'actions.remove': 'हटाएँ',
      'actions.edit': 'संपादित करें',
      'actions.add': 'जोड़ें',
      'actions.duplicate': 'डुप्लिकेट करें',
      'actions.retry': 'पुनः प्रयास करें',
      'actions.refresh': 'रीफ़्रेश करें',
      'actions.back': 'वापस',
      'actions.next': 'अगला',
      'actions.done': 'संपन्न',
      'actions.confirm': 'पुष्टि करें',
      'actions.generate': 'जनरेट करें',
      'actions.regenerate': 'पुनः जनरेट करें',
      'actions.refine': 'परिष्कृत करें',
      'actions.preview': 'पूर्वावलोकन',
      'actions.download': 'डाउनलोड करें',
      'actions.share': 'साझा करें',
      'actions.copy': 'कॉपी करें',
      'actions.copied': 'कॉपी किया गया',
      'actions.search': 'खोजें',
      'actions.viewAll': 'सभी देखें',
      'actions.learnMore': 'अधिक जानें',
      'actions.showMore': 'अधिक दिखाएँ',
      'actions.showLess': 'कम दिखाएँ',
      'status.saving': 'सहेजा जा रहा है…',
      'status.saved': 'सहेजा गया',
      'status.saveFailed': 'सहेजने में विफल',
      'status.loading': 'लोड हो रहा है…',
      'status.generating': 'जनरेट हो रहा है…',
      'status.unsavedChanges': 'असहेजे गए बदलाव',
      'status.processing': 'प्रोसेस हो रहा है…',
      'status.ready': 'तैयार',
      'status.failed': 'विफल',
      'status.empty': 'यहाँ अभी कुछ नहीं है',
      'nav.dashboard': 'डैशबोर्ड',
      'nav.projects': 'प्रोजेक्ट्स',
      'nav.startProject': 'प्रोजेक्ट शुरू करें',
      'nav.settings': 'सेटिंग्स',
      'nav.help': 'सहायता',
      'nav.profile': 'प्रोफ़ाइल',
      'nav.signIn': 'साइन इन करें',
      'nav.signOut': 'साइन आउट करें',
      'nav.getStarted': 'शुरू करें',
      'language.yourWording': 'आपके शब्द',
      'language.viewOriginal': 'मूल देखें',
      'language.hideOriginal': 'मूल छिपाएँ',
      'language.translating': 'अनुवाद हो रहा है…',
      'language.englishRequired': 'अंग्रेज़ी आवश्यक है',
      'language.notTranslated': 'अनुवादित नहीं',
      'errors.required': 'यह फ़ील्ड आवश्यक है।',
      'errors.tooLong': 'यह बहुत लंबा है।',
    },
    blueprint: {
      'tabs.core': 'मूल जानकारी',
      'tabs.story': 'कहानी',
      'tabs.tone': 'टोन',
      'tabs.beats': 'बीट्स',
      'tabs.characters': 'पात्र',
      'tabs.charactersWithCount': 'पात्र ({count})',
      'fields.setting': 'परिवेश',
      'fields.protagonist': 'नायक (प्रोटागोनिस्ट)',
      'fields.artStyle': 'कला शैली',
    },
    production: {
      'studio.script': 'पटकथा',
      'studio.characters': 'पात्र',
      'studio.scenes': 'दृश्य',
      'script.generateScript': 'पटकथा जनरेट करें',
      'script.regenerateScript': 'पटकथा पुनः जनरेट करें',
      'audio.assets.close': 'बंद करें',
      'audio.assets.play': 'चलाएँ',
      'audio.close': 'बंद करें',
    },
  },
  'zh-CN': {
    common: {
      'actions.save': '保存',
      'actions.saveChanges': '保存更改',
      'actions.cancel': '取消',
      'actions.close': '关闭',
      'actions.apply': '应用',
      'actions.applyChanges': '应用更改',
      'actions.delete': '删除',
      'actions.remove': '移除',
      'actions.edit': '编辑',
      'actions.add': '添加',
      'actions.duplicate': '复制副本',
      'actions.retry': '重试',
      'actions.refresh': '刷新',
      'actions.back': '返回',
      'actions.next': '下一步',
      'actions.done': '完成',
      'actions.confirm': '确认',
      'actions.generate': '生成',
      'actions.regenerate': '重新生成',
      'actions.refine': '精炼优化',
      'actions.preview': '预览',
      'actions.download': '下载',
      'actions.share': '分享',
      'actions.copy': '复制',
      'actions.copied': '已复制',
      'actions.search': '搜索',
      'actions.viewAll': '查看全部',
      'actions.learnMore': '了解更多',
      'actions.showMore': '展开更多',
      'actions.showLess': '收起',
      'status.saving': '正在保存…',
      'status.saved': '已保存',
      'status.saveFailed': '保存失败',
      'status.loading': '正在加载…',
      'status.generating': '正在生成…',
      'status.unsavedChanges': '有未保存的更改',
      'status.processing': '正在处理…',
      'status.ready': '就绪',
      'status.failed': '失败',
      'status.empty': '暂无内容',
      'nav.dashboard': '控制台',
      'nav.projects': '项目',
      'nav.startProject': '新建项目',
      'nav.settings': '设置',
      'nav.help': '帮助',
      'nav.profile': '个人资料',
      'nav.signIn': '登录',
      'nav.signOut': '退出登录',
      'nav.getStarted': '立即开始',
      'language.yourWording': '您的措辞',
      'language.viewOriginal': '查看原文',
      'language.hideOriginal': '隐藏原文',
      'language.translating': '正在翻译…',
      'language.englishRequired': '需使用英文',
      'language.notTranslated': '不翻译',
      'language.dismiss': '关闭',
    },
    blueprint: {
      'tabs.core': '核心信息',
      'tabs.story': '故事',
      'tabs.tone': '基调',
      'tabs.beats': '故事节拍',
      'tabs.characters': '角色',
      'tabs.charactersWithCount': '角色 ({count})',
      'fields.setting': '背景设定',
      'fields.protagonist': '主角',
      'fields.artStyle': '艺术风格',
    },
    production: {
      'studio.script': '剧本',
      'studio.characters': '角色',
      'studio.scenes': '场景',
      'script.generateScript': '生成剧本',
      'script.regenerateScript': '重新生成剧本',
      'audio.assets.close': '关闭',
      'audio.assets.play': '播放',
      'audio.close': '关闭',
    },
  },
  ar: {
    common: {
      'actions.save': 'حفظ',
      'actions.saveChanges': 'حفظ التغييرات',
      'actions.cancel': 'إلغاء',
      'actions.close': 'إغلاق',
      'actions.apply': 'تطبيق',
      'actions.applyChanges': 'تطبيق التغييرات',
      'actions.delete': 'حذف',
      'actions.remove': 'إزالة',
      'actions.edit': 'تعديل',
      'actions.add': 'إضافة',
      'actions.duplicate': 'تكرار',
      'actions.retry': 'إعادة المحاولة',
      'actions.refresh': 'تحديث',
      'actions.back': 'رجوع',
      'actions.next': 'التالي',
      'actions.done': 'تم',
      'actions.confirm': 'تأكيد',
      'actions.generate': 'توليد',
      'actions.regenerate': 'إعادة التوليد',
      'actions.refine': 'تحسين',
      'actions.preview': 'معاينة',
      'actions.download': 'تنزيل',
      'actions.share': 'مشاركة',
      'actions.copy': 'نسخ',
      'actions.copied': 'تم النسخ',
      'actions.search': 'بحث',
      'actions.viewAll': 'عرض الكل',
      'actions.learnMore': 'معرفة المزيد',
      'actions.showMore': 'عرض المزيد',
      'actions.showLess': 'عرض أقل',
      'status.saving': 'جارٍ الحفظ…',
      'status.saved': 'تم الحفظ',
      'status.saveFailed': 'فشل الحفظ',
      'status.loading': 'جارٍ التحميل…',
      'status.generating': 'جارٍ التوليد…',
      'status.unsavedChanges': 'تغييرات غير محفوظة',
      'status.processing': 'جارٍ المعالجة…',
      'status.ready': 'جاهز',
      'status.failed': 'فشل',
      'status.empty': 'لا يوجد شيء هنا بعد',
      'nav.dashboard': 'لوحة التحكم',
      'nav.projects': 'المشاريع',
      'nav.startProject': 'بدء مشروع',
      'nav.settings': 'الإعدادات',
      'nav.help': 'المساعدة',
      'nav.profile': 'الملف الشخصي',
      'nav.signIn': 'تسجيل الدخول',
      'nav.signOut': 'تسجيل الخروج',
      'nav.getStarted': 'البدء',
      'language.yourWording': 'صياغتك الخاصة',
      'language.viewOriginal': 'عرض الأصل',
      'language.hideOriginal': 'إخفاء الأصل',
      'language.translating': 'جارٍ الترجمة…',
      'language.englishRequired': 'اللغة الإنجليزية مطلوبة',
      'language.notTranslated': 'غير مترجم',
      'language.translatePage': 'ترجمة هذه الصفحة',
    },
    dashboard: {
      'home.noProjects': 'لا توجد مشاريع بعد.',
      'projects.title': 'المشاريع',
      'projects.empty': 'لا توجد مشاريع بعد.',
    },
    settings: {
      'nav.security': 'الأمان',
      'nav.storage': 'التخزين',
      'profile.username': 'اسم المستخدم',
    },
    series: {
      'continuity.characters': 'الشخصيات',
      'continuity.locations': 'المواقع',
      'fields.logline': 'الفكرة المحورية (Logline)',
      'fields.setting': 'بيئة القصة',
      'fields.episodeSynopsis': 'ملخص الحلقة',
    },
    blueprint: {
      'tabs.core': 'المعلومات الأساسية',
      'tabs.story': 'القصة',
      'tabs.tone': 'النبرة والأسلوب',
      'tabs.beats': 'إيقاعات القصة',
      'tabs.characters': 'الشخصيات',
      'tabs.charactersWithCount': 'الشخصيات ({count})',
      'fields.setting': 'بيئة القصة',
      'fields.protagonist': 'البطل الرئيسي',
      'fields.artStyle': 'الأسلوب الفني',
    },
    production: {
      'studio.script': 'السيناريو',
      'studio.characters': 'الشخصيات',
      'studio.scenes': 'المشاهد',
      'script.generateScript': 'توليد السيناريو',
      'script.regenerateScript': 'إعادة توليد السيناريو',
      'audio.assets.close': 'إغلاق',
      'audio.assets.play': 'تشغيل',
      'audio.close': 'إغلاق',
    },
  },
}

/**
 * Disambiguate film/screenwriting terms in English source strings before NMT so
 * "script" is translated as screenplay (not computer shell script) and "Beat {n}"
 * is not translated as the verb "defeat".
 */
function disambiguateStudioSource(value: string): string {
  return value
    .replace(/\bGenerate script\b/g, 'Generate screenplay')
    .replace(/\bgenerate script\b/g, 'generate screenplay')
    .replace(/\bRegenerate script\b/g, 'Regenerate screenplay')
    .replace(/\bregenerate your script\b/g, 'regenerate your screenplay')
    .replace(/\bSync from Script\b/g, 'Sync from Screenplay')
}

function hasTranslatableProseOutsideTokens(englishValue: string): boolean {
  const { protectedText } = protectAll(englishValue)
  const stripped = protectedText
    .replace(/SFAI[A-Z0-9_]+(?:TERM|ZZ)/g, ' ')
    .replace(/[^A-Za-z]+/g, ' ')
    .trim()
  // Require at least two English words (or one word >= 6 chars that isn't a common Romance cognate)
  const words = stripped.split(/\s+/).filter(Boolean)
  return words.length >= 2
}

function hasCorruptedTranslation(value: string | undefined, englishValue: string): boolean {
  if (!value || !value.trim()) return true
  if (/SFAI|SFTERM|\[ترجمة المصطلح:|■|^:$|^--$/i.test(value)) return true
  if (
    value.toLowerCase() === englishValue.toLowerCase() &&
    hasTranslatableProseOutsideTokens(englishValue)
  ) {
    return true
  }
  return false
}
function readExisting(locale: string, surface: AppSurface): Record<string, unknown> {
  const path = localePath(locale, surface)
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

async function translateSurface(
  locale: string,
  surface: AppSurface,
  provider: TranslateProvider,
  full: boolean,
  previousFingerprints: ReturnType<typeof readFingerprints>
): Promise<{ written: number; skipped: number }> {
  const english = readEnglishSurface(surface)
  const flatEnglish = flattenMessages(english)
  const existing = readExisting(locale, surface)
  const flatExisting = flattenMessages(existing)
  const overrides = STUDIO_UI_OVERRIDES[locale]?.[surface] ?? {}

  // Translate a key when it is new to this locale, when its English source
  // changed since the fingerprints were written, or when existing text is corrupted.
  const changed = full ? null : changedKeys(surface, previousFingerprints)
  const pending: Record<string, string> = {}

  for (const [key, value] of Object.entries(flatEnglish)) {
    if (overrides[key] !== undefined) continue
    const preCleaned =
      flatExisting[key] !== undefined ? restoreGlossary(flatExisting[key], new Map()) : undefined
    const missingHere = preCleaned === undefined
    const englishChanged = changed === null || changed.has(key)
    const corrupted = hasCorruptedTranslation(preCleaned, value)
    if (missingHere || englishChanged || corrupted) {
      pending[key] = disambiguateStudioSource(value)
    }
  }

  let translatedFlat: Record<string, string> = {}
  if (Object.keys(pending).length > 0) {
    translatedFlat = await translateFlatMessages(pending, locale, provider)
  }

  const finalFlat: Record<string, string> = {
    ...flatExisting,
    ...translatedFlat,
    ...overrides,
  }
  // Remove any orphan keys absent from English
  let scrubbedCount = 0
  for (const key of Object.keys(finalFlat)) {
    if (flatEnglish[key] === undefined) {
      delete finalFlat[key]
    } else {
      const cleaned = restoreGlossary(finalFlat[key], new Map())
      if (cleaned !== finalFlat[key]) scrubbedCount += 1
      finalFlat[key] = cleaned
    }
  }

  const writtenCount =
    Object.keys(pending).length +
    scrubbedCount +
    Object.entries(overrides).filter(([k, v]) => flatExisting[k] !== v).length
  const skipped = Math.max(0, Object.keys(flatEnglish).length - writtenCount)

  if (writtenCount === 0 && Object.keys(flatExisting).length === Object.keys(flatEnglish).length) {
    return { written: 0, skipped }
  }

  const merged = unflattenMessages(finalFlat)
  mkdirSync(join(APP_MESSAGES_DIR, locale), { recursive: true })
  writeFileSync(localePath(locale, surface), `${JSON.stringify(merged, null, 2)}\n`)

  return { written: writtenCount, skipped }
}

async function main() {
  const provider = (arg('provider') as TranslateProvider) || 'auto'
  const full = process.argv.includes('--full')

  const requestedLocales = arg('locales')?.split(',').map((value) => value.trim())
  const locales = (requestedLocales ?? LOCALES).filter(
    (locale) => locale !== DEFAULT_LOCALE && LOCALES.includes(locale)
  )

  const requestedSurfaces = arg('surfaces')?.split(',').map((value) => value.trim())
  const surfaces = (requestedSurfaces ?? APP_SURFACES).filter((surface): surface is AppSurface =>
    (APP_SURFACES as readonly string[]).includes(surface)
  )

  const previousFingerprints = full ? null : readFingerprints()
  if (!full && !previousFingerprints) {
    console.log('No fingerprints found — treating this as a full run.')
  }

  console.log(
    `Translating ${surfaces.length} surfaces into ${locales.length} locales (provider=${provider}, mode=${full ? 'full' : 'incremental'})`
  )

  let totalWritten = 0
  let totalFailedSurfaces = 0

  for (const locale of locales) {
    let localeWritten = 0
    let localeSkipped = 0

    for (const surface of surfaces) {
      try {
        const { written, skipped } = await translateSurface(
          locale,
          surface,
          provider,
          full,
          previousFingerprints
        )
        localeWritten += written
        localeSkipped += skipped
      } catch (error) {
        totalFailedSurfaces += 1
        console.warn(`  ${locale}/${surface}: ${(error as Error).message}`)
      }
    }

    totalWritten += localeWritten
    console.log(
      `  ${locale}: ${localeWritten} translated, ${localeSkipped} already current`
    )
  }

  // Only advance the fingerprints once every locale has caught up without errors,
  // so an aborted run does not mark changed keys as done.
  if (totalFailedSurfaces === 0 && (totalWritten > 0 || full)) {
    writeFileSync(FINGERPRINT_PATH, `${JSON.stringify(buildFingerprints(), null, 2)}\n`)
    console.log('Updated messages/app/_fingerprints.json')
  }

  console.log(`Done — ${totalWritten} keys translated`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
