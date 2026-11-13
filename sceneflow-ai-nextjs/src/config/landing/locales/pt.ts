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
    eyebrow: 'Serviços de Produção de Vídeo · Operadores Solo e Agências',
    title: 'Entregue Valor de Produção de $1,500+ com',
    titleAccent: '50%–80% Menos Custo para Produzir',
    subtitle:
      'Equipes tradicionais e 30 horas de edição manual deixam de fora 90% das famílias, corretores e comércios locais pelo preço. O SceneFlow reduz de 50% a 80% seu custo total de entrega — créditos de processamento mais tempo de gestão — para conquistar clientes com preços acessíveis mantendo 65% a 85% de lucro líquido real.',
    commercialRightsBadge: '100% Propriedade Comercial · Entregue Masters aos Clientes',
    costSavingsPillLabel: '50%–80% Menor Custo de Entrega · Conquiste Clientes Desassistidos',
    verticalsHeading: '1. Escolha um Serviço de Alta Demanda',
    whoBuysLabel: 'Quem Compra com Recorrência',
    marginAdvantageLabel: 'Vantagem no Custo de Entrega',
    calculatorBadge: 'Simulador Transparente de Custo e Lucro',
    calculatorTitle: '2. Compare Custo de Entrega e Lucro Mensal',
    priceTierLabel: 'Faixa de preço ao cliente:',
    priceTierNames: ['Acessível', 'Padrão', 'Boutique'],
    volumeLabel: 'Entregas a clientes / mês:',
    projectsPerMonthSuffix: 'projetos/mês',
    traditionalMarketLabel: 'Preço tradicional de mercado',
    typicalFeeLabel: 'Seu preço ao cliente',
    fullyLoadedCostLabel: 'Custo total de entrega',
    costBreakdownSubLabel: 'Créditos + tempo PM',
    estComputeLabel: 'Créditos SceneFlow',
    activeHandsOnLabel: 'Tempo operador / PM',
    monthlyGrossLabel: 'Faturamento Mensal Estimado',
    monthlyNetLabel: 'Lucro Líquido Mensal Est. (após créditos e tempo PM)',
    perMonthSuffix: '/ mês',
    marginBadgeSuffix: 'margem líquida real',
    disclaimer:
      'O custo total de entrega inclui créditos de processamento no SceneFlow ($0.01/crédito adicional) mais o tempo estimado do operador/PM na entrevista, direção e revisão na Screening Room. Você define seus preços.',
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
        badge: '$300–$950 / filme · Mercado: $800–$3,500+',
        title: 'Histórias de Vida, Homenagens e Biografias Familiares',
        description:
          'Combine fotografias de família com reconstituições cinematográficas de época em IA e continuidade precisa por idade (17 → 32 → 62 anos) narradas com vozes acolhedoras e naturais.',
        clientBuyer:
          'Famílias, aniversários marcantes, planejadores sucessórios, residenciais sênior e memoriais',
        traditionalMarketRangeLabel: '$800–$3,500+',
        typicalRetailUsd: 499,
        priceTiersUsd: [300, 499, 950],
        retailRangeLabel: '$300–$950',
        estComputeUsd: 22,
        estOperatorUsd: 78,
        activeMinutesLabel: '~1.5–2 h',
        keyAdvantage:
          'Entregue uma memória de padrão $1,500 por ~$100 de custo total (~$22 em créditos + ~$78 de tempo PM) — cobrar $300–$500 conquista famílias excluídas pelas produtoras tradicionais.',
      },
      {
        id: 'realestate',
        tabLabel: 'Tours de Imóveis',
        badge: '$199–$549 / imóvel · Mercado: $450–$1,500+',
        title: 'Tours Narrados de Imóveis de Alto Padrão e Hotéis Boutique',
        description:
          'Transforme fotos de anúncios e destaques do bairro em visitas cinematográficas narradas e musicadas — com versões imediatas em inglês, mandarim, espanhol ou árabe para compradores internacionais.',
        clientBuyer:
          'Corretores residenciais, imobiliárias de luxo, aluguéis de temporada e hotéis boutique',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [199, 299, 549],
        retailRangeLabel: '$199–$549',
        estComputeUsd: 12,
        estOperatorUsd: 48,
        activeMinutesLabel: '~45–60 min',
        keyAdvantage:
          'Sem deslocamento nem atrasos de clima: transforme fotos do imóvel em tours narrados multilíngues com mais de 60% menos custo que gravações presenciais.',
      },
      {
        id: 'training',
        tabLabel: 'Treinamento e POPs',
        badge: '$599–$1,800 / módulo · Mercado: $1,500–$5,000+',
        title: 'Integração Corporativa, Segurança e Cursos Multilíngues',
        description:
          'Trave um instrutor consistente, uniformes e ambientes de trabalho no Cofre de Continuidade — e entregue episódios claros localizados no idioma nativo de cada colaborador.',
        clientBuyer:
          'Equipes de RH e T&D, indústrias, clínicas de saúde, redes de restaurantes e franquias',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [599, 950, 1800],
        retailRangeLabel: '$599–$1,800',
        estComputeUsd: 35,
        estOperatorUsd: 115,
        activeMinutesLabel: '~2–2.5 h',
        keyAdvantage:
          '70% menos custo de entrega que equipes presenciais — e quando uma norma muda, você atualiza uma cena em minutos sem regravar.',
      },
      {
        id: 'brand',
        tabLabel: 'Filmes de Marca',
        badge: '$399–$1,200 / pacote · Mercado: $3,000–$8,000+',
        title: 'Filmes de Fundadores, Vídeos para Clínicas e Anúncios Sociais',
        description:
          'Crie histórias de marca de alta conversão para sites acompanhadas de trailers verticais 9:16 automáticos para Instagram, TikTok e YouTube Shorts — aprovados na Screening Room.',
        clientBuyer:
          'Clínicas médicas e odontológicas, escritórios de advocacia, PMEs locais, agências e e-commerces',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [399, 650, 1200],
        retailRangeLabel: '$399–$1,200',
        estComputeUsd: 22,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.5–2 h',
        keyAdvantage:
          'Destrava clínicas, restaurantes e escritórios locais que não pagam $5,000 em comerciais — já com cortes verticais 9:16.',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'Tour Visual do Estúdio · Sem Jargão',
    title: 'Quatro Salas Conectadas.',
    titleAccent: 'Um Fluxo Sem Esforço.',
    subtitle:
      'Conheça as 4 portas do Estúdio em 60 segundos — Series Room, Blueprint Room, Production Stage e Screening Room — antes de abrir esses mesmos links ao vivo nos 6 Exemplos de Produção abaixo.',
    stepPrefix: 'Etapa',
    lensLabel: 'Lente de visualização:',
    lensCreator: 'Série Original (“The Glass Ledger”)',
    lensService: 'Serviço ao Cliente (“Vídeo Memória de Vida”)',
    watchRoomVideoLabel: 'Assistir Tour de 30s',
    inspectFullScreenLabel: 'Ver Tela Completa do Estúdio',
    openLiveScreeningLabel: 'Abrir Screening Room ao Vivo',
    screeningModalTitle: 'The Glass Ledger — Screening Room de Demonstração',
    examplesBridgeText:
      'Agora que você conhece as 4 salas do Estúdio, experimente-as ao vivo em 6 gêneros completos:',
    examplesBridgeCta: 'Testar as 4 Salas nos Exemplos de Produção',
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
  useCaseDirectory: {
    viewByUseCaseLabel: 'Explorar por Caso de Uso',
    viewByRoomLabel: 'Explorar por Sala do Estúdio',
    tracks: [
      {
        id: 'memoir-services',
        tabLabel: 'Vídeo Memórias e Legado Familiar',
        badge: 'Serviço de Alta Margem · $300–$950/Filme',
        headline: 'Transforme Entrevistas de Família e Fotos de Acervo em Cinema de Legado',
        description:
          'Capture uma história de vida por entrevista inteligente, trave retratos em várias idades dos anos 70 até hoje, pré-visualize com animatics econômicos e entregue por link privado da Screening Room sem login.',
        featureIcons: [
          'startBlueprint',
          'treatment',
          'continuity',
          'directShot',
          'animatic',
          'screeningCollab',
          'languageStreams',
        ],
      },
      {
        id: 'commercial-training',
        tabLabel: 'Agências e Vídeo de Treinamento',
        badge: 'Contratos B2B · Imóveis · POPs Multilíngues',
        headline: 'Entregue Vídeos Corporativos e Comerciais com 50%–80% Menos Custo',
        description:
          'Preveja créditos Pre-vis antes de renderizar, trave apresentadores da marca e imóveis, acione agentes autônomos em lote e publique treinamentos localizados em mais de 70 idiomas.',
        featureIcons: [
          'budget',
          'castLocations',
          'audioAgent',
          'stillsAgent',
          'productionAgent',
          'multilanguageUi',
          'screeningPlayer',
        ],
      },
      {
        id: 'series-animation',
        tabLabel: 'Séries Episódicas e Animação 3D',
        badge: 'IP Multiepisódio · Arte e Elenco Travados',
        headline: 'Comande uma Bíblia Completa de Showrunner do Episódio 1 ao Final da Temporada',
        description:
          'Construa arcos de temporada multiepisódio, congele direção de arte fotorrealista ou animação 3D estilizada em cada episódio, dirija batidas e quadros-chave e renderize clipes de cinema.',
        featureIcons: [
          'newSeries',
          'seriesReview',
          'seriesDirector',
          'directEpisode',
          'startEpisode',
          'stillsWorkbench',
          'videoAgent',
          'clipsWorkbench',
        ],
      },
      {
        id: 'creator-podcast',
        tabLabel: 'Canais do YouTube e Podcasts Narrativos',
        badge: 'Canais de Alta Retenção · Shows Multi-Host',
        headline: 'Publique Episódios Semanais com Voz de Estúdio, Trilha Original e Mixagem',
        description:
          'Teste ganchos de retenção antes de renderizar, dirija química entre apresentadores e trilha sonora personalizada, refine o ritmo no Production Mixer e exporte pacotes 16:9 + 9:16.',
        featureIcons: [
          'sceneWorkflow',
          'seriesResonance',
          'musicScore',
          'scriptSupervisor',
          'mixer',
          'shipPackage',
        ],
      },
      {
        id: 'filmmaker-pitch',
        tabLabel: 'Pré-Vis de Cineastas e Trailers de Pitch',
        badge: 'Decks de Sinal Verde · Cinema Proof-of-Concept',
        headline: 'Teste seu Roteiro e Entre em Reuniões de Pitch com um Trailer Finalizado',
        description:
          'Coescreva com o FlowDirector, avalie o ritmo estrutural com Audience Resonance no Blueprint e no Roteiro, formate roteiros padrão da indústria e monte trailers cinematográficos.',
        featureIcons: [
          'blueprintDirector',
          'blueprintResonance',
          'goToProduction',
          'productionScript',
          'scriptResonance',
          'promoTrailers',
        ],
      },
    ],
  },
  directoryDrawer: {
    badge: 'Capacidades Completas do Estúdio · Por Caso de Uso ou Sala',
    title: 'Explore Todas as 30+ Capacidades por Caso de Uso ou Espaço',
    subtitle:
      'Filtre recursos pelo que você quer produzir — Vídeo Memórias, Agências B2B, Séries Episódicas, Canais de Criadores ou Pitch de Cineastas — ou inspecione cada sala em resolução 5K.',
    expandCta: 'Explorar Capacidades por Caso de Uso (30+)',
    collapseCta: 'Ocultar Diretório de Capacidades',
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
