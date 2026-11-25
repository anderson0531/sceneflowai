export type ClientPortalLocale =
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

export const SUPPORTED_CLIENT_PORTAL_LOCALES: Array<{
  code: ClientPortalLocale
  label: string
  speechLang: string
}> = [
  { code: 'en', label: 'English', speechLang: 'en-US' },
  { code: 'es', label: 'Español', speechLang: 'es-ES' },
  { code: 'pt', label: 'Português', speechLang: 'pt-BR' },
  { code: 'hi', label: 'हिन्दी', speechLang: 'hi-IN' },
  { code: 'zh-CN', label: '中文 (简体)', speechLang: 'zh-CN' },
  { code: 'ar', label: 'العربية', speechLang: 'ar-SA' },
  { code: 'th', label: 'ภาษาไทย', speechLang: 'th-TH' },
  { code: 'ja', label: '日本語', speechLang: 'ja-JP' },
  { code: 'ko', label: '한국어', speechLang: 'ko-KR' },
  { code: 'de', label: 'Deutsch', speechLang: 'de-DE' },
  { code: 'fr', label: 'Français', speechLang: 'fr-FR' },
  { code: 'it', label: 'Italiano', speechLang: 'it-IT' },
  { code: 'nl', label: 'Nederlands', speechLang: 'nl-NL' },
  { code: 'ru', label: 'Русский', speechLang: 'ru-RU' },
]

export function resolveClientPortalLocale(raw?: string | null): ClientPortalLocale {
  if (!raw) return 'en'
  const clean = raw.trim().toLowerCase()
  if (clean.startsWith('es')) return 'es'
  if (clean.startsWith('pt')) return 'pt'
  if (clean.startsWith('hi')) return 'hi'
  if (clean.startsWith('zh')) return 'zh-CN'
  if (clean.startsWith('ar')) return 'ar'
  if (clean.startsWith('th')) return 'th'
  if (clean.startsWith('ja')) return 'ja'
  if (clean.startsWith('ko')) return 'ko'
  if (clean.startsWith('de')) return 'de'
  if (clean.startsWith('fr')) return 'fr'
  if (clean.startsWith('it')) return 'it'
  if (clean.startsWith('nl')) return 'nl'
  if (clean.startsWith('ru')) return 'ru'
  return 'en'
}

export function getSpeechLangForPortalLocale(locale: ClientPortalLocale): string {
  return (
    SUPPORTED_CLIENT_PORTAL_LOCALES.find((l) => l.code === locale)?.speechLang || 'en-US'
  )
}

export function getPortalLocaleLabel(locale: ClientPortalLocale): string {
  return (
    SUPPORTED_CLIENT_PORTAL_LOCALES.find((l) => l.code === locale)?.label || 'English'
  )
}

export function toBlueprintReviewLanguageCode(locale: ClientPortalLocale): string {
  return locale === 'zh-CN' ? 'zh' : locale
}

export interface ClientPortalStrings {
  producedBy: string
  consentTitle: string
  consentSubtitle: string
  yourName: string
  yourEmail: string
  mediaRightsLabel: string
  zeroPrivityLabel: string
  acceptAndBegin: string
  tapMicToSpeak: string
  stopRecording: string
  tellYourStoryPlaceholder: string
  typeOrSpeakPlaceholder: string
  resonatingBeatsTitle: string
  resonatingBeatsSubtitle: string
  beatKeyPeopleLabel: string
  sendAnswer: string
  finishAndCreateBlueprint: string
  completingBlueprint: string
  interviewCompletedTitle: string
  interviewCompletedBody: string
  questionProgress: string
  roundBadge: string
  roundLimitReached: string
  approveBlueprint: string
  blueprintApproved: string
  submitRevisionNotes: string
  continuityPortalTitle: string
  continuityPortalSubtitle: string
  uploadReferencePhoto: string
  uploadingPhoto: string
  photoUploadedClean: string
  charactersHeading: string
  locationsHeading: string
  propsHeading: string
  approveItem: string
  needsAdjustment: string
  submitContinuityReview: string
  approveFinalVideo: string
  requestVideoRevision: string
  watermarkPreviewNotice: string
  clientQuotePanelTitle: string
  clientQuotePanelSubtitle: string
  clientRetailPrice: string
  includedRevisions: string
  hybridAiVideoMix: string
  estimatedSceneFlowCogs: string
  estimatedNetProfit: string
  applyProjectCeiling: string
  visionStepBadge: string
  visionQuestionTitle: string
  visionQuestionSubtitle: string
  visionInputPlaceholder: string
  visionRefinementPlaceholder: string
  clarifyVisionButton: string
  updateVisionButton: string
  confirmVisionButton: string
  editVisionButton: string
  proposedVisionHeading: string
  confirmedVisionHeading: string
  visionImpactLabel: string
  visionAudienceLabel: string
  visionStyleLabel: string
  visionPassesRemaining: string
  discoveredPeopleTitle: string
  beatImpactLabel: string
  characterRoleLabel: string
  characterImpactLabel: string
  completenessReadyLabel: string
  completenessGatheringLabel: string
  submitEarlyButton: string
  languageLabel: string
  listeningInLanguage: string
  wardrobesHeading: string
  cameraSnapLabel: string
  referencePhotoNeeded: string
  uploadedPhotosCount: string
  slotRevisionPlaceholder: string
  overallContinuityNoteLabel: string
  overallContinuityNotePlaceholder: string
  pronunciationGuideLabel: string
  pronunciationGuidePlaceholder: string
  continuityApprovedBanner: string
  continuityChangesSentBanner: string
  blueprintReviewHeading: string
  blueprintListenOnlyHeading: string
  sectionCoreLabel: string
  sectionStoryLabel: string
  sectionCharactersLabel: string
  sectionBeatsLabel: string
  sectionToneLabel: string
  listenButtonLabel: string
  playNarratedStoryboard: string
  stopStoryboardPlayback: string
  joinToLeaveFeedbackTitle: string
  joinToLeaveFeedbackBody: string
  continueButton: string
  yourReviewTab: string
  teamChatTab: string
  overallRatingLabel: string
  sectionFeedbackHeading: string
  sectionNotesPlaceholder: string
  freeformNotesPlaceholder: string
  chatInputPlaceholder: string
  sendButton: string
  submitReviewButton: string
  feedbackSubmittedTitle: string
  blueprintApprovedNextSteps: string
  photoRequestedBadge: string
  photoOptionalBadge: string
  screeningNotesPlaceholder: string
  viewStudioTerms: string
  visionGenreLabel: string
}

