#!/usr/bin/env node
/**
 * Programmatically generates pixel-perfect 2560×1440 (16:9 QHD) localized
 * SceneFlow Studio dark-mode UI screenshots for all 5 SVG-rendered capabilities
 * across the 6 non-English landing languages (`es`, `pt`, `hi`, `zh`, `ar`, `th`):
 *   1. client-intake-portal.webp
 *   2. blueprint-share-estimator.webp
 *   3. character-selfie-studio.webp
 *   4. producer-whitelabel-launchpad.webp
 *   5. streams-inventory-explorer.webp
 *
 * Output: `public/landing/key-features/screenshots/locales/<locale>/<file>.webp`
 *
 * Usage:
 *   node scripts/generate-localized-svg-screenshots.mjs
 */

import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const LOCALES_OUT_ROOT = join(ROOT, 'public', 'landing', 'key-features', 'screenshots', 'locales')
const SANDBOX_DIR = join(ROOT, 'public', 'images', 'sandbox', 'glass-ledger')

const W = 2560
const H = 1440

function esc(str) {
  return String(str).replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, '&amp;')
}

function loadDataUri(relPath, mime = 'image/jpeg') {
  const buf = readFileSync(join(SANDBOX_DIR, relPath))
  return `data:${mime};base64,${buf.toString('base64')}`
}

const IMG_ELARA = loadDataUri('char-elara.jpg')
const IMG_MARCUS = loadDataUri('char-marcus.jpg')
const IMG_ARIS = loadDataUri('char-aris.jpg')
const IMG_VAULT = loadDataUri('loc-archive-vault.jpg')
const IMG_TWOSHOT = loadDataUri('s1-b2-twoshot-table.jpg')
const IMG_DECK = loadDataUri('s2-b2-deck-twoshot.jpg')

const FONT_STACK_BY_LOCALE = {
  es: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, Helvetica, Arial, sans-serif",
  pt: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, Helvetica, Arial, sans-serif",
  hi: "'Kohinoor Devanagari', 'Devanagari Sangam MN', -apple-system, sans-serif",
  zh: "'PingFang SC', 'Hiragino Sans GB', 'Heiti SC', -apple-system, sans-serif",
  ar: "'Geeza Pro', 'Damascus', -apple-system, sans-serif",
  th: "'Thonburi', 'Sukhumvit Set', 'Ayuthaya', -apple-system, sans-serif",
}

const ACTIVE_LANG_INDEX = { es: 1, pt: 2, hi: 3, zh: 4, ar: 5, th: 6 }

