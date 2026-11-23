export type ClientPortalLocale = 'en' | 'es' | 'pt' | 'hi' | 'zh-CN' | 'ar' | 'th'

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
}

export function getPortalPrivacyConsentExtras(
  locale: ClientPortalLocale
): PortalPrivacyConsentExtras {
  return PORTAL_PRIVACY_CONSENT_EXTRAS[locale] ?? PORTAL_PRIVACY_CONSENT_EXTRAS.en
}