export const CLIENT_PORTAL_COPY: Record<ClientPortalLocale, ClientPortalStrings> = {
  en: {
    producedBy: 'Produced by {brand}',
    consentTitle: 'Before We Begin Your Project',
    consentSubtitle:
      'Please confirm permissions and service terms for the creative ideas, stories, and reference media you share.',
    yourName: 'Your Full Name',
    yourEmail: 'Your Email (optional)',
    mediaRightsLabel:
      'I confirm that I own or hold the necessary rights and permissions for all creative concepts, stories, names, likenesses, and reference media submitted here.',
    zeroPrivityLabel:
      'I understand that {brand} is my sole production service provider responsible for pricing, delivery, and support, and underlying software providers assume no direct liability.',
    acceptAndBegin: 'Agree & Start Interview',
    tapMicToSpeak: 'Tap Microphone to Speak',
    stopRecording: 'Stop Microphone',
    tellYourStoryPlaceholder:
      'Share your answer in detail — key characters, motivations, pivotal scenes or events, visual settings, and how they bring your vision to life (or tap the microphone to speak)...',
    typeOrSpeakPlaceholder: 'Share your answer here, or tap the microphone to speak naturally...',
    resonatingBeatsTitle: 'Key Story Beats & Characters',
    resonatingBeatsSubtitle:
      'Refined live as we clarify characters, roles, key scenes, and their impact on your vision',
    beatKeyPeopleLabel: 'Characters:',
    sendAnswer: 'Send Answer',
    finishAndCreateBlueprint: 'Finish Interview & Build Blueprint',
    completingBlueprint: 'Synthesizing your vision and interview into a production Blueprint...',
    interviewCompletedTitle: 'Thank You — Your Project Blueprint Is Ready for Your Producer',
    interviewCompletedBody:
      '{brand} has been notified and will share your custom Blueprint & Continuity checklist shortly.',
    questionProgress: 'Step {current} of {max}',
    roundBadge: 'Revision Round {used} of {max}',
    roundLimitReached:
      'Included revision rounds are complete. Please contact {brand} if you would like to add an extra revision package.',
    approveBlueprint: 'Approve Blueprint',
    blueprintApproved: 'Blueprint Approved',
    submitRevisionNotes: 'Submit Revision Notes',
    continuityPortalTitle: 'Visual Continuity & Photo Collection',
    continuityPortalSubtitle:
      'Upload real photos (people, places, or key items) and approve visual references for your production.',
    uploadReferencePhoto: 'Upload or Snap Photo',
    uploadingPhoto: 'Securing & optimizing photo...',
    photoUploadedClean: 'Photo uploaded (location metadata stripped for privacy)',
    charactersHeading: 'People & Cast',
    locationsHeading: 'Places & Settings',
    propsHeading: 'Keepsakes, Products & Props',
    approveItem: 'Approve',
    needsAdjustment: 'Request Change',
    submitContinuityReview: 'Submit Continuity Approval',
    approveFinalVideo: 'Approve Screening',
    requestVideoRevision: 'Submit Screening Notes',
    watermarkPreviewNotice: 'Client Review Preview — Produced by {brand}',
    clientQuotePanelTitle: 'Service Provider Quote & Margin Planner',
    clientQuotePanelSubtitle:
      'Model client pricing, Hybrid Archival/AI mix, revision buffers, and project credit caps.',
    clientRetailPrice: 'Client Price (USD)',
    includedRevisions: 'Included Revision Rounds',
    hybridAiVideoMix: 'AI Video Re-enactment Share',
    estimatedSceneFlowCogs: 'Est. Credit Cost (with buffer)',
    estimatedNetProfit: 'Est. Provider Profit',
    applyProjectCeiling: 'Set Credit Ceiling ({credits} cr)',
    visionStepBadge: 'Step 1 • Project Vision',
    visionQuestionTitle: "What's your vision for this project?",
    visionQuestionSubtitle:
      'Share as much detail as helpful — who this video is for, the occasion or goal, the feeling or takeaway you want viewers to experience, and any visual or tonal inspiration.',
    visionInputPlaceholder:
      'Describe your overall vision in detail — purpose, audience, emotional or business goal, tone, and approximate length (or tap the microphone to speak)...',
    visionRefinementPlaceholder:
      'Answer the question above or share any adjustments to refine your project vision...',
    clarifyVisionButton: 'Clarify Vision',
    updateVisionButton: 'Update Clarification',
    confirmVisionButton: 'Confirm Vision & Start Interview',
    editVisionButton: 'Edit Vision',
    proposedVisionHeading: 'Clarified Project Vision (Review & Confirm)',
    confirmedVisionHeading: 'Confirmed Project Vision',
    visionImpactLabel: 'Intended Impact:',
    visionAudienceLabel: 'Audience & Context:',
    visionStyleLabel: 'Tone & Visual Style:',
    visionPassesRemaining: 'Clarification pass {used} of {max}',
    discoveredPeopleTitle: 'Characters & Subjects — Roles & Impact',
    beatImpactLabel: 'Impact:',
    characterRoleLabel: 'Role:',
    characterImpactLabel: 'Impact:',
    completenessReadyLabel: 'Discovery Complete ({score}%) — Ready to Build Blueprint',
    completenessGatheringLabel: 'Gathering Characters & Key Events ({score}%)',
    submitEarlyButton: 'Submit early with current details',
    languageLabel: 'Language',
    listeningInLanguage: 'Listening in {lang} — speak naturally, then tap Stop',
    wardrobesHeading: 'Wardrobes & Looks',
    cameraSnapLabel: 'Camera',
    referencePhotoNeeded: 'Reference photo needed — upload from your gallery or camera below.',
    uploadedPhotosCount: 'Uploaded photos ({count})',
    slotRevisionPlaceholder: 'Type or tap the microphone to describe wardrobe, era, angle, or adjustment needed...',
    overallContinuityNoteLabel: 'Overall Continuity Notes (optional)',
    overallContinuityNotePlaceholder: 'Type or tap the microphone to share overall notes for your producer...',
    pronunciationGuideLabel: '10-Second Pronunciation Guide (optional — names, towns, or brands)',
    pronunciationGuidePlaceholder: 'Example: Kowalski = koh-VAHL-skee; Siobhan = shih-VAWN (type or tap mic)...',
    continuityApprovedBanner: 'Continuity Approved — Production Ready',
    continuityChangesSentBanner: 'Continuity Feedback Sent to {brand}',
    blueprintReviewHeading: 'Blueprint Review',
    blueprintListenOnlyHeading: 'Blueprint · Listen Only',
    sectionCoreLabel: 'Core',
    sectionStoryLabel: 'Story',
    sectionCharactersLabel: 'Cast & Continuity',
    sectionBeatsLabel: 'Chapters & Storyboard',
    sectionToneLabel: 'Tone & Style',
    listenButtonLabel: 'Listen',
    playNarratedStoryboard: 'Play Narrated Storyboard',
    stopStoryboardPlayback: 'Stop Playback',
    joinToLeaveFeedbackTitle: 'Join to Leave Feedback',
    joinToLeaveFeedbackBody: 'Read and listen above, then enter your name to rate sections, type or dictate notes, and message {owner}.',
    continueButton: 'Continue',
    yourReviewTab: 'Your Review',
    teamChatTab: 'Messages',
    overallRatingLabel: 'Overall Rating',
    sectionFeedbackHeading: 'Your feedback on {section}',
    sectionNotesPlaceholder: 'Type or tap the microphone to dictate notes for this section (optional)...',
    freeformNotesPlaceholder: 'Anything else? Type or tap the microphone to speak (optional)...',
    chatInputPlaceholder: 'Write or dictate a message...',
    sendButton: 'Send',
    submitReviewButton: 'Submit Review',
    feedbackSubmittedTitle: 'Thanks — your feedback was sent.',
    blueprintApprovedNextSteps: 'Thank you! {brand} has been notified that you approved this Blueprint. If reference photos are needed for key people, places, or keepsakes, your producer will share a private upload link before starting Production.',
    photoRequestedBadge: 'Photo Requested After Approval',
    photoOptionalBadge: 'Reference Photo Optional',
    screeningNotesPlaceholder: 'Type or dictate chapter / timestamp revision notes...',
    viewStudioTerms: 'Review {brand} Service Terms',
    visionGenreLabel: 'Genre & Format:',
  },
  es: {
    producedBy: 'Producido por {brand}',
    consentTitle: 'Antes de Comenzar su Proyecto',
    consentSubtitle:
      'Confirme los permisos y términos del servicio sobre las ideas creativas, historias y materiales de referencia que comparta.',
    yourName: 'Su Nombre Completo',
    yourEmail: 'Su Correo Electrónico (opcional)',
    mediaRightsLabel:
      'Confirmo que poseo o cuento con los derechos y autorizaciones necesarios sobre todos los conceptos creativos, historias, nombres, imágenes y materiales enviados.',
    zeroPrivityLabel:
      'Entiendo que {brand} es mi único proveedor de producción responsable de precios, entregas y soporte, sin responsabilidad directa de los proveedores de software subyacentes.',
    acceptAndBegin: 'Aceptar e Iniciar Entrevista',
    tapMicToSpeak: 'Tocar Micrófono para Hablar',
    stopRecording: 'Detener Micrófono',
    tellYourStoryPlaceholder:
      'Comparta su respuesta en detalle: personajes principales, motivaciones, escenas o eventos decisivos, escenarios y cómo impulsan su visión (o use el micrófono)...',
    typeOrSpeakPlaceholder: 'Escriba su respuesta o toque el micrófono para hablar con naturalidad...',
    resonatingBeatsTitle: 'Escenas Clave y Personajes',
    resonatingBeatsSubtitle:
      'Se actualiza en vivo mientras definimos personajes, roles, eventos clave y su impacto en la visión',
    beatKeyPeopleLabel: 'Personajes:',
    sendAnswer: 'Enviar Respuesta',
    finishAndCreateBlueprint: 'Finalizar Entrevista y Crear Propuesta',
    completingBlueprint: 'Integrando su visión y entrevista en el plan de producción...',
    interviewCompletedTitle: 'Gracias — El Plan de su Proyecto Fue Enviado al Productor',
    interviewCompletedBody:
      '{brand} ha recibido una notificación y compartirá pronto su propuesta y galería de continuidad.',
    questionProgress: 'Paso {current} de {max}',
    roundBadge: 'Ronda de Revisión {used} de {max}',
    roundLimitReached:
      'Las rondas de revisión incluidas se han completado. Contacte a {brand} para solicitar rondas adicionales.',
    approveBlueprint: 'Aprobar Propuesta',
    blueprintApproved: 'Propuesta Aprobada',
    submitRevisionNotes: 'Enviar Notas de Revisión',
    continuityPortalTitle: 'Continuidad Visual y Carga de Fotos',
    continuityPortalSubtitle:
      'Suba fotografías reales (personas, lugares u objetos clave) y apruebe las referencias visuales.',
    uploadReferencePhoto: 'Subir o Tomar Foto',
    uploadingPhoto: 'Protegiendo y optimizando foto...',
    photoUploadedClean: 'Foto cargada (metadatos GPS eliminados por privacidad)',
    charactersHeading: 'Personas y Elenco',
    locationsHeading: 'Lugares y Escenarios',
    propsHeading: 'Recuerdos, Productos y Objetos',
    approveItem: 'Aprobar',
    needsAdjustment: 'Solicitar Ajuste',
    submitContinuityReview: 'Enviar Aprobación de Continuidad',
    approveFinalVideo: 'Aprobar Proyección',
    requestVideoRevision: 'Enviar Notas de Proyección',
    watermarkPreviewNotice: 'Vista Previa para Cliente — Producido por {brand}',
    clientQuotePanelTitle: 'Cotizador y Margen para Proveedores',
    clientQuotePanelSubtitle:
      'Calcule precio al cliente, mezcla Híbrida fotos/IA, rondas de revisión y límite de créditos.',
    clientRetailPrice: 'Precio al Cliente (USD)',
    includedRevisions: 'Rondas de Revisión Incluidas',
    hybridAiVideoMix: 'Porcentaje de Video IA',
    estimatedSceneFlowCogs: 'Costo Est. de Créditos (con margen)',
    estimatedNetProfit: 'Ganancia Est. del Proveedor',
    applyProjectCeiling: 'Fijar Tope de Créditos ({credits} cr)',
    visionStepBadge: 'Paso 1 • Visión del Proyecto',
    visionQuestionTitle: '¿Cuál es su visión para este proyecto?',
    visionQuestionSubtitle:
      'Comparta tantos detalles como sea necesario: para quién es este video, la ocasión o meta, el impacto emocional o comercial deseado y el estilo visual.',
    visionInputPlaceholder:
      'Describa su visión general con detalle: propósito, audiencia, impacto deseado, tono y duración aproximada (o use el micrófono)...',
    visionRefinementPlaceholder:
      'Responda la pregunta anterior o agregue ajustes para afinar la visión del proyecto...',
    clarifyVisionButton: 'Clarificar Visión',
    updateVisionButton: 'Actualizar Clarificación',
    confirmVisionButton: 'Confirmar Visión e Iniciar Entrevista',
    editVisionButton: 'Editar Visión',
    proposedVisionHeading: 'Visión Clarificada (Revisar y Confirmar)',
    confirmedVisionHeading: 'Visión del Proyecto Confirmada',
    visionImpactLabel: 'Impacto Deseado:',
    visionAudienceLabel: 'Audiencia y Contexto:',
    visionStyleLabel: 'Tono y Estilo Visual:',
    visionPassesRemaining: 'Ronda de clarificación {used} de {max}',
    discoveredPeopleTitle: 'Personajes y Sujetos — Roles e Impacto',
    beatImpactLabel: 'Impacto:',
    characterRoleLabel: 'Rol:',
    characterImpactLabel: 'Impacto:',
    completenessReadyLabel: 'Descubrimiento Completo ({score}%) — Listo para Crear Guion',
    completenessGatheringLabel: 'Recopilando Personajes y Eventos Clave ({score}%)',
    submitEarlyButton: 'Enviar anticipadamente con los detalles actuales',
    languageLabel: 'Idioma',
    listeningInLanguage: 'Escuchando en {lang} — hable con naturalidad y toque Detener',
    wardrobesHeading: 'Vestuario y Estilos',
    cameraSnapLabel: 'Cámara',
    referencePhotoNeeded: 'Se necesita foto de referencia — suba desde su galería o cámara abajo.',
    uploadedPhotosCount: 'Fotos cargadas ({count})',
    slotRevisionPlaceholder: 'Escriba o use el micrófono para describir vestuario, época, ángulo o ajuste...',
    overallContinuityNoteLabel: 'Notas Generales de Continuidad (opcional)',
    overallContinuityNotePlaceholder: 'Escriba o use el micrófono para compartir notas generales con su productor...',
    pronunciationGuideLabel: 'Guía Rápida de Pronunciación (opcional — apellidos, lugares o marcas)',
    pronunciationGuidePlaceholder: 'Ejemplo: Kowalski = ko-VAL-ski; apellidos o pueblos poco comunes...',
    continuityApprovedBanner: 'Continuidad Aprobada — Lista para Producción',
    continuityChangesSentBanner: 'Notas de Continuidad Enviadas a {brand}',
    blueprintReviewHeading: 'Revisión de Propuesta',
    blueprintListenOnlyHeading: 'Propuesta · Solo Escucha',
    sectionCoreLabel: 'Concepto',
    sectionStoryLabel: 'Historia',
    sectionCharactersLabel: 'Elenco y Continuidad',
    sectionBeatsLabel: 'Capítulos y Storyboard',
    sectionToneLabel: 'Tono y Estilo',
    listenButtonLabel: 'Escuchar',
    playNarratedStoryboard: 'Reproducir Storyboard Narrado',
    stopStoryboardPlayback: 'Detener Reproducción',
    joinToLeaveFeedbackTitle: 'Ingrese su Nombre para Comentar',
    joinToLeaveFeedbackBody: 'Lea y escuche arriba; ingrese su nombre para calificar secciones, escribir o dictar notas y enviar mensajes a {owner}.',
    continueButton: 'Continuar',
    yourReviewTab: 'Su Revisión',
    teamChatTab: 'Mensajes',
    overallRatingLabel: 'Calificación General',
    sectionFeedbackHeading: 'Sus comentarios sobre {section}',
    sectionNotesPlaceholder: 'Escriba o toque el micrófono para dictar notas de esta sección (opcional)...',
    freeformNotesPlaceholder: '¿Algo más? Escriba o toque el micrófono para dictar (opcional)...',
    chatInputPlaceholder: 'Escriba o dicte un mensaje...',
    sendButton: 'Enviar',
    submitReviewButton: 'Enviar Revisión',
    feedbackSubmittedTitle: 'Gracias — sus comentarios fueron enviados.',
    blueprintApprovedNextSteps: '¡Gracias! {brand} ha sido notificado de su aprobación. Si se requieren fotos reales de personas, lugares o recuerdos, su productor le enviará un enlace privado de carga antes de iniciar la producción.',
    photoRequestedBadge: 'Foto Solicitada Tras Aprobación',
    photoOptionalBadge: 'Foto de Referencia Opcional',
    screeningNotesPlaceholder: 'Escriba o dicte notas de capítulo o minuto...',
    viewStudioTerms: 'Ver Términos de Servicio de {brand}',
    visionGenreLabel: 'Género y Formato:',
  },
  pt: {
    producedBy: 'Produzido por {brand}',
    consentTitle: 'Antes de Começarmos Seu Projeto',
    consentSubtitle:
      'Confirme as permissões e termos de serviço para as ideias criativas, histórias e mídias de referência compartilhadas.',
    yourName: 'Seu Nome Completo',
    yourEmail: 'Seu E-mail (opcional)',
    mediaRightsLabel:
      'Confirmo que possuo ou detenho os direitos e autorizações necessários para todos os conceitos criativos, histórias, nomes, imagens e referências enviados.',
    zeroPrivityLabel:
      'Compreendo que {brand} é meu único prestador de produção responsável por preços, prazos e suporte, isentando provedores de software subjacentes.',
    acceptAndBegin: 'Concordar e Iniciar Entrevista',
    tapMicToSpeak: 'Toque no Microfone para Falar',
    stopRecording: 'Parar Microfone',
    tellYourStoryPlaceholder:
      'Compartilhe sua resposta em detalhes — personagens principais, motivações, cenas ou eventos decisivos, cenários e como realizam sua visão (ou toque no microfone)...',
    typeOrSpeakPlaceholder: 'Escreva sua resposta ou toque no microfone para contar em voz alta...',
    resonatingBeatsTitle: 'Cenas-Chave e Personagens',
    resonatingBeatsSubtitle:
      'Atualizado ao vivo conforme definimos personagens, papéis, cenas marcantes e seu impacto na visão',
    beatKeyPeopleLabel: 'Personagens:',
    sendAnswer: 'Enviar Resposta',
    finishAndCreateBlueprint: 'Concluir Entrevista e Gerar Roteiro Base',
    completingBlueprint: 'Sintetizando sua visão e entrevista no plano de produção...',
    interviewCompletedTitle: 'Obrigado — O Roteiro Base do Projeto Foi Enviado ao Produtor',
    interviewCompletedBody:
      '{brand} foi notificado e enviará em breve o roteiro e a lista de fotos de continuidade.',
    questionProgress: 'Etapa {current} de {max}',
    roundBadge: 'Rodada de Revisão {used} de {max}',
    roundLimitReached:
      'As rodadas de revisão incluídas foram concluídas. Entre em contato com {brand} para revisões extras.',
    approveBlueprint: 'Aprovar Roteiro Base',
    blueprintApproved: 'Roteiro Aprovado',
    submitRevisionNotes: 'Enviar Notas de Revisão',
    continuityPortalTitle: 'Continuidade Visual e Envio de Fotos',
    continuityPortalSubtitle:
      'Envie fotos reais (pessoas, locais ou objetos marcantes) e aprove as referências visuais.',
    uploadReferencePhoto: 'Enviar ou Tirar Foto',
    uploadingPhoto: 'Otimizando foto com privacidade...',
    photoUploadedClean: 'Foto enviada (dados GPS removidos por privacidade)',
    charactersHeading: 'Pessoas e Personagens',
    locationsHeading: 'Locais e Cenários',
    propsHeading: 'Lembranças, Produtos e Objetos',
    approveItem: 'Aprovar',
    needsAdjustment: 'Pedir Ajuste',
    submitContinuityReview: 'Enviar Aprovação de Continuidade',
    approveFinalVideo: 'Aprovar Exibição',
    requestVideoRevision: 'Enviar Notas da Exibição',
    watermarkPreviewNotice: 'Prévia do Cliente — Produzido por {brand}',
    clientQuotePanelTitle: 'Orçamento e Margem do Produtor',
    clientQuotePanelSubtitle:
      'Simule preço ao cliente, mix Híbrido acervo/IA, revisões e teto de créditos.',
    clientRetailPrice: 'Preço ao Cliente (USD)',
    includedRevisions: 'Rodadas de Revisão Incluídas',
    hybridAiVideoMix: 'Proporção de Clipes IA',
    estimatedSceneFlowCogs: 'Custo Est. de Créditos (com reserva)',
    estimatedNetProfit: 'Lucro Est. do Produtor',
    applyProjectCeiling: 'Definir Teto de Créditos ({credits} cr)',
    visionStepBadge: 'Etapa 1 • Visão do Projeto',
    visionQuestionTitle: 'Qual é a sua visão para este projeto?',
    visionQuestionSubtitle:
      'Compartilhe todos os detalhes importantes — para quem é o vídeo, a ocasião ou objetivo, o impacto emocional ou comercial desejado e referências de estilo.',
    visionInputPlaceholder:
      'Descreva sua visão em detalhes — propósito, público, impacto desejado, tom e duração aproximada (ou toque no microfone)...',
    visionRefinementPlaceholder:
      'Responda à pergunta acima ou adicione ajustes para refinar a visão do projeto...',
    clarifyVisionButton: 'Clarificar Visão',
    updateVisionButton: 'Atualizar Clarificação',
    confirmVisionButton: 'Confirmar Visão e Iniciar Entrevista',
    editVisionButton: 'Editar Visão',
    proposedVisionHeading: 'Visão Clarificada (Revisar e Confirmar)',
    confirmedVisionHeading: 'Visão do Projeto Confirmada',
    visionImpactLabel: 'Impacto Desejado:',
    visionAudienceLabel: 'Público e Contexto:',
    visionStyleLabel: 'Tom e Estilo Visual:',
    visionPassesRemaining: 'Refinamento {used} de {max}',
    discoveredPeopleTitle: 'Personagens e Sujeitos — Papéis e Impacto',
    beatImpactLabel: 'Impacto:',
    characterRoleLabel: 'Papel:',
    characterImpactLabel: 'Impacto:',
    completenessReadyLabel: 'Descoberta Completa ({score}%) — Pronto para Gerar Roteiro',
    completenessGatheringLabel: 'Reunindo Personagens e Eventos-Chave ({score}%)',
    submitEarlyButton: 'Enviar agora com os detalhes atuais',
    languageLabel: 'Idioma',
    listeningInLanguage: 'Ouvindo em {lang} — fale naturalmente e toque em Parar',
    wardrobesHeading: 'Figurinos e Visuais',
    cameraSnapLabel: 'Câmera',
    referencePhotoNeeded: 'Foto de referência necessária — envie da sua galeria ou câmera abaixo.',
    uploadedPhotosCount: 'Fotos enviadas ({count})',
    slotRevisionPlaceholder: 'Digite ou toque no microfone para descrever figurino, época, ângulo ou ajuste...',
    overallContinuityNoteLabel: 'Notas Gerais de Continuidade (opcional)',
    overallContinuityNotePlaceholder: 'Digite ou toque no microfone para enviar observações gerais ao produtor...',
    pronunciationGuideLabel: 'Guia Rápido de Pronúncia (opcional — sobrenomes, cidades ou marcas)',
    pronunciationGuidePlaceholder: 'Exemplo: Kowalski = ko-VAL-ski; nomes ou locais especiais...',
    continuityApprovedBanner: 'Continuidade Aprovada — Pronta para Produção',
    continuityChangesSentBanner: 'Notas de Continuidade Enviadas para {brand}',
    blueprintReviewHeading: 'Revisão do Roteiro Base',
    blueprintListenOnlyHeading: 'Roteiro Base · Somente Áudio',
    sectionCoreLabel: 'Essência',
    sectionStoryLabel: 'História',
    sectionCharactersLabel: 'Elenco e Continuidade',
    sectionBeatsLabel: 'Capítulos e Storyboard',
    sectionToneLabel: 'Tom e Estilo',
    listenButtonLabel: 'Ouvir',
    playNarratedStoryboard: 'Reproduzir Storyboard Narrado',
    stopStoryboardPlayback: 'Parar Reprodução',
    joinToLeaveFeedbackTitle: 'Informe seu Nome para Avaliar',
    joinToLeaveFeedbackBody: 'Leia e ouça acima; informe seu nome para avaliar seções, digitar ou ditar notas e conversar com {owner}.',
    continueButton: 'Continuar',
    yourReviewTab: 'Sua Avaliação',
    teamChatTab: 'Mensagens',
    overallRatingLabel: 'Avaliação Geral',
    sectionFeedbackHeading: 'Seus comentários sobre {section}',
    sectionNotesPlaceholder: 'Digite ou toque no microfone para ditar notas desta seção (opcional)...',
    freeformNotesPlaceholder: 'Mais alguma observação? Digite ou toque no microfone para falar (opcional)...',
    chatInputPlaceholder: 'Escreva ou dite uma mensagem...',
    sendButton: 'Enviar',
    submitReviewButton: 'Enviar Avaliação',
    feedbackSubmittedTitle: 'Obrigado — suas observações foram enviadas.',
    blueprintApprovedNextSteps: 'Obrigado! {brand} foi notificado da sua aprovação. Caso sejam necessárias fotos reais de pessoas, locais ou objetos, seu produtor compartilhará um link privado de envio antes da Produção.',
    photoRequestedBadge: 'Foto Solicitada Após Aprovação',
    photoOptionalBadge: 'Foto de Referência Opcional',
    screeningNotesPlaceholder: 'Digite ou dite notas de capítulo ou minutagem...',
    viewStudioTerms: 'Ver Termos de Serviço de {brand}',
    visionGenreLabel: 'Gênero e Formato:',
  },
  hi: {
    producedBy: '{brand} द्वारा निर्मित',
    consentTitle: 'आपका प्रोजेक्ट शुरू करने से पहले',
    consentSubtitle:
      'कृपया साझा किए गए रचनात्मक विचारों, कहानियों और संदर्भ सामग्री के लिए अपनी अनुमति और सेवा शर्तों की पुष्टि करें।',
    yourName: 'आपका पूरा नाम',
    yourEmail: 'आपका ईमेल (वैकल्पिक)',
    mediaRightsLabel:
      'मैं पुष्टि करता/करती हूँ कि यहाँ प्रस्तुत सभी रचनात्मक अवधारणाओं, कहानियों, नामों, छवियों और संदर्भ सामग्री के लिए मेरे पास आवश्यक अधिकार और अनुमति है।',
    zeroPrivityLabel:
      'मैं समझता/समझती हूँ कि {brand} ही मेरी एकमात्र प्रोडक्शन सेवा प्रदाता है जो मूल्य, डिलीवरी और सहायता के लिए उत्तरदायी है।',
    acceptAndBegin: 'सहमत हों और साक्षात्कार शुरू करें',
    tapMicToSpeak: 'बोलने के लिए माइक दबाएँ',
    stopRecording: 'माइक बंद करें',
    tellYourStoryPlaceholder:
      'अपना उत्तर विस्तार से साझा करें — मुख्य पात्र, उनकी प्रेरणाएँ, निर्णायक दृश्य या घटनाएँ, परिवेश और वे आपके विज़न को कैसे साकार करते हैं (या बोलने के लिए माइक दबाएँ)...',
    typeOrSpeakPlaceholder: 'अपना उत्तर यहाँ लिखें या बोलकर बताने के लिए माइक दबाएँ...',
    resonatingBeatsTitle: 'प्रमुख कहानी मोड़ और पात्र',
    resonatingBeatsSubtitle:
      'पात्रों, भूमिकाओं, मुख्य दृश्यों और आपके विज़न पर उनके प्रभाव के साथ लाइव अपडेट',
    beatKeyPeopleLabel: 'पात्र:',
    sendAnswer: 'उत्तर भेजें',
    finishAndCreateBlueprint: 'साक्षात्कार पूर्ण करें और ब्लूप्रिंट बनाएँ',
    completingBlueprint: 'आपके विज़न और साक्षात्कार से प्रोडक्शन ब्लूप्रिंट तैयार किया जा रहा है...',
    interviewCompletedTitle: 'धन्यवाद — आपका प्रोजेक्ट ब्लूप्रिंट निर्माता के लिए तैयार है',
    interviewCompletedBody:
      '{brand} को सूचित कर दिया गया है और वे शीघ्र ही आपका ब्लूप्रिंट और फोटो लिंक साझा करेंगे।',
    questionProgress: 'चरण {current} / {max}',
    roundBadge: 'संशोधन राउंड {used} / {max}',
    roundLimitReached:
      'शामिल संशोधन राउंड पूरे हो चुके हैं। अतिरिक्त बदलाव के लिए कृपया {brand} से संपर्क करें।',
    approveBlueprint: 'ब्लूप्रिंट स्वीकृत करें',
    blueprintApproved: 'ब्लूप्रिंट स्वीकृत',
    submitRevisionNotes: 'सुझाव भेजें',
    continuityPortalTitle: 'विज़ुअल निरंतरता और फोटो अपलोड',
    continuityPortalSubtitle:
      'असली तस्वीरें (परिवार, स्थान या विशेष वस्तुएँ) अपलोड करें और विज़ुअल संदर्भ स्वीकृत करें।',
    uploadReferencePhoto: 'फोटो अपलोड करें या खींचें',
    uploadingPhoto: 'फोटो सुरक्षित रूप से अपलोड हो रही है...',
    photoUploadedClean: 'फोटो अपलोड हो गई (गोपनीयता हेतु लोकेशन डेटा हटाया गया)',
    charactersHeading: 'व्यक्ति और पात्र',
    locationsHeading: 'स्थान और परिवेश',
    propsHeading: 'स्मृति-चिह्न और वस्तुएँ',
    approveItem: 'स्वीकृत करें',
    needsAdjustment: 'बदलाव का अनुरोध',
    submitContinuityReview: 'निरंतरता स्वीकृति भेजें',
    approveFinalVideo: 'स्क्रीनिंग स्वीकृत करें',
    requestVideoRevision: 'स्क्रीनिंग नोट्स भेजें',
    watermarkPreviewNotice: 'क्लाइंट प्रीव्यू — {brand} द्वारा निर्मित',
    clientQuotePanelTitle: 'सेवा प्रदाता मूल्य और मुनाफ़ा कैलकुलेटर',
    clientQuotePanelSubtitle:
      'क्लाइंट मूल्य, हाइब्रिड फोटो/AI अनुपात, संशोधन बफ़र और क्रेडिट सीमा निर्धारित करें।',
    clientRetailPrice: 'क्लाइंट मूल्य (USD)',
    includedRevisions: 'शामिल संशोधन राउंड',
    hybridAiVideoMix: 'AI वीडियो क्लिप अनुपात',
    estimatedSceneFlowCogs: 'अनुमानित क्रेडिट लागत',
    estimatedNetProfit: 'अनुमानित प्रदाता लाभ',
    applyProjectCeiling: 'प्रोजेक्ट क्रेडिट सीमा सेट करें ({credits} cr)',
    visionStepBadge: 'चरण 1 • प्रोजेक्ट विज़न',
    visionQuestionTitle: 'इस प्रोजेक्ट के लिए आपका विज़न क्या है?',
    visionQuestionSubtitle:
      'जितना उपयोगी हो उतना विस्तार से साझा करें — यह वीडियो किसके लिए है, अवसर या लक्ष्य क्या है, और आप दर्शकों पर क्या भावनात्मक प्रभाव छोड़ना चाहते हैं।',
    visionInputPlaceholder:
      'अपने विज़न का विस्तार से वर्णन करें — उद्देश्य, दर्शक, भावनात्मक या व्यावसायिक लक्ष्य और शैली (या माइक दबाएँ)...',
    visionRefinementPlaceholder:
      'ऊपर दिए गए प्रश्न का उत्तर दें या अपने प्रोजेक्ट विज़न में सुधार जोड़ें...',
    clarifyVisionButton: 'विज़न स्पष्ट करें',
    updateVisionButton: 'स्पष्टीकरण अपडेट करें',
    confirmVisionButton: 'विज़न की पुष्टि करें और साक्षात्कार शुरू करें',
    editVisionButton: 'विज़न संपादित करें',
    proposedVisionHeading: 'स्पष्ट किया गया प्रोजेक्ट विज़न (पुष्टि करें)',
    confirmedVisionHeading: 'पुष्टि किया गया प्रोजेक्ट विज़न',
    visionImpactLabel: 'अपेक्षित प्रभाव:',
    visionAudienceLabel: 'दर्शक और संदर्भ:',
    visionStyleLabel: 'टोन और विज़ुअल शैली:',
    visionPassesRemaining: 'स्पष्टीकरण चरण {used} / {max}',
    discoveredPeopleTitle: 'पात्र और मुख्य व्यक्ति — भूमिकाएँ और प्रभाव',
    beatImpactLabel: 'प्रभाव:',
    characterRoleLabel: 'भूमिका:',
    characterImpactLabel: 'प्रभाव:',
    completenessReadyLabel: 'जानकारी पूर्ण ({score}%) — ब्लूप्रिंट बनाने के लिए तैयार',
    completenessGatheringLabel: 'पात्रों और मुख्य घटनाओं का संकलन ({score}%)',
    submitEarlyButton: 'वर्तमान विवरण के साथ अभी जमा करें',
    languageLabel: 'भाषा',
    listeningInLanguage: '{lang} में सुना जा रहा है — स्वाभाविक रूप से बोलें, फिर रोकें दबाएँ',
    wardrobesHeading: 'वेशभूषा और लुक',
    cameraSnapLabel: 'कैमरा',
    referencePhotoNeeded: 'संदर्भ फोटो आवश्यक — नीचे अपनी गैलरी या कैमरे से अपलोड करें।',
    uploadedPhotosCount: 'अपलोड की गई तस्वीरें ({count})',
    slotRevisionPlaceholder: 'वेशभूषा, समय-काल, कोण या बदलाव लिखने या बोलने के लिए माइक दबाएँ...',
    overallContinuityNoteLabel: 'सामान्य निरंतरता नोट्स (वैकल्पिक)',
    overallContinuityNotePlaceholder: 'निर्माता के लिए सामान्य नोट्स लिखें या बोलने के लिए माइक दबाएँ...',
    pronunciationGuideLabel: '10-सेकंड उच्चारण गाइड (वैकल्पिक — नाम, स्थान या ब्रांड)',
    pronunciationGuidePlaceholder: 'उदाहरण: Kowalski = को-वाल्स्की; परिवार के नाम या शहर का सही उच्चारण...',
    continuityApprovedBanner: 'विज़ुअल निरंतरता स्वीकृत — प्रोडक्शन के लिए तैयार',
    continuityChangesSentBanner: 'निरंतरता सुझाव {brand} को भेजे गए',
    blueprintReviewHeading: 'ब्लूप्रिंट समीक्षा',
    blueprintListenOnlyHeading: 'ब्लूप्रिंट · केवल श्रवण',
    sectionCoreLabel: 'मूल अवधारणा',
    sectionStoryLabel: 'कहानी',
    sectionCharactersLabel: 'पात्र और निरंतरता',
    sectionBeatsLabel: 'अध्याय और स्टोरीबोर्ड',
    sectionToneLabel: 'टोन और शैली',
    listenButtonLabel: 'सुनें',
    playNarratedStoryboard: 'कथावाचन सहित स्टोरीबोर्ड चलाएँ',
    stopStoryboardPlayback: 'प्लेबैक रोकें',
    joinToLeaveFeedbackTitle: 'अपनी प्रतिक्रिया देने के लिए नाम दर्ज करें',
    joinToLeaveFeedbackBody: 'ऊपर पढ़ें और सुनें; अनुभागों को रेट करने, लिखकर या बोलकर सुझाव देने और {owner} को संदेश भेजने के लिए अपना नाम दर्ज करें।',
    continueButton: 'आगे बढ़ें',
    yourReviewTab: 'आपकी समीक्षा',
    teamChatTab: 'संदेश',
    overallRatingLabel: 'समग्र रेटिंग',
    sectionFeedbackHeading: '{section} पर आपकी प्रतिक्रिया',
    sectionNotesPlaceholder: 'इस अनुभाग के लिए नोट्स लिखें या बोलने के लिए माइक दबाएँ (वैकल्पिक)...',
    freeformNotesPlaceholder: 'कोई अन्य सुझाव? लिखें या बोलने के लिए माइक दबाएँ (वैकल्पिक)...',
    chatInputPlaceholder: 'संदेश लिखें या बोलकर दर्ज करें...',
    sendButton: 'भेजें',
    submitReviewButton: 'समीक्षा भेजें',
    feedbackSubmittedTitle: 'धन्यवाद — आपकी प्रतिक्रिया भेज दी गई है।',
    blueprintApprovedNextSteps: 'धन्यवाद! {brand} को आपकी स्वीकृति की सूचना दे दी गई है। यदि मुख्य व्यक्तियों, स्थानों या वस्तुओं की वास्तविक तस्वीरों की आवश्यकता होगी, तो निर्माता आपको एक निजी अपलोड लिंक भेजेंगे।',
    photoRequestedBadge: 'स्वीकृति के बाद फोटो अपेक्षित',
    photoOptionalBadge: 'संदर्भ फोटो वैकल्पिक',
    screeningNotesPlaceholder: 'अध्याय या समय-चिह्न नोट्स लिखें या बोलें...',
    viewStudioTerms: '{brand} की सेवा शर्तें देखें',
    visionGenreLabel: 'शैली और प्रारूप:',
  },
  'zh-CN': {
    producedBy: '由 {brand} 制作出品',
    consentTitle: '开始您的项目之前',
    consentSubtitle: '请确认您对所提交创意构想、故事内容及参考素材的授权许可与服务条款。',
    yourName: '您的姓名',
    yourEmail: '您的电子邮箱（选填）',
    mediaRightsLabel:
      '我确认本人拥有或已获必要授权，可在此项目中使用所提交的全部创意构想、故事、姓名、肖像及参考素材。',
    zeroPrivityLabel:
      '我理解 {brand} 是负责定价、交付与售后服务的唯一制作服务商，底层软件技术提供商不承担直接合同责任。',
    acceptAndBegin: '同意并开始访谈',
    tapMicToSpeak: '点击麦克风语音讲述',
    stopRecording: '停止录音',
    tellYourStoryPlaceholder:
      '请详细分享您的回答——核心角色、人物动机、关键剧情转折或重要事件、视觉场景，以及它们如何实现您的项目愿景（也可点击麦克风直接口述）...',
    typeOrSpeakPlaceholder: '在此输入您的回答，或点击麦克风自然口述...',
    resonatingBeatsTitle: '核心剧情节点与主要角色',
    resonatingBeatsSubtitle: '随访谈实时提炼角色定位、关键场景及对项目愿景的影响力',
    beatKeyPeopleLabel: '登场角色：',
    sendAnswer: '发送回答',
    finishAndCreateBlueprint: '完成访谈并生成蓝图',
    completingBlueprint: '正在根据您的确认愿景与访谈内容生成制作蓝图...',
    interviewCompletedTitle: '感谢您——项目蓝图已提交给制作团队',
    interviewCompletedBody:
      '已通知 {brand}，制作人将很快向您发送专属蓝图审阅与照片上传链接。',
    questionProgress: '第 {current} / {max} 步',
    roundBadge: '修改轮次 {used} / {max}',
    roundLimitReached: '包含的修改轮次已用完。如需增加修改服务，请联系 {brand}。',
    approveBlueprint: '批准蓝图方案',
    blueprintApproved: '蓝图已批准',
    submitRevisionNotes: '提交修改意见',
    continuityPortalTitle: '视觉连贯性与素材照片上传',
    continuityPortalSubtitle:
      '请上传真实照片（人物、场景或纪念物品），并确认制作所用的角色与场景视觉参考。',
    uploadReferencePhoto: '上传或拍摄照片',
    uploadingPhoto: '正在安全处理并优化照片...',
    photoUploadedClean: '照片已上传（已自动清除GPS隐私定位信息）',
    charactersHeading: '人物与角色',
    locationsHeading: '地点与场景',
    propsHeading: '纪念物、产品与道具',
    approveItem: '确认通过',
    needsAdjustment: '需调整',
    submitContinuityReview: '提交素材确认',
    approveFinalVideo: '批准成片审阅',
    requestVideoRevision: '提交审片修改意见',
    watermarkPreviewNotice: '客户审片预览 — 由 {brand} 制作',
    clientQuotePanelTitle: '服务商报价与利润测算',
    clientQuotePanelSubtitle: '测算客户售价、照片/AI混合比例、修改轮次预留与项目积分上限。',
    clientRetailPrice: '客户报价 (USD)',
    includedRevisions: '包含修改轮次',
    hybridAiVideoMix: 'AI动态重现镜头比例',
    estimatedSceneFlowCogs: '预估积分成本（含缓冲）',
    estimatedNetProfit: '预估服务商净利',
    applyProjectCeiling: '设为项目积分上限 ({credits} cr)',
    visionStepBadge: '第 1 步 • 项目愿景',
    visionQuestionTitle: '您对这个项目的整体愿景是什么？',
    visionQuestionSubtitle:
      '请尽可能详细地描述——这部影片为谁制作、用于什么场合或商业目标、希望带给观众怎样的情感共鸣，以及您偏好的视觉风格。',
    visionInputPlaceholder:
      '请详细描述您的项目愿景——目的、目标观众、期望达成的感动或效果、基调与大致时长（也可点击麦克风口述）...',
    visionRefinementPlaceholder:
      '请补充回答上方问题，或提出调整建议以进一步完善您的项目愿景...',
    clarifyVisionButton: '提炼并核对愿景',
    updateVisionButton: '更新愿景提炼',
    confirmVisionButton: '确认愿景并开始深度访谈',
    editVisionButton: '修改愿景',
    proposedVisionHeading: '提炼后的项目愿景（请审阅并确认）',
    confirmedVisionHeading: '已确认的项目北极星愿景',
    visionImpactLabel: '预期情感/核心价值：',
    visionAudienceLabel: '目标受众与场景：',
    visionStyleLabel: '基调与视觉风格：',
    visionPassesRemaining: '愿景校准第 {used} / {max} 轮',
    discoveredPeopleTitle: '角色与核心人物 — 定位与影响力',
    beatImpactLabel: '核心意义：',
    characterRoleLabel: '角色定位：',
    characterImpactLabel: '故事影响：',
    completenessReadyLabel: '信息采集完整 ({score}%) — 可生成高质量蓝图',
    completenessGatheringLabel: '正在完善关键人物与核心事件 ({score}%)',
    submitEarlyButton: '使用当前信息提前提交',
    languageLabel: '语言',
    listeningInLanguage: '正在聆听 ({lang}) — 请自然讲述，完成后点击停止',
    wardrobesHeading: '服装与造型',
    cameraSnapLabel: '拍照',
    referencePhotoNeeded: '需要参考照片——请在下方从相册上传或拍照。',
    uploadedPhotosCount: '已上传照片 ({count})',
    slotRevisionPlaceholder: '输入或点击麦克风口述服装、年代、角度或调整说明...',
    overallContinuityNoteLabel: '整体视觉连贯性备注（选填）',
    overallContinuityNotePlaceholder: '输入或点击麦克风向制作团队口述整体备注...',
    pronunciationGuideLabel: '10秒人名/地名发音指南（选填）',
    pronunciationGuidePlaceholder: '示例：Kowalski = koh-VAHL-skee；或注明特殊姓名、地名与品牌读音...',
    continuityApprovedBanner: '视觉连贯性已确认 — 可进入制作阶段',
    continuityChangesSentBanner: '调整意见已发送给 {brand}',
    blueprintReviewHeading: '蓝图审阅',
    blueprintListenOnlyHeading: '蓝图 · 仅限收听',
    sectionCoreLabel: '核心定位',
    sectionStoryLabel: '故事梗概',
    sectionCharactersLabel: '人物与素材',
    sectionBeatsLabel: '章节与分镜',
    sectionToneLabel: '基调与风格',
    listenButtonLabel: '收听语音',
    playNarratedStoryboard: '播放配音分镜导览',
    stopStoryboardPlayback: '停止播放',
    joinToLeaveFeedbackTitle: '填写姓名以发表审阅意见',
    joinToLeaveFeedbackBody: '您可先在上方阅读并收听解说；输入姓名后即可评分、输入或语音口述修改意见，并与 {owner} 沟通。',
    continueButton: '继续',
    yourReviewTab: '您的审阅意见',
    teamChatTab: '在线留言',
    overallRatingLabel: '整体评分',
    sectionFeedbackHeading: '您对「{section}」的反馈',
    sectionNotesPlaceholder: '输入或点击麦克风口述本部分的修改建议（选填）...',
    freeformNotesPlaceholder: '还有其他补充意见吗？可打字或点击麦克风口述（选填）...',
    chatInputPlaceholder: '输入或语音口述留言...',
    sendButton: '发送',
    submitReviewButton: '提交审阅意见',
    feedbackSubmittedTitle: '感谢您——反馈意见已发送。',
    blueprintApprovedNextSteps: '感谢批准！已通知 {brand}。如需补充关键人物、地点或纪念物的真实照片，制作人将在正式制作前向您发送专属上传链接。',
    photoRequestedBadge: '批准后需提供照片',
    photoOptionalBadge: '参考照片（选填）',
    screeningNotesPlaceholder: '输入或语音口述章节/时间点修改意见...',
    viewStudioTerms: '查看 {brand} 服务条款',
    visionGenreLabel: '类型与形式：',
  },
  th: {
    producedBy: 'อำนวยการผลิตโดย {brand}',
    consentTitle: 'ก่อนเริ่มต้นโปรเจกต์ของคุณ',
    consentSubtitle:
      'โปรดยืนยันสิทธิ์การใช้งานและเงื่อนไขบริการสำหรับแนวคิด เรื่องราว และสื่ออ้างอิงที่คุณแบ่งปัน',
    yourName: 'ชื่อ-นามสกุลของคุณ',
    yourEmail: 'อีเมลของคุณ (ไม่บังคับ)',
    mediaRightsLabel:
      'ข้าพเจ้ายืนยันว่ามีสิทธิ์หรือได้รับอนุญาตอย่างถูกต้องสำหรับแนวคิดสร้างสรรค์ เรื่องราว ชื่อ บุคคล และสื่ออ้างอิงทั้งหมดที่ส่งในโปรเจกต์นี้',
    zeroPrivityLabel:
      'ข้าพเจ้ารับทราบว่า {brand} เป็นผู้ให้บริการผลิตแต่เพียงผู้เดียวที่รับผิดชอบด้านราคา การส่งมอบ และการดูแลลูกค้า โดยผู้ให้บริการซอฟต์แวร์พื้นฐานไม่มีความรับผิดโดยตรง',
    acceptAndBegin: 'ยอมรับและเริ่มการสัมภาษณ์',
    tapMicToSpeak: 'แตะไมโครโฟนเพื่อเล่าด้วยเสียง',
    stopRecording: 'หยุดไมโครโฟน',
    tellYourStoryPlaceholder:
      'อธิบายคำตอบของคุณอย่างละเอียด — ตัวละครหลัก แรงจูงใจ ฉากหรือเหตุการณ์สำคัญ สถานที่ และบทบาทต่อวิสัยทัศน์ของโปรเจกต์ (หรือแตะไมโครโฟนเพื่อพูด)...',
    typeOrSpeakPlaceholder: 'พิมพ์คำตอบของคุณ หรือแตะไมโครโฟนเพื่อพูดตามธรรมชาติ...',
    resonatingBeatsTitle: 'ฉากสำคัญและตัวละครหลัก',
    resonatingBeatsSubtitle: 'อัปเดตสดขณะสรุปตัวละคร บทบาท เหตุการณ์สำคัญ และผลลัพธ์ต่อวิสัยทัศน์ของคุณ',
    beatKeyPeopleLabel: 'ตัวละคร:',
    sendAnswer: 'ส่งคำตอบ',
    finishAndCreateBlueprint: 'จบการสัมภาษณ์และสร้างโครงเรื่อง',
    completingBlueprint: 'กำลังสังเคราะห์วิสัยทัศน์และข้อมูลสัมภาษณ์เป็นแผนการผลิต...',
    interviewCompletedTitle: 'ขอบคุณ — โครงเรื่องโปรเจกต์ของคุณถูกส่งไปยังผู้ผลิตแล้ว',
    interviewCompletedBody:
      '{brand} ได้รับการแจ้งเตือนแล้ว และจะส่งลิงก์ตรวจสอบโครงเรื่องและอัปโหลดภาพถ่ายให้คุณในไม่ช้า',
    questionProgress: 'ขั้นตอนที่ {current} จาก {max}',
    roundBadge: 'รอบการแก้ไข {used} จาก {max}',
    roundLimitReached:
      'ใช้รอบการแก้ไขที่รวมอยู่ในแพ็กเกจครบแล้ว กรุณาติดต่อ {brand} หากต้องการเพิ่มรอบการแก้ไข',
    approveBlueprint: 'อนุมัติโครงเรื่อง',
    blueprintApproved: 'อนุมัติโครงเรื่องแล้ว',
    submitRevisionNotes: 'ส่งบันทึกขอแก้ไข',
    continuityPortalTitle: 'ความต่อเนื่องของภาพและการอัปโหลดภาพถ่าย',
    continuityPortalSubtitle:
      'อัปโหลดภาพถ่ายจริง (บุคคล สถานที่ หรือสิ่งของสำคัญ) และอนุมัติภาพอ้างอิงสำหรับการผลิต',
    uploadReferencePhoto: 'อัปโหลดหรือถ่ายภาพ',
    uploadingPhoto: 'กำลังปกป้องความเป็นส่วนตัวและอัปโหลดภาพ...',
    photoUploadedClean: 'อัปโหลดสำเร็จ (ลบพิกัด GPS เพื่อความเป็นส่วนตัวแล้ว)',
    charactersHeading: 'บุคคลและตัวละคร',
    locationsHeading: 'สถานที่และฉาก',
    propsHeading: 'ของที่ระลึก สินค้า และอุปกรณ์ประกอบฉาก',
    approveItem: 'อนุมัติ',
    needsAdjustment: 'ขอปรับแก้',
    submitContinuityReview: 'ส่งการอนุมัติภาพอ้างอิง',
    approveFinalVideo: 'อนุมัติวิดีโอ',
    requestVideoRevision: 'ส่งบันทึกแก้ไขวิดีโอ',
    watermarkPreviewNotice: 'ตัวอย่างสำหรับลูกค้าตรวจสอบ — ผลิตโดย {brand}',
    clientQuotePanelTitle: 'คำนวณราคาขายและกำไรสำหรับผู้ให้บริการ',
    clientQuotePanelSubtitle:
      'จำลองราคาลูกค้า สัดส่วนภาพจริงผสม AI รอบการแก้ไข และเพดานเครดิตโครงการ',
    clientRetailPrice: 'ราคาขายลูกค้า (USD)',
    includedRevisions: 'รอบแก้ไขที่รวมให้',
    hybridAiVideoMix: 'สัดส่วนวิดีโอ AI',
    estimatedSceneFlowCogs: 'ต้นทุนเครดิตโดยประมาณ (รวมสำรอง)',
    estimatedNetProfit: 'กำไรสุทธิผู้ให้บริการโดยประมาณ',
    applyProjectCeiling: 'ตั้งเพดานเครดิตโครงการ ({credits} cr)',
    visionStepBadge: 'ขั้นตอนที่ 1 • วิสัยทัศน์โปรเจกต์',
    visionQuestionTitle: 'วิสัยทัศน์ของคุณสำหรับโปรเจกต์นี้คืออะไร?',
    visionQuestionSubtitle:
      'โปรดเล่ารายละเอียดให้ครบถ้วนที่สุด — วิดีโอนี้ทำเพื่อใคร โอกาสหรือเป้าหมายคืออะไร ความรู้สึกหรือผลลัพธ์ที่ต้องการให้ผู้ชมได้รับ และโทนภาพที่ชื่นชอบ',
    visionInputPlaceholder:
      'อธิบายวิสัยทัศน์โดยรวมอย่างละเอียด — เป้าหมาย ผู้ชม ความประทับใจที่ต้องการ โทนอารมณ์ และความยาวคร่าวๆ (หรือแตะไมโครโฟน)...',
    visionRefinementPlaceholder:
      'ตอบคำถามเพิ่มเติมด้านบน หรือระบุสิ่งที่ต้องการปรับแก้ในวิสัยทัศน์โปรเจกต์...',
    clarifyVisionButton: 'สรุปและตรวจสอบวิสัยทัศน์',
    updateVisionButton: 'อัปเดตวิสัยทัศน์',
    confirmVisionButton: 'ยืนยันวิสัยทัศน์และเริ่มการสัมภาษณ์',
    editVisionButton: 'แก้ไขวิสัยทัศน์',
    proposedVisionHeading: 'วิสัยทัศน์โปรเจกต์ที่สรุปแล้ว (โปรดตรวจสอบและยืนยัน)',
    confirmedVisionHeading: 'วิสัยทัศน์โปรเจกต์ที่ยืนยันแล้ว',
    visionImpactLabel: 'ผลลัพธ์และความรู้สึกที่ต้องการ:',
    visionAudienceLabel: 'กลุ่มผู้ชมและโอกาส:',
    visionStyleLabel: 'โทนอารมณ์และสไตล์ภาพ:',
    visionPassesRemaining: 'รอบการปรับความชัดเจน {used} จาก {max}',
    discoveredPeopleTitle: 'ตัวละครและบุคคลสำคัญ — บทบาทและความสำคัญ',
    beatImpactLabel: 'ความสำคัญ:',
    characterRoleLabel: 'บทบาท:',
    characterImpactLabel: 'ความสำคัญต่อเรื่อง:',
    completenessReadyLabel: 'ข้อมูลครบถ้วน ({score}%) — พร้อมสร้างโครงเรื่อง',
    completenessGatheringLabel: 'กำลังรวบรวมตัวละครและเหตุการณ์สำคัญ ({score}%)',
    submitEarlyButton: 'ส่งข้อมูลเท่าที่มีอยู่ตอนนี้',
    languageLabel: 'ภาษา',
    listeningInLanguage: 'กำลังฟังเสียง ({lang}) — พูดตามธรรมชาติ แล้วแตะหยุดเมื่อเสร็จสิ้น',
    wardrobesHeading: 'เครื่องแต่งกายและลุค',
    cameraSnapLabel: 'ถ่ายภาพ',
    referencePhotoNeeded: 'ต้องการภาพอ้างอิง — อัปโหลดจากคลังภาพหรือถ่ายด้วยกล้องด้านล่าง',
    uploadedPhotosCount: 'อัปโหลดแล้ว ({count})',
    slotRevisionPlaceholder: 'พิมพ์หรือแตะไมโครโฟนเพื่อระบุชุด ยุคสมัย มุมกล้อง หรือสิ่งที่ต้องแก้ไข...',
    overallContinuityNoteLabel: 'หมายเหตุภาพรวม (ไม่บังคับ)',
    overallContinuityNotePlaceholder: 'พิมพ์หรือแตะไมโครโฟนเพื่อฝากข้อความถึงผู้ผลิต...',
    pronunciationGuideLabel: 'คู่มือการออกเสียง 10 วินาที (ไม่บังคับ — ชื่อ สกุล หรือสถานที่)',
    pronunciationGuidePlaceholder: 'ตัวอย่าง: Kowalski = โค-วาล-สกี้ หรือชื่อเฉพาะที่ต้องการให้ออกเสียงถูกต้อง...',
    continuityApprovedBanner: 'อนุมัติความต่อเนื่องของภาพแล้ว — พร้อมเริ่มผลิต',
    continuityChangesSentBanner: 'ส่งบันทึกการแก้ไขไปยัง {brand} แล้ว',
    blueprintReviewHeading: 'ตรวจสอบโครงเรื่อง (Blueprint)',
    blueprintListenOnlyHeading: 'โครงเรื่อง · รับฟังอย่างเดียว',
    sectionCoreLabel: 'แก่นเรื่อง',
    sectionStoryLabel: 'เนื้อเรื่อง',
    sectionCharactersLabel: 'ตัวละครและภาพอ้างอิง',
    sectionBeatsLabel: 'บทและสตอรี่บอร์ด',
    sectionToneLabel: 'โทนและสไตล์ภาพ',
    listenButtonLabel: 'ฟังเสียงบรรยาย',
    playNarratedStoryboard: 'เล่นสตอรี่บอร์ดพร้อมเสียงบรรยาย',
    stopStoryboardPlayback: 'หยุดเล่น',
    joinToLeaveFeedbackTitle: 'ระบุชื่อของคุณเพื่อให้ข้อเสนอแนะ',
    joinToLeaveFeedbackBody: 'อ่านและรับฟังด้านบน กรอกชื่อของคุณเพื่อให้คะแนน พิมพ์หรือพูดบันทึกข้อเสนอแนะ และส่งข้อความถึง {owner}',
    continueButton: 'ดำเนินการต่อ',
    yourReviewTab: 'ข้อเสนอแนะของคุณ',
    teamChatTab: 'ข้อความสนทนา',
    overallRatingLabel: 'คะแนนภาพรวม',
    sectionFeedbackHeading: 'ข้อเสนอแนะสำหรับ {section}',
    sectionNotesPlaceholder: 'พิมพ์หรือแตะไมโครโฟนเพื่อพูดข้อเสนอแนะในส่วนนี้ (ไม่บังคับ)...',
    freeformNotesPlaceholder: 'มีข้อเสนอแนะเพิ่มเติมไหม? พิมพ์หรือแตะไมโครโฟนเพื่อพูด (ไม่บังคับ)...',
    chatInputPlaceholder: 'พิมพ์หรือพูดข้อความ...',
    sendButton: 'ส่ง',
    submitReviewButton: 'ส่งผลการตรวจสอบ',
    feedbackSubmittedTitle: 'ขอบคุณ — ส่งข้อเสนอแนะของคุณเรียบร้อยแล้ว',
    blueprintApprovedNextSteps: 'ขอบคุณครับ! แจ้งเตือนการอนุมัติไปยัง {brand} แล้ว หากต้องใช้ภาพถ่ายจริงของบุคคล สถานที่ หรือสิ่งของสำคัญ ผู้ผลิตจะส่งลิงก์อัปโหลดส่วนตัวให้คุณในลำดับถัดไป',
    photoRequestedBadge: 'ขอภาพถ่ายหลังอนุมัติ',
    photoOptionalBadge: 'ภาพอ้างอิง (ไม่บังคับ)',
    screeningNotesPlaceholder: 'พิมพ์หรือพูดระบุฉาก / ช่วงเวลาที่ต้องการแก้ไข...',
    viewStudioTerms: 'ดูเงื่อนไขการให้บริการของ {brand}',
    visionGenreLabel: 'แนวเรื่องและรูปแบบ:',
  },
  ar: {
    producedBy: 'إنتاج {brand}',
    consentTitle: 'قبل أن نبدأ مشروعك',
    consentSubtitle:
      'يرجى تأكيد الأذونات وشروط الخدمة للأفكار الإبداعية والقصص والوسائط المرجعية التي تشاركها معنا.',
    yourName: 'الاسم الكامل',
    yourEmail: 'البريد الإلكتروني (اختياري)',
    mediaRightsLabel:
      'أؤكد أنني أملك أو أحمل الحقوق والأذونات اللازمة لجميع الأفكار الإبداعية والقصص والأسماء والصور والمواد المرجعية المقدمة هنا.',
    zeroPrivityLabel:
      'أدرك أن {brand} هو مزود خدمة الإنتاج الوحيد المسؤول عن التسعير والتسليم والدعم، ولا يتحمل مزودو البرمجيات الأساسيون أي مسؤولية مباشرة.',
    acceptAndBegin: 'موافقة وبدء المقابلة',
    tapMicToSpeak: 'اضغط على الميكروفون للتحدث',
    stopRecording: 'إيقاف الميكروفون',
    tellYourStoryPlaceholder:
      'شاركنا إجابتك بالتفصيل — الشخصيات الرئيسية ودوافعها، المشاهد أو الأحداث المحورية، الأجواء البصرية، وكيف تحقق رؤيتك للمشروع (أو اضغط على الميكروفون للتحدث)...',
    typeOrSpeakPlaceholder: 'اكتب إجابتك هنا أو اضغط على الميكروفون للتحدث بطبيعية...',
    resonatingBeatsTitle: 'المشاهد المحورية والشخصيات',
    resonatingBeatsSubtitle:
      'تتحدث مباشرة مع توضيح الشخصيات وأدوارها والأحداث الرئيسية وأثرها في تحقيق رؤيتك',
    beatKeyPeopleLabel: 'الشخصيات:',
    sendAnswer: 'إرسال الإجابة',
    finishAndCreateBlueprint: 'إنهاء المقابلة وإنشاء المخطط',
    completingBlueprint: 'جارٍ تحويل رؤيتك ومقابلتك إلى مخطط إنتاج متكامل...',
    interviewCompletedTitle: 'شكراً لك — مخطط مشروعك جاهز الآن لدى المنتج',
    interviewCompletedBody:
      'تم إشعار {brand} وسيشارك معك قريباً المخطط المخصص وقائمة الصور المرجعية.',
    questionProgress: 'الخطوة {current} من {max}',
    roundBadge: 'جولة التعديل {used} من {max}',
    roundLimitReached:
      'اكتملت جولات التعديل المشمولة. يرجى التواصل مع {brand} إذا رغبت في إضافة جولة تعديل إضافية.',
    approveBlueprint: 'اعتماد المخطط',
    blueprintApproved: 'تم اعتماد المخطط',
    submitRevisionNotes: 'إرسال ملاحظات التعديل',
    continuityPortalTitle: 'الاستمرارية البصرية وجمع الصور',
    continuityPortalSubtitle:
      'ارفع صوراً حقيقية (للأشخاص أو الأماكن أو المقتنيات) واعتمد المراجع البصرية لإنتاجك.',
    uploadReferencePhoto: 'رفع أو التقاط صورة',
    uploadingPhoto: 'جارٍ تأمين الصورة وتحسينها...',
    photoUploadedClean: 'تم رفع الصورة بنجاح (تمت إزالة بيانات الموقع GPS لحماية الخصوصية)',
    charactersHeading: 'الأشخاص والشخصيات',
    locationsHeading: 'الأماكن والمواقع',
    propsHeading: 'المقتنيات والمنتجات والعناصر',
    approveItem: 'اعتماد',
    needsAdjustment: 'طلب تعديل',
    submitContinuityReview: 'إرسال اعتماد الاستمرارية',
    approveFinalVideo: 'اعتماد العرض النهائي',
    requestVideoRevision: 'إرسال ملاحظات تعديل الفيديو',
    watermarkPreviewNotice: 'معاينة مراجعة العميل — إنتاج {brand}',
    clientQuotePanelTitle: 'حاسبة تسعير العميل وهامش الربح',
    clientQuotePanelSubtitle:
      'نمذجة سعر البيع للعميل ونسبة الفيديو بالذكاء الاصطناعي وجولات التعديل وسقف الرصيد.',
    clientRetailPrice: 'سعر البيع للعميل (USD)',
    includedRevisions: 'جولات التعديل المشمولة',
    hybridAiVideoMix: 'نسبة مقاطع الفيديو بالذكاء الاصطناعي',
    estimatedSceneFlowCogs: 'تكلفة الرصيد التقديرية (شاملة الاحتياطي)',
    estimatedNetProfit: 'صافي ربح مقدم الخدمة التقديري',
    applyProjectCeiling: 'تطبيق سقف رصيد المشروع ({credits} cr)',
    visionStepBadge: 'الخطوة 1 • رؤية المشروع',
    visionQuestionTitle: 'ما هي رؤيتك لهذا المشروع؟',
    visionQuestionSubtitle:
      'شاركنا أكبر قدر ممكن من التفاصيل المفيدة — لمن هذا الفيديو، ما المناسبة أو الهدف، وما الأثر العاطفي أو العملي الذي ترغب في تركه لدى المشاهدين.',
    visionInputPlaceholder:
      'صف رؤيتك العامة بالتفصيل — الهدف، الجمهور، الأثر المنشود، النبرة والأسلوب البصري والمدة التقريبية (أو اضغط على الميكروفون)...',
    visionRefinementPlaceholder:
      'أجب عن السؤال أعلاه أو أضف أي تعديلات لتوضيح رؤية مشروعك...',
    clarifyVisionButton: 'توضيح الرؤية',
    updateVisionButton: 'تحديث التوضيح',
    confirmVisionButton: 'تأكيد الرؤية وبدء المقابلة',
    editVisionButton: 'تعديل الرؤية',
    proposedVisionHeading: 'رؤية المشروع الموضحة (راجع وأكّد)',
    confirmedVisionHeading: 'رؤية المشروع المؤكدة',
    visionImpactLabel: 'الأثر المنشود:',
    visionAudienceLabel: 'الجمهور والسياق:',
    visionStyleLabel: 'النبرة والأسلوب البصري:',
    visionPassesRemaining: 'جولة التوضيح {used} من {max}',
    discoveredPeopleTitle: 'الشخصيات والأفراد — الأدوار والأثر',
    beatImpactLabel: 'الأثر:',
    characterRoleLabel: 'الدور:',
    characterImpactLabel: 'الأثر:',
    completenessReadyLabel: 'اكتمل جمع المعلومات ({score}%) — جاهز لإنشاء المخطط',
    completenessGatheringLabel: 'جارٍ جمع الشخصيات والأحداث الرئيسية ({score}%)',
    submitEarlyButton: 'إرسال مبكر بالتفاصيل الحالية',
    languageLabel: 'اللغة',
    listeningInLanguage: 'جارٍ الاستماع ({lang}) — تحدث بطبيعية ثم اضغط إيقاف',
    wardrobesHeading: 'الأزياء والإطلالات',
    cameraSnapLabel: 'الكاميرا',
    referencePhotoNeeded: 'مطلوب صورة مرجعية — ارفع من معرض الهاتف أو الكاميرا أدناه.',
    uploadedPhotosCount: 'الصور المرفوعة ({count})',
    slotRevisionPlaceholder: 'اكتب أو اضغط على الميكروفون لوصف الزي أو الحقبة أو الزاوية أو التعديل المطلوب...',
    overallContinuityNoteLabel: 'ملاحظات عامة حول الاستمرارية (اختياري)',
    overallContinuityNotePlaceholder: 'اكتب أو اضغط على الميكروفون لمشاركة ملاحظات عامة مع المنتج...',
    pronunciationGuideLabel: 'دليل النطق السريع (اختياري — الأسماء أو الأماكن أو العلامات)',
    pronunciationGuidePlaceholder: 'مثال: Kowalski = كو-فال-سكي؛ أو طريقة نطق أسماء العائلة والمدن...',
    continuityApprovedBanner: 'تم اعتماد الاستمرارية البصرية — جاهز للإنتاج',
    continuityChangesSentBanner: 'تم إرسال ملاحظات التعديل إلى {brand}',
    blueprintReviewHeading: 'مراجعة المخطط',
    blueprintListenOnlyHeading: 'المخطط · استماع فقط',
    sectionCoreLabel: 'الفكرة الأساسية',
    sectionStoryLabel: 'القصة',
    sectionCharactersLabel: 'الشخصيات والمراجع',
    sectionBeatsLabel: 'الفصول ولوحة القصة',
    sectionToneLabel: 'النبرة والأسلوب',
    listenButtonLabel: 'استماع',
    playNarratedStoryboard: 'تشغيل لوحة القصة المروية صوتياً',
    stopStoryboardPlayback: 'إيقاف التشغيل',
    joinToLeaveFeedbackTitle: 'أدخل اسمك لإضافة ملاحظاتك',
    joinToLeaveFeedbackBody: 'يمكنك القراءة والاستماع أعلاه. أدخل اسمك لتقييم الأقسام وكتابة أو إملاء ملاحظاتك ومراسلة {owner}.',
    continueButton: 'متابعة',
    yourReviewTab: 'مراجعتك',
    teamChatTab: 'الرسائل',
    overallRatingLabel: 'التقييم العام',
    sectionFeedbackHeading: 'ملاحظاتك حول {section}',
    sectionNotesPlaceholder: 'اكتب أو اضغط على الميكروفون لإملاء ملاحظات هذا القسم (اختياري)...',
    freeformNotesPlaceholder: 'هل لديك أي ملاحظات إضافية؟ اكتب أو اضغط على الميكروفون للتحدث (اختياري)...',
    chatInputPlaceholder: 'اكتب أو أملِ رسالة صوتية...',
    sendButton: 'إرسال',
    submitReviewButton: 'إرسال المراجعة',
    feedbackSubmittedTitle: 'شكراً لك — تم إرسال ملاحظاتك بنجاح.',
    blueprintApprovedNextSteps: 'شكراً لك! تم إشعار {brand} باعتمادك لهذا المخطط. إذا كانت هناك حاجة لصور حقيقية للأشخاص أو الأماكن أو المقتنيات، فسيشارك معك المنتج رابط رفع خاص قبل بدء الإنتاج.',
    photoRequestedBadge: 'مطلوب صورة بعد الاعتماد',
    photoOptionalBadge: 'صورة مرجعية اختيارية',
    screeningNotesPlaceholder: 'اكتب أو أملِ ملاحظات الفصل أو التوقيت الزمني...',
    viewStudioTerms: 'مراجعة شروط خدمة {brand}',
    visionGenreLabel: 'النوع والشكل الفني:',
  },
  ja: {
    producedBy: '{brand} 制作',
    consentTitle: 'プロジェクトを開始する前に',
    consentSubtitle:
      '共有いただくクリエイティブなアイデア、ストーリー、参考素材に関する権利および利用規約をご確認ください。',
    yourName: 'お名前（フルネーム）',
    yourEmail: 'メールアドレス（任意）',
    mediaRightsLabel:
      '私は、ここに提出するすべてのクリエイティブ企画、ストーリー、氏名、肖像、および参考素材について、必要な権利と許諾を保有していることを確認します。',
    zeroPrivityLabel:
      '私は、価格設定・納品・サポートに責任を負う唯一の制作サービス提供者が {brand} であり、基盤ソフトウェア提供者は直接の責任を負わないことを理解します。',
    acceptAndBegin: '同意してインタビューを開始',
    tapMicToSpeak: 'マイクをタップして話す',
    stopRecording: 'マイクを停止',
    tellYourStoryPlaceholder:
      '主要な登場人物、動機、転機となるシーンや出来事、舞台設定、そしてそれらがビジョンをどう体現するかを詳しくお話しください（マイクをタップして音声入力もできます）...',
    typeOrSpeakPlaceholder: 'こちらに回答を入力するか、マイクをタップして自然にお話しください...',
    resonatingBeatsTitle: '主要なストーリービートと登場人物',
    resonatingBeatsSubtitle:
      '登場人物、役割、重要シーン、ビジョンへの影響を整理しながらリアルタイムで更新されます',
    beatKeyPeopleLabel: '登場人物：',
    sendAnswer: '回答を送信',
    finishAndCreateBlueprint: 'インタビューを完了して Blueprint を作成',
    completingBlueprint: 'ビジョンとインタビュー内容から制作 Blueprint を生成しています...',
    interviewCompletedTitle: 'ありがとうございます — プロジェクト Blueprint をプロデューサーへ送信しました',
    interviewCompletedBody:
      '{brand} に通知されました。間もなく専用の Blueprint とコンティニュイティ用チェックリストが届きます。',
    questionProgress: 'ステップ {current} / {max}',
    roundBadge: '修正ラウンド {used} / {max}',
    roundLimitReached:
      '含まれている修正ラウンドの上限に達しました。追加の修正パッケージをご希望の場合は {brand} までお問い合わせください。',
    approveBlueprint: 'Blueprint を承認',
    blueprintApproved: 'Blueprint 承認済み',
    submitRevisionNotes: '修正メモを送信',
    continuityPortalTitle: 'ビジュアル・コンティニュイティと写真収集',
    continuityPortalSubtitle:
      '実写写真（人物、場所、大切な品など）をアップロードし、制作に使うビジュアル参照を承認してください。',
    uploadReferencePhoto: '写真をアップロードまたは撮影',
    uploadingPhoto: '写真を保護・最適化しています...',
    photoUploadedClean: '写真をアップロードしました（プライバシー保護のため位置情報メタデータを削除済み）',
    charactersHeading: '人物・キャスト',
    locationsHeading: '場所・舞台設定',
    propsHeading: '思い出の品・製品・小道具',
    approveItem: '承認',
    needsAdjustment: '調整を依頼',
    submitContinuityReview: 'コンティニュイティ承認を送信',
    approveFinalVideo: '試写を承認',
    requestVideoRevision: '試写メモを送信',
    watermarkPreviewNotice: 'クライアント確認用プレビュー — {brand} 制作',
    clientQuotePanelTitle: '制作会社向け見積・利益プランナー',
    clientQuotePanelSubtitle:
      'クライアント価格、アーカイブ／AIハイブリッド比率、修正バッファ、プロジェクトクレジット上限を試算します。',
    clientRetailPrice: 'クライアント価格 (USD)',
    includedRevisions: '含まれる修正ラウンド数',
    hybridAiVideoMix: 'AI映像再現の割合',
    estimatedSceneFlowCogs: '予想クレジット原価（バッファ込み）',
    estimatedNetProfit: '予想制作利益',
    applyProjectCeiling: 'クレジット上限を設定 ({credits} cr)',
    visionStepBadge: 'ステップ 1 • プロジェクトビジョン',
    visionQuestionTitle: 'このプロジェクトで実現したいビジョンは何ですか？',
    visionQuestionSubtitle:
      '誰に向けた動画か、目的や機会、視聴者に届けたい感情やメッセージ、映像・トーンの参考など、差し支えない範囲で詳しくお聞かせください。',
    visionInputPlaceholder:
      '全体ビジョンを詳しくご記入ください — 目的、対象視聴者、目指す感動や成果、トーン、想定尺など（マイクをタップして音声入力も可）...',
    visionRefinementPlaceholder:
      '上の質問への回答や、プロジェクトビジョンの調整点をご入力ください...',
    clarifyVisionButton: 'ビジョンを整理',
    updateVisionButton: '整理内容を更新',
    confirmVisionButton: 'ビジョンを確定してインタビューを開始',
    editVisionButton: 'ビジョンを編集',
    proposedVisionHeading: '整理されたプロジェクトビジョン（確認・確定）',
    confirmedVisionHeading: '確定済みプロジェクトビジョン',
    visionImpactLabel: '目指すインパクト：',
    visionAudienceLabel: '視聴者と背景：',
    visionStyleLabel: 'トーンとビジュアルスタイル：',
    visionPassesRemaining: 'ビジョン整理 {used} / {max} 回目',
    discoveredPeopleTitle: '登場人物・被写体 — 役割とインパクト',
    beatImpactLabel: 'インパクト：',
    characterRoleLabel: '役割：',
    characterImpactLabel: 'インパクト：',
    completenessReadyLabel: 'ヒアリング完了 ({score}%) — Blueprint 作成の準備が整いました',
    completenessGatheringLabel: '登場人物と主要な出来事を整理中 ({score}%)',
    submitEarlyButton: '現在の内容で早めに送信する',
    languageLabel: '言語',
    listeningInLanguage: '{lang}で音声認識中 — 自然にお話しいただき、終わったら停止をタップしてください',
    wardrobesHeading: '衣装・スタイル',
    cameraSnapLabel: 'カメラ',
    referencePhotoNeeded: '参考写真が必要です — 下のギャラリーまたはカメラからアップロードしてください。',
    uploadedPhotosCount: 'アップロード済み写真 ({count})',
    slotRevisionPlaceholder: '衣装、時代設定、アングル、調整点などを入力またはマイクで音声入力...',
    overallContinuityNoteLabel: 'コンティニュイティ全体メモ（任意）',
    overallContinuityNotePlaceholder: 'プロデューサーへの全体メモを入力またはマイクで音声入力...',
    pronunciationGuideLabel: '10秒発音ガイド（任意 — 人名・地名・ブランド名）',
    pronunciationGuidePlaceholder: '例：Kowalski = コワルスキー、読み間違いやすいお名前や地名など（入力またはマイク）...',
    continuityApprovedBanner: 'コンティニュイティ承認済み — 制作準備完了',
    continuityChangesSentBanner: 'コンティニュイティ修正メモを {brand} へ送信しました',
    blueprintReviewHeading: 'Blueprint レビュー',
    blueprintListenOnlyHeading: 'Blueprint · 試聴専用',
    sectionCoreLabel: 'コア',
    sectionStoryLabel: 'ストーリー',
    sectionCharactersLabel: 'キャスト＆コンティニュイティ',
    sectionBeatsLabel: 'チャプター＆絵コンテ',
    sectionToneLabel: 'トーン＆スタイル',
    listenButtonLabel: '聴く',
    playNarratedStoryboard: 'ナレーション付き絵コンテを再生',
    stopStoryboardPlayback: '再生を停止',
    joinToLeaveFeedbackTitle: 'お名前を入力してフィードバックを残す',
    joinToLeaveFeedbackBody: '上で内容を読み聴きした後、お名前を入力すると各セクションの評価、メモの入力・音声入力、{owner} へのメッセージ送信ができます。',
    continueButton: '続ける',
    yourReviewTab: 'あなたのレビュー',
    teamChatTab: 'メッセージ',
    overallRatingLabel: '総合評価',
    sectionFeedbackHeading: '{section} へのフィードバック',
    sectionNotesPlaceholder: 'このセクションのメモを入力またはマイクで音声入力（任意）...',
    freeformNotesPlaceholder: 'その他ご要望はありますか？入力またはマイクで音声入力（任意）...',
    chatInputPlaceholder: 'メッセージを入力または音声入力...',
    sendButton: '送信',
    submitReviewButton: 'レビューを送信',
    feedbackSubmittedTitle: 'ありがとうございます — フィードバックを送信しました。',
    blueprintApprovedNextSteps: 'ありがとうございます！この Blueprint を承認されたことが {brand} に通知されました。主要な人物・場所・思い出の品の実写写真が必要な場合は、制作開始前にプロデューサーより専用のアップロードリンクをご案内します。',
    photoRequestedBadge: '承認後に写真を依頼',
    photoOptionalBadge: '参考写真（任意）',
    screeningNotesPlaceholder: 'チャプターやタイムスタンプの修正メモを入力または音声入力...',
    viewStudioTerms: '{brand} の利用規約を確認',
    visionGenreLabel: 'ジャンル＆フォーマット：',
  },
  ko: {
    producedBy: '{brand} 제작',
    consentTitle: '프로젝트를 시작하기 전에',
    consentSubtitle:
      '공유하시는 크리에이티브 아이디어, 스토리 및 참고 자료에 대한 권한과 서비스 약관을 확인해 주세요.',
    yourName: '성함',
    yourEmail: '이메일 (선택)',
    mediaRightsLabel:
      '본인은 여기에 제출하는 모든 크리에이티브 콘셉트, 스토리, 이름, 초상 및 참고 자료에 대해 필요한 권리와 허가를 보유하고 있음을 확인합니다.',
    zeroPrivityLabel:
      '본인은 가격 책정, 납품 및 지원에 책임이 있는 유일한 프로덕션 서비스 제공자가 {brand}이며, 기반 소프트웨어 제공자는 직접적인 책임을 지지 않음을 이해합니다.',
    acceptAndBegin: '동의하고 인터뷰 시작',
    tapMicToSpeak: '마이크를 눌러 말씀하세요',
    stopRecording: '마이크 중지',
    tellYourStoryPlaceholder:
      '주요 인물, 동기, 결정적인 장면이나 사건, 배경 공간, 그리고 그것들이 비전을 어떻게 구현하는지 자세히 들려주세요 (또는 마이크를 눌러 말씀하세요)...',
    typeOrSpeakPlaceholder: '여기에 답변을 입력하거나 마이크를 눌러 자연스럽게 말씀해 주세요...',
    resonatingBeatsTitle: '핵심 스토리 비트 및 인물',
    resonatingBeatsSubtitle:
      '인물, 역할, 주요 장면 및 비전에 미치는 영향을 정리하며 실시간으로 업데이트됩니다',
    beatKeyPeopleLabel: '등장인물:',
    sendAnswer: '답변 보내기',
    finishAndCreateBlueprint: '인터뷰 완료 및 Blueprint 생성',
    completingBlueprint: '비전과 인터뷰 내용을 바탕으로 프로덕션 Blueprint를 구성하고 있습니다...',
    interviewCompletedTitle: '감사합니다 — 프로젝트 Blueprint가 프로듀서에게 준비되었습니다',
    interviewCompletedBody:
      '{brand}에 알림이 전송되었으며 곧 맞춤 Blueprint와 연속성 체크리스트를 공유해 드립니다.',
    questionProgress: '{max}단계 중 {current}단계',
    roundBadge: '수정 라운드 {used} / {max}',
    roundLimitReached:
      '포함된 수정 라운드를 모두 사용했습니다. 추가 수정 패키지가 필요하시면 {brand}에 문의해 주세요.',
    approveBlueprint: 'Blueprint 승인',
    blueprintApproved: 'Blueprint 승인됨',
    submitRevisionNotes: '수정 메모 제출',
    continuityPortalTitle: '시각적 연속성 및 사진 수집',
    continuityPortalSubtitle:
      '실제 사진(인물, 장소 또는 주요 소품)을 업로드하고 제작에 사용할 시각적 레퍼런스를 승인해 주세요.',
    uploadReferencePhoto: '사진 업로드 또는 촬영',
    uploadingPhoto: '사진을 안전하게 보호 및 최적화하는 중...',
    photoUploadedClean: '사진 업로드 완료 (개인정보 보호를 위해 위치 메타데이터 제거됨)',
    charactersHeading: '인물 및 캐스트',
    locationsHeading: '장소 및 배경',
    propsHeading: '추억의 물건, 제품 및 소품',
    approveItem: '승인',
    needsAdjustment: '수정 요청',
    submitContinuityReview: '연속성 승인 제출',
    approveFinalVideo: '시사본 승인',
    requestVideoRevision: '시사 수정 메모 제출',
    watermarkPreviewNotice: '클라이언트 검토 프리뷰 — {brand} 제작',
    clientQuotePanelTitle: '서비스 제공자 견적 및 마진 플래너',
    clientQuotePanelSubtitle:
      '클라이언트 가격, 하이브리드 아카이브/AI 비율, 수정 버퍼 및 프로젝트 크레딧 상한을 설계합니다.',
    clientRetailPrice: '클라이언트 가격 (USD)',
    includedRevisions: '포함된 수정 라운드',
    hybridAiVideoMix: 'AI 영상 재연 비율',
    estimatedSceneFlowCogs: '예상 크레딧 비용 (버퍼 포함)',
    estimatedNetProfit: '예상 제공자 순이익',
    applyProjectCeiling: '크레딧 상한 설정 ({credits} cr)',
    visionStepBadge: '1단계 • 프로젝트 비전',
    visionQuestionTitle: '이 프로젝트에 대한 비전은 무엇인가요?',
    visionQuestionSubtitle:
      '이 영상의 대상, 계기나 목표, 시청자가 느끼길 바라는 감정이나 메시지, 참고할 만한 비주얼·톤을 편하게 자세히 들려주세요.',
    visionInputPlaceholder:
      '전반적인 비전을 자세히 설명해 주세요 — 목적, 대상 관객, 감정적·비즈니스 목표, 톤, 예상 분량 (또는 마이크를 눌러 말씀하세요)...',
    visionRefinementPlaceholder:
      '위 질문에 답하거나 프로젝트 비전을 다듬기 위한 조정 사항을 공유해 주세요...',
    clarifyVisionButton: '비전 구체화',
    updateVisionButton: '구체화 내용 업데이트',
    confirmVisionButton: '비전 확정 및 인터뷰 시작',
    editVisionButton: '비전 수정',
    proposedVisionHeading: '구체화된 프로젝트 비전 (검토 및 확정)',
    confirmedVisionHeading: '확정된 프로젝트 비전',
    visionImpactLabel: '기대 효과:',
    visionAudienceLabel: '시청자 및 맥락:',
    visionStyleLabel: '톤 및 비주얼 스타일:',
    visionPassesRemaining: '비전 구체화 {used} / {max}회',
    discoveredPeopleTitle: '인물 및 대상 — 역할과 영향',
    beatImpactLabel: '영향:',
    characterRoleLabel: '역할:',
    characterImpactLabel: '영향:',
    completenessReadyLabel: '탐색 완료 ({score}%) — Blueprint 생성 준비 완료',
    completenessGatheringLabel: '인물 및 핵심 사건 정리 중 ({score}%)',
    submitEarlyButton: '현재 내용으로 먼저 제출하기',
    languageLabel: '언어',
    listeningInLanguage: '{lang} 음성 인식 중 — 자연스럽게 말씀하신 뒤 중지를 눌러 주세요',
    wardrobesHeading: '의상 및 스타일',
    cameraSnapLabel: '카메라',
    referencePhotoNeeded: '참고 사진이 필요합니다 — 아래 갤러리 또는 카메라로 업로드해 주세요.',
    uploadedPhotosCount: '업로드된 사진 ({count})',
    slotRevisionPlaceholder: '의상, 시대 배경, 각도 또는 필요한 조정 사항을 입력하거나 마이크로 말씀하세요...',
    overallContinuityNoteLabel: '전체 연속성 메모 (선택)',
    overallContinuityNotePlaceholder: '프로듀서에게 전할 전체 메모를 입력하거나 마이크로 말씀하세요...',
    pronunciationGuideLabel: '10초 발음 가이드 (선택 — 이름, 지명 또는 브랜드명)',
    pronunciationGuidePlaceholder: '예: Kowalski = 코왈스키; 정확한 발음이 필요한 이름이나 지역명 (입력 또는 마이크)...',
    continuityApprovedBanner: '연속성 승인 완료 — 제작 준비됨',
    continuityChangesSentBanner: '연속성 피드백이 {brand}에 전송되었습니다',
    blueprintReviewHeading: 'Blueprint 검토',
    blueprintListenOnlyHeading: 'Blueprint · 듣기 전용',
    sectionCoreLabel: '핵심',
    sectionStoryLabel: '스토리',
    sectionCharactersLabel: '캐스트 및 연속성',
    sectionBeatsLabel: '챕터 및 스토리보드',
    sectionToneLabel: '톤 및 스타일',
    listenButtonLabel: '듣기',
    playNarratedStoryboard: '내레이션 스토리보드 재생',
    stopStoryboardPlayback: '재생 중지',
    joinToLeaveFeedbackTitle: '이름을 입력하고 피드백 남기기',
    joinToLeaveFeedbackBody: '위 내용을 읽고 들은 뒤 이름을 입력하면 섹션별 평가, 메모 입력·음성 받아쓰기 및 {owner}에게 메시지 전송이 가능합니다.',
    continueButton: '계속하기',
    yourReviewTab: '내 검토',
    teamChatTab: '메시지',
    overallRatingLabel: '전체 평점',
    sectionFeedbackHeading: '{section}에 대한 피드백',
    sectionNotesPlaceholder: '이 섹션의 메모를 입력하거나 마이크로 받아쓰기하세요 (선택)...',
    freeformNotesPlaceholder: '추가로 남기실 말씀이 있나요? 입력하거나 마이크로 말씀하세요 (선택)...',
    chatInputPlaceholder: '메시지를 입력하거나 음성으로 받아쓰기...',
    sendButton: '보내기',
    submitReviewButton: '검토 제출',
    feedbackSubmittedTitle: '감사합니다 — 피드백이 전송되었습니다.',
    blueprintApprovedNextSteps: '감사합니다! 이 Blueprint를 승인하셨다는 알림이 {brand}에 전송되었습니다. 주요 인물, 장소 또는 소품의 실제 사진이 필요한 경우 제작 시작 전 프로듀서가 전용 업로드 링크를 보내드립니다.',
    photoRequestedBadge: '승인 후 사진 요청됨',
    photoOptionalBadge: '참고 사진 선택 사항',
    screeningNotesPlaceholder: '챕터 또는 타임스탬프 수정 메모를 입력하거나 말씀하세요...',
    viewStudioTerms: '{brand} 서비스 약관 보기',
    visionGenreLabel: '장르 및 형식:',
  },
  de: {
    producedBy: 'Produziert von {brand}',
    consentTitle: 'Bevor wir Ihr Projekt starten',
    consentSubtitle:
      'Bitte bestätigen Sie die Nutzungsrechte und Servicebedingungen für die kreativen Ideen, Geschichten und Referenzmedien, die Sie teilen.',
    yourName: 'Ihr vollständiger Name',
    yourEmail: 'Ihre E-Mail-Adresse (optional)',
    mediaRightsLabel:
      'Ich bestätige, dass ich über alle erforderlichen Rechte und Genehmigungen für sämtliche hier eingereichten kreativen Konzepte, Geschichten, Namen, Abbildungen und Referenzmedien verfüge.',
    zeroPrivityLabel:
      'Mir ist bekannt, dass {brand} mein alleiniger Produktionsdienstleister für Preisgestaltung, Lieferung und Support ist und zugrunde liegende Softwareanbieter keine direkte Haftung übernehmen.',
    acceptAndBegin: 'Zustimmen & Interview starten',
    tapMicToSpeak: 'Mikrofon antippen zum Sprechen',
    stopRecording: 'Mikrofon stoppen',
    tellYourStoryPlaceholder:
      'Teilen Sie Ihre Antwort ausführlich mit — zentrale Figuren, Beweggründe, Schlüsselszenen oder Ereignisse, Schauplätze und wie sie Ihre Vision lebendig machen (oder tippen Sie auf das Mikrofon)...',
    typeOrSpeakPlaceholder: 'Antwort hier eingeben oder Mikrofon antippen, um frei zu sprechen...',
    resonatingBeatsTitle: 'Zentrale Story-Beats & Figuren',
    resonatingBeatsSubtitle:
      'Wird live verfeinert, während wir Figuren, Rollen, Schlüsselszenen und deren Wirkung auf Ihre Vision herausarbeiten',
    beatKeyPeopleLabel: 'Figuren:',
    sendAnswer: 'Antwort senden',
    finishAndCreateBlueprint: 'Interview abschließen & Blueprint erstellen',
    completingBlueprint: 'Ihre Vision und Ihr Interview werden zu einem Produktions-Blueprint verdichtet...',
    interviewCompletedTitle: 'Vielen Dank — Ihr Projekt-Blueprint ist für Ihren Produzenten bereit',
    interviewCompletedBody:
      '{brand} wurde benachrichtigt und sendet Ihnen in Kürze Ihr maßgeschneidertes Blueprint sowie die Continuity-Checkliste.',
    questionProgress: 'Schritt {current} von {max}',
    roundBadge: 'Korrekturrunde {used} von {max}',
    roundLimitReached:
      'Die enthaltenen Korrekturrunden sind abgeschlossen. Bitte kontaktieren Sie {brand}, wenn Sie ein zusätzliches Korrekturpaket buchen möchten.',
    approveBlueprint: 'Blueprint freigeben',
    blueprintApproved: 'Blueprint freigegeben',
    submitRevisionNotes: 'Änderungshinweise senden',
    continuityPortalTitle: 'Visuelle Continuity & Fotosammlung',
    continuityPortalSubtitle:
      'Laden Sie echte Fotos (Personen, Orte oder wichtige Gegenstände) hoch und geben Sie die visuellen Referenzen für Ihre Produktion frei.',
    uploadReferencePhoto: 'Foto hochladen oder aufnehmen',
    uploadingPhoto: 'Foto wird geschützt und optimiert...',
    photoUploadedClean: 'Foto hochgeladen (Standort-Metadaten zum Datenschutz entfernt)',
    charactersHeading: 'Personen & Besetzung',
    locationsHeading: 'Orte & Schauplätze',
    propsHeading: 'Erinnerungsstücke, Produkte & Requisiten',
    approveItem: 'Freigeben',
    needsAdjustment: 'Änderung anfragen',
    submitContinuityReview: 'Continuity-Freigabe senden',
    approveFinalVideo: 'Vorführung freigeben',
    requestVideoRevision: 'Vorführungsnotizen senden',
    watermarkPreviewNotice: 'Kundenvorschau — Produziert von {brand}',
    clientQuotePanelTitle: 'Angebots- & Margenplaner für Dienstleister',
    clientQuotePanelSubtitle:
      'Modellieren Sie Kundenpreise, Hybrid-Anteil aus Archiv/KI, Korrekturpuffer und Projekt-Kreditlimits.',
    clientRetailPrice: 'Kundenpreis (USD)',
    includedRevisions: 'Enthaltene Korrekturrunden',
    hybridAiVideoMix: 'Anteil KI-Videonachstellung',
    estimatedSceneFlowCogs: 'Gesch. Kreditkosten (inkl. Puffer)',
    estimatedNetProfit: 'Gesch. Anbietergewinn',
    applyProjectCeiling: 'Kreditlimit festlegen ({credits} cr)',
    visionStepBadge: 'Schritt 1 • Projektvision',
    visionQuestionTitle: 'Was ist Ihre Vision für dieses Projekt?',
    visionQuestionSubtitle:
      'Teilen Sie so viele Details wie hilfreich — für wen dieses Video gedacht ist, Anlass oder Ziel, welches Gefühl oder Ergebnis bei den Zuschauern bleiben soll sowie visuelle oder tonale Inspiration.',
    visionInputPlaceholder:
      'Beschreiben Sie Ihre Gesamtvision ausführlich — Zweck, Zielgruppe, emotionales oder geschäftliches Ziel, Tonalität und ungefähre Länge (oder tippen Sie auf das Mikrofon)...',
    visionRefinementPlaceholder:
      'Beantworten Sie die obige Frage oder teilen Sie Anpassungen mit, um Ihre Projektvision zu schärfen...',
    clarifyVisionButton: 'Vision schärfen',
    updateVisionButton: 'Klärung aktualisieren',
    confirmVisionButton: 'Vision bestätigen & Interview starten',
    editVisionButton: 'Vision bearbeiten',
    proposedVisionHeading: 'Geschärfte Projektvision (prüfen & bestätigen)',
    confirmedVisionHeading: 'Bestätigte Projektvision',
    visionImpactLabel: 'Beabsichtigte Wirkung:',
    visionAudienceLabel: 'Zielgruppe & Kontext:',
    visionStyleLabel: 'Tonalität & visueller Stil:',
    visionPassesRemaining: 'Klärungsdurchgang {used} von {max}',
    discoveredPeopleTitle: 'Figuren & Personen — Rollen & Wirkung',
    beatImpactLabel: 'Wirkung:',
    characterRoleLabel: 'Rolle:',
    characterImpactLabel: 'Wirkung:',
    completenessReadyLabel: 'Erfassung vollständig ({score}%) — Bereit für das Blueprint',
    completenessGatheringLabel: 'Figuren & Schlüsselereignisse werden erfasst ({score}%)',
    submitEarlyButton: 'Vorzeitig mit aktuellen Angaben einreichen',
    languageLabel: 'Sprache',
    listeningInLanguage: 'Hört auf {lang} zu — sprechen Sie natürlich und tippen Sie dann auf Stopp',
    wardrobesHeading: 'Kostüme & Looks',
    cameraSnapLabel: 'Kamera',
    referencePhotoNeeded: 'Referenzfoto benötigt — unten aus Ihrer Galerie oder mit der Kamera hochladen.',
    uploadedPhotosCount: 'Hochgeladene Fotos ({count})',
    slotRevisionPlaceholder: 'Tippen oder Mikrofon nutzen, um Kleidung, Epoche, Perspektive oder Anpassungen zu beschreiben...',
    overallContinuityNoteLabel: 'Allgemeine Continuity-Hinweise (optional)',
    overallContinuityNotePlaceholder: 'Tippen oder Mikrofon nutzen, um allgemeine Hinweise an Ihren Produzenten zu senden...',
    pronunciationGuideLabel: '10-Sekunden-Aussprachehilfe (optional — Namen, Orte oder Marken)',
    pronunciationGuidePlaceholder: 'Beispiel: Kowalski = ko-WAL-ski; besondere Namen oder Orte (tippen oder Mikrofon)...',
    continuityApprovedBanner: 'Continuity freigegeben — Produktionsbereit',
    continuityChangesSentBanner: 'Continuity-Feedback an {brand} gesendet',
    blueprintReviewHeading: 'Blueprint-Prüfung',
    blueprintListenOnlyHeading: 'Blueprint · Nur Anhören',
    sectionCoreLabel: 'Kern',
    sectionStoryLabel: 'Story',
    sectionCharactersLabel: 'Besetzung & Continuity',
    sectionBeatsLabel: 'Kapitel & Storyboard',
    sectionToneLabel: 'Ton & Stil',
    listenButtonLabel: 'Anhören',
    playNarratedStoryboard: 'Vertontes Storyboard abspielen',
    stopStoryboardPlayback: 'Wiedergabe stoppen',
    joinToLeaveFeedbackTitle: 'Namen eingeben für Feedback',
    joinToLeaveFeedbackBody: 'Lesen und hören Sie oben hinein und geben Sie dann Ihren Namen ein, um Abschnitte zu bewerten, Notizen einzugeben oder zu diktieren und {owner} zu schreiben.',
    continueButton: 'Weiter',
    yourReviewTab: 'Ihre Prüfung',
    teamChatTab: 'Nachrichten',
    overallRatingLabel: 'Gesamtbewertung',
    sectionFeedbackHeading: 'Ihr Feedback zu {section}',
    sectionNotesPlaceholder: 'Notizen für diesen Abschnitt eingeben oder per Mikrofon diktieren (optional)...',
    freeformNotesPlaceholder: 'Noch etwas? Eingeben oder Mikrofon zum Sprechen antippen (optional)...',
    chatInputPlaceholder: 'Nachricht schreiben oder diktieren...',
    sendButton: 'Senden',
    submitReviewButton: 'Prüfung absenden',
    feedbackSubmittedTitle: 'Vielen Dank — Ihr Feedback wurde gesendet.',
    blueprintApprovedNextSteps: 'Vielen Dank! {brand} wurde benachrichtigt, dass Sie dieses Blueprint freigegeben haben. Falls Referenzfotos für zentrale Personen, Orte oder Erinnerungsstücke benötigt werden, sendet Ihr Produzent vor Produktionsstart einen privaten Upload-Link.',
    photoRequestedBadge: 'Foto nach Freigabe angefragt',
    photoOptionalBadge: 'Referenzfoto optional',
    screeningNotesPlaceholder: 'Kapitel- oder Zeitstempel-Anmerkungen eingeben oder diktieren...',
    viewStudioTerms: 'Servicebedingungen von {brand} ansehen',
    visionGenreLabel: 'Genre & Format:',
  },
  fr: {
    producedBy: 'Produit par {brand}',
    consentTitle: 'Avant de commencer votre projet',
    consentSubtitle:
      'Veuillez confirmer les autorisations et conditions de service concernant les idées créatives, récits et médias de référence que vous partagez.',
    yourName: 'Votre nom complet',
    yourEmail: 'Votre adresse e-mail (facultatif)',
    mediaRightsLabel:
      'Je confirme détenir les droits et autorisations nécessaires pour l’ensemble des concepts créatifs, récits, noms, images et médias de référence soumis ici.',
    zeroPrivityLabel:
      'Je comprends que {brand} est mon unique prestataire de production responsable de la tarification, de la livraison et du support, et que les fournisseurs de logiciels sous-jacents n’assument aucune responsabilité directe.',
    acceptAndBegin: 'Accepter et démarrer l’entretien',
    tapMicToSpeak: 'Appuyez sur le micro pour parler',
    stopRecording: 'Arrêter le micro',
    tellYourStoryPlaceholder:
      'Partagez votre réponse en détail — personnages clés, motivations, scènes ou événements marquants, décors et comment ils donnent vie à votre vision (ou appuyez sur le micro)...',
    typeOrSpeakPlaceholder: 'Écrivez votre réponse ici ou appuyez sur le micro pour parler naturellement...',
    resonatingBeatsTitle: 'Temps forts et personnages clés',
    resonatingBeatsSubtitle:
      'Affiné en direct à mesure que nous précisons les personnages, leurs rôles, les scènes clés et leur impact sur votre vision',
    beatKeyPeopleLabel: 'Personnages :',
    sendAnswer: 'Envoyer la réponse',
    finishAndCreateBlueprint: 'Terminer l’entretien et créer le Blueprint',
    completingBlueprint: 'Synthèse de votre vision et de votre entretien en Blueprint de production...',
    interviewCompletedTitle: 'Merci — Votre Blueprint de projet est prêt pour votre producteur',
    interviewCompletedBody:
      '{brand} a été informé et partagera bientôt votre Blueprint personnalisé ainsi que la liste de continuité.',
    questionProgress: 'Étape {current} sur {max}',
    roundBadge: 'Cycle de révision {used} sur {max}',
    roundLimitReached:
      'Les cycles de révision inclus sont terminés. Veuillez contacter {brand} si vous souhaitez ajouter un pack de révisions supplémentaires.',
    approveBlueprint: 'Approuver le Blueprint',
    blueprintApproved: 'Blueprint approuvé',
    submitRevisionNotes: 'Envoyer les notes de révision',
    continuityPortalTitle: 'Continuité visuelle et collecte de photos',
    continuityPortalSubtitle:
      'Importez de vraies photos (personnes, lieux ou objets clés) et validez les références visuelles de votre production.',
    uploadReferencePhoto: 'Importer ou prendre une photo',
    uploadingPhoto: 'Sécurisation et optimisation de la photo...',
    photoUploadedClean: 'Photo importée (métadonnées de localisation supprimées par confidentialité)',
    charactersHeading: 'Personnes et distribution',
    locationsHeading: 'Lieux et décors',
    propsHeading: 'Souvenirs, produits et accessoires',
    approveItem: 'Approuver',
    needsAdjustment: 'Demander un ajustement',
    submitContinuityReview: 'Envoyer la validation de continuité',
    approveFinalVideo: 'Approuver la projection',
    requestVideoRevision: 'Envoyer les notes de projection',
    watermarkPreviewNotice: 'Aperçu de révision client — Produit par {brand}',
    clientQuotePanelTitle: 'Planificateur de devis et marge prestataire',
    clientQuotePanelSubtitle:
      'Modélisez le tarif client, le mix hybride archives/IA, la marge de révisions et le plafond de crédits du projet.',
    clientRetailPrice: 'Tarif client (USD)',
    includedRevisions: 'Cycles de révision inclus',
    hybridAiVideoMix: 'Part de reconstitution vidéo IA',
    estimatedSceneFlowCogs: 'Coût est. en crédits (avec marge)',
    estimatedNetProfit: 'Marge nette est. du prestataire',
    applyProjectCeiling: 'Définir le plafond de crédits ({credits} cr)',
    visionStepBadge: 'Étape 1 • Vision du projet',
    visionQuestionTitle: 'Quelle est votre vision pour ce projet ?',
    visionQuestionSubtitle:
      'Partagez autant de détails que possible — à qui s’adresse cette vidéo, l’occasion ou l’objectif, l’émotion ou le message souhaité et toute inspiration visuelle ou tonale.',
    visionInputPlaceholder:
      'Décrivez votre vision globale en détail — objectif, public, impact émotionnel ou commercial, ton et durée approximative (ou appuyez sur le micro)...',
    visionRefinementPlaceholder:
      'Répondez à la question ci-dessus ou ajoutez des ajustements pour affiner la vision de votre projet...',
    clarifyVisionButton: 'Clarifier la vision',
    updateVisionButton: 'Mettre à jour la clarification',
    confirmVisionButton: 'Confirmer la vision et démarrer l’entretien',
    editVisionButton: 'Modifier la vision',
    proposedVisionHeading: 'Vision du projet clarifiée (vérifier et confirmer)',
    confirmedVisionHeading: 'Vision du projet confirmée',
    visionImpactLabel: 'Impact recherché :',
    visionAudienceLabel: 'Public et contexte :',
    visionStyleLabel: 'Ton et style visuel :',
    visionPassesRemaining: 'Passe de clarification {used} sur {max}',
    discoveredPeopleTitle: 'Personnages et sujets — Rôles et impact',
    beatImpactLabel: 'Impact :',
    characterRoleLabel: 'Rôle :',
    characterImpactLabel: 'Impact :',
    completenessReadyLabel: 'Collecte terminée ({score}%) — Prêt à créer le Blueprint',
    completenessGatheringLabel: 'Collecte des personnages et moments clés ({score}%)',
    submitEarlyButton: 'Soumettre maintenant avec les détails actuels',
    languageLabel: 'Langue',
    listeningInLanguage: 'Écoute en {lang} — parlez naturellement, puis appuyez sur Arrêter',
    wardrobesHeading: 'Costumes et tenues',
    cameraSnapLabel: 'Appareil photo',
    referencePhotoNeeded: 'Photo de référence requise — importez depuis votre galerie ou prenez une photo ci-dessous.',
    uploadedPhotosCount: 'Photos importées ({count})',
    slotRevisionPlaceholder: 'Tapez ou appuyez sur le micro pour préciser tenue, époque, angle ou ajustement...',
    overallContinuityNoteLabel: 'Notes générales de continuité (facultatif)',
    overallContinuityNotePlaceholder: 'Tapez ou appuyez sur le micro pour partager vos notes générales avec votre producteur...',
    pronunciationGuideLabel: 'Guide de prononciation rapide (facultatif — noms, villes ou marques)',
    pronunciationGuidePlaceholder: 'Exemple : Kowalski = ko-VAL-ski ; noms propres ou lieux particuliers (tapez ou micro)...',
    continuityApprovedBanner: 'Continuité approuvée — Prêt pour la production',
    continuityChangesSentBanner: 'Retours de continuité envoyés à {brand}',
    blueprintReviewHeading: 'Révision du Blueprint',
    blueprintListenOnlyHeading: 'Blueprint · Écoute uniquement',
    sectionCoreLabel: 'Essentiel',
    sectionStoryLabel: 'Histoire',
    sectionCharactersLabel: 'Distribution et continuité',
    sectionBeatsLabel: 'Chapitres et storyboard',
    sectionToneLabel: 'Ton et style',
    listenButtonLabel: 'Écouter',
    playNarratedStoryboard: 'Lire le storyboard narré',
    stopStoryboardPlayback: 'Arrêter la lecture',
    joinToLeaveFeedbackTitle: 'Indiquez votre nom pour commenter',
    joinToLeaveFeedbackBody: 'Lisez et écoutez ci-dessus, puis saisissez votre nom pour noter les sections, écrire ou dicter des notes et envoyer un message à {owner}.',
    continueButton: 'Continuer',
    yourReviewTab: 'Votre avis',
    teamChatTab: 'Messages',
    overallRatingLabel: 'Note globale',
    sectionFeedbackHeading: 'Votre avis sur {section}',
    sectionNotesPlaceholder: 'Tapez ou appuyez sur le micro pour dicter vos notes sur cette section (facultatif)...',
    freeformNotesPlaceholder: 'Autre chose ? Tapez ou appuyez sur le micro pour parler (facultatif)...',
    chatInputPlaceholder: 'Écrivez ou dictez un message...',
    sendButton: 'Envoyer',
    submitReviewButton: 'Envoyer l’avis',
    feedbackSubmittedTitle: 'Merci — vos commentaires ont bien été envoyés.',
    blueprintApprovedNextSteps: 'Merci ! {brand} a été informé de votre approbation de ce Blueprint. Si des photos de référence sont nécessaires pour des personnes, lieux ou objets clés, votre producteur vous enverra un lien de dépôt privé avant de lancer la production.',
    photoRequestedBadge: 'Photo demandée après approbation',
    photoOptionalBadge: 'Photo de référence facultative',
    screeningNotesPlaceholder: 'Tapez ou dictez vos notes par chapitre ou minutage...',
    viewStudioTerms: 'Consulter les conditions de service de {brand}',
    visionGenreLabel: 'Genre et format :',
  },
  it: {
    producedBy: 'Prodotto da {brand}',
    consentTitle: 'Prima di iniziare il tuo progetto',
    consentSubtitle:
      'Conferma le autorizzazioni e i termini di servizio per le idee creative, le storie e i materiali di riferimento che condividi.',
    yourName: 'Il tuo nome completo',
    yourEmail: 'La tua email (facoltativa)',
    mediaRightsLabel:
      'Confermo di possedere o detenere i diritti e le autorizzazioni necessari per tutti i concetti creativi, le storie, i nomi, le immagini e i materiali di riferimento inviati qui.',
    zeroPrivityLabel:
      'Comprendo che {brand} è il mio unico fornitore di produzione responsabile di prezzi, consegna e supporto, e che i fornitori di software sottostanti non assumono alcuna responsabilità diretta.',
    acceptAndBegin: 'Accetta e inizia l’intervista',
    tapMicToSpeak: 'Tocca il microfono per parlare',
    stopRecording: 'Ferma microfono',
    tellYourStoryPlaceholder:
      'Condividi la tua risposta in dettaglio — personaggi chiave, motivazioni, scene o eventi decisivi, ambientazioni visive e come danno vita alla tua visione (oppure tocca il microfono)...',
    typeOrSpeakPlaceholder: 'Scrivi qui la tua risposta oppure tocca il microfono per parlare naturalmente...',
    resonatingBeatsTitle: 'Snodi narrativi e personaggi chiave',
    resonatingBeatsSubtitle:
      'Aggiornato in tempo reale mentre definiamo personaggi, ruoli, scene chiave e il loro impatto sulla tua visione',
    beatKeyPeopleLabel: 'Personaggi:',
    sendAnswer: 'Invia risposta',
    finishAndCreateBlueprint: 'Termina intervista e crea Blueprint',
    completingBlueprint: 'Sintesi della tua visione e intervista in un Blueprint di produzione...',
    interviewCompletedTitle: 'Grazie — Il Blueprint del tuo progetto è pronto per il tuo produttore',
    interviewCompletedBody:
      '{brand} è stato avvisato e condividerà a breve il tuo Blueprint personalizzato e la checklist di continuità.',
    questionProgress: 'Passaggio {current} di {max}',
    roundBadge: 'Ciclo di revisione {used} di {max}',
    roundLimitReached:
      'I cicli di revisione inclusi sono terminati. Contatta {brand} se desideri aggiungere un pacchetto di revisioni extra.',
    approveBlueprint: 'Approva Blueprint',
    blueprintApproved: 'Blueprint approvato',
    submitRevisionNotes: 'Invia note di revisione',
    continuityPortalTitle: 'Continuità visiva e raccolta foto',
    continuityPortalSubtitle:
      'Carica foto reali (persone, luoghi o oggetti chiave) e approva i riferimenti visivi per la tua produzione.',
    uploadReferencePhoto: 'Carica o scatta foto',
    uploadingPhoto: 'Protezione e ottimizzazione foto in corso...',
    photoUploadedClean: 'Foto caricata (metadati GPS rimossi per la privacy)',
    charactersHeading: 'Persone e cast',
    locationsHeading: 'Luoghi e ambientazioni',
    propsHeading: 'Ricordi, prodotti e oggetti di scena',
    approveItem: 'Approva',
    needsAdjustment: 'Richiedi modifica',
    submitContinuityReview: 'Invia approvazione continuità',
    approveFinalVideo: 'Approva proiezione',
    requestVideoRevision: 'Invia note sulla proiezione',
    watermarkPreviewNotice: 'Anteprima di revisione cliente — Prodotto da {brand}',
    clientQuotePanelTitle: 'Pianificatore preventivo e margini fornitore',
    clientQuotePanelSubtitle:
      'Modella il prezzo al cliente, il mix ibrido archivio/IA, i margini di revisione e il tetto di crediti del progetto.',
    clientRetailPrice: 'Prezzo cliente (USD)',
    includedRevisions: 'Cicli di revisione inclusi',
    hybridAiVideoMix: 'Quota di ricostruzione video IA',
    estimatedSceneFlowCogs: 'Costo crediti stimato (con margine)',
    estimatedNetProfit: 'Profitto netto stimato fornitore',
    applyProjectCeiling: 'Imposta tetto crediti ({credits} cr)',
    visionStepBadge: 'Passaggio 1 • Visione del progetto',
    visionQuestionTitle: 'Qual è la tua visione per questo progetto?',
    visionQuestionSubtitle:
      'Condividi tutti i dettagli utili — a chi è rivolto questo video, l’occasione o l’obiettivo, l’emozione o il messaggio che vuoi lasciare agli spettatori e qualsiasi ispirazione visiva o di tono.',
    visionInputPlaceholder:
      'Descrivi in dettaglio la tua visione complessiva — scopo, pubblico, obiettivo emotivo o commerciale, tono e durata approssimativa (oppure tocca il microfono)...',
    visionRefinementPlaceholder:
      'Rispondi alla domanda sopra o condividi eventuali modifiche per affinare la visione del progetto...',
    clarifyVisionButton: 'Chiarisci visione',
    updateVisionButton: 'Aggiorna chiarimento',
    confirmVisionButton: 'Conferma visione e avvia intervista',
    editVisionButton: 'Modifica visione',
    proposedVisionHeading: 'Visione del progetto chiarita (rivedi e conferma)',
    confirmedVisionHeading: 'Visione del progetto confermata',
    visionImpactLabel: 'Impatto desiderato:',
    visionAudienceLabel: 'Pubblico e contesto:',
    visionStyleLabel: 'Tono e stile visivo:',
    visionPassesRemaining: 'Passaggio di chiarimento {used} di {max}',
    discoveredPeopleTitle: 'Personaggi e soggetti — Ruoli e impatto',
    beatImpactLabel: 'Impatto:',
    characterRoleLabel: 'Ruolo:',
    characterImpactLabel: 'Impatto:',
    completenessReadyLabel: 'Raccolta completata ({score}%) — Pronto per creare il Blueprint',
    completenessGatheringLabel: 'Raccolta personaggi ed eventi chiave ({score}%)',
    submitEarlyButton: 'Invia ora con i dettagli attuali',
    languageLabel: 'Lingua',
    listeningInLanguage: 'Ascolto in {lang} — parla naturalmente, poi tocca Ferma',
    wardrobesHeading: 'Costumi e look',
    cameraSnapLabel: 'Fotocamera',
    referencePhotoNeeded: 'Foto di riferimento necessaria — carica dalla galleria o dalla fotocamera qui sotto.',
    uploadedPhotosCount: 'Foto caricate ({count})',
    slotRevisionPlaceholder: 'Scrivi o tocca il microfono per descrivere abbigliamento, epoca, angolazione o modifica...',
    overallContinuityNoteLabel: 'Note generali sulla continuità (facoltative)',
    overallContinuityNotePlaceholder: 'Scrivi o tocca il microfono per condividere note generali con il tuo produttore...',
    pronunciationGuideLabel: 'Guida alla pronuncia di 10 secondi (facoltativa — nomi, città o brand)',
    pronunciationGuidePlaceholder: 'Esempio: Kowalski = ko-VAL-ski; nomi propri o luoghi particolari (scrivi o microfono)...',
    continuityApprovedBanner: 'Continuità approvata — Pronto per la produzione',
    continuityChangesSentBanner: 'Feedback sulla continuità inviato a {brand}',
    blueprintReviewHeading: 'Revisione Blueprint',
    blueprintListenOnlyHeading: 'Blueprint · Solo ascolto',
    sectionCoreLabel: 'Essenza',
    sectionStoryLabel: 'Storia',
    sectionCharactersLabel: 'Cast e continuità',
    sectionBeatsLabel: 'Capitoli e storyboard',
    sectionToneLabel: 'Tono e stile',
    listenButtonLabel: 'Ascolta',
    playNarratedStoryboard: 'Riproduci storyboard narrato',
    stopStoryboardPlayback: 'Ferma riproduzione',
    joinToLeaveFeedbackTitle: 'Inserisci il tuo nome per lasciare feedback',
    joinToLeaveFeedbackBody: 'Leggi e ascolta sopra, poi inserisci il tuo nome per valutare le sezioni, scrivere o dettare note e inviare messaggi a {owner}.',
    continueButton: 'Continua',
    yourReviewTab: 'La tua revisione',
    teamChatTab: 'Messaggi',
    overallRatingLabel: 'Valutazione complessiva',
    sectionFeedbackHeading: 'Il tuo feedback su {section}',
    sectionNotesPlaceholder: 'Scrivi o tocca il microfono per dettare note per questa sezione (facoltativo)...',
    freeformNotesPlaceholder: 'Altro da aggiungere? Scrivi o tocca il microfono per parlare (facoltativo)...',
    chatInputPlaceholder: 'Scrivi o detta un messaggio...',
    sendButton: 'Invia',
    submitReviewButton: 'Invia revisione',
    feedbackSubmittedTitle: 'Grazie — il tuo feedback è stato inviato.',
    blueprintApprovedNextSteps: 'Grazie! {brand} è stato avvisato che hai approvato questo Blueprint. Se servono foto di riferimento per persone, luoghi o ricordi chiave, il tuo produttore ti invierà un link privato di caricamento prima di avviare la Produzione.',
    photoRequestedBadge: 'Foto richiesta dopo l’approvazione',
    photoOptionalBadge: 'Foto di riferimento facoltativa',
    screeningNotesPlaceholder: 'Scrivi o detta note su capitoli o minutaggio...',
    viewStudioTerms: 'Consulta i termini di servizio di {brand}',
    visionGenreLabel: 'Genere e formato:',
  },
  nl: {
    producedBy: 'Geproduceerd door {brand}',
    consentTitle: 'Voordat we aan je project beginnen',
    consentSubtitle:
      'Bevestig de toestemming en servicevoorwaarden voor de creatieve ideeën, verhalen en referentiemedia die je deelt.',
    yourName: 'Je volledige naam',
    yourEmail: 'Je e-mailadres (optioneel)',
    mediaRightsLabel:
      'Ik bevestig dat ik de vereiste rechten en toestemming bezit voor alle creatieve concepten, verhalen, namen, portretten en referentiemedia die ik hier indien.',
    zeroPrivityLabel:
      'Ik begrijp dat {brand} mijn enige productiepartner is die verantwoordelijk is voor prijsstelling, levering en ondersteuning, en dat onderliggende softwareleveranciers geen directe aansprakelijkheid dragen.',
    acceptAndBegin: 'Akkoord & interview starten',
    tapMicToSpeak: 'Tik op microfoon om te spreken',
    stopRecording: 'Microfoon stoppen',
    tellYourStoryPlaceholder:
      'Deel je antwoord uitgebreid — hoofdpersonages, drijfveren, sleutelscènes of gebeurtenissen, visuele locaties en hoe ze jouw visie tot leven brengen (of tik op de microfoon)...',
    typeOrSpeakPlaceholder: 'Typ hier je antwoord of tik op de microfoon om natuurlijk te spreken...',
    resonatingBeatsTitle: 'Belangrijkste verhaalbeats & personages',
    resonatingBeatsSubtitle:
      'Live verfijnd terwijl we personages, rollen, sleutelscènes en hun impact op jouw visie uitwerken',
    beatKeyPeopleLabel: 'Personages:',
    sendAnswer: 'Antwoord verzenden',
    finishAndCreateBlueprint: 'Interview afronden & Blueprint maken',
    completingBlueprint: 'Je visie en interview worden samengebracht tot een productie-Blueprint...',
    interviewCompletedTitle: 'Bedankt — Je project-Blueprint staat klaar voor je producent',
    interviewCompletedBody:
      '{brand} heeft bericht ontvangen en deelt binnenkort je Blueprint op maat en continuïteitschecklist.',
    questionProgress: 'Stap {current} van {max}',
    roundBadge: 'Revisieronde {used} van {max}',
    roundLimitReached:
      'De inbegrepen revisierondes zijn gebruikt. Neem contact op met {brand} als je een extra revisiepakket wilt toevoegen.',
    approveBlueprint: 'Blueprint goedkeuren',
    blueprintApproved: 'Blueprint goedgekeurd',
    submitRevisionNotes: 'Revisienotities verzenden',
    continuityPortalTitle: 'Visuele continuïteit & fotoverzameling',
    continuityPortalSubtitle:
      'Upload echte foto’s (personen, locaties of belangrijke voorwerpen) en keur de visuele referenties voor je productie goed.',
    uploadReferencePhoto: 'Foto uploaden of maken',
    uploadingPhoto: 'Foto beveiligen en optimaliseren...',
    photoUploadedClean: 'Foto geüpload (locatiemetadata verwijderd voor privacy)',
    charactersHeading: 'Personen & cast',
    locationsHeading: 'Locaties & omgevingen',
    propsHeading: 'Aandenkens, producten & rekwisieten',
    approveItem: 'Goedkeuren',
    needsAdjustment: 'Aanpassing vragen',
    submitContinuityReview: 'Continuïteitsgoedkeuring verzenden',
    approveFinalVideo: 'Vertoning goedkeuren',
    requestVideoRevision: 'Notities bij vertoning verzenden',
    watermarkPreviewNotice: 'Klantvoorbeeld — Geproduceerd door {brand}',
    clientQuotePanelTitle: 'Offerte- & margeplanner voor dienstverleners',
    clientQuotePanelSubtitle:
      'Modelleer klantprijzen, hybride archief/AI-verhouding, revisiebuffers en projectkredietlimieten.',
    clientRetailPrice: 'Klantprijs (USD)',
    includedRevisions: 'Inbegrepen revisierondes',
    hybridAiVideoMix: 'Aandeel AI-videoreconstructie',
    estimatedSceneFlowCogs: 'Gesch. kredietkosten (incl. buffer)',
    estimatedNetProfit: 'Gesch. aanbiederswinst',
    applyProjectCeiling: 'Kredietplafond instellen ({credits} cr)',
    visionStepBadge: 'Stap 1 • Projectvisie',
    visionQuestionTitle: 'Wat is je visie voor dit project?',
    visionQuestionSubtitle:
      'Deel zoveel details als nuttig — voor wie deze video bedoeld is, de gelegenheid of het doel, het gevoel of de boodschap die kijkers moeten meenemen, en eventuele visuele of tonale inspiratie.',
    visionInputPlaceholder:
      'Beschrijf je algemene visie uitgebreid — doel, publiek, emotioneel of zakelijk resultaat, toon en geschatte duur (of tik op de microfoon)...',
    visionRefinementPlaceholder:
      'Beantwoord de bovenstaande vraag of deel aanpassingen om je projectvisie verder aan te scherpen...',
    clarifyVisionButton: 'Visie verhelderen',
    updateVisionButton: 'Verheldering bijwerken',
    confirmVisionButton: 'Visie bevestigen & interview starten',
    editVisionButton: 'Visie bewerken',
    proposedVisionHeading: 'Verhelderde projectvisie (controleren & bevestigen)',
    confirmedVisionHeading: 'Bevestigde projectvisie',
    visionImpactLabel: 'Beoogde impact:',
    visionAudienceLabel: 'Publiek & context:',
    visionStyleLabel: 'Toon & visuele stijl:',
    visionPassesRemaining: 'Verhelderingsronde {used} van {max}',
    discoveredPeopleTitle: 'Personages & personen — Rollen & impact',
    beatImpactLabel: 'Impact:',
    characterRoleLabel: 'Rol:',
    characterImpactLabel: 'Impact:',
    completenessReadyLabel: 'Inventarisatie compleet ({score}%) — Klaar om Blueprint te maken',
    completenessGatheringLabel: 'Personages & sleutelmomenten verzamelen ({score}%)',
    submitEarlyButton: 'Nu al indienen met huidige gegevens',
    languageLabel: 'Taal',
    listeningInLanguage: 'Luistert in {lang} — spreek natuurlijk en tik daarna op Stoppen',
    wardrobesHeading: 'Kostuums & looks',
    cameraSnapLabel: 'Camera',
    referencePhotoNeeded: 'Referentiefoto vereist — upload hieronder vanuit je galerij of camera.',
    uploadedPhotosCount: 'Geüploade foto’s ({count})',
    slotRevisionPlaceholder: 'Typ of tik op de microfoon om kleding, tijdperk, hoek of aanpassing te beschrijven...',
    overallContinuityNoteLabel: 'Algemene continuïteitsnotities (optioneel)',
    overallContinuityNotePlaceholder: 'Typ of tik op de microfoon om algemene notities met je producent te delen...',
    pronunciationGuideLabel: 'Uitspraakgids van 10 seconden (optioneel — namen, plaatsen of merken)',
    pronunciationGuidePlaceholder: 'Voorbeeld: Kowalski = ko-WAL-ski; bijzondere namen of plaatsnamen (typ of microfoon)...',
    continuityApprovedBanner: 'Continuïteit goedgekeurd — Klaar voor productie',
    continuityChangesSentBanner: 'Continuïteitsfeedback verzonden naar {brand}',
    blueprintReviewHeading: 'Blueprint-beoordeling',
    blueprintListenOnlyHeading: 'Blueprint · Alleen luisteren',
    sectionCoreLabel: 'Kern',
    sectionStoryLabel: 'Verhaal',
    sectionCharactersLabel: 'Cast & continuïteit',
    sectionBeatsLabel: 'Hoofdstukken & storyboard',
    sectionToneLabel: 'Toon & stijl',
    listenButtonLabel: 'Luisteren',
    playNarratedStoryboard: 'Ingesproken storyboard afspelen',
    stopStoryboardPlayback: 'Afspelen stoppen',
    joinToLeaveFeedbackTitle: 'Vul je naam in om feedback te geven',
    joinToLeaveFeedbackBody: 'Lees en luister hierboven, vul daarna je naam in om secties te beoordelen, notities te typen of in te spreken en {owner} een bericht te sturen.',
    continueButton: 'Doorgaan',
    yourReviewTab: 'Jouw beoordeling',
    teamChatTab: 'Berichten',
    overallRatingLabel: 'Algemene beoordeling',
    sectionFeedbackHeading: 'Jouw feedback op {section}',
    sectionNotesPlaceholder: 'Typ of tik op de microfoon om notities voor deze sectie in te spreken (optioneel)...',
    freeformNotesPlaceholder: 'Nog iets toe te voegen? Typ of tik op de microfoon om te spreken (optioneel)...',
    chatInputPlaceholder: 'Typ of spreek een bericht in...',
    sendButton: 'Verzenden',
    submitReviewButton: 'Beoordeling verzenden',
    feedbackSubmittedTitle: 'Bedankt — je feedback is verzonden.',
    blueprintApprovedNextSteps: 'Bedankt! {brand} is op de hoogte gebracht dat je dit Blueprint hebt goedgekeurd. Als er referentiefoto’s nodig zijn voor belangrijke personen, locaties of aandenkens, stuurt je producent een privé-uploadlink voordat de productie start.',
    photoRequestedBadge: 'Foto gevraagd na goedkeuring',
    photoOptionalBadge: 'Referentiefoto optioneel',
    screeningNotesPlaceholder: 'Typ of spreek notities in per hoofdstuk of tijdscode...',
    viewStudioTerms: 'Servicevoorwaarden van {brand} bekijken',
    visionGenreLabel: 'Genre & formaat:',
  },
  ru: {
    producedBy: 'Производство: {brand}',
    consentTitle: 'Перед началом вашего проекта',
    consentSubtitle:
      'Пожалуйста, подтвердите права и условия обслуживания для творческих идей, историй и справочных материалов, которыми вы делитесь.',
    yourName: 'Ваше полное имя',
    yourEmail: 'Ваш email (необязательно)',
    mediaRightsLabel:
      'Я подтверждаю, что владею или располагаю необходимыми правами и разрешениями на все творческие концепции, истории, имена, образы и справочные материалы, передаваемые здесь.',
    zeroPrivityLabel:
      'Я понимаю, что {brand} является моим единственным поставщиком производственных услуг, ответственным за стоимость, доставку и поддержку, а поставщики базового программного обеспечения не несут прямой ответственности.',
    acceptAndBegin: 'Согласиться и начать интервью',
    tapMicToSpeak: 'Нажмите на микрофон, чтобы говорить',
    stopRecording: 'Остановить микрофон',
    tellYourStoryPlaceholder:
      'Расскажите подробно — ключевые герои, их мотивы, поворотные сцены или события, визуальные локации и то, как они воплощают ваше видение (или нажмите на микрофон)...',
    typeOrSpeakPlaceholder: 'Введите ответ здесь или нажмите на микрофон, чтобы говорить естественно...',
    resonatingBeatsTitle: 'Ключевые сюжетные вехи и персонажи',
    resonatingBeatsSubtitle:
      'Обновляется в реальном времени по мере уточнения персонажей, ролей, ключевых сцен и их влияния на ваше видение',
    beatKeyPeopleLabel: 'Персонажи:',
    sendAnswer: 'Отправить ответ',
    finishAndCreateBlueprint: 'Завершить интервью и создать Blueprint',
    completingBlueprint: 'Преобразуем ваше видение и интервью в производственный Blueprint...',
    interviewCompletedTitle: 'Спасибо — Blueprint вашего проекта готов для продюсера',
    interviewCompletedBody:
      '{brand} получил уведомление и скоро отправит вам персональный Blueprint и чек-лист визуальной преемственности.',
    questionProgress: 'Шаг {current} из {max}',
    roundBadge: 'Раунд правок {used} из {max}',
    roundLimitReached:
      'Включённые раунды правок исчерпаны. Свяжитесь с {brand}, если хотите добавить дополнительный пакет правок.',
    approveBlueprint: 'Утвердить Blueprint',
    blueprintApproved: 'Blueprint утверждён',
    submitRevisionNotes: 'Отправить заметки по правкам',
    continuityPortalTitle: 'Визуальная преемственность и сбор фотографий',
    continuityPortalSubtitle:
      'Загрузите реальные фотографии (люди, места или важные предметы) и утвердите визуальные референсы для вашего проекта.',
    uploadReferencePhoto: 'Загрузить или сделать фото',
    uploadingPhoto: 'Защита и оптимизация фотографии...',
    photoUploadedClean: 'Фото загружено (метаданные геолокации удалены для конфиденциальности)',
    charactersHeading: 'Люди и персонажи',
    locationsHeading: 'Места и локации',
    propsHeading: 'Памятные вещи, продукты и реквизит',
    approveItem: 'Утвердить',
    needsAdjustment: 'Запросить правку',
    submitContinuityReview: 'Отправить утверждение преемственности',
    approveFinalVideo: 'Утвердить просмотр',
    requestVideoRevision: 'Отправить заметки по просмотру',
    watermarkPreviewNotice: 'Предпросмотр для клиента — производство {brand}',
    clientQuotePanelTitle: 'Калькулятор сметы и маржи провайдера',
    clientQuotePanelSubtitle:
      'Моделируйте цену для клиента, гибридную долю архива/ИИ, буфер правок и лимит кредитов проекта.',
    clientRetailPrice: 'Цена для клиента (USD)',
    includedRevisions: 'Включённые раунды правок',
    hybridAiVideoMix: 'Доля ИИ-видеореконструкции',
    estimatedSceneFlowCogs: 'Оценоч. стоимость кредитов (с запасом)',
    estimatedNetProfit: 'Оценоч. чистая прибыль провайдера',
    applyProjectCeiling: 'Задать лимит кредитов ({credits} cr)',
    visionStepBadge: 'Шаг 1 • Видение проекта',
    visionQuestionTitle: 'Каково ваше видение этого проекта?',
    visionQuestionSubtitle:
      'Поделитесь всеми важными деталями — для кого это видео, повод или цель, какие эмоции или выводы вы хотите вызвать у зрителей, а также визуальными или тональными ориентирами.',
    visionInputPlaceholder:
      'Опишите общее видение подробно — цель, аудиторию, эмоциональный или бизнес-результат, тон и примерную длительность (или нажмите на микрофон)...',
    visionRefinementPlaceholder:
      'Ответьте на вопрос выше или добавьте уточнения, чтобы отточить видение проекта...',
    clarifyVisionButton: 'Уточнить видение',
    updateVisionButton: 'Обновить уточнение',
    confirmVisionButton: 'Подтвердить видение и начать интервью',
    editVisionButton: 'Изменить видение',
    proposedVisionHeading: 'Уточнённое видение проекта (проверьте и подтвердите)',
    confirmedVisionHeading: 'Подтверждённое видение проекта',
    visionImpactLabel: 'Ожидаемый эффект:',
    visionAudienceLabel: 'Аудитория и контекст:',
    visionStyleLabel: 'Тон и визуальный стиль:',
    visionPassesRemaining: 'Раунд уточнения {used} из {max}',
    discoveredPeopleTitle: 'Персонажи и герои — Роли и влияние',
    beatImpactLabel: 'Влияние:',
    characterRoleLabel: 'Роль:',
    characterImpactLabel: 'Влияние:',
    completenessReadyLabel: 'Сбор данных завершён ({score}%) — Готово к созданию Blueprint',
    completenessGatheringLabel: 'Собираем персонажей и ключевые события ({score}%)',
    submitEarlyButton: 'Отправить раньше с текущими данными',
    languageLabel: 'Язык',
    listeningInLanguage: 'Слушаю ({lang}) — говорите естественно, затем нажмите «Остановить»',
    wardrobesHeading: 'Костюмы и образы',
    cameraSnapLabel: 'Камера',
    referencePhotoNeeded: 'Нужно справочное фото — загрузите из галереи или снимите на камеру ниже.',
    uploadedPhotosCount: 'Загружено фото ({count})',
    slotRevisionPlaceholder: 'Напишите или нажмите на микрофон, чтобы описать одежду, эпоху, ракурс или нужную правку...',
    overallContinuityNoteLabel: 'Общие заметки по преемственности (необязательно)',
    overallContinuityNotePlaceholder: 'Напишите или нажмите на микрофон, чтобы оставить общие заметки для продюсера...',
    pronunciationGuideLabel: '10-секундный гид по произношению (необязательно — имена, города или бренды)',
    pronunciationGuidePlaceholder: 'Пример: Kowalski = Ко-ВАЛЬ-ски; сложные фамилии или названия (текстом или голосом)...',
    continuityApprovedBanner: 'Визуальная преемственность утверждена — Готово к производству',
    continuityChangesSentBanner: 'Замечания по преемственности отправлены в {brand}',
    blueprintReviewHeading: 'Обзор Blueprint',
    blueprintListenOnlyHeading: 'Blueprint · Только прослушивание',
    sectionCoreLabel: 'Основа',
    sectionStoryLabel: 'История',
    sectionCharactersLabel: 'Персонажи и референсы',
    sectionBeatsLabel: 'Главы и раскадровка',
    sectionToneLabel: 'Тон и стиль',
    listenButtonLabel: 'Слушать',
    playNarratedStoryboard: 'Воспроизвести озвученную раскадровку',
    stopStoryboardPlayback: 'Остановить воспроизведение',
    joinToLeaveFeedbackTitle: 'Укажите имя, чтобы оставить отзыв',
    joinToLeaveFeedbackBody: 'Прочитайте и прослушайте материал выше, затем введите своё имя, чтобы оценивать разделы, писать или диктовать заметки и общаться с {owner}.',
    continueButton: 'Продолжить',
    yourReviewTab: 'Ваш отзыв',
    teamChatTab: 'Сообщения',
    overallRatingLabel: 'Общая оценка',
    sectionFeedbackHeading: 'Ваш отзыв о разделе «{section}»',
    sectionNotesPlaceholder: 'Напишите или нажмите на микрофон, чтобы надиктовать заметки по этому разделу (необязательно)...',
    freeformNotesPlaceholder: 'Что-то ещё? Напишите или нажмите на микрофон, чтобы продиктовать (необязательно)...',
    chatInputPlaceholder: 'Напишите или надиктуйте сообщение...',
    sendButton: 'Отправить',
    submitReviewButton: 'Отправить отзыв',
    feedbackSubmittedTitle: 'Спасибо — ваш отзыв отправлен.',
    blueprintApprovedNextSteps: 'Спасибо! {brand} получил уведомление о том, что вы утвердили этот Blueprint. Если потребуются реальные фотографии ключевых людей, мест или памятных вещей, продюсер пришлёт вам приватную ссылку для загрузки перед началом производства.',
    photoRequestedBadge: 'Фото потребуется после утверждения',
    photoOptionalBadge: 'Справочное фото необязательно',
    screeningNotesPlaceholder: 'Напишите или продиктуйте заметки по главам или таймкодам...',
    viewStudioTerms: 'Условия обслуживания {brand}',
    visionGenreLabel: 'Жанр и формат:',
  },
}