const COPY = {
  es: {
    intake: {
      title: 'Harbor Legacy Films · Entrevista de Historia',
      urlPill: 'sceneflowai.studio/intake/harbor-memoir-7f9a · Sin Inicio de Sesión',
      badgeText: '7 Idiomas · Consentimiento Verificado',
      kicker: 'PORTAL WHITE-LABEL DE CLIENTE · PASO 1 DE 3',
      heading: 'Cuéntanos la Historia de Tu Familia',
      sub: 'Habla naturalmente o escribe en tu idioma — sin crear cuenta.',
      consentTitle: 'Consentimiento de Medios, Semejanza y Voz Firmado',
      consentSub: 'GPS EXIF eliminado automáticamente · Nunca entrena modelos compartidos',
      consentMeta: 'Firmado por Claire Vance · Registro #CL-2026-8841 · Tope: 2,500 cr',
      photosHeading: 'Entrevista Visual con Fotos (La IA Analiza y Hace Preguntas)',
      photos: ['Retrato Costa 1974 · EXIF Limpio', 'Taller 1989 · Detectado', 'Set Taller Puerto · Indexado'],
      voiceTitle: 'Dictado de Voz Activo (01:42) · Transcripción en Vivo',
      voiceL1: '“En 1974 papá y mamá solo tenían esa camioneta familiar recorriendo Big Sur.',
      voiceL2: 'Quince años después abrieron su taller de carpintería bajo la lluvia...”',
      voiceGate: 'Control de Integridad: 5 / 5 Anclas de Historia y Época Capturadas',
      cta: 'Confirmar Visión Clarificada y Generar Blueprint →',
      rKicker: 'ENTREVISTADOR IA Y CONTROL DE VISIÓN',
      rHeading: 'Seguimiento Interactivo y Visión Cinematográfica',
      aiName: 'Entrevistador Visual SceneFlow',
      aiL1: 'Veo luz costera cálida de los 70 en la Foto 1 y lámparas de latón en la Foto 2.',
      aiL2: '¿Retratamos a Arthur en tres edades (26, 41 y 78) para el 50.º aniversario?',
      clientName: 'Respuesta del Cliente (Dictado por Voz)',
      clientLine: '“¡Sí! Mantén el vestido amarillo floral de mamá en 1974 y reúne a las tres generaciones.”',
      readyPill: '✓ VISIÓN CLARIFICADA LISTA',
      passMeta: 'Revisión 1 de 3 · 96% Completa',
      filmTitle: '“La Costa que Construimos” — Película 50.º Aniversario',
      filmSub: 'Formato: Cine 16:9 + Recuerdo 9:16 · Kodak Portra · 12 Escenas',
      acts: [
        ['Acto I · 1974 Juventud en Big Sur', 'Arthur (26) y Eleanor (24, vestido floral amarillo) junto a la camioneta de 1974.'],
        ['Acto II · 1989 Taller bajo la Lluvia', 'Arthur (41) enciende las lámparas ámbar del taller al inaugurar su negocio.'],
        ['Acto III · Estreno Familiar Actual', 'Arthur (78), Eleanor (76), su hija Claire y nietos celebran 50 años juntos.'],
      ],
      locks: 'Elenco y Épocas Extraídas: Arthur (26 · 41 · 78) · Eleanor (24 · 39 · 76) · 3 Sets',
      footer: 'La aprobación del cliente genera al instante Blueprint + Bóveda de Continuidad.',
    },
    blueprint: {
      title: 'Enlace de Blueprint y Estimador de Margen',
      urlPill: 'sceneflowai.studio/blueprint/share/coastline-92b · Ronda 1 de 2',
      badgeText: 'Puntaje AR 94 / 100 · 79% Margen Neto',
      kicker: 'BLUEPRINT COMPARTIDO · STORYBOARD ILUSTRADO',
      heading: 'Aprobación Visual Escena por Escena Antes de Renderizar',
      listenBtn: '▶ Escuchar Tratamiento Narrado',
      beats: [
        ['BEAT 01 · APERTURA', 'Caja de Fotos en la Sala', 'Arthur (78) y Eleanor (76) abren el álbum de 1974 con luz de tarde.', 'Aprobado por Cliente ✓'],
        ['BEAT 02 · FLASHBACK 1974', 'Camioneta en el Acantilado', 'Arthur (26) y Eleanor (24) ríen frente al mar al atardecer; sin rodaje.', 'Aprobado por Cliente ✓'],
        ['BEAT 03 · HITO 1989', 'Inauguración bajo la Lluvia', 'Lámparas ámbar iluminan el taller; cliente pidió chelo más cálido.', '1 Nota Resuelta ✓'],
      ],
      cta: '✓ Aprobación Completa (Ronda 1 / 2) — Luz Verde a Producción',
      rKicker: 'ALCANCE Y CORTAFUEGOS DE MARGEN',
      rHeading: 'Estimador de Costos y Utilidad',
      marginLabel: 'Margen Neto Proyectado (Tras Cómputo + Tiempo PM)',
      profitBig: 'MX$12,026',
      marginPct: '79.8% Margen',
      pkgNote: 'Paquete: MX$15,061 · Cómputo Est.: MX$452 (2,400 cr incl. 20% reserva)',
      rows: [
        ['Blueprint, Ilustraciones y AR', '140 cr (MX$26)', 'Fijado ✓'],
        ['Bóveda Continuidad (8 Retratos + 3 Sets)', '220 cr (MX$41)', 'Estimado'],
        ['Diálogo, Narración, SFX y Música', '190 cr (MX$36)', 'Estimado'],
        ['Stills Híbridos + 12 Clips Omni 10s', '1,450 cr (MX$273)', 'Estimado'],
        ['Reserva 20% Retomas y Revisiones', '400 cr (MX$75)', 'Tope Activo'],
      ],
      chatTitle: 'Chat Cliente y PM · Tope de Revisiones (Máx. 2 Rondas)',
      chat1: 'Claire V.: “¡Ver el beat ilustrado de 1974 nos emocionó hasta las lágrimas!”',
      chat2: 'PM Productor: “¡Genial! Al aprobar fijamos los retratos de Continuidad.”',
      chatCap: 'Tope Estricto de Créditos: 2,500 cr · Cero sobrecostos inesperados',
    },
    selfie: {
      title: 'Estudio Selfie de Personaje y Semejanza',
      urlPill: 'Encuadre Facial IA · Pulido Instantáneo · Bloqueo 1:1 · Retrato a Voz',
      badgeText: 'Bloqueo de Identidad 1:1 Verificado',
      kicker: 'ESTUDIO SELFIE · RETRATO PROFESIONAL SIN PREPARACIÓN',
      heading: 'Encuadra, Pule y Bloquea Identidad Facial Exacta',
      presets: ['Retrato Estudio', 'Pulido Pro', 'Natural', 'Casting Neutro'],
      rawLabel: 'Selfie de Teléfono',
      proLabel: 'Retrato Estudio IA · 1:1',
      checks: [
        ['✓ Cabello y Arreglo Limpio', 'Suaviza mechones sueltos sin alterar la línea capilar'],
        ['✓ Iluminación y Corrección Óptica', 'Luz clave 5200K balanceada y corrección de lente'],
        ['✓ Bloqueo Estricto 1:1 de Rasgos', 'Cero distorsión — ojos, nariz y mandíbula idénticos'],
      ],
      rKicker: 'SEMEJANZA MULTI-ÉPOCA Y HERENCIA FAMILIAR',
      rHeading: 'Rejuvenece por Décadas y Empareja Voz al Retrato',
      eras: [
        ['ANCLA · 26 AÑOS (1974)', 'Elara Vance · Juventud', 'Derivada por Semejanza'],
        ['ÉPOCA · 41 AÑOS (1989)', 'Marcus Thorne · Plenitud', 'Bloqueo de ojos y barba'],
        ['LINAJE · 68 AÑOS', 'Dr. Aris · Edad Mayor', 'Herencia familiar exacta'],
      ],
      vKicker: 'EMPAREJAMIENTO MULTIMODAL RETRATO A VOZ',
      vHeading: 'Timbre Vocal, Edad y Cadencia Auto-Calibrados',
      vSub: 'Analiza edad, personalidad y rol del guion para elegir registro acústico ideal',
      vMatch: '▶ Voz Asignada: Kore-Studio (98% Ajuste) · Sincronizada en 70+ Idiomas',
      vNote: 'Incluye “Restablecer desde Guion” en 1 clic para sincronizar vestuario y elenco.',
      bTitle: 'person [1] + Díptico de Vestuario Listo para Omni 1.2 Flash',
      bSub: 'Identidad facial discreta + vestuario por toma vinculados automáticamente.',
    },
    launchpad: {
      title: 'Lanzador White-Label de Productor y RBAC',
      urlPill: 'sceneflowai.studio/dashboard/settings/producer · Pro+ White-Label Activo',
      badgeText: '4 Pasos · 100% White-Label',
      steps: [
        '01 · Marca Propia y Escudo IP',
        '02 · Tarifas por Vertical Listas',
        '03 · Enlace /intake y Widget Embed',
        '04 · Invitar PMs y Topes de Crédito',
      ],
      lKicker: 'MARCA WHITE-LABEL PRO+',
      lHeading: 'Tus Clientes Solo Ven Tu Marca, Logo y Dominio',
      brandSub: 'Color Primario: #10B981 · Soporte: concierge@harborlegacy.studio',
      brandHide: '✓ Oculta “Powered by SceneFlow” en Intake, Blueprint, Continuidad y Screening',
      privHeading: 'Privacidad Empresarial y Cortafuegos de Margen',
      privs: [
        ['✓ Eliminación Automática de GPS EXIF', 'Las fotos del cliente se sanean al subirlas antes de almacenarlas.'],
        ['✓ Cero Entrenamiento Compartido + Purga 1-Clic', 'Los medios nunca entrenan modelos externos y se borran al entregar.'],
        ['✓ Topes Diarios de Intake y Rondas de Revisión', '2 rondas de revisión por defecto · Tope diario: 1,500 cr.'],
      ],
      rKicker: 'TARIFARIOS SERVICE-IN-A-BOX Y EQUIPO RBAC',
      rHeading: 'Precios por Vertical y Cuotas de Crédito para PM',
      rates: [
        ['Memorias y Tributos', 'MX$6,579 – MX$17,908', '~MX$1,885 costo · 80% margen'],
        ['Inmobiliaria y Villas', 'MX$4,694 – MX$10,368', '~MX$1,131 costo · 78% margen'],
        ['Capacitación Corporativa', 'MX$11,291 – MX$33,930', '~MX$2,828 costo · Retainers'],
        ['Marca Local y Ads 9:16', 'MX$7,521 – MX$22,620', '~MX$2,074 costo · 20+ cuentas'],
      ],
      rbacTitle: 'Project Managers del Espacio (RBAC y Topes Mensuales)',
      rbac1: '• maya.pm@harborlegacy.studio — Rol: PM · 12 Proyectos · 4,200 / 8,000 cr',
      rbac2: '• lucas.pm@harborlegacy.studio — Rol: PM · 9 Proyectos · 3,150 / 8,000 cr',
      embed: '<iframe src="https://sceneflowai.studio/embed/intake/harbor-7f9a" /> · Copiar en 1 Clic',
      ref: '✓ Hoja de Referidos 20% Lista (Inmobiliarias, Agencias y Planificadores)',
    },
    streams: {
      title: 'Inventario de Streams y Publicación en 1 Clic',
      urlPill: 'Pre-Vis · Escenas · Capítulos · Promos 9:16 · Masters 4K · 70+ Idiomas',
      badgeText: 'YouTube · TikTok · Facebook Conectados',
      filters: ['Todos (28)', 'Pre-Vis Unido (7)', 'Escenas (12)', 'Promos 9:16 (4)', 'Masters 4K (5)'],
      langFilter: 'Filtro 70+ Idiomas: EN · ES · PT · HI · ZH · AR · TH',
      lKicker: 'EXPLORADOR DE STREAMS · VERSIONES Y ENSAMBLE FFmpeg SIN PÉRDIDA',
      rows: [
        ['Master Final 4K · Español (ES)', '16:9 · 4K UHD · -14 LUFS · v3 Activa', 'Publicado · YouTube ✓', '#10b981'],
        ['Master Final 4K · English (EN)', '16:9 · Lip-Sync + Mezcla Stems · v2', 'Listo para Enviar', '#06b6d4'],
        ['Pre-Vis Animatic (12 Escenas Unidas)', '16:9 · Ensamble FFmpeg Sin Pérdida · v1', 'Aprobado ✓', '#10b981'],
        ['Promo Social · Português (PT)', '9:16 Vertical · Reels / TikTok / Shorts · v2', 'Publicado · TikTok ✓', '#a855f7'],
        ['Master 4K · 中文 / हिन्दी / العربية / ไทย', '4 Streams Localizados · 1080p/4K', '4 / 4 Listos', '#06b6d4'],
        ['Capítulo 02 · Taller bajo la Lluvia', '16:9 · Entrega Parcial al Cliente · v1', 'Compartido en /s/', '#f59e0b'],
      ],
      rKicker: 'EMPAQUETAR Y PUBLICAR · OAUTH EN 1 CLIC',
      rHeading: 'Publica Globalmente sin Configurar Servidores',
      thumbCap: 'Miniatura de Alto CTR Auto-Generada',
      socials: [
        ['Canal de YouTube Conectado', 'OAuth 1-Clic · Títulos, Capítulos y Subtítulos Localizados'],
        ['TikTok Business Conectado', 'Publicación Directa 9:16 · Hook Automático'],
        ['Página de Facebook Conectada', 'Lanzamiento Multilingüe + ZIP de Stems'],
      ],
      cta: 'Publicar Streams Seleccionados y Descargar 4K →',
    },
  },
  pt: {
    intake: {
      title: 'Harbor Legacy Films · Entrevista de História',
      urlPill: 'sceneflowai.studio/intake/harbor-memoir-7f9a · Sem Login',
      badgeText: '7 Idiomas · Consentimento Verificado',
      kicker: 'PORTAL WHITE-LABEL DO CLIENTE · ETAPA 1 DE 3',
      heading: 'Conte a História da Sua Família',
      sub: 'Fale naturalmente ou digite no seu idioma — sem criar conta.',
      consentTitle: 'Consentimento de Mídia, Semelhança e Voz Assinado',
      consentSub: 'GPS EXIF removido automaticamente · Nunca treina modelos compartilhados',
      consentMeta: 'Assinado por Claire Vance · Registro #CL-2026-8841 · Teto: 2.500 cr',
      photosHeading: 'Entrevista Visual por Fotos (IA Analisa e Faz Perguntas)',
      photos: ['Retrato Costa 1974 · EXIF Limpo', 'Oficina 1989 · Detectado', 'Set Oficina Porto · Indexado'],
      voiceTitle: 'Ditado por Voz Ativo (01:42) · Transcrição ao Vivo',
      voiceL1: '“Em 1974 papai e mamãe só tinham aquela perua viajando por Big Sur.',
      voiceL2: 'Quinze anos depois abriram sua marcenaria de bairro sob a chuva...”',
      voiceGate: 'Controle de Integridade: 5 / 5 Âncoras de História e Época Capturadas',
      cta: 'Confirmar Visão Clarificada e Gerar Blueprint →',
      rKicker: 'ENTREVISTADOR IA E CONTROLE DE VISÃO',
      rHeading: 'Perguntas Interativas e Visão Cinematográfica',
      aiName: 'Entrevistador Visual SceneFlow',
      aiL1: 'Vejo luz costeira quente dos anos 70 na Foto 1 e luminárias de latão na Foto 2.',
      aiL2: 'Devemos retratar Arthur em três idades (26, 41 e 78) para as bodas de ouro?',
      clientName: 'Resposta do Cliente (Ditado por Voz)',
      clientLine: '“Sim! Mantenha o vestido amarelo floral da mamãe em 1974 e reúna as três gerações.”',
      readyPill: '✓ VISÃO CLARIFICADA PRONTA',
      passMeta: 'Revisão 1 de 3 · 96% Completa',
      filmTitle: '“A Costa que Construímos” — Filme Bodas de Ouro',
      filmSub: 'Formato: Cinema 16:9 + Lembrança 9:16 · Kodak Portra · 12 Cenas',
      acts: [
        ['Ato I · 1974 Juventude em Big Sur', 'Arthur (26) e Eleanor (24, vestido floral amarelo) junto à perua de 1974.'],
        ['Ato II · 1989 Oficina na Chuva', 'Arthur (41) acende as luminárias âmbar da oficina ao inaugurar o negócio.'],
        ['Ato III · Estreia Familiar Atual', 'Arthur (78), Eleanor (76), filha Claire e netos celebram 50 anos juntos.'],
      ],
      locks: 'Elenco e Épocas Extraídas: Arthur (26 · 41 · 78) · Eleanor (24 · 39 · 76) · 3 Sets',
      footer: 'A aprovação do cliente cria instantaneamente Blueprint + Cofre de Continuidade.',
    },
    blueprint: {
      title: 'Link do Blueprint e Estimador de Margem',
      urlPill: 'sceneflowai.studio/blueprint/share/coastline-92b · Rodada 1 de 2',
      badgeText: 'Nota AR 94 / 100 · 79% Margem Líquida',
      kicker: 'BLUEPRINT COMPARTILHADO · STORYBOARD ILUSTRADO',
      heading: 'Aprovação Visual Cena a Cena Antes de Renderizar',
      listenBtn: '▶ Ouvir Tratamento Narrado',
      beats: [
        ['BEAT 01 · ABERTURA', 'Caixa de Fotos na Sala', 'Arthur (78) e Eleanor (76) abrem o álbum de 1974 sob luz da tarde.', 'Aprovado pelo Cliente ✓'],
        ['BEAT 02 · FLASHBACK 1974', 'Perua no Penhasco', 'Arthur (26) e Eleanor (24) riem diante do mar ao pôr do sol; sem viagem.', 'Aprovado pelo Cliente ✓'],
        ['BEAT 03 · MARCO 1989', 'Inauguração sob a Chuva', 'Luminárias âmbar iluminam a oficina; cliente pediu violoncelo mais quente.', '1 Nota Resolvida ✓'],
      ],
      cta: '✓ Aprovação Concluída (Rodada 1 / 2) — Sinal Verde para Produção',
      rKicker: 'ESCOPO E FIREWALL DE MARGEM',
      rHeading: 'Estimador de Custos e Lucro',
      marginLabel: 'Margem Líquida Projetada (Após Cómputo + Tempo PM)',
      profitBig: 'R$3.739',
      marginPct: '79,8% Margem',
      pkgNote: 'Pacote: R$4.682 · Cómputo Est.: R$141 (2.400 cr incl. 20% reserva)',
      rows: [
        ['Blueprint, Ilustrações e AR', '140 cr (R$8)', 'Travado ✓'],
        ['Cofre Continuidade (8 Retratos + 3 Sets)', '220 cr (R$13)', 'Previsto'],
        ['Diálogo, Narração, SFX e Trilha', '190 cr (R$11)', 'Previsto'],
        ['Stills Híbridos + 12 Clipes Omni 10s', '1.450 cr (R$85)', 'Previsto'],
        ['Reserva 20% Retomadas e Revisões', '400 cr (R$23)', 'Teto Ativo'],
      ],
      chatTitle: 'Chat Cliente e PM · Limite de Revisões (Máx. 2 Rodadas)',
      chat1: 'Claire V.: “Ver o beat ilustrado de 1974 nos emocionou demais!”',
      chat2: 'PM Produtor: “Ótimo! Aprovar trava o escopo dos retratos de Continuidade.”',
      chatCap: 'Teto Rígido de Créditos: 2.500 cr · Zero estouros inesperados',
    },
    selfie: {
      title: 'Estúdio Selfie de Personagem e Semelhança',
      urlPill: 'Enquadramento IA · Acabamento Instantâneo · Trava 1:1 · Retrato para Voz',
      badgeText: 'Trava de Identidade 1:1 Verificada',
      kicker: 'ESTÚDIO SELFIE · RETRATO PROFISSIONAL SEM PREPARO',
      heading: 'Enquadre, Aprimore e Trave Identidade Facial Exata',
      presets: ['Retrato Estúdio', 'Acabamento Pro', 'Natural', 'Casting Neutro'],
      rawLabel: 'Selfie de Celular',
      proLabel: 'Retrato Estúdio IA · 1:1',
      checks: [
        ['✓ Cabelo e Acabamento Limpos', 'Suaviza fios soltos sem alterar a linha capilar'],
        ['✓ Luz 5200K e Correção Óptica', 'Iluminação balanceada e correção de lente'],
        ['✓ Trava Estrita 1:1 de Traços', 'Zero distorção — olhos, nariz e mandíbula preservados'],
      ],
      rKicker: 'SEMELHANÇA MULTI-ÉPOCA E HERANÇA FAMILIAR',
      rHeading: 'Rejuvenesça por Décadas e Combine Voz ao Retrato',
      eras: [
        ['ÂNCORA · 26 ANOS (1974)', 'Elara Vance · Juventude', 'Derivada por Semelhança'],
        ['ÉPOCA · 41 ANOS (1989)', 'Marcus Thorne · Auge', 'Trava de olhos e barba'],
        ['LINHAGEM · 68 ANOS', 'Dr. Aris · Sênior', 'Herança familiar exata'],
      ],
      vKicker: 'COMBINAÇÃO MULTIMODAL RETRATO PARA VOZ',
      vHeading: 'Timbre Vocal, Idade e Cadência Auto-Calibrados',
      vSub: 'Analisa idade, persona e papel no roteiro para escolher registro acústico ideal',
      vMatch: '▶ Voz Combinada: Kore-Studio (98% Ajuste) · Sincronizada em 70+ Idiomas',
      vNote: 'Inclui “Redefinir do Roteiro” em 1 clique para sincronizar figurino e elenco.',
      bTitle: 'person [1] + Díptico de Figurino Pronto para Omni 1.2 Flash',
      bSub: 'Identidade facial discreta + figurino por plano vinculados automaticamente.',
    },
    launchpad: {
      title: 'Lançador White-Label de Produtor e RBAC',
      urlPill: 'sceneflowai.studio/dashboard/settings/producer · Pro+ White-Label Ativo',
      badgeText: '4 Etapas · 100% White-Label',
      steps: [
        '01 · Marca Própria e Escudo IP',
        '02 · Tabelas por Vertical Prontas',
        '03 · Link /intake e Widget Embed',
        '04 · Convidar PMs e Tetos de Crédito',
      ],
      lKicker: 'MARCA WHITE-LABEL PRO+',
      lHeading: 'Clientes Veem Apenas Seu Nome, Logo e Domínio',
      brandSub: 'Cor Primária: #10B981 · Suporte: concierge@harborlegacy.studio',
      brandHide: '✓ Oculta “Powered by SceneFlow” em Intake, Blueprint, Continuidade e Screening',
      privHeading: 'Privacidade Corporativa e Firewall de Margem',
      privs: [
        ['✓ Remoção Automática de GPS EXIF', 'Fotos do cliente são higienizadas no upload antes do armazenamento.'],
        ['✓ Zero Treino Compartilhado + Expurgo 1-Clique', 'Mídias nunca treinam modelos externos e são limpas pós-entrega.'],
        ['✓ Tetos Diários de Intake e Rodadas de Revisão', 'Padrão de 2 rodadas · Teto diário público: 1.500 cr.'],
      ],
      rKicker: 'TABELAS SERVICE-IN-A-BOX E EQUIPE RBAC',
      rHeading: 'Preços por Vertical e Limites de Crédito para PM',
      rates: [
        ['Memórias e Tributos', 'R$2.045 – R$5.567', '~R$586 custo · 80% margem'],
        ['Imóveis e Tours', 'R$1.459 – R$3.223', '~R$352 custo · 78% margem'],
        ['Treinamento Corporativo', 'R$3.510 – R$10.548', '~R$879 custo · Recorrência'],
        ['Marca Local e Ads 9:16', 'R$2.338 – R$7.032', '~R$645 custo · 20+ contas'],
      ],
      rbacTitle: 'Project Managers do Workspace (RBAC e Tetos Mensais)',
      rbac1: '• maya.pm@harborlegacy.studio — Cargo: PM · 12 Projetos · 4.200 / 8.000 cr',
      rbac2: '• lucas.pm@harborlegacy.studio — Cargo: PM · 9 Projetos · 3.150 / 8.000 cr',
      embed: '<iframe src="https://sceneflowai.studio/embed/intake/harbor-7f9a" /> · Copiar em 1 Clique',
      ref: '✓ Kit de Indicação 20% Pronto (Imobiliárias, Agências e Parceiros)',
    },
    streams: {
      title: 'Inventário de Streams e Publicação 1-Clique',
      urlPill: 'Pre-Vis · Cenas · Capítulos · Promos 9:16 · Masters 4K · 70+ Idiomas',
      badgeText: 'YouTube · TikTok · Facebook Conectados',
      filters: ['Todos (28)', 'Pre-Vis Unido (7)', 'Cenas (12)', 'Promos 9:16 (4)', 'Masters 4K (5)'],
      langFilter: 'Filtro 70+ Idiomas: EN · ES · PT · HI · ZH · AR · TH',
      lKicker: 'EXPLORADOR DE STREAMS · VERSÕES E COSTURA FFmpeg SEM PERDAS',
      rows: [
        ['Master Final 4K · Português (PT)', '16:9 · 4K UHD · -14 LUFS · v3 Ativa', 'Publicado · YouTube ✓', '#10b981'],
        ['Master Final 4K · English (EN)', '16:9 · Lip-Sync + Mix Stems · v2', 'Pronto para Envio', '#06b6d4'],
        ['Pre-Vis Animatic (12 Cenas Unidas)', '16:9 · Costura FFmpeg Sem Perdas · v1', 'Aprovado ✓', '#10b981'],
        ['Promo Social · Español (ES)', '9:16 Vertical · Reels / TikTok / Shorts · v2', 'Publicado · TikTok ✓', '#a855f7'],
        ['Master 4K · 中文 / हिन्दी / العربية / ไทย', '4 Streams Localizados · 1080p/4K', '4 / 4 Prontos', '#06b6d4'],
        ['Capítulo 02 · Oficina na Chuva', '16:9 · Entrega Parcial ao Cliente · v1', 'Compartilhado /s/', '#f59e0b'],
      ],
      rKicker: 'EMPACOTAR E PUBLICAR · OAUTH EM 1 CLIQUE',
      rHeading: 'Publique Globalmente Sem Configurar Nuvem',
      thumbCap: 'Thumbnail de Alto CTR Auto-Gerada',
      socials: [
        ['Canal YouTube Conectado', 'OAuth 1-Clique · Títulos, Capítulos e Legendas Localizados'],
        ['TikTok Business Conectado', 'Post Direto 9:16 · Hook Automático'],
        ['Página Facebook Conectada', 'Lançamento Multilíngue + ZIP de Stems'],
      ],
      cta: 'Publicar Streams Selecionados e Baixar 4K →',
    },
  },
  hi: {
    intake: {
      title: 'Harbor Legacy Films · क्लाइंट स्टोरी इंटरव्यू',
      urlPill: 'sceneflowai.studio/intake/harbor-memoir-7f9a · बिना लॉगिन',
      badgeText: '7 भाषाएँ · सहमति सत्यापित',
      kicker: 'व्हाइट-लेबल क्लाइंट पोर्टल · चरण 1 / 3',
      heading: 'अपने परिवार की कहानी साझा करें',
      sub: 'अपनी भाषा में बोलें या लिखें — किसी अकाउंट की आवश्यकता नहीं।',
      consentTitle: 'मीडिया, समानता और वॉइस सहमति हस्ताक्षरित',
      consentSub: 'EXIF GPS स्वतः हटाया गया · साझा AI मॉडल प्रशिक्षण में कभी उपयोग नहीं',
      consentMeta: 'हस्ताक्षर: Claire Vance · लेजर #CL-2026-8841 · सीमा: 2,500 cr',
      photosHeading: 'विज़न फोटो इंटरव्यू (AI फोटो देखकर प्रश्न पूछता है)',
      photos: ['1974 तटीय पोर्ट्रेट · EXIF साफ', '1989 वर्कशॉप · पहचाना गया', 'हार्बर वर्कशॉप सेट · इंडेक्स'],
      voiceTitle: 'वॉइस डिक्टेशन सक्रिय (01:42) · लाइव ट्रांसक्रिप्ट',
      voiceL1: '“1974 में माता-पिता के पास बिग सुर में केवल वह स्टेशन वैगन थी।',
      voiceL2: 'पंद्रह साल बाद उन्होंने शाम की बारिश में अपनी वर्कशॉप खोली...”',
      voiceGate: 'पूर्णता जाँच: 5 / 5 प्रमुख कहानी और युग एंकर कैप्चर हुए',
      cta: 'स्पष्ट विज़न की पुष्टि करें और Blueprint बनाएँ →',
      rKicker: 'AI स्टोरी इंटरव्यूअर और विज़न पूर्णता गेट',
      rHeading: 'इंटरैक्टिव फ़ॉलो-अप और प्रस्तावित फ़िल्म विज़न',
      aiName: 'SceneFlow विज़न इंटरव्यूअर',
      aiL1: 'फोटो 1 में 1970 की तटीय धूप और फोटो 2 में पीतल के लैंप दिख रहे हैं।',
      aiL2: 'क्या 50वीं वर्षगांठ के लिए आर्थर को तीन उम्र (26, 41, 78) में दिखाएँ?',
      clientName: 'क्लाइंट उत्तर (वॉइस डिक्टेटेड)',
      clientLine: '“हाँ! 1974 में माँ की पीली फ्लोरल ड्रेस रखें और अंत में तीनों पीढ़ियों को मिलाएँ।”',
      readyPill: '✓ स्पष्ट विज़न तैयार',
      passMeta: 'पास 1 / 3 · 96% पूर्ण',
      filmTitle: '“जो तट हमने बनाया” — 50वीं वर्षगांठ फ़िल्म',
      filmSub: 'फ़ॉर्मेट: 16:9 सिनेमा + 9:16 रील · Kodak Portra · 12 दृश्य',
      acts: [
        ['अंक I · 1974 बिग सुर युवावस्था', 'आर्थर (26) और एलिनोर (24, पीली फ्लोरल ड्रेस) 1974 स्टेशन वैगन के पास।'],
        ['अंक II · 1989 बारिश में वर्कशॉप', 'आर्थर (41) वर्कशॉप की सुनहरी लाइट्स जलाकर व्यवसाय शुरू करते हैं।'],
        ['अंक III · वर्तमान पारिवारिक प्रीमियर', 'आर्थर (78), एलिनोर (76), बेटी क्लेयर और पोते-पोतियाँ 50 वर्ष मनाते हैं।'],
      ],
      locks: 'पात्र और युग लॉक: Arthur (26 · 41 · 78) · Eleanor (24 · 39 · 76) · 3 सेट',
      footer: 'क्लाइंट स्वीकृति पर तुरंत Blueprint और Continuity Vault तैयार होता है।',
    },
    blueprint: {
      title: 'Blueprint शेयर लिंक और मार्जिन अनुमानक',
      urlPill: 'sceneflowai.studio/blueprint/share/coastline-92b · राउंड 1 / 2',
      badgeText: 'AR स्कोर 94 / 100 · 79% शुद्ध मार्जिन',
      kicker: 'साझा क्लाइंट BLUEPRINT · सचित्र स्टोरीबोर्ड बीट्स',
      heading: 'वीडियो खर्च से पहले दृश्य-दर-दृश्य स्वीकृति',
      listenBtn: '▶ वर्णित ट्रीटमेंट सुनें',
      beats: [
        ['बीट 01 · शुरुआत', 'लिविंग रूम फोटो बॉक्स', 'आर्थर (78) और एलिनोर (76) दोपहर की धूप में 1974 का एल्बम खोलते हैं।', 'क्लाइंट स्वीकृत ✓'],
        ['बीट 02 · फ्लैशबैक 1974', 'तटीय चट्टान पर कार', 'आर्थर (26) और एलिनोर (24) सूर्यास्त के पास मुस्कुराते हैं; शून्य यात्रा खर्च।', 'क्लाइंट स्वीकृत ✓'],
        ['बीट 03 · 1989 पड़ाव', 'बारिश में भव्य उद्घाटन', 'वर्कशॉप की लाइट्स चमकती हैं; क्लाइंट ने गर्म चेलो संगीत जोड़ा।', '1 नोट हल ✓'],
      ],
      cta: '✓ क्लाइंट स्वीकृति पूर्ण (राउंड 1 / 2) — प्रोडक्शन शुरू करें',
      rKicker: 'प्रोड्यूसर स्कोप और मार्जिन फ़ायरवॉल',
      rHeading: 'Blueprint लागत और लाभ अनुमानक',
      marginLabel: 'अनुमानित शुद्ध सेवा मार्जिन (कंप्यूट + PM समय के बाद)',
      profitBig: '₹59,844',
      marginPct: '79.8% मार्जिन',
      pkgNote: 'पैकेज: ₹74,946 · अनुमानित कंप्यूट: ₹2,251 (2,400 cr, 20% रिज़र्व सहित)',
      rows: [
        ['Blueprint, बीट चित्र और AR', '140 cr (₹131)', 'लॉक ✓'],
        ['Continuity Vault (8 पोर्ट्रेट + 3 सेट)', '220 cr (₹206)', 'अनुमान'],
        ['संवाद, नैरेशन, SFX और संगीत', '190 cr (₹178)', 'अनुमान'],
        ['हाइब्रिड स्टिल्स + 12 Omni 10s क्लिप्स', '1,450 cr (₹1,360)', 'अनुमान'],
        ['20% स्मार्ट रीटेक और रिविज़न रिज़र्व', '400 cr (₹375)', 'सीमा सक्रिय'],
      ],
      chatTitle: 'क्लाइंट और PM थ्रेड · रिविज़न सीमा (अधिकतम 2 राउंड)',
      chat1: 'Claire V.: “1974 का सचित्र बीट देखकर हमारी आँखें भर आईं!”',
      chat2: 'प्रोड्यूसर PM: “शानदार! स्वीकृति से Continuity पोर्ट्रेट लॉक हो जाएंगे।”',
      chatCap: 'कठोर क्रेडिट सीमा: 2,500 cr · कोई अप्रत्याशित खर्च नहीं',
    },
    selfie: {
      title: 'कैरेक्टर सेल्फी स्टूडियो और चेहरा समानता',
      urlPill: 'AI फेस फ़्रेमिंग · तुरंत पॉलिश · 1:1 पहचान लॉक · पोर्ट्रेट से वॉइस',
      badgeText: '1:1 पहचान लॉक सत्यापित',
      kicker: 'कैरेक्टर सेल्फी स्टूडियो · ज़ीरो-प्रेप हेडशॉट सुधार',
      heading: 'ऑटो-फ़्रेम, पॉलिश और सटीक चेहरा पहचान लॉक करें',
      presets: ['स्टूडियो हेडशॉट', 'ग्रूम और पॉलिश', 'प्राकृतिक पोर्ट्रेट', 'कास्टिंग न्यूट्रल'],
      rawLabel: 'फ़ोन सेल्फी',
      proLabel: 'AI स्टूडियो हेडशॉट · 1:1',
      checks: [
        ['✓ बाल और ग्रूमिंग साफ़', 'हेयरलाइन बदले बिना बिखरे बाल संवारे गए'],
        ['✓ 5200K लाइट और ऑप्टिक्स सुधार', 'संतुलित की-लाइट और लेंस विकृति सुधार'],
        ['✓ सख्त 1:1 चेहरा और आँख लॉक', 'आँख, नाक और जबड़े की हूबहू संरचना सुरक्षित'],
      ],
      rKicker: 'मल्टी-एरा समानता और पारिवारिक वंशानुक्रम',
      rHeading: 'दशकों में उम्र बदलें और पोर्ट्रेट से वॉइस मिलाएँ',
      eras: [
        ['एंकर · उम्र 26 (1974)', 'Elara Vance · युवा', 'समानता से निर्मित'],
        ['एरा लॉक · उम्र 41 (1989)', 'Marcus Thorne · मध्य', 'आँख और दाढ़ी लॉक'],
        ['वंश · उम्र 68', 'Dr. Aris · वरिष्ठ', 'पारिवारिक गुण लॉक'],
      ],
      vKicker: 'मल्टीमॉडल पोर्ट्रेट-टू-वॉइस मैचिंग',
      vHeading: 'ऑटो-कैलिब्रेटेड आवाज़, उम्र और लय',
      vSub: 'पोर्ट्रेट की उम्र और स्क्रिप्ट भूमिका के अनुसार सटीक ध्वनि टोन चुनता है',
      vMatch: '▶ मिलान आवाज़: Kore-Studio (98% फिट) · 70+ भाषाओं में सिंक',
      vNote: 'एपिसोड में पोशाक और पात्र सिंक करने हेतु 1-क्लिक “Reset from Script” शामिल।',
      bTitle: 'person [1] + वॉर्डरोब डिप्टिच Omni 1.2 Flash के लिए तैयार',
      bSub: 'चेहरे की पहचान और प्रति-शॉट पोशाक स्वतः Stills और 10s Clips से जुड़ते हैं।',
    },
    launchpad: {
      title: 'व्हाइट-लेबल प्रोड्यूसर लॉन्चपैड और RBAC',
      urlPill: 'sceneflowai.studio/dashboard/settings/producer · Pro+ White-Label सक्रिय',
      badgeText: '4-चरणीय लॉन्चपैड · 100% व्हाइट-लेबल',
      steps: [
        '01 · अपना ब्रांड और IP शील्ड',
        '02 · वर्टिकल रेट कार्ड तैयार',
        '03 · ब्रांडेड /intake और Embed लिंक',
        '04 · PM आमंत्रण और क्रेडिट सीमा',
      ],
      lKicker: 'PRO+ व्हाइट-लेबल पोर्टल ब्रांडिंग',
      lHeading: 'क्लाइंट केवल आपका नाम, लोगो और डोमेन देखते हैं',
      brandSub: 'प्राइमरी रंग: #10B981 · सहायता: concierge@harborlegacy.studio',
      brandHide: '✓ Intake, Blueprint, Continuity और Screening से “Powered by SceneFlow” हटाएँ',
      privHeading: 'एंटरप्राइज़ क्लाइंट गोपनीयता और मार्जिन सुरक्षा',
      privs: [
        ['✓ स्वचालित EXIF GPS हटाना', 'क्लाइंट की तस्वीरें अपलोड होते ही क्लाउड से पहले साफ़ होती हैं।'],
        ['✓ शून्य मॉडल प्रशिक्षण + 1-क्लिक पज', 'क्लाइंट मीडिया बाहरी AI को नहीं सिखाता और डिलीवरी के बाद हटता है।'],
        ['✓ दैनिक Intake और रिविज़न राउंड सीमा', 'डिफ़ॉल्ट 2 रिविज़न राउंड · दैनिक सीमा: 1,500 cr।'],
      ],
      rKicker: 'SERVICE-IN-A-BOX रेट कार्ड और टीम RBAC',
      rHeading: 'तैयार वर्टिकल मूल्य और PM क्रेडिट सीमाएँ',
      rates: [
        ['वीडियो संस्मरण', '₹32,736 – ₹89,110', '~₹9,380 लागत · 80% मार्जिन'],
        ['रियल एस्टेट टूर', '₹23,356 – ₹51,590', '~₹5,628 लागत · 78% मार्जिन'],
        ['कॉर्पोरेट ट्रेनिंग', '₹56,186 – ₹1,68,840', '~₹14,070 लागत · रिटेनर'],
        ['लोकल ब्रांड और 9:16 विज्ञापन', '₹37,426 – ₹1,12,560', '~₹10,318 लागत · 20+ खाते'],
      ],
      rbacTitle: 'वर्कस्पेस प्रोजेक्ट मैनेजर (RBAC और मासिक क्रेडिट सीमा)',
      rbac1: '• maya.pm@harborlegacy.studio — भूमिका: PM · 12 प्रोजेक्ट · 4,200 / 8,000 cr',
      rbac2: '• lucas.pm@harborlegacy.studio — भूमिका: PM · 9 प्रोजेक्ट · 3,150 / 8,000 cr',
      embed: '<iframe src="https://sceneflowai.studio/embed/intake/harbor-7f9a" /> · 1-क्लिक कॉपी',
      ref: '✓ 20% पार्टनर रेफरल शीट तैयार (एजेंसियाँ, ब्रोकर और प्लानर)',
    },
    streams: {
      title: 'स्ट्रीम इन्वेंटरी और 1-क्लिक पब्लिशिंग',
      urlPill: 'Pre-Vis · दृश्य · अध्याय · 9:16 प्रोमो · 4K मास्टर · 70+ भाषाएँ',
      badgeText: 'YouTube · TikTok · Facebook कनेक्टेड',
      filters: ['सभी (28)', 'Pre-Vis (7)', 'दृश्य (12)', 'प्रोमो 9:16 (4)', '4K मास्टर (5)'],
      langFilter: '70+ भाषा फ़िल्टर: EN · ES · PT · HI · ZH · AR · TH',
      lKicker: 'स्ट्रीम एक्सप्लोरर · वर्ज़न इतिहास और लॉसलेस FFmpeg स्टिच',
      rows: [
        ['4K फ़ाइनल मास्टर · हिन्दी (HI)', '16:9 · 4K UHD · -14 LUFS · v3 सक्रिय', 'प्रकाशित · YouTube ✓', '#10b981'],
        ['4K फ़ाइनल मास्टर · English (EN)', '16:9 · लिप-सिंक + स्टेम मिक्स · v2', 'भेजने हेतु तैयार', '#06b6d4'],
        ['Pre-Vis Animatic (12 दृश्य जुड़े)', '16:9 · लॉसलेस FFmpeg स्टिच · v1', 'क्लाइंट स्वीकृत ✓', '#10b981'],
        ['सोशल प्रोमो · Español (ES)', '9:16 वर्टिकल · Reels / TikTok / Shorts · v2', 'प्रकाशित · TikTok ✓', '#a855f7'],
        ['4K मास्टर · 中文 / PT / العربية / ไทย', '4 स्थानीयकृत स्ट्रीम · 1080p/4K', '4 / 4 तैयार', '#06b6d4'],
        ['अध्याय 02 · बारिश में वर्कशॉप', '16:9 · प्रारंभिक क्लाइंट रिलीज़ · v1', '/s/ लिंक साझा', '#f59e0b'],
      ],
      rKicker: 'पैकेज और शिप · 1-क्लिक सोशल OAUTH',
      rHeading: 'बिना क्लाउड सेटअप वैश्विक प्रकाशन',
      thumbCap: 'ऑटो-जनरेटेड हाई-CTR थंबनेल',
      socials: [
        ['YouTube चैनल कनेक्टेड', '1-क्लिक OAuth · स्थानीय शीर्षक, अध्याय और कैप्शन'],
        ['TikTok Business कनेक्टेड', '9:16 सीधा पोस्ट · ऑटो-हुक विवरण'],
        ['Facebook पेज कनेक्टेड', 'बहुभाषी रिलीज़ + स्टेम्स ZIP आर्काइव'],
      ],
      cta: 'चयनित स्ट्रीम प्रकाशित करें और 4K डाउनलोड करें →',
    },
  },
  zh: {
    intake: {
      title: 'Harbor Legacy Films · 客户故事采集',
      urlPill: 'sceneflowai.studio/intake/harbor-memoir-7f9a · 免登录访问',
      badgeText: '7 种语言 · 授权已验证',
      kicker: '白标客户门户 · 第 1 步（共 3 步）',
      heading: '讲述您的家族故事',
      sub: '用您熟悉的语言自然口述或输入文字 — 无需注册账号。',
      consentTitle: '已签署素材、肖像与声音授权协议',
      consentSub: '上传自动清除 EXIF GPS 位置 · 绝不用于共享 AI 模型训练',
      consentMeta: '签署人：Claire Vance · 编号 #CL-2026-8841 · 额度上限：2,500 cr',
      photosHeading: '视觉照片访谈（AI 识别照片并智能追问）',
      photos: ['1974 海岸肖像 · EXIF 已清', '1989 木工坊开业 · 已识别', '港口木工坊场景 · 已建档'],
      voiceTitle: '语音听写进行中 (01:42) · 实时字幕',
      voiceL1: '“1974 年爸妈沿着大苏尔海岸旅行时，只有那辆木饰旅行车。',
      voiceL2: '十五年后，他们在一个雨夜点亮了社区木工坊的灯光……”',
      voiceGate: '完整度校验：已采集 5 / 5 核心故事与年代锚点',
      cta: '确认清晰构想并自动生成 Blueprint →',
      rKicker: 'AI 故事访谈官与视觉完整度校验',
      rHeading: '互动追问与电影级构想提案',
      aiName: 'SceneFlow 视觉访谈官',
      aiL1: '我在照片 1 中看到 70 年代温暖的海岸光线，照片 2 中有黄铜工坊吊灯。',
      aiL2: '50 周年纪念片是否需要呈现 Arthur 的三个年龄段（26、41、78 岁）？',
      clientName: '客户回复（语音口述）',
      clientLine: '“是的！保留妈妈 1974 年的黄色碎花裙，结尾让三代人团聚。”',
      readyPill: '✓ 清晰构想已就绪',
      passMeta: '第 1 / 3 轮 · 完整度 96%',
      filmTitle: '《我们筑起的海岸线》— 50 周年传家影片',
      filmSub: '规格：16:9 影院 + 9:16 珍藏版 · 柯达 Portra 胶片质感 · 12 场戏',
      acts: [
        ['第一幕 · 1974 大苏尔青春', 'Arthur（26岁）与 Eleanor（24岁，黄色碎花裙）站在 1974 旅行车旁。'],
        ['第二幕 · 1989 雨夜木工坊', 'Arthur（41岁）点亮琥珀色吊灯，家族木工坊正式开业。'],
        ['第三幕 · 当代家族首映礼', 'Arthur（78岁）、Eleanor（76岁）、女儿 Claire 与孙辈共庆金婚。'],
      ],
      locks: '自动提取演员与年代锁定：Arthur (26·41·78) · Eleanor (24·39·76) · 3 场景',
      footer: '客户确认后立即在制片工作台生成 Blueprint 与连贯性资产库。',
    },
    blueprint: {
      title: 'Blueprint 分享链接与利润估算器',
      urlPill: 'sceneflowai.studio/blueprint/share/coastline-92b · 第 1 / 2 轮',
      badgeText: 'AR 评分 94 / 100 · 79% 净利润率',
      kicker: '共享客户 BLUEPRINT · 分镜节拍图解',
      heading: '视频渲染前逐节拍可视化签核',
      listenBtn: '▶ 收听语音故事大纲',
      beats: [
        ['节拍 01 · 开场', '客厅旧照片盒', '78 岁 Arthur 与 76 岁 Eleanor 在午后阳光下翻开 1974 相册。', '客户已批准 ✓'],
        ['节拍 02 · 1974 闪回', '海岸悬崖旅行车', '26 岁 Arthur 与 24 岁 Eleanor 在金色海浪旁欢笑，零外景差旅。', '客户已批准 ✓'],
        ['节拍 03 · 1989 里程碑', '雨夜盛大开业', '琥珀色吊灯映照湿润街道，客户要求加入更温暖的大提琴配乐。', '1 条反馈已解决 ✓'],
      ],
      cta: '✓ 客户签核完成（第 1 / 2 轮）— 放行至制作阶段',
      rKicker: '制片范围与利润防火墙',
      rHeading: 'Blueprint 成本与利润估算',
      marginLabel: '预计净服务利润（扣除算力 + PM 工时）',
      profitBig: '¥4,243',
      marginPct: '79.8% 利润率',
      pkgNote: '套餐：¥5,313 · 预计算力：¥160（2,400 cr 含 20% 缓冲）',
      rows: [
        ['Blueprint、分镜插画与 AR 评分', '140 cr (¥9)', '已锁定 ✓'],
        ['连贯性资产库（8 肖像 + 3 场景）', '220 cr (¥15)', '预估'],
        ['对白、旁白、SFX 与配乐', '190 cr (¥13)', '预估'],
        ['混合剧照 + 12 段 Omni 10s 片段', '1,450 cr (¥96)', '预估'],
        ['20% 智能重拍与修改储备金', '400 cr (¥27)', '上限保护'],
      ],
      chatTitle: '客户与 PM 对话 · 修改上限已启用（最多 2 轮）',
      chat1: 'Claire V.：“看到 1974 悬崖分镜图时，我们都感动落泪了！”',
      chat2: '制片 PM：“太棒了！批准后即可锁定连贯性角色肖像。”',
      chatCap: '硬性额度上限：2,500 cr · 杜绝意外渲染超支',
    },
    selfie: {
      title: '角色自拍棚与参考肖像锁定',
      urlPill: 'AI 人脸构图 · 一键精修 · 1:1 身份锁定 · 肖像配音匹配',
      badgeText: '1:1 身份锁定已验证',
      kicker: '角色自拍棚 · 零门槛棚拍级头像增强',
      heading: '自动构图、精修并精确锁定面部身份',
      presets: ['棚拍头像', '精致整理', '自然肖像', '标准试镜'],
      rawLabel: '手机原图自拍',
      proLabel: 'AI 棚拍头像 · 1:1 锁定',
      checks: [
        ['✓ 发型与仪容整理', '抚平杂乱碎发，保持原有发际线不变'],
        ['✓ 5200K 光线与镜头矫正', '均衡主光并消除手机广角畸变'],
        ['✓ 严格 1:1 骨相与五官锁定', '拒绝过度美颜，完整保留眉眼鼻颌特征'],
      ],
      rKicker: '跨年代肖像与家族遗传特征',
      rHeading: '跨年代减龄变老，并为肖像自动匹配音色',
      eras: [
        ['基准 · 26 岁 (1974)', 'Elara Vance · 青年', '基于参考肖像生成'],
        ['年代 · 41 岁 (1989)', 'Marcus Thorne · 壮年', '眼神与胡须锁定'],
        ['血脉 · 68 岁', 'Dr. Aris · 老年', '家族特征自然遗传'],
      ],
      vKicker: '多模态肖像配音匹配',
      vHeading: '自动校准声线年龄、音色与语速',
      vSub: '结合肖像年龄与剧本角色，自动匹配理想声学音域（130 词/分）',
      vMatch: '▶ 已匹配声线：Kore-Studio（98% 契合）· 同步 70+ 语言',
      vNote: '支持一键“从剧本重置”，跨集同步服装、道具与演员设定。',
      bTitle: 'person [1] + 服装双联图已就绪（Omni 1.2 Flash）',
      bSub: '独立面部身份与逐镜头服装自动绑定至剧照与 10 秒视频片段。',
    },
    launchpad: {
      title: '白标制片人启动台与 RBAC 权限',
      urlPill: 'sceneflowai.studio/dashboard/settings/producer · Pro+ 白标已启用',
      badgeText: '4 步启动台 · 100% 白标',
      steps: [
        '01 · 品牌定制与 IP 保护盾',
        '02 · 垂直行业价目表模板',
        '03 · 生成专属 /intake 嵌入链接',
        '04 · 邀请 PM 并设置额度上限',
      ],
      lKicker: 'PRO+ 白标客户门户品牌',
      lHeading: '客户全程只看到您的工作室名称、徽标与域名',
      brandSub: '主题色：#10B981 · 客服：concierge@harborlegacy.studio',
      brandHide: '✓ 在采集、Blueprint、连贯性与审片室全面隐藏 “Powered by SceneFlow”',
      privHeading: '企业级客户隐私与利润护栏',
      privs: [
        ['✓ 自动剥离 EXIF GPS 元数据', '客户家庭与房产照片在入库前即完成隐私清洗。'],
        ['✓ 绝不参与共享训练 + 一键清理原图', '客户素材绝不训练外部模型，交付后一键彻底清除。'],
        ['✓ 每日采集与修改轮次硬上限', '默认 2 轮客户修改 · 每日公共采集上限：1,500 cr。'],
      ],
      rKicker: '即用型行业报价单与团队 RBAC',
      rHeading: '标准垂直定价与 PM 月度额度分配',
      rates: [
        ['家族回忆录与纪念片', '¥2,321 – ¥6,318', '成本约 ¥665 · 80% 净利'],
        ['高端房产与别墅巡礼', '¥1,656 – ¥3,658', '成本约 ¥399 · 78% 净利'],
        ['企业培训与 SOP 课程', '¥3,983 – ¥11,970', '成本约 ¥998 · 季度续费'],
        ['本地品牌与 9:16 广告包', '¥2,653 – ¥7,980', '成本约 ¥732 · 20+ 客户'],
      ],
      rbacTitle: '工作区项目经理（RBAC 与月度额度上限）',
      rbac1: '• maya.pm@harborlegacy.studio — 角色：PM · 12 个项目 · 4,200 / 8,000 cr',
      rbac2: '• lucas.pm@harborlegacy.studio — 角色：PM · 9 个项目 · 3,150 / 8,000 cr',
      embed: '<iframe src="https://sceneflowai.studio/embed/intake/harbor-7f9a" /> · 一键复制嵌入',
      ref: '✓ 20% 合作伙伴返佣方案已就绪（养老社区、地产经纪与代理商）',
    },
    streams: {
      title: '成片流资产库与一键全球发布',
      urlPill: 'Pre-Vis 拼接 · 场景 · 章节 · 9:16 预告 · 4K 母版 · 70+ 语言',
      badgeText: '已连接 YouTube · TikTok · Facebook',
      filters: ['全部交付 (28)', 'Pre-Vis (7)', '场景章节 (12)', '9:16 预告 (4)', '4K 母版 (5)'],
      langFilter: '70+ 语言筛选：EN · ES · PT · HI · ZH · AR · TH',
      lKicker: '成片流浏览器 · 版本历史与 FFmpeg 无损拼接',
      rows: [
        ['4K 终版母版 · 简体中文 (ZH)', '16:9 · 4K UHD · -14 LUFS · v3 当前版', '已发布 · YouTube ✓', '#10b981'],
        ['4K 终版母版 · English (EN)', '16:9 · 实景口型同步 + 分轨混音 · v2', '准备发布', '#06b6d4'],
        ['Pre-Vis 动态分镜（12 场完整拼接）', '16:9 · FFmpeg 无损音画同步 · v1', '客户已批准 ✓', '#10b981'],
        ['社媒预告短片 · Español (ES)', '9:16 竖屏 · Reels / TikTok / Shorts · v2', '已发布 · TikTok ✓', '#a855f7'],
        ['4K 母版 · PT / हिन्दी / العربية / ไทย', '4 套本地化语言流 · 1080p/4K', '4 / 4 就绪', '#06b6d4'],
        ['第 02 章交付 · 雨夜木工坊', '16:9 · 阶段性提前交付客户 · v1', '已分享 /s/ 链接', '#f59e0b'],
      ],
      rKicker: '打包发布 · 一键社媒 OAUTH',
      rHeading: '零云端配置，一键全球分发',
      thumbCap: '自动生成高点击率封面图',
      socials: [
        ['YouTube 频道已连接', '一键 OAuth · 自动生成多语标题、章节与字幕'],
        ['TikTok 商业号已连接', '9:16 竖屏直发 · 自动生成吸睛文案'],
        ['Facebook 主页已连接', '多语言同步发布 + 分轨母带 ZIP 归档'],
      ],
      cta: '发布所选成片流并下载 4K 打包 →',
    },
  },
  ar: {
    intake: {
      title: 'Harbor Legacy Films · بوابة استلام القصة',
      urlPill: 'sceneflowai.studio/intake/harbor-memoir-7f9a · بدون تسجيل دخول',
      badgeText: '7 لغات · موافقة موثقة',
      kicker: 'بوابة العميل ذات العلامة البيضاء · الخطوة 1 من 3',
      heading: 'أخبرنا قصة عائلتك',
      sub: 'تحدث بطبيعية أو اكتب بلغتك المفضلة — دون الحاجة لإنشاء حساب.',
      consentTitle: 'تم توقيع موافقة الوسائط والتشابه والصوت',
      consentSub: 'إزالة بيانات EXIF GPS تلقائياً · لا تُستخدم أبداً لتدريب نماذج مشتركة',
      consentMeta: 'التوقيع: Claire Vance · السجل #CL-2026-8841 · السقف: 2,500 cr',
      photosHeading: 'مقابلة الصور الذكية (الذكاء الاصطناعي يحلل الصور ويسأل)',
      photos: ['بورتريه 1974 · EXIF نظيف', 'افتتاح الورشة 1989 · مُكتشف', 'ورشة الميناء · مُفهرس'],
      voiceTitle: 'الإملاء الصوتي نشط (01:42) · نص مباشر',
      voiceL1: '“في عام 1974 لم يملك أبي وأمي سوى تلك السيارة العائلية على الساحل.',
      voiceL2: 'وبعد خمسة عشر عاماً افتتحا ورشة النجارة في أمسية ممطرة...”',
      voiceGate: 'بوابة الاكتمال: تم التقاط 5 / 5 من ركائز القصة والحقبة',
      cta: 'تأكيد الرؤية الموضحة وإنشاء Blueprint تلقائياً →',
      rKicker: 'المحاور الذكي وبوابة اكتمال الرؤية',
      rHeading: 'أسئلة تفاعلية ورؤية سينمائية مقترحة',
      aiName: 'محاور SceneFlow البصري',
      aiL1: 'أرى ضوء ساحل السبعينيات في الصورة 1 ومصابيح الورشة النحاسية في الصورة 2.',
      aiL2: 'هل نصوّر آرثر في ثلاث مراحل عمرية (26 و41 و78) للذكرى الخمسين؟',
      clientName: 'رد العميل (إملاء صوتي)',
      clientLine: '“نعم! حافظ على فستان أمي الأصفر في 1974 واجمع الأجيال الثلاثة في الختام.”',
      readyPill: '✓ الرؤية الموضحة جاهزة',
      passMeta: 'الجولة 1 من 3 · اكتمال 96%',
      filmTitle: '“الساحل الذي بنيناه” — فيلم الذكرى الخمسين',
      filmSub: 'التنسيق: سينما 16:9 + عمودي 9:16 · Kodak Portra · 12 مشهداً',
      acts: [
        ['الفصل I · شباب 1974 على الساحل', 'آرثر (26) وإليانور (24، الفستان الأصفر) بجانب سيارة 1974 العائلية.'],
        ['الفصل II · ورشة 1989 الممطرة', 'آرثر (41) يضيء مصابيح الورشة الكهرمانية مع انطلاق المشروع العائلي.'],
        ['الفصل III · العرض العائلي الحالي', 'آرثر (78) وإليانور (76) والابنة كلير والأحفاد يحتفلون بـ 50 عاماً.'],
      ],
      locks: 'تثبيت الممثلين والحقب: Arthur (26 · 41 · 78) · Eleanor (24 · 39 · 76) · 3 مواقع',
      footer: 'موافقة العميل تنشئ Blueprint وخزنة الاستمرارية فوراً في مساحة المنتج.',
    },
    blueprint: {
      title: 'رابط Blueprint ومُقدّر هامش الربح',
      urlPill: 'sceneflowai.studio/blueprint/share/coastline-92b · الجولة 1 من 2',
      badgeText: 'تقييم AR 94 / 100 · صافي هامش 79%',
      kicker: 'BLUEPRINT مشترك · لوحات القصة المصورة',
      heading: 'اعتماد بصري لكل مشهد قبل إنفاق رصيد الفيديو',
      listenBtn: '▶ استمع للمعالجة المروية',
      beats: [
        ['المشهد 01 · الافتتاح', 'صندوق الصور في غرفة المعيشة', 'آرثر (78) وإليانور (76) يفتحان ألبوم 1974 في ضوء العصر الدافئ.', 'معتمد من العميل ✓'],
        ['المشهد 02 · فلاش باك 1974', 'السيارة على جرف الساحل', 'آرثر (26) وإليانور (24) يضحكان أمام البحر عند الغروب بلا تكلفة سفر.', 'معتمد من العميل ✓'],
        ['المشهد 03 · محطة 1989', 'الافتتاح الكبير تحت المطر', 'مصابيح الورشة تنير الرصيف المبلل؛ العميل طلب موسيقى تشيلو أدفأ.', 'تم حل ملاحظة 1 ✓'],
      ],
      cta: '✓ اكتمل اعتماد العميل (الجولة 1 / 2) — الضوء الأخضر للإنتاج',
      rKicker: 'نطاق المنتج وجدار حماية الهامش',
      rHeading: 'مُقدّر تكلفة وأرباح Blueprint',
      marginLabel: 'صافي هامش الخدمة المتوقع (بعد الحوسبة + وقت PM)',
      profitBig: '2,393 ر.س',
      marginPct: '79.8% هامش',
      pkgNote: 'الباقة: 2,996 ر.س · الحوسبة المقدرة: 90 ر.س (2,400 cr تشمل 20% احتياطي)',
      rows: [
        ['Blueprint والرسوم وتقييم AR', '140 cr (5 ر.س)', 'مُثبّت ✓'],
        ['خزنة الاستمرارية (8 صور + 3 مواقع)', '220 cr (8 ر.س)', 'تقدير'],
        ['الحوار والسرد وSFX والموسيقى', '190 cr (7 ر.س)', 'تقدير'],
        ['لقطات ثابتة + 12 مقطع Omni 10s', '1,450 cr (54 ر.س)', 'تقدير'],
        ['احتياطي 20% لإعادة التصوير', '400 cr (15 ر.س)', 'سقف محمي'],
      ],
      chatTitle: 'محادثة العميل وPM · حد التعديلات (جولتان كحد أقصى)',
      chat1: 'Claire V.: “رؤية مشهد 1974 المصور أثّرت فينا كثيراً!”',
      chat2: 'مدير الإنتاج: “رائع! الاعتماد يثبت النطاق لبورتريهات الاستمرارية.”',
      chatCap: 'السقف الصارم للرصيد: 2,500 cr · صفر تكاليف إضافية مفاجئة',
    },
    selfie: {
      title: 'استوديو السيلفي وتثبيت ملامح الشخصية',
      urlPill: 'تأطير الوجه بالذكاء الاصطناعي · تحسين فوري · قفل 1:1 · مطابقة الصوت',
      badgeText: 'تم التحقق من قفل الهوية 1:1',
      kicker: 'استوديو سيلفي الشخصية · تحسين فوري بجودة الاستوديو',
      heading: 'تأطير وتنقية وتثبيت الهوية الوجهية بدقة تامة',
      presets: ['بورتريه استوديو', 'تحسين احترافي', 'طبيعي', 'كاستينغ محايد'],
      rawLabel: 'سيلفي الهاتف الخام',
      proLabel: 'بورتريه استوديو AI · 1:1',
      checks: [
        ['✓ تهذيب الشعر والمظهر', 'تنعيم الخصلات المتطايرة دون تغيير خط الشعر'],
        ['✓ إضاءة 5200K وتصحيح العدسة', 'إضاءة متوازنة وإزالة تشوّه عدسة الهاتف'],
        ['✓ قفل صارم 1:1 لملامح الوجه', 'حفظ دقيق للعينين والأنف والفك دون تزييف'],
      ],
      rKicker: 'التشابه عبر الحقب والوراثة العائلية',
      rHeading: 'تغيير العمر عبر العقود ومطابقة الصوت للبورتريه',
      eras: [
        ['مرجع · عمر 26 (1974)', 'Elara Vance · شباب', 'مشتق بالتشابه الدقيق'],
        ['حقبة · عمر 41 (1989)', 'Marcus Thorne · نضج', 'تثبيت العينين واللحية'],
        ['سلالة · عمر 68', 'Dr. Aris · كبر', 'وراثة ملامح عائلية'],
      ],
      vKicker: 'مطابقة الصوت المتعددة للبورتريه',
      vHeading: 'معايرة تلقائية للنبرة والعمر والإيقاع الصوتي',
      vSub: 'يحلل عمر البورتريه ودور النص لاختيار الطبقة الصوتية الأنسب تلقائياً',
      vMatch: '▶ الصوت المطابق: Kore-Studio (98% توافق) · متزامن بـ 70+ لغة',
      vNote: 'يتضمن “إعادة التعيين من النص” بنقرة واحدة لمزامنة الأزياء والممثلين.',
      bTitle: 'person [1] + لوحة الأزياء جاهزة لمحرك Omni 1.2 Flash',
      bSub: 'هوية وجه مستقلة + أزياء كل لقطة مرتبطة تلقائياً بالصور والمقاطع.',
    },
    launchpad: {
      title: 'منصة إطلاق المنتج بالعلامة البيضاء وRBAC',
      urlPill: 'sceneflowai.studio/dashboard/settings/producer · Pro+ White-Label نشط',
      badgeText: '4 خطوات · 100% علامة بيضاء',
      steps: [
        '01 · هوية الاستوديو ودرع IP',
        '02 · قوائم أسعار القطاعات الجاهزة',
        '03 · رابط /intake وكود التضمين',
        '04 · دعوة PMs وسقوف الرصيد',
      ],
      lKicker: 'العلامة البيضاء لباقة PRO+',
      lHeading: 'يرى العملاء اسم استوديوك وشعارك ونطاقك فقط',
      brandSub: 'اللون الأساسي: #10B981 · الدعم: concierge@harborlegacy.studio',
      brandHide: '✓ إخفاء “Powered by SceneFlow” عبر جميع بوابات العملاء',
      privHeading: 'خصوصية العملاء وحماية هوامش الربح',
      privs: [
        ['✓ إزالة بيانات EXIF GPS تلقائياً', 'تُنقّى صور العائلة والعقارات فور رفعها قبل التخزين السحابي.'],
        ['✓ صفر تدريب مشترك + مسح بنقرة واحدة', 'لا تُدرّب الوسائط نماذج خارجية وتُحذف بأمان بعد التسليم.'],
        ['✓ حدود يومية للطلبات وجولات التعديل', 'جولتا تعديل افتراضياً · السقف اليومي: 1,500 cr.'],
      ],
      rKicker: 'بطاقات أسعار جاهزة وصلاحيات الفريق RBAC',
      rHeading: 'تسعير القطاعات ومخصصات رصيد مديري المشاريع',
      rates: [
        ['أفلام الذكريات العائلية', '1,309 – 3,563 ر.س', 'التكلفة ~375 ر.س · هامش 80%'],
        ['جولات العقارات والفلل', '934 – 2,063 ر.س', 'التكلفة ~225 ر.س · هامش 78%'],
        ['التدريب المؤسسي وSOPs', '2,246 – 6,750 ر.س', 'التكلفة ~563 ر.س · عقود شهرية'],
        ['حزم العلامات وإعلانات 9:16', '1,496 – 4,500 ر.س', 'التكلفة ~413 ر.س · 20+ عميل'],
      ],
      rbacTitle: 'مديرو المشاريع (RBAC وسقوف الرصيد الشهرية)',
      rbac1: '• maya.pm@harborlegacy.studio — الدور: PM · 12 مشروعاً · 4,200 / 8,000 cr',
      rbac2: '• lucas.pm@harborlegacy.studio — الدور: PM · 9 مشاريع · 3,150 / 8,000 cr',
      embed: '<iframe src="https://sceneflowai.studio/embed/intake/harbor-7f9a" /> · نسخ بنقرة',
      ref: '✓ ملف عمولة الشركاء 20% جاهز (العقارات والوكالات والمخططين)',
    },
    streams: {
      title: 'مخزون البث والنشر بنقرة واحدة',
      urlPill: 'Pre-Vis مدمج · مشاهد · فصول · برومو 9:16 · ماستر 4K · 70+ لغة',
      badgeText: 'YouTube · TikTok · Facebook متصل',
      filters: ['الكل (28)', 'Pre-Vis (7)', 'مشاهد (12)', 'برومو 9:16 (4)', 'ماستر 4K (5)'],
      langFilter: 'فلتر 70+ لغة: EN · ES · PT · HI · ZH · AR · TH',
      lKicker: 'مستكشف البث · سجل الإصدارات والدمج غير الفاقد FFmpeg',
      rows: [
        ['ماستر 4K نهائي · العربية (AR)', '16:9 · 4K UHD · -14 LUFS · v3 نشط', 'منشور · YouTube ✓', '#10b981'],
        ['ماستر 4K نهائي · English (EN)', '16:9 · مزامنة الشفاه ومزج المسارات · v2', 'جاهز للشحن', '#06b6d4'],
        ['Pre-Vis Animatic (دمج 12 مشهداً)', '16:9 · دمج FFmpeg غير فاقد · v1', 'معتمد ✓', '#10b981'],
        ['برومو اجتماعي · Español (ES)', '9:16 عمودي · Reels / TikTok / Shorts · v2', 'منشور · TikTok ✓', '#a855f7'],
        ['ماستر 4K · 中文 / हिन्दी / PT / ไทย', '4 مسارات مترجمة · 1080p/4K', '4 / 4 جاهز', '#06b6d4'],
        ['الفصل 02 · ورشة المطر', '16:9 · إصدار مبكر للعميل · v1', 'مشارك عبر /s/', '#f59e0b'],
      ],
      rKicker: 'التغليف والنشر · OAUTH بنقرة واحدة',
      rHeading: 'انشر عالمياً دون أي إعداد خوادم',
      thumbCap: 'صورة مصغرة عالية النقر تلقائياً',
      socials: [
        ['قناة YouTube متصلة', 'OAuth بنقرة · عناوين وفصول وترجمات محلية'],
        ['حساب TikTok للأعمال متصل', 'نشر مباشر 9:16 · وصف جذاب تلقائي'],
        ['صفحة Facebook متصلة', 'إصدار متعدد اللغات + أرشيف المسارات ZIP'],
      ],
      cta: 'نشر المسارات المحددة وتنزيل حزمة 4K →',
    },
  },
  th: {
    intake: {
      title: 'Harbor Legacy Films · รับข้อมูลเรื่องราวลูกค้า',
      urlPill: 'sceneflowai.studio/intake/harbor-memoir-7f9a · ไม่ต้องล็อกอิน',
      badgeText: '7 ภาษา · ยืนยันสิทธิ์เรียบร้อย',
      kicker: 'พอร์ทัลลูกค้า WHITE-LABEL · ขั้นที่ 1 จาก 3',
      heading: 'เล่าเรื่องราวครอบครัวของคุณให้เราฟัง',
      sub: 'พูดตามธรรมชาติหรือพิมพ์เป็นภาษาไทยได้เลย — ไม่ต้องสมัครบัญชี',
      consentTitle: 'ลงนามยินยอมใช้สื่อ ภาพเหมือนหลายช่วงวัย และเสียงแล้ว',
      consentSub: 'ลบพิกัด EXIF GPS อัตโนมัติ · ไม่นำไปเทรนโมเดล AI สาธารณะ',
      consentMeta: 'ลงนามโดย Claire Vance · รหัส #CL-2026-8841 · เพดาน: 2,500 cr',
      photosHeading: 'สัมภาษณ์จากภาพถ่ายด้วย Vision AI (วิเคราะห์ภาพและถามต่ออัตโนมัติ)',
      photos: ['ภาพชายฝั่ง 1974 · ล้าง EXIF แล้ว', 'วันเปิดโรงไม้ 1989 · ตรวจพบ', 'ฉากโรงไม้ริมท่า · บันทึกแล้ว'],
      voiceTitle: 'บันทึกเสียงพูดอัตโนมัติ (01:42) · ถอดข้อความสด',
      voiceL1: '“ปี 1974 พ่อกับแม่มีแค่รถสเตชันแวกอนคันนั้นขับเลียบชายฝั่งบิ๊กเซอร์',
      voiceL2: 'สิบห้าปีต่อมาทั้งคู่ก็เปิดโรงงานไม้เล็กๆ ท่ามกลางสายฝนยามเย็น...”',
      voiceGate: 'ตรวจความครบถ้วน: เก็บจุดยึดเรื่องราวและยุคสมัยครบ 5 / 5 แล้ว',
      cta: 'ยืนยันวิสัยทัศน์เรื่องราวและสร้าง Blueprint อัตโนมัติ →',
      rKicker: 'AI สัมภาษณ์เรื่องราวและตรวจสอบความสมบูรณ์',
      rHeading: 'คำถามโต้ตอบและข้อเสนอโครงเรื่องภาพยนตร์',
      aiName: 'SceneFlow Vision Interviewer',
      aiL1: 'ระบบเห็นแสงแดดชายฝั่งยุค 70 ในภาพที่ 1 และโคมไฟทองเหลืองโรงไม้ในภาพที่ 2',
      aiL2: 'ต้องการถ่ายทอดคุณอาเธอร์ 3 ช่วงวัย (26, 41 และ 78 ปี) สำหรับงานครบรอบ 50 ปีไหมครับ?',
      clientName: 'คำตอบลูกค้า (พูดผ่านไมโครโฟน)',
      clientLine: '“ใช่เลย! คงชุดเดรสลายดอกสีเหลืองของคุณแม่ปี 1974 และรวมครอบครัว 3 รุ่นตอนจบ”',
      readyPill: '✓ วิสัยทัศน์เรื่องราวพร้อมแล้ว',
      passMeta: 'รอบที่ 1 จาก 3 · ครบถ้วน 96%',
      filmTitle: '“ชายฝั่งที่เราสร้างร่วมกัน” — ภาพยนตร์ครบรอบ 50 ปี',
      filmSub: 'รูปแบบ: ภาพยนตร์ 16:9 + แนวตั้ง 9:16 · ฟิล์ม Kodak Portra · 12 ฉาก',
      acts: [
        ['องก์ 1 · 1974 วัยหนุ่มสาวที่บิ๊กเซอร์', 'อาเธอร์ (26 ปี) และเอเลนอร์ (24 ปี ชุดเดรสสีเหลือง) ข้างรถปี 1974'],
        ['องก์ 2 · 1989 เปิดโรงไม้คืนฝนพรำ', 'อาเธอร์ (41 ปี) เปิดไฟโคมสีอำพันเริ่มต้นธุรกิจครอบครัวอย่างมั่นคง'],
        ['องก์ 3 · รอบปฐมทัศน์ครอบครัวปัจจุบัน', 'อาเธอร์ (78 ปี), เอเลนอร์ (76 ปี), แคลร์ และหลานๆ ฉลองครบ 50 ปี'],
      ],
      locks: 'ล็อกนักแสดงและยุคอัตโนมัติ: Arthur (26 · 41 · 78) · Eleanor (24 · 39 · 76) · 3 ฉาก',
      footer: 'เมื่อลูกค้าอนุมัติ ระบบจะสร้าง Blueprint และคลังความต่อเนื่องให้อัตโนมัติทันที',
    },
    blueprint: {
      title: 'ลิงก์แชร์ Blueprint และเครื่องคำนวณกำไร',
      urlPill: 'sceneflowai.studio/blueprint/share/coastline-92b · รอบที่ 1 จาก 2',
      badgeText: 'คะแนน AR 94 / 100 · กำไรสุทธิ 79%',
      kicker: 'BLUEPRINT แชร์ลูกค้า · สตอรี่บอร์ดประกอบภาพรายช็อต',
      heading: 'อนุมัติภาพสตอรี่บอร์ดทีละจังหวะก่อนเริ่มใช้เครดิตวิดีโอ',
      listenBtn: '▶ ฟังเสียงบรรยายโครงเรื่อง',
      beats: [
        ['ช็อต 01 · เปิดเรื่อง', 'กล่องภาพถ่ายในห้องนั่งเล่น', 'อาเธอร์ (78) และเอเลนอร์ (76) เปิดอัลบั้มปี 1974 ใต้แสงบ่ายอบอุ่น', 'ลูกค้าอนุมัติแล้ว ✓'],
        ['ช็อต 02 · ย้อนอดีต 1974', 'รถครอบครัวริมหน้าผา', 'อาเธอร์ (26) และเอเลนอร์ (24) ยิ้มริมทะเลตอนเย็น โดยไม่ต้องออกกอง', 'ลูกค้าอนุมัติแล้ว ✓'],
        ['ช็อต 03 · จุดเปลี่ยน 1989', 'วันเปิดร้านท่ามกลางสายฝน', 'ไฟสีอำพันส่องทั่วโรงไม้ ลูกค้าขอเพิ่มเสียงเชลโลให้อบอุ่นขึ้น', 'แก้ไข 1 จุดแล้ว ✓'],
      ],
      cta: '✓ ลูกค้าอนุมัติครบแล้ว (รอบ 1 / 2) — เดินหน้าสู่สเตจการผลิต',
      rKicker: 'ขอบเขตงานและกำแพงป้องกันอัตรากำไร',
      rHeading: 'ประมาณการต้นทุนและกำไร Blueprint',
      marginLabel: 'กำไรบริการสุทธิโดยประมาณ (หักเครดิต + เวลา PM แล้ว)',
      profitBig: '฿21,692',
      marginPct: 'กำไร 79.8%',
      pkgNote: 'แพ็กเกจ: ฿27,166 · เครดิตประเมิน: ฿816 (2,400 cr รวมสำรอง 20%)',
      rows: [
        ['Blueprint, ภาพประกอบและ AR', '140 cr (฿48)', 'ล็อกแล้ว ✓'],
        ['คลังความต่อเนื่อง (8 ภาพ + 3 ฉาก)', '220 cr (฿75)', 'ประมาณการ'],
        ['บทพูด, เสียงบรรยาย, SFX และดนตรี', '190 cr (฿65)', 'ประมาณการ'],
        ['ภาพนิ่ง + คลิป Omni 10 วิ 12 ช็อต', '1,450 cr (฿493)', 'ประมาณการ'],
        ['งบสำรองถ่ายซ่อมและแก้ไข 20%', '400 cr (฿136)', 'คุมเพดาน'],
      ],
      chatTitle: 'แชตลูกค้าและ PM · คุมเพดานการแก้ไข (สูงสุด 2 รอบ)',
      chat1: 'Claire V.: “เห็นภาพสตอรี่บอร์ดปี 1974 แล้วน้ำตาซึมเลยค่ะ!”',
      chat2: 'PM ผู้ผลิต: “ยินดีมากครับ! อนุมัติแล้วระบบจะล็อกภาพตัวละครทันที”',
      chatCap: 'เพดานเครดิตสูงสุด: 2,500 cr · หมดปัญหาต้นทุนเรนเดอร์บานปลาย',
    },
    selfie: {
      title: 'สตูดิโอเซลฟี่ตัวละครและล็อกใบหน้าเหมือนจริง',
      urlPill: 'จัดกรอบหน้า AI · ปรับลุคสตูดิโอ · ล็อกใบหน้า 1:1 · จับคู่เสียงจากภาพ',
      badgeText: 'ยืนยันการล็อกใบหน้า 1:1 แล้ว',
      kicker: 'CHARACTER SELFIE STUDIO · ยกระดับภาพถ่ายเป็นพอร์ตเทรตสตูดิโอ',
      heading: 'จัดกรอบ ปรับแสง และล็อกโครงหน้าเหมือนจริง 100%',
      presets: ['พอร์ตเทรตสตูดิโอ', 'ปรับลุคเนี๊ยบ', 'ภาพธรรมชาติ', 'แคสติ้งมาตรฐาน'],
      rawLabel: 'ภาพเซลฟี่จากมือถือ',
      proLabel: 'พอร์ตเทรตสตูดิโอ AI · 1:1',
      checks: [
        ['✓ จัดแต่งทรงผมให้เรียบร้อย', 'เก็บปอยผมชี้ฟูโดยไม่เปลี่ยนแนวเส้นผมเดิม'],
        ['✓ แสง 5200K และแก้ความเพี้ยนเลนส์', 'ปรับแสงหลักสมดุลและแก้ความบิดเบี้ยวเลนส์มือถือ'],
        ['✓ ล็อกโครงหน้าและดวงตา 1:1 เข้มงวด', 'ไม่แต่งหน้าเกินจริง คงดวงตา จมูก และกรามแม่นยำ'],
      ],
      rKicker: 'ความเหมือนข้ามยุคสมัยและการสืบทอดลักษณะครอบครัว',
      rHeading: 'ปรับอายุข้ามทศวรรษและจับคู่เสียงให้ตรงใบหน้า',
      eras: [
        ['ต้นแบบ · อายุ 26 (1974)', 'Elara Vance · วัยสาว', 'สร้างจากภาพอ้างอิง'],
        ['ล็อกยุค · อายุ 41 (1989)', 'Marcus Thorne · วัยกลางคน', 'ล็อกดวงตาและหนวดเครา'],
        ['สายเลือด · อายุ 68', 'Dr. Aris · วัยอาวุโส', 'สืบทอดโครงหน้าครอบครัว'],
      ],
      vKicker: 'จับคู่เสียงพากย์จากภาพพอร์ตเทรตอัตโนมัติ',
      vHeading: 'ปรับโทนเสียง อายุ และจังหวะการพูดให้ตรงตัวละคร',
      vSub: 'วิเคราะห์อายุ บุคลิก และบทบาท เพื่อเลือกเนื้อเสียงที่สมจริงที่สุดอัตโนมัติ',
      vMatch: '▶ เสียงที่จับคู่: Kore-Studio (ตรง 98%) · ซิงก์ครบ 70+ ภาษา',
      vNote: 'มีปุ่ม “รีเซ็ตจากบท” ใน 1 คลิก เพื่อซิงก์ชุด พร็อพ และนักแสดงข้ามตอน',
      bTitle: 'person [1] + ภาพชุดคู่พร้อมใช้งานใน Omni 1.2 Flash',
      bSub: 'ผูกใบหน้าและชุดประจำแต่ละช็อตเข้ากับภาพนิ่งและคลิป 10 วิอัตโนมัติ',
    },
    launchpad: {
      title: 'ศูนย์เปิดธุรกิจ White-Label และสิทธิ์ทีม RBAC',
      urlPill: 'sceneflowai.studio/dashboard/settings/producer · Pro+ White-Label เปิดใช้งาน',
      badgeText: '4 ขั้นตอน · White-Label 100%',
      steps: [
        '01 · แบรนด์สตูดิโอและเกราะ IP',
        '02 · ตารางราคาธุรกิจสำเร็จรูป',
        '03 · ลิงก์ /intake และโค้ดฝังเว็บ',
        '04 · เชิญทีม PM และจำกัดเครดิต',
      ],
      lKicker: 'พอร์ทัลแบรนด์ของคุณเอง (PRO+ WHITE-LABEL)',
      lHeading: 'ลูกค้าเห็นเฉพาะชื่อสตูดิโอ โลโก้ และโดเมนของคุณ',
      brandSub: 'สีหลัก: #10B981 · ซัพพอร์ต: concierge@harborlegacy.studio',
      brandHide: '✓ ซ่อน “Powered by SceneFlow” ครบทุกหน้าตั้งแต่นัดสัมภาษณ์ถึงห้องฉาย',
      privHeading: 'ความปลอดภัยข้อมูลลูกค้าและเกราะป้องกันอัตรากำไร',
      privs: [
        ['✓ ลบพิกัด EXIF GPS อัตโนมัติทันที', 'ภาพครอบครัวและอสังหาฯ ของลูกค้าถูกล้างเมตาดาต้าก่อนจัดเก็บ'],
        ['✓ ไม่เทรนโมเดลสาธารณะ + ลบต้นฉบับใน 1 คลิก', 'สื่อลูกค้าเป็นความลับ 100% และล้างไฟล์ดิบได้ทันทีหลังส่งงาน'],
        ['✓ คุมเพดานคำขอรายวันและรอบแก้ไข', 'ค่าเริ่มต้นแก้ไขได้ 2 รอบ · เพดานพอร์ทัลสาธารณะ: 1,500 cr/วัน'],
      ],
      rKicker: 'ตารางราคาสำเร็จรูปและสิทธิ์ทีม RBAC',
      rHeading: 'ราคาขายตามกลุ่มธุรกิจและโควตาเครดิตทีม PM',
      rates: [
        ['วิดีโอชีวประวัติครอบครัว', '฿11,866 – ฿32,300', 'ต้นทุน ~฿3,400 · กำไร 80%'],
        ['ทัวร์อสังหาฯ และพูลวิลล่า', '฿8,466 – ฿18,700', 'ต้นทุน ~฿2,040 · กำไร 78%'],
        ['สื่อฝึกอบรมองค์กรและ SOP', '฿20,366 – ฿61,200', 'ต้นทุน ~฿5,100 · รายไตรมาส'],
        ['แพ็กเกจแบรนด์และโฆษณา 9:16', '฿13,566 – ฿40,800', 'ต้นทุน ~฿3,740 · 20+ ลูกค้า'],
      ],
      rbacTitle: 'ผู้จัดการโครงการในทีม (RBAC และเพดานเครดิตรายเดือน)',
      rbac1: '• maya.pm@harborlegacy.studio — ตำแหน่ง: PM · 12 งาน · 4,200 / 8,000 cr',
      rbac2: '• lucas.pm@harborlegacy.studio — ตำแหน่ง: PM · 9 งาน · 3,150 / 8,000 cr',
      embed: '<iframe src="https://sceneflowai.studio/embed/intake/harbor-7f9a" /> · คัดลอก 1 คลิก',
      ref: '✓ เอกสารค่าแนะนำพาร์ตเนอร์ 20% พร้อมใช้ (นายหน้า เอเจนซี่ และพันธมิตร)',
    },
    streams: {
      title: 'คลังสตรีมผลงานและเผยแพร่ใน 1 คลิก',
      urlPill: 'Pre-Vis ต่อเนื่อง · ฉาก · บท · โปรโมต 9:16 · มาสเตอร์ 4K · 70+ ภาษา',
      badgeText: 'เชื่อมต่อ YouTube · TikTok · Facebook แล้ว',
      filters: ['ทั้งหมด (28)', 'Pre-Vis รวม (7)', 'ฉากและบท (12)', 'โปรโมต 9:16 (4)', 'มาสเตอร์ 4K (5)'],
      langFilter: 'กรอง 70+ ภาษา: EN · ES · PT · HI · ZH · AR · TH',
      lKicker: 'คลังผลงานสตรีม · ประวัติเวอร์ชันและการต่อไฟล์ FFmpeg ไร้การสูญเสีย',
      rows: [
        ['มาสเตอร์ 4K · ภาษาไทย (TH)', '16:9 · 4K UHD · -14 LUFS · v3 ล่าสุด', 'เผยแพร่ · YouTube ✓', '#10b981'],
        ['มาสเตอร์ 4K · English (EN)', '16:9 · ลิปซิงก์ + มิกซ์แยกแทร็ก · v2', 'พร้อมส่งมอบ', '#06b6d4'],
        ['Pre-Vis Animatic (รวมครบ 12 ฉาก)', '16:9 · ต่อไฟล์ FFmpeg ตรงจังหวะเสียง · v1', 'ลูกค้าอนุมัติ ✓', '#10b981'],
        ['คลิปโปรโมตโซเชียล · Español (ES)', '9:16 แนวตั้ง · Reels / TikTok / Shorts · v2', 'เผยแพร่ · TikTok ✓', '#a855f7'],
        ['มาสเตอร์ 4K · 中文 / हिन्दी / PT / AR', '4 สตรีมพากย์เสียงท้องถิ่น · 1080p/4K', 'พร้อม 4 / 4', '#06b6d4'],
        ['บทที่ 02 · โรงไม้คืนฝนพรำ', '16:9 · ส่งงานบางส่วนให้ลูกค้าตรวจ · v1', 'แชร์ลิงก์ /s/ แล้ว', '#f59e0b'],
      ],
      rKicker: 'แพ็กเกจและเผยแพร่ · เชื่อมต่อโซเชียลใน 1 คลิก',
      rHeading: 'เผยแพร่ทั่วโลกโดยไม่ต้องตั้งค่าคลาวด์เอง',
      thumbCap: 'ภาพปก CTR สูงสร้างอัตโนมัติ',
      socials: [
        ['เชื่อมต่อช่อง YouTube แล้ว', 'OAuth 1 คลิก · ชื่อเรื่อง บท และซับไตเติลตามภาษา'],
        ['เชื่อมต่อ TikTok Business แล้ว', 'โพสต์ตรง 9:16 · แคปชันเปิดเรื่องอัตโนมัติ'],
        ['เชื่อมต่อเพจ Facebook แล้ว', 'เผยแพร่หลายภาษา + ไฟล์แยกแทร็ก ZIP'],
      ],
      cta: 'เผยแพร่สตรีมที่เลือกและดาวน์โหลดชุด 4K →',
    },
  },
}

