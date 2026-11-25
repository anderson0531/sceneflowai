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
  ja: {
    badge: 'ディレクター Blueprint ポータル • セルフサービス AI スタジオ',
    heading: 'Blueprint と絵コンテを自動でブラッシュアップ',
    subtitle:
      'ドラフトを試聴し、ご家族やチームにコメント専用リンクを共有して、厳選した修正内容を1回のクリーンな AI 反復でまとめて反映できます。',
    livingDraftHint:
      '主導権はあなたにあります：ご家族・チームのコメントは下に届き、あなたが承認するまで修正回数は消費されません。',
    placeholder:
      '入力またはマイクをタップ — 例：大学時代の野球部と1998年のシカゴでの結婚を追加し、第3章にマーカス叔父を入れてください…',
    clarifyBtn: 'AI 整理済みの変更をプレビュー',
    clarifyingBtn: '内容を整理・確認中…',
    confirmHeading: 'Blueprint の修正内容を確認：',
    applyBtn: '確定して Blueprint を自動更新',
    applyingBtn: 'Blueprint・絵コンテ・音声を更新中…',
    editNoteBtn: 'メモを編集',
    runArBtn: 'Audience Resonance 評価を実行',
    runningArBtn: 'Audience Resonance を採点中…',
    revisionsBadge: (u, m) => `Blueprint 修正：${u} / ${m} 回使用`,
    arBadge: (u, m) => `Audience Resonance：${u} / ${m} 回`,
    updatedToast: 'Blueprint・絵コンテ・ナレーションを更新しました！最新リンクはメールをご確認ください。',
    arUpdatedToast: 'Audience Resonance スコアを更新しメール送信しました！',
    shareFamilyBtn: '家族／チームへコメント専用リンクを共有',
    shareFamilyCopied: 'コメント専用リンクをコピーしました！招待相手は試聴とコメントのみ可能で、修正と承認はあなただけが行えます。',
    shareFamilyHint: 'コメント専用リンク：ゲストは編集や承認を行わずに試聴とメモ投稿ができます。',
    triageHeading: '確認待ちの家族・チームコメント',
    triageSubtitle: '次回の Blueprint 修正に含めたいメモにチェックを入れ、不要なものは非表示にしてください。',
    triageIncludeLabel: '次回の修正に含める',
    triageDismissBtn: '見送る',
    arSelectHeading: '任意：取り込みたい Audience Resonance 改善提案を選択',
    packUpsellHeading: 'さらに Blueprint の反復回数が必要ですか？',
    packUpsellBody: (revs, ar, price) =>
      `制作承認の前にさらに磨き上げるため、AI Blueprint 修正 +${revs} 回と Audience Resonance 評価 +${ar} 回（$${price}）を追加できます。`,
    packUpsellBtn: (revs, price) => `+${revs} 回を追加（$${price}）`,
    packUnlockingBtn: '追加回数を解放中…',
    packUnlockedToast: '追加の Blueprint 反復回数が解放されました！すぐに続けて調整できます。',
  },
  ko: {
    badge: '디렉터 Blueprint 포털 • 셀프서비스 AI 스튜디오',
    heading: '라이브 Blueprint와 스토리보드를 자동으로 다듬으세요',
    subtitle:
      '초안 Blueprint를 들어보고, 가족이나 팀과 댓글 전용 링크를 공유한 뒤, 선별한 수정 사항을 한 번의 깔끔한 AI 반복으로 반영하세요.',
    livingDraftHint:
      '모든 결정권은 사용자에게 있습니다. 가족/팀의 의견은 아래에 모여 승인 전까지 반복 횟수를 차감하지 않습니다.',
    placeholder:
      '입력하거나 마이크를 누르세요 — 예: 대학 야구 시절과 1998년 시카고 결혼식을 추가하고 3장에 마커스 삼촌을 넣어 주세요…',
    clarifyBtn: 'AI 정리 변경 사항 미리보기',
    clarifyingBtn: '내용 필터링 및 정리 중…',
    confirmHeading: 'Blueprint 수정 사항 확인:',
    applyBtn: '확인 및 Blueprint 자동 업데이트',
    applyingBtn: 'Blueprint, 스토리보드 및 오디오 업데이트 중…',
    editNoteBtn: '메모 수정',
    runArBtn: 'Audience Resonance 패스 실행',
    runningArBtn: 'Audience Resonance 채점 중…',
    revisionsBadge: (u, m) => `Blueprint 수정: ${u} / ${m}회 사용`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m}회`,
    updatedToast: 'Blueprint, 스토리보드 및 내레이션이 업데이트되었습니다! 이메일에서 최신 링크를 확인해 주세요.',
    arUpdatedToast: 'Audience Resonance 점수가 업데이트되어 이메일로 발송되었습니다!',
    shareFamilyBtn: '가족 / 팀과 댓글 전용 링크 공유',
    shareFamilyCopied: '댓글 전용 링크가 복사되었습니다! 링크를 받은 사람은 듣기와 댓글만 가능하며 수정·승인은 본인만 할 수 있습니다.',
    shareFamilyHint: '댓글 전용 링크: 게스트는 수정이나 승인 없이 듣고 의견만 남길 수 있습니다.',
    triageHeading: '선별할 가족 및 팀 댓글',
    triageSubtitle: '다음 Blueprint 수정에 반영할 메모를 체크하거나 건너뛸 항목을 숨기세요.',
    triageIncludeLabel: '다음 수정에 포함',
    triageDismissBtn: '건너뛰기',
    arSelectHeading: '선택: 함께 반영할 Audience Resonance 개선 제안 체크',
    packUpsellHeading: 'Blueprint 반복 횟수가 더 필요하신가요?',
    packUpsellBody: (revs, ar, price) =>
      `제작 승인 전에 더 완성도를 높이려면 AI Blueprint 수정 +${revs}회 및 Audience Resonance 패스 +${ar}회($${price})를 추가하세요.`,
    packUpsellBtn: (revs, price) => `+${revs}회 추가 ($${price})`,
    packUnlockingBtn: '추가 반복 횟수 잠금 해제 중…',
    packUnlockedToast: '추가 Blueprint 반복 횟수가 해제되었습니다! 바로 계속 다듬을 수 있습니다.',
  },
  de: {
    badge: 'Director Blueprint-Portal • Self-Service-KI-Studio',
    heading: 'Verfeinern Sie Ihr Blueprint & Storyboards automatisch',
    subtitle:
      'Hören Sie Ihren Blueprint-Entwurf an, teilen Sie einen reinen Kommentar-Link mit Familie oder Team und übernehmen Sie Ihre ausgewählten Änderungen in einer sauberen KI-Iteration.',
    livingDraftHint:
      'Sie behalten die volle Kontrolle: Kommentare von Familie oder Team erscheinen unten zur Prüfung, bevor eine Iteration verbraucht wird.',
    placeholder:
      'Tippen oder Mikrofon nutzen — z. B.: Meine College-Baseballjahre und unsere Hochzeit 1998 in Chicago ergänzen, Onkel Marcus in Kapitel 3 aufnehmen…',
    clarifyBtn: 'KI-gefilterte Änderungen prüfen',
    clarifyingBtn: 'Wird gefiltert & geklärt…',
    confirmHeading: 'Bestätigen Sie Ihre Blueprint-Revision:',
    applyBtn: 'Bestätigen & Blueprint automatisch aktualisieren',
    applyingBtn: 'Blueprint, Storyboards & Audio werden aktualisiert…',
    editNoteBtn: 'Notiz bearbeiten',
    runArBtn: 'Audience Resonance-Durchlauf starten',
    runningArBtn: 'Audience Resonance wird bewertet…',
    revisionsBadge: (u, m) => `Blueprint-Revisionen: ${u} / ${m} genutzt`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} Durchläufe`,
    updatedToast: 'Blueprint, Storyboards & Vertonung aktualisiert! Den neuen Link finden Sie in Ihrem Postfach.',
    arUpdatedToast: 'Audience Resonance-Bewertung aktualisiert und per E-Mail gesendet!',
    shareFamilyBtn: 'Kommentar-Link mit Familie / Team teilen',
    shareFamilyCopied: 'Kommentar-Link kopiert! Gäste können anhören und kommentieren, während nur Sie überarbeiten oder freigeben können.',
    shareFamilyHint: 'Reiner Kommentar-Link: Gäste hören zu und hinterlassen Notizen, ohne zu bearbeiten oder freizugeben.',
    triageHeading: 'Familien- & Teamkommentare zum Filtern',
    triageSubtitle: 'Wählen Sie die Hinweise aus, die in Ihre nächste Blueprint-Revision einfließen sollen, oder verwerfen Sie unpassende Einträge.',
    triageIncludeLabel: 'In nächste Revision aufnehmen',
    triageDismissBtn: 'Verwerfen',
    arSelectHeading: 'Optional: Audience Resonance-Verbesserungen zum Bündeln auswählen',
    packUpsellHeading: 'Benötigen Sie weitere Blueprint-Iterationen?',
    packUpsellBody: (revs, ar, price) =>
      `Schalten Sie +${revs} zusätzliche KI-Blueprint-Revisionen & +${ar} Audience Resonance-Durchläufe ($${price}) frei, um vor der Produktionsfreigabe weiter zu feilen.`,
    packUpsellBtn: (revs, price) => `+${revs} Iterationen hinzufügen ($${price})`,
    packUnlockingBtn: 'Zusätzliche Iterationen werden freigeschaltet…',
    packUnlockedToast: 'Zusätzliche Blueprint-Iterationen freigeschaltet! Sie können sofort weiter verfeinern.',
  },
  fr: {
    badge: 'Portail Director Blueprint • Studio IA en libre-service',
    heading: 'Affinez automatiquement votre Blueprint et vos storyboards',
    subtitle:
      'Écoutez votre brouillon de Blueprint, partagez un lien de commentaires uniquement avec votre famille ou votre équipe, et appliquez vos ajustements sélectionnés en une seule itération IA.',
    livingDraftHint:
      'Vous gardez le contrôle : les commentaires de vos proches ou collègues apparaissent ci-dessous pour validation avant toute itération.',
    placeholder:
      'Tapez ou appuyez sur le micro — ex. : Ajouter mes années de baseball universitaire, notre mariage en 1998 à Chicago et inclure l’oncle Marcus au chapitre 3…',
    clarifyBtn: 'Prévisualiser les changements filtrés par IA',
    clarifyingBtn: 'Filtrage et clarification…',
    confirmHeading: 'Confirmez la révision de votre Blueprint :',
    applyBtn: 'Confirmer et mettre à jour le Blueprint',
    applyingBtn: 'Mise à jour du Blueprint, des storyboards et de l’audio…',
    editNoteBtn: 'Modifier la note',
    runArBtn: 'Lancer une passe Audience Resonance',
    runningArBtn: 'Évaluation Audience Resonance…',
    revisionsBadge: (u, m) => `Révisions Blueprint : ${u} / ${m} utilisées`,
    arBadge: (u, m) => `Audience Resonance : ${u} / ${m} passes`,
    updatedToast: 'Blueprint, storyboards et narration mis à jour ! Vérifiez votre e-mail pour le lien actualisé.',
    arUpdatedToast: 'Score Audience Resonance mis à jour et envoyé par e-mail !',
    shareFamilyBtn: 'Partager un lien commentaires uniquement',
    shareFamilyCopied: 'Lien copié ! Vos invités peuvent écouter et commenter, tandis que vous seul pouvez réviser ou approuver.',
    shareFamilyHint: 'Lien commentaires uniquement : les invités écoutent et laissent des notes sans modifier ni approuver.',
    triageHeading: 'Commentaires famille / équipe à trier',
    triageSubtitle: 'Cochez les notes à inclure dans votre prochaine révision de Blueprint ou ignorez celles que vous ne retenez pas.',
    triageIncludeLabel: 'Inclure dans la prochaine révision',
    triageDismissBtn: 'Ignorer',
    arSelectHeading: 'Facultatif : cocher les améliorations Audience Resonance à intégrer',
    packUpsellHeading: 'Besoin de plus d’itérations Blueprint ?',
    packUpsellBody: (revs, ar, price) =>
      `Débloquez +${revs} révisions IA de Blueprint et +${ar} passes Audience Resonance ($${price}) pour continuer à affiner avant l’approbation.`,
    packUpsellBtn: (revs, price) => `Ajouter +${revs} itérations ($${price})`,
    packUnlockingBtn: 'Déblocage des itérations supplémentaires…',
    packUnlockedToast: 'Itérations Blueprint supplémentaires débloquées ! Vous pouvez continuer immédiatement.',
  },
  it: {
    badge: 'Portale Director Blueprint • Studio IA self-service',
    heading: 'Perfeziona automaticamente Blueprint e storyboard',
    subtitle:
      'Ascolta la bozza del Blueprint, condividi un link di soli commenti con famiglia o team e applica le modifiche selezionate in un’unica iterazione IA pulita.',
    livingDraftHint:
      'Hai sempre il controllo: i commenti di famiglia o team arrivano qui sotto per la tua approvazione prima di usare qualsiasi iterazione.',
    placeholder:
      'Scrivi o tocca il microfono — es.: Aggiungi gli anni di baseball al college, il nostro matrimonio nel 1998 a Chicago e lo zio Marcus nel Capitolo 3…',
    clarifyBtn: 'Anteprima modifiche filtrate dall’IA',
    clarifyingBtn: 'Filtro e chiarimento in corso…',
    confirmHeading: 'Conferma la revisione del tuo Blueprint:',
    applyBtn: 'Conferma e aggiorna automaticamente il Blueprint',
    applyingBtn: 'Aggiornamento di Blueprint, storyboard e audio…',
    editNoteBtn: 'Modifica nota',
    runArBtn: 'Esegui analisi Audience Resonance',
    runningArBtn: 'Valutazione Audience Resonance…',
    revisionsBadge: (u, m) => `Revisioni Blueprint: ${u} / ${m} usate`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} passaggi`,
    updatedToast: 'Blueprint, storyboard e narrazione aggiornati! Controlla la tua email per il link aggiornato.',
    arUpdatedToast: 'Punteggio Audience Resonance aggiornato e inviato via email!',
    shareFamilyBtn: 'Condividi link di soli commenti con famiglia / team',
    shareFamilyCopied: 'Link copiato! Gli invitati possono ascoltare e commentare, mentre solo tu puoi modificare o approvare.',
    shareFamilyHint: 'Link di soli commenti: gli ospiti ascoltano e lasciano note senza modificare né approvare.',
    triageHeading: 'Commenti di famiglia e team da filtrare',
    triageSubtitle: 'Seleziona le note da includere nella prossima revisione del Blueprint oppure ignora quelle che preferisci saltare.',
    triageIncludeLabel: 'Includi nella prossima revisione',
    triageDismissBtn: 'Ignora',
    arSelectHeading: 'Facoltativo: seleziona suggerimenti Audience Resonance da includere',
    packUpsellHeading: 'Ti servono altre iterazioni del Blueprint?',
    packUpsellBody: (revs, ar, price) =>
      `Sblocca +${revs} revisioni IA aggiuntive del Blueprint e +${ar} passaggi Audience Resonance ($${price}) per continuare a rifinire prima di approvare la produzione.`,
    packUpsellBtn: (revs, price) => `Aggiungi +${revs} iterazioni ($${price})`,
    packUnlockingBtn: 'Sblocco iterazioni extra…',
    packUnlockedToast: 'Iterazioni Blueprint extra sbloccate! Puoi continuare subito a perfezionare.',
  },
  nl: {
    badge: 'Director Blueprint-portaal • Selfservice AI-studio',
    heading: 'Verfijn je Blueprint & storyboards automatisch',
    subtitle:
      'Luister naar je concept-Blueprint, deel een link voor alleen opmerkingen met familie of teamgenoten en pas je geselecteerde updates toe in één heldere AI-iteratie.',
    livingDraftHint:
      'Jij hebt de regie: opmerkingen van familie of team verschijnen hieronder ter goedkeuring voordat er een iteratie wordt gebruikt.',
    placeholder:
      'Typ of tik op de microfoon — bijv.: Voeg mijn honkbaljaren op de universiteit en ons huwelijk in 1998 in Chicago toe, en neem oom Marcus op in Hoofdstuk 3…',
    clarifyBtn: 'Bekijk door AI gefilterde wijzigingen',
    clarifyingBtn: 'Filteren en verhelderen…',
    confirmHeading: 'Bevestig je Blueprint-revisie:',
    applyBtn: 'Bevestigen & Blueprint automatisch bijwerken',
    applyingBtn: 'Blueprint, storyboards & audio worden bijgewerkt…',
    editNoteBtn: 'Notitie bewerken',
    runArBtn: 'Voer Audience Resonance-ronde uit',
    runningArBtn: 'Audience Resonance wordt berekend…',
    revisionsBadge: (u, m) => `Blueprint-revisies: ${u} / ${m} gebruikt`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} rondes`,
    updatedToast: 'Blueprint, storyboards & vertelling bijgewerkt! Controleer je e-mail voor de nieuwe link.',
    arUpdatedToast: 'Audience Resonance-score bijgewerkt en gemaild!',
    shareFamilyBtn: 'Deel link voor alleen opmerkingen met familie / team',
    shareFamilyCopied: 'Link gekopieerd! Iedereen met de link kan luisteren en reageren, terwijl alleen jij kunt reviseren of goedkeuren.',
    shareFamilyHint: 'Alleen opmerkingen: gasten luisteren en laten notities achter zonder iets te wijzigen of goed te keuren.',
    triageHeading: 'Opmerkingen van familie & team om te filteren',
    triageSubtitle: 'Vink aan welke notities je wilt meenemen in je volgende Blueprint-revisie, of sla over wat je niet wilt gebruiken.',
    triageIncludeLabel: 'Meenemen in volgende revisie',
    triageDismissBtn: 'Negeren',
    arSelectHeading: 'Optioneel: vink Audience Resonance-verbeteringen aan om mee te nemen',
    packUpsellHeading: 'Meer Blueprint-iteraties nodig?',
    packUpsellBody: (revs, ar, price) =>
      `Ontgrendel +${revs} extra AI Blueprint-revisies & +${ar} Audience Resonance-rondes ($${price}) om verder te verfijnen voordat je goedkeurt voor productie.`,
    packUpsellBtn: (revs, price) => `+${revs} iteraties toevoegen ($${price})`,
    packUnlockingBtn: 'Extra iteraties ontgrendelen…',
    packUnlockedToast: 'Extra Blueprint-iteraties ontgrendeld! Je kunt direct verder verfijnen.',
  },
  ru: {
    badge: 'Режиссёрский портал Blueprint • Самостоятельная ИИ-студия',
    heading: 'Автоматически дорабатывайте Blueprint и раскадровки',
    subtitle:
      'Прослушайте черновик Blueprint, поделитесь ссылкой только для комментариев с семьёй или командой и примените выбранные правки за одну аккуратную ИИ-итерацию.',
    livingDraftHint:
      'Вы полностью управляете процессом: комментарии близких и коллег поступают ниже на ваше одобрение до расходования итерации.',
    placeholder:
      'Напишите или нажмите на микрофон — например: добавь годы студенческого бейсбола, нашу свадьбу 1998 года в Чикаго и дядю Маркуса в главу 3…',
    clarifyBtn: 'Предпросмотр ИИ-правок',
    clarifyingBtn: 'Фильтрация и уточнение…',
    confirmHeading: 'Подтвердите правки вашего Blueprint:',
    applyBtn: 'Подтвердить и автообновить Blueprint',
    applyingBtn: 'Обновляем Blueprint, раскадровки и озвучку…',
    editNoteBtn: 'Изменить заметку',
    runArBtn: 'Запустить оценку Audience Resonance',
    runningArBtn: 'Оцениваем Audience Resonance…',
    revisionsBadge: (u, m) => `Правки Blueprint: ${u} / ${m} исп.`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} проходов`,
    updatedToast: 'Blueprint, раскадровки и озвучка обновлены! Новая ссылка отправлена на ваш email.',
    arUpdatedToast: 'Оценка Audience Resonance обновлена и отправлена на email!',
    shareFamilyBtn: 'Поделиться ссылкой для комментариев с семьёй / командой',
    shareFamilyCopied: 'Ссылка скопирована! Гости смогут слушать и комментировать, а вносить правки и утверждать — только вы.',
    shareFamilyHint: 'Только комментарии: гости могут слушать и оставлять заметки без права редактирования и утверждения.',
    triageHeading: 'Комментарии семьи и команды для отбора',
    triageSubtitle: 'Отметьте заметки, которые хотите включить в следующую правку Blueprint, или скройте лишние.',
    triageIncludeLabel: 'Включить в следующую правку',
    triageDismissBtn: 'Скрыть',
    arSelectHeading: 'Необязательно: выберите рекомендации Audience Resonance для включения',
    packUpsellHeading: 'Нужно больше итераций Blueprint?',
    packUpsellBody: (revs, ar, price) =>
      `Откройте +${revs} дополнительных ИИ-правок Blueprint и +${ar} проходов Audience Resonance ($${price}), чтобы довести проект до идеала перед утверждением.`,
    packUpsellBtn: (revs, price) => `Добавить +${revs} итераций ($${price})`,
    packUnlockingBtn: 'Активация дополнительных итераций…',
    packUnlockedToast: 'Дополнительные итерации Blueprint открыты! Можно продолжать доработку прямо сейчас.',
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
