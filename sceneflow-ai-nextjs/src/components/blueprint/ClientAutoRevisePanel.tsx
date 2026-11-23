'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  Share2,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import type {
  BlueprintClientClarificationDraft,
  BlueprintGuestFeedbackItem,
  BlueprintShareSettings,
} from '@/lib/blueprint/shareTypes'
import type { SharedBlueprintARSnapshot } from '@/lib/blueprint/sanitizeShareAR'
import {
  getPortalLocaleLabel,
  getSpeechLangForPortalLocale,
  type ClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import { getLocaleDirection } from '@/i18n/locale'

interface AutoReviseUiStrings {
  badge: string
  heading: string
  subtitle: string
  livingDraftHint: string
  placeholder: string
  clarifyBtn: string
  clarifyingBtn: string
  confirmHeading: string
  applyBtn: string
  applyingBtn: string
  editNoteBtn: string
  runArBtn: string
  runningArBtn: string
  revisionsBadge: (used: number, max: number) => string
  arBadge: (used: number, max: number) => string
  updatedToast: string
  arUpdatedToast: string
  shareFamilyBtn: string
  shareFamilyCopied: string
  shareFamilyHint: string
  triageHeading: string
  triageSubtitle: string
  triageIncludeLabel: string
  triageDismissBtn: string
  arSelectHeading: string
  packUpsellHeading: string
  packUpsellBody: (revs: number, ar: number, price: number) => string
  packUpsellBtn: (revs: number, price: number) => string
  packUnlockingBtn: string
  packUnlockedToast: string
}

const AUTO_REVISE_COPY: Record<ClientPortalLocale, AutoReviseUiStrings> = {
  en: {
    badge: 'Director Blueprint Portal • Self-Serve AI Studio',
    heading: 'Refine Your Living Blueprint & Storyboards Automatically',
    subtitle:
      'Listen, review your Draft Blueprint, share a comment-only link with family or teammates, and apply your curated updates in one clean AI iteration.',
    livingDraftHint:
      'You are in control: family/team comments arrive below for your approval before any iteration is used.',
    placeholder:
      'Type or tap the mic — e.g., Add my college baseball years and our 1998 marriage in Chicago, include Uncle Marcus in Chapter 3…',
    clarifyBtn: 'Preview AI-Filtered Changes',
    clarifyingBtn: 'Filtering & Clarifying…',
    confirmHeading: 'Confirm Your Blueprint Revision:',
    applyBtn: 'Confirm & Auto-Update Blueprint',
    applyingBtn: 'Updating Blueprint, Storyboards & Audio…',
    editNoteBtn: 'Edit Note',
    runArBtn: 'Run Audience Resonance Pass',
    runningArBtn: 'Scoring Audience Resonance…',
    revisionsBadge: (u, m) => `Blueprint Revisions: ${u} / ${m} used`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} passes`,
    updatedToast: 'Blueprint, storyboards & narration updated! Check your email for the updated link.',
    arUpdatedToast: 'Audience Resonance score updated and emailed!',
    shareFamilyBtn: 'Share Comment-Only Link with Family / Team',
    shareFamilyCopied: 'Comment-only link copied! Anyone with it can listen & comment, while only you can revise or approve.',
    shareFamilyHint: 'Comment-only link: guests can listen & leave notes for your review without editing or approving.',
    triageHeading: 'Family & Team Comments to Filter',
    triageSubtitle: 'Check the notes you want included in your next Blueprint revision, or dismiss any you prefer to skip.',
    triageIncludeLabel: 'Include in next revision',
    triageDismissBtn: 'Dismiss',
    arSelectHeading: 'Optional: Check Audience Resonance Improvements to Bundle',
    packUpsellHeading: 'Need More Blueprint Iterations?',
    packUpsellBody: (revs, ar, price) =>
      `Unlock +${revs} additional AI Blueprint revisions & +${ar} Audience Resonance passes ($${price}) to keep refining before approving for production.`,
    packUpsellBtn: (revs, price) => `Add +${revs} Iterations ($${price})`,
    packUnlockingBtn: 'Unlocking Extra Iterations…',
    packUnlockedToast: 'Extra Blueprint iterations unlocked! You can keep refining right away.',
  },
  es: {
    badge: 'Portal Director de Blueprint • Estudio IA Autogestionado',
    heading: 'Refina tu Blueprint y Storyboards Automáticamente',
    subtitle:
      'Escucha tu borrador, comparte un enlace de solo comentarios con familia o equipo y aplica los cambios aprobados en una sola iteración de IA.',
    livingDraftHint:
      'Tú tienes el control: los comentarios de invitados llegan aquí para que los filtres antes de usar una iteración.',
    placeholder:
      'Escribe o usa el micrófono — ej.: Añadir mi etapa universitaria, nuestra boda de 1998 y al tío Marcos en el Capítulo 3…',
    clarifyBtn: 'Previsualizar Cambios con IA',
    clarifyingBtn: 'Filtrando y aclarando…',
    confirmHeading: 'Confirma la Revisión de tu Blueprint:',
    applyBtn: 'Confirmar y Actualizar Blueprint',
    applyingBtn: 'Actualizando Blueprint, Storyboards y Audio…',
    editNoteBtn: 'Editar Nota',
    runArBtn: 'Ejecutar Pase Audience Resonance',
    runningArBtn: 'Evaluando Audience Resonance…',
    revisionsBadge: (u, m) => `Revisiones de Blueprint: ${u} / ${m}`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} pases`,
    updatedToast: '¡Blueprint, storyboards y audio actualizados!',
    arUpdatedToast: '¡Puntaje Audience Resonance actualizado!',
    shareFamilyBtn: 'Compartir Enlace de Solo Comentarios',
    shareFamilyCopied: '¡Enlace copiado! Invitados pueden escuchar y comentar; solo tú puedes editar o aprobar.',
    shareFamilyHint: 'Enlace seguro: tus invitados comentan sin editar ni aprobar.',
    triageHeading: 'Comentarios de Familia / Equipo por Filtrar',
    triageSubtitle: 'Selecciona qué notas incluir en tu próxima revisión de IA o descarta las que no apliquen.',
    triageIncludeLabel: 'Incluir en la próxima revisión',
    triageDismissBtn: 'Descartar',
    arSelectHeading: 'Opcional: Incluir Sugerencias de Audience Resonance',
    packUpsellHeading: '¿Necesitas Más Iteraciones de Blueprint?',
    packUpsellBody: (revs, ar, price) =>
      `Desbloquea +${revs} revisiones de IA y +${ar} pases de Audience Resonance ($${price}) para seguir perfeccionando antes de aprobar.`,
    packUpsellBtn: (revs, price) => `Añadir +${revs} Iteraciones ($${price})`,
    packUnlockingBtn: 'Activando iteraciones extra…',
    packUnlockedToast: '¡Iteraciones extra desbloqueadas!',
  },
  pt: {
    badge: 'Portal Diretor de Blueprint • Estúdio IA',
    heading: 'Refine Seu Blueprint e Storyboards Automaticamente',
    subtitle:
      'Ouça seu rascunho, compartilhe um link apenas para comentários com família ou equipe e aplique suas notas filtradas em uma iteração.',
    livingDraftHint:
      'Você está no controle: comentários de convidados aparecem abaixo para sua aprovação antes de usar qualquer iteração.',
    placeholder:
      'Digite ou use o microfone — ex.: Incluir nosso casamento em 1998 e meu tio Marcos no Capítulo 3…',
    clarifyBtn: 'Pré-visualizar Ajustes com IA',
    clarifyingBtn: 'Filtrando e esclarecendo…',
    confirmHeading: 'Confirme a Revisão do Seu Blueprint:',
    applyBtn: 'Confirmar e Atualizar Blueprint',
    applyingBtn: 'Atualizando Blueprint, Storyboards e Áudio…',
    editNoteBtn: 'Editar Nota',
    runArBtn: 'Executar Passe Audience Resonance',
    runningArBtn: 'Calculando Audience Resonance…',
    revisionsBadge: (u, m) => `Revisões do Blueprint: ${u} / ${m}`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} passes`,
    updatedToast: 'Blueprint, storyboards e áudio atualizados!',
    arUpdatedToast: 'Audience Resonance atualizado!',
    shareFamilyBtn: 'Compartilhar Link Apenas para Comentários',
    shareFamilyCopied: 'Link copiado! Convidados podem ouvir e comentar; só você revisa ou aprova.',
    shareFamilyHint: 'Link seguro: convidados comentam sem alterar ou aprovar.',
    triageHeading: 'Comentários de Família / Equipe para Filtrar',
    triageSubtitle: 'Marque as notas que deseja incluir na próxima revisão ou descarte as demais.',
    triageIncludeLabel: 'Incluir na próxima revisão',
    triageDismissBtn: 'Dispensar',
    arSelectHeading: 'Opcional: Incluir Sugestões de Audience Resonance',
    packUpsellHeading: 'Precisa de Mais Iterações?',
    packUpsellBody: (revs, ar, price) =>
      `Desbloqueie +${revs} revisões de IA e +${ar} passes de Audience Resonance ($${price}) antes de aprovar para produção.`,
    packUpsellBtn: (revs, price) => `Adicionar +${revs} Iterações ($${price})`,
    packUnlockingBtn: 'Desbloqueando iterações extras…',
    packUnlockedToast: 'Iterações extras desbloqueadas!',
  },
  hi: {
    badge: 'डायरेक्टर Blueprint पोर्टल • स्वचालित AI स्टूडियो',
    heading: 'अपना Blueprint और स्टोरीबोर्ड स्वचालित रूप से परिष्कृत करें',
    subtitle:
      'अपना ड्राफ्ट सुनें, परिवार या टीम के साथ केवल-टिप्पणी लिंक साझा करें और अपने चुने हुए बदलावों को एक AI संशोधन में लागू करें।',
    livingDraftHint:
      'नियंत्रण आपके हाथ में है: परिवार के सुझाव यहाँ दिखाई देंगे और आपकी मंजूरी के बाद ही लागू होंगे।',
    placeholder:
      'लिखें या माइक पर बोलें — उदाहरण: अध्याय 3 में 1998 की शादी और कॉलेज खेल उपलब्धियाँ जोड़ें…',
    clarifyBtn: 'AI-फ़िल्टर्ड बदलाव देखें',
    clarifyingBtn: 'स्पष्ट किया जा रहा है…',
    confirmHeading: 'अपने Blueprint संशोधन की पुष्टि करें:',
    applyBtn: 'पुष्टि करें और Blueprint अपडेट करें',
    applyingBtn: 'Blueprint, स्टोरीबोर्ड और ऑडियो अपडेट हो रहे हैं…',
    editNoteBtn: 'नोट संपादित करें',
    runArBtn: 'Audience Resonance पास चलाएँ',
    runningArBtn: 'Audience Resonance स्कोर हो रहा है…',
    revisionsBadge: (u, m) => `Blueprint संशोधन: ${u} / ${m} प्रयुक्त`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} पास`,
    updatedToast: 'Blueprint, स्टोरीबोर्ड और ऑडियो अपडेट हो गए!',
    arUpdatedToast: 'Audience Resonance स्कोर अपडेट हो गया!',
    shareFamilyBtn: 'परिवार / टीम के लिए टिप्पणी-मात्र लिंक कॉपी करें',
    shareFamilyCopied: 'टिप्पणी-मात्र लिंक कॉपी हो गया! वे केवल सुन और सुझाव दे सकते हैं।',
    shareFamilyHint: 'अतिथि केवल सुझाव भेज सकते हैं; बदलाव और मंजूरी केवल आपके नियंत्रण में हैं।',
    triageHeading: 'परिवार / टीम की टिप्पणियाँ फ़िल्टर करें',
    triageSubtitle: 'अगले संशोधन में शामिल करने के लिए पसंदीदा टिप्पणियाँ चुनें।',
    triageIncludeLabel: 'अगले संशोधन में शामिल करें',
    triageDismissBtn: 'हटाएँ',
    arSelectHeading: 'वैकल्पिक: Audience Resonance सुझाव चुनें',
    packUpsellHeading: 'क्या आपको और Blueprint संशोधन चाहिए?',
    packUpsellBody: (revs, ar, price) =>
      `अतिरिक्त +${revs} AI संशोधन और +${ar} Audience Resonance पास ($${price}) जोड़ें।`,
    packUpsellBtn: (revs, price) => `+${revs} संशोधन जोड़ें ($${price})`,
    packUnlockingBtn: 'अतिरिक्त संशोधन जोड़े जा रहे हैं…',
    packUnlockedToast: 'अतिरिक्त Blueprint संशोधन सक्रिय हो गए!',
  },
  'zh-CN': {
    badge: '导演 Blueprint 门户 • 全自动 AI 工作台',
    heading: '自助优化您的动态 Blueprint 与章节分镜',
    subtitle:
      '试听初稿、向家人或团队分享“仅评论链接”，由您筛选所有意见后一键提交 AI 迭代更新。',
    livingDraftHint:
      '全程由您掌控：家人/团队的留言会先汇总在下方待您筛选，不会消耗迭代次数或误批准。',
    placeholder:
      '输入或点击麦克风口述修改意见——例如：在第 3 章补充大学棒球队经历和 1998 年婚礼，并加入马库斯叔叔…',
    clarifyBtn: '预览 AI 提炼的修改方案',
    clarifyingBtn: 'AI 正在提炼确认…',
    confirmHeading: '请确认您的 Blueprint 修改方案：',
    applyBtn: '确认并自动更新 Blueprint',
    applyingBtn: '正在更新 Blueprint、分镜与配音…',
    editNoteBtn: '返回修改意见',
    runArBtn: '运行 Audience Resonance 评估',
    runningArBtn: '正在评估 Audience Resonance…',
    revisionsBadge: (u, m) => `Blueprint 迭代：已用 ${u} / ${m} 次`,
    arBadge: (u, m) => `Audience Resonance：已用 ${u} / ${m} 次`,
    updatedToast: 'Blueprint、分镜与旁白已自动更新！',
    arUpdatedToast: 'Audience Resonance 评分已更新！',
    shareFamilyBtn: '分享“仅评论”链接给家人/团队',
    shareFamilyCopied: '仅评论链接已复制！访客可试听并留言，但只有您能修改或批准。',
    shareFamilyHint: '仅评论链接：访客可试听并提交建议，无法消耗迭代或批准。',
    triageHeading: '待筛选的家人 / 团队意见',
    triageSubtitle: '勾选您认可的建议并入下一次 AI 迭代，或忽略不需要的留言。',
    triageIncludeLabel: '纳入本次修改',
    triageDismissBtn: '忽略',
    arSelectHeading: '可选：勾选要合并的 Audience Resonance 建议',
    packUpsellHeading: '需要更多 Blueprint 迭代次数？',
    packUpsellBody: (revs, ar, price) =>
      `解锁 +${revs} 次 AI 迭代与 +${ar} 次 Audience Resonance 评估（$${price}），继续打磨直至满意再批准制作。`,
    packUpsellBtn: (revs, price) => `加购 +${revs} 次迭代（$${price}）`,
    packUnlockingBtn: '正在解锁更多迭代…',
    packUnlockedToast: '额外 Blueprint 迭代次数已解锁！',
  },
  ar: {
    badge: 'بوابة المخرج للـ Blueprint • استوديو ذكاء اصطناعي ذاتي',
    heading: 'طوّر مخطط القصة ولوحات المشاهد تلقائياً',
    subtitle:
      'استمع إلى المسودة، وشارك رابط تعليقات فقط مع العائلة أو الفريق، ثم اختر الملاحظات التي تريد دمجها في جولة تعديل واحدة.',
    livingDraftHint:
      'التحكم بيدك بالكامل: تصل تعليقات الضيوف أدناه لتصفيتها قبل استخدام أي جولة تعديل.',
    placeholder:
      'اكتب أو اضغط الميكروفون — مثال: أضف سنوات الرياضة الجامعية وزواجنا عام 1998 والعم ماركوس في الفصل 3…',
    clarifyBtn: 'معاينة التعديلات المفلترة ذكياً',
    clarifyingBtn: 'جارٍ التصفية والتوضيح…',
    confirmHeading: 'تأكيد تعديلات الـ Blueprint الخاصة بك:',
    applyBtn: 'تأكيد وتحديث الـ Blueprint تلقائياً',
    applyingBtn: 'جارٍ تحديث المخطط واللوحات والصوت…',
    editNoteBtn: 'تعديل الملاحظة',
    runArBtn: 'تشغيل جولة Audience Resonance',
    runningArBtn: 'جارٍ تقييم Audience Resonance…',
    revisionsBadge: (u, m) => `تعديلات Blueprint: ${u} من ${m}`,
    arBadge: (u, m) => `Audience Resonance: ${u} من ${m}`,
    updatedToast: 'تم تحديث الـ Blueprint واللوحات والصوت!',
    arUpdatedToast: 'تم تحديث تقييم Audience Resonance!',
    shareFamilyBtn: 'نسخ رابط التعليقات فقط للعائلة / الفريق',
    shareFamilyCopied: 'تم نسخ رابط التعليقات! يمكن للضيوف الاستماع والتعليق بينما التعديل والموافقة لك فقط.',
    shareFamilyHint: 'رابط آمن: يتيح للضيوف التعليق دون استهلاك التعديلات أو الموافقة.',
    triageHeading: 'تعليقات العائلة / الفريق للتصفية',
    triageSubtitle: 'حدد الملاحظات التي تريد تضمينها في التعديل القادم أو تجاهل ما لا يناسبك.',
    triageIncludeLabel: 'تضمين في التعديل القادم',
    triageDismissBtn: 'تجاهل',
    arSelectHeading: 'اختياري: تحديد توصيات Audience Resonance',
    packUpsellHeading: 'هل تحتاج إلى جولات تعديل إضافية؟',
    packUpsellBody: (revs, ar, price) =>
      `أضف +${revs} تعديلات ذكاء اصطناعي و +${ar} جولات Audience Resonance ($${price}) لمواصلة التطوير قبل الموافقة.`,
    packUpsellBtn: (revs, price) => `إضافة +${revs} جولات ($${price})`,
    packUnlockingBtn: 'جارٍ تفعيل الجولات الإضافية…',
    packUnlockedToast: 'تمت إضافة جولات Blueprint بنجاح!',
  },
  th: {
    badge: 'พอร์ทัลผู้กำกับ Blueprint • สตูดิโอ AI อัตโนมัติ',
    heading: 'ปรับปรุง Blueprint และภาพสตอรี่บอร์ดของคุณได้ทันที',
    subtitle:
      'ฟังฉบับร่าง แชร์ลิงก์สำหรับคอมเมนต์เท่านั้นให้ครอบครัวหรือทีม แล้วคัดเลือกข้อเสนอแนะเพื่ออัปเดตด้วย AI ในครั้งเดียว',
    livingDraftHint:
      'คุณควบคุมทั้งหมด: คอมเมนต์จากครอบครัว/ทีมจะมาอยู่ที่นี่ให้คุณคัดกรองก่อนใช้รอบแก้ไข',
    placeholder:
      'พิมพ์หรือแตะไมโครโฟนเพื่อพูด — เช่น เพิ่มช่วงเล่นกีฬาในมหาวิทยาลัย งานแต่งปี 1998 และลุงมาร์คัสในบทที่ 3…',
    clarifyBtn: 'ดูสรุปการแก้ไขจาก AI',
    clarifyingBtn: 'กำลังกรองและสรุปคำขอ…',
    confirmHeading: 'ยืนยันรายการแก้ไข Blueprint ของคุณ:',
    applyBtn: 'ยืนยันและอัปเดต Blueprint อัตโนมัติ',
    applyingBtn: 'กำลังอัปเดต Blueprint สตอรี่บอร์ด และเสียงบรรยาย…',
    editNoteBtn: 'แก้ไขข้อความ',
    runArBtn: 'รันวิเคราะห์ Audience Resonance',
    runningArBtn: 'กำลังประเมิน Audience Resonance…',
    revisionsBadge: (u, m) => `รอบแก้ไข Blueprint: ${u} / ${m}`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} รอบ`,
    updatedToast: 'อัปเดต Blueprint สตอรี่บอร์ด และเสียงบรรยายเรียบร้อย!',
    arUpdatedToast: 'อัปเดตคะแนน Audience Resonance เรียบร้อย!',
    shareFamilyBtn: 'แชร์ลิงก์คอมเมนต์เท่านั้นให้ครอบครัว / ทีม',
    shareFamilyCopied: 'คัดลอกลิงก์แล้ว! แขกสามารถฟังและคอมเมนต์ได้ แต่มีเพียงคุณที่แก้ไขหรืออนุมัติได้',
    shareFamilyHint: 'ลิงก์ปลอดภัย: แขกฟังและฝากโน้ตให้คุณคัดกรองได้โดยไม่หักรอบแก้ไข',
    triageHeading: 'คอมเมนต์จากครอบครัว / ทีมสำหรับคัดกรอง',
    triageSubtitle: 'ติ๊กเลือกโน้ตที่ต้องการรวมในรอบแก้ไขถัดไป หรือกดซ่อนโน้ตที่ไม่ใช้',
    triageIncludeLabel: 'รวมในรอบแก้ไขถัดไป',
    triageDismissBtn: 'ไม่ใช้',
    arSelectHeading: 'ทางเลือก: เลือกคำแนะนำ Audience Resonance ที่ต้องการรวมด้วย',
    packUpsellHeading: 'ต้องการรอบแก้ไข Blueprint เพิ่มเติมไหม?',
    packUpsellBody: (revs, ar, price) =>
      `ปลดล็อกเพิ่ม +${revs} รอบแก้ไข AI และ +${ar} รอบ Audience Resonance ($${price}) เพื่อปรับจนสมบูรณ์ก่อนอนุมัติผลิตจริง`,
    packUpsellBtn: (revs, price) => `เพิ่ม +${revs} รอบแก้ไข ($${price})`,
    packUnlockingBtn: 'กำลังปลดล็อกรอบแก้ไขเพิ่ม…',
    packUnlockedToast: 'ปลดล็อกรอบแก้ไข Blueprint เพิ่มเรียบร้อย!',
  },
}

export function ClientAutoRevisePanel(props: {
  token: string
  locale: ClientPortalLocale
  shareSettings: BlueprintShareSettings
  initialClarification?: BlueprintClientClarificationDraft | null
  arSnapshot?: SharedBlueprintARSnapshot | null
  guestShareUrl?: string | null
  onBlueprintUpdated: () => Promise<unknown>
}) {
  const {
    token,
    locale,
    shareSettings,
    initialClarification,
    arSnapshot,
    guestShareUrl: initialGuestShareUrl,
    onBlueprintUpdated,
  } = props
  const copy = AUTO_REVISE_COPY[locale] ?? AUTO_REVISE_COPY.en

  const roundsUsed = Number(shareSettings.roundsUsed ?? 0)
  const maxRounds = Number(shareSettings.maxFeedbackRounds ?? 4)
  const arUsed = Number(shareSettings.arIterationsUsed ?? 0)
  const maxAr = Number(shareSettings.maxArIterations ?? 3)
  const packRevs = Number(shareSettings.iterationPackRevisions ?? 3)
  const packAr = Number(shareSettings.iterationPackArPasses ?? 2)
  const packPrice = Number(shareSettings.iterationPackPriceUsd ?? 19)

  const [feedbackText, setFeedbackText] = useState('')
  const [clarification, setClarification] = useState<BlueprintClientClarificationDraft | null>(
    initialClarification ?? null
  )
  const [clarifying, setClarifying] = useState(false)
  const [applying, setApplying] = useState(false)
  const [runningAr, setRunningAr] = useState(false)
  const [purchasingPack, setPurchasingPack] = useState(false)

  // Family / Team comment-only link + triage queue
  const [guestShareUrl, setGuestShareUrl] = useState<string | null>(initialGuestShareUrl ?? null)
  const [copyingGuestLink, setCopyingGuestLink] = useState(false)
  const [copiedGuestLink, setCopiedGuestLink] = useState(false)
  const [guestItems, setGuestItems] = useState<BlueprintGuestFeedbackItem[]>([])
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState<string[]>([])
  const [selectedRecIds, setSelectedRecIds] = useState<string[]>([])
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  const canReviseMore = roundsUsed < maxRounds
  const canRunArMore = arUsed < maxAr
  const pendingGuestItems = guestItems.filter((item) => item.status === 'pending')
  const arRecommendations = arSnapshot?.analysis?.recommendations || []

  useEffect(() => {
    if (initialGuestShareUrl) setGuestShareUrl(initialGuestShareUrl)
  }, [initialGuestShareUrl])

  useEffect(() => {
    setClarification(initialClarification ?? null)
  }, [initialClarification])

  const loadGuestFeedback = useCallback(async () => {
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/auto-revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_guest_feedback' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success && Array.isArray(data.items)) {
        setGuestItems(data.items)
      }
    } catch {
      /* non-fatal */
    }
  }, [token])

  useEffect(() => {
    void loadGuestFeedback()
  }, [loadGuestFeedback])

  const handleCopyGuestShareLink = async () => {
    setCopyingGuestLink(true)
    try {
      let url = guestShareUrl
      if (!url) {
        const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/auto-revise`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ensure_guest_link', locale }),
        })
        const data = await res.json()
        if (!res.ok || !data.success || !data.guestShareUrl) {
          toast.error(data.error || 'Could not generate comment-only link')
          return
        }
        url = data.guestShareUrl
        setGuestShareUrl(url)
      }
      if (url && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      }
      setCopiedGuestLink(true)
      toast.success(copy.shareFamilyCopied)
      setTimeout(() => setCopiedGuestLink(false), 2600)
    } catch {
      toast.error('Could not copy guest link')
    } finally {
      setCopyingGuestLink(false)
    }
  }

  const toggleFeedbackSelection = (id: string) => {
    setSelectedFeedbackIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleRecSelection = (id: string) => {
    setSelectedRecIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleDismissGuestNote = async (feedbackId: string) => {
    setDismissingId(feedbackId)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/auto-revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_guest_feedback', feedbackId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setGuestItems((prev) =>
          prev.map((item) => (item.id === feedbackId ? { ...item, status: 'dismissed' } : item))
        )
        setSelectedFeedbackIds((prev) => prev.filter((id) => id !== feedbackId))
      }
    } catch {
      toast.error('Could not dismiss note')
    } finally {
      setDismissingId(null)
    }
  }

  const hasAnyRevisionInput =
    feedbackText.trim().length > 0 ||
    selectedFeedbackIds.length > 0 ||
    selectedRecIds.length > 0

  const handleClarify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasAnyRevisionInput || clarifying || applying || !canReviseMore) return
    setClarifying(true)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/auto-revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clarify',
          feedback: feedbackText.trim(),
          selectedFeedbackIds,
          selectedRecommendationIds: selectedRecIds,
          locale,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Unable to clarify feedback')
        return
      }
      setClarification(data.clarification)
    } catch {
      toast.error('Network error while clarifying feedback')
    } finally {
      setClarifying(false)
    }
  }

  const handleApplyConfirmed = async () => {
    if (!clarification || applying) return
    setApplying(true)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/auto-revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          selectedFeedbackIds: clarification.selectedFeedbackIds || selectedFeedbackIds,
          selectedRecommendationIds:
            clarification.selectedRecommendationIds || selectedRecIds,
          locale,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Unable to update Blueprint')
        return
      }
      setClarification(null)
      setFeedbackText('')
      setSelectedFeedbackIds([])
      setSelectedRecIds([])
      await Promise.all([onBlueprintUpdated(), loadGuestFeedback()])
      toast.success(copy.updatedToast)
    } catch {
      toast.error('Network error while updating Blueprint')
    } finally {
      setApplying(false)
    }
  }

  const handleRunAr = async () => {
    if (runningAr || !canRunArMore) return
    setRunningAr(true)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/auto-revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_ar',
          locale,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Unable to run Audience Resonance')
        return
      }
      await onBlueprintUpdated()
      toast.success(copy.arUpdatedToast)
    } catch {
      toast.error('Network error while scoring Audience Resonance')
    } finally {
      setRunningAr(false)
    }
  }

  const handlePurchaseIterationPack = async () => {
    if (shareSettings.iterationPackCheckoutUrl) {
      window.open(shareSettings.iterationPackCheckoutUrl, '_blank', 'noopener,noreferrer')
      return
    }
    if (purchasingPack) return
    setPurchasingPack(true)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/auto-revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase_iteration_pack',
          packsCount: 1,
          locale,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Unable to unlock extra iterations')
        return
      }
      await onBlueprintUpdated()
      toast.success(copy.packUnlockedToast)
    } catch {
      toast.error('Network error while unlocking extra iterations')
    } finally {
      setPurchasingPack(false)
    }
  }

  return (
    <section
      dir={getLocaleDirection(locale)}
      className="rounded-2xl border border-emerald-500/35 bg-gradient-to-b from-slate-900/95 via-slate-950 to-emerald-950/20 p-5 shadow-xl space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {copy.badge}
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-emerald-200">
            {copy.revisionsBadge(roundsUsed, maxRounds)}
          </span>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-0.5 text-cyan-200">
            {copy.arBadge(arUsed, maxAr)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h2 className="text-lg font-bold text-white">{copy.heading}</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">{copy.subtitle}</p>
          <p className="mt-1 text-[11px] text-emerald-300/85">{copy.livingDraftHint}</p>
        </div>

        {/* Share Comment-Only Link with Family / Team */}
        <div className="flex flex-col items-start sm:items-end gap-1">
          <button
            type="button"
            disabled={copyingGuestLink}
            onClick={handleCopyGuestShareLink}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-400/45 bg-purple-500/15 hover:bg-purple-500/25 px-3.5 py-2 text-xs font-bold text-purple-200 transition cursor-pointer"
          >
            {copyingGuestLink ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : copiedGuestLink ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            <span>{copy.shareFamilyBtn}</span>
            {!copiedGuestLink && <Copy className="h-3 w-3 opacity-75" />}
          </button>
          <span className="text-[10px] text-slate-400 max-w-xs sm:text-right">
            {copy.shareFamilyHint}
          </span>
        </div>
      </div>

      {/* Primary Customer Triage Inbox for Family / Stakeholder Comments */}
      {pendingGuestItems.length > 0 && (
        <div className="rounded-xl border border-purple-500/35 bg-purple-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {copy.triageHeading} ({pendingGuestItems.length})
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">{copy.triageSubtitle}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {pendingGuestItems.map((item) => {
              const checked = selectedFeedbackIds.includes(item.id)
              const sectionLines = Object.entries(item.sections || {})
                .map(([sec, val]) => {
                  const detail = [val?.concerns, val?.suggestions].filter(Boolean).join(' • ')
                  return detail ? `${sec}: ${detail}` : ''
                })
                .filter(Boolean)
              const previewText =
                item.freeformNotes?.trim() ||
                sectionLines.join(' | ') ||
                (item.overallScore ? `Rated ${item.overallScore}/5` : 'Feedback note')
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 transition ${
                    checked
                      ? 'border-emerald-400/60 bg-emerald-950/30'
                      : 'border-slate-800 bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeedbackSelection(item.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-600 accent-emerald-500"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-white flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-purple-300" />
                            {item.reviewerName}
                          </span>
                          {item.overallScore ? (
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-200">
                              {item.overallScore}/5
                            </span>
                          ) : null}
                          <span className="text-[10px] text-emerald-300/90 font-medium">
                            {checked ? `✓ ${copy.triageIncludeLabel}` : ''}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-200 leading-relaxed break-words">
                          {previewText}
                        </p>
                      </div>
                    </label>
                    <button
                      type="button"
                      disabled={dismissingId === item.id}
                      onClick={() => void handleDismissGuestNote(item.id)}
                      title={copy.triageDismissBtn}
                      className="shrink-0 rounded-lg border border-slate-800 hover:border-red-500/40 bg-slate-900 px-2 py-1 text-[10px] text-slate-400 hover:text-red-300 inline-flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      {copy.triageDismissBtn}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {clarification ? (
        <div className="rounded-xl border border-emerald-400/45 bg-emerald-950/30 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            {copy.confirmHeading}
          </p>
          <p className="text-sm font-medium text-white leading-relaxed">
            {clarification.clarifiedSummary}
          </p>
          {clarification.proposedChanges.length > 0 && (
            <ul className="space-y-1 text-xs text-emerald-100/90">
              {clarification.proposedChanges.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={applying}
              onClick={handleApplyConfirmed}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 px-4 py-2 text-xs font-extrabold text-slate-950 transition cursor-pointer"
            >
              {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{applying ? copy.applyingBtn : copy.applyBtn}</span>
            </button>
            <button
              type="button"
              disabled={applying}
              onClick={() => setClarification(null)}
              className="rounded-xl border border-slate-700 bg-slate-900 hover:border-slate-500 px-3.5 py-2 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              {copy.editNoteBtn}
            </button>
          </div>
        </div>
      ) : canReviseMore ? (
        <form onSubmit={handleClarify} className="space-y-3">
          {/* 1-Click Audience Resonance Recommendation Checkboxes */}
          {arRecommendations.length > 0 && (
            <div className="rounded-xl border border-cyan-500/25 bg-slate-950/60 p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                {copy.arSelectHeading}
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {arRecommendations.slice(0, 4).map((rec) => {
                  const selected = selectedRecIds.includes(rec.id)
                  return (
                    <label
                      key={rec.id}
                      className={`flex items-start gap-2 rounded-lg border p-2 text-xs cursor-pointer transition ${
                        selected
                          ? 'border-cyan-400/60 bg-cyan-950/35 text-white'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRecSelection(rec.id)}
                        className="mt-0.5 h-3.5 w-3.5 rounded accent-cyan-400"
                      />
                      <span className="leading-snug">
                        <strong className="text-cyan-200">{rec.title}:</strong> {rec.text}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <DictationTextarea
            lang={getSpeechLangForPortalLocale(locale)}
            dir={getLocaleDirection(locale)}
            rows={3}
            value={feedbackText}
            onChange={setFeedbackText}
            listeningHint={`Listening in ${getPortalLocaleLabel(locale)}…`}
            placeholder={copy.placeholder}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="submit"
              disabled={!hasAnyRevisionInput || clarifying}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2 text-xs font-extrabold text-slate-950 transition cursor-pointer"
            >
              {clarifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{clarifying ? copy.clarifyingBtn : copy.clarifyBtn}</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {canRunArMore && (
                <button
                  type="button"
                  disabled={runningAr}
                  onClick={handleRunAr}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/45 bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-cyan-200 transition cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${runningAr ? 'animate-spin' : ''}`} />
                  <span>{runningAr ? copy.runningArBtn : copy.runArBtn}</span>
                </button>
              )}
              {maxRounds - roundsUsed <= 1 && (
                <button
                  type="button"
                  disabled={purchasingPack}
                  onClick={() => void handlePurchaseIterationPack()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/45 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-2 text-xs font-bold text-amber-200 transition cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>{copy.packUpsellBtn(packRevs, packPrice)}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
        /* Self-Serve Extra Iteration Pack Expansion instead of a dead-end wall */
        <div className="rounded-xl border border-amber-400/40 bg-amber-950/25 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-lg">
            <h3 className="text-sm font-bold text-amber-200">{copy.packUpsellHeading}</h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {copy.packUpsellBody(packRevs, packAr, packPrice)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={purchasingPack}
              onClick={() => void handlePurchaseIterationPack()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 px-4 py-2 text-xs font-extrabold text-slate-950 transition cursor-pointer"
            >
              {purchasingPack ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlusCircle className="h-3.5 w-3.5" />
              )}
              <span>
                {purchasingPack ? copy.packUnlockingBtn : copy.packUpsellBtn(packRevs, packPrice)}
              </span>
            </button>
            {canRunArMore && (
              <button
                type="button"
                disabled={runningAr}
                onClick={handleRunAr}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/45 bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-cyan-200 transition cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${runningAr ? 'animate-spin' : ''}`} />
                <span>{runningAr ? copy.runningArBtn : copy.runArBtn}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
