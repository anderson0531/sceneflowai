'use client'

import React, { useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type {
  BlueprintClientClarificationDraft,
  BlueprintShareSettings,
} from '@/lib/blueprint/shareTypes'
import type { ClientPortalLocale } from '@/lib/intake/clientPortalCopy'

interface AutoReviseUiStrings {
  badge: string
  heading: string
  subtitle: string
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
}

const AUTO_REVISE_COPY: Record<ClientPortalLocale, AutoReviseUiStrings> = {
  en: {
    badge: 'Automated AI Blueprint Revision Studio',
    heading: 'Refine Your Blueprint & Storyboards Automatically',
    subtitle:
      'Describe any story, beat, character, or prop updates below. AI will filter and confirm your request before updating your Blueprint and Audience Resonance score.',
    placeholder:
      'Example: Add Elena’s 1972 embroidered handkerchief to Chapter 5 and warm up the 1966 dock lighting…',
    clarifyBtn: 'Preview AI-Filtered Changes',
    clarifyingBtn: 'Filtering & Clarifying…',
    confirmHeading: 'Confirm Your Blueprint Revision:',
    applyBtn: 'Confirm & Auto-Update Blueprint',
    applyingBtn: 'Updating Blueprint & Storyboards…',
    editNoteBtn: 'Edit Note',
    runArBtn: 'Run Audience Resonance Pass',
    runningArBtn: 'Scoring Audience Resonance…',
    revisionsBadge: (u, m) => `Blueprint Revisions: ${u} / ${m} used`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} passes`,
    updatedToast: 'Blueprint & storyboards updated! Check your email for the updated review link.',
    arUpdatedToast: 'Audience Resonance score updated and emailed!',
  },
  es: {
    badge: 'Estudio Automático de Revisión de Blueprint con IA',
    heading: 'Refina tu Blueprint y Storyboards Automáticamente',
    subtitle:
      'Escribe cualquier ajuste de historia, capítulo, personaje o utilería. La IA filtrará y confirmará tus cambios antes de actualizar el Blueprint y Audience Resonance.',
    placeholder:
      'Ejemplo: Añadir el pañuelo bordado de Elena de 1972 en el Capítulo 5 y luz más cálida en 1966…',
    clarifyBtn: 'Previsualizar Cambios con IA',
    clarifyingBtn: 'Filtrando y aclarando…',
    confirmHeading: 'Confirma la Revisión de tu Blueprint:',
    applyBtn: 'Confirmar y Actualizar Blueprint',
    applyingBtn: 'Actualizando Blueprint y Storyboards…',
    editNoteBtn: 'Editar Nota',
    runArBtn: 'Ejecutar Pase Audience Resonance',
    runningArBtn: 'Evaluando Audience Resonance…',
    revisionsBadge: (u, m) => `Revisiones de Blueprint: ${u} / ${m}`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} pases`,
    updatedToast: '¡Blueprint y storyboards actualizados! Te enviamos el enlace por correo.',
    arUpdatedToast: '¡Puntaje Audience Resonance actualizado y enviado por correo!',
  },
  pt: {
    badge: 'Estúdio Automático de Revisão de Blueprint com IA',
    heading: 'Refine Seu Blueprint e Storyboards Automaticamente',
    subtitle:
      'Descreva ajustes de história, capítulos, elenco ou objetos. A IA filtrará e confirmará seu pedido antes de atualizar o Blueprint e o Audience Resonance.',
    placeholder:
      'Exemplo: Incluir o lenço bordado de 1972 no Capítulo 5 e aquecer a iluminação do píer de 1966…',
    clarifyBtn: 'Pré-visualizar Ajustes com IA',
    clarifyingBtn: 'Filtrando e esclarecendo…',
    confirmHeading: 'Confirme a Revisão do Seu Blueprint:',
    applyBtn: 'Confirmar e Atualizar Blueprint',
    applyingBtn: 'Atualizando Blueprint e Storyboards…',
    editNoteBtn: 'Editar Nota',
    runArBtn: 'Executar Passe Audience Resonance',
    runningArBtn: 'Calculando Audience Resonance…',
    revisionsBadge: (u, m) => `Revisões do Blueprint: ${u} / ${m}`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} passes`,
    updatedToast: 'Blueprint e storyboards atualizados! Enviamos o link atualizado por e-mail.',
    arUpdatedToast: 'Audience Resonance atualizado e enviado por e-mail!',
  },
  hi: {
    badge: 'स्वचालित AI Blueprint संशोधन स्टूडियो',
    heading: 'अपना Blueprint और स्टोरीबोर्ड स्वचालित रूप से परिष्कृत करें',
    subtitle:
      'कहानी, अध्याय, पात्र या प्रॉप में कोई भी बदलाव नीचे लिखें। AI आपके अनुरोध को स्पष्ट कर पुष्टि लेगा और फिर Blueprint व Audience Resonance को अपडेट करेगा।',
    placeholder:
      'उदाहरण: अध्याय 5 में 1972 का कढ़ाईदार रूमाल जोड़ें और 1966 डॉक की रोशनी गर्म करें…',
    clarifyBtn: 'AI-फ़िल्टर्ड बदलाव देखें',
    clarifyingBtn: 'स्पष्ट किया जा रहा है…',
    confirmHeading: 'अपने Blueprint संशोधन की पुष्टि करें:',
    applyBtn: 'पुष्टि करें और Blueprint अपडेट करें',
    applyingBtn: 'Blueprint और स्टोरीबोर्ड अपडेट हो रहे हैं…',
    editNoteBtn: 'नोट संपादित करें',
    runArBtn: 'Audience Resonance पास चलाएँ',
    runningArBtn: 'Audience Resonance स्कोर हो रहा है…',
    revisionsBadge: (u, m) => `Blueprint संशोधन: ${u} / ${m} प्रयुक्त`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} पास`,
    updatedToast: 'Blueprint और स्टोरीबोर्ड अपडेट हो गए! ईमेल में नया लिंक देखें।',
    arUpdatedToast: 'Audience Resonance स्कोर अपडेट और ईमेल कर दिया गया!',
  },
  'zh-CN': {
    badge: '全自动 AI Blueprint 修订工作台',
    heading: '自助优化您的 Blueprint 与章节分镜',
    subtitle:
      '在下方输入任何剧情、章节、角色或道具修改意见。AI 将先为您提炼确认，随后自动通过 Blueprint Director 更新分镜与 Audience Resonance 评分。',
    placeholder: '示例：请在第 5 章加入埃琳娜 1972 年的刺绣手帕，并调暖 1966 年码头的灯光…',
    clarifyBtn: '预览 AI 提炼的修改方案',
    clarifyingBtn: 'AI 正在提炼确认…',
    confirmHeading: '请确认您的 Blueprint 修改方案：',
    applyBtn: '确认并自动更新 Blueprint',
    applyingBtn: '正在自动更新 Blueprint 与分镜…',
    editNoteBtn: '返回修改意见',
    runArBtn: '运行 Audience Resonance 评估',
    runningArBtn: '正在评估 Audience Resonance…',
    revisionsBadge: (u, m) => `Blueprint 迭代：已用 ${u} / ${m} 次`,
    arBadge: (u, m) => `Audience Resonance：已用 ${u} / ${m} 次`,
    updatedToast: 'Blueprint 与分镜已自动更新！更新链接已发送至您的邮箱。',
    arUpdatedToast: 'Audience Resonance 评分已更新并发送至您的邮箱！',
  },
  ar: {
    badge: 'استوديو تعديل الـ Blueprint التلقائي بالذكاء الاصطناعي',
    heading: 'عدّل مخطط القصة ولوحات المشاهد تلقائياً',
    subtitle:
      'اكتب أي تعديلات على القصة أو الفصول أو الشخصيات أو الدعائم. سيقوم الذكاء الاصطناعي بتلخيص طلبك وتأكيده قبل تحديث الـ Blueprint وتقييم Audience Resonance.',
    placeholder: 'مثال: أضيفوا منديل إيلينا المطرز عام 1972 في الفصل 5 وإضاءة دافئة لرصيف 1966…',
    clarifyBtn: 'معاينة التعديلات المفلترة ذكياً',
    clarifyingBtn: 'جارٍ التصفية والتوضيح…',
    confirmHeading: 'تأكيد تعديلات الـ Blueprint الخاصة بك:',
    applyBtn: 'تأكيد وتحديث الـ Blueprint تلقائياً',
    applyingBtn: 'جارٍ تحديث الـ Blueprint ولوحات القصة…',
    editNoteBtn: 'تعديل الملاحظة',
    runArBtn: 'تشغيل جولة Audience Resonance',
    runningArBtn: 'جارٍ تقييم Audience Resonance…',
    revisionsBadge: (u, m) => `تعديلات Blueprint: ${u} من ${m}`,
    arBadge: (u, m) => `Audience Resonance: ${u} من ${m}`,
    updatedToast: 'تم تحديث الـ Blueprint ولوحات القصة وإرسال الرابط لبريدك!',
    arUpdatedToast: 'تم تحديث تقييم Audience Resonance وإرساله لبريدك!',
  },
  th: {
    badge: 'สตูดิโอปรับแก้ Blueprint อัตโนมัติด้วย AI',
    heading: 'ปรับปรุง Blueprint และภาพสตอรี่บอร์ดของคุณได้ทันที',
    subtitle:
      'พิมพ์รายละเอียดเนื้อเรื่อง บท ตัวละคร หรือพร็อพที่ต้องการปรับแก้ด้านล่าง AI จะช่วยสรุปทวนคำขอก่อนอัปเดต Blueprint และคะแนน Audience Resonance ให้อัตโนมัติ',
    placeholder:
      'ตัวอย่าง: เพิ่มผ้าเช็ดหน้าปักลายปี 1972 ในบทที่ 5 และปรับแสงท่าเรือปี 1966 ให้อบอุ่นขึ้น…',
    clarifyBtn: 'ดูสรุปการแก้ไขจาก AI',
    clarifyingBtn: 'กำลังกรองและสรุปคำขอ…',
    confirmHeading: 'ยืนยันรายการแก้ไข Blueprint ของคุณ:',
    applyBtn: 'ยืนยันและอัปเดต Blueprint อัตโนมัติ',
    applyingBtn: 'กำลังอัปเดต Blueprint และสตอรี่บอร์ด…',
    editNoteBtn: 'แก้ไขข้อความ',
    runArBtn: 'รันวิเคราะห์ Audience Resonance',
    runningArBtn: 'กำลังประเมิน Audience Resonance…',
    revisionsBadge: (u, m) => `รอบแก้ไข Blueprint: ${u} / ${m}`,
    arBadge: (u, m) => `Audience Resonance: ${u} / ${m} รอบ`,
    updatedToast: 'อัปเดต Blueprint และสตอรี่บอร์ดเรียบร้อย! ส่งลิงก์ใหม่ทางอีเมลแล้ว',
    arUpdatedToast: 'อัปเดตคะแนน Audience Resonance และส่งทางอีเมลเรียบร้อย!',
  },
}

