import type { StudioLandingCopy } from './types'

export const STUDIO_LANDING_COPY_PT = {
  heroDock: {
    tagline:
      'Dirija filmes e séries originais — ou crie um negócio lucrativo de produção de vídeo. Sem faculdade de cinema nem engenharia de prompts.',
    primaryCta: 'Iniciar Studio ($9)',
    businessCta: 'Negócio de Serviços de Vídeo',
    howItWorksCta: 'Como Funciona',
  },
  audienceGateway: {
    eyebrow: 'Um Estúdio · Três Formas de Vencer',
    title: 'Crie Mundos Originais.',
    titleAccent: 'Ou Construa um Negócio Lucrativo de Vídeo.',
    subtitle:
      'O SceneFlow une uma equipe especialista de produção com IA à direção por conversa — impulsionando contadores de histórias independentes, criadores de séries e produtoras de vídeo para clientes.',
    cards: [
      {
        id: 'services',
        badge: 'Oportunidade de Renda · 65–85% de Margem Típica',
        title: 'Negócios de Serviços de Vídeo',
        description:
          'Entregue Memórias de Vida, Tours Imobiliários, Treinamentos Corporativos e Filmes de Marca para clientes pagantes em horas em vez de semanas — com propriedade comercial total.',
        highlights: [
          'Entrevista guiada focada na história e continuidade de elenco em várias idades',
          'Links compartilháveis de Blueprint, Continuidade e Screening Room para aprovação',
          'Modo híbrido com fotos reais + cenas IA em 4K mantém margens elevadas',
        ],
        ctaLabel: 'Explorar Modelos de Negócio e Margens',
        targetAnchor: 'video-services',
      },
      {
        id: 'aspiring',
        badge: 'Sem Escola de Cinema nem Prompts Técnicos',
        title: 'Autores e Contadores de Histórias Iniciantes',
        description:
          'Tem uma biografia, livro ou ideia de canal na cabeça? Descreva sua história com suas próprias palavras por voz ou texto e deixe o SceneFlow gerar sua base profissional pronta para dirigir.',
        highlights: [
          'Base especialista instantânea para Série, Blueprint e Roteiro de Produção',
          'Fale ou digite ajustes em linguagem natural — zero sintaxe de prompt',
          'Assista ao Animatic dublado antes de gastar créditos com movimento',
        ],
        ctaLabel: 'Fazer o Tour Visual de 4 Etapas',
        targetAnchor: 'studio-tour',
      },
      {
        id: 'experienced',
        badge: 'Canais de Séries · Podcasts · Pre-vis para Investidores',
        title: 'Criadores Experientes e Cineastas',
        description:
          'Acabe com tentativas na sorte. Trave rostos recorrentes, figurinos por tomada, vozes personalizadas e cenários no Cofre de Continuidade — e escale sua produção em 10x com agentes autônomos.',
        highlights: [
          'Cofre de Continuidade multiepisódio e escolha de figurino por tomada',
          'Avaliação executiva com Audience Resonance e FlowDirector',
          'Agentes autônomos produzem 27+ cenas e dublagens em 70+ idiomas',
        ],
        ctaLabel: 'Conhecer os 5 Superpoderes do Estúdio',
        targetAnchor: 'five-superpowers',
      },
    ],
  },
  superpowers: {
    eyebrow: 'A Filosofia de Design do SceneFlow',
    title: 'Cinco Superpoderes de Estúdio.',
    titleAccent: 'Zero Manual Técnico.',
    subtitle:
      'Ferramentas tradicionais de vídeo IA obrigam você a juntar aplicativos separados e escrever centenas de prompts frágeis. O SceneFlow oferece base especialista automática, direção por voz ou texto, revisão executiva e agentes autônomos.',
    watchClipLabel: 'Ver Resumo de 30s',
    pillars: [
      {
        id: 'baseline',
        number: '01',
        badge: 'Nunca Encare uma Página em Branco',
        title: 'Geração Automática de Base Especialista',
        description:
          'Comece com um conceito simples ou entrevista guiada. O SceneFlow escreve automaticamente a Bíblia da Série, o Blueprint do Filme e o Roteiro de Produção — com arcos individuais, cenários de época e batidas dramáticas.',
        outcomeTag: 'Série · Blueprint · Roteiro de Produção',
        videoClipKey: 'comparison',
      },
      {
        id: 'dialog',
        number: '02',
        badge: 'Direção por Voz ou Texto',
        title: 'Controle Total de Diretor via Diálogo Inteligente',
        description:
          'Dirija como cineasta, não como engenheiro de prompts. Fale ou digite para remodelar cenas, separar personagens por fases da vida (17, 32, 62 anos), selecionar o figurino exato de cada plano ou refinar enquadramentos.',
        outcomeTag: 'Zero Engenharia de Prompts',
        videoClipKey: 'direction',
      },
      {
        id: 'review',
        number: '03',
        badge: 'Sinal Verde Antes de Gastar',
        title: 'Revisão Especialista com Audience Resonance e FlowDirector',
        description:
          'O Audience Resonance avalia sua Série, Blueprint e Roteiro perante seu público-alvo, enquanto o FlowDirector aponta ajustes de ritmo e aplica melhorias criativas em um clique antes da renderização.',
        outcomeTag: 'Pontuação de Série · Blueprint · Roteiro',
      },
      {
        id: 'agents',
        number: '04',
        badge: 'Escala Automática',
        title: 'Agentes Autônomos de Produção Rápida',
        description:
          'Assim que seu roteiro e Animatic Pre-vis estiverem aprovados, acione Audio Agent, Stills Agent, Clips Agent ou os Production Agents completos para construir dezenas de cenas e corrigir tomadas automaticamente.',
        outcomeTag: 'Substitui 300+ Prompts Manuais',
        videoClipKey: 'agent',
      },
      {
        id: 'collaboration',
        number: '05',
        badge: 'Aprovação de Clientes e Alcance Global',
        title: 'Links Compartilháveis, Screening Room e 70+ Idiomas',
        description:
          'Compartilhe links diretos de navegador para aprovação de Blueprint, Roteiro e revisão quadro a quadro na Screening Room — e entregue versões em mais de 70 idiomas operando em 7 idiomas nativos do estúdio.',
        outcomeTag: 'Links · Screening Room · 70+ Dublagens',
        videoClipKey: 'publish',
      },
    ],
    microVisuals: {
      baseline: {
        intakePrompt: 'Entrevista Inicial: “Conte-me a sua história...”',
        autoBadge: 'Gerado em Segundos',
        steps: [
          { step: '1 · Bíblia da Série', detail: 'Arco de 6 Ep. + Cofre Compartilhado' },
          { step: '2 · Blueprint do Filme', detail: 'Batidas Emocionais + Elenco por Idade' },
          { step: '3 · Roteiro de Produção', detail: 'Diálogos, Figurinos e Câmera' },
        ],
      },
      dialog: {
        quote:
          '“Divida John em 17, 32 e 62 anos — e vista Elara com o Casaco de Seda de Gala na Tomada 2.”',
        chipCast: '✓ 3 Fases de Idade Travadas no Elenco',
        chipWardrobe: '✓ Tomada 2 Figurino: Casaco de Gala',
      },
      review: {
        arLabel: 'Audience Resonance',
        arStatus: 'Pronto para Produção · 3 Etapas',
        gateSeries: 'Série 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: 'Roteiro 94',
        flowDirectorNote: 'FlowDirector: reforço emocional no clímax com 1 clique (+6 pts)',
      },
      agents: {
        rows: [
          { label: 'Audio Agent · Vozes, SFX e Trilha', status: '27 / 27 Prontos' },
          { label: 'Stills Agent · Quadros com Continuidade', status: '100% Travado' },
          { label: 'Clips Agent · Movimento Autocorrigido', status: 'Verificado' },
        ],
      },
      collaboration: {
        approvedBadge: 'Aprovado ✓',
        dubsChip: '+70 Idiomas',
      },
    },
  },
  videoServices: {
    eyebrow: 'Monetize sua Criatividade · Serviços B2B e para Clientes',
    title: 'Transforme o SceneFlow em uma',
    titleAccent: 'Produtora de Vídeo de Alta Margem',
    subtitle:
      'Famílias, imobiliárias, escolas e empresas locais pagam de $200 a $2,500+ por vídeos personalizados — enquanto equipes tradicionais custam milhares. Entregue produções inesquecíveis em horas e fique com 100% da receita.',
    commercialRightsBadge: '100% Propriedade Comercial · Entregue Masters aos Clientes',
    verticalsHeading: '1. Escolha um Serviço de Alta Demanda',
    whoBuysLabel: 'Quem Compra com Recorrência',
    marginAdvantageLabel: 'Vantagem de Margem no SceneFlow',
    calculatorBadge: 'Simulador Interativo de Economia Unitária',
    calculatorTitle: '2. Estime sua Renda Mensal com Serviços',
    volumeLabel: 'Entregas a clientes / mês:',
    projectsPerMonthSuffix: 'projetos/mês',
    typicalFeeLabel: 'Preço típico ao cliente',
    estComputeLabel: 'Custo est. no SceneFlow',
    activeHandsOnLabel: 'Direção ativa',
    monthlyGrossLabel: 'Faturamento Mensal Estimado',
    monthlyNetLabel: 'Lucro Líquido Est. do Criador (antes do plano base)',
    perMonthSuffix: '/ mês',
    marginBadgeSuffix: 'margem bruta',
    disclaimer:
      'Estimativas ilustrativas usando o fluxo híbrido de Animatic Pre-vis + clipes IA 4K seletivos ($0.01/crédito adicional). Você define seus próprios preços e termos com seus clientes.',
    launchBusinessCta: 'Comece seu Serviço de Vídeo ($9)',
    workflowHeading: 'Como um Projeto de Cliente Flui em 4 Etapas Simples',
    stepPrefix: 'Etapa',
    workflowSteps: [
      {
        step: '01',
        title: 'Entrevista Guiada com o Cliente',
        detail:
          'Converse com seu cliente (“Conte-me sua história”) para captar momentos marcantes e personagens individuais.',
      },
      {
        step: '02',
        title: 'Aprovação via Link de Blueprint',
        detail:
          'Refine com Audience Resonance internamente e envie um link limpo de Blueprint para aprovação antes de produzir.',
      },
      {
        step: '03',
        title: 'Produção Híbrida Fotos + IA',
        detail:
          'Combine fotos reais do cliente com continuidade multigeracional, figurinos por cena e Audio Agent / Clips Agent.',
      },
      {
        step: '04',
        title: 'Entrega na Screening Room',
        detail:
          'Compartilhe um link privado da Screening Room para revisão precisa, exporte o master 4K e receba o pagamento.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Vídeo Memórias',
        badge: '$350–$799 / filme · Alto Valor Emocional',
        title: 'Histórias de Vida, Homenagens e Biografias Familiares',
        description:
          'Combine fotografias de família com reconstituições cinematográficas de época em IA e continuidade precisa por idade (17 → 32 → 62 anos) narradas com vozes acolhedoras e naturais.',
        clientBuyer:
          'Famílias, aniversários marcantes, planejadores sucessórios, residenciais sênior e memoriais',
        typicalRetailUsd: 450,
        retailRangeLabel: '$350–$799',
        estComputeUsd: 75,
        activeMinutesLabel: '~45 min',
        keyAdvantage:
          'O modo Documentário Híbrido mescla fotos reais de acervo com clipes IA selecionados para margens acima de 80%.',
      },
      {
        id: 'realestate',
        tabLabel: 'Tours de Imóveis',
        badge: '$199–$399 / imóvel · Volume Recorrente',
        title: 'Tours Narrados de Imóveis de Alto Padrão e Hotéis Boutique',
        description:
          'Transforme fotos de anúncios e destaques do bairro em visitas cinematográficas narradas e musicadas — com versões imediatas em inglês, mandarim, espanhol ou árabe para compradores internacionais.',
        clientBuyer:
          'Corretores residenciais, imobiliárias de luxo, aluguéis de temporada e hotéis boutique',
        typicalRetailUsd: 275,
        retailRangeLabel: '$199–$399',
        estComputeUsd: 22,
        activeMinutesLabel: '~20 min',
        keyAdvantage:
          'Um único corretor anunciando 4 imóveis por mês torna-se um cliente de contrato mensal recorrente.',
      },
      {
        id: 'training',
        tabLabel: 'Treinamento e POPs',
        badge: '$600–$2,500 / curso · 70+ Idiomas',
        title: 'Integração Corporativa, Segurança e Cursos Multilíngues',
        description:
          'Trave um instrutor consistente, uniformes e ambientes de trabalho no Cofre de Continuidade — e entregue episódios claros localizados no idioma nativo de cada colaborador.',
        clientBuyer:
          'Equipes de RH e T&D, indústrias, clínicas de saúde, redes de restaurantes e franquias',
        typicalRetailUsd: 950,
        retailRangeLabel: '$600–$2,500',
        estComputeUsd: 80,
        activeMinutesLabel: '~60 min',
        keyAdvantage:
          'Atualize um procedimento alterado em minutos sem recontratar atores nem regravar.',
      },
      {
        id: 'brand',
        tabLabel: 'Filmes de Marca',
        badge: '$400–$1,200 / pacote · Site + Redes',
        title: 'Filmes de Fundadores, Vídeos para Clínicas e Anúncios Sociais',
        description:
          'Crie histórias de marca de alta conversão para sites acompanhadas de trailers verticais 9:16 automáticos para Instagram, TikTok e YouTube Shorts — aprovados na Screening Room.',
        clientBuyer:
          'Clínicas médicas e odontológicas, escritórios de advocacia, PMEs locais, agências e e-commerces',
        typicalRetailUsd: 600,
        retailRangeLabel: '$400–$1,200',
        estComputeUsd: 40,
        activeMinutesLabel: '~35 min',
        keyAdvantage:
          'Venda cortes promocionais sazonais reaproveitando o Cofre de Continuidade salvo do cliente.',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'Tour Visual do Estúdio · Sem Jargão',
    title: 'Quatro Salas Conectadas.',
    titleAccent: 'Um Fluxo Sem Esforço.',
    subtitle:
      'Veja como uma ideia evolui da conversa inicial até o master aprovado pelo cliente ou público — usando vitrines reais do nosso Sandbox em vez de um manual técnico cansativo.',
    stepPrefix: 'Etapa',
    lensLabel: 'Lente de visualização:',
    lensCreator: 'Série Original (“The Glass Ledger”)',
    lensService: 'Serviço ao Cliente (“Vídeo Memória de Vida”)',
    watchRoomVideoLabel: 'Assistir Tour de 30s',
    inspectFullScreenLabel: 'Ver Tela Completa do Estúdio',
    openLiveScreeningLabel: 'Abrir Screening Room ao Vivo',
    screeningModalTitle: 'The Glass Ledger — Screening Room de Demonstração',
    rooms: [
      {
        id: 'series-desk',
        stepNumber: '01',
        tabLabel: 'Series Room',
        badge: 'Universo Multiepisódio e Bíblia de Continuidade',
        title: 'Construa um Universo Reutilizável uma Vez — Não Apenas um Clipe',
        promise:
          'Descreva um canal de séries, trilha de treinamento ou biografia em capítulos uma única vez. O SceneFlow monta sua Bíblia da Série, Grade de Episódios e Reference Library compartilhada.',
        creatorExampleTitle: 'The Glass Ledger · Thriller Neo-Noir de 6 Episódios',
        creatorExampleNote:
          'Elenco compartilhado (Elara Vance, Marcus Thorne, Dr. Aris Kael), cenário do Arquivo Subterrâneo e Códice de Quartzo travados nos 6 episódios com nota 91/100 em Audience Resonance.',
        serviceExampleTitle: 'Legado Familiar em Capítulos ou Treinamento Empresarial',
        serviceExampleNote:
          'Salve apresentadores aprovados, épocas da família ou sedes da empresa uma vez — e gere do Episódio 2 ao 10 em um clique sem perda de identidade visual.',
        callouts: [
          {
            label: 'Base Instantânea da Série e Nota Audience Resonance',
            detail:
              'Gera automaticamente sinopse, arcos de episódios e pontuação de impacto antes da produção.',
          },
          {
            label: 'Reference Library Compartilhada',
            detail:
              'Personagens, vozes, figurinos, cenários e objetos seguem automaticamente para todos os episódios.',
          },
          {
            label: 'Diretor de Série por Voz ou Texto',
            detail:
              'Fale ou digite ajustes para remodelar arcos da temporada ou episódios individuais sem esforço.',
          },
        ],
        visuals: {
          topBadge: 'Audience Resonance da Série: 91 / 100 · 6 Episódios Sincronizados',
          bottomBadge: 'Reference Library Compartilhada Travada em Todos os Episódios',
          thumbLabels: [
            'Elara Vance · Protagonista',
            'Marcus Thorne · Elenco',
            'Cofre do Arquivo · Cenário',
            'Códice de Quartzo · Objeto',
          ],
        },
      },
      {
        id: 'blueprint-board',
        stepNumber: '02',
        tabLabel: 'Blueprint Room',
        badge: 'Entrevista Guiada, Elenco por Idade e Sinal Verde',
        title: 'Garanta uma História Emocionante e o Elenco Antes de Gastar com Vídeo',
        promise:
          'Comece com uma entrevista natural ou conceito. A Blueprint Room estrutura suas batidas narrativas, destaca indivíduos em cada cena, trava identidades por idade e permite aprovação por link compartilhado.',
        creatorExampleTitle: 'Tratamento Cena a Cena e Estilo Visual Travado',
        creatorExampleNote:
          'Cada batida combina intenção dramática, personagens presentes, iluminação anamórfica e análise narrada de Audience Resonance.',
        serviceExampleTitle: 'Entrevista Inteligente de Memórias e Continuidade por Idades',
        serviceExampleNote:
          'Inicia com “Conte-me sua história”, refina momentos marcantes e cria personagens distintos por fase de vida (17, 32 e 62 anos) mantendo a mesma herança física.',
        callouts: [
          {
            label: 'Entrevista Guiada Focada na História',
            detail:
              'Extrai histórias pessoais ou de marca ricas e destaca pessoas específicas em cada batida.',
          },
          {
            label: 'Continuidade de Personagens em Múltiplas Idades',
            detail:
              'Cria referências separadas por fase da vida para que a juventude dos anos 70 e a maturidade atual nunca se misturem.',
          },
          {
            label: 'Audience Resonance + Link Compartilhável de Blueprint',
            detail:
              'Valide o impacto da narrativa com IA e colete a aprovação do cliente direto pelo navegador.',
          },
        ],
        visuals: {
          topBadge: 'Blueprint AR: 92 / 100 · Elenco Destacado por Cena',
          bottomBadge: 'Continuidade Multigeracional + Link de Aprovação do Cliente',
          thumbLabels: [
            'Arco da Protagonista',
            'Dr. Aris Kael · Cena 2',
            'Deck do Porto · Ato II',
            'Chave Crono · Item-Chave',
          ],
        },
      },
      {
        id: 'production-stage',
        stepNumber: '03',
        tabLabel: 'Production Stage',
        badge: 'Shot Director, Controle de Figurino e Agentes Autônomos',
        title: 'Assista ao Animatic Dublado — Depois Deixe os Agentes Gerarem os Planos',
        promise:
          'Revise seu Roteiro de Produção base, trave referências de continuidade, assista ao Animatic Pre-vis completo com vozes, escolha o figurino exato de cada tomada no Shot Director e acione agentes autônomos.',
        creatorExampleTitle: 'Cena 1: Cofre Subterrâneo · Anamórfico 4K',
        creatorExampleNote:
          'Troque o figurino de Elara por tomada, dirija enquadramentos por voz ou texto, mixe diálogos/SFX/trilha no Production Mixer e dispare os Production Agents.',
        serviceExampleTitle: 'Fotos Reais do Cliente + Reconstituições Cinematográficas',
        serviceExampleNote:
          'Intercale fotografias reais com movimento Ken Burns e reconstituições IA em 4K para memórias sem foto — mantendo um filme de 15 minutos abaixo de ~$75 em processamento.',
        callouts: [
          {
            label: 'Figurino por Tomada e Shot Director por Voz/Texto',
            detail:
              'Escolha o traje exato de cada plano e refine expressões ou câmera conversando naturalmente.',
          },
          {
            label: 'Proteção de Orçamento com Animatic Pre-vis',
            detail:
              'Ouça diálogos, narração, efeitos e trilha sobre os quadros antes de gastar créditos de vídeo.',
          },
          {
            label: 'Audio Agent, Stills Agent e Clips Agent Autônomos',
            detail:
              'Gere cena por cena ou acione os Production Agents para montar tudo automaticamente.',
          },
        ],
        visuals: {
          topBadge: 'Shot Director · Figurino Selecionado · Animatic Pre-vis Pronto',
          bottomBadge: 'Audio Agent, Stills Agent e Clips Agent Orquestram Todas as Cenas',
          thumbLabels: [
            'Plano 1 · Plano Geral Cofre',
            'Plano 3 · Macro Dobradiça',
            'Cena 2 · Entrega da Chave',
            'Cena 3 · Travelling Corredor',
          ],
        },
      },
      {
        id: 'screening-room',
        stepNumber: '04',
        tabLabel: 'Screening Room',
        badge: 'Revisão Precisa por Quadro, 70+ Idiomas e Publicação',
        title: 'Colabore por Link Privado e Entregue Globalmente em Qualquer Idioma',
        promise:
          'Exiba animatics, cortes preliminares e masters finais 4K em um único player. Receba comentários com marcação de tempo, gere mais de 70 versões dubladas e exporte ou publique onde quiser.',
        creatorExampleTitle: 'Master de Estreia, Trailers Verticais e Dublagens Globais',
        creatorExampleNote:
          'Crie cortes verticais 9:16 automaticamente, regenere diálogos localizados em mais de 70 mercados e publique no YouTube ou inscreva-se no SceneFlow Originals.',
        serviceExampleTitle: 'Aprovação Simples do Cliente e Entrega Multilíngue',
        serviceExampleNote:
          'Seus clientes assistem no celular ou computador sem precisar de login, deixam notas precisas e recebem arquivos MP4 prontos no idioma da família ou da equipe.',
        callouts: [
          {
            label: 'Links de Revisão Sem Login',
            detail:
              'Envie links privados `/share/screening-room/` para aprovação rápida de clientes, executivos ou familiares.',
          },
          {
            label: 'Sincronização em Cena para 70+ Idiomas',
            detail:
              'Preserva efeitos sonoros e trilha musical enquanto alinha vozes e diálogos localizados.',
          },
          {
            label: 'Exportação Master 4K e Cortes Promocionais',
            detail:
              'Baixe masters comerciais limpos com 100% de propriedade intelectual ou publique trailers nas redes sociais.',
          },
        ],
        visuals: {
          topBadge: 'Notas Precisas por Quadro · Link para Clientes Sem Login',
          bottomBadge: '7 Idiomas de Interface · 70+ Streams de Dublagem em Cena',
          thumbLabels: [
            'EN · Master Original',
            'ES / PT · Dublagem Sincronizada',
            'ZH / TH / HI · Idiomas',
            '9:16 Corte Vertical Promo',
          ],
        },
      },
    ],
  },
  directoryDrawer: {
    badge: 'Especificação Completa do Estúdio · 30+ Capacidades',
    title: 'Quer Ver Todos os Detalhes Técnicos? Explore o Diretório Completo do Estúdio',
    subtitle:
      'Abra o catálogo interativo sala por sala para inspecionar capturas reais em resolução 5K de Series Room, Blueprint Room, Production Stage, Production Mixer e Screening Room.',
    expandCta: 'Abrir Diretório Completo de 30+ Recursos',
    collapseCta: 'Ocultar Diretório de 30+ Recursos',
  },
  academyStrip: {
    badge: 'Garantia de Curva de Aprendizado Zero · Studio Academy',
    title: 'Nunca Se Sinta Perdido. Pressione ? em Qualquer Tela para um Guia Visual de 60 Segundos.',
    subtitle:
      'Cada sala do estúdio traz um Mapa de Tela Just-In-Time com chamadas numeradas, ações em um clique, proteção de créditos Pre-vis e nosso simulador interativo “Seu Primeiro Filme em 10 Minutos”.',
    pills: [
      'Mapas de Tela Contextuais com ?',
      'Simulador “Primeiro Filme em 10 Min”',
      'Proteção de Créditos Pre-vis Integrada',
    ],
    watchAcademyCta: 'Assistir Tour da Academy (30s)',
    startExplorerCta: 'Começar com Explorer — $9',
  },
} satisfies StudioLandingCopy
