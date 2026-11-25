import type { StudioLandingCopy } from './types'

export const STUDIO_LANDING_COPY_FR: StudioLandingCopy = {
  heroDock: {
    tagline:
      'Réalisez des films et séries originaux — ou bâtissez une activité de production vidéo à forte marge. Aucune compétence en cinéma ou en prompting requise.',
    primaryCta: 'Lancer Studio ($9)',
    businessCta: 'Explorer l’Activité Vidéo',
    howItWorksCta: 'Voir Comment Ça Marche',
  },
  audienceGateway: {
    eyebrow: 'Un Studio · Trois Voies de Réussite',
    title: 'Créez des Mondes Originaux.',
    titleAccent: 'Ou Bâtissez une Activité Vidéo Rentable.',
    subtitle:
      'SceneFlow associe une équipe de production IA experte à une direction conversationnelle — offrant autant de puissance aux narrateurs indépendants qu’aux créateurs de séries et aux studios de services vidéo clients.',
    cards: [
      {
        id: 'services',
        badge: 'Opportunité de Revenus · 65–90 % de Marge Brute',
        title: 'Entreprises de Production Vidéo',
        description:
          'Démarrez avec des films Express 4K Cinema livrés le jour même à $149 et des Mémoires de Vie à forte marge — puis enchaînez les forfaits mensuels récurrents en Formation, Immobilier et Films de Marque avec pleine propriété commerciale.',
        highlights: [
          'Portails en marque blanche sans connexion pour l’Intake, Blueprint, Continuité et Screening Room',
          'Films Express 4K Cinema le jour même à $149 (~88 % de marge) et passages en Full-Motion sans refonte',
          'Aperçu Cinema doublé et plafond de révisions strict évitant les reprises coûteuses',
        ],
        ctaLabel: 'Explorer les Modèles et Marges',
        targetAnchor: 'video-services',
      },
      {
        id: 'aspiring',
        badge: 'Aucune École de Cinéma ni Prompting Requis',
        title: 'Auteurs & Narrateurs Émergents',
        description:
          'Une biographie, un roman ou une idée de chaîne en tête ? Décrivez votre histoire naturellement à l’oral ou à l’écrit et laissez SceneFlow générer votre scénario de base et votre univers de référence.',
        highlights: [
          'Base experte instantanée pour la Série, le Blueprint et le Scénario de Production',
          'Dictez ou saisissez vos retouches en langage courant — zéro syntaxe de prompt',
          'Visionnez votre Aperçu Cinema doublé — ou exportez-le directement en film 4K Cinema',
        ],
        ctaLabel: 'Suivre la Visite en 4 Étapes',
        targetAnchor: 'studio-tour',
      },
      {
        id: 'experienced',
        badge: 'Chaînes de Séries · Podcasts · Pré-vis Investisseurs',
        title: 'Créateurs & Cinéastes Expérimentés',
        description:
          'Fini la loterie des régénérations. Verrouillez les visages récurrents, les costumes plan par plan, les voix sur mesure et les décors dans votre Continuity Vault — puis multipliez votre cadence par 10 grâce aux agents autonomes.',
        highlights: [
          'Continuity Vault multi-épisodes et contrôle des costumes plan par plan',
          'Validation exécutive via Audience Resonance et FlowDirector',
          'Des agents autonomes produisent 27+ scènes et des doublages en 70+ langues',
        ],
        ctaLabel: 'Découvrir les 5 Super-Pouvoirs du Studio',
        targetAnchor: 'five-superpowers',
      },
    ],
  },
  superpowers: {
    eyebrow: 'La Philosophie de Conception SceneFlow',
    title: 'Cinq Super-Pouvoirs de Studio.',
    titleAccent: 'Zéro Manuel Technique.',
    subtitle:
      'La vidéo IA classique vous oblige à jongler entre outils épars et à rédiger des centaines de prompts fragiles. SceneFlow vous offre une base experte, une direction naturelle par voix ou texte, un contrôle qualité exécutif et des agents de production autonomes.',
    watchClipLabel: 'Voir l’Aperçu (30s)',
    pillars: [
      {
        id: 'baseline',
        number: '01',
        badge: 'Ne Restez Jamais Devant une Page Blanche',
        title: 'Génération Automatique d’une Base Experte',
        description:
          'Partez d’une simple idée ou d’un entretien guidé. SceneFlow rédige automatiquement une Bible de Série structurée, un Film Blueprint et un Scénario de Production — avec arcs individuels, décors fidèles à chaque époque et temps forts dramatiques.',
        outcomeTag: 'Série · Blueprint · Scénario de Production',
        videoClipKey: 'comparison',
      },
      {
        id: 'dialog',
        number: '02',
        badge: 'Direction par Voix ou Texte',
        title: 'Contrôle Total de Réalisateur par Dialogue Intelligent',
        description:
          'Dirigez en cinéaste, pas en ingénieur prompt. Parlez ou écrivez pour remodeler des séquences, décliner un personnage selon ses âges (17, 32, 62 ans), choisir la tenue exacte de chaque plan ou ajuster un cadre avec précision.',
        outcomeTag: 'Zéro Ingénierie de Prompts',
        videoClipKey: 'direction',
      },
      {
        id: 'review',
        number: '03',
        badge: 'Contrôle Qualité Pré- et Post-Rendu',
        title: 'Audience Resonance & Revue Vidéo FlowDirector',
        description:
          'Audience Resonance évalue votre Série, votre Blueprint et votre Scénario avant le rendu — puis FlowDirector audite chaque scène vidéo rendue du point de vue du Public et du Réalisateur, appliquant des corrections en 1 clic via Shot Director sur plus de 20 projets clients actifs.',
        outcomeTag: 'QA Vidéo Public + Réalisateur · Correctifs 1 Clic',
      },
      {
        id: 'agents',
        number: '04',
        badge: 'Montée en Échelle Automatisée',
        title: 'Agents de Production Autonomes Accélérés',
        description:
          'Dès que votre scénario et votre Aperçu Cinema doublé sonnent juste, lancez Audio Agent, Stills Agent, Clips Agent ou les Production Agents complets pour bâtir des dizaines de scènes, corriger automatiquement les prises ratées et livrer un master 4K Cinema ou full-motion.',
        outcomeTag: '300+ Prompts Manuels Remplacés',
        videoClipKey: 'agent',
      },
      {
        id: 'collaboration',
        number: '05',
        badge: 'Validation Client & Portée Mondiale',
        title: 'Liens de Revue, Screening Room & 70+ Langues',
        description:
          'Partagez des liens web épurés pour valider le Blueprint, le Scénario et le montage à l’image près dans la Screening Room — puis livrez des flux localisés dans plus de 70 langues tout en dirigeant dans une interface Studio native multilingue.',
        outcomeTag: 'Liens Partagés · Screening Room · 70+ Doublages',
        videoClipKey: 'publish',
      },
    ],
    microVisuals: {
      baseline: {
        intakePrompt: 'Entretien initial : « Racontez-moi votre histoire… »',
        autoBadge: 'Auto-Généré en Quelques Secondes',
        steps: [
          { step: '1 · Bible de Série', detail: 'Arc 6 Ép. + Vault Partagé' },
          { step: '2 · Film Blueprint', detail: 'Temps Forts + Cast Multi-Âges' },
          { step: '3 · Scénario de Production', detail: 'Dialogues, Costumes & Caméra' },
        ],
      },
      dialog: {
        quote:
          '« Décline John à 17 ans, 32 ans et 62 ans — et habille Elara de son manteau de soie de gala pour le Plan 2. »',
        chipCast: '✓ 3 Fiches d’Âge Verrouillées',
        chipWardrobe: '✓ Plan 2 Costume : Manteau de Gala',
      },
      review: {
        arLabel: 'Audience Resonance + FlowDirector',
        arStatus: 'Jalons Pré-Rendu + QA Vidéo Scène',
        gateSeries: 'Série 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: 'Scène AR 86→89',
        flowDirectorNote:
          'FlowDirector QA Vidéo : Public AR 86 + Réalisateur 81 → correctif 1 clic recrée le clip (+3 AR)',
      },
      agents: {
        rows: [
          { label: 'Audio Agent · Voix, SFX & Musique', status: '27 / 27 Prêts' },
          { label: 'Stills Agent · Images Clés de Continuité', status: '100 % Verrouillé' },
          { label: 'Clips Agent · Mouvement Auto-Corrigé', status: 'Auto-Vérifié' },
        ],
      },
      collaboration: {
        approvedBadge: 'Approuvé ✓',
        dubsChip: '+70 Doublages',
      },
    },
  },
  videoServices: {
    eyebrow: 'Services de Livraison Vidéo · Indépendants & Agences',
    title: 'Livrez une Qualité de Production à $1,500+ pour un',
    titleAccent: 'Coût de Production Réduit de 50 % à 80 %',
    subtitle:
      'Les équipes classiques et 30 heures de montage manuel excluent 90 % des familles, agents immobiliers et commerces locaux. Commencez par notre offre phare Mémoires de Vie via des partenaires locaux — puis empilez des contrats B2B récurrents tout en réduisant votre coût complet (calcul + temps PM) de 50 % à 80 %.',
    commercialRightsBadge: '100 % Propriété Commerciale · Portails Marque Blanche (Pro+)',
    costSavingsPillLabel: 'Mémoires de Vie Phares + Forfaits B2B Récurrents',
    verticalsHeading: '1. Démarrez par Notre Offre Phare — Puis Développez les Forfaits Récurrents',
    globalDemandLabel: 'Immense Demande Mondiale',
    whoBuysLabel: 'Qui Achète Régulièrement',
    partnerChannelsLabel: 'Partenaires Apporteurs sans Budget Pub',
    marginAdvantageLabel: 'Avantage Marge & Périmètre SceneFlow',
    calculatorBadge: 'Estimateur de Coûts & Marges par Périmètre',
    calculatorTitle: '2. Simulez Vos Coûts de Livraison et Votre Bénéfice Mensuel',
    priceTierLabel: 'Forfait client :',
    priceTierNames: ['Express 4K Cinema', 'Full-Motion Cinema', 'Signature 4K'],
    tierScopePrefix: 'Périmètre du forfait :',
    volumeLabel: 'Livraisons clients / mois :',
    projectsPerMonthSuffix: 'projets/mois',
    projectsUnitLabel: 'projets',
    stressTestToggleLabel: 'Test prudent : Montée en charge Mois 1 + Offre Pro ($149/mois)',
    stressTestOnBadge: 'ACTIF',
    stressTestOffBadge: 'INACTIF',
    stressTestActiveNote:
      'Hypothèse prudente active : +60 % d’heures PM débutant, +30 % de marge calcul pour reprises et abonnement Operator Pro à $149/mois (inclut 10 000 crédits de base/mois + 150 Go de Vault).',
    proPlanLineLabel: 'Offre Pro ($149/mois) + calcul supplémentaire',
    proPlanCreditsIncludedNote: ' (10k cr incl.)',
    perProjectProfitLabel: 'Bénéfice service / projet',
    traditionalMarketLabel: 'Tarif marché habituel',
    typicalFeeLabel: 'Votre tarif client',
    fullyLoadedCostLabel: 'Coût de livraison / projet',
    costBreakdownSubLabel: 'Crédits + temps PM',
    estComputeLabel: 'Calcul (incl. 20 % marge reprises)',
    activeHandsOnLabel: 'Temps opérateur / PM (@$50/h)',
    monthlyGrossLabel: 'Chiffre d’Affaires Mensuel Est.',
    monthlyNetLabel: 'Bénéfice Mensuel Est. (après calcul et temps PM)',
    perMonthSuffix: '/ mois',
    marginBadgeSuffix: 'marge de service',
    disclaimer:
      'Le coût par périmètre inclut le calcul SceneFlow ($0.01/crédit avec 20 % de marge reprises) plus le temps opérateur/PM valorisé à $50/h. Activez le test prudent ci-dessus pour intégrer le temps de démarrage et l’abonnement Pro ($149/mois) ; hors prospection locale.',
    launchBusinessCta: 'Créer Votre Premier Film Démo ($9)',
    launchBusinessSubnote:
      'Utilisez l’essai Explorer à $9 pour produire un film portfolio sans filigrane à présenter aux partenaires locaux — puis passez à Pro ($149/mois) pour activer les Portails Clients 100 % Marque Blanche.',
    foundingCharterCta:
      'Vous lancez un studio client maintenant ? Voir la Charte Opérateur Fondateur (25 places)',
    foundingCharterTitle: 'Charte Pro 90 Jours des Opérateurs Vidéo Fondateurs',
    trustShieldHeading: 'Bouclier Entreprise de Marge, Confidentialité & Propriété Intellectuelle',
    trustShieldPillars: [
      {
        title: 'Portails Marque Blanche sans Connexion (Pro+)',
        detail:
          'Vos clients valident sous le nom, le logo et les couleurs de votre studio, sans compte SceneFlow ni tarifs de crédits visibles.',
      },
      {
        title: 'Express 4K Cinema & Pare-Feu Full-Motion',
        detail:
          'Livrez des plans fixes 4K photoréalistes animés avec voix clonées, SFX et musique en master le jour même ($149–$249) — ou utilisez ce même montage doublé comme pare-feu de validation avant d’engager les coûts Full-Motion.',
      },
      {
        title: 'Photos & Récits Clients 100 % Privés',
        detail:
          'Les archives familiales et fichiers B2B restent strictement privés — jamais utilisés pour entraîner des modèles IA publics — avec suppression GPS EXIF à l’envoi et consentement à l’image consigné.',
      },
    ],
    playbooksBadge: 'Kits Clés en Main « Service-in-a-Box » Inclus',
    playbooksHeading: 'Playbooks Opérateurs, Grilles Tarifaires & Kits Partenaires Clés en Main',
    playbooksSubtitle:
      'Éliminez les tâtonnements du démarrage grâce à des procédures sectorielles éprouvées intégrées directement dans SceneFlow Studio :',
    playbooksItems: [
      'Biographe IA & Guides d’Entretien en 70+ Langues de Film (Portail Natif Multilingue)',
      'Grilles Tarifaires 3 Niveaux & Calculateur de Marge Plancher Intégré',
      'Argumentaire Partenaire à 20 % de Commission (Résidences Seniors, Pompes Funèbres & Immobilier)',
      'Registre Intégré de Consentement Média, Image Multi-Âges et Voix',
    ],
    blueprintFlywheel: {
      badge: 'Découverte Automatisée à 0 Min PM · 83 % de Marge Nette',
      title: 'Générez des Revenus Automatiques Avant Même qu’un PM Touche le Projet',
      subtitle:
        'Les clients peinent à rédiger un film à partir d’une page blanche — mais réagissent avec enthousiasme à un premier jet illustré et narré. SceneFlow transforme l’onboarding client en un Blueprint Pass autofinancé et collaboratif qui reste rentable même sur les prospects en pause.',
      cards: [
        {
          tag: 'Pass $29 + Recharges $19 · 0 Min PM',
          title: 'Blueprint Pass Autofinancé & Packs d’Itérations Supplémentaires',
          detail:
            'Les clients paient $29 d’avance pour recevoir des storyboards illustrés, une narration multilingue et un score Audience Resonance en ~3 minutes (~83 % de marge même s’ils mettent en pause) — plus des packs en libre-service à $19 (+3 révisions / +2 AR) à tout moment.',
        },
        {
          tag: 'Version 1 Rapide & Authentique',
          title: 'Puces Mémoire, Vérification Rapide & Zéro Fictionnalisation',
          detail:
            'Des puces d’étapes sectorielles (mariages, promotions, sports, preuves, pièces) et une vérification vocale/écrite de 15 s capturent vite les personnes et événements clés, tandis que nos garde-fous factuels n’inventent jamais de détails biographiques.',
        },
        {
          tag: 'Partage à Deux Niveaux & Triage',
          title: 'Lien Commentaire Famille / Équipe & Contrôle du Client Principal',
          detail:
            'Votre client reçoit un Portail Réalisateur privé et partage un lien en commentaire seul avec sa famille ou son équipe. Les invités écoutent en 70+ langues de film et commentent sans consommer de tours ni approuver ; le client principal trie notes + conseils AR en 1 mise à jour IA qui régénère audio et storyboards.',
        },
        {
          tag: 'Affectation Différée des PM',
          title: 'Affectation PM Uniquement à l’Approbation + Tunnel Blueprint',
          detail:
            'Zéro heure PM tant que le client n’a pas cliqué sur Approuver le Blueprint. Suivez les dossiers Actifs, Inactifs >48 h / >7 j ou Tours Épuisés dans le Tunnel Blueprint avec relances marque blanche en 1 clic, bonus +3 itérations et revenus de pass automatisés.',
        },
      ],
    },
    agencyScaleOps: {
      badge: 'Échelle Agence Multi-PM · Des Centaines de Projets Clients',
      title: 'Centre de Commandement d’Agence Intégré Directement dans le Studio',
      subtitle:
        'Passez d’opérateur indépendant à agence vidéo internationale multi-PM sans tableurs, heures commerciales perdues, fuites de marge ni stockage saturé.',
      pillars: [
        {
          title: 'Tunnel Blueprint, Kanban & Relances SLA',
          detail:
            'Séparez les Blueprint Pass autonomes de la production active — repérez les Blueprints en attente (>48 h / 7 j) et les tours épuisés avec relances e-mail en marque blanche en 1 clic et dotations +3 itérations.',
        },
        {
          title: 'CRM Client, Revenus des Pass & Tableau de Bord PM',
          detail:
            'Agrégez automatiquement les Blueprint Pass à $29, les packs à $19 et les commandes complètes tout en suivant la consommation de crédits, les délais et la marge brute réelle par PM.',
        },
        {
          title: 'Routage Différé des PM & Isolation des Espaces',
          detail:
            'Gardez les Blueprint Pass sans intervention humaine, affectez automatiquement les PM linguistiques à l’approbation, déléguez les Bibles de Série et isolez les équipes avec des Réviseurs QA à 0 crédit.',
        },
        {
          title: 'Échelle Illimitée & Purge des Brouillons en 1 Clic',
          detail:
            'Recherche serveur et actions PM en masse sur des centaines de projets, plus Archivage & Purge en 1 clic des brouillons intermédiaires tout en préservant les masters finaux.',
        },
      ],
    },
    workflowHeading: 'Comment un Projet Client en Marque Blanche Avance en 4 Étapes Fluides',
    stepPrefix: 'Étape',
    workflowSteps: [
      {
        step: '01',
        title: 'Entretien Guidé Autofinancé à $29',
        detail:
          'Les clients achètent votre Blueprint Pass à $29, choisissent des puces Mémoire sectorielles, racontent leur histoire par voix ou texte avec consentement obligatoire et valident une vérification rapide de 15 s d’une stricte fidélité factuelle.',
      },
      {
        step: '02',
        title: 'Blueprint Vivant, Triage Familial & Auto-Révisions',
        detail:
          'En ~3 minutes, ils reçoivent storyboards illustrés, audio multilingue et score AR, partagent un lien commentaire avec famille/équipe, filtrent les remarques en mises à jour IA (ou ajoutent des packs $19) et cliquent Approuver pour déclencher l’affectation PM.',
      },
      {
        step: '03',
        title: 'Envoi Mobile de Photos, Prononciation & Verrou Continuité',
        detail:
          'Les clients envoient de vraies photos depuis leur téléphone (GPS EXIF supprimé), enregistrent un guide de prononciation de 10 s pour les noms/lieux et valident Cast multi-âges, Costumes & Décors dans le cadre des tours inclus.',
      },
      {
        step: '04',
        title: 'Livraison Express 4K le Jour Même ou Screening Room Full-Motion',
        detail:
          'Activez la publication PM supervisée en 1 clic (ou pilote automatique) vers la Screening Room sans connexion. L’approbation client déclenche automatiquement le rendu master 4K et l’e-mail de téléchargement — évolutif en Full-Motion sans refonte.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Mémoires Vidéo',
        roleTag: '★ Offre Phare à Forte Marge',
        badge: '$149–$1,250 / film · Tarif marché : $1,200–$4,500+',
        title: 'Récits de Vie, Hommages Marquants & Biographies Familiales',
        description:
          'Démarrez par un Hommage Express 4K Cinema livré le jour même à $149 (plans fixes 4K photoréalistes animés, voix clonées, SFX et musique) ou passez sans refonte aux reconstitutions Full-Motion multi-âges (17 ans → 32 ans → 62 ans).',
        globalMarketNeed:
          'Des centaines de millions de parents âgés, noces d’or et célébrations de vie ont lieu chaque année dans le monde — pourtant plus de 90 % ne sont jamais filmés faute d’équipes accessibles sous $2,000+ ou de délais courts.',
        clientBuyer:
          'Familles célébrant anniversaires marquants, noces d’or, départs à la retraite et hommages patrimoniaux',
        partnerChannels:
          'Conseillers patrimoniaux, résidences seniors, pompes funèbres et organisateurs d’événements (modèle partenaire 15–20 %)',
        traditionalMarketRangeLabel: '$1,200–$4,500+',
        typicalRetailUsd: 599,
        priceTiersUsd: [149, 599, 1250],
        tierScopeLabels: [
          'Express 4K Cinema (5–8 min · Jour même) · Plans 4K animés + Voix, SFX & Musique · Master 4K auto',
          'Mémoire Familiale Full-Motion 12 min · Cast Multi-Âges + Époques · 2 Langues',
          'Documentaire Héritage Signature 20 min · Époques Full-Motion 4K + Objets Souvenirs · 4 Langues',
        ],
        computeTiersUsd: [6, 34, 72],
        operatorTiersUsd: [12, 88, 150],
        activeTimeTiersLabels: ['~15 min', '~1,75 h', '~3,0 h'],
        retailRangeLabel: '$149–$1,250',
        estComputeUsd: 34,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1,75 h',
        keyAdvantage:
          'Échelle de valeur en 3 paliers : Blueprint Pass $29 → Express 4K Cinema le jour même $149 (~$18 coût total, ~88 % marge) → passage Full-Motion à $599+ sans refonte.',
      },
      {
        id: 'realestate',
        tabLabel: 'Visites Immobilières',
        roleTag: '↻ Forfait Récurrent Agences',
        badge: '$149–$549 / bien · Tarif marché : $450–$1,500+',
        title: 'Visites Narrées de Biens de Prestige & Hôtels Boutique',
        description:
          'Transformez photos d’annonces et atouts de quartier en films Express 4K Cinema le jour même à $149 ou en visites Full-Motion — avec déclinaisons instantanées en mandarin, espagnol, arabe ou portugais pour les acheteurs internationaux.',
        globalMarketNeed:
          'Des dizaines de millions de biens résidentiels, locations saisonnières et hôtels boutique rivalisent chaque mois pour séduire des acheteurs locaux et internationaux avec de simples photos fixes.',
        clientBuyer:
          'Agents immobiliers performants, agences de prestige, locations haut de gamme et hôtels boutique',
        partnerChannels:
          'Studios de photo immobilière, équipes de home staging, réseaux de courtage luxe et spécialistes hôteliers',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [149, 299, 549],
        tierScopeLabels: [
          'Film Annonce Express 4K (90s · Jour même) · Plans 4K animés + Voix Off & Musique · 1 Langue',
          'Visite Full-Motion 2 min · Upscale 4K + 2 Langues',
          'Film Propriété de Prestige 3 min + Reels 9:16 · 4 Langues Internationales',
        ],
        computeTiersUsd: [5, 15, 28],
        operatorTiersUsd: [10, 50, 88],
        activeTimeTiersLabels: ['~12 min', '~1,0 h', '~1,75 h'],
        retailRangeLabel: '$149–$549',
        estComputeUsd: 15,
        estOperatorUsd: 50,
        activeMinutesLabel: '~1,0 h',
        keyAdvantage:
          'Fort volume récurrent par agent : livrez des films Express 4K le jour même à $149 (~$15 de coût, ~90 % de marge) ou des forfaits Full-Motion mensuels sans déplacement.',
      },
      {
        id: 'training',
        tabLabel: 'Formation & SOP',
        roleTag: '↻ Forfait B2B Récurrent',
        badge: '$249–$1,800 / module · Tarif marché : $1,500–$5,000+',
        title: 'Intégration Entreprise, Sécurité & Modules Multilingues',
        description:
          'Verrouillez un formateur récurrent, des uniformes et vos sites de travail dans votre Continuity Vault — puis livrez le jour même des SOP narrées Express 4K à $249 ou des cours Full-Motion traduits dans 70+ langues employés.',
        globalMarketNeed:
          'Chaque industriel, réseau de cliniques, groupe hôtelier ou franchise dans le monde fait face au turnover, à la conformité sécurité et à des équipes multilingues exigeant des procédures vidéo claires.',
        clientBuyer:
          'Directions RH & Formation, industriels, réseaux médicaux, groupes de restauration et franchises',
        partnerChannels:
          'Consultants RH externalisés, auditeurs sécurité au travail, intégrateurs LMS et réseaux de franchises',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [249, 950, 1800],
        tierScopeLabels: [
          'SOP Narrée Express 4K (5 min · Jour même) · Formateur verrouillé + Voix clonée & SFX · 1 Langue',
          'Module Sécurité / Onboarding Full-Motion 10 min · 3 Langues Équipe',
          'Parcours Multi-Chapitres 20 min · 6+ Langues Équipe',
        ],
        computeTiersUsd: [9, 40, 78],
        operatorTiersUsd: [18, 125, 210],
        activeTimeTiersLabels: ['~20 min', '~2,5 h', '~4,2 h'],
        retailRangeLabel: '$249–$1,800',
        estComputeUsd: 40,
        estOperatorUsd: 125,
        activeMinutesLabel: '~2,5 h',
        keyAdvantage:
          'Contrats B2B fidèles : lancez des SOP Express 4K à $249 le jour même (~$27 de coût, ~89 % de marge) ou des cours multilingues à $950+, et mettez à jour la conformité en quelques minutes.',
      },
      {
        id: 'brand',
        tabLabel: 'Films de Marque',
        roleTag: '↻ Pack Récurrent PME & Agences',
        badge: '$199–$1,200 / pack · Tarif marché : $3,000–$8,000+',
        title: 'Films Fondateurs, Présentations Cliniques & Publicités Sociales',
        description:
          'Produisez le jour même des Films de Marque Express 4K à $199 ou des histoires de fondateurs Full-Motion pour page d’accueil, accompagnés de bandes-annonces verticales 9:16 automatiques pour Instagram, TikTok et YouTube Shorts — validés dans la Screening Room.',
        globalMarketNeed:
          'Plus de 30 millions de cliniques, cabinets juridiques, restaurants et artisans fondateurs dans le monde ont un besoin urgent de vidéos de confiance et de publicités 9:16 — mais sont exclus par les tournages d’agence à $5,000+.',
        clientBuyer:
          'Cabinets médicaux/dentaires, cabinets d’avocats, PME locales, agences web et fondateurs e-commerce',
        partnerChannels:
          'Studios de création web, agences SEO/Ads, chambres de commerce et consultants médicaux/dentaires',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [199, 650, 1200],
        tierScopeLabels: [
          'Film de Marque Express 4K (90s · Jour même) · Plans 4K animés + Voix & Musique · Master 4K auto',
          'Film Fondateur Full-Motion 2 min + 2 Déclinaisons Sociales 9:16',
          'Film de Marque Signature + 4 Variantes Accroches Pub Multilingues',
        ],
        computeTiersUsd: [7, 28, 56],
        operatorTiersUsd: [15, 88, 150],
        activeTimeTiersLabels: ['~18 min', '~1,75 h', '~3,0 h'],
        retailRangeLabel: '$199–$1,200',
        estComputeUsd: 28,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1,75 h',
        keyAdvantage:
          'Production en marque blanche pour agences web et pub locales — Films de Marque Express 4K à $199 le jour même (~$22 coût, ~89 % marge) ou packs Full-Motion à $650 avec découpes 9:16.',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'Visite Visuelle du Studio · Sans Jargon',
    title: 'Quatre Salles Connectées.',
    titleAccent: 'Un Flux Sans Effort.',
    subtitle:
      'Découvrez les 4 portes du Studio en 60 secondes — Series Room, Blueprint Room, Production Stage et Screening Room — avant de tester ces mêmes portes en direct dans les 6 Exemples de Production complets ci-dessous.',
    stepPrefix: 'Étape',
    lensLabel: 'Angle d’aperçu :',
    lensCreator: 'Série Originale (« The Glass Ledger »)',
    lensService: 'Service Client (« Mémoire de Vie »)',
    watchRoomVideoLabel: 'Voir la Visite (30s)',
    inspectFullScreenLabel: 'Inspecter l’Écran Complet du Studio',
    openLiveScreeningLabel: 'Ouvrir la Screening Room Interactive',
    screeningModalTitle: 'The Glass Ledger — Screening Room de Démonstration',
    examplesBridgeText:
      'Maintenant que vous connaissez les 4 portes du Studio, testez-les en direct sur 6 genres complets :',
    examplesBridgeCta: 'Essayer les 4 Portes dans les Exemples de Production',
    rooms: [
      {
        id: 'series-desk',
        stepNumber: '01',
        tabLabel: 'Series Room',
        badge: 'Univers Multi-Épisodes & Bible de Continuité',
        title: 'Bâtissez un Univers Réutilisable une Fois — Pas un Simple Clip',
        promise:
          'Décrivez une chaîne de séries, un programme de formation ou une biographie en chapitres une seule fois. SceneFlow construit votre Bible d’Histoire, votre Grille d’Épisodes et votre Reference Library partagée pour garder chaque épisode cohérent.',
        creatorExampleTitle: 'The Glass Ledger · Thriller Néo-Noir en 6 Épisodes',
        creatorExampleNote:
          'Casting partagé (Elara Vance, Marcus Thorne, Dr. Aris Kael), décor Archive Vault et accessoire Quartz Codex verrouillés sur les 6 épisodes avec une base Audience Resonance de 91/100.',
        serviceExampleTitle: 'Héritage Familial Multi-Chapitres ou Programme Entreprise',
        serviceExampleNote:
          'Enregistrez une seule fois les présentateurs validés, les époques familiales ou les locaux du client — puis lancez les épisodes 2 à 10 en un clic sans dérive visuelle.',
        callouts: [
          {
            label: 'Base de Série Instantanée & Score Audience Resonance',
            detail:
              'Génère automatiquement le synopsis, les arcs par épisode et le score Audience Resonance avant la production.',
          },
          {
            label: 'Reference Library Partagée',
            detail:
              'Personnages, voix, costumes, décors et accessoires se transfèrent automatiquement vers chaque épisode.',
          },
          {
            label: 'Réalisateur de Série par Voix ou Texte',
            detail:
              'Dictez ou saisissez des ajustements pour remodeler les arcs de saison ou des épisodes précis sans effort.',
          },
        ],
        visuals: {
          topBadge: 'Série AR : 91 / 100 · 6 Épisodes Synchronisés',
          bottomBadge: 'Reference Library Partagée Verrouillée sur Tous les Épisodes',
          thumbLabels: [
            'Elara Vance · Rôle Principal',
            'Marcus Thorne · Casting',
            'Archive Vault · Décor',
            'Quartz Codex · Accessoire',
          ],
        },
      },
      {
        id: 'blueprint-board',
        stepNumber: '02',
        tabLabel: 'Blueprint Room',
        badge: 'Entretien Guidé, Casting Multi-Âges & Feu Vert',
        title: 'Verrouillez une Histoire Forte et Votre Casting Avant le Rendu Vidéo',
        promise:
          'Démarrez à partir d’un entretien naturel ou d’un concept. La Blueprint Room structure vos séquences, met en avant chaque personnage par temps fort, verrouille l’identité multi-âges et recueille la validation par lien partagé.',
        creatorExampleTitle: 'Traitement Séquence par Séquence & Style Visuel Verrouillé',
        creatorExampleNote:
          'Chaque séquence associe intention dramatique, personnages présents, règles d’éclairage anamorphique et retours narrés d’Audience Resonance.',
        serviceExampleTitle: 'Blueprint Pass à $29 sans Heures PM & Triage Familial',
        serviceExampleNote:
          'Les puces Mémoire et l’anti-fictionnalisation livrent une Version 1 illustrée et narrée en ~3 minutes. Les clients partagent un lien commentaire avec leur famille, filtrent remarques + conseils AR en révisions IA (audio et storyboards actualisés) et ne déclenchent le PM qu’à l’approbation.',
        callouts: [
          {
            label: 'Entretien Puces Mémoire & Anti-Fictionnalisation',
            detail:
              'Des puces sectorielles et une vérification voix/texte de 15 s captent vite personnes et époques clés — sans jamais inventer de faits biographiques.',
          },
          {
            label: 'Partage Famille / Équipe à Deux Niveaux & Triage',
            detail:
              'Les invités écoutent en 70+ langues de film et commentent sans consommer de tours ni approuver ; le client principal trie les notes en 1 révision IA propre.',
          },
          {
            label: 'Audio & Storyboards Actualisés + Packs à $19',
            detail:
              'Chaque itération ré-illustre les chapitres modifiés, régénère la narration, recalcule Audience Resonance et propose des packs +3 itérations en libre-service.',
          },
        ],
        visuals: {
          topBadge: 'Blueprint AR : 92 / 100 · Cast Mis en Avant par Séquence',
          bottomBadge: 'Continuité Multi-Âges + Lien de Validation Client Partagé',
          thumbLabels: [
            'Arc du Protagoniste',
            'Dr. Aris Kael · Séquence 2',
            'Quai du Port · Acte II',
            'Clé Chrono · Objet Clé',
          ],
        },
      },
      {
        id: 'production-stage',
        stepNumber: '03',
        tabLabel: 'Production Stage',
        badge: 'Shot Director, Contrôle Costumes & Agents Autonomes',
        title: 'Visionnez le Montage Cinema Doublé — Livrez en 4K ou Passez en Full-Motion',
        promise:
          'Relisez votre Scénario de Production, verrouillez vos références de continuité, visionnez le montage Cinema photoréaliste animé avec voix clonées, SFX et musique — livrez-le directement en Express 4K Cinema le jour même ou laissez les agents autonomes bâtir les plans full-motion.',
        creatorExampleTitle: 'Scène 1 : Archive Vault Souterrain · 4K Anamorphique',
        creatorExampleNote:
          'Changez la tenue d’Elara plan par plan, dirigez le cadrage à la voix ou au texte, mixez dialogues/SFX/musique dans Production Mixer et lancez les Production Agents.',
        serviceExampleTitle: 'Express 4K Cinema le Jour Même ($149) ou Passages Hybrides Full-Motion',
        serviceExampleNote:
          'Livrez un film Express 4K narré en quelques heures (~$6 de calcul) ou ajoutez des reconstitutions IA full-motion pour les souvenirs sans photo — en gardant une mémoire full-motion de 12 min autour de ~$34 de calcul.',
        callouts: [
          {
            label: 'Costumes par Plan & Shot Director par Voix/Texte',
            detail:
              'Choisissez la tenue exacte de chaque plan et affinez cadrage ou expressions par simple dialogue — fini les tirages aléatoires.',
          },
          {
            label: 'Master Express 4K Cinema & Pare-Feu Mouvement',
            detail:
              'Écoutez dialogues clonés, narration, SFX et musique sur des plans fixes 4K animés verrouillés — prêts à exporter en film à $149 ou à approuver avant les dépenses full-motion.',
          },
          {
            label: 'Audio Agent, Stills Agent & Clips Agent Autonomes',
            detail:
              'Générez scène par scène ou lancez l’ensemble des Production Agents pour assembler automatiquement.',
          },
        ],
        visuals: {
          topBadge: 'Shot Director · Costume Sélectionné · Montage Express 4K Prêt',
          bottomBadge: 'Audio Agent, Stills Agent & Clips Agent Orchestrent Toutes les Scènes',
          thumbLabels: [
            'Plan 1 · Plan Large Voûte',
            'Plan 3 · Macro Accessoire',
            'Scène 2 · Remise',
            'Scène 3 · Travelling',
          ],
        },
      },
      {
        id: 'screening-room',
        stepNumber: '04',
        tabLabel: 'Screening Room',
        badge: 'Revue à l’Image Près, 70+ Langues & Publication',
        title: 'Collaborez par Lien Privé & Diffusez Mondialement dans Toute Langue',
        promise:
          'Visionnez montages Express 4K Cinema, ours et masters 4K full-motion dans un seul lecteur unifié. La validation client peut déclencher automatiquement le rendu 4K et envoyer le lien de téléchargement — plus 70+ pistes doublées synchronisées.',
        creatorExampleTitle: 'Master Prêt pour la Première, Bandes-Annonces & Doublages Mondiaux',
        creatorExampleNote:
          'Découpez automatiquement des teasers verticaux 9:16, générez des dialogues localisés pour 70+ marchés et publiez sur YouTube ou candidatez à SceneFlow Originals.',
        serviceExampleTitle: 'Revue Client Sans Friction & Livraison Multilingue',
        serviceExampleNote:
          'Les clients regardent sur mobile ou ordinateur sans aucune connexion, déposent des notes horodatées et reçoivent des fichiers MP4 impeccables dans la langue de leur famille ou de leurs équipes.',
        callouts: [
          {
            label: 'Liens de Revue Partagés sans Connexion',
            detail:
              'Envoyez des liens privés `/share/screening-room/` pour une validation fluide des clients, décideurs ou proches.',
          },
          {
            label: 'Flux Synchronisés en Scène dans 70+ Langues',
            detail:
              'Préserve les ambiances SFX et la musique tout en alignant les voix et dialogues localisés pour les marchés mondiaux.',
          },
          {
            label: 'Export Master 4K & Découpes Promotionnelles',
            detail:
              'Téléchargez des masters commerciaux propres avec pleine propriété IP ou diffusez des bandes-annonces directement sur les réseaux sociaux.',
          },
        ],
        visuals: {
          topBadge: 'Notes à l’Image Près · Lien Client sans Connexion',
          bottomBadge: 'Interface Studio Multilingue · 70+ Flux Doublés en Scène',
          thumbLabels: [
            'EN · Master Original',
            'FR / ES · Doublage Synchro',
            'ZH / TH / HI · Flux',
            'Teaser Promo 9:16',
          ],
        },
      },
    ],
  },
  useCaseDirectory: {
    viewByUseCaseLabel: 'Parcourir par Cas d’Usage',
    viewByRoomLabel: 'Parcourir par Salle du Studio',
    tracks: [
      {
        id: 'memoir-services',
        tabLabel: 'Mémoires Vidéo & Héritage Familial',
        badge: 'Service Client Phare · $149–$1,250/Film',
        headline: 'Transformez Entretiens Familiaux & Photos Souvenirs en Cinéma Patrimonial',
        description:
          'Recueillez un récit de vie dans plus de 70 langues de film, restaurez et rajeunissez les portraits dans Character Selfie Studio des années 1970 à aujourd’hui, lancez les Production Agents autonomes, corrigez les clips en 1 clic via FlowDirector et livrez par lien Screening Room sans connexion.',
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
        tabLabel: 'Agences 20 Projets & Vidéo Formation',
        badge: '20+ Projets Simultanés · Production Agent Unifié + QA FlowDirector',
        headline: 'Pilotez 20 Projets Clients Simultanés à Coût Réduit de 50 %–80 % par Automatisation',
        description:
          'Activez portails marque blanche et plafonds de crédits PM, vérifiez vos marges nettes sur Blueprints partagés, déployez le Production Agent unifié sur Audio Pré-Vis, Images Clés, Clips Animés et Rendus Scènes MP4 avec récupération [Investigate] auto-réparatrice, auditez dans FlowDirector et livrez 70+ langues.',
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
        tabLabel: 'Séries Épisodiques & Animation Stylisée',
        badge: 'IP Multi-Épisodes · Direction Artistique & Cast Verrouillés',
        headline: 'Pilotez une Bible de Showrunner Complète de l’Épisode 1 au Final de Saison',
        description:
          'Construisez un arc saisonnier multi-épisodes, figez une direction artistique photoréaliste ou 3D stylisée sur chaque épisode, dirigez storyboards et images clés, et lancez le Production Agent unifié pour rendre des clips cinéma 10s avec repli auto-réparateur Creative Kling AI F2V.',
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
        tabLabel: 'Chaînes YouTube & Podcasts Narratifs',
        badge: 'Chaînes Faceless Haute Rétention · Émissions Multi-Voix',
        headline: 'Publiez Chaque Semaine des Épisodes Narratifs avec Voix Studio, Musique & Finition',
        description:
          'Testez vos accroches de rétention avant rendu, dirigez la chimie de plusieurs animateurs, des repères narratifs synchronisés au plan et une bande originale sur mesure, peaufinez des mixages 4 pistes et publiez en 16:9 + 9:16 via OAuth en 1 clic.',
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
        tabLabel: 'Pré-Vis Cinéastes & Bandes-Annonces Pitch',
        badge: 'Dossiers Feu Vert · Cinéma Preuve de Concept',
        headline: 'Éprouvez Votre Scénario et Arrivez en Réunion de Pitch avec une Bande-Annonce Finie',
        description:
          'Co-écrivez avec FlowDirector, évaluez le rythme structurel avec Audience Resonance aux jalons Blueprint et Scénario, partagez des storyboards illustrés avec prévisions budgétaires, formatez vos scénarios aux standards de l’industrie et montez des trailers de cinéma.',
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
    badge: 'Automatisation & 39 Capacités Studio · Films Cinema Narrés en WebM',
    title: 'Automatisez la Production & le QA Vidéo Expert sur 20+ Projets Simultanés',
    subtitle:
      'Chaque capacité inclut un film cinéma WebM narré, clair et adapté au mobile. Découvrez comment les Portails Marque Blanche, Selfie Studio, les correctifs 1 clic FlowDirector et les agents autonomes remplacent plus de 300 prompts manuels.',
    expandCta: 'Explorer les 39 Capacités Studio Narrées',
    collapseCta: 'Masquer le Répertoire des Capacités',
    automationEyebrow: 'Conçu pour les Créateurs Intensifs & Prestataires Vidéo 20 Projets',
    automationTitle:
      'Automatisation de Bout en Bout : Les Agents Produisent. FlowDirector Audite & Corrige en 1 Clic.',
    automationSubtitle:
      'Arrêtez de surveiller les prompts clip par clip. Les agents autonomes Audio, Stills, Clips et Production exécutent les scènes en arrière-plan tandis que FlowDirector inspecte chaque MP4 rendu pour Audience Resonance et conformité Réalisateur — recréant les clips signalés via Shot Director en un seul clic.',
    spotlightFlowDirectorLabel: 'FlowDirector QA Vidéo Scène',
    spotlightFlowDirectorMeta: 'Public AR + Conformité Réalisateur · Correctif 1 Clic Recrée les Clips',
    spotlightAgentsLabel: 'Production Agents Autonomes',
    spotlightAgentsMeta: '300+ Prompts Automatisés · Auto-Réparation sur 20 Projets Actifs',
    spotlightNarrated5kLabel: '39 Capacités · Films Cinema Narrés',
    spotlightNarrated5kMeta: 'Visites Cinéma WebM 16:9 + Narration Studio Multilingue',
  },
  academyStrip: {
    badge: 'Garantie Zéro Courbe d’Apprentissage · Studio Academy',
    title: 'Ne Soyez Jamais Dépassé. Appuyez sur ? Partout pour un Guide Visuel de 60 Secondes.',
    subtitle:
      'Chaque salle du Studio inclut une Carte d’Écran Just-In-Time (JIT) avec repères numérotés, actions en un clic, garde-fous de crédits Pré-vis et notre simulateur interactif « Votre Premier Film en 10 Minutes ».',
    pills: [
      'Cartes d’Écran Contextuelles ?',
      'Simulateur « Premier Film en 10 Min »',
      'Garde-Fous Crédits Pré-vis Intégrés',
    ],
    watchAcademyCta: 'Voir la Visite Academy (30s)',
    startExplorerCta: 'Démarrer avec Explorer — $9',
  },
  mobileCompanion: {
    eyebrow: 'Liens Clients sans Connexion + PWA Mobile Opérateur · iOS & Android',
    title: 'Puissance d’un Studio Desktop.',
    titleAccent: 'Portails Mobiles Fluides pour Clients & Équipes.',
    subtitle:
      'Vos clients payants n’ont jamais besoin de compte SceneFlow, d’application à télécharger ni d’abonnement — ils interagissent via vos liens web mobiles en marque blanche, tandis que vous et vos Chefs de Projet (PM) suivez alertes, jalons et plafonds de crédits depuis une Mobile Companion PWA à installation instantanée.',
    whyPwaBadge: 'Zéro Connexion Client · PWA Opérateur Instantanée',
    whyPwaNote:
      'Les clients ouvrent des liens Safari/Chrome épurés à votre marque ; opérateurs et PM installent la PWA Companion en un geste avec alertes Web Push natives.',
    modeCustomerTab: 'Parcours Client Marque Blanche',
    modeTeamTab: 'Hub Opérateur & PM (PWA)',
    customerHeading: 'Portails Mobiles sans Connexion sous la Marque de Votre Studio',
    customerSubheading:
      'Vos clients payants ne voient jamais les tarifs de crédits SceneFlow et ne créent aucun compte — ils racontent leur histoire, envoient des photos et valident le projet via quatre liens mobiles en marque blanche.',
    customerSteps: [
      {
        step: '01',
        badge: 'Entretien sans Connexion',
        title: 'Dicter ou Saisir l’Histoire & Consigner le Consentement',
        detail:
          'Les clients ouvrent votre lien /intake à votre marque sur leur téléphone, acceptent les conditions média et droit à l’image, puis racontent leur histoire sans créer de compte.',
        linkLabel: '/intake · Brief Voix & Texte Marque Blanche',
        phoneHeadline: 'Mémoire Familiale Harbor',
        phoneStatus: 'Consentement Enregistré · Brouillon Blueprint Prêt',
        phoneMeta: 'Zéro connexion client · Plafond producteur : 2 500 cr',
      },
      {
        step: '02',
        badge: 'Blueprint Partagé & ARA',
        title: 'Valider les Temps Forts Avant Toute Dépense de Rendu',
        detail:
          'Affinez le rythme avec Audience Resonance sur ordinateur, puis envoyez un lien Blueprint en marque blanche pour recueillir retours et feu vert sur mobile.',
        linkLabel: '/blueprint/share · Validation Pré-Dépense',
        phoneHeadline: 'Revue Blueprint & Séquences',
        phoneStatus: '94 / 100 Audience Resonance · Approuvé',
        phoneMeta: 'Tour 1 sur 2 utilisé · Prêt pour la Continuité',
      },
      {
        step: '03',
        badge: 'Lien de Continuité Partagé',
        title: 'Envoyer des Photos Mobile (EXIF Purgé) & Verrouiller le Cast',
        detail:
          'Les clients ouvrent votre lien Continuité pour téléverser de vraies photos de famille, biens ou produits depuis leur galerie ou appareil photo et approuver Cast, Costumes & Décors.',
        linkLabel: '/share/continuity · Envoi Galerie & Appareil Photo',
        phoneHeadline: 'Continuité & Collecte Photos',
        phoneStatus: '6 Photos Clients Reçues · Cast & Décors Verrouillés',
        phoneMeta: 'EXIF GPS purgé automatiquement · Zéro entraînement IA',
      },
      {
        step: '04',
        badge: 'Screening Room Partagée',
        title: 'Projection Mobile à l’Image Près & Livraison Master',
        detail:
          'Les clients visionnent les prévisualisations doublées et montages 4K sur tout téléphone sans connexion, laissent des notes horodatées et approuvent le master final.',
        linkLabel: '/share/screening-room · Validation Finale',
        phoneHeadline: 'Screening Room de Première',
        phoneStatus: 'Master 4K Final Approuvé ✓',
        phoneMeta: 'Flux multilingues livrés · Fichiers bruts purgeables',
      },
    ],
    teamHeading: 'Poste de Commande Mobile Temps Réel pour Producteurs, Réalisateurs & PM',
    teamSubheading:
      'Faites avancer chaque production loin de votre bureau — avec une visibilité adaptée aux rôles entre administrateurs d’espace et Chefs de Projet assignés.',
    teamPillars: [
      {
        id: 'alerts',
        title: 'Notifications Web Push Instantanées',
        detail:
          'Soyez alerté à la seconde où un agent autonome termine un rendu, qu’un client initie un brief ou que de nouvelles photos de Continuité arrivent.',
        metric: 'Push Live + Boîte Réception',
      },
      {
        id: 'status',
        title: 'Suivi Jalons 5 Étapes & Cadence',
        detail:
          'Suivez Blueprint, Resonance, Continuité, Production et Screening Room ainsi que le rythme quotidien de production des scènes.',
        metric: 'Visibilité Cadence',
      },
      {
        id: 'budget',
        title: 'Solde Crédits & Plafonds Budgétaires Stricts',
        detail:
          'Surveillez les crédits studio disponibles, les plafonds par projet client et les enveloppes mensuelles par PM en temps réel.',
        metric: 'Garde-Fous Marge',
      },
      {
        id: 'links',
        title: 'Partage Natif de Liens Mobiles en 1 Clic',
        detail:
          'Diffusez vos liens Blueprint, Resonance, Envoi Continuité et Screening Room par SMS, WhatsApp, Slack ou e-mail.',
        metric: '4 Portails Partagés',
      },
    ],
    phoneHeaderBrand: 'SceneFlow Companion',
    phoneCreditsPill: '14 250 cr',
    phonePmBadge: 'PM Connecté',
    phoneVoiceBriefPill: 'Voix / Brief',
    phoneContinuitySlots: ['Cast ✓', 'Costumes ✓', 'Décors ✓', 'Accessoires ✓'],
    phoneMasterLabel: 'Master 4K',
    phoneStageBarLabels: ['Blueprint', 'Resonance', 'Continuité', 'Production', 'Projection'],
    phoneTeamAlertTitle: 'Nouvel Envoi Continuité Client',
    phoneTeamAlertBody: 'Elena a envoyé 6 photos d’archives · Touchez pour examiner et valider',
    phoneTeamBudgetLabel: 'Budget Crédits Projet',
    phoneTeamBudgetValue: '1 180 / 2 500 cr',
    phoneTeamPaceBadge: 'Dans les Temps · Sous Budget',
    installIosBadge: 'iOS Safari : Partager → Sur l’écran d’accueil',
    installAndroidBadge: 'Android / Chrome : Installer l’app en 1 clic',
    ctaPrimary: 'Démarrer Studio + PWA Mobile ($9)',
  },
}
