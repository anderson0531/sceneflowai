/**
 * Curated 7-language UI copy (en, es, pt, hi, zh, ar, th) for SceneFlow's
 * in-app Help Coach (`JitHelpDrawer`), `ProductionOnboarding`,
 * `ReportGenerationErrorDialog`, and `GenerationErrorCard`.
 *
 * Kept separate from `messages/app/{locale}/common.json` so the base app catalog
 * stays lightweight while giving non-English creators & white-label PMs native
 * in-app help even on catalog-mode routes where Google Translate is disabled.
 */

import {
  normalizeWalkthroughDubLocale,
} from '@/config/landing/doorWalkthroughCopy'
import type { HeroDubLocaleId } from '@/config/landing/featureRoomScripts'
import type { JitContextId } from '@/config/help/helpAcademyConfig'

export interface ProductionTourStepCopy {
  title: string
  description: string
  tip: string
}

export interface HelpUiLocaleCopy {
  isRtl: boolean
  drawer: {
    pillPrefix: string
    dismissPillTitle: string
    headerTitle: string
    headerSubtitle: string
    fullAcademyBtn: string
    closeLabel: string
    tabThisScreen: string
    tabAskCoach: string
    tabGuidedTour: string
    tabSearch: string
    screenMapMode: string
    videoTourMode: string
    replayTourBtn: string
    replayTourTitle: string
    headingVideoTour: string
    headingScreenMap: string
    headingQuickSteps: string
    headingTroubleshooting: string
    typicalUsageLabel: string
    typicalTimePrefix: string
    searchPlaceholder: string
    searchHotspotsHeading: string
    searchFaqsHeading: string
    searchGuidesHeading: string
    searchEmptyTitle: string
    searchEmptyHint: string
    clearSearchBtn: string
    contactSupportLink: string
    shortcutPrefix: string
    shortcutOr: string
    restorePillBtn: string
    reportIssueBtn: string
    openAcademyFooter: string
    coachTitle: string
    coachSubtitle: string
    coachPlaceholder: string
    coachSendBtn: string
    coachThinking: string
    coachGroundedBadge: string
    coachClearBtn: string
    coachStillStuckBtn: string
    coachPromptsByContext: Record<JitContextId, readonly [string, string, string]>
  }
  supportDialog: {
    titlePrefix: string
    titleSuffix: string
    topicLabel: string
    noteLabelGeneral: string
    noteLabelError: string
    notePlaceholderGeneral: string
    notePlaceholderError: string
    diagnosticsSummary: string
    cancelBtn: string
    sendBtn: string
    sendingBtn: string
    doneBtn: string
    escalatedHeading: string
    relayOfflineHeading: string
    escalatedWithConfirm: string
    escalatedBody: string
    relayOfflineBodyPrefix: string
    emailFallbackBtnPrefix: string
    referenceTicketLabel: string
    copyIdBtn: string
    copiedBtn: string
  }
  errorCard: {
    technicalDetailsSummary: string
    troubleshootingGuideBtn: string
    reportBugBtn: string
  }
  productionTour: {
    stepOfLabel: string
    previousBtn: string
    nextBtn: string
    skipBtn: string
    finishBtn: string
    steps: readonly [
      ProductionTourStepCopy,
      ProductionTourStepCopy,
      ProductionTourStepCopy,
      ProductionTourStepCopy,
      ProductionTourStepCopy,
      ProductionTourStepCopy,
      ProductionTourStepCopy,
    ]
  }
}

const EN_COACH_PROMPTS: Record<JitContextId, readonly [string, string, string]> = {
  dashboard: [
    'Should I start in Blueprint Room or Series Room?',
    'How do I install the Mobile Companion PWA?',
    'Compare plans, credits, and Vault storage',
  ],
  series: [
    'How does the shared Series Bible save credits?',
    'How do I delegate a series to a Project Manager?',
    'Can characters change wardrobe across episodes?',
  ],
  blueprint: [
    'How do I hit 80+ on Audience Resonance™?',
    'How do I share a zero-login Blueprint Pass?',
    'How many credits does a full Blueprint cost?',
  ],
  production: [
    'Why did a still or video clip fail or get blocked?',
    'How do I lock character faces in Continuity Vault?',
    'How does the Walk-Away Production Agent work?',
  ],
  'final-cut': [
    'How do I mix Animatic keyframes and motion video?',
    'How does multi-language stem-separated dubbing work?',
    'How do I export a normalized MP4 master?',
  ],
  premiere: [
    'How do zero-login /s/ Screening Room links work?',
    'Do paid plans include full commercial rights?',
    'How do I generate posters and thumbnails?',
  ],
  'agency-ops': [
    'How does 1-Click Draft Purge save Vault storage?',
    'How do I track PM workload, SLA aging, and margins?',
    'What can a 0-credit QA Reviewer do?',
  ],
  producer: [
    'How do I brand white-label client intake & review links?',
    'How do team seats and monthly PM credit caps work?',
    'Which plans include custom domains and EXIF stripping?',
  ],
  billing: [
    'Compare Explorer, Hobbyist, Starter, Pro & Studio plans',
    'How long do Add-On credit packs and Explorer credits last?',
    'How do I connect my Google Vertex AI BYOK key?',
  ],
}