export function ClientAutoRevisePanel(props: {
  token: string
  locale: ClientPortalLocale
  shareSettings: BlueprintShareSettings
  initialClarification?: BlueprintClientClarificationDraft | null
  onBlueprintUpdated: () => Promise<unknown>
}) {
  const { token, locale, shareSettings, initialClarification, onBlueprintUpdated } = props
  const copy = AUTO_REVISE_COPY[locale] ?? AUTO_REVISE_COPY.en

  const roundsUsed = Number(shareSettings.roundsUsed ?? 0)
  const maxRounds = Number(shareSettings.maxFeedbackRounds ?? 4)
  const arUsed = Number(shareSettings.arIterationsUsed ?? 0)
  const maxAr = Number(shareSettings.maxArIterations ?? 3)

  const [feedbackText, setFeedbackText] = useState('')
  const [clarification, setClarification] = useState<BlueprintClientClarificationDraft | null>(
    initialClarification ?? null
  )
  const [clarifying, setClarifying] = useState(false)
  const [applying, setApplying] = useState(false)
  const [runningAr, setRunningAr] = useState(false)

  const canReviseMore = roundsUsed < maxRounds
  const canRunArMore = arUsed < maxAr

  const handleClarify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackText.trim() || clarifying || applying || !canReviseMore) return
    setClarifying(true)
    try {
      const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/auto-revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clarify',
          feedback: feedbackText.trim(),
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
      await onBlueprintUpdated()
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

  return (
    <section className="rounded-2xl border border-emerald-500/35 bg-gradient-to-b from-slate-900/95 via-slate-950 to-emerald-950/20 p-5 shadow-xl space-y-4">
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

      <div>
        <h2 className="text-lg font-bold text-white">{copy.heading}</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">{copy.subtitle}</p>
      </div>

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
          <textarea
            rows={3}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder={copy.placeholder}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="submit"
              disabled={!feedbackText.trim() || clarifying}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2 text-xs font-extrabold text-slate-950 transition cursor-pointer"
            >
              {clarifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{clarifying ? copy.clarifyingBtn : copy.clarifyBtn}</span>
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
        </form>
      ) : (
        canRunArMore && (
          <button
            type="button"
            disabled={runningAr}
            onClick={handleRunAr}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/45 bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-cyan-200 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${runningAr ? 'animate-spin' : ''}`} />
            <span>{runningAr ? copy.runningArBtn : copy.runArBtn}</span>
          </button>
        )
      )}
    </section>
  )
}
