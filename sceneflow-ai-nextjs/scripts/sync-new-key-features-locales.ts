#!/usr/bin/env npx tsx
/**
 * Syncs `studioLanding` and the 5 newly added `keyFeatures.rooms` capabilities
 * (`clientIntake`, `blueprintShare`, `selfieStudio`, `producerLaunchpad`, `streamsInventory`)
 * across `messages/*.json` (with full native translations for `es`, `pt`, `hi`, `zh-CN`, `ar`, `th`).
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  WORLD_CLASS_LANDING_COPY,
  resolveLocalizedStudioLandingCopy,
} from '../src/config/landing/worldClassLandingCopy'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MESSAGES_DIR = join(ROOT, 'messages')

type PriorityLocale = 'es' | 'pt' | 'hi' | 'zh-CN' | 'ar' | 'th'

type LocalizedFeatureEntry = {
  icon: string
  title: string
  description: string
  screenshot: string
  learnMore: {
    items: Array<{ title: string; description: string }>
  }
}

const NEW_FEATURES_LOCALIZED: Record<PriorityLocale, Record<string, LocalizedFeatureEntry>> = {
  es: {
    clientIntake: {
      icon: 'clientIntake',
      title: 'Captura de Historia del Cliente sin Registro',
      description:
        'Envía un enlace marca blanca `/intake/` o incrusta `/embed/intake/` directamente en tu web en 7 idiomas. El cliente habla o escribe con dictado en vivo, firma el registro legal de consentimiento de imagen, edades y voz, y sube fotos (sin metadatos GPS EXIF) mientras la IA de Visión analiza cada imagen y sintetiza una Propuesta de Visión Clarificada.',
      screenshot:
        'Captura de Historia del Cliente — portal en 7 idiomas, dictado por voz, consentimiento legal y entrevista visual IA',
      learnMore: {
        items: [
          {
            title: 'Portal en 7 idiomas e incrustación web sin cuenta',
            description:
              'Recopila memorias familiares, briefings inmobiliarios o manuales técnicos mediante enlace de marca o iframe sin exigir registro al cliente.',
          },
          {
            title: 'Entrevista fotográfica con IA de Visión y limpieza EXIF',
            description:
              'La IA multimodal inspecciona las fotos subidas (eliminando coordenadas GPS EXIF al instante) para formular preguntas inteligentes de época y vestuario.',
          },
          {
            title: 'Registro legal de consentimiento de imagen, edades y voz',
            description:
              'Cada envío guarda autorización con sello de tiempo para fotos reales, rejuvenecimiento multiedad y voz, sin entrenar modelos compartidos.',
          },
        ],
      },
    },
    blueprintShare: {
      icon: 'blueprintShare',
      title: 'Enlace de Blueprint Ilustrado y Estimador de Margen',
      description:
        'Comparte un enlace `/blueprint/share/` sin login con beats ilustrados, narración de estudio y chat en vivo con tope de rondas, junto al Estimador de Costos y Margen que proyecta créditos exactos, reserva del 20% para retomas y tu ganancia neta antes de producir.',
      screenshot:
        'Blueprint Ilustrado y Estimador de Margen — storyboards por beat, aprobación del cliente y calculadora de margen neto',
      learnMore: {
        items: [
          {
            title: 'Storyboards ilustrados y tratamiento narrado',
            description:
              'El cliente visualiza y escucha cada beat dramático antes de gastar un solo crédito de video en movimiento.',
          },
          {
            title: 'Estimador de Costos y Margen de Ganancia',
            description:
              'Calcula créditos de Blueprint, Continuidad, Audio, Stills y Clips de 10s más un 20% de reserva frente al precio cobrado al cliente.',
          },
          {
            title: 'Chat cliente-PM y límite automático de revisiones',
            description:
              'Centraliza comentarios con límites de rondas y créditos para proteger márgenes del 65% al 85%.',
          },
        ],
      },
    },
    selfieStudio: {
      icon: 'selfieStudio',
      title: 'Estudio de Selfies de Personaje y Similitud Multiedad',
      description:
        'Convierte cualquier selfie de móvil en un retrato de estudio con encuadre facial IA, arreglo de cabello e iluminación, corrección de ojos rojos y bloqueo óseo 1:1 sin deformar la identidad, junto a rejuvenecimiento por décadas, herencia familiar y Emparejamiento Retrato-a-Voz.',
      screenshot:
        'Estudio de Selfies y Similitud Multiedad — retrato IA con bloqueo 1:1, rejuvenecimiento por décadas y ajuste de voz',
      learnMore: {
        items: [
          {
            title: 'Pulido de retrato IA con bloqueo óseo 1:1',
            description:
              'Encuadra el rostro, suaviza cabellos sueltos y equilibra luz de estudio preservando ojos, nariz y mandíbula exactos.',
          },
          {
            title: 'Similitud a través de décadas y herencia familiar',
            description:
              'Rejuvenece o envejece personas reales (p. ej., 17, 32 y 62 años) y combina rasgos familiares para biografías históricas.',
          },
          {
            title: 'Emparejamiento multimodal Retrato-a-Voz',
            description:
              'Analiza edad y rol dramático del retrato para calibrar timbre y cadencia vocal en más de 70 idiomas.',
          },
        ],
      },
    },
    producerLaunchpad: {
      icon: 'producerLaunchpad',
      title: 'Lanzador Marca Blanca para Productores y RBAC',
      description:
        'Lanza tu agencia de producción de video en 4 pasos guiados: configura portales 100% marca blanca en Pro+, despliega tarifarios listos y hojas de comisión del 20% para socios en 4 verticales, y asigna gestores de proyecto (RBAC) con topes mensuales de créditos.',
      screenshot:
        'Lanzador Marca Blanca y RBAC — asistente de 4 pasos, marca propia Pro+, tarifarios y límites de créditos por PM',
      learnMore: {
        items: [
          {
            title: 'Portales de cliente 100% marca blanca (Pro+)',
            description:
              'Tus clientes ven únicamente el nombre, logo y colores de tu estudio sin exponer precios ni créditos de SceneFlow.',
          },
          {
            title: 'Tarifarios Service-in-a-Box y alianzas del 20%',
            description:
              'Plantillas comerciales listas para Video Memorias, Inmobiliaria, Capacitación Corporativa y Packs de Marca Local.',
          },
          {
            title: 'Permisos RBAC y topes mensuales para PMs',
            description:
              'Delega hasta 20 proyectos activos en gestores de proyecto con límites estrictos de créditos y borrado de archivos en 1 clic.',
          },
        ],
      },
    },
    streamsInventory: {
      icon: 'streamsInventory',
      title: 'Inventario de Streams y Publicación Social en 1 Clic',
      description:
        'Gestiona todos los entregables desde el panel unificado `Stream Explorer` — animatics Pre-Vis multiescena cosidos sin pérdida, escenas, capítulos, promos 9:16 y másters 4K en 70+ idiomas — y publica directo en YouTube, TikTok y Facebook mediante OAuth en 1 clic.',
      screenshot:
        'Inventario de Streams y Publicación en 1 Clic — catálogo Stream Explorer, Pre-Vis cosido y OAuth directo',
      learnMore: {
        items: [
          {
            title: 'Explorador unificado e historial de versiones',
            description:
              'Filtra y compara animatics, escenas, capítulos, cortes verticales 9:16 y másters en más de 70 idiomas.',
          },
          {
            title: 'Entregable Pre-Vis multiescena sin pérdida',
            description:
              'Une todas las escenas aprobadas en una película Pre-Vis completa antes de invertir en renderizado de video.',
          },
          {
            title: 'Publicación OAuth en 1 clic sin consola técnica',
            description:
              'Conecta YouTube, TikTok y Facebook al instante con miniaturas y metadatos localizados automáticos.',
          },
        ],
      },
    },
  },
  pt: {
    clientIntake: {
      icon: 'clientIntake',
      title: 'Captação de História do Cliente sem Login',
      description:
        'Envie um link white-label `/intake/` ou incorpore `/embed/intake/` ao seu site em 7 idiomas. O cliente fala ou digita com ditado ao vivo, assina o termo digital de imagem, idades e voz, e envia fotos (sem GPS EXIF) enquanto a IA de Visão faz perguntas inteligentes e gera uma Proposta de Visão Clarificada.',
      screenshot:
        'Captação de História sem Login — portal em 7 idiomas, ditado por voz, termo de imagem e entrevista visual IA',
      learnMore: {
        items: [
          {
            title: 'Portal em 7 idiomas e embed sem cadastro',
            description:
              'Capte memórias de família, briefings de imóveis ou treinamentos via link com sua marca sem exigir conta do cliente.',
          },
          {
            title: 'Entrevista de fotos com IA de Visão e remoção EXIF',
            description:
              'A IA analisa fotos enviadas (removendo dados GPS EXIF automaticamente) e faz perguntas certeiras sobre época e figurino.',
          },
          {
            title: 'Registro assinado de imagem, múltiplas idades e voz',
            description:
              'Registra autorização com data e hora para fotos reais e síntese vocal, sem nunca treinar modelos compartilhados.',
          },
        ],
      },
    },
    blueprintShare: {
      icon: 'blueprintShare',
      title: 'Link de Blueprint Ilustrado e Estimador de Margem',
      description:
        'Compartilhe um link `/blueprint/share/` sem login com beats ilustrados, narração de estúdio e chat ao vivo dentro do limite de revisões — aliado ao Estimador de Custos e Margem que prevê créditos exatos, reserva de 20% para retakes e seu lucro líquido.',
      screenshot:
        'Blueprint Ilustrado e Estimador de Margem — storyboards visuais, aprovação do cliente e cálculo de margem líquida',
      learnMore: {
        items: [
          {
            title: 'Storyboards ilustrados e argumento narrado',
            description:
              'O cliente vê e ouve cada beat da história antes de você gastar créditos de renderização em vídeo.',
          },
          {
            title: 'Estimador de Custos e Margem Líquida',
            description:
              'Projeta créditos de Blueprint, Continuidade, Áudio, Stills e Clipes de 10s mais 20% de margem de segurança.',
          },
          {
            title: 'Chat cliente-PM e trava de rodadas de revisão',
            description:
              'Centralize aprovações com limites automáticos de revisão que protegem margens de 65% a 85%.',
          },
        ],
      },
    },
    selfieStudio: {
      icon: 'selfieStudio',
      title: 'Estúdio de Selfies de Personagem e Semelhança Multiedade',
      description:
        'Transforme qualquer selfie de celular em retrato de estúdio com enquadramento facial IA, ajuste de cabelo e luz, correção de olhos vermelhos e trava óssea 1:1 sem descaracterizar a pessoa — além de rejuvenescimento entre décadas e Pareamento Retrato-Voz.',
      screenshot:
        'Estúdio de Selfies e Semelhança Multiedade — retrato IA com trava 1:1, múltiplas idades e pareamento de voz',
      learnMore: {
        items: [
          {
            title: 'Retrato de estúdio IA com trava facial 1:1',
            description:
              'Alinha enquadramento, corrige iluminação e remove olhos vermelhos mantendo olhos, nariz e maxilar idênticos.',
          },
          {
            title: 'Rejuvenescimento por décadas e linhagem familiar',
            description:
              'Recrie pessoas reais em diferentes idades (17, 32 e 62 anos) e combine traços familiares para filmes biográficos.',
          },
          {
            title: 'Pareamento multimodal Retrato-Voz',
            description:
              'Calibra timbre e ritmo de fala automaticamente com base na idade e papel do personagem em mais de 70 idiomas.',
          },
        ],
      },
    },
    producerLaunchpad: {
      icon: 'producerLaunchpad',
      title: 'Launchpad White-Label do Produtor e RBAC',
      description:
        'Estruture sua produtora de vídeo em 4 etapas: configure portais 100% white-label no Pro+, ative tabelas de preços prontas e materiais de comissão de 20% para parceiros, e delegue projetos a gerentes (RBAC) com tetos mensais de créditos.',
      screenshot:
        'Launchpad White-Label e RBAC — assistente em 4 etapas, marca própria Pro+, tabelas de preços e limites por PM',
      learnMore: {
        items: [
          {
            title: 'Portais 100% white-label para clientes (Pro+)',
            description:
              'Seus clientes interagem apenas com o nome, logo e cores da sua produtora sem ver preços do SceneFlow.',
          },
          {
            title: 'Tabelas Service-in-a-Box e comissão de 20%',
            description:
              'Modelos comerciais prontos para Vídeo Memórias, Imóveis, Treinamentos Corporativos e Pacotes de Marca Local.',
          },
          {
            title: 'Permissões RBAC e limites mensais para PMs',
            description:
              'Gerencie mais de 20 projetos ativos com cotas mensais por gerente e exclusão de arquivos brutos em 1 clique.',
          },
        ],
      },
    },
    streamsInventory: {
      icon: 'streamsInventory',
      title: 'Inventário de Streams e Publicação Social em 1 Clique',
      description:
        'Controle todos os entregáveis no painel unificado `Stream Explorer` — animatics Pre-Vis multicena costurados sem perda, cenas, capítulos, promos 9:16 e masters 4K em 70+ idiomas — e publique direto no YouTube, TikTok e Facebook via OAuth em 1 clique.',
      screenshot:
        'Inventário de Streams e Publicação em 1 Clique — catálogo Stream Explorer, Pre-Vis costurado e OAuth social',
      learnMore: {
        items: [
          {
            title: 'Stream Explorer unificado e histórico de versões',
            description:
              'Filtre e compare animatics, cenas, capítulos, cortes verticais 9:16 e masters em mais de 70 idiomas.',
          },
          {
            title: 'Entregável Pre-Vis multicena costurado sem perda',
            description:
              'Reúna todas as cenas aprovadas em um único filme Pre-Vis antes de investir na geração de vídeo.',
          },
          {
            title: 'Publicação OAuth em 1 clique sem configuração complexa',
            description:
              'Conecte YouTube, TikTok e Facebook rapidamente com miniaturas de alto clique e títulos localizados.',
          },
        ],
      },
    },
  },
  hi: {
    clientIntake: {
      icon: 'clientIntake',
      title: 'बिना लॉगिन क्लाइंट स्टोरी इनटेक पोर्टल',
      description:
        '7 भाषाओं में ब्रांडेड व्हाइट-लेबल `/intake/` लिंक भेजें या अपनी वेबसाइट पर एम्बेड करें। क्लाइंट लाइव वॉइस डिक्टेशन से कहानी बताते हैं, लाइकनेस व वॉइस सहमति दर्ज करते हैं और फ़ोटो अपलोड करते हैं (EXIF GPS स्वतः हटता है) जबकि विज़न AI स्मार्ट सवाल पूछकर स्पष्ट विज़न प्रस्ताव बनाता है।',
      screenshot:
        'क्लाइंट स्टोरी इनटेक पोर्टल — 7 भाषाएँ, वॉइस डिक्टेशन, सहमति रिकॉर्ड और विज़न AI फ़ोटो इंटरव्यू',
      learnMore: {
        items: [
          {
            title: '7-भाषा ज़ीरो-लॉगिन पोर्टल और वेबसाइट एम्बेड',
            description:
              'बिना किसी अकाउंट झंझट के पारिवारिक मेमॉयर, प्रॉपर्टी या कॉर्पोरेट ब्रीफ़ सीधे ब्रांडेड लिंक से एकत्र करें।',
          },
          {
            title: 'विज़न AI फ़ोटो इंटरव्यू और EXIF GPS सुरक्षा',
            description:
              'अपलोड तस्वीरों से GPS डेटा अपने-आप हटता है और विज़न AI तस्वीर देखकर युग व कॉस्ट्यूम से जुड़े सवाल पूछता है।',
          },
          {
            title: 'टाइमस्टैम्प्ड लाइकनेस और वॉइस सहमति रिकॉर्ड',
            description:
              'असली तस्वीरों और मल्टी-एज रूपों के लिए कानूनी सहमति सुरक्षित रहती है और शेयर्ड AI मॉडल ट्रेनिंग कभी नहीं होती।',
          },
        ],
      },
    },
    blueprintShare: {
      icon: 'blueprintShare',
      title: 'इलस्ट्रेटेड ब्लूप्रिंट शेयर और मार्जिन एस्टीमेटर',
      description:
        'बिना लॉगिन वाला `/blueprint/share/` लिंक साझा करें जिसमें इलस्ट्रेटेड स्टोरीबोर्ड बीट्स, नैरेटेड ट्रीटमेंट और रिवीज़न कैप के साथ लाइव चैट शामिल है—साथ ही कॉस्ट और प्रॉफ़िट एस्टीमेटर कंप्यूट क्रेडिट्स व 65%–85% शुद्ध मार्जिन का सटीक अनुमान दिखाता है।',
      screenshot:
        'इलस्ट्रेटेड ब्लूप्रिंट शेयर और मार्जिन एस्टीमेटर — विज़ुअल स्टोरीबोर्ड, क्लाइंट मंज़ूरी और लाभ कैलकुलेटर',
      learnMore: {
        items: [
          {
            title: 'इलस्ट्रेटेड स्टोरीबोर्ड बीट्स और ऑडियो ट्रीटमेंट',
            description:
              'मोशन वीडियो खर्च करने से पहले ही क्लाइंट हर दृश्य की तस्वीर और नैरेशन सुनकर मंज़ूरी दे सकते हैं।',
          },
          {
            title: 'ब्लूप्रिंट कॉस्ट और प्रॉफ़िट मार्जिन एस्टीमेटर',
            description:
              '20% रीटेक रिज़र्व सहित कुल क्रेडिट लागत और आपके शुद्ध सर्विस मुनाफ़े की तुरंत गणना करें।',
          },
          {
            title: 'लाइव क्लाइंट-पीएम चैट और रिवीज़न राउंड कैप',
            description:
              'तय रिवीज़न सीमा के साथ एक ही थ्रेड में फीडबैक सुलझाएँ ताकि प्रोजेक्ट स्कोप हमेशा नियंत्रण में रहे।',
          },
        ],
      },
    },
    selfieStudio: {
      icon: 'selfieStudio',
      title: 'कैरेक्टर सेल्फ़ी स्टूडियो और मल्टी-एज लाइकनेस',
      description:
        'किसी भी फ़ोन सेल्फ़ी को स्टूडियो-ग्रेड पोर्ट्रेट में बदलें—AI फ़ेस फ़्रेमिंग, हेयर ग्रूमिंग, रेड-आई सुधार और 1:1 चेहरे की बनावट लॉक के साथ—साथ ही दशकों के पार डी-एजिंग और मल्टीमॉडल पोर्ट्रेट-टू-वॉइस मैचिंग।',
      screenshot:
        'कैरेक्टर सेल्फ़ी स्टूडियो — 1:1 आइडेंटिटी लॉक, मल्टी-एज डी-एजिंग और पोर्ट्रेट-टू-वॉइस मैचिंग',
      learnMore: {
        items: [
          {
            title: '1:1 फ़ेस लॉक के साथ ज़ीरो-प्रेप स्टूडियो पोर्ट्रेट',
            description:
              'आँख, नाक और जबड़े की मूल बनावट बदले बिना लाइटिंग, हेयर और फ़्रेमिंग को प्रोफ़ेशनल रूप दें।',
          },
          {
            title: 'दशकों के पार डी-एजिंग और पारिवारिक समानता',
            description:
              'मेमॉयर फ़िल्मों के लिए असली व्यक्तियों के युवा से बुज़ुर्ग रूप (जैसे 17, 32, 62 वर्ष) सटीकता से तैयार करें।',
          },
          {
            title: 'मल्टीमॉडल पोर्ट्रेट-टू-वॉइस मैचिंग',
            description:
              'तस्वीर की उम्र और भूमिका के अनुसार 70+ भाषाओं में सबसे उपयुक्त आवाज़ अपने-आप चुनें।',
          },
        ],
      },
    },
    producerLaunchpad: {
      icon: 'producerLaunchpad',
      title: 'व्हाइट-लेबल प्रोड्यूसर लॉन्चपैड और टीम RBAC',
      description:
        'चार आसान चरणों में अपनी वीडियो प्रोडक्शन एजेंसी शुरू करें: Pro+ पर 100% व्हाइट-लेबल ब्रांडिंग सेट करें, 4 वर्टिकल्स के रेडीमेड रेट कार्ड्स और 20% पार्टनर शीट्स अपनाएँ, और मासिक क्रेडिट कैप के साथ प्रोजेक्ट मैनेजर्स नियुक्त करें।',
      screenshot:
        'व्हाइट-लेबल प्रोड्यूसर लॉन्चपैड और RBAC — 4-स्टेप विज़ार्ड, Pro+ ब्रांडिंग और पीएम क्रेडिट कैप',
      learnMore: {
        items: [
          {
            title: '100% व्हाइट-लेबल क्लाइंट पोर्टल (Pro+)',
            description:
              'इनटेक से स्क्रीनिंग रूम तक क्लाइंट को केवल आपके स्टूडियो का नाम और लोगो दिखता है।',
          },
          {
            title: 'रेडीमेड रेट कार्ड्स और 20% पार्टनर टेम्पलेट',
            description:
              'मेमॉयर, रियल एस्टेट, कॉर्पोरेट ट्रेनिंग और लोकल ब्रांड पैक्स के लिए तैयार प्राइसिंग गाइड।',
          },
          {
            title: 'प्रोजेक्ट मैनेजर RBAC और मासिक क्रेडिट सीमा',
            description:
              'तय क्रेडिट बजट और वन-क्लिक रॉ डेटा डिलीट सुरक्षा के साथ 20+ सक्रिय प्रोजेक्ट्स संभालें।',
          },
        ],
      },
    },
    streamsInventory: {
      icon: 'streamsInventory',
      title: 'स्ट्रीम्स इन्वेंटरी और 1-क्लिक सोशल पब्लिशिंग',
      description:
        'एक यूनिफ़ाइड `Stream Explorer` डैशबोर्ड से सभी डिलीवरेबल्स प्रबंधित करें—लॉसलेस स्टिच्ड प्री-विज़ एनिमैटिक, सीन, चैप्टर्स, 9:16 सोशल प्रोमो और 70+ भाषाओं के 4K मास्टर्स—और वन-क्लिक OAuth से सीधे YouTube, TikTok व Facebook पर पब्लिश करें।',
      screenshot:
        'स्ट्रीम्स इन्वेंटरी और 1-क्लिक सोशल पब्लिशिंग — Stream Explorer कैटलॉग और सीधा OAuth प्रकाशन',
      learnMore: {
        items: [
          {
            title: 'यूनिफ़ाइड Stream Explorer और वर्ज़न इतिहास',
            description:
              'सभी प्री-विज़, सीन, चैप्टर्स, 9:16 कट्स और 70+ भाषाओं के मास्टर्स को एक जगह फ़िल्टर करें।',
          },
          {
            title: 'लॉसलेस मल्टी-सीन स्टिच्ड प्री-विज़ फ़िल्म',
            description:
              'मोशन खर्च से पहले पूरे प्रोजेक्ट का जुड़ा हुआ प्री-विज़ एनिमैटिक क्लाइंट अनुमोदन के लिए भेजें।',
          },
          {
            title: 'बिना तकनीकी सेटअप 1-क्लिक सोशल OAuth',
            description:
              'ऑटो-जनरेटेड थंबनेल और लोकलाइज़्ड टाइटल के साथ सीधे सोशल प्लेटफ़ॉर्म पर वीडियो पब्लिश करें।',
          },
        ],
      },
    },
  },
  'zh-CN': {
    clientIntake: {
      icon: 'clientIntake',
      title: '免登录白标客户故事采集门户',
      description:
        '发送支持 7 种母语的白标 `/intake/` 链接或直接将 `/embed/intake/` 嵌入您的机构官网。客户无需注册即可实时语音口述故事、签署带时间戳的肖像与跨年龄声线授权书，并在上传照片（自动剥离 EXIF 定位信息）时接受多模态视觉 AI 的智能追问，一键确认清晰成片愿景方案。',
      screenshot:
        '免登录客户故事采集门户 — 7 语种界面、实时语音口述、肖像授权存证与视觉 AI 识图追问',
      learnMore: {
        items: [
          {
            title: '7 语种免登录门户与官网 iframe 嵌入',
            description:
              '零账号门槛采集家庭传记、房产导览或企业培训需求，大幅缩短前期沟通周期。',
          },
          {
            title: '视觉 AI 识图访谈与 EXIF 隐私剥离',
            description:
              '上传瞬间自动清除照片 GPS 元数据，多模态 AI 识别人物年代与环境细节并提出精准追问。',
          },
          {
            title: '肖像、跨年龄重现与声线授权存证账本',
            description:
              '内置合规点击签约记录，严格执行客户素材零共享模型训练。',
          },
        ],
      },
    },
    blueprintShare: {
      icon: 'blueprintShare',
      title: '图文蓝图分享链接与净利测算器',
      description:
        '发送免登录 `/blueprint/share/` 审阅链接，向客户呈现图文故事板节拍、配音阐述与受轮次上限保护的实时沟通线程；同时制片人可在后台查看蓝图成本与利润测算器，精准预估积分消耗、20% 重拍缓冲与 65%–85% 净服务毛利。',
      screenshot:
        '图文蓝图分享与净利测算器 — 可视化故事板签字、修改轮次护栏与实时毛利计算',
      learnMore: {
        items: [
          {
            title: '可视化故事板节拍与语音朗读阐述',
            description:
              '在投入昂贵的动态视频算力前，让客户直观确认每一幕画面构想与叙事节奏。',
          },
          {
            title: '蓝图成本与服务净利测算器',
            description:
              '实时汇总蓝图、连续性、音频、静帧与 10 秒视频片段积分及 20% 缓冲，清晰锁定项目利润。',
          },
          {
            title: '客户-制片人实时对话与改稿轮次护栏',
            description:
              '内置审阅沟通线程与强制修改轮次上限，彻底告别无限改稿蔓延。',
          },
        ],
      },
    },
    selfieStudio: {
      icon: 'selfieStudio',
      title: '角色自拍影棚与跨年代参考肖像',
      description:
        '将任意手机随手拍升级为影棚级连续性定妆照：AI 智能人脸构图、免妆发丝整理、柔光肤质优化与红眼矫正，严格执行 1:1 骨骼五官锁定且零网红化走样；同时支持跨数十年人物年轻化/老年化还原、家族特征融合、从剧本一键重置与多模态肖像配音匹配。',
      screenshot:
        '角色自拍影棚与跨年代肖像 — 1:1 骨相锁定定妆照、跨年龄还原与智能声线匹配',
      learnMore: {
        items: [
          {
            title: '免妆 AI 影棚精修与 1:1 骨相锁定',
            description:
              '自动优化构图、光线与发丝细节，绝不篡改眼睛、鼻梁与下颌线等核心身份特征。',
          },
          {
            title: '跨年代年龄还原与多亲代特征融合',
            description:
              '精准生成同一人物在 17 岁、32 岁、62 岁等不同年代的真实样貌，完美契合家族传记电影。',
          },
          {
            title: '多模态肖像配音匹配与一键重置',
            description:
              '依据肖像年龄与角色气质自动匹配 70+ 语种声线，并支持从最新剧本一键同步服装道具。',
          },
        ],
      },
    },
    producerLaunchpad: {
      icon: 'producerLaunchpad',
      title: '白标制片人启动台与团队权限管理',
      description:
        '通过四步向导快速搭建独立视频制作机构：在 Pro+ 方案中配置 100% 白标门户品牌（专属厂牌名、标志与配色，隐藏平台积分价格），启用四大垂直领域报价卡与 20% 渠道返佣模板，并为项目经理配置角色权限（RBAC）与月度积分硬上限。',
      screenshot:
        '白标制片人启动台与 RBAC — 四步机构向导、Pro+ 专属品牌、行业报价卡与月度积分上限',
      learnMore: {
        items: [
          {
            title: '100% 白标客户审阅门户（Pro+）',
            description:
              '从故事采集、蓝图签字到放映厅交付，客户全程仅见您的工作室品牌标识。',
          },
          {
            title: '开箱即用行业报价卡与 20% 合伙人方案',
            description:
              '内置人生传记、房产导览、企业 SOP 培训与本地品牌广告包定价策略。',
          },
          {
            title: '项目经理 RBAC 权限与隐私清除护栏',
            description:
              '按人设定月度积分额度，承诺零共享模型训练并支持交付后一键销毁原始素材。',
          },
        ],
      },
    },
    streamsInventory: {
      icon: 'streamsInventory',
      title: '成片流资产总览与一键社媒直发',
      description:
        '在统一的 `Stream Explorer` 面板中集中管控全部项目交付物——涵盖无损拼接的多场预演全片、单场、章节、9:16 竖屏预告与 70+ 语言 4K 母版及完整版本历史——并通过零云配置的 1-Click OAuth 直发 YouTube、TikTok 与 Facebook。',
      screenshot:
        '成片流资产总览与一键直发 — Stream Explorer 目录、无损预演拼接与社交平台 OAuth',
      learnMore: {
        items: [
          {
            title: '统一 Stream Explorer 与多版本追溯',
            description:
              '按交付类型与 70+ 目标语种秒级筛选所有预演、章节、竖屏切片与 4K 成片母版。',
          },
          {
            title: '多场次无损拼接预演交付片',
            description:
              '将所有获批场次的动态分镜无损缝合为完整预演长片，先签字再渲染动态视频。',
          },
          {
            title: '零技术门槛一键 OAuth 社媒发布',
            description:
              '一键连接主流视频社交账号，自动附带高点击率封面与多语种标题简介。',
          },
        ],
      },
    },
  },
  ar: {
    clientIntake: {
      icon: 'clientIntake',
      title: 'بوابة استقبال قصة العميل دون تسجيل دخول',
      description:
        'أرسل رابط `/intake/` بعلامتك البيضاء أو ضمّن `/embed/intake/` في موقعك بـ 7 لغات. يروي العميل قصته بالإملاء الصوتي المباشر، ويوقّع سجل الموافقة القانونية للصور والمراحل العمرية والصوت، ويرفع صوره (مع إزالة بيانات GPS تلقائياً) بينما يفحصها الذكاء البصري ويقترح رؤية واضحة للفيلم.',
      screenshot:
        'بوابة استقبال قصة العميل — 7 لغات، إملاء صوتي، سجل موافقة قانوني ومقابلة صور ذكية',
      learnMore: {
        items: [
          {
            title: 'بوابة بـ 7 لغات وتضمين مباشر دون حساب',
            description:
              'اجمع قصص العائلات أو العقارات أو إجراءات الشركات عبر رابط يحمل علامتك دون إلزام العميل بإنشاء حساب.',
          },
          {
            title: 'مقابلة صور بالذكاء البصري وإزالة بيانات الموقع',
            description:
              'تُحذف إحداثيات EXIF GPS فور الرفع بينما يحلل الذكاء البصري الصور لطرح أسئلة ذكية حول الحقبة والأزياء.',
          },
          {
            title: 'سجل موافقة موثّق للصور والأعمار والصوت',
            description:
              'يوثّق التصريح القانوني بطابع زمني مع التزام كامل بعدم تدريب أي نماذج ذكاء اصطناعي مشتركة.',
          },
        ],
      },
    },
    blueprintShare: {
      icon: 'blueprintShare',
      title: 'رابط المخطط المصوّر ومقدّر هامش الربح',
      description:
        'شارك رابط `/blueprint/share/` دون تسجيل دخول يعرض لقطات القصة المصوّرة والمعالجة المروية ومحادثة العميل ضمن سقف جولات التعديل، مقترناً بمقدّر التكلفة والربح الذي يحسب الرصيد الدقيق واحتياطي الإعادة بنسبة 20% وصافي ربحك قبل التوليد.',
      screenshot:
        'المخطط المصوّر ومقدّر الربح — لوحات قصصية مرئية، اعتماد العميل وحاسبة هامش الربح الصافي',
      learnMore: {
        items: [
          {
            title: 'لوحات قصصية مصوّرة ومعالجة مسموعة',
            description:
              'يرى العميل ويسمع تفاصيل كل مشهد قبل إنفاق أي رصيد على توليد الفيديو المتحرك.',
          },
          {
            title: 'مقدّر تكلفة المخطط وصافي الربح',
            description:
              'يتوقع رصيد المخطط والاستمرارية والصوت والمقاطع مع احتياطي 20% لحماية هوامش ربح بين 65% و85%.',
          },
          {
            title: 'محادثة مباشرة وسقف لجولات التعديل',
            description:
              'اجمع ملاحظات العميل في نافذة موحدة مع ضبط تلقائي لعدد جولات المراجعة.',
          },
        ],
      },
    },
    selfieStudio: {
      icon: 'selfieStudio',
      title: 'استوديو السيلفي ومحاكاة الملامح عبر العقود',
      description:
        'حوّل أي صورة سيلفي من الهاتف إلى بورتريه استوديو احترافي بتأطير ذكي للوجه وترتيب الشعر وتصحيح الإضاءة والعين الحمراء مع قفل صارم 1:1 لملامح الوجه، إلى جانب تصغير أو تكبير العمر عبر العقود ومطابقة الصوت للبورتريه.',
      screenshot:
        'استوديو السيلفي ومحاكاة الملامح — بورتريه احترافي بقفل هوية 1:1 ومراحل عمرية ومطابقة صوتية',
      learnMore: {
        items: [
          {
            title: 'تحسين بورتريه احترافي بقفل ملامح 1:1',
            description:
              'يضبط التأطير والإضاءة دون تغيير شكل العينين أو الأنف أو الفك الحقيقي للشخصية.',
          },
          {
            title: 'تمثيل المراحل العمرية والسمات العائلية',
            description:
              'أعد تمثيل الأشخاص بدقة في مراحل عمرية متعددة (مثل 17 و32 و62 عاماً) لأفلام السيرة الذاتية.',
          },
          {
            title: 'مطابقة متعددة الوسائط بين البورتريه والصوت',
            description:
              'يحلل العمر والدور الدرامي لاختيار أنسب نبرة وإيقاع صوتي عبر أكثر من 70 لغة.',
          },
        ],
      },
    },
    producerLaunchpad: {
      icon: 'producerLaunchpad',
      title: 'منصة إطلاق المنتج بالعلامة البيضاء وصلاحيات الفريق',
      description:
        'أطلق وكالتك لإنتاج الفيديو في 4 خطوات: خصّص بوابات العلامة البيضاء بالكامل في باقة Pro+، واستخدم بطاقات الأسعار الجاهزة وعروض الشركاء بنسبة 20%، وعيّن مديري مشاريع بصلاحيات محددة (RBAC) وسقوف رصيد شهرية.',
      screenshot:
        'منصة إطلاق المنتج وصلاحيات RBAC — معالج من 4 خطوات، علامة بيضاء، بطاقات أسعار وسقوف رصيد',
      learnMore: {
        items: [
          {
            title: 'بوابات عملاء بعلامة بيضاء كاملة (Pro+)',
            description:
              'يتفاعل عملاؤك مع اسم وشعار وألوان استوديوك فقط دون ظهور أسعار المنصة.',
          },
          {
            title: 'بطاقات أسعار جاهزة وعمولة شركاء 20%',
            description:
              'قوالب تسعير جاهزة لأفلام السيرة والعقارات والتدريب المؤسسي وإعلانات العلامات المحلية.',
          },
          {
            title: 'صلاحيات مديري المشاريع وحذف فوري للأرشيف',
            description:
              'أدر أكثر من 20 مشروعاً بسقوف رصيد شهرية وحذف الملفات الخام بنقرة واحدة بعد التسليم.',
          },
        ],
      },
    },
    streamsInventory: {
      icon: 'streamsInventory',
      title: 'مخزون البث والنشر الاجتماعي بنقرة واحدة',
      description:
        'أدِر جميع مخرجات المشروع من لوحة `Stream Explorer` الموحدة — من عروض Pre-Vis المدمجة والمشاهد والفصول إلى مقاطع 9:16 وملفات الماستر 4K بأكثر من 70 لغة — وانشرها مباشرة على يوتيوب وتيك توك وفيسبوك بنقرة OAuth واحدة.',
      screenshot:
        'مخزون البث والنشر بنقرة واحدة — فهرس Stream Explorer، دمج Pre-Vis والربط المباشر بالمنصات',
      learnMore: {
        items: [
          {
            title: 'مستكشف موحّد وسجل كامل للإصدارات',
            description:
              'صفِّ وقارن جميع عروض المعاينة والفصول والمقاطع العمودية ونسخ الـ 70 لغة في مكان واحد.',
          },
          {
            title: 'عرض Pre-Vis مدمج متعدد المشاهد دون فقدان جودة',
            description:
              'اجمع مشاهد الأنيماتيك المعتمدة في فيلم معاينة كامل لاعتماد العميل قبل توليد الفيديو.',
          },
          {
            title: 'نشر اجتماعي بنقرة واحدة دون إعدادات معقدة',
            description:
              'اربط حسابات يوتيوب وتيك توك وفيسبوك فوراً مع صور مصغّرة وعناوين مترجمة تلقائياً.',
          },
        ],
      },
    },
  },
  th: {
    clientIntake: {
      icon: 'clientIntake',
      title: 'พอร์ทัลเก็บเรื่องราวลูกค้าแบบไม่ต้องล็อกอิน',
      description:
        'ส่งลิงก์ไวท์เลเบล `/intake/` หรือฝัง `/embed/intake/` บนเว็บไซต์ของคุณได้ใน 7 ภาษา ลูกค้าพูดเล่าเรื่องด้วยระบบถอดเสียงสด ลงนามยินยอมการใช้ใบหน้าและเสียง และอัปโหลดรูปถ่าย (ลบพิกัด EXIF GPS อัตโนมัติ) โดยมี Vision AI ช่วยถามต่อยอดและสรุปข้อเสนอวิสัยทัศน์ภาพยนตร์',
      screenshot:
        'พอร์ทัลเก็บเรื่องราวลูกค้า — รองรับ 7 ภาษา ถอดเสียงพูดสด ทะเบียนความยินยอม และสัมภาษณ์จากภาพด้วย AI',
      learnMore: {
        items: [
          {
            title: 'พอร์ทัล 7 ภาษาและโค้ดฝังเว็บโดยไม่ต้องสมัครสมาชิก',
            description:
              'เก็บข้อมูลชีวประวัติครอบครัว อสังหาริมทรัพย์ หรือบทเรียนองค์กรผ่านลิงก์แบรนด์ของคุณได้ทันที',
          },
          {
            title: 'สัมภาษณ์จากภาพถ่ายด้วย Vision AI พร้อมลบพิกัด GPS',
            description:
              'ลบข้อมูล EXIF GPS ทันทีที่อัปโหลด พร้อมให้ AI วิเคราะห์ภาพเพื่อถามรายละเอียดเรื่องยุคสมัยและเครื่องแต่งกาย',
          },
          {
            title: 'ทะเบียนความยินยอมการใช้ใบหน้าหลายช่วงวัยและเสียง',
            description:
              'บันทึกหลักฐานการอนุญาตพร้อมเวลาประทับ และรับประกันไม่นำไฟล์ลูกค้าไปเทรนโมเดล AI ส่วนกลาง',
          },
        ],
      },
    },
    blueprintShare: {
      icon: 'blueprintShare',
      title: 'ลิงก์แชร์ Blueprint พร้อมภาพประกอบและตัวคำนวณกำไร',
      description:
        'แชร์ลิงก์ `/blueprint/share/` แบบไม่ต้องล็อกอิน แสดงบีตสตอรี่บอร์ดพร้อมภาพประกอบ เสียงบรรยาย และแชทสดภายใต้โควตารอบแก้ไข ควบคู่กับเครื่องคำนวณต้นทุนและกำไรที่ประเมินเครดิตจริง งบสำรอง 20% และกำไรสุทธิ 65%–85% ก่อนเริ่มเรนเดอร์',
      screenshot:
        'ลิงก์แชร์ Blueprint และตัวคำนวณกำไร — สตอรี่บอร์ดรายบีต การอนุมัติลูกค้า และเครื่องคำนวณอัตรากำไรสุทธิ',
      learnMore: {
        items: [
          {
            title: 'สตอรี่บอร์ดมีภาพประกอบพร้อมเสียงอ่านโครงเรื่อง',
            description:
              'ลูกค้าเห็นภาพและฟังจังหวะของเรื่องราวอย่างชัดเจนก่อนที่คุณจะใช้เครดิตเรนเดอร์วิดีโอเคลื่อนไหว',
          },
          {
            title: 'เครื่องคำนวณต้นทุนเครดิตและกำไรบริการสุทธิ',
            description:
              'คาดการณ์เครดิต Blueprint, ความต่อเนื่อง, เสียง, ภาพนิ่ง และคลิป 10 วินาที พร้อมงบสำรองถ่ายซ้ำ 20%',
          },
          {
            title: 'แชทสดลูกค้า-PM พร้อมระบบล็อกจำนวนรอบแก้ไข',
            description:
              'รวมคอมเมนต์ไว้ในที่เดียวและจำกัดรอบแก้งานอัตโนมัติ ป้องกันขอบเขตงานบานปลาย',
          },
        ],
      },
    },
    selfieStudio: {
      icon: 'selfieStudio',
      title: 'Character Selfie Studio และการจำลองใบหน้าหลายช่วงวัย',
      description:
        'เปลี่ยนภาพเซลฟี่จากมือถือให้เป็นภาพพอร์ตเทรตระดับสตูดิโอ จัดกรอบใบหน้า เก็บทรงผม แก้ตาแดง และล็อกโครงหน้าจริงแบบ 1 ต่อ 1 โดยไม่เพี้ยน มาพร้อมระบบย้อนวัยข้ามทศวรรษ การผสานเค้าโครงครอบครัว และการจับคู่ภาพถ่ายเข้ากับโทนเสียงพูดอัตโนมัติ',
      screenshot:
        'Character Selfie Studio — ภาพพอร์ตเทรต AI ล็อกโครงหน้า 1:1 ย้อนวัยหลายทศวรรษ และจับคู่เสียงพากย์',
      learnMore: {
        items: [
          {
            title: 'เกลาภาพพอร์ตเทรตไฟสตูดิโอพร้อมล็อกโครงหน้า 1:1',
            description:
              'ปรับแสงและทรงผมให้เรียบร้อยโดยรักษาดวงตา จมูก และแนวกรามเดิมไว้อย่างแม่นยำ',
          },
          {
            title: 'ย้อนวัยข้ามทศวรรษและผสานสายเลือดครอบครัว',
            description:
              'สร้างภาพบุคคลจริงในวัยหนุ่มสาวจนถึงปัจจุบัน (เช่น วัย 17, 32 และ 62 ปี) สำหรับภาพยนตร์ชีวประวัติ',
          },
          {
            title: 'จับคู่ภาพถ่ายกับเสียงพากย์อัตโนมัติกว่า 70 ภาษา',
            description:
              'วิเคราะห์อายุและบุคลิกจากภาพเพื่อเทียบโทนเสียงและจังหวะการพูดที่สมจริงที่สุด',
          },
        ],
      },
    },
    producerLaunchpad: {
      icon: 'producerLaunchpad',
      title: 'ระบบตั้งค่าโปรดิวเซอร์ไวท์เลเบลและสิทธิ์ทีม (RBAC)',
      description:
        'เปิดตัวเอเจนซี่รับผลิตวิดีโอใน 4 ขั้นตอน: ตั้งค่าพอร์ทัลไวท์เลเบล 100% บนแพ็กเกจ Pro+ ใช้งานเรตการ์ดสำเร็จรูปและใบเสนอค่าแนะนำพาร์ทเนอร์ 20% ใน 4 ตลาดหลัก และกำหนดสิทธิ์ Project Manager พร้อมเพดานเครดิตรายเดือน',
      screenshot:
        'โปรดิวเซอร์ไวท์เลเบลและ RBAC — วิซาร์ด 4 ขั้นตอน แบรนด์ Pro+ เรตการ์ดบริการ และโควตาเครดิต PM',
      learnMore: {
        items: [
          {
            title: 'พอร์ทัลลูกค้าไวท์เลเบล 100% (Pro+)',
            description:
              'ลูกค้าเห็นเฉพาะชื่อ โลโก้ และสีสตูดิโอของคุณตลอดทุกขั้นตอนโดยไม่เห็นราคาเครดิตเบื้องหลัง',
          },
          {
            title: 'เรตการ์ดสำเร็จรูปและแผนค่าแนะนำพาร์ทเนอร์ 20%',
            description:
              'ชุดราคาพร้อมขายสำหรับวิดีโอชีวประวัติ ทัวร์อสังหาฯ สื่ออบรมองค์กร และแพ็กโฆษณาแบรนด์',
          },
          {
            title: 'สิทธิ์ RBAC สำหรับ PM และปุ่มลบไฟล์ต้นฉบับคลิกเดียว',
            description:
              'คุมงบเครดิตรายเดือนต่อผู้ดูแลโปรเจกต์ และลบภาพต้นฉบับของลูกค้าได้ทันทีหลังส่งมอบงาน',
          },
        ],
      },
    },
    streamsInventory: {
      icon: 'streamsInventory',
      title: 'คลังสตรีมรวมศูนย์และโพสต์โซเชียลในคลิกเดียว',
      description:
        'จัดการไฟล์ส่งมอบทุกชิ้นในโปรเจกต์จากแดชบอร์ด `Stream Explorer` เดียว ตั้งแต่ Pre-Vis ร้อยต่อหลายฉาก ฉากย่อย บท โปรโมแนวตั้ง 9:16 ไปจนถึงมาสเตอร์ 4K กว่า 70 ภาษา พร้อมโพสต์ตรงขึ้น YouTube, TikTok และ Facebook ด้วย OAuth คลิกเดียว',
      screenshot:
        'คลังสตรีมและโพสต์โซเชียลคลิกเดียว — ตาราง Stream Explorer, Pre-Vis ร้อยต่อหลายฉาก และ OAuth โซเชียล',
      learnMore: {
        items: [
          {
            title: 'แดชบอร์ด Stream Explorer และประวัติเวอร์ชันครบถ้วน',
            description:
              'กรองและเปรียบเทียบ Pre-Vis บทย่อย คลิปแนวตั้ง 9:16 และมาสเตอร์กว่า 70 ภาษาได้ในหน้าเดียว',
          },
          {
            title: 'ไฟล์ Pre-Vis ร้อยต่อหลายฉากแบบไม่เสียคุณภาพ',
            description:
              'รวมอนิเมติกทุกฉากเข้าเป็นวิดีโอพรีวิซเรื่องยาวให้ลูกค้าอนุมัติก่อนเริ่มเรนเดอร์จริง',
          },
          {
            title: 'โพสต์โซเชียลด้วย OAuth คลิกเดียวไม่ต้องตั้งค่าคลาวด์',
            description:
              'เชื่อมบัญชี YouTube, TikTok และ Facebook พร้อมสร้างปกคลิปและคำบรรยายหลายภาษาอัตโนมัติ',
          },
        ],
      },
    },
  },
}

function upsertFeatureInList(
  list: Array<Record<string, any>>,
  entry: LocalizedFeatureEntry,
  insertBeforeIcon?: string,
  insertAfterIcon?: string
) {
  const existingIdx = list.findIndex((f) => f.icon === entry.icon)
  if (existingIdx >= 0) {
    list[existingIdx] = entry
    return
  }
  if (insertBeforeIcon) {
    const idx = list.findIndex((f) => f.icon === insertBeforeIcon)
    if (idx >= 0) {
      list.splice(idx, 0, entry)
      return
    }
  }
  if (insertAfterIcon) {
    const idx = list.findIndex((f) => f.icon === insertAfterIcon)
    if (idx >= 0) {
      list.splice(idx + 1, 0, entry)
      return
    }
  }
  list.push(entry)
}

function main() {
  const enCatalog = JSON.parse(readFileSync(join(MESSAGES_DIR, 'en.json'), 'utf8')) as Record<
    string,
    any
  >
  const enFeatureMap: Record<string, LocalizedFeatureEntry> = {}
  for (const room of enCatalog.keyFeatures.rooms) {
    for (const f of room.features ?? []) enFeatureMap[f.icon] = f
    for (const g of room.groups ?? []) {
      for (const f of g.features ?? []) enFeatureMap[f.icon] = f
    }
  }

  const files = readdirSync(MESSAGES_DIR).filter(
    (f) => f.endsWith('.json') && f !== 'en.json' && !f.startsWith('_')
  )

  for (const file of files) {
    const code = file.replace(/\.json$/, '')
    const fullPath = join(MESSAGES_DIR, file)
    const catalog = JSON.parse(readFileSync(fullPath, 'utf8')) as Record<string, any>

    // 1. Sync studioLanding
    if (
      code === 'es' ||
      code === 'pt' ||
      code === 'hi' ||
      code === 'zh-CN' ||
      code === 'ar' ||
      code === 'th'
    ) {
      catalog.studioLanding = resolveLocalizedStudioLandingCopy(code)
    } else {
      catalog.studioLanding = WORLD_CLASS_LANDING_COPY
    }

    // 2. Sync the 5 new features into keyFeatures.rooms
    const featSource =
      NEW_FEATURES_LOCALIZED[code as PriorityLocale] ?? {
        clientIntake: enFeatureMap.clientIntake!,
        blueprintShare: enFeatureMap.blueprintShare!,
        selfieStudio: enFeatureMap.selfieStudio!,
        producerLaunchpad: enFeatureMap.producerLaunchpad!,
        streamsInventory: enFeatureMap.streamsInventory!,
      }

    const rooms: Array<Record<string, any>> = catalog.keyFeatures?.rooms ?? []
    const blueprintRoom = rooms.find((r) => r.id === 'blueprint-board')
    if (blueprintRoom?.features) {
      upsertFeatureInList(blueprintRoom.features, featSource.clientIntake!, 'startBlueprint')
      upsertFeatureInList(blueprintRoom.features, featSource.blueprintShare!, 'goToProduction')
    }

    const prodRoom = rooms.find((r) => r.id === 'production-stage')
    if (prodRoom?.groups) {
      const directGroup = prodRoom.groups.find((g: any) => g.id === 'direct-control')
      if (directGroup?.features) {
        upsertFeatureInList(directGroup.features, featSource.selfieStudio!, 'continuity')
        upsertFeatureInList(
          directGroup.features,
          featSource.producerLaunchpad!,
          'productionScript',
          'budget'
        )
      }
      const pubGroup = prodRoom.groups.find((g: any) => g.id === 'publish-distribute')
      if (pubGroup?.features) {
        upsertFeatureInList(pubGroup.features, featSource.streamsInventory!, 'shipPackage')
      }
    }

    writeFileSync(fullPath, `${JSON.stringify(catalog, null, 2)}\n`)
  }

  console.log(`✓ Synced studioLanding + 5 new KeyFeatures capabilities across ${files.length} locale catalogs`)
}

main()