function shellWindow({ fontFamily, title, urlPill, badgeText, badgeColor = '#10b981', bodySvg }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="${fontFamily}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="55%" stop-color="#0b1224"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="accentCyan" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="accentViolet" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
  <rect x="56" y="44" width="2448" height="1352" rx="28" fill="#090f1f" stroke="#1e293b" stroke-width="3"/>
  <rect x="56" y="44" width="2448" height="84" rx="28" fill="#0f172a"/>
  <rect x="56" y="96" width="2448" height="32" fill="#0f172a"/>
  <line x1="56" y1="128" x2="2504" y2="128" stroke="#1e293b" stroke-width="2"/>

  <circle cx="106" cy="86" r="10" fill="#f43f5e" opacity="0.85"/>
  <circle cx="138" cy="86" r="10" fill="#f59e0b" opacity="0.85"/>
  <circle cx="170" cy="86" r="10" fill="#10b981" opacity="0.85"/>

  <text x="212" y="94" fill="#f8fafc" font-size="22" font-weight="700">${title}</text>

  <rect x="960" y="62" width="1040" height="48" rx="14" fill="#020617" stroke="#334155" stroke-width="2"/>
  <text x="1480" y="93" fill="#38bdf8" font-size="18" font-weight="600" text-anchor="middle">${urlPill}</text>

  <rect x="2040" y="62" width="424" height="48" rx="24" fill="${badgeColor}" fill-opacity="0.16" stroke="${badgeColor}" stroke-width="2"/>
  <text x="2252" y="93" fill="#ecfdf5" font-size="18" font-weight="700" text-anchor="middle">${badgeText}</text>

  ${bodySvg}
</svg>`
}

function buildClientIntakeSvg(locale, c, fontFamily) {
  const activeIdx = ACTIVE_LANG_INDEX[locale] ?? 0
  return shellWindow({
    fontFamily,
    title: c.title,
    urlPill: c.urlPill,
    badgeText: c.badgeText,
    badgeColor: '#10b981',
    bodySvg: `
      <rect x="96" y="164" width="1060" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="136" y="220" fill="#38bdf8" font-size="18" font-weight="700">${c.kicker}</text>
      <text x="136" y="268" fill="#ffffff" font-size="33" font-weight="800">${c.heading}</text>
      <text x="136" y="308" fill="#94a3b8" font-size="21">${c.sub}</text>

      ${['EN · English', 'ES · Español', 'PT · Português', 'HI · हिन्दी', 'ZH · 中文', 'AR · العربية', 'TH · ไทย']
        .map((lbl, idx) => {
          const x = 136 + idx * 138
          const active = idx === activeIdx
          return `
            <rect x="${x}" y="336" width="128" height="44" rx="12" fill="${active ? '#06b6d4' : '#1e293b'}" fill-opacity="${active ? '0.24' : '0.85'}" stroke="${active ? '#22d3ee' : '#334155'}" stroke-width="2"/>
            <text x="${x + 64}" y="365" fill="${active ? '#ecfeff' : '#cbd5e1'}" font-size="16" font-weight="700" text-anchor="middle">${lbl}</text>
          `
        })
        .join('')}

      <rect x="136" y="408" width="980" height="168" rx="18" fill="#052e2b" fill-opacity="0.55" stroke="#10b981" stroke-width="2"/>
      <circle cx="180" cy="456" r="18" fill="#10b981"/>
      <text x="180" y="463" fill="#022c22" font-size="22" font-weight="900" text-anchor="middle">✓</text>
      <text x="216" y="463" fill="#ecfdf5" font-size="23" font-weight="700">${c.consentTitle}</text>
      <text x="216" y="502" fill="#a7f3d0" font-size="19">${c.consentSub}</text>
      <text x="216" y="540" fill="#6ee7b7" font-size="17" font-weight="600">${c.consentMeta}</text>

      <text x="136" y="626" fill="#e2e8f0" font-size="22" font-weight="700">${c.photosHeading}</text>

      ${[
        [136, IMG_ELARA, c.photos[0]],
        [472, IMG_MARCUS, c.photos[1]],
        [808, IMG_VAULT, c.photos[2]],
      ]
        .map(
          ([x, img, lbl], idx) => `
        <clipPath id="p${idx}"><rect x="${x}" y="652" width="306" height="210" rx="16"/></clipPath>
        <image href="${img}" x="${x}" y="652" width="306" height="210" preserveAspectRatio="xMidYMid slice" clip-path="url(#p${idx})"/>
        <rect x="${x}" y="652" width="306" height="210" rx="16" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
        <rect x="${x + 12}" y="814" width="282" height="36" rx="8" fill="#020617" fill-opacity="0.82"/>
        <text x="${x + 153}" y="838" fill="#e0f2fe" font-size="16" font-weight="600" text-anchor="middle">${lbl}</text>
      `
        )
        .join('')}

      <rect x="136" y="896" width="980" height="216" rx="18" fill="#020617" stroke="#06b6d4" stroke-width="2.5"/>
      <circle cx="184" cy="944" r="16" fill="#ef4444"/>
      <text x="216" y="952" fill="#38bdf8" font-size="21" font-weight="700">${c.voiceTitle}</text>
      <text x="164" y="1002" fill="#f1f5f9" font-size="20">${c.voiceL1}</text>
      <text x="164" y="1038" fill="#f1f5f9" font-size="20">${c.voiceL2}</text>
      <text x="164" y="1084" fill="#64748b" font-size="17">${c.voiceGate}</text>

      <rect x="136" y="1144" width="980" height="74" rx="16" fill="url(#accentCyan)"/>
      <text x="626" y="1191" fill="#022c22" font-size="24" font-weight="800" text-anchor="middle">${c.cta}</text>

      <rect x="1192" y="164" width="1272" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="1236" y="220" fill="#a78bfa" font-size="18" font-weight="700">${c.rKicker}</text>
      <text x="1236" y="268" fill="#ffffff" font-size="31" font-weight="800">${c.rHeading}</text>

      <rect x="1236" y="304" width="1184" height="146" rx="18" fill="#1e293b" stroke="#334155" stroke-width="2"/>
      <text x="1268" y="346" fill="#38bdf8" font-size="19" font-weight="700">${c.aiName}</text>
      <text x="1268" y="384" fill="#f8fafc" font-size="19.5">${c.aiL1}</text>
      <text x="1268" y="418" fill="#cbd5e1" font-size="19.5">${c.aiL2}</text>

      <rect x="1340" y="472" width="1080" height="112" rx="18" fill="#172554" stroke="#3b82f6" stroke-width="2"/>
      <text x="1372" y="514" fill="#93c5fd" font-size="18" font-weight="700">${c.clientName}</text>
      <text x="1372" y="552" fill="#eff6ff" font-size="19.5">${c.clientLine}</text>

      <rect x="1236" y="614" width="1184" height="702" rx="22" fill="#064e3b" fill-opacity="0.32" stroke="#10b981" stroke-width="3"/>
      <rect x="1272" y="646" width="350" height="42" rx="21" fill="#10b981" fill-opacity="0.22" stroke="#34d399" stroke-width="1.5"/>
      <text x="1447" y="674" fill="#a7f3d0" font-size="17" font-weight="700" text-anchor="middle">${c.readyPill}</text>
      <text x="2384" y="674" fill="#6ee7b7" font-size="18" font-weight="600" text-anchor="end">${c.passMeta}</text>

      <text x="1272" y="734" fill="#ffffff" font-size="30" font-weight="800">${c.filmTitle}</text>
      <text x="1272" y="778" fill="#d1fae5" font-size="19.5">${c.filmSub}</text>

      ${c.acts
        .map(
          ([h, d], i) => `
        <rect x="1272" y="${814 + i * 124}" width="1112" height="106" rx="14" fill="#020617" fill-opacity="0.72" stroke="#10b981" stroke-opacity="0.45" stroke-width="1.5"/>
        <text x="1302" y="${856 + i * 124}" fill="#34d399" font-size="21" font-weight="700">${h}</text>
        <text x="1302" y="${894 + i * 124}" fill="#e2e8f0" font-size="19">${d}</text>
      `
        )
        .join('')}

      <text x="1272" y="1226" fill="#a7f3d0" font-size="18.5" font-weight="700">${c.locks}</text>
      <text x="1272" y="1272" fill="#6ee7b7" font-size="18">${c.footer}</text>
    `,
  })
}

function buildBlueprintShareSvg(c, fontFamily) {
  const imgs = [IMG_TWOSHOT, IMG_DECK, IMG_VAULT]
  return shellWindow({
    fontFamily,
    title: c.title,
    urlPill: c.urlPill,
    badgeText: c.badgeText,
    badgeColor: '#6366f1',
    bodySvg: `
      <rect x="96" y="164" width="1440" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="136" y="218" fill="#a78bfa" font-size="18" font-weight="700">${c.kicker}</text>
      <text x="136" y="266" fill="#ffffff" font-size="31" font-weight="800">${c.heading}</text>

      <rect x="1156" y="196" width="340" height="52" rx="14" fill="#1e1b4b" stroke="#818cf8" stroke-width="2"/>
      <text x="1326" y="229" fill="#e0e7ff" font-size="19" font-weight="700" text-anchor="middle">${c.listenBtn}</text>

      ${c.beats
        .map(
          ([beat, title, desc, status], idx) => `
        <rect x="136" y="${304 + idx * 308}" width="1360" height="282" rx="18" fill="#020617" stroke="#334155" stroke-width="2"/>
        <clipPath id="bp${idx}"><rect x="158" y="${326 + idx * 308}" width="400" height="238" rx="14"/></clipPath>
        <image href="${imgs[idx]}" x="158" y="${326 + idx * 308}" width="400" height="238" preserveAspectRatio="xMidYMid slice" clip-path="url(#bp${idx})"/>
        <text x="592" y="${368 + idx * 308}" fill="#38bdf8" font-size="18" font-weight="700">${beat}</text>
        <text x="592" y="${412 + idx * 308}" fill="#ffffff" font-size="26" font-weight="800">${title}</text>
        <text x="592" y="${458 + idx * 308}" fill="#cbd5e1" font-size="19.5">${desc}</text>
        <rect x="592" y="${498 + idx * 308}" width="310" height="44" rx="22" fill="#10b981" fill-opacity="0.18" stroke="#10b981" stroke-width="1.5"/>
        <text x="747" y="${527 + idx * 308}" fill="#a7f3d0" font-size="17" font-weight="700" text-anchor="middle">${status}</text>
      `
        )
        .join('')}

      <rect x="136" y="1240" width="1360" height="80" rx="16" fill="url(#accentCyan)"/>
      <text x="816" y="1290" fill="#022c22" font-size="24" font-weight="800" text-anchor="middle">${c.cta}</text>

      <rect x="1572" y="164" width="892" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="1612" y="218" fill="#34d399" font-size="18" font-weight="700">${c.rKicker}</text>
      <text x="1612" y="266" fill="#ffffff" font-size="30" font-weight="800">${c.rHeading}</text>

      <rect x="1612" y="302" width="812" height="196" rx="18" fill="#052e2b" fill-opacity="0.55" stroke="#10b981" stroke-width="2.5"/>
      <text x="1644" y="350" fill="#a7f3d0" font-size="18.5" font-weight="600">${c.marginLabel}</text>
      <text x="1644" y="424" fill="#ffffff" font-size="52" font-weight="900">${c.profitBig}</text>
      <text x="2060" y="424" fill="#34d399" font-size="30" font-weight="800">${c.marginPct}</text>
      <text x="1644" y="472" fill="#6ee7b7" font-size="17">${c.pkgNote}</text>

      ${c.rows
        .map(
          ([k, v, tag], i) => `
        <rect x="1612" y="${528 + i * 104}" width="812" height="88" rx="14" fill="#020617" stroke="#1e293b" stroke-width="2"/>
        <text x="1638" y="${580 + i * 104}" fill="#e2e8f0" font-size="18" font-weight="600">${k}</text>
        <text x="2248" y="${580 + i * 104}" fill="#38bdf8" font-size="18" font-weight="700" text-anchor="end">${v}</text>
        <text x="2398" y="${580 + i * 104}" fill="#94a3b8" font-size="16" font-weight="600" text-anchor="end">${tag}</text>
      `
        )
        .join('')}

      <rect x="1612" y="1068" width="812" height="252" rx="18" fill="#020617" stroke="#6366f1" stroke-width="2"/>
      <text x="1640" y="1114" fill="#a5b4fc" font-size="18" font-weight="700">${c.chatTitle}</text>
      <text x="1640" y="1162" fill="#f8fafc" font-size="18">${c.chat1}</text>
      <text x="1640" y="1208" fill="#6ee7b7" font-size="18">${c.chat2}</text>
      <text x="1640" y="1268" fill="#94a3b8" font-size="17">${c.chatCap}</text>
    `,
  })
}

function buildSelfieStudioSvg(c, fontFamily) {
  const eraImgs = [IMG_ELARA, IMG_MARCUS, IMG_ARIS]
  return shellWindow({
    fontFamily,
    title: c.title,
    urlPill: c.urlPill,
    badgeText: c.badgeText,
    badgeColor: '#06b6d4',
    bodySvg: `
      <rect x="96" y="164" width="1180" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="136" y="218" fill="#38bdf8" font-size="18" font-weight="700">${c.kicker}</text>
      <text x="136" y="266" fill="#ffffff" font-size="30" font-weight="800">${c.heading}</text>

      ${c.presets
        .map(
          (p, i) => `
        <rect x="${136 + i * 272}" y="296" width="256" height="46" rx="23" fill="${i === 1 ? '#06b6d4' : '#1e293b'}" fill-opacity="${i === 1 ? '0.25' : '0.9'}" stroke="${i === 1 ? '#22d3ee' : '#334155'}" stroke-width="2"/>
        <text x="${264 + i * 272}" y="326" fill="#f8fafc" font-size="18" font-weight="700" text-anchor="middle">${p}</text>
      `
        )
        .join('')}

      <clipPath id="selfieMain"><rect x="136" y="368" width="1100" height="600" rx="20"/></clipPath>
      <image href="${IMG_ELARA}" x="136" y="368" width="1100" height="600" preserveAspectRatio="xMidYMid slice" clip-path="url(#selfieMain)"/>
      <rect x="136" y="368" width="1100" height="600" rx="20" fill="none" stroke="#22d3ee" stroke-width="3"/>
      <line x1="686" y1="368" x2="686" y2="968" stroke="#38bdf8" stroke-width="4"/>
      <circle cx="686" cy="668" r="26" fill="#020617" stroke="#38bdf8" stroke-width="3"/>
      <text x="686" y="676" fill="#38bdf8" font-size="22" font-weight="900" text-anchor="middle">↔</text>

      <rect x="490" y="420" width="390" height="430" rx="24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="12 8"/>
      <rect x="164" y="394" width="260" height="42" rx="10" fill="#020617" fill-opacity="0.82"/>
      <text x="294" y="422" fill="#cbd5e1" font-size="17" font-weight="700" text-anchor="middle">${c.rawLabel}</text>
      <rect x="890" y="394" width="320" height="42" rx="10" fill="#052e2b" fill-opacity="0.9" stroke="#10b981" stroke-width="1.5"/>
      <text x="1050" y="422" fill="#a7f3d0" font-size="17" font-weight="700" text-anchor="middle">${c.proLabel}</text>

      ${c.checks
        .map(
          ([t, s], i) => `
        <rect x="136" y="${996 + i * 108}" width="1100" height="92" rx="14" fill="#020617" stroke="#1e293b" stroke-width="2"/>
        <text x="168" y="${1036 + i * 108}" fill="#34d399" font-size="20" font-weight="700">${t}</text>
        <text x="168" y="${1070 + i * 108}" fill="#94a3b8" font-size="18">${s}</text>
      `
        )
        .join('')}

      <rect x="1312" y="164" width="1152" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="1352" y="218" fill="#a78bfa" font-size="18" font-weight="700">${c.rKicker}</text>
      <text x="1352" y="266" fill="#ffffff" font-size="30" font-weight="800">${c.rHeading}</text>

      ${c.eras
        .map(
          ([tag, name, sub], i) => `
        <rect x="${1352 + i * 364}" y="304" width="344" height="456" rx="18" fill="#020617" stroke="#334155" stroke-width="2"/>
        <clipPath id="era${i}"><rect x="${1368 + i * 364}" y="320" width="312" height="292" rx="12"/></clipPath>
        <image href="${eraImgs[i]}" x="${1368 + i * 364}" y="320" width="312" height="292" preserveAspectRatio="xMidYMid slice" clip-path="url(#era${i})"/>
        <text x="${1368 + i * 364}" y="648" fill="#38bdf8" font-size="15" font-weight="700">${tag}</text>
        <text x="${1368 + i * 364}" y="684" fill="#ffffff" font-size="21" font-weight="800">${name}</text>
        <text x="${1368 + i * 364}" y="718" fill="#94a3b8" font-size="17">${sub}</text>
      `
        )
        .join('')}

      <rect x="1352" y="794" width="1072" height="330" rx="20" fill="#1e1b4b" fill-opacity="0.55" stroke="#818cf8" stroke-width="2.5"/>
      <text x="1392" y="844" fill="#c7d2fe" font-size="19" font-weight="700">${c.vKicker}</text>
      <text x="1392" y="892" fill="#ffffff" font-size="28" font-weight="800">${c.vHeading}</text>
      <text x="1392" y="936" fill="#e0e7ff" font-size="19.5">${c.vSub}</text>
      <rect x="1392" y="968" width="992" height="64" rx="14" fill="#020617" stroke="#4f46e5" stroke-width="2"/>
      <text x="1424" y="1008" fill="#34d399" font-size="19.5" font-weight="700">${c.vMatch}</text>
      <text x="1392" y="1084" fill="#a5b4fc" font-size="18">${c.vNote}</text>

      <rect x="1352" y="1158" width="1072" height="156" rx="18" fill="#020617" stroke="#10b981" stroke-width="2"/>
      <text x="1392" y="1212" fill="#34d399" font-size="22" font-weight="800">${c.bTitle}</text>
      <text x="1392" y="1258" fill="#cbd5e1" font-size="19">${c.bSub}</text>
    `,
  })
}

function buildProducerLaunchpadSvg(c, fontFamily) {
  return shellWindow({
    fontFamily,
    title: c.title,
    urlPill: c.urlPill,
    badgeText: c.badgeText,
    badgeColor: '#10b981',
    bodySvg: `
      <rect x="96" y="160" width="2368" height="110" rx="20" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      ${c.steps
        .map(
          (step, idx) => `
        <rect x="${124 + idx * 582}" y="182" width="560" height="66" rx="14" fill="${idx < 3 ? '#052e2b' : '#1e1b4b'}" stroke="${idx < 3 ? '#10b981' : '#818cf8'}" stroke-width="2"/>
        <text x="${404 + idx * 582}" y="223" fill="#f8fafc" font-size="19" font-weight="700" text-anchor="middle">${step}</text>
      `
        )
        .join('')}

      <rect x="96" y="298" width="1150" height="1058" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="136" y="354" fill="#38bdf8" font-size="18" font-weight="700">${c.lKicker}</text>
      <text x="136" y="402" fill="#ffffff" font-size="30" font-weight="800">${c.lHeading}</text>

      <rect x="136" y="438" width="1070" height="190" rx="18" fill="#020617" stroke="#334155" stroke-width="2"/>
      <circle cx="212" cy="533" r="44" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="3"/>
      <text x="212" y="545" fill="#34d399" font-size="34" font-weight="900" text-anchor="middle">HL</text>
      <text x="284" y="504" fill="#ffffff" font-size="27" font-weight="800">Harbor Legacy &amp; Commercial Studios</text>
      <text x="284" y="544" fill="#94a3b8" font-size="19">${c.brandSub}</text>
      <text x="284" y="584" fill="#34d399" font-size="18.5" font-weight="700">${c.brandHide}</text>

      <text x="136" y="684" fill="#e2e8f0" font-size="24" font-weight="800">${c.privHeading}</text>
      ${c.privs
        .map(
          ([h, d], i) => `
        <rect x="136" y="${714 + i * 136}" width="1070" height="116" rx="16" fill="#020617" stroke="#1e293b" stroke-width="2"/>
        <text x="168" y="${760 + i * 136}" fill="#34d399" font-size="20.5" font-weight="700">${h}</text>
        <text x="168" y="${800 + i * 136}" fill="#cbd5e1" font-size="18">${d}</text>
      `
        )
        .join('')}

      <rect x="1282" y="298" width="1182" height="1058" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="1322" y="354" fill="#a78bfa" font-size="18" font-weight="700">${c.rKicker}</text>
      <text x="1322" y="402" fill="#ffffff" font-size="30" font-weight="800">${c.rHeading}</text>

      ${c.rates
        .map(
          ([v, p, m], i) => `
        <rect x="1322" y="${438 + i * 112}" width="1102" height="94" rx="15" fill="${i === 0 ? '#052e2b' : '#020617'}" fill-opacity="${i === 0 ? '0.6' : '1'}" stroke="${i === 0 ? '#10b981' : '#334155'}" stroke-width="2"/>
        <text x="1354" y="${494 + i * 112}" fill="#ffffff" font-size="20" font-weight="700">${v}</text>
        <text x="1930" y="${494 + i * 112}" fill="#38bdf8" font-size="20" font-weight="800" text-anchor="end">${p}</text>
        <text x="2394" y="${494 + i * 112}" fill="#6ee7b7" font-size="17.5" font-weight="600" text-anchor="end">${m}</text>
      `
        )
        .join('')}

      <rect x="1322" y="914" width="1102" height="402" rx="18" fill="#020617" stroke="#6366f1" stroke-width="2"/>
      <text x="1356" y="964" fill="#a5b4fc" font-size="21" font-weight="800">${c.rbacTitle}</text>
      <text x="1356" y="1020" fill="#f8fafc" font-size="19.5">${c.rbac1}</text>
      <text x="1356" y="1068" fill="#f8fafc" font-size="19.5">${c.rbac2}</text>
      <rect x="1356" y="1116" width="1034" height="72" rx="12" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="1384" y="1160" fill="#38bdf8" font-size="18" font-weight="600">${c.embed.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
      <text x="1356" y="1256" fill="#6ee7b7" font-size="18.5" font-weight="700">${c.ref}</text>
    `,
  })
}

function buildStreamsInventorySvg(c, fontFamily) {
  return shellWindow({
    fontFamily,
    title: c.title,
    urlPill: c.urlPill,
    badgeText: c.badgeText,
    badgeColor: '#8b5cf6',
    bodySvg: `
      <rect x="96" y="160" width="2368" height="96" rx="18" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      ${c.filters
        .map(
          (f, i) => `
        <rect x="${124 + i * 336}" y="182" width="316" height="52" rx="12" fill="${i === 0 ? '#6366f1' : '#020617'}" fill-opacity="${i === 0 ? '0.28' : '0.9'}" stroke="${i === 0 ? '#818cf8' : '#334155'}" stroke-width="2"/>
        <text x="${282 + i * 336}" y="216" fill="#f8fafc" font-size="18" font-weight="700" text-anchor="middle">${f}</text>
      `
        )
        .join('')}
      <text x="2428" y="216" fill="#34d399" font-size="18.5" font-weight="700" text-anchor="end">${c.langFilter}</text>

      <rect x="96" y="280" width="1460" height="1076" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="136" y="334" fill="#38bdf8" font-size="18" font-weight="700">${c.lKicker}</text>

      ${c.rows
        .map(
          ([title, meta, status, color], i) => `
        <rect x="136" y="${366 + i * 156}" width="1380" height="136" rx="16" fill="#020617" stroke="#1e293b" stroke-width="2"/>
        <text x="172" y="${418 + i * 156}" fill="#ffffff" font-size="22" font-weight="800">${title}</text>
        <text x="172" y="${460 + i * 156}" fill="#94a3b8" font-size="18">${meta}</text>
        <rect x="1156" y="${398 + i * 156}" width="324" height="52" rx="26" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2"/>
        <text x="1318" y="${431 + i * 156}" fill="#f8fafc" font-size="18" font-weight="700" text-anchor="middle">${status}</text>
      `
        )
        .join('')}

      <rect x="1592" y="280" width="872" height="1076" rx="22" fill="#0f172a" stroke="#6366f1" stroke-width="2.5"/>
      <text x="1632" y="334" fill="#c4b5fd" font-size="18" font-weight="700">${c.rKicker}</text>
      <text x="1632" y="382" fill="#ffffff" font-size="29" font-weight="800">${c.rHeading}</text>

      <clipPath id="thumbShip"><rect x="1632" y="414" width="792" height="340" rx="16"/></clipPath>
      <image href="${IMG_DECK}" x="1632" y="414" width="792" height="340" preserveAspectRatio="xMidYMid slice" clip-path="url(#thumbShip)"/>
      <rect x="1632" y="414" width="792" height="340" rx="16" fill="none" stroke="#818cf8" stroke-width="2.5"/>
      <rect x="1656" y="692" width="420" height="44" rx="10" fill="#020617" fill-opacity="0.86"/>
      <text x="1866" y="721" fill="#e0e7ff" font-size="17" font-weight="700" text-anchor="middle">${c.thumbCap}</text>

      ${c.socials
        .map(
          ([p, d], i) => `
        <rect x="1632" y="${782 + i * 132}" width="792" height="112" rx="14" fill="#020617" stroke="#334155" stroke-width="2"/>
        <text x="1664" y="${828 + i * 132}" fill="#34d399" font-size="21" font-weight="700">✓ ${p}</text>
        <text x="1664" y="${866 + i * 132}" fill="#cbd5e1" font-size="18">${d}</text>
      `
        )
        .join('')}

      <rect x="1632" y="1202" width="792" height="108" rx="18" fill="url(#accentViolet)"/>
      <text x="2028" y="1266" fill="#ffffff" font-size="23" font-weight="800" text-anchor="middle">${c.cta}</text>
    `,
  })
}

async function main() {
  let count = 0
  for (const [locale, data] of Object.entries(COPY)) {
    const outDir = join(LOCALES_OUT_ROOT, locale)
    mkdirSync(outDir, { recursive: true })
    const fontFamily = FONT_STACK_BY_LOCALE[locale]
    const targets = [
      ['client-intake-portal.webp', buildClientIntakeSvg(locale, data.intake, fontFamily)],
      ['blueprint-share-estimator.webp', buildBlueprintShareSvg(data.blueprint, fontFamily)],
      ['character-selfie-studio.webp', buildSelfieStudioSvg(data.selfie, fontFamily)],
      ['producer-whitelabel-launchpad.webp', buildProducerLaunchpadSvg(data.launchpad, fontFamily)],
      ['streams-inventory-explorer.webp', buildStreamsInventorySvg(data.streams, fontFamily)],
    ]

    for (const [filename, rawSvg] of targets) {
      const svg = esc(rawSvg)
      const outPath = join(outDir, filename)
      await sharp(Buffer.from(svg))
        .webp({ quality: 92, effort: 5 })
        .toFile(outPath)
      count++
    }
    console.log(`✓ [${locale}] Generated 5 localized 2560×1440 SVG screenshots`)
  }
  console.log(`\nDone: generated ${count} localized SVG screenshots in ${LOCALES_OUT_ROOT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