export const HELP_UI_COPY: Record<HeroDubLocaleId, HelpUiLocaleCopy> = {
  en: {
    isRtl: false,
    drawer: {
      pillPrefix: 'JIT Guide',
      dismissPillTitle: 'Hide floating pill (you can still open JIT Help via ? in the header)',
      headerTitle: 'Studio JIT Coach',
      headerSubtitle: 'Context-aware guidance, 7-language tours & instant answers',
      fullAcademyBtn: 'Full Academy',
      closeLabel: 'Close JIT Help',
      tabThisScreen: 'This Screen',
      tabAskCoach: 'Ask Coach',
      tabGuidedTour: 'Guided Tour',
      tabSearch: 'Search',
      screenMapMode: 'Screen Map',
      videoTourMode: '7-Lang Video',
      replayTourBtn: 'Replay Tour',
      replayTourTitle: 'Replay the first-time onboarding walkthrough for this room',
      headingVideoTour: '7-Language Narrated Room Tour',
      headingScreenMap: 'Interactive Visual Screen Map',
      headingQuickSteps: 'What to Do Right Now (60-Second Checklist)',
      headingTroubleshooting: 'Unstuck in 10 Seconds (Common Questions Here)',
      typicalUsageLabel: 'Typical Usage:',
      typicalTimePrefix: 'Typical time:',
      searchPlaceholder: 'Search Continuity Vault, BYOK, Agency Ops, credits, dubbing...',
      searchHotspotsHeading: 'Matching Screen Controls',
      searchFaqsHeading: 'Troubleshooting Answers',
      searchGuidesHeading: 'Studio Guides',
      searchEmptyTitle: 'No guides matched your query',
      searchEmptyHint: 'Try searching for Continuity Vault, BYOK, Agency Ops, or credits — or ask Studio Coach.',
      clearSearchBtn: 'Clear search',
      contactSupportLink: 'Contact Support',
      shortcutPrefix: 'Press',
      shortcutOr: 'or',
      restorePillBtn: 'Restore floating pill',
      reportIssueBtn: 'Report Issue',
      openAcademyFooter: 'Open Studio Academy',
      coachTitle: 'Ask SceneFlow Studio Coach',
      coachSubtitle: 'Grounded in live plans, routes, agency tools, and troubleshooting playbooks.',
      coachPlaceholder: 'Ask anything (e.g., "How do I connect BYOK?" or "How do PM credit caps work?")',
      coachSendBtn: 'Ask',
      coachThinking: 'Searching Studio knowledge…',
      coachGroundedBadge: 'Grounded in live Studio docs',
      coachClearBtn: 'Clear chat',
      coachStillStuckBtn: 'Still stuck? Open Support Ticket',
      coachPromptsByContext: EN_COACH_PROMPTS,
    },
    supportDialog: {
      titlePrefix: 'Report',
      titleSuffix: 'Issue to Support',
      topicLabel: 'Topic / Studio Area',
      noteLabelGeneral: 'Describe the issue or question',
      noteLabelError: 'Add context for our support team (optional)',
      notePlaceholderGeneral: 'Tell us what you were doing, what happened, and any steps to reproduce...',
      notePlaceholderError: 'e.g., Tried rerunning twice on Shot 4 and got the same error...',
      diagnosticsSummary: 'Included diagnostic details (sent automatically, secrets redacted)',
      cancelBtn: 'Cancel',
      sendBtn: 'Send to Support',
      sendingBtn: 'Sending…',
      doneBtn: 'Done',
      escalatedHeading: 'Escalated to SceneFlow Customer Support',
      relayOfflineHeading: 'Ticket Saved — Email Relay Unavailable',
      escalatedWithConfirm: 'Our engineering and support team received your diagnostics, and we emailed a confirmation receipt with your ticket ID.',
      escalatedBody: 'Our engineering and support team received the diagnostics and error log so this can be quickly investigated and resolved.',
      relayOfflineBodyPrefix: 'Your diagnostic ticket was logged in our admin queue, but automated email delivery is currently offline. For urgent help, email',
      emailFallbackBtnPrefix: 'Email',
      referenceTicketLabel: 'Reference Ticket',
      copyIdBtn: 'Copy ID',
      copiedBtn: 'Copied',
    },
    errorCard: {
      technicalDetailsSummary: 'Technical details',
      troubleshootingGuideBtn: 'Troubleshooting Guide (?)',
      reportBugBtn: 'Still stuck? Report platform bug',
    },
    productionTour: {
      stepOfLabel: 'Step {current} of {total}',
      previousBtn: 'Previous',
      nextBtn: 'Next',
      skipBtn: 'Skip Tour',
      finishBtn: 'Start Producing',
      steps: [
        {
          title: 'Welcome to Production Stage',
          description: 'SceneFlow is one continuous pipeline: Direction → Shots → Music → References → Pre-Vis → Video → Mixer → Production Streams & Screening Room.',
          tip: 'The Production Progress dashboard and Co-Director always show where you are and what is next.',
        },
        {
          title: 'Step 1 — Direction, Shots, and Audio',
          description: 'Optimize your script with the Intelligent Assistant Director, run Audience Resonance Analysis (85+ target), generate audio, and assign voices.',
          tip: 'Pre-Vis ready requires character voices and at least one reference in the Reference Library.',
        },
        {
          title: 'Step 2 — Pre-Vis',
          description: 'Use Run All Agents for Direction → Audio → Pre-Vis frames. Review in the gallery, share for approval, and preview live in Screening Room.',
          tip: 'Pre-Vis Frame = still image per shot. Screening Room is live preview — not an exported MP4.',
        },
        {
          title: 'Step 3 — Video Clips',
          description: 'Generate one motion clip per shot anchored to your Pre-Vis Start & End keyframes. Standard and Creative modes match your Pre-Vis controls.',
          tip: 'Animate hero motion shots and keep dialogue reactions as dynamic keyframes to save up to 60% of credits.',
        },
        {
          title: 'Step 4 — Mixer & Production Streams',
          description: 'Preview with elastic audio timing; baseline language drives the timeline. Render Stream exports WebM or Broadcast MP4 into Production Streams.',
          tip: 'After render: Play in Production Streams or preview directly in Screening Room.',
        },
        {
          title: 'Step 5 — Screening Room & Delivery',
          description: 'Pick an Animatic or Video stream version per scene across languages, review in the Screening Room, share zero-login `/s/` links, and export your master.',
          tip: 'Stale streams display an "Update available" badge whenever shots or audio change.',
        },
        {
          title: 'Step 6 — Track Progress & FlowDirector QA',
          description: 'Track Script, Audio, Direction, Shot Frames, Video, and Render progress at a glance. Click any scene to jump right to it.',
          tip: 'Press ? anytime to open the Just-In-Time Studio Coach or watch the 7-language room tour.',
        },
      ],
    },
  },

  es: {
    isRtl: false,
    drawer: {
      pillPrefix: 'Guía JIT',
      dismissPillTitle: 'Ocultar botón flotante (siempre puedes abrir Ayuda con ? en el encabezado)',
      headerTitle: 'Coach JIT del Estudio',
      headerSubtitle: 'Guía contextual, tours en 7 idiomas y respuestas al instante',
      fullAcademyBtn: 'Academia Completa',
      closeLabel: 'Cerrar ayuda JIT',
      tabThisScreen: 'Esta Pantalla',
      tabAskCoach: 'Preguntar al Coach',
      tabGuidedTour: 'Tour Guiado',
      tabSearch: 'Buscar',
      screenMapMode: 'Mapa Visual',
      videoTourMode: 'Video 7 Idiomas',
      replayTourBtn: 'Repetir Tour',
      replayTourTitle: 'Volver a ver el recorrido inicial de esta sala',
      headingVideoTour: 'Tour Narrado en 7 Idiomas',
      headingScreenMap: 'Mapa Interactivo de Pantalla',
      headingQuickSteps: 'Qué Hacer Ahora (Lista de 60 Segundos)',
      headingTroubleshooting: 'Soluciones Rápidas (Preguntas Frecuentes)',
      typicalUsageLabel: 'Uso típico:',
      typicalTimePrefix: 'Tiempo estimado:',
      searchPlaceholder: 'Buscar Continuity Vault, BYOK, Agency Ops, créditos, doblaje...',
      searchHotspotsHeading: 'Controles de Pantalla',
      searchFaqsHeading: 'Respuestas de Solución',
      searchGuidesHeading: 'Guías del Estudio',
      searchEmptyTitle: 'No se encontraron guías para tu búsqueda',
      searchEmptyHint: 'Prueba con Continuity Vault, BYOK, Agency Ops o créditos — o pregunta al Coach.',
      clearSearchBtn: 'Limpiar búsqueda',
      contactSupportLink: 'Contactar Soporte',
      shortcutPrefix: 'Pulsa',
      shortcutOr: 'o',
      restorePillBtn: 'Mostrar botón flotante',
      reportIssueBtn: 'Reportar Problema',
      openAcademyFooter: 'Abrir Academia del Estudio',
      coachTitle: 'Pregunta al Coach de SceneFlow',
      coachSubtitle: 'Basado en planes actuales, rutas, herramientas de agencia y guías reales.',
      coachPlaceholder: 'Pregunta lo que necesites (ej. "¿Cómo conecto Vertex AI BYOK?" o "límites de PM")',
      coachSendBtn: 'Enviar',
      coachThinking: 'Buscando en la documentación…',
      coachGroundedBadge: 'Verificado con documentación en vivo',
      coachClearBtn: 'Limpiar chat',
      coachStillStuckBtn: '¿Aún necesitas ayuda? Abrir Ticket',
      coachPromptsByContext: {
        ...EN_COACH_PROMPTS,
        dashboard: [
          '¿Empiezo en Blueprint Room o en Series Room?',
          '¿Cómo instalo la PWA Mobile Companion?',
          'Comparar planes, créditos y almacenamiento Vault',
        ],
        production: [
          '¿Por qué falló o se bloqueó una toma o clip?',
          '¿Cómo bloqueo rostros en el Continuity Vault?',
          '¿Cómo funciona el Production Agent autónomo?',
        ],
        'agency-ops': [
          '¿Cómo libera espacio la Purga de Borradores en 1 clic?',
          '¿Cómo gestiono carga de PMs, SLA y márgenes?',
          '¿Qué permisos tiene un QA Reviewer de 0 créditos?',
        ],
        billing: [
          'Comparar Explorer, Hobbyist, Starter, Pro y Studio',
          '¿Cuánto duran los paquetes Add-On y los créditos Explorer?',
          '¿Cómo conecto mi clave BYOK de Google Vertex AI?',
        ],
      },
    },
    supportDialog: {
      titlePrefix: 'Reportar problema de',
      titleSuffix: 'a Soporte',
      topicLabel: 'Tema / Área del Estudio',
      noteLabelGeneral: 'Describe el problema o consulta',
      noteLabelError: 'Agrega contexto para nuestro equipo (opcional)',
      notePlaceholderGeneral: 'Cuéntanos qué estabas haciendo, qué ocurrió y los pasos para reproducirlo...',
      notePlaceholderError: 'Ej. Intenté regenerar dos veces la Toma 4 y apareció el mismo error...',
      diagnosticsSummary: 'Detalles técnicos incluidos (enviados automáticamente sin claves privadas)',
      cancelBtn: 'Cancelar',
      sendBtn: 'Enviar a Soporte',
      sendingBtn: 'Enviando…',
      doneBtn: 'Listo',
      escalatedHeading: 'Escalado al Soporte de SceneFlow',
      relayOfflineHeading: 'Ticket Guardado — Correo Temporalmente Inactivo',
      escalatedWithConfirm: 'Nuestro equipo recibió tus diagnósticos y te enviamos un correo de confirmación con tu número de ticket.',
      escalatedBody: 'Nuestro equipo técnico recibió los diagnósticos y registros para investigarlo rápidamente.',
      relayOfflineBodyPrefix: 'Tu ticket quedó registrado en nuestra cola, pero el envío de correo automático está fuera de línea. Para casos urgentes escribe a',
      emailFallbackBtnPrefix: 'Escribir a',
      referenceTicketLabel: 'Ticket de Referencia',
      copyIdBtn: 'Copiar ID',
      copiedBtn: 'Copiado',
    },
    errorCard: {
      technicalDetailsSummary: 'Detalles técnicos',
      troubleshootingGuideBtn: 'Guía de Solución (?)',
      reportBugBtn: '¿Sigue fallando? Reportar error',
    },
    productionTour: {
      stepOfLabel: 'Paso {current} de {total}',
      previousBtn: 'Anterior',
      nextBtn: 'Siguiente',
      skipBtn: 'Omitir Tour',
      finishBtn: 'Comenzar Producción',
      steps: [
        {
          title: 'Bienvenido a Production Stage',
          description: 'SceneFlow integra todo en un solo flujo: Dirección → Tomas → Música → Referencias → Pre-Vis → Video → Mezclador → Streams y Sala de Proyección.',
          tip: 'El panel de progreso y el Co-Director siempre te indican el siguiente paso.',
        },
        {
          title: 'Paso 1 — Dirección, Tomas y Audio',
          description: 'Optimiza tu guion con el Intelligent Assistant Director, alcanza 85+ en Audience Resonance, genera el audio y asigna voces.',
          tip: 'Para Pre-Vis necesitas voces asignadas y al menos una referencia aprobada.',
        },
        {
          title: 'Paso 2 — Pre-Vis',
          description: 'Usa Run All Agents para Dirección → Audio → Fotogramas Pre-Vis. Revisa en galería y comparte enlaces de aprobación.',
          tip: 'El Screening Room es una vista previa interactiva en vivo antes de exportar MP4.',
        },
        {
          title: 'Paso 3 — Clips de Video',
          description: 'Genera clips animados anclados a tus fotogramas inicial y final. Los modos Standard y Creative respetan tus referencias.',
          tip: 'Anima tus tomas principales y conserva reacciones como fotogramas dinámicos para ahorrar hasta 60% de créditos.',
        },
        {
          title: 'Paso 4 — Mezclador y Streams',
          description: 'Previsualiza el ritmo con ajuste elástico de audio y exporta WebM o MP4 de calidad broadcast a Production Streams.',
          tip: 'Al terminar el render, reproduce en Streams o directamente en Screening Room.',
        },
        {
          title: 'Paso 5 — Screening Room y Entrega',
          description: 'Elige versiones Animatic o Video por idioma, comparte enlaces `/s/` sin registro y descarga tu máster final.',
          tip: 'Los streams desactualizados muestran un aviso cuando editas tomas o diálogos.',
        },
        {
          title: 'Paso 6 — Progreso y Control QA',
          description: 'Supervisa Guion, Audio, Dirección, Fotogramas, Video y Render en un vistazo. Haz clic en cualquier escena para ir directo.',
          tip: 'Pulsa ? en cualquier momento para abrir el Coach JIT o ver el video tour en español.',
        },
      ],
    },
  },

  pt: {
    isRtl: false,
    drawer: {
      pillPrefix: 'Guia JIT',
      dismissPillTitle: 'Ocultar botão flutuante (você sempre pode abrir a Ajuda com ? no cabeçalho)',
      headerTitle: 'Coach JIT do Estúdio',
      headerSubtitle: 'Orientação contextual, tours em 7 idiomas e respostas instantâneas',
      fullAcademyBtn: 'Academia Completa',
      closeLabel: 'Fechar Ajuda JIT',
      tabThisScreen: 'Esta Tela',
      tabAskCoach: 'Perguntar ao Coach',
      tabGuidedTour: 'Tour Guiado',
      tabSearch: 'Buscar',
      screenMapMode: 'Mapa Visual',
      videoTourMode: 'Vídeo 7 Idiomas',
      replayTourBtn: 'Rever Tour',
      replayTourTitle: 'Rever o tour inicial desta sala',
      headingVideoTour: 'Tour Narrado em 7 Idiomas',
      headingScreenMap: 'Mapa Interativo da Tela',
      headingQuickSteps: 'O Que Fazer Agora (Checklist de 60s)',
      headingTroubleshooting: 'Resolvido em 10s (Dúvidas Comuns)',
      typicalUsageLabel: 'Uso típico:',
      typicalTimePrefix: 'Tempo médio:',
      searchPlaceholder: 'Buscar Continuity Vault, BYOK, Agency Ops, créditos, dublagem...',
      searchHotspotsHeading: 'Controles da Tela',
      searchFaqsHeading: 'Respostas Rápidas',
      searchGuidesHeading: 'Guias do Estúdio',
      searchEmptyTitle: 'Nenhum guia encontrado',
      searchEmptyHint: 'Tente buscar por Continuity Vault, BYOK, Agency Ops ou créditos — ou pergunte ao Coach.',
      clearSearchBtn: 'Limpar busca',
      contactSupportLink: 'Falar com Suporte',
      shortcutPrefix: 'Pressione',
      shortcutOr: 'ou',
      restorePillBtn: 'Mostrar botão flutuante',
      reportIssueBtn: 'Reportar Problema',
      openAcademyFooter: 'Abrir Academia do Estúdio',
      coachTitle: 'Pergunte ao Coach SceneFlow',
      coachSubtitle: 'Baseado nos planos ativos, rotas, ferramentas de agência e guias oficiais.',
      coachPlaceholder: 'Pergunte algo (ex. "Como conectar BYOK?" ou "Como funciona o limite de PM?")',
      coachSendBtn: 'Perguntar',
      coachThinking: 'Consultando documentação do Estúdio…',
      coachGroundedBadge: 'Baseado na documentação oficial',
      coachClearBtn: 'Limpar chat',
      coachStillStuckBtn: 'Ainda precisa de ajuda? Abrir Ticket',
      coachPromptsByContext: {
        ...EN_COACH_PROMPTS,
        dashboard: [
          'Começo no Blueprint Room ou no Series Room?',
          'Como instalar o Mobile Companion PWA?',
          'Comparar planos, créditos e armazenamento Vault',
        ],
        production: [
          'Por que um quadro ou clipe falhou ou foi bloqueado?',
          'Como travar rostos no Continuity Vault?',
          'Como funciona o Production Agent autônomo?',
        ],
        'agency-ops': [
          'Como a Limpeza de Rascunhos em 1 clique libera Vault?',
          'Como acompanhar carga de PMs, SLA e margens?',
          'O que um QA Reviewer (0 créditos) pode fazer?',
        ],
        billing: [
          'Comparar Explorer, Hobbyist, Starter, Pro e Studio',
          'Qual a validade dos pacotes Add-On e créditos Explorer?',
          'Como conectar minha chave BYOK do Google Vertex AI?',
        ],
      },
    },
    supportDialog: {
      titlePrefix: 'Reportar problema de',
      titleSuffix: 'ao Suporte',
      topicLabel: 'Assunto / Área do Estúdio',
      noteLabelGeneral: 'Descreva o problema ou dúvida',
      noteLabelError: 'Adicione contexto para nossa equipe (opcional)',
      notePlaceholderGeneral: 'Conte o que estava fazendo, o que aconteceu e como reproduzir...',
      notePlaceholderError: 'Ex.: Tentei gerar o Plano 4 duas vezes e deu o mesmo erro...',
      diagnosticsSummary: 'Diagnósticos incluídos (enviados automaticamente com segredos ocultados)',
      cancelBtn: 'Cancelar',
      sendBtn: 'Enviar ao Suporte',
      sendingBtn: 'Enviando…',
      doneBtn: 'Concluir',
      escalatedHeading: 'Enviado ao Suporte SceneFlow',
      relayOfflineHeading: 'Ticket Salvo — Envio de E-mail Indisponível',
      escalatedWithConfirm: 'Nossa equipe recebeu os diagnósticos e enviamos um e-mail de confirmação com o número do seu ticket.',
      escalatedBody: 'Nossa equipe técnica recebeu os diagnósticos e logs para investigar rapidamente.',
      relayOfflineBodyPrefix: 'Seu ticket foi registrado na fila interna, mas o envio automático de e-mail está indisponível. Para urgências, escreva para',
      emailFallbackBtnPrefix: 'Enviar e-mail para',
      referenceTicketLabel: 'Ticket de Referência',
      copyIdBtn: 'Copiar ID',
      copiedBtn: 'Copiado',
    },
    errorCard: {
      technicalDetailsSummary: 'Detalhes técnicos',
      troubleshootingGuideBtn: 'Guia de Solução (?)',
      reportBugBtn: 'Ainda travado? Reportar bug',
    },
    productionTour: {
      stepOfLabel: 'Passo {current} de {total}',
      previousBtn: 'Anterior',
      nextBtn: 'Próximo',
      skipBtn: 'Pular Tour',
      finishBtn: 'Começar Produção',
      steps: [
        {
          title: 'Bem-vindo ao Production Stage',
          description: 'Um pipeline contínuo: Direção → Planos → Música → Referências → Pre-Vis → Vídeo → Mixer → Production Streams e Screening Room.',
          tip: 'O painel de progresso e o Co-Director sempre mostram o próximo passo.',
        },
        {
          title: 'Passo 1 — Direção, Planos e Áudio',
          description: 'Aperfeiçoe o roteiro com o Intelligent Assistant Director, atinja 85+ no Audience Resonance, gere áudio e atribua vozes.',
          tip: 'Pre-Vis requer vozes atribuídas e ao menos uma referência aprovada.',
        },
        {
          title: 'Passo 2 — Pre-Vis',
          description: 'Use Run All Agents para Direção → Áudio → quadros Pre-Vis. Revise na galeria e compartilhe para aprovação.',
          tip: 'O Screening Room é prévia ao vivo antes de exportar o MP4 final.',
        },
        {
          title: 'Passo 3 — Clipes de Vídeo',
          description: 'Gere clipes de movimento ancorados nos quadros inicial e final. Os modos Standard e Creative preservam continuidade.',
          tip: 'Anime cenas principais e mantenha reações em quadros dinâmicos para economizar até 60% dos créditos.',
        },
        {
          title: 'Passo 4 — Mixer e Streams',
          description: 'Pré-visualize com ajuste elástico de áudio e exporte WebM ou MP4 broadcast para Production Streams.',
          tip: 'Após renderizar, assista em Streams ou diretamente no Screening Room.',
        },
        {
          title: 'Passo 5 — Screening Room e Entrega',
          description: 'Escolha Animatic ou Vídeo por idioma, compartilhe links `/s/` sem login e baixe seu master final.',
          tip: 'Streams desatualizados exibem aviso quando planos ou áudio são alterados.',
        },
        {
          title: 'Passo 6 — Progresso e QA',
          description: 'Acompanhe Roteiro, Áudio, Direção, Quadros, Vídeo e Render em um só lugar.',
          tip: 'Pressione ? a qualquer momento para abrir o Coach JIT ou o vídeo tour em português.',
        },
      ],
    },
  },

  hi: {
    isRtl: false,
    drawer: {
      pillPrefix: 'JIT गाइड',
      dismissPillTitle: 'फ़्लोटिंग पिल छुपाएँ (आप हेडर में ? दबाकर कभी भी सहायता खोल सकते हैं)',
      headerTitle: 'स्टूडियो JIT कोच',
      headerSubtitle: 'संदर्भ-आधारित मार्गदर्शन, 7-भाषा वीडियो टूर और त्वरित उत्तर',
      fullAcademyBtn: 'पूर्ण अकादमी',
      closeLabel: 'सहायता बंद करें',
      tabThisScreen: 'यह स्क्रीन',
      tabAskCoach: 'कोच से पूछें',
      tabGuidedTour: 'गाइडेड टूर',
      tabSearch: 'खोजें',
      screenMapMode: 'स्क्रीन मैप',
      videoTourMode: '7-भाषा वीडियो',
      replayTourBtn: 'टूर फिर देखें',
      replayTourTitle: 'इस रूम का शुरुआती टूर दोबारा चलाएँ',
      headingVideoTour: '7-भाषा नैरेटेड रूम टूर',
      headingScreenMap: 'इंटरैक्टिव विज़ुअल स्क्रीन मैप',
      headingQuickSteps: 'अभी क्या करें (60-सेकंड चेकलिस्ट)',
      headingTroubleshooting: '10 सेकंड में समाधान (सामान्य प्रश्न)',
      typicalUsageLabel: 'अनुमानित उपयोग:',
      typicalTimePrefix: 'अनुमानित समय:',
      searchPlaceholder: 'Continuity Vault, BYOK, Agency Ops, क्रेडिट या डबिंग खोजें...',
      searchHotspotsHeading: 'स्क्रीन नियंत्रण',
      searchFaqsHeading: 'समस्या निवारण उत्तर',
      searchGuidesHeading: 'स्टूडियो गाइड',
      searchEmptyTitle: 'कोई गाइड नहीं मिला',
      searchEmptyHint: 'Continuity Vault, BYOK, Agency Ops या credits खोजें — या कोच से पूछें।',
      clearSearchBtn: 'खोज साफ़ करें',
      contactSupportLink: 'सपोर्ट से संपर्क करें',
      shortcutPrefix: 'दबाएँ',
      shortcutOr: 'या',
      restorePillBtn: 'फ़्लोटिंग पिल दिखाएँ',
      reportIssueBtn: 'समस्या रिपोर्ट करें',
      openAcademyFooter: 'स्टूडियो अकादमी खोलें',
      coachTitle: 'SceneFlow स्टूडियो कोच से पूछें',
      coachSubtitle: 'लाइव प्लान, रूट्स, एजेंसी टूल्स और ट्रबलशूटिंग गाइड पर आधारित।',
      coachPlaceholder: 'कुछ भी पूछें (जैसे "BYOK कैसे जोड़ें?" या "PM क्रेडिट सीमा कैसे काम करती है?")',
      coachSendBtn: 'पूछें',
      coachThinking: 'स्टूडियो गाइड खोज रहे हैं…',
      coachGroundedBadge: 'लाइव स्टूडियो दस्तावेज़ों पर आधारित',
      coachClearBtn: 'चैट साफ़ करें',
      coachStillStuckBtn: 'अभी भी समस्या है? सपोर्ट टिकट खोलें',
      coachPromptsByContext: EN_COACH_PROMPTS,
    },
    supportDialog: {
      titlePrefix: 'सपोर्ट को',
      titleSuffix: 'समस्या रिपोर्ट करें',
      topicLabel: 'विषय / स्टूडियो क्षेत्र',
      noteLabelGeneral: 'समस्या या प्रश्न का विवरण लिखें',
      noteLabelError: 'सपोर्ट टीम के लिए संदर्भ जोड़ें (वैकल्पिक)',
      notePlaceholderGeneral: 'बताएँ आप क्या कर रहे थे, क्या हुआ, और इसे दोहराने के चरण...',
      notePlaceholderError: 'जैसे: शॉट 4 को दो बार फिर चलाया पर वही त्रुटि आई...',
      diagnosticsSummary: 'शामिल डायग्नोस्टिक विवरण (गुप्त कुंजियाँ स्वचालित रूप से हटाई जाती हैं)',
      cancelBtn: 'रद्द करें',
      sendBtn: 'सपोर्ट को भेजें',
      sendingBtn: 'भेज रहे हैं…',
      doneBtn: 'पूर्ण',
      escalatedHeading: 'SceneFlow ग्राहक सहायता को भेजा गया',
      relayOfflineHeading: 'टिकट सहेजा गया — ईमेल सेवा अस्थायी रूप से बंद',
      escalatedWithConfirm: 'हमारी टीम को आपके डायग्नोस्टिक्स मिल गए हैं और आपके टिकट आईडी के साथ पुष्टिकरण ईमेल भेजा गया है।',
      escalatedBody: 'हमारी इंजीनियरिंग और सपोर्ट टीम को लॉग्स मिल गए हैं और वे शीघ्र जाँच करेंगे।',
      relayOfflineBodyPrefix: 'आपका टिकट हमारे सिस्टम में सहेजा गया है, लेकिन ऑटोमैटिक ईमेल अभी ऑफ़लाइन है। तुरंत सहायता के लिए ईमेल करें:',
      emailFallbackBtnPrefix: 'ईमेल करें',
      referenceTicketLabel: 'संदर्भ टिकट',
      copyIdBtn: 'ID कॉपी करें',
      copiedBtn: 'कॉपी किया गया',
    },
    errorCard: {
      technicalDetailsSummary: 'तकनीकी विवरण',
      troubleshootingGuideBtn: 'समाधान गाइड (?)',
      reportBugBtn: 'समस्या बनी है? बग रिपोर्ट करें',
    },
    productionTour: {
      stepOfLabel: 'चरण {current} / {total}',
      previousBtn: 'पिछला',
      nextBtn: 'अगला',
      skipBtn: 'टूर छोड़ें',
      finishBtn: 'प्रोडक्शन शुरू करें',
      steps: [
        {
          title: 'Production Stage में स्वागत है',
          description: 'एक निरंतर पाइपलाइन: डायरेक्शन → शॉट्स → म्यूज़िक → रेफ़रेंस → प्री-विज़ → वीडियो → मिक्सर → स्ट्रीम्स और स्क्रीनिंग रूम।',
          tip: 'प्रोग्रेस डैशबोर्ड और Co-Director हमेशा अगला कदम दिखाते हैं।',
        },
        {
          title: 'चरण 1 — डायरेक्शन, शॉट्स और ऑडियो',
          description: 'Intelligent Assistant Director से स्क्रिप्ट निखारें, Audience Resonance (85+) चलाएँ, ऑडियो बनाएँ और आवाज़ें चुनें।',
          tip: 'प्री-विज़ के लिए पात्रों की आवाज़ और कम से कम एक रेफ़रेंस लॉक होना ज़रूरी है।',
        },
        {
          title: 'चरण 2 — प्री-विज़',
          description: 'Run All Agents से डायरेक्शन → ऑडियो → प्री-विज़ फ़्रेम बनाएँ और Screening Room में लाइव प्रीव्यू देखें।',
          tip: 'Screening Room लाइव प्रीव्यू है — फ़ाइनल MP4 एक्सपोर्ट से पहले समीक्षा करें।',
        },
        {
          title: 'चरण 3 — वीडियो क्लिप्स',
          description: 'स्टार्ट और एंड कीफ़्रेम से जुड़ी मोशन क्लिप बनाएँ। Standard और Creative मोड निरंतरता बनाए रखते हैं।',
          tip: 'मुख्य शॉट्स को एनिमेट करें और बाकी को डायनेमिक कीफ़्रेम रखकर 60% क्रेडिट बचाएँ।',
        },
        {
          title: 'चरण 4 — मिक्सर और स्ट्रीम्स',
          description: 'इलास्टिक ऑडियो टाइमिंग के साथ प्रीव्यू करें और Production Streams में WebM या MP4 एक्सपोर्ट करें।',
          tip: 'रेंडर के बाद Streams या सीधे Screening Room में चलाएँ।',
        },
        {
          title: 'चरण 5 — स्क्रीनिंग रूम और डिलीवरी',
          description: 'हर भाषा में Animatic या Video चुनें, बिना लॉगिन `/s/` लिंक शेयर करें और मास्टर डाउनलोड करें।',
          tip: 'शॉट या ऑडियो बदलने पर पुराने स्ट्रीम पर अपडेट बैज दिखता है।',
        },
        {
          title: 'चरण 6 — प्रगति ट्रैक करें',
          description: 'स्क्रिप्ट, ऑडियो, डायरेक्शन, फ़्रेम, वीडियो और रेंडर की स्थिति एक नज़र में देखें।',
          tip: 'हिंदी वीडियो टूर या JIT कोच के लिए कभी भी ? दबाएँ।',
        },
      ],
    },
  },

  zh: {
    isRtl: false,
    drawer: {
      pillPrefix: '即时指南',
      dismissPillTitle: '隐藏悬浮按钮（随时可按顶部 ? 打开即时帮助）',
      headerTitle: '工作室即时教练 (JIT)',
      headerSubtitle: '情境化指引、7 语种视频导览与实时问答',
      fullAcademyBtn: '完整学院',
      closeLabel: '关闭帮助',
      tabThisScreen: '当前页面',
      tabAskCoach: '询问教练',
      tabGuidedTour: '分步教程',
      tabSearch: '搜索',
      screenMapMode: '界面标注图',
      videoTourMode: '7 语种视频',
      replayTourBtn: '重播导览',
      replayTourTitle: '重新播放当前工作区的首次引导',
      headingVideoTour: '7 语种配音空间导览',
      headingScreenMap: '交互式界面标注图',
      headingQuickSteps: '立即可做（60 秒操作清单）',
      headingTroubleshooting: '10 秒排障（常见问题）',
      typicalUsageLabel: '典型消耗：',
      typicalTimePrefix: '预计用时：',
      searchPlaceholder: '搜索角色资产库、BYOK、机构协作、点数或配音…',
      searchHotspotsHeading: '匹配的界面控件',
      searchFaqsHeading: '排障解答',
      searchGuidesHeading: '工作室指南',
      searchEmptyTitle: '未找到匹配的指南',
      searchEmptyHint: '请尝试搜索 Continuity Vault、BYOK、Agency Ops 或 credits，或直接询问教练。',
      clearSearchBtn: '清除搜索',
      contactSupportLink: '联系技术支持',
      shortcutPrefix: '按',
      shortcutOr: '或',
      restorePillBtn: '恢复悬浮按钮',
      reportIssueBtn: '提交工单',
      openAcademyFooter: '打开工作室学院',
      coachTitle: '询问 SceneFlow 工作室教练',
      coachSubtitle: '严格基于最新套餐、路由、白标机构协作与官方排障文档回答。',
      coachPlaceholder: '输入问题（如“如何配置 Vertex AI BYOK？”或“多 PM 额度如何控制？”）',
      coachSendBtn: '提问',
      coachThinking: '正在检索工作室文档…',
      coachGroundedBadge: '基于实时官方文档生成',
      coachClearBtn: '清空对话',
      coachStillStuckBtn: '仍未解决？提交支持工单',
      coachPromptsByContext: {
        ...EN_COACH_PROMPTS,
        dashboard: [
          '我应该从 Blueprint Room 还是 Series Room 开始？',
          '如何安装 Mobile Companion 手机端 PWA？',
          '对比各套餐价格、点数与资产库存储空间',
        ],
        production: [
          '为什么静帧或视频片段生成失败或被拦截？',
          '如何在 Continuity Vault 中锁定角色面部一致性？',
          'Walk-Away Production Agent 自动制片如何运作？',
        ],
        'agency-ops': [
          '一键清理草稿 (1-Click Draft Purge) 如何节省存储？',
          '如何追踪多位 PM 的工作量、SLA 与项目毛利？',
          '0 消耗 QA Reviewer 审核角色拥有哪些权限？',
        ],
        billing: [
          '对比 Explorer、Hobbyist、Starter、Pro 与 Studio',
          '加购点数包与 Explorer 点数的有效期是多久？',
          '如何绑定我的 Google Vertex AI BYOK 密钥？',
        ],
      },
    },
    supportDialog: {
      titlePrefix: '提交',
      titleSuffix: '支持工单',
      topicLabel: '问题分类 / 工作区',
      noteLabelGeneral: '描述您遇到的问题或疑问',
      noteLabelError: '补充说明（可选）',
      notePlaceholderGeneral: '请告知您正在进行的操作、出现的情况及复现步骤…',
      notePlaceholderError: '例如：第 4 镜头重试两次后依然出现相同错误…',
      diagnosticsSummary: '自动附带诊断日志（已自动脱敏密钥与令牌）',
      cancelBtn: '取消',
      sendBtn: '提交给支持团队',
      sendingBtn: '提交中…',
      doneBtn: '完成',
      escalatedHeading: '已提交至 SceneFlow 客户支持',
      relayOfflineHeading: '工单已记录 — 邮件通道暂不可用',
      escalatedWithConfirm: '工程与支持团队已收到诊断日志，并已向您的邮箱发送含工单编号的确认回执。',
      escalatedBody: '工程与支持团队已收到您的诊断信息与错误日志，将尽快排查。',
      relayOfflineBodyPrefix: '您的工单已写入后台队列，但自动邮件通知暂不可用。如需加急处理，请发邮件至',
      emailFallbackBtnPrefix: '发送邮件至',
      referenceTicketLabel: '工单编号',
      copyIdBtn: '复制编号',
      copiedBtn: '已复制',
    },
    errorCard: {
      technicalDetailsSummary: '技术详情',
      troubleshootingGuideBtn: '排障指南 (?)',
      reportBugBtn: '仍未解决？上报平台缺陷',
    },
    productionTour: {
      stepOfLabel: '第 {current} / {total} 步',
      previousBtn: '上一步',
      nextBtn: '下一步',
      skipBtn: '跳过引导',
      finishBtn: '开始制片',
      steps: [
        {
          title: '欢迎进入 Production Stage',
          description: '一站式工业流程：导演指令 → 分镜 → 配乐 → 参考库 → 动态预演 → 视频生成 → 混音 → 成片流与放映室。',
          tip: '进度面板与 Co-Director 会始终提示您当前阶段与下一步。',
        },
        {
          title: '第 1 步 — 导演指令、分镜与配音',
          description: '使用 Intelligent Assistant Director 优化剧本，运行 Audience Resonance（目标 85+），生成语音并分配角色音色。',
          tip: '开始预演前请先分配角色声音并锁定至少一张参考图。',
        },
        {
          title: '第 2 步 — 动态预演 (Pre-Vis)',
          description: '使用 Run All Agents 自动完成指令、配音与预演静帧，并在 Screening Room 中实时审看与分享。',
          tip: 'Screening Room 为实时交互预览，可在导出 MP4 前验证节奏。',
        },
        {
          title: '第 3 步 — 视频片段生成',
          description: '基于首尾关键帧生成高一致性动态视频，支持 Standard 与 Creative 双引擎模式。',
          tip: '仅将核心动作镜头转为视频，对白反应保留动态关键帧，可节省约 60% 点数。',
        },
        {
          title: '第 4 步 — 混音器与成片流',
          description: '弹性时间轴实时对齐多语种配音，一键导出 WebM 或广播级 MP4 至 Production Streams。',
          tip: '渲染完成后可在 Streams 或 Screening Room 直接播放。',
        },
        {
          title: '第 5 步 — 放映室审片与交付',
          description: '按语种自由组合预演或视频流，生成免登录 `/s/` 客户审片链接并导出终版母带。',
          tip: '镜头或音频更新后，旧版流会自动显示“可更新”提醒。',
        },
        {
          title: '第 6 步 — 全局进度追踪',
          description: '一览剧本、音频、指令、关键帧、视频与渲染状态，点击任意场景立即跳转。',
          tip: '随时按 ? 打开即时教练或观看中文配音工作区导览。',
        },
      ],
    },
  },

  ar: {
    isRtl: true,
    drawer: {
      pillPrefix: 'دليل فوري',
      dismissPillTitle: 'إخفاء الزر العائم (يمكنك دائماً فتح المساعدة عبر ? في الأعلى)',
      headerTitle: 'المدرب الفوري للاستوديو',
      headerSubtitle: 'إرشادات سياقية، جولات بـ 7 لغات وإجابات فورية',
      fullAcademyBtn: 'الأكاديمية الكاملة',
      closeLabel: 'إغلاق المساعدة',
      tabThisScreen: 'هذه الشاشة',
      tabAskCoach: 'اسأل المدرب',
      tabGuidedTour: 'جولة إرشادية',
      tabSearch: 'بحث',
      screenMapMode: 'خريطة الشاشة',
      videoTourMode: 'فيديو 7 لغات',
      replayTourBtn: 'إعادة الجولة',
      replayTourTitle: 'إعادة عرض جولة التعريف الأولية لهذه الغرفة',
      headingVideoTour: 'جولة صوتية بـ 7 لغات',
      headingScreenMap: 'خريطة تفاعلية للشاشة',
      headingQuickSteps: 'ماذا تفعل الآن (قائمة 60 ثانية)',
      headingTroubleshooting: 'حلول في 10 ثوانٍ (أسئلة شائعة)',
      typicalUsageLabel: 'الاستهلاك المعتاد:',
      typicalTimePrefix: 'الوقت المتوقع:',
      searchPlaceholder: 'ابحث عن Continuity Vault، BYOK، Agency Ops، الرصيد أو الدبلجة…',
      searchHotspotsHeading: 'عناصر الشاشة المطابقة',
      searchFaqsHeading: 'إجابات استكشاف الأخطاء',
      searchGuidesHeading: 'أدلة الاستوديو',
      searchEmptyTitle: 'لم يتم العثور على أدلة مطابقة',
      searchEmptyHint: 'جرّب البحث عن Continuity Vault أو BYOK أو Agency Ops — أو اسأل المدرب.',
      clearSearchBtn: 'مسح البحث',
      contactSupportLink: 'تواصل مع الدعم',
      shortcutPrefix: 'اضغط',
      shortcutOr: 'أو',
      restorePillBtn: 'إظهار الزر العائم',
      reportIssueBtn: 'الإبلاغ عن مشكلة',
      openAcademyFooter: 'فتح أكاديمية الاستوديو',
      coachTitle: 'اسأل مدرب استوديو SceneFlow',
      coachSubtitle: 'مستند إلى الخطط الفعلية، المسارات، أدوات الوكالات وأدلة الحلول.',
      coachPlaceholder: 'اسأل أي شيء (مثل "كيف أربط مفتاح Vertex AI BYOK؟")',
      coachSendBtn: 'إرسال',
      coachThinking: 'جارٍ البحث في وثائق الاستوديو…',
      coachGroundedBadge: 'مستند إلى الوثائق الرسمية المباشرة',
      coachClearBtn: 'مسح المحادثة',
      coachStillStuckBtn: 'ما زلت بحاجة لمساعدة؟ افتح تذكرة دعم',
      coachPromptsByContext: EN_COACH_PROMPTS,
    },
    supportDialog: {
      titlePrefix: 'الإبلاغ عن مشكلة',
      titleSuffix: 'للدعم الفني',
      topicLabel: 'الموضوع / قسم الاستوديو',
      noteLabelGeneral: 'اشرح المشكلة أو الاستفسار',
      noteLabelError: 'أضف تفاصيل إضافية لفريق الدعم (اختياري)',
      notePlaceholderGeneral: 'أخبرنا بما كنت تفعله وما حدث وخطوات إعادة المشكلة…',
      notePlaceholderError: 'مثال: أعدت تشغيل اللقطة 4 مرتين وظهر نفس الخطأ…',
      diagnosticsSummary: 'التفاصيل التشخيصية المرفقة (تُزال المفاتيح السرية تلقائياً)',
      cancelBtn: 'إلغاء',
      sendBtn: 'إرسال للدعم',
      sendingBtn: 'جارٍ الإرسال…',
      doneBtn: 'تم',
      escalatedHeading: 'تم التصعيد إلى دعم عملاء SceneFlow',
      relayOfflineHeading: 'تم حفظ التذكرة — خدمة البريد غير متاحة حالياً',
      escalatedWithConfirm: 'استلم فريق الهندسة والدعم التشخيصات، وأرسلنا لك بريد تأكيد برقم التذكرة.',
      escalatedBody: 'استلم فريق الدعم السجلات التشخيصية لبدء التحقيق وحل المشكلة بسرعة.',
      relayOfflineBodyPrefix: 'تم حفظ تذكرتك في نظامنا، لكن إرسال البريد الآلي متوقف مؤقتاً. للحالات العاجلة راسل',
      emailFallbackBtnPrefix: 'مراسلة',
      referenceTicketLabel: 'رقم التذكرة المرجعي',
      copyIdBtn: 'نسخ الرقم',
      copiedBtn: 'تم النسخ',
    },
    errorCard: {
      technicalDetailsSummary: 'التفاصيل التقنية',
      troubleshootingGuideBtn: 'دليل الحلول (?)',
      reportBugBtn: 'ما زالت المشكلة قائمة؟ أبلغ عن خلل',
    },
    productionTour: {
      stepOfLabel: 'الخطوة {current} من {total}',
      previousBtn: 'السابق',
      nextBtn: 'التالي',
      skipBtn: 'تخطي الجولة',
      finishBtn: 'ابدأ الإنتاج',
      steps: [
        {
          title: 'مرحباً بك في Production Stage',
          description: 'مسار إنتاج متصل: الإخراج ← اللقطات ← الموسيقى ← المراجع ← المعاينة المسبقة ← الفيديو ← المازج ← التدفقات وغرفة العرض.',
          tip: 'لوحة التقدم والـ Co-Director يوضحان دائماً الخطوة التالية.',
        },
        {
          title: 'الخطوة 1 — الإخراج واللقطات والصوت',
          description: 'حسّن السيناريو مع Intelligent Assistant Director، شغّل Audience Resonance (هدف 85+)، أنشئ الصوت وخصص أصوات الشخصيات.',
          tip: 'تتطلب المعاينة المسبقة تعيين الأصوات ومرجعاً معتمداً واحداً على الأقل.',
        },
        {
          title: 'الخطوة 2 — المعاينة المسبقة (Pre-Vis)',
          description: 'استخدم Run All Agents لتوليد الإخراج والصوت وإطارات المعاينة، ثم راجعها مباشرة في Screening Room.',
          tip: 'غرفة العرض للمعاينة الحية قبل التصدير النهائي إلى MP4.',
        },
        {
          title: 'الخطوة 3 — مقاطع الفيديو',
          description: 'أنشئ مقاطع حركة مرتبطة بإطاري البداية والنهاية مع خيارات Standard وCreative.',
          tip: 'حرّك اللقطات الرئيسية وأبقِ لقطات رد الفعل كإطارات ديناميكية لتوفير حتى 60% من الرصيد.',
        },
        {
          title: 'الخطوة 4 — المازج وتدفقات الإنتاج',
          description: 'عاين التوقيت الصوتي المرن وصدّر ملفات WebM أو MP4 الاحترافية إلى Production Streams.',
          tip: 'بعد التصيير يمكنك التشغيل من Streams أو مباشرة من Screening Room.',
        },
        {
          title: 'الخطوة 5 — غرفة العرض والتسليم',
          description: 'اختر نسخة Animatic أو Video لكل لغة، شارك روابط `/s/` دون تسجيل دخول، وصدّر النسخة النهائية.',
          tip: 'تظهر شارة التحديث عند تعديل أي لقطة أو مسار صوتي.',
        },
        {
          title: 'الخطوة 6 — متابعة التقدم والجودة',
          description: 'راقب السيناريو والصوت والإخراج والإطارات والفيديو والتصيير في لمحة واحدة.',
          tip: 'اضغط ? في أي وقت لفتح المدرب الفوري أو مشاهدة الجولة الصوتية بالعربية.',
        },
      ],
    },
  },

  th: {
    isRtl: false,
    drawer: {
      pillPrefix: 'คู่มือ JIT',
      dismissPillTitle: 'ซ่อนปุ่มลอย (กด ? ที่แถบด้านบนเพื่อเปิดความช่วยเหลือได้ตลอดเวลา)',
      headerTitle: 'โค้ชสตูดิโอแบบทันที (JIT)',
      headerSubtitle: 'คำแนะนำตามหน้าจอ วิดีโอทัวร์ 7 ภาษา และคำตอบทันที',
      fullAcademyBtn: 'เปิด Academy เต็มรูปแบบ',
      closeLabel: 'ปิดหน้าต่างช่วยเหลือ',
      tabThisScreen: 'หน้านี้',
      tabAskCoach: 'ถามโค้ช',
      tabGuidedTour: 'บทเรียนนำทาง',
      tabSearch: 'ค้นหา',
      screenMapMode: 'แผนผังหน้าจอ',
      videoTourMode: 'วิดีโอ 7 ภาษา',
      replayTourBtn: 'ดูทัวร์อีกครั้ง',
      replayTourTitle: 'เปิดคำแนะนำเริ่มต้นของห้องนี้อีกครั้ง',
      headingVideoTour: 'วิดีโอทัวร์พร้อมเสียงพากย์ 7 ภาษา',
      headingScreenMap: 'แผนผังหน้าจอแบบโต้ตอบ',
      headingQuickSteps: 'สิ่งที่ควรทำตอนนี้ (เช็กลิสต์ 60 วินาที)',
      headingTroubleshooting: 'แก้ปัญหาใน 10 วินาที (คำถามพบบ่อย)',
      typicalUsageLabel: 'การใช้งานโดยทั่วไป:',
      typicalTimePrefix: 'เวลาโดยประมาณ:',
      searchPlaceholder: 'ค้นหา Continuity Vault, BYOK, Agency Ops, เครดิต หรือเสียงพากย์…',
      searchHotspotsHeading: 'ปุ่มควบคุมบนหน้าจอ',
      searchFaqsHeading: 'คำตอบแก้ปัญหา',
      searchGuidesHeading: 'คู่มือสตูดิโอ',
      searchEmptyTitle: 'ไม่พบคู่มือที่ตรงกับคำค้นหา',
      searchEmptyHint: 'ลองค้นหา Continuity Vault, BYOK, Agency Ops หรือ credits — หรือถามโค้ชสตูดิโอ',
      clearSearchBtn: 'ล้างการค้นหา',
      contactSupportLink: 'ติดต่อทีมซัพพอร์ต',
      shortcutPrefix: 'กด',
      shortcutOr: 'หรือ',
      restorePillBtn: 'แสดงปุ่มลอยอีกครั้ง',
      reportIssueBtn: 'แจ้งปัญหา',
      openAcademyFooter: 'เปิด Studio Academy',
      coachTitle: 'ถามโค้ชสตูดิโอ SceneFlow',
      coachSubtitle: 'ตอบจากข้อมูลแพ็กเกจจริง เส้นทางหน้าจอ เครื่องมือเอเจนซี่ และคู่มือแก้ปัญหา',
      coachPlaceholder: 'พิมพ์คำถามได้เลย (เช่น "เชื่อมต่อ Vertex AI BYOK ยังไง?" หรือ "จำกัดเครดิต PM ยังไง?")',
      coachSendBtn: 'ถาม',
      coachThinking: 'กำลังค้นหาข้อมูลสตูดิโอ…',
      coachGroundedBadge: 'อ้างอิงจากเอกสารทางการล่าสุด',
      coachClearBtn: 'ล้างแชท',
      coachStillStuckBtn: 'ยังติดปัญหาอยู่ไหม? เปิดทิกเก็ตซัพพอร์ต',
      coachPromptsByContext: {
        ...EN_COACH_PROMPTS,
        dashboard: [
          'ควรเริ่มที่ Blueprint Room หรือ Series Room ดี?',
          'ติดตั้งแอป Mobile Companion PWA ยังไง?',
          'เปรียบเทียบแพ็กเกจ เครดิต และพื้นที่ Vault',
        ],
        production: [
          'ทำไมภาพนิ่งหรือคลิปวิดีโอล้มเหลวหรือถูกบล็อก?',
          'ล็อกใบหน้าตัวละครใน Continuity Vault ยังไง?',
          'Production Agent แบบอัตโนมัติทำงานยังไง?',
        ],
        'agency-ops': [
          '1-Click Draft Purge ช่วยประหยัดพื้นที่ Vault ยังไง?',
          'ติดตามงาน PM, SLA และกำไรใน Agency Ops ยังไง?',
          'บทบาท QA Reviewer (0 เครดิต) ทำอะไรได้บ้าง?',
        ],
        billing: [
          'เปรียบเทียบ Explorer, Hobbyist, Starter, Pro และ Studio',
          'เครดิต Add-On และเครดิต Explorer มีอายุนานเท่าไร?',
          'เชื่อมต่อคีย์ Google Vertex AI BYOK ยังไง?',
        ],
      },
    },
    supportDialog: {
      titlePrefix: 'แจ้งปัญหา',
      titleSuffix: 'ไปยังทีมซัพพอร์ต',
      topicLabel: 'หัวข้อ / ส่วนของสตูดิโอ',
      noteLabelGeneral: 'อธิบายปัญหาหรือคำถามของคุณ',
      noteLabelError: 'เพิ่มรายละเอียดให้ทีมซัพพอร์ต (ไม่บังคับ)',
      notePlaceholderGeneral: 'บอกเราว่าคุณกำลังทำอะไร เกิดอะไรขึ้น และขั้นตอนการเกิดปัญหา…',
      notePlaceholderError: 'เช่น ลองเรนเดอร์ช็อต 4 ซ้ำสองครั้งแล้วยังเจอข้อผิดพลาดเดิม…',
      diagnosticsSummary: 'ข้อมูลวินิจฉัยที่แนบไปด้วย (ระบบลบคีย์ลับและโทเคนให้อัตโนมัติ)',
      cancelBtn: 'ยกเลิก',
      sendBtn: 'ส่งให้ทีมซัพพอร์ต',
      sendingBtn: 'กำลังส่ง…',
      doneBtn: 'เสร็จสิ้น',
      escalatedHeading: 'ส่งเรื่องให้ทีมซัพพอร์ต SceneFlow แล้ว',
      relayOfflineHeading: 'บันทึกทิกเก็ตแล้ว — ระบบอีเมลขัดข้องชั่วคราว',
      escalatedWithConfirm: 'ทีมวิศวกรและซัพพอร์ตได้รับข้อมูลวินิจฉัยแล้ว และเราส่งอีเมลยืนยันพร้อมรหัสทิกเก็ตให้คุณแล้ว',
      escalatedBody: 'ทีมวิศวกรได้รับข้อมูลวินิจฉัยและบันทึกข้อผิดพลาดเพื่อดำเนินการตรวจสอบโดยเร็ว',
      relayOfflineBodyPrefix: 'ทิกเก็ตของคุณถูกบันทึกในระบบแล้ว แต่ระบบส่งอีเมลอัตโนมัติกำลังออฟไลน์ หากเร่งด่วนโปรดส่งอีเมลไปที่',
      emailFallbackBtnPrefix: 'ส่งอีเมลถึง',
      referenceTicketLabel: 'รหัสทิกเก็ตอ้างอิง',
      copyIdBtn: 'คัดลอกรหัส',
      copiedBtn: 'คัดลอกแล้ว',
    },
    errorCard: {
      technicalDetailsSummary: 'รายละเอียดทางเทคนิค',
      troubleshootingGuideBtn: 'คู่มือแก้ปัญหา (?)',
      reportBugBtn: 'ยังแก้ไม่ได้? แจ้งบั๊กแพลตฟอร์ม',
    },
    productionTour: {
      stepOfLabel: 'ขั้นตอน {current} จาก {total}',
      previousBtn: 'ก่อนหน้า',
      nextBtn: 'ถัดไป',
      skipBtn: 'ข้ามทัวร์',
      finishBtn: 'เริ่มผลิตงาน',
      steps: [
        {
          title: 'ยินดีต้อนรับสู่ Production Stage',
          description: 'ขั้นตอนต่อเนื่องครบวงจร: กำกับฉาก → ช็อต → ดนตรี → อ้างอิง → Pre-Vis → วิดีโอ → มิกเซอร์ → Streams และ Screening Room',
          tip: 'แดชบอร์ดความคืบหน้าและ Co-Director จะแสดงขั้นตอนถัดไปเสมอ',
        },
        {
          title: 'ขั้นที่ 1 — กำกับฉาก ช็อต และเสียง',
          description: 'ขัดเกลาบทด้วย Intelligent Assistant Director ทำคะแนน Audience Resonance (เป้า 85+) สร้างเสียง และกำหนดเสียงตัวละคร',
          tip: 'Pre-Vis ต้องมีเสียงตัวละครและภาพอ้างอิงอย่างน้อยหนึ่งรายการในคลังอ้างอิง',
        },
        {
          title: 'ขั้นที่ 2 — Pre-Vis',
          description: 'ใช้ Run All Agents สร้างกำกับฉาก → เสียง → เฟรม Pre-Vis แล้วตรวจงานสดใน Screening Room หรือแชร์ให้ลูกค้าอนุมัติ',
          tip: 'Screening Room เป็นพรีวิวสดก่อนส่งออกไฟล์ MP4 จริง',
        },
        {
          title: 'ขั้นที่ 3 — คลิปวิดีโอ',
          description: 'สร้างคลิปเคลื่อนไหวโดยยึดเฟรมเริ่มต้นและสิ้นสุดจาก Pre-Vis รองรับทั้งโหมด Standard และ Creative',
          tip: 'ทำวิดีโอเฉพาะช็อตไฮไลต์และคงช็อตบทสนทนาเป็นคีย์เฟรมเคลื่อนไหวเพื่อประหยัดเครดิตได้ถึง 60%',
        },
        {
          title: 'ขั้นที่ 4 — มิกเซอร์และ Production Streams',
          description: 'พรีวิวจังหวะเสียงแบบยืดหยุ่นและเรนเดอร์ WebM หรือ MP4 คุณภาพออกอากาศลงใน Production Streams',
          tip: 'หลังเรนเดอร์เสร็จสามารถเล่นใน Streams หรือ Screening Room ได้ทันที',
        },
        {
          title: 'ขั้นที่ 5 — Screening Room และส่งมอบงาน',
          description: 'เลือกสตรีม Animatic หรือ Video แยกตามภาษา แชร์ลิงก์ `/s/` แบบไม่ต้องล็อกอิน และดาวน์โหลดมาสเตอร์',
          tip: 'หากมีการแก้ไขช็อตหรือเสียง ระบบจะแจ้งเตือนให้รีเรนเดอร์สตรีมที่ล้าสมัย',
        },
        {
          title: 'ขั้นที่ 6 — ติดตามความคืบหน้าและ QA',
          description: 'ติดตามบท เสียง กำกับ เฟรม วิดีโอ และการเรนเดอร์ได้ในหน้าเดียว คลิกซีนใดก็ได้เพื่อข้ามไปทันที',
          tip: 'กด ? ได้ทุกเมื่อเพื่อเปิดโค้ช JIT หรือชมวิดีโอทัวร์พากย์ไทย',
        },
      ],
    },
  },
}

export function getHelpUiCopy(locale?: string | null): HelpUiLocaleCopy {
  const normalized = normalizeWalkthroughDubLocale(locale || 'en')
  return HELP_UI_COPY[normalized] ?? HELP_UI_COPY.en
}
