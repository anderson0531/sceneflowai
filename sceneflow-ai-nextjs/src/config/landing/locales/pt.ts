import type { StudioLandingCopy } from './types'
import { MOBILE_COMPANION_COPY_PT } from '../mobileCompanionCopy'

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
          'Portais white-label sem login para Entrevista, Blueprint, Continuidade e Exibição',
          'Corte Cinema 4K Pre-vis narrado e tetos de rodadas evitam refações caras',
          'Fotos reais do cliente + cenas IA de cinema protegem margens de 65–85%',
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
          'Assista ao Prévia de Cinema dublada antes de gastar créditos com movimento',
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
        badge: 'QA Especialista Pré e Pós-Render',
        title: 'Audience Resonance e Revisão de Vídeo com FlowDirector',
        description:
          'O Audience Resonance avalia Série, Blueprint e Roteiro antes da renderização — e o FlowDirector revisa o vídeo renderizado sob a perspectiva do Público e do Diretor, aplicando correções em 1 clique via Shot Director para recriar clipes em mais de 20 projetos simultâneos.',
        outcomeTag: 'QA Público + Diretor · Recria Clipes em 1 Clique',
      },
      {
        id: 'agents',
        number: '04',
        badge: 'Escala Automática',
        title: 'Agentes Autônomos de Produção Rápida',
        description:
          'Assim que seu roteiro e Corte Cinema 4K Pre-vis estiverem aprovados, acione Audio Agent, Stills Agent, Clips Agent ou os Production Agents completos para construir dezenas de cenas e corrigir tomadas automaticamente.',
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
        arLabel: 'Audience Resonance + FlowDirector',
        arStatus: 'Portas Pré-Render + QA de Vídeo',
        gateSeries: 'Série 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: 'Cena AR 86→89',
        flowDirectorNote:
          'FlowDirector QA de Vídeo: Público AR 86 + Diretor 81 → correção em 1 clique recria o clipe (+3 AR)',
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
      'Equipes tradicionais e 30 horas de edição manual deixam de fora 90% das famílias, corretores e empresas locais. Comece com Vídeo Memórias via parceiros locais — e some contratos mensais recorrentes B2B reduzindo seu custo total (créditos + tempo PM) em 50% a 80%.',
    commercialRightsBadge: '100% Propriedade Comercial · Portais White-Label (Pro+)',
    costSavingsPillLabel: 'Vídeo Memórias Carro-Chefe + Retainers B2B Recorrentes',
    verticalsHeading: '1. Lidere com Nosso Serviço Carro-Chefe — e Expanda com Retainers Mensais',
    globalDemandLabel: 'Oportunidade de Mercado Global',
    whoBuysLabel: 'Quem Compra com Recorrência',
    partnerChannelsLabel: 'Parceiros de Indicação sem Gasto em Anúncios',
    marginAdvantageLabel: 'Vantagem de Margem e Escopo no SceneFlow',
    calculatorBadge: 'Simulador de Custo e Lucro por Escopo',
    calculatorTitle: '2. Teste Custo de Entrega e Lucro Mensal do Serviço',
    priceTierLabel: 'Pacote do cliente:',
    priceTierNames: ["Cinema Express 4K", "Cinema Movimento Total", "Signature 4K"],
    tierScopePrefix: 'Escopo do pacote:',
    volumeLabel: 'Entregas a clientes / mês:',
    projectsPerMonthSuffix: 'projetos/mês',
    projectsUnitLabel: 'projetos',
    stressTestToggleLabel: 'Teste conservador: 1º Mês de Ramp-Up + Plano Pro ($149/mês)',
    stressTestOnBadge: 'ATIVO',
    stressTestOffBadge: 'INATIVO',
    stressTestActiveNote:
      'Modo conservador ativo: +60% de tempo PM inicial, +30% de reserva extra para refações e assinatura Operator Pro de $149/mês (inclui 10.000 créditos base/mês + 150 GB Vault).',
    proPlanLineLabel: 'Plano Pro ($149/mês) + processamento extra',
    proPlanCreditsIncludedNote: ' (10k cr incl.)',
    perProjectProfitLabel: 'Lucro do serviço / projeto',
    traditionalMarketLabel: 'Preço tradicional de mercado',
    typicalFeeLabel: 'Seu preço ao cliente',
    fullyLoadedCostLabel: 'Custo de entrega / projeto',
    costBreakdownSubLabel: 'Créditos + tempo PM',
    estComputeLabel: 'Processamento (incl. 20% reserva)',
    activeHandsOnLabel: 'Tempo operador / PM (@$50/h)',
    monthlyGrossLabel: 'Faturamento Mensal Estimado',
    monthlyNetLabel: 'Lucro Mensal Est. do Serviço (após créditos e tempo PM)',
    perMonthSuffix: '/ mês',
    marginBadgeSuffix: 'margem de serviço',
    disclaimer:
      'O custo por escopo inclui créditos SceneFlow ($0.01/crédito com 20% de reserva) mais tempo PM avaliado a $50/h. Ative o Teste Conservador para incluir curva de aprendizado e Plano Pro ($149/mês); exclui vendas locais.',
    launchBusinessCta: 'Crie Seu Primeiro Filme de Amostra ($9)',
    launchBusinessSubnote:
      'Use o plano Explorer de $9 para criar uma amostra sem marca d’água para parceiros locais — e faça upgrade para o Pro ($149/mês) para Portais 100% White-Label.',
    foundingCharterCta:
      'Lançando um estúdio para clientes agora? Veja a Carta de 25 Vagas para Operadores Fundadores',
    foundingCharterTitle: 'Carta Pro de 90 Dias para Operadores Fundadores de Vídeo',
    trustShieldHeading: 'Escudo Empresarial de Margem, Privacidade e IP Comercial',
    trustShieldPillars: [
      {
        title: 'Portais White-Label sem Login (Pro+)',
        detail:
          'Clientes revisam sob seu nome, logotipo e cores sem criar conta no SceneFlow nem ver preços de créditos.',
      },
      {
        title: "Cinema Express 4K e Firewall de Movimento",
        detail:
          "Entregue quadros 4K fotorrealistas com movimento de câmera, vozes clonadas, SFX e trilha como master pronto no mesmo dia ($149–$249)—ou use esse mesmo corte narrado como aprovação sem desperdício antes do vídeo em movimento total.",
      },
      {
        title: 'Zero Treinamento em Fotos ou Histórias do Cliente',
        detail:
          'Arquivos familiares e corporativos nunca treinam modelos compartilhados, removem GPS EXIF no upload e registram consentimento.',
      },
    ],
    playbooksBadge: 'Kits Operacionais “Serviço na Caixa” Inclusos',
    playbooksHeading: 'Playbooks Prontos, Tabelas de Preços e Roteiros de Parceria',
    playbooksSubtitle:
      'Acelere sua operação com SOPs comerciais testados e integrados diretamente no SceneFlow Studio:',
    playbooksItems: [
      'Entrevistas IA de Biógrafo e B2B em 7 Idiomas',
      'Tabelas de 3 Pacotes e Calculadora de Piso de Margem',
      'Roteiro de Comissão de 20% para Residenciais Sênior, Memoriais e Imobiliárias',
      'Registro Integrado de Consentimento de Mídia, Idades e Voz',
    ],
    blueprintFlywheel: {
      badge: 'Descoberta Automática com 0 Min de PM · 83% Margem Líquida',
      title: 'Gere Receita Automática Antes de um PM Tocar no Projeto',
      subtitle:
        'Clientes têm dificuldade para estruturar um filme do zero, mas revisam com facilidade um rascunho ilustrado e narrado. O SceneFlow transforma a entrada em um Blueprint Pass autofinanciado e colaborativo que lucra mesmo em leads parados.',
      cards: [
        {
          tag: 'Passe $29 + Pacotes $19 · 0 Min PM',
          title: 'Blueprint Pass Autofinanciado e Iterações Extras',
          detail:
            'Clientes pagam $29 antecipados e recebem storyboards ilustrados, narração multilíngue e Audience Resonance em ~3 min (~83% de margem mesmo em pausa)—mais pacotes autoatendidos de $19 (+3 revisões / +2 AR).',
        },
        {
          tag: 'Rascunho 1 Rápido e Autêntico',
          title: 'Chips de Memória, Checagem Rápida e Zero Ficção',
          detail:
            'Chips de marcos por vertical (casamentos, promoções, esportes, provas, ambientes) e uma checagem de 15 s por voz ou texto captam pessoas e fatos essenciais sem inventar biografia.',
        },
        {
          tag: 'Link Duplo e Triagem do Cliente',
          title: 'Link Apenas para Comentários e Controle Total do Cliente',
          detail:
            'Seu cliente recebe um Portal Diretor privado e compartilha um link apenas para comentários com família ou equipe. Convidados ouvem em 7 idiomas e comentam sem gastar rodadas nem aprovar; o cliente filtra notas + dicas AR em 1 atualização que renova áudio e storyboards.',
        },
        {
          tag: 'Alocação Diferida de PM',
          title: 'PM Alocado Só na Aprovação + Funil de Conversão Blueprint',
          detail:
            'Zero horas de PM até o cliente clicar em Aprovar Blueprint. Monitore Blueprints parados (>48h / >7d) ou com rodadas esgotadas no Funil Blueprint com lembretes em 1 clique, bônus de +3 iterações e receita automática.',
        },
      ],
    },
    agencyScaleOps: {
      badge: 'Escala Multi-PM · Centenas de Projetos de Clientes',
      title: 'Central de Operações de Agência Integrada ao Estúdio',
      subtitle:
        'Escale de operador solo para agência global multi-PM sem planilhas, horas de venda não pagas, perda de margem ou excesso de armazenamento.',
      pillars: [
        {
          title: 'Funil Blueprint, Kanban e Avisos SLA',
          detail:
            'Separe Blueprint Passes autoatendidos da produção ativa—identifique Blueprints parados (>48h/7d) e rodadas esgotadas com lembretes white-label em 1 clique e bônus de +3 iterações.',
        },
        {
          title: 'CRM de Clientes, Receita de Passes e Scorecard PM',
          detail:
            'Consolide automaticamente Blueprint Passes de $29, pacotes de $19 e produções completas monitorando créditos, prazos e margem bruta real por PM.',
        },
        {
          title: 'Roteamento Diferido de PM e Isolamento de Equipe',
          detail:
            'Mantenha Blueprint Passes sem carga humana, roteie PMs por idioma apenas na aprovação, delegue Bíblias de Série e isole equipes com Revisores QA (0 créditos).',
        },
        {
          title: 'Escala Ilimitada e Limpeza em 1 Clique',
          detail:
            'Busca no servidor e ações em lote para centenas de projetos mais Arquivar e Limpar Rascunhos mantendo masters e Bíblias intactos.',
        },
      ],
    },
    workflowHeading: 'Como um Projeto White-Label Flui em 4 Etapas Simples',
    stepPrefix: 'Etapa',
    workflowSteps: [
      {
        step: '01',
        title: 'Entrevista Guiada Autofinanciada ($29)',
        detail:
          'Clientes adquirem o Blueprint Pass ($29), selecionam chips de marcos-chave, contam sua história por voz/texto com consentimento e confirmam uma checagem rápida de 15 s com rigor factual.',
      },
      {
        step: '02',
        title: 'Blueprint Vivo, Triagem Familiar e Auto-Revisões',
        detail:
          'Em ~3 min recebem storyboards ilustrados, áudio multilíngue e AR, compartilham link apenas para comentários com família/equipe, filtram notas em revisões IA (ou somam pacotes de $19) e aprovam para acionar o PM.',
      },
      {
        step: '03',
        title: "Upload Móvel de Fotos, Pronúncia e Trava de Continuidade",
        detail:
          "Clientes enviam fotos reais pelo celular (EXIF GPS removido), deixam um guia de pronúncia de 10 segundos para nomes e cidades e aprovam Elenco, Figurinos e Cenários com rodadas limitadas.",
      },
      {
        step: '04',
        title: "Entrega Express 4K no Mesmo Dia ou Screening Room Completo",
        detail:
          "Use liberação supervisionada em 1 toque pelo PM (ou piloto automático) na Screening Room sem login. A aprovação dispara o render 4K e envia o link de download por e-mail—com upgrade para Movimento Total sem retrabalho.",
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Vídeo Memórias',
        roleTag: '★ Carro-Chefe de Alta Margem',
        badge: "$149–$1,250 / filme · Valor de mercado: $1,200–$4,500+",
        title: 'Histórias de Vida, Homenagens e Biografias Familiares',
        description:
          'Combine fotografias de família com reconstituições cinematográficas de época em IA, relíquias travadas e continuidade precisa por idade (17 → 32 → 62 anos) narradas com vozes acolhedoras.',
        globalMarketNeed:
          'Centenas de milhões de pais idosos, bodas de ouro e aniversários marcantes acontecem todo ano no mundo, mas mais de 90% não é filmado porque equipes de $2,000+ são caras demais.',
        clientBuyer:
          'Famílias celebrando aniversários marcantes, bodas de ouro, aposentadorias e tributos de legado',
        partnerChannels:
          'Planejadores sucessórios, residenciais sênior, casas memoriais e cerimonialistas (comissão de indicação de 15–20%)',
        traditionalMarketRangeLabel: '$1,200–$4,500+',
        typicalRetailUsd: 599,
        priceTiersUsd: [149, 599, 1250],
        tierScopeLabels: [
          "Cinema Express 4K (5–8 min · Mesmo dia) · Quadros 4K com movimento + Vozes, SFX e Trilha · Master 4K auto",
          'Memória Familiar 12 min · Elenco Multigeracional · 2 Idiomas',
          'Documentário Legado 20 min · Épocas 4K + Relíquias · 4 Idiomas',
        ],
        computeTiersUsd: [6, 34, 72],
        operatorTiersUsd: [12, 88, 150],
        activeTimeTiersLabels: ["~15 min", '~1.75 h', '~3.0 h'],
        retailRangeLabel: "$149–$1,250",
        estComputeUsd: 34,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.75 h',
        keyAdvantage:
          'Nossa frente de maior diferencial: continuidade multigeracional entrega um filme nível $2,000 por ~$122 de custo total (~$34 créditos + ~$88 tempo PM).',
      },
      {
        id: 'realestate',
        tabLabel: 'Tours de Imóveis',
        roleTag: '↻ Retainer Mensal Imobiliário',
        badge: "$149–$549 / imóvel · Valor de mercado: $450–$1,500+",
        title: 'Tours Narrados de Imóveis de Alto Padrão e Hotéis Boutique',
        description:
          'Transforme fotos de anúncios e destaques do bairro em visitas cinematográficas narradas e musicadas — com versões imediatas em inglês, mandarim, espanhol ou árabe para compradores internacionais.',
        globalMarketNeed:
          'Dezenas de milhões de imóveis residenciais, casas de temporada e hotéis boutique disputam compradores locais e estrangeiros todo mês ainda presos apenas a fotos estáticas.',
        clientBuyer:
          'Corretores residenciais, imobiliárias de luxo, aluguéis de temporada e hotéis boutique',
        partnerChannels:
          'Estúdios de fotografia imobiliária, equipes de home staging, imobiliárias premium e marketing hoteleiro',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [149, 299, 549],
        tierScopeLabels: [
          "Filme Express 4K do Imóvel (90s · Mesmo dia) · Quadros 4K com movimento + Narração e Trilha · 1 idioma",
          'Visita Narrada 2 min · Upscale 4K + 2 Idiomas',
          'Filme Imóvel de Luxo 3 min + Reels 9:16 · 4 Idiomas',
        ],
        computeTiersUsd: [5, 15, 28],
        operatorTiersUsd: [10, 50, 88],
        activeTimeTiersLabels: ["~12 min", '~1.0 h', '~1.75 h'],
        retailRangeLabel: "$149–$549",
        estComputeUsd: 15,
        estOperatorUsd: 50,
        activeMinutesLabel: '~1.0 h',
        keyAdvantage:
          'Alta recorrência por corretor: uma imobiliária com 4 captações/mês gera receita constante sem deslocamento nem atrasos de clima (~$65 de custo).',
      },
      {
        id: 'training',
        tabLabel: 'Treinamento e POPs',
        roleTag: '↻ Retainer Corporativo B2B',
        badge: "$249–$1,800 / módulo · Valor de mercado: $1,500–$5,000+",
        title: 'Integração Corporativa, Segurança e Cursos Multilíngues',
        description:
          'Trave um instrutor consistente, uniformes e ambientes de trabalho no Cofre de Continuidade — e entregue episódios claros localizados no idioma nativo de cada colaborador.',
        globalMarketNeed:
          'Toda indústria, rede clínica, grupo de restaurantes e franquia no mundo enfrenta rotatividade constante, normas de segurança e equipes multilíngues precisando de vídeos POP claros.',
        clientBuyer:
          'Equipes de RH e T&D, indústrias, clínicas de saúde, redes de restaurantes e franquias',
        partnerChannels:
          'Consultorias de RH, auditores de segurança do trabalho, integradores LMS e associações de franquias',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [249, 950, 1800],
        tierScopeLabels: [
          "POP Narrado Express 4K (5 min · Mesmo dia) · Instrutor fixo + Voz clonada e SFX · 1 idioma",
          'Curso Segurança / Onboarding 10 min · 3 Idiomas',
          'Currículo Multi-Capítulo 20 min · 6+ Idiomas',
        ],
        computeTiersUsd: [9, 40, 78],
        operatorTiersUsd: [18, 125, 210],
        activeTimeTiersLabels: ["~20 min", '~2.5 h', '~4.2 h'],
        retailRangeLabel: "$249–$1,800",
        estComputeUsd: 40,
        estOperatorUsd: 125,
        activeMinutesLabel: '~2.5 h',
        keyAdvantage:
          'Contratos B2B recorrentes: 70%+ menos custo (~$165 vs $3,000+ presenciais) e atualizações rápidas pagas quando normas mudam.',
      },
      {
        id: 'brand',
        tabLabel: 'Filmes de Marca',
        roleTag: '↻ Pacote PME e Agências',
        badge: "$199–$1,200 / pacote · Valor de mercado: $3,000–$8,000+",
        title: 'Filmes de Fundadores, Vídeos para Clínicas e Anúncios Sociais',
        description:
          'Crie histórias de marca de alta conversão para sites acompanhadas de trailers verticais 9:16 automáticos para Instagram, TikTok e YouTube Shorts — aprovados na Screening Room.',
        globalMarketNeed:
          'Mais de 30 milhões de clínicas, escritórios, restaurantes e marcas artesanais no mundo precisam de vídeos institucionais e anúncios 9:16, mas não pagam $5,000+ por comercial.',
        clientBuyer:
          'Clínicas médicas e odontológicas, escritórios de advocacia, PMEs locais, agências web e e-commerces',
        partnerChannels:
          'Estúdios de criação de sites, agências de tráfego pago, associações comerciais e consultores médicos',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [199, 650, 1200],
        tierScopeLabels: [
          "Filme de Marca Express 4K (90s · Mesmo dia) · Quadros 4K com movimento + Narração e Trilha · Master 4K auto",
          'Filme de Fundador 2 min + 2 Cortes Sociais 9:16',
          'Filme de Marca + 4 Variações Multilíngues de Anúncios',
        ],
        computeTiersUsd: [7, 28, 56],
        operatorTiersUsd: [15, 88, 150],
        activeTimeTiersLabels: ["~18 min", '~1.75 h', '~3.0 h'],
        retailRangeLabel: "$199–$1,200",
        estComputeUsd: 28,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1.75 h',
        keyAdvantage:
          'Produção white-label para agências digitais e clínicas locais (~$116 de custo total) já com cortes verticais 9:16 automáticos.',
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
        serviceExampleTitle: 'Blueprint Pass ($29) sem Horas de PM e Triagem Familiar',
        serviceExampleNote:
          'Chips de memória e trava anti-ficção entregam um Rascunho 1 ilustrado e narrado em ~3 min. Clientes compartilham um link de comentários com a família, filtram notas + dicas AR em revisões IA (com áudio e storyboards atualizados) e acionam um PM só ao aprovar.',
        callouts: [
          {
            label: 'Chips de Memória e Trava Anti-Ficção',
            detail:
              'Marcos por vertical e checagem rápida de 15 s por voz/texto captam pessoas e fases reais sem inventar fatos biográficos.',
          },
          {
            label: 'Compartilhamento Duplo e Triagem pelo Cliente',
            detail:
              'Convidados ouvem em 7 idiomas e comentam sem gastar rodadas nem aprovar; o cliente filtra notas para 1 revisão IA limpa.',
          },
          {
            label: 'Áudio e Storyboards Renovados + Pacotes de $19',
            detail:
              'Cada iteração re-ilustra cenas alteradas, regenera a narração, recalcula Audience Resonance e libera +3 iterações sob demanda.',
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
        title: 'Assista ao Corte Cinema 4K Dublado — Depois Deixe os Agentes Gerarem os Planos',
        promise:
          'Revise seu Roteiro de Produção base, trave referências de continuidade, assista ao Corte Cinema 4K Pre-vis completo com vozes, escolha o figurino exato de cada tomada no Shot Director e acione agentes autônomos.',
        creatorExampleTitle: 'Cena 1: Cofre Subterrâneo · Anamórfico 4K',
        creatorExampleNote:
          'Troque o figurino de Elara por tomada, dirija enquadramentos por voz ou texto, mixe diálogos/SFX/trilha no Production Mixer e dispare os Production Agents.',
        serviceExampleTitle: 'Fotos Reais do Cliente + Reconstituições Cinematográficas',
        serviceExampleNote:
          'Intercale fotografias reais com movimento Ken Burns e reconstituições IA em 4K para memórias sem foto — mantendo uma memória de 12 min em ~$34 de créditos (e filmes legado de 20 min em 4K abaixo de ~$75).',
        callouts: [
          {
            label: 'Figurino por Tomada e Shot Director por Voz/Texto',
            detail:
              'Escolha o traje exato de cada plano e refine expressões ou câmera conversando naturalmente.',
          },
          {
            label: 'Proteção de Orçamento com Corte Cinema 4K Pre-vis',
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
          topBadge: 'Shot Director · Figurino Selecionado · Corte Cinema 4K Pre-vis Pronto',
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
          'Exiba cortes de cinema 4K, cortes preliminares e masters finais 4K em um único player. Receba comentários com marcação de tempo, gere mais de 70 versões dubladas e exporte ou publique onde quiser.',
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
        badge: 'Serviço Carro-Chefe · $149–$1,250/Filme',
        headline: 'Transforme Entrevistas de Família e Fotos de Acervo em Cinema de Legado',
        description:
          'Capture uma história de vida por entrevista inteligente, trave retratos em várias idades dos anos 70 até hoje, acione Production Agents autônomos, recrie clipes em 1 clique no FlowDirector e entregue por link privado da Screening Room.',
        featureIcons: [
          'clientIntake',
          'selfieStudio',
          'startBlueprint',
          'treatment',
          'continuity',
          'directShot',
          'animatic',
          'scriptSupervisor',
          'productionAgent',
          'screeningCollab',
          'languageStreams',
        ],
      },
      {
        id: 'commercial-training',
        tabLabel: 'Agências de 20 Projetos e Treinamento',
        badge: '20+ Projetos Simultâneos · Agentes Autônomos + FlowDirector QA',
        headline: 'Gerencie 20 Projetos Simultâneos com 50%–80% Menos Custo via Automação de Fluxo',
        description:
          'Configure portais white-label e limites de créditos para PMs, valide margens no Blueprint compartilhado, dispare agentes autônomos em 20 carteiras, revise vídeos no FlowDirector em 1 clique e publique em 70+ idiomas.',
        featureIcons: [
          'producerLaunchpad',
          'blueprintShare',
          'productionAgent',
          'scriptSupervisor',
          'budget',
          'castLocations',
          'musicScore',
          'stillsWorkbench',
          'clipsWorkbench',
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
          'Construa arcos de temporada multiepisódio, congele direção de arte fotorrealista ou animação 3D estilizada em cada episódio, dirija batidas e quadros-chave e renderize clipes de cinema de 10s com Omni 1.2 Flash.',
        featureIcons: [
          'newSeries',
          'seriesReview',
          'seriesDirector',
          'directEpisode',
          'startEpisode',
          'productionAgent',
          'stillsWorkbench',
          'clipsWorkbench',
        ],
      },
      {
        id: 'creator-podcast',
        tabLabel: 'Canais do YouTube e Podcasts Narrativos',
        badge: 'Canais de Alta Retenção · Shows Multi-Host',
        headline: 'Publique Episódios Semanais com Voz de Estúdio, Trilha Original e Mixagem',
        description:
          'Teste ganchos de retenção antes de renderizar, dirija química entre apresentadores e trilha sonora personalizada, refine o ritmo no Production Mixer e publique pacotes 16:9 + 9:16 via OAuth em 1 clique.',
        featureIcons: [
          'sceneWorkflow',
          'seriesResonance',
          'musicScore',
          'scriptSupervisor',
          'mixer',
          'streamsInventory',
          'shipPackage',
        ],
      },
      {
        id: 'filmmaker-pitch',
        tabLabel: 'Pré-Vis de Cineastas e Trailers de Pitch',
        badge: 'Decks de Sinal Verde · Cinema Proof-of-Concept',
        headline: 'Teste seu Roteiro e Entre em Reuniões de Pitch com um Trailer Finalizado',
        description:
          'Coescreva com o FlowDirector, avalie o ritmo estrutural com Audience Resonance no Blueprint e no Roteiro, compartilhe storyboards ilustrados, formate roteiros padrão e monte trailers cinematográficos.',
        featureIcons: [
          'blueprintDirector',
          'blueprintResonance',
          'blueprintShare',
          'goToProduction',
          'productionScript',
          'scriptResonance',
          'promoTrailers',
        ],
      },
    ],
  },
  directoryDrawer: {
    badge: 'Automação e 39 Capacidades · Corte Cinema 4Ks WebM Narrados em 7 Idiomas',
    title: 'Automatize Produção e QA de Vídeo em 20+ Projetos Simultâneos',
    subtitle:
      'Cada capacidade inclui agora um filme de cinema WebM limpo com narração completa de estúdio em 7 idiomas. Veja Portais White-Label, Estúdio de Selfies, FlowDirector em 1 clique e agentes autônomos em ação.',
    expandCta: 'Explorar 39 Capacidades Narradas',
    collapseCta: 'Ocultar Diretório de Capacidades',
    automationEyebrow: 'Feito para Criadores de Alto Volume e Agências com 20 Projetos Ativos',
    automationTitle: 'Automação Completa: Os Agentes Produzem. O FlowDirector Audita e Recria em 1 Clique.',
    automationSubtitle:
      'Pare de vigiar prompts clipe por clipe. Agentes autônomos de Áudio, Stills, Clips e Produção executam cenas em segundo plano enquanto o FlowDirector inspeciona cada MP4 em Audience Resonance e Conformidade do Diretor — recriando clipes em um único clique.',
    spotlightFlowDirectorLabel: 'FlowDirector QA de Vídeo',
    spotlightFlowDirectorMeta: 'Público AR + Diretor · Recria Clipes em 1 Clique',
    spotlightAgentsLabel: 'Agentes Autônomos de Produção',
    spotlightAgentsMeta: '300+ Prompts Automatizados · Escala para 20 Projetos Ativos',
    spotlightNarrated5kLabel: '39 Capacidades · Filmes de Cinema Narrados',
    spotlightNarrated5kMeta: 'Vídeos Corte Cinema 4K WebM 16:9 + Narração de Estúdio nos 7 Idiomas',
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
  mobileCompanion: MOBILE_COMPANION_COPY_PT,
} satisfies StudioLandingCopy
