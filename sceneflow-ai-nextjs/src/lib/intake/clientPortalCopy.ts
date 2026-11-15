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
}

export const CLIENT_PORTAL_COPY: Record<ClientPortalLocale, ClientPortalStrings> = {
  en: {
    producedBy: 'Produced by {brand}',
    consentTitle: 'Before We Begin Your Story',
    consentSubtitle: 'Please confirm permissions for your shared stories and photographs.',
    yourName: 'Your Full Name',
    yourEmail: 'Your Email (optional)',
    mediaRightsLabel:
      'I confirm that I own or hold family, estate, or client permission to share all stories, names, and photographs submitted here.',
    zeroPrivityLabel:
      'I understand that {brand} is my sole production service provider responsible for pricing, delivery, and support, and underlying software providers assume no direct liability.',
    acceptAndBegin: 'Agree & Start Interview',
    tapMicToSpeak: 'Tap Microphone to Speak',
    stopRecording: 'Stop Microphone',
    tellYourStoryPlaceholder:
      'Take your time and tell us your story in detail — early years, turning points, cherished places, and the specific individual people who shaped your life (or tap the microphone to speak)...',
    typeOrSpeakPlaceholder: 'Share your answer here, or tap the microphone to speak naturally...',
    resonatingBeatsTitle: 'Emerging Story Beats & Key Individuals',
    resonatingBeatsSubtitle:
      'Refined live as we clarify ages, eras, and the individual people in each chapter',
    beatKeyPeopleLabel: 'Key People:',
    sendAnswer: 'Send Answer',
    finishAndCreateBlueprint: 'Submit Story & Build Blueprint',
    completingBlueprint: 'Organizing your story into a production blueprint...',
    interviewCompletedTitle: 'Thank You — Your Story Blueprint Is Ready for Your Producer',
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
    discoveredPeopleTitle: 'Key People, Roles & Impact',
    beatImpactLabel: 'Impact:',
    characterRoleLabel: 'Role:',
    characterImpactLabel: 'Impact:',
    completenessReadyLabel: 'Discovery Complete ({score}%) — Ready to Build Blueprint',
    completenessGatheringLabel: 'Gathering Characters & Key Events ({score}%)',
    submitEarlyButton: 'Submit early with current details',
  },
  es: {
    producedBy: 'Producido por {brand}',
    consentTitle: 'Antes de Comenzar su Historia',
    consentSubtitle: 'Confirme los permisos sobre las historias y fotografías compartidas.',
    yourName: 'Su Nombre Completo',
    yourEmail: 'Su Correo Electrónico (opcional)',
    mediaRightsLabel:
      'Confirmo que poseo o cuento con autorización familiar, sucesoria o comercial para compartir las historias, nombres y fotografías enviadas.',
    zeroPrivityLabel:
      'Entiendo que {brand} es mi único proveedor de producción responsable de precios, entregas y soporte, sin responsabilidad directa de los proveedores de software subyacentes.',
    acceptAndBegin: 'Aceptar e Iniciar Entrevista',
    tapMicToSpeak: 'Tocar Micrófono para Hablar',
    stopRecording: 'Detener Micrófono',
    tellYourStoryPlaceholder:
      'Tómese su tiempo y cuéntenos su historia en detalle: infancia, momentos decisivos, lugares especiales y las personas individuales que marcaron su vida (o use el micrófono)...',
    typeOrSpeakPlaceholder: 'Escriba su respuesta o toque el micrófono para hablar con naturalidad...',
    resonatingBeatsTitle: 'Capítulos Clave y Personas Destacadas',
    resonatingBeatsSubtitle:
      'Se actualiza en vivo mientras afinamos edades, épocas y personas individuales por escena',
    beatKeyPeopleLabel: 'Personas clave:',
    sendAnswer: 'Enviar Respuesta',
    finishAndCreateBlueprint: 'Finalizar y Crear Guion Base',
    completingBlueprint: 'Organizando su historia en el plan de producción...',
    interviewCompletedTitle: 'Gracias — Su Historia Fue Enviada al Productor',
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
    discoveredPeopleTitle: 'Personas Clave, Roles e Impacto',
    beatImpactLabel: 'Impacto:',
    characterRoleLabel: 'Rol:',
    characterImpactLabel: 'Impacto:',
    completenessReadyLabel: 'Descubrimiento Completo ({score}%) — Listo para Crear Guion',
    completenessGatheringLabel: 'Recopilando Personajes y Eventos Clave ({score}%)',
    submitEarlyButton: 'Enviar anticipadamente con los detalles actuales',
  },
  pt: {
    producedBy: 'Produzido por {brand}',
    consentTitle: 'Antes de Começarmos Sua História',
    consentSubtitle: 'Confirme as permissões para as histórias e fotografias compartilhadas.',
    yourName: 'Seu Nome Completo',
    yourEmail: 'Seu E-mail (opcional)',
    mediaRightsLabel:
      'Confirmo que possuo ou detenho autorização familiar, de espólio ou comercial para compartilhar todas as histórias, nomes e fotos enviados.',
    zeroPrivityLabel:
      'Compreendo que {brand} é meu único prestador de produção responsável por preços, prazos e suporte, isentando provedores de software subjacentes.',
    acceptAndBegin: 'Concordar e Iniciar Entrevista',
    tapMicToSpeak: 'Toque no Microfone para Falar',
    stopRecording: 'Parar Microfone',
    tellYourStoryPlaceholder:
      'Conte sua história com riqueza de detalhes — infância, momentos marcantes, lugares especiais e cada pessoa individual importante na sua trajetória (ou toque no microfone)...',
    typeOrSpeakPlaceholder: 'Escreva sua resposta ou toque no microfone para contar em voz alta...',
    resonatingBeatsTitle: 'Momentos Marcantes e Pessoas-Chave',
    resonatingBeatsSubtitle:
      'Atualizado ao vivo conforme esclarecemos idades, épocas e cada pessoa em cena',
    beatKeyPeopleLabel: 'Pessoas-chave:',
    sendAnswer: 'Enviar Resposta',
    finishAndCreateBlueprint: 'Concluir e Gerar Roteiro Base',
    completingBlueprint: 'Organizando sua história no plano de produção...',
    interviewCompletedTitle: 'Obrigado — Sua História Foi Enviada ao Produtor',
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
    discoveredPeopleTitle: 'Pessoas-Chave, Papéis e Impacto',
    beatImpactLabel: 'Impacto:',
    characterRoleLabel: 'Papel:',
    characterImpactLabel: 'Impacto:',
    completenessReadyLabel: 'Descoberta Completa ({score}%) — Pronto para Gerar Roteiro',
    completenessGatheringLabel: 'Reunindo Personagens e Eventos-Chave ({score}%)',
    submitEarlyButton: 'Enviar agora com os detalhes atuais',
  },
  hi: {
    producedBy: '{brand} द्वारा निर्मित',
    consentTitle: 'आपकी कहानी शुरू करने से पहले',
    consentSubtitle: 'कृपया साझा की गई कहानियों और तस्वीरों के लिए अपनी सहमति की पुष्टि करें।',
    yourName: 'आपका पूरा नाम',
    yourEmail: 'आपका ईमेल (वैकल्पिक)',
    mediaRightsLabel:
      'मैं पुष्टि करता/करती हूँ कि यहाँ साझा की गई सभी कहानियों, नामों और तस्वीरों के लिए मेरे पास पारिवारिक या वैध अनुमति है।',
    zeroPrivityLabel:
      'मैं समझता/समझती हूँ कि {brand} ही मेरी एकमात्र प्रोडक्शन सेवा प्रदाता है जो मूल्य, डिलीवरी और सहायता के लिए उत्तरदायी है।',
    acceptAndBegin: 'सहमत हों और साक्षात्कार शुरू करें',
    tapMicToSpeak: 'बोलने के लिए माइक दबाएँ',
    stopRecording: 'माइक बंद करें',
    tellYourStoryPlaceholder:
      'इत्मीनान से अपनी पूरी कहानी विस्तार से साझा करें — बचपन, अहम मोड़, यादगार स्थान और जीवन के प्रत्येक विशेष व्यक्ति के नाम (या बोलने के लिए माइक दबाएँ)...',
    typeOrSpeakPlaceholder: 'अपना उत्तर यहाँ लिखें या बोलकर बताने के लिए माइक दबाएँ...',
    resonatingBeatsTitle: 'प्रमुख कहानी अध्याय और मुख्य व्यक्ति',
    resonatingBeatsSubtitle:
      'आयु, समय-काल और प्रत्येक अध्याय के विशिष्ट व्यक्तियों के साथ लाइव अपडेट',
    beatKeyPeopleLabel: 'मुख्य व्यक्ति:',
    sendAnswer: 'उत्तर भेजें',
    finishAndCreateBlueprint: 'कहानी जमा करें और ब्लूप्रिंट बनाएँ',
    completingBlueprint: 'आपकी कहानी को प्रोडक्शन ब्लूप्रिंट में पिरोया जा रहा है...',
    interviewCompletedTitle: 'धन्यवाद — आपकी कहानी निर्माता को भेज दी गई है',
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
    discoveredPeopleTitle: 'मुख्य व्यक्ति, भूमिकाएँ और प्रभाव',
    beatImpactLabel: 'प्रभाव:',
    characterRoleLabel: 'भूमिका:',
    characterImpactLabel: 'प्रभाव:',
    completenessReadyLabel: 'जानकारी पूर्ण ({score}%) — ब्लूप्रिंट बनाने के लिए तैयार',
    completenessGatheringLabel: 'पात्रों और मुख्य घटनाओं का संकलन ({score}%)',
    submitEarlyButton: 'वर्तमान विवरण के साथ अभी जमा करें',
  },
  'zh-CN': {
    producedBy: '由 {brand} 制作出品',
    consentTitle: '开始讲述您的故事之前',
    consentSubtitle: '请确认您对所分享故事与照片的授权许可。',
    yourName: '您的姓名',
    yourEmail: '您的电子邮箱（选填）',
    mediaRightsLabel:
      '我确认本人拥有或已获家属、遗产管理人或客户授权，可在此提交所有故事、姓名与照片资料。',
    zeroPrivityLabel:
      '我理解 {brand} 是负责定价、交付与售后服务的唯一制作服务商，底层软件技术提供商不承担直接合同责任。',
    acceptAndBegin: '同意并开始访谈',
    tapMicToSpeak: '点击麦克风语音讲述',
    stopRecording: '停止录音',
    tellYourStoryPlaceholder:
      '请尽情详细讲述您（或主人公）的人生故事——早年经历、关键转折、难忘地点以及生命中每一位具体的重要人物（也可点击麦克风直接口述）...',
    typeOrSpeakPlaceholder: '在此输入您的回答，或点击麦克风直接口述回忆...',
    resonatingBeatsTitle: '核心共鸣篇章与关键人物',
    resonatingBeatsSubtitle: '随访谈实时提炼每个年代阶段与具体登场人物（精确到个人与年龄阶段）',
    beatKeyPeopleLabel: '关键人物：',
    sendAnswer: '发送回答',
    finishAndCreateBlueprint: '提交故事并生成蓝图',
    completingBlueprint: '正在将您的故事整理为制作蓝图...',
    interviewCompletedTitle: '感谢您——故事蓝图已提交给制作团队',
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
    discoveredPeopleTitle: '核心人物、角色定位与影响力',
    beatImpactLabel: '核心意义：',
    characterRoleLabel: '角色定位：',
    characterImpactLabel: '故事影响：',
    completenessReadyLabel: '信息采集完整 ({score}%) — 可生成高质量蓝图',
    completenessGatheringLabel: '正在完善关键人物与核心事件 ({score}%)',
    submitEarlyButton: '使用当前信息提前提交',
  },
  th: {
    producedBy: 'อำนวยการผลิตโดย {brand}',
    consentTitle: 'ก่อนเริ่มบันทึกเรื่องราวของคุณ',
    consentSubtitle: 'โปรดยืนยันสิทธิ์การใช้งานเรื่องราวและภาพถ่ายที่คุณแบ่งปัน',
    yourName: 'ชื่อ-นามสกุลของคุณ',
    yourEmail: 'อีเมลของคุณ (ไม่บังคับ)',
    mediaRightsLabel:
      'ข้าพเจ้ายืนยันว่ามีสิทธิ์หรือได้รับอนุญาตจากครอบครัว ทายาท หรือลูกค้า ในการส่งเรื่องราว ชื่อ และภาพถ่ายทั้งหมดที่นี่',
    zeroPrivityLabel:
      'ข้าพเจ้ารับทราบว่า {brand} เป็นผู้ให้บริการผลิตแต่เพียงผู้เดียวที่รับผิดชอบด้านราคา การส่งมอบ และการดูแลลูกค้า โดยผู้ให้บริการซอฟต์แวร์พื้นฐานไม่มีความรับผิดโดยตรง',
    acceptAndBegin: 'ยอมรับและเริ่มการสัมภาษณ์',
    tapMicToSpeak: 'แตะไมโครโฟนเพื่อเล่าด้วยเสียง',
    stopRecording: 'หยุดไมโครโฟน',
    tellYourStoryPlaceholder:
      'เชิญเล่าเรื่องราวชีวิตของคุณอย่างละเอียด — วัยเยาว์ จุดเปลี่ยนสำคัญ สถานที่ทรงจำ และชื่อบุคคลสำคัญแต่ละท่านในชีวิต (หรือแตะไมโครโฟนเพื่อเล่าด้วยเสียง)...',
    typeOrSpeakPlaceholder: 'พิมพ์คำตอบของคุณ หรือแตะไมโครโฟนเพื่อเล่าเรื่องราวตามธรรมชาติ...',
    resonatingBeatsTitle: 'ฉากสำคัญที่กินใจและบุคคลหลัก',
    resonatingBeatsSubtitle: 'อัปเดตสดพร้อมระบุช่วงอายุ ยุคสมัย และบุคคลสำคัญรายคนในแต่ละฉาก',
    beatKeyPeopleLabel: 'บุคคลหลัก:',
    sendAnswer: 'ส่งคำตอบ',
    finishAndCreateBlueprint: 'ส่งเรื่องราวและสร้างโครงเรื่อง',
    completingBlueprint: 'กำลังจัดระเบียบเรื่องราวของคุณเป็นแผนการผลิต...',
    interviewCompletedTitle: 'ขอบคุณ — เรื่องราวของคุณถูกส่งไปยังผู้ผลิตแล้ว',
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
    discoveredPeopleTitle: 'บุคคลสำคัญ บทบาท และความสำคัญ',
    beatImpactLabel: 'ความสำคัญ:',
    characterRoleLabel: 'บทบาท:',
    characterImpactLabel: 'ความสำคัญต่อเรื่อง:',
    completenessReadyLabel: 'ข้อมูลครบถ้วน ({score}%) — พร้อมสร้างโครงเรื่อง',
    completenessGatheringLabel: 'กำลังรวบรวมตัวละครและเหตุการณ์สำคัญ ({score}%)',
    submitEarlyButton: 'ส่งข้อมูลเท่าที่มีอยู่ตอนนี้',
  },
  ar: {
    producedBy: 'إنتاج {brand}',
    consentTitle: 'قبل أن نبدأ قصتك',
    consentSubtitle: 'يرجى تأكيد أذونات القصص والصور الفوتوغرافية التي ستشاركها معنا.',
    yourName: 'الاسم الكامل',
    yourEmail: 'البريد الإلكتروني (اختياري)',
    mediaRightsLabel:
      'أؤكد أنني أملك أو أحمل إذناً من العائلة أو الورثة أو العميل لمشاركة جميع القصص والأسماء والصور المقدمة هنا.',
    zeroPrivityLabel:
      'أدرك أن {brand} هو مزود خدمة الإنتاج الوحيد المسؤول عن التسعير والتسليم والدعم، ولا يتحمل مزودو البرمجيات الأساسيون أي مسؤولية مباشرة.',
    acceptAndBegin: 'موافقة وبدء المقابلة',
    tapMicToSpeak: 'اضغط على الميكروفون للتحدث',
    stopRecording: 'إيقاف الميكروفون',
    tellYourStoryPlaceholder:
      'خذ وقتك واحكِ لنا قصتك بالتفصيل — البدايات، المحطات الفارقة، الأماكن العزيزة، والأشخاص المحددين بالاسم الذين شكّلوا مسيرة حياتك (أو اضغط على الميكروفون للتحدث)...',
    typeOrSpeakPlaceholder: 'اكتب إجابتك هنا أو اضغط على الميكروفون للتحدث بطبيعية...',
    resonatingBeatsTitle: 'المحطات المؤثرة والشخصيات الرئيسية',
    resonatingBeatsSubtitle:
      'تتحدث مباشرة مع توضيح المراحل العمرية والأشخاص المحددين في كل فصل',
    beatKeyPeopleLabel: 'الشخصيات الرئيسية:',
    sendAnswer: 'إرسال الإجابة',
    finishAndCreateBlueprint: 'إرسال القصة وإنشاء المخطط',
    completingBlueprint: 'جارٍ تنظيم قصتك في مخطط إنتاج سينمائي...',
    interviewCompletedTitle: 'شكراً لك — مخطط قصتك جاهز الآن لدى المنتج',
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
    discoveredPeopleTitle: 'الشخصيات الرئيسية والأدوار والأثر',
    beatImpactLabel: 'الأثر:',
    characterRoleLabel: 'الدور:',
    characterImpactLabel: 'الأثر:',
    completenessReadyLabel: 'اكتمل جمع المعلومات ({score}%) — جاهز لإنشاء المخطط',
    completenessGatheringLabel: 'جارٍ جمع الشخصيات والأحداث الرئيسية ({score}%)',
    submitEarlyButton: 'إرسال مبكر بالتفاصيل الحالية',
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