export function formatPortalCopy(
  locale: ClientPortalLocale,
  key: keyof ClientPortalStrings,
  vars?: Record<string, string | number>
): string {
  const template = CLIENT_PORTAL_COPY[locale]?.[key] ?? CLIENT_PORTAL_COPY.en[key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, token) =>
    vars[token] !== undefined ? String(vars[token]) : `{${token}}`
  )
}

export interface PortalPrivacyConsentExtras {
  voiceLocalizationLabel: string
  privacyHygieneNote: string
}

export const PORTAL_PRIVACY_CONSENT_EXTRAS: Record<ClientPortalLocale, PortalPrivacyConsentExtras> = {
  en: {
    voiceLocalizationLabel:
      'Optional: I also authorize multilingual voice timbre localization if dubbed editions are included in my package.',
    privacyHygieneNote:
      'Privacy guarantee: Your family or company photos and personal stories are never used to train shared AI models, and uploaded images are automatically stripped of EXIF location metadata.',
  },
  es: {
    voiceLocalizationLabel:
      'Opcional: También autorizo la localización multilingüe del timbre de voz si mi paquete incluye ediciones dobladas.',
    privacyHygieneNote:
      'Garantía de privacidad: Sus fotografías personales o empresariales e historias nunca se usan para entrenar modelos compartidos de IA, y los metadatos de ubicación EXIF se eliminan automáticamente.',
  },
  pt: {
    voiceLocalizationLabel:
      'Opcional: Também autorizo a localização multilíngue do timbre vocal caso meu pacote inclua versões dubladas.',
    privacyHygieneNote:
      'Garantia de privacidade: Suas fotos pessoais ou corporativas e histórias nunca são usadas para treinar modelos compartilhados de IA, e os metadados de localização EXIF são removidos automaticamente.',
  },
  hi: {
    voiceLocalizationLabel:
      'वैकल्पिक: यदि मेरे पैकेज में बहुभाषी संस्करण शामिल हैं, तो मैं वॉइस टिम्बर लोकलाइज़ेशन के लिए भी अनुमति देता/देती हूँ।',
    privacyHygieneNote:
      'गोपनीयता गारंटी: आपकी पारिवारिक या व्यावसायिक तस्वीरें और कहानियाँ कभी भी साझा AI मॉडल को प्रशिक्षित करने के लिए उपयोग नहीं की जातीं, और EXIF लोकेशन मेटाडेटा स्वतः हटा दिया जाता है।',
  },
  'zh-CN': {
    voiceLocalizationLabel:
      '可选：如我的套餐包含多语种译制版本，我亦授权进行多语言音色本地化合成。',
    privacyHygieneNote:
      '隐私承诺：您的家庭或企业照片与个人故事绝不会用于训练共享 AI 模型，且上传图像会自动清除 EXIF 位置信息元数据。',
  },
  ar: {
    voiceLocalizationLabel:
      'اختياري: أوافق أيضاً على توطين نبرة الصوت بعدة لغات إذا كانت باقتي تتضمن نسخاً مدبلجة.',
    privacyHygieneNote:
      'ضمان الخصوصية: لا تُستخدم صورك العائلية أو المؤسسية وقصصك الشخصية أبداً لتدريب نماذج الذكاء الاصطناعي المشتركة، وتُزال بيانات الموقع الجغرافي (EXIF) تلقائياً عند الرفع.',
  },
  th: {
    voiceLocalizationLabel:
      'ตัวเลือกเสริม: ข้าพเจ้าอนุญาตให้ปรับเทียบโทนเสียงหลายภาษาเพิ่มเติม หากแพ็กเกจของข้าพเจ้ารวมฉบับพากย์หลายภาษาไว้ด้วย',
    privacyHygieneNote:
      'การรับรองความเป็นส่วนตัว: ภาพถ่ายครอบครัวหรือองค์กรและเรื่องราวส่วนบุคคลของคุณจะไม่ถูกนำไปใช้ฝึกสอนโมเดล AI สาธารณะ และข้อมูลพิกัด EXIF จะถูกลบออกโดยอัตโนมัติ',
  },
  ja: {
    voiceLocalizationLabel:
      '任意：パッケージに吹き替え版が含まれる場合、声質の多言語ローカライズについても許可します。',
    privacyHygieneNote:
      'プライバシー保証：ご家族や企業の写真・個人的なストーリーが共有AIモデルの学習に使用されることは一切なく、アップロードされた画像からはEXIF位置情報メタデータが自動的に削除されます。',
  },
  ko: {
    voiceLocalizationLabel:
      '선택: 패키지에 더빙 버전이 포함된 경우 다국어 음색 현지화도 함께 승인합니다.',
    privacyHygieneNote:
      '개인정보 보호 보증: 가족이나 기업의 사진 및 개인 이야기는 공용 AI 모델 학습에 절대 사용되지 않으며, 업로드된 이미지의 EXIF 위치 메타데이터는 자동으로 제거됩니다.',
  },
  de: {
    voiceLocalizationLabel:
      'Optional: Ich genehmige zudem die mehrsprachige Stimmfarben-Lokalisierung, sofern synchronisierte Fassungen in meinem Paket enthalten sind.',
    privacyHygieneNote:
      'Datenschutzgarantie: Ihre Familien- oder Unternehmensfotos und persönlichen Geschichten werden niemals zum Training gemeinsamer KI-Modelle verwendet, und EXIF-Standortdaten werden beim Hochladen automatisch entfernt.',
  },
  fr: {
    voiceLocalizationLabel:
      'Facultatif : J’autorise également la localisation multilingue du timbre vocal si des versions doublées sont incluses dans mon forfait.',
    privacyHygieneNote:
      'Garantie de confidentialité : Vos photos familiales ou d’entreprise et vos récits personnels ne sont jamais utilisés pour entraîner des modèles d’IA partagés, et les métadonnées de localisation EXIF sont automatiquement supprimées.',
  },
  it: {
    voiceLocalizationLabel:
      'Facoltativo: Autorizzo inoltre la localizzazione multilingue del timbro vocale qualora il mio pacchetto includa edizioni doppiate.',
    privacyHygieneNote:
      'Garanzia di privacy: Le tue foto familiari o aziendali e le tue storie personali non vengono mai utilizzate per addestrare modelli di IA condivisi, e i metadati di posizione EXIF vengono rimossi automaticamente.',
  },
  nl: {
    voiceLocalizationLabel:
      'Optioneel: Ik geef ook toestemming voor meertalige lokalisatie van het stemgeluid als nagesynchroniseerde versies deel uitmaken van mijn pakket.',
    privacyHygieneNote:
      'Privacygarantie: Je familie- of bedrijfsfoto’s en persoonlijke verhalen worden nooit gebruikt om gedeelde AI-modellen te trainen, en EXIF-locatiemetadata worden automatisch van geüploade afbeeldingen verwijderd.',
  },
  ru: {
    voiceLocalizationLabel:
      'Необязательно: Я также разрешаю многоязычную локализацию тембра голоса, если в мой пакет входят дублированные версии.',
    privacyHygieneNote:
      'Гарантия конфиденциальности: Ваши семейные или корпоративные фотографии и личные истории никогда не используются для обучения общих моделей ИИ, а метаданные геолокации EXIF автоматически удаляются при загрузке.',
  },
}

export function getPortalPrivacyConsentExtras(
  locale: ClientPortalLocale
): PortalPrivacyConsentExtras {
  return PORTAL_PRIVACY_CONSENT_EXTRAS[locale] ?? PORTAL_PRIVACY_CONSENT_EXTRAS.en
}
