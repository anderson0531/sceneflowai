import type { StudioLandingCopy } from './types'

export const STUDIO_LANDING_COPY_IT: StudioLandingCopy = {
  heroDock: {
    tagline:
      'Crea coinvolgenti storie di vita da oltre 1 ora, ricostruzioni storiche e serie multi-episodio — oppure costruisci uno studio video ad alto margine. Progettato per una continuità long-form che gli strumenti IA short-form non riescono a sostenere.',
    primaryCta: 'Avvia Studio ($9)',
    businessCta: 'Esplora il Business Video',
    howItWorksCta: 'Scopri Come Funziona',
  },
  audienceGateway: {
    eyebrow: 'Un Solo Studio · Tre Modi per Vincere',
    title: 'Crea Mondi Originali.',
    titleAccent: 'O Costruisci un Business Video Redditizio.',
    subtitle:
      'SceneFlow unisce una troupe di produzione IA esperta alla regia conversazionale — dando potere a narratori indipendenti, creatori di serie e agenzie di produzione video per clienti.',
    cards: [
      {
        id: 'services',
        badge: 'Opportunità di Ricavo · 65–90% Margine Lordo',
        title: 'Attività di Servizi Video',
        description:
          'Inizia con film Express 4K Cinema consegnati in giornata a $149 e Memorie di Vita ad alto margine — poi aggiungi contratti mensili ricorrenti in Formazione, Immobiliare e Brand Film con piena proprietà commerciale.',
        highlights: [
          'Portali white-label senza login per Intake, Blueprint, Continuità e Screening Room',
          'Film Express 4K Cinema in giornata a $149 (~88% margine) e upgrade Full-Motion senza rifacimenti',
          'Anteprima Cinema doppiata e limiti rigidi di revisione prevengono costose riprese',
        ],
        ctaLabel: 'Esplora Modelli di Business e Margini',
        targetAnchor: 'video-services',
      },
      {
        id: 'aspiring',
        badge: 'Nessuna Scuola di Cinema né Prompting Richiesti',
        title: 'Narratori e Autori Emergenti',
        description:
          'Hai in mente una biografia, un romanzo o un canale tematico? Racconta la tua storia con parole quotidiane a voce o per iscritto e lascia che SceneFlow generi la tua base esperta di sceneggiatura e universo.',
        highlights: [
          'Base esperta istantanea per Serie, Blueprint e Sceneggiatura di Produzione',
          'Detta o scrivi modifiche in linguaggio naturale — zero sintassi da prompt',
          'Guarda la tua Anteprima Cinema doppiata — o esportala subito come film 4K Cinema',
        ],
        ctaLabel: 'Fai il Tour dello Studio in 4 Passi',
        targetAnchor: 'studio-tour',
      },
      {
        id: 'experienced',
        badge: 'Canali di Serie · Podcast · Pre-vis per Investitori',
        title: 'Creator e Registi Esperti',
        description:
          'Basta rigenerazioni a tentoni. Blocca volti ricorrenti, costumi per inquadratura, voci su misura e set nel tuo Continuity Vault — poi scala la produzione 10x con agenti autonomi.',
        highlights: [
          'Continuity Vault multi-episodio e controllo costumi per singola inquadratura',
          'Revisione esecutiva con Audience Resonance e FlowDirector',
          'Agenti autonomi realizzano 27+ scene e doppiaggi in 70+ lingue',
        ],
        ctaLabel: 'Scopri i 5 Superpoteri dello Studio',
        targetAnchor: 'five-superpowers',
      },
    ],
  },
  superpowers: {
    eyebrow: 'La Filosofia di Design di SceneFlow',
    title: 'Cinque Superpoteri di Studio.',
    titleAccent: 'Zero Manuali Tecnici.',
    subtitle:
      'Il video IA tradizionale ti costringe a destreggiarti tra strumenti scollegati e scrivere centinaia di prompt fragili. SceneFlow ti offre una base intelligente, regia naturale a voce o testo, revisione esecutiva e agenti autonomi.',
    watchClipLabel: 'Guarda Panoramica (30s)',
    pillars: [
      {
        id: 'baseline',
        number: '01',
        badge: 'Mai più Davanti a un Foglio Bianco',
        title: 'Generazione Automatica della Base Esperta',
        description:
          'Parti da un’idea semplice o da un’intervista narrativa. SceneFlow redige automaticamente una Bibbia di Serie strutturata, un Film Blueprint e una Sceneggiatura di Produzione — completi di archi dei personaggi, ambientazioni fedeli all’epoca e snodi drammatici.',
        outcomeTag: 'Serie · Blueprint · Sceneggiatura di Produzione',
        videoClipKey: 'comparison',
      },
      {
        id: 'dialog',
        number: '02',
        badge: 'Regia a Voce o Testo',
        title: 'Controllo Registico Totale via Dialogo Intelligente',
        description:
          'Dirigi come un regista, non come un prompt engineer. Parla o scrivi per rimodellare i momenti chiave, suddividere personaggi per fasce d’età (17, 32, 62 anni), scegliere il guardaroba esatto per inquadratura o rifinire ogni fotogramma.',
        outcomeTag: 'Zero Ingegneria di Prompt',
        videoClipKey: 'direction',
      },
      {
        id: 'review',
        number: '03',
        badge: 'Controllo Qualità Pre- e Post-Render',
        title: 'Audience Resonance & Revisione Video FlowDirector',
        description:
          'Audience Resonance valuta Serie, Blueprint e Sceneggiatura prima del render — poi FlowDirector analizza ogni scena video renderizzata dal punto di vista del Pubblico e del Regista, applicando correzioni in 1 clic tramite Shot Director su 20+ progetti clienti attivi.',
        outcomeTag: 'QA Video Pubblico + Regista · Fix Clip 1 Clic',
      },
      {
        id: 'agents',
        number: '04',
        badge: 'Scala Senza Intervento Manuale',
        title: 'Agenti Autonomi di Produzione Rapida',
        description:
          'Quando sceneggiatura e Anteprima Cinema doppiata convincono, avvia Audio Agent, Stills Agent, Clips Agent o i Production Agents completi per costruire decine di scene, autoriparare le riprese difettose e consegnare un master 4K Cinema o full-motion.',
        outcomeTag: '300+ Prompt Manuali Sostituiti',
        videoClipKey: 'agent',
      },
      {
        id: 'collaboration',
        number: '05',
        badge: 'Approvazione Clienti & Portata Globale',
        title: 'Link di Revisione, Screening Room & 70+ Lingue',
        description:
          'Condividi link browser puliti per approvare Blueprint, Sceneggiatura e tagli al fotogramma nella Screening Room — poi distribuisci flussi localizzati in oltre 70 lingue mentre dirigi in 14 lingue native dell’interfaccia Studio.',
        outcomeTag: 'Link Condivisi · Screening Room · 70+ Doppiaggi',
        videoClipKey: 'publish',
      },
    ],
    microVisuals: {
      baseline: {
        intakePrompt: 'Intervista iniziale: «Raccontami la tua storia…»',
        autoBadge: 'Auto-Generato in Pochi Secondi',
        steps: [
          { step: '1 · Bibbia di Serie', detail: 'Arco 6 Ep. + Vault Condiviso' },
          { step: '2 · Film Blueprint', detail: 'Snodi Chiave + Cast Multi-Età' },
          { step: '3 · Sceneggiatura', detail: 'Dialoghi, Costumi e Camera' },
        ],
      },
      dialog: {
        quote:
          '«Dividi John in 17, 32 e 62 anni — e fai indossare a Elara il soprabito di seta da gala nell’Inquadratura 2.»',
        chipCast: '✓ 3 Schede Età Bloccate',
        chipWardrobe: '✓ Inq. 2 Costume: Soprabito da Gala',
      },
      review: {
        arLabel: 'Audience Resonance + FlowDirector',
        arStatus: 'Verifiche Pre-Render + QA Video Scena',
        gateSeries: 'Serie 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: 'Scena AR 86→89',
        flowDirectorNote:
          'FlowDirector QA Video: Pubblico AR 86 + Regista 81 → fix in 1 clic ricrea la clip (+3 AR)',
      },
      agents: {
        rows: [
          { label: 'Audio Agent · Voci, SFX e Musica', status: '27 / 27 Pronti' },
          { label: 'Stills Agent · Keyframe di Continuità', status: '100% Bloccato' },
          { label: 'Clips Agent · Movimento Autoriparato', status: 'Auto-Verificato' },
        ],
      },
      collaboration: {
        approvedBadge: 'Approvato ✓',
        dubsChip: '+70 Lingue',
      },
    },
  },
  videoServices: {
    eyebrow: 'Servizi di Consegna Video · Operatori Indipendenti & Agenzie',
    title: 'Offri Valore Produttivo da $1,500+ a un',
    titleAccent: 'Costo di Produzione Inferiore del 50%–80%',
    subtitle:
      'Troupe tradizionali e 30 ore di montaggio manuale tagliano fuori il 90% di famiglie, agenti immobiliari e imprese locali. Parti dalle Memorie di Vita tramite partner locali — poi aggiungi contratti B2B ricorrenti tagliando del 50%–80% il costo completo (calcolo + ore PM).',
    commercialRightsBadge: '100% Proprietà Commerciale · Portali White-Label (Pro+)',
    costSavingsPillLabel: 'Memorie di Vita di Punta + Contratti B2B Ricorrenti',
    verticalsHeading: '1. Parti con l’Offerta di Punta — Poi Espandi in Contratti Ricorrenti',
    globalDemandLabel: 'Enorme Opportunità di Mercato Globale',
    whoBuysLabel: 'Chi Acquista Ripetutamente',
    partnerChannelsLabel: 'Partner Segnalatori Senza Budget Pubblicitario',
    marginAdvantageLabel: 'Vantaggio di Margine e Ambito SceneFlow',
    calculatorBadge: 'Calcolatore Costi e Margini per Pacchetto',
    calculatorTitle: '2. Metti alla Prova Costi di Consegna e Profitto Mensile',
    priceTierLabel: 'Livello pacchetto cliente:',
    priceTierNames: ['Express 4K Cinema', 'Full-Motion Cinema', 'Signature 4K'],
    tierScopePrefix: 'Ambito del pacchetto:',
    volumeLabel: 'Consegne clienti / mese:',
    projectsPerMonthSuffix: 'progetti/mese',
    projectsUnitLabel: 'progetti',
    stressTestToggleLabel: 'Stress-test: Avvio Mese 1 + Piano Pro ($149/mese)',
    stressTestOnBadge: 'ATTIVO',
    stressTestOffBadge: 'DISATTIVO',
    stressTestActiveNote:
      'Modalità prudente attiva: +60% ore PM iniziale, +30% margine calcolo per rifacimenti e piano Operator Pro da $149/mese (include 10.000 crediti base/mese + 150 GB Vault).',
    proPlanLineLabel: 'Piano Pro ($149/mese) + calcolo extra',
    proPlanCreditsIncludedNote: ' (10k cr incl.)',
    perProjectProfitLabel: 'Profitto servizio / progetto',
    traditionalMarketLabel: 'Tariffa tipica di mercato',
    typicalFeeLabel: 'Tuo prezzo al cliente',
    fullyLoadedCostLabel: 'Costo di consegna / progetto',
    costBreakdownSubLabel: 'Crediti + tempo PM',
    estComputeLabel: 'Calcolo (incl. 20% buffer rifacimenti)',
    activeHandsOnLabel: 'Tempo operatore / PM (@$50/ora)',
    monthlyGrossLabel: 'Fatturato Mensile Stimato',
    monthlyNetLabel: 'Profitto Mensile Stimato (al netto di calcolo e PM)',
    perMonthSuffix: '/ mese',
    marginBadgeSuffix: 'margine di servizio',
    disclaimer:
      'Il costo per pacchetto include il calcolo SceneFlow ($0.01/credito con 20% buffer rifacimenti) più il tempo operatore/PM valorizzato a $50/ora. Attiva lo Stress-Test sopra per includere il rodaggio iniziale e il piano Pro ($149/mese); esclusi costi commerciali locali.',
    launchBusinessCta: 'Crea il Tuo Primo Film Demo ($9)',
    launchBusinessSubnote:
      'Usa il pacchetto Explorer da $9 per produrre un campione portfolio senza filigrana per partner locali — poi passa a Pro ($149/mese) per Portali Clienti 100% White-Label.',
    foundingCharterCta:
      'Stai lanciando uno studio clienti ora? Scopri la Carta Operatori Fondatori (25 posti)',
    foundingCharterTitle: 'Carta Pro 90 Giorni per Operatori Video Fondatori',
    trustShieldHeading: 'Scudo Aziendale per Margine, Privacy e Proprietà Commerciale',
    trustShieldPillars: [
      {
        title: 'Portali White-Label Senza Login (Pro+)',
        detail:
          'I clienti revisionano con il nome, il logo e i colori del tuo studio, senza login SceneFlow né prezzi in crediti visibili.',
      },
      {
        title: 'Express 4K Cinema & Barriera Full-Motion',
        detail:
          'Consegna fotogrammi 4K fotorealistici con movimenti di camera, voci clonate, SFX e colonna sonora come master pronto in giornata ($149–$249) — oppure usa quel taglio doppiato come filtro di approvazione prima della spesa Full-Motion.',
      },
      {
        title: 'Foto e Storie dei Clienti 100% Private',
        detail:
          'Archivi familiari e file B2B restano strettamente privati — mai usati per addestrare modelli IA pubblici — con rimozione automatica GPS EXIF e consenso all’immagine registrato.',
      },
    ],
    playbooksBadge: 'Starter Kit «Service-in-a-Box» Inclusi',
    playbooksHeading: 'Playbook Operativi, Listini e Template Partner Pronti all’Uso',
    playbooksSubtitle:
      'Supera subito la partenza a freddo con procedure verticali collaudate integrate direttamente in SceneFlow Studio:',
    playbooksItems: [
      'Biografo IA & Guide di Intervista in 70+ Lingue di Film (14 Lingue Native dell’Interfaccia Portale)',
      'Listini a 3 Livelli & Calcolatore Integrato del Margine Minimo',
      'Scheda Proposta Partner al 20% (Residenze Senior, Onoranze Funebri e Immobiliare)',
      'Registro Integrato di Consenso Media, Somiglianza Multi-Età e Voce',
    ],
    blueprintFlywheel: {
      badge: 'Discovery Automatica a 0 Min PM · 83% Margine Netto',
      title: 'Genera Ricavi Automatici Prima Ancora che un PM Tocchi il Progetto',
      subtitle:
        'I clienti faticano a scrivere un film partendo da zero — ma reagiscono benissimo a una bozza illustrata e narrata. SceneFlow trasforma l’onboarding in un Blueprint Pass autofinanziato e collaborativo che genera margine anche sui lead in pausa.',
      cards: [
        {
          tag: 'Pass $29 + Ricariche $19 · 0 Min PM',
          title: 'Blueprint Pass Autofinanziato & Pacchetti Iterazioni Extra',
          detail:
            'I clienti pagano $29 in anticipo per ricevere storyboard illustrati, narrazione multilingue e punteggio Audience Resonance in ~3 minuti (~83% di margine anche se si fermano) — più pacchetti self-service da $19 (+3 revisioni / +2 AR) quando desiderano altri giri.',
        },
        {
          tag: 'Bozza 1 Rapida e Autentica',
          title: 'Chip Memoria, Controllo Rapido & Anti-Finzione',
          detail:
            'Chip cliccabili per traguardi verticali (matrimoni, promozioni, sport, risultati, ambienti) e un controllo voce/testo da 15 s raccolgono subito persone ed eventi chiave, mentre rigide protezioni documentali non inventano mai dettagli biografici.',
        },
        {
          tag: 'Condivisione a Due Livelli & Filtro',
          title: 'Link Solo Commenti per Famiglia/Team & Controllo Cliente Principale',
          detail:
            'Il cliente riceve un Portale Regista privato e condivide un link solo commenti con famiglia o colleghi. Gli ospiti ascoltano in 70+ lingue di film (con interfaccia portale nativa in 14 lingue) e commentano senza bruciare round né approvare; il cliente principale filtra note + consigli AR in 1 aggiornamento IA che rigenera audio e storyboard.',
        },
        {
          tag: 'Assegnazione PM Differita',
          title: 'PM Assegnato Solo all’Approvazione + Funnel Blueprint',
          detail:
            'Zero ore PM finché il cliente non clicca Approva Blueprint. Monitora lead Attivi, Fermi >48h / >7g o con Round Esauriti nel Funnel Blueprint con promemoria white-label in 1 clic, bonus +3 iterazioni e ricavi pass automatici.',
        },
      ],
    },
    agencyScaleOps: {
      badge: 'Scala Agenzia Multi-PM · Centinaia di Progetti Clienti',
      title: 'Centro Operativo d’Agenzia, Integrato Direttamente nello Studio',
      subtitle:
        'Scala da operatore singolo ad agenzia video globale multi-PM senza fogli di calcolo, ore commerciali sprecate, erosione di margini o archiviazione gonfia.',
      pillars: [
        {
          title: 'Funnel Blueprint, Kanban & Avvisi SLA',
          detail:
            'Separa i Blueprint Pass automatici dalla produzione attiva — individua Blueprint non approvati (>48h/7g) e round esauriti con email white-label di sollecito in 1 clic e crediti +3 iterazioni.',
        },
        {
          title: 'CRM Clienti, Ricavi Pass & Scorecard PM',
          detail:
            'Aggrega automaticamente Blueprint Pass da $29, pacchetti da $19 e ordini completi monitorando consumo crediti per PM, tempi di consegna e margine lordo reale.',
        },
        {
          title: 'Instradamento PM Differito & Isolamento Workspace',
          detail:
            'Mantieni i Blueprint Pass senza intervento umano, assegna automaticamente i PM per lingua solo all’approvazione, delega le Bibbie di Serie e isola i team con Revisori QA a 0 crediti.',
        },
        {
          title: 'Scala Illimitata & Pulizia Bozze in 1 Clic',
          detail:
            'Ricerca lato server e azioni PM massive su centinaia di progetti, più Archivia e Svuota Bozze Intermedie in 1 clic mantenendo intatti i master finali.',
        },
      ],
    },
    workflowHeading: 'Come Procede un Progetto Cliente White-Label in 4 Semplici Passi',
    stepPrefix: 'Passo',
    workflowSteps: [
      {
        step: '01',
        title: 'Intake Guidato Autofinanziato da $29',
        detail:
          'I clienti acquistano il tuo Blueprint Pass da $29, toccano chip Memoria verticali, raccontano la storia a voce o per iscritto con consenso obbligatorio e completano un Controllo Rapido di 15 s con rigorosa fedeltà fattuale.',
      },
      {
        step: '02',
        title: 'Blueprint Vivo, Filtro Familiare & Auto-Revisioni',
        detail:
          'In ~3 minuti ricevono storyboard illustrati, audio multilingue e punteggio AR, condividono un link solo commenti con famiglia/team, filtrano le note in revisioni IA (o aggiungono pacchetti da $19) e cliccano Approva per assegnare il PM.',
      },
      {
        step: '03',
        title: 'Caricamento Foto Mobile, Pronuncia & Blocco Continuità',
        detail:
          'I clienti caricano foto reali dal telefono (GPS EXIF rimosso), aggiungono una guida di pronuncia da 10 s per nomi/luoghi e approvano Cast multi-età, Costumi e Set entro i round inclusi.',
      },
      {
        step: '04',
        title: 'Consegna Express 4K in Giornata o Screening Room Full-Motion',
        detail:
          'Attiva il rilascio PM supervisionato in 1 tocco (o pilota automatico) nella Screening Room senza login. L’approvazione del cliente avvia in automatico il render master 4K e invia il link di download — aggiornabile a Full-Motion senza rifacimenti.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Memorie Video',
        roleTag: '★ Servizio di Punta ad Alto Margine',
        badge: '$149–$1,250 / film · Tariffa mercato: $1,200–$4,500+',
        title: 'Storie di Vita, Ricostruzioni da 1+ Ora & Biografie Familiari Multi-Episodio',
        description:
          'Inizia con un Lungometraggio o una Serie a Episodi Express 4K in Giornata da $149 (fino a 60 min / 360 fotogrammi diretti + trailer da 1–3 min) che ricrea capitoli non filmati con persone, luoghi, cultura e storia fedeli all’epoca — oppure passa senza rifacimenti a ricostruzioni Full-Motion multi-età (17 → 32 → 62 anni).',
        globalMarketNeed:
          'Centinaia di milioni di genitori anziani, nozze d’oro e celebrazioni di vita avvengono ogni anno nel mondo — eppure oltre il 90% resta senza film perché le troupe da $2,000+ costano troppo o richiedono settimane.',
        clientBuyer:
          'Famiglie che festeggiano compleanni importanti, nozze d’oro, pensionamenti e tributi commemorativi',
        partnerChannels:
          'Consulenti patrimoniali, residenze senior, agenzie funebri e organizzatori di eventi (modello segnalazione 15–20%)',
        traditionalMarketRangeLabel: '$1,200–$4,500+',
        typicalRetailUsd: 599,
        priceTiersUsd: [149, 599, 1250],
        tierScopeLabels: [
          'Lungometraggio o Serie Express 4K (fino a 60 min / 360 fotogrammi · In giornata) + Trailer 1–3 min · Ricostruzioni con Età Bloccata, Voci & Musica',
          'Documentario di Vita Ibrido Full-Motion 30–60 min o Serie in 4 Episodi · Ricostruzioni d’Epoca Multi-Età · 2 Lingue',
          'Lungometraggio Signature 60–150 min o Serie Eredità in 6–8 Episodi · Epoche Full-Motion 4K, Contesto Culturale & Ricordi Bloccati · 4 Lingue',
        ],
        computeTiersUsd: [6, 34, 72],
        operatorTiersUsd: [12, 88, 150],
        activeTimeTiersLabels: ['~15 min', '~1,75 ore', '~3,0 ore'],
        retailRangeLabel: '$149–$1,250',
        estComputeUsd: 34,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1,75 ore',
        keyAdvantage:
          'Scala valore a 3 gradini: Blueprint Pass $29 → Express 4K Cinema in giornata $149 (~$18 costo totale, ~88% margine) → upgrade Full-Motion da $599+ senza rifacimenti.',
      },
      {
        id: 'realestate',
        tabLabel: 'Tour Immobiliari',
        roleTag: '↻ Contratto Ricorrente Agenzie',
        badge: '$149–$549 / immobile · Tariffa mercato: $450–$1,500+',
        title: 'Tour Narrati per Immobili di Lusso & Boutique Hotel',
        description:
          'Trasforma fotografie di annunci e punti di forza del quartiere in film Express 4K in giornata da $149 o tour Full-Motion — con versioni istantanee in mandarino, spagnolo, arabo o portoghese per acquirenti internazionali.',
        globalMarketNeed:
          'Decine di milioni di annunci residenziali, affitti brevi e boutique hotel competono ogni mese per acquirenti locali ed esteri affidandosi ancora a sole foto statiche.',
        clientBuyer:
          'Agenti immobiliari top, agenzie di lusso, affitti vacanza e boutique hotel',
        partnerChannels:
          'Studi fotografici immobiliari, team di home staging, broker di lusso e marketer dell’ospitalità',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [149, 299, 549],
        tierScopeLabels: [
          'Film Annuncio Express 4K (90s · In giornata) · Frame 4K animati + Voce e Musica · 1 Lingua',
          'Tour Proprietà Full-Motion 2 min · Upscale 4K + 2 Lingue',
          'Film Dimora di Lusso 3 min + Reel 9:16 · 4 Lingue Internazionali',
        ],
        computeTiersUsd: [5, 15, 28],
        operatorTiersUsd: [10, 50, 88],
        activeTimeTiersLabels: ['~12 min', '~1,0 ora', '~1,75 ore'],
        retailRangeLabel: '$149–$549',
        estComputeUsd: 15,
        estOperatorUsd: 50,
        activeMinutesLabel: '~1,0 ora',
        keyAdvantage:
          'Alto volume ricorrente per broker: consegna film Express 4K in giornata a $149 (~$15 costo, ~90% margine) o contratti Full-Motion mensili senza trasferte.',
      },
      {
        id: 'training',
        tabLabel: 'Formazione & SOP',
        roleTag: '↻ Contratto B2B Ricorrente',
        badge: '$249–$1,800 / modulo · Tariffa mercato: $1,500–$5,000+',
        title: 'Onboarding Aziendale, Sicurezza & Corsi Multilingue',
        description:
          'Blocca un istruttore coerente, divise e ambienti di lavoro nel tuo Continuity Vault — poi consegna in giornata SOP narrate Express 4K a $249 o corsi Full-Motion localizzati in oltre 70 lingue aziendali.',
        globalMarketNeed:
          'Ogni azienda manifatturiera, rete clinica, gruppo alberghiero o franchising affronta turnover operativo, conformità alla sicurezza e team multilingue bisognosi di video SOP chiari.',
        clientBuyer:
          'Responsabili HR & L&D, aziende industriali, reti sanitarie, ristorazione e franchising',
        partnerChannels:
          'Consulenti HR frazionati, auditor sicurezza sul lavoro, integratori LMS e associazioni di franchising',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [249, 950, 1800],
        tierScopeLabels: [
          'SOP Narrata Express 4K (5 min · In giornata) · Istruttore fisso + Voce clonata & SFX · 1 Lingua',
          'Corso Sicurezza / Onboarding Full-Motion 10 min · 3 Lingue Team',
          'Programma Multi-Capitolo 20 min · 6+ Lingue Team',
        ],
        computeTiersUsd: [9, 40, 78],
        operatorTiersUsd: [18, 125, 210],
        activeTimeTiersLabels: ['~20 min', '~2,5 ore', '~4,2 ore'],
        retailRangeLabel: '$249–$1,800',
        estComputeUsd: 40,
        estOperatorUsd: 125,
        activeMinutesLabel: '~2,5 ore',
        keyAdvantage:
          'Contratti B2B fidelizzati: lancia SOP Express 4K in giornata a $249 (~$27 costo, ~89% margine) o corsi multilingue da $950+, aggiornando le normative in pochi minuti.',
      },
      {
        id: 'brand',
        tabLabel: 'Storie di Brand',
        roleTag: '↻ Pacchetto Ricorrente PMI & Agenzie',
        badge: '$199–$1,200 / pacchetto · Tariffa mercato: $3,000–$8,000+',
        title: 'Film dei Fondatori, Explainer per Cliniche & Annunci Social',
        description:
          'Realizza in giornata Brand Film Express 4K a $199 o storie fondatori Full-Motion per homepage con trailer verticali 9:16 automatici per Instagram, TikTok e YouTube Shorts — approvati nella Screening Room.',
        globalMarketNeed:
          'Oltre 30 milioni di cliniche, studi legali, ristoranti e fondatori locali nel mondo hanno bisogno urgente di video di fiducia per homepage e inserzioni 9:16 — ma restano esclusi dai set d’agenzia da $5,000+.',
        clientBuyer:
          'Studi medici/dentistici, studi legali, PMI locali, web agency e fondatori e-commerce',
        partnerChannels:
          'Web agency locali, agenzie SEO/performance ads, camere di commercio e consulenti medico-dentistici',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [199, 650, 1200],
        tierScopeLabels: [
          'Brand Film Express 4K (90s · In giornata) · Frame 4K animati + Voce e Musica · Master 4K auto',
          'Film Fondatore Full-Motion 2 min + 2 Tagli Social 9:16',
          'Brand Film Signature + 4 Varianti Hook Pubblicitari Multilingue',
        ],
        computeTiersUsd: [7, 28, 56],
        operatorTiersUsd: [15, 88, 150],
        activeTimeTiersLabels: ['~18 min', '~1,75 ore', '~3,0 ore'],
        retailRangeLabel: '$199–$1,200',
        estComputeUsd: 28,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1,75 ore',
        keyAdvantage:
          'Produzione white-label per web e ad agency locali — Brand Film Express 4K a $199 in giornata (~$22 costo, ~89% margine) o pacchetti Full-Motion a $650 con tagli 9:16.',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'Tour Visivo dello Studio · Senza Gergo Tecnico',
    title: 'Quattro Sale Connesse.',
    titleAccent: 'Un Flusso Senza Sforzo.',
    subtitle:
      'Conosci le 4 porte dello Studio in 60 secondi — Series Room, Blueprint Room, Production Stage e Screening Room — prima di provarle dal vivo nei 6 Esempi di Produzione completi qui sotto.',
    stepPrefix: 'Passo',
    lensLabel: 'Vista anteprima:',
    lensCreator: 'Serie Originale («The Glass Ledger»)',
    lensService: 'Servizio Clienti («Memoria di Vita»)',
    watchRoomVideoLabel: 'Guarda Tour Sala (30s)',
    inspectFullScreenLabel: 'Esplora Schermata Studio Completa',
    openLiveScreeningLabel: 'Apri Screening Room Interattiva',
    screeningModalTitle: 'The Glass Ledger — Screening Room Dimostrativa',
    examplesBridgeText:
      'Ora che conosci le 4 porte dello Studio, provale dal vivo attraverso 6 generi completi:',
    examplesBridgeCta: 'Prova le 4 Porte negli Esempi di Produzione',
    rooms: [
      {
        id: 'series-desk',
        stepNumber: '01',
        tabLabel: 'Series Room',
        badge: 'Universo Multi-Episodio & Bibbia di Continuità',
        title: 'Costruisci un Universo Riutilizzabile una Volta — Non una Singola Clip',
        promise:
          'Descrivi un canale di serie, un piano formativo o una biografia a capitoli una sola volta. SceneFlow crea Bibbia della Storia, Scaletta Episodi e Reference Library condivisa così ogni episodio resta coerente.',
        creatorExampleTitle: 'The Glass Ledger · Thriller Neo-Noir in 6 Episodi',
        creatorExampleNote:
          'Cast condiviso (Elara Vance, Marcus Thorne, Dr. Aris Kael), set Archive Vault e oggetto Quartz Codex bloccati in tutti i 6 episodi con base Audience Resonance 91/100.',
        serviceExampleTitle: 'Eredità Familiare a Capitoli o Programma Aziendale',
        serviceExampleNote:
          'Salva una volta i presentatori approvati, le epoche familiari o le sedi aziendali del cliente — poi avvia dall’Episodio 2 al 10 in un clic senza derive visive.',
        callouts: [
          {
            label: 'Base Serie Istantanea & Punteggio Audience Resonance',
            detail:
              'Genera automaticamente sinossi, archi degli episodi e punteggio Audience Resonance prima della produzione.',
          },
          {
            label: 'Reference Library Condivisa',
            detail:
              'Personaggi, voci, costumi, set e oggetti di scena si trasferiscono automaticamente in ogni episodio.',
          },
          {
            label: 'Regista di Serie a Voce o Testo',
            detail:
              'Parla o scrivi per rimodellare archi stagionali o singoli episodi senza fatica.',
          },
        ],
        visuals: {
          topBadge: 'Serie AR: 91 / 100 · 6 Episodi Sincronizzati',
          bottomBadge: 'Reference Library Condivisa Bloccata su Tutti gli Episodi',
          thumbLabels: [
            'Elara Vance · Protagonista',
            'Marcus Thorne · Cast',
            'Archive Vault · Set',
            'Quartz Codex · Oggetto',
          ],
        },
      },
      {
        id: 'blueprint-board',
        stepNumber: '02',
        tabLabel: 'Blueprint Room',
        badge: 'Intervista Narrativa, Cast Multi-Età & Via Libera',
        title: 'Blocca una Storia Coinvolgente e il Cast Prima di Spendere in Video',
        promise:
          'Parti da un’intervista naturale o un’idea. La Blueprint Room struttura i beat narrativi, evidenzia i personaggi per ogni momento, blocca l’identità multi-età e consente la firma via link condiviso.',
        creatorExampleTitle: 'Trattamento Beat-per-Beat & Stile Visivo Bloccato',
        creatorExampleNote:
          'Ogni beat abbina intento drammatico, personaggi presenti, regole di luce anamorfica e feedback narrato di Audience Resonance.',
        serviceExampleTitle: 'Blueprint Pass $29 a Zero Ore PM & Filtro Commenti Famiglia',
        serviceExampleNote:
          'Chip Memoria e anti-finzione consegnano una Bozza 1 illustrata e narrata in ~3 minuti. I clienti condividono un link solo commenti con la famiglia, filtrano note + consigli AR in revisioni IA (con audio e storyboard aggiornati) e attivano il PM solo all’Approvazione.',
        callouts: [
          {
            label: 'Intake Chip Memoria & Anti-Finzione',
            detail:
              'Chip verticali e Controllo Rapido da 15 s a voce/testo catturano persone ed epoche reali senza mai inventare fatti biografici.',
          },
          {
            label: 'Condivisione Famiglia/Team a Due Livelli & Filtro',
            detail:
              'Gli ospiti ascoltano in 70+ lingue di film (14 lingue native UI) e commentano senza consumare round né approvare; il cliente principale filtra le note in 1 revisione IA pulita.',
          },
          {
            label: 'Audio e Storyboard Aggiornati + Ricariche da $19',
            detail:
              'Ogni iterazione re-illustra i capitoli modificati, rigenera la voce narrante, ricalcola Audience Resonance e offre pacchetti +3 iterazioni self-service.',
          },
        ],
        visuals: {
          topBadge: 'Blueprint AR: 92 / 100 · Cast Evidenziato per Beat',
          bottomBadge: 'Continuità Multi-Età + Link Approvazione Cliente Condiviso',
          thumbLabels: [
            'Arco Protagonista',
            'Dr. Aris Kael · Beat 2',
            'Molo del Porto · Atto II',
            'Chiave Crono · Oggetto Chiave',
          ],
        },
      },
      {
        id: 'production-stage',
        stepNumber: '03',
        tabLabel: 'Production Stage',
        badge: 'Shot Director, Controllo Costumi & Agenti Autonomi',
        title: 'Guarda il Taglio Cinema Doppiato — Esporta in 4K o Passa a Full-Motion',
        promise:
          'Rivedi la Sceneggiatura di Produzione, blocca i riferimenti di continuità, guarda il taglio Cinema fotorealistico animato con voci clonate, SFX e musica — consegnalo subito come Express 4K Cinema in giornata o lascia agli agenti autonomi le riprese full-motion.',
        creatorExampleTitle: 'Scena 1: Archive Vault Sotterraneo · 4K Anamorfico',
        creatorExampleNote:
          'Cambia il guardaroba di Elara per inquadratura, dirigi la camera a voce o testo, mixa dialoghi/SFX/musica in Production Mixer e avvia i Production Agents.',
        serviceExampleTitle: 'Express 4K Cinema in Giornata ($149) o Upgrade Ibridi Full-Motion',
        serviceExampleNote:
          'Consegna un film Express 4K narrato in poche ore (~$6 di calcolo) o aggiungi ricostruzioni IA full-motion per ricordi senza foto — mantenendo una memoria full-motion da 12 min intorno a ~$34 di calcolo.',
        callouts: [
          {
            label: 'Costumi per Inquadratura & Shot Director Voce/Testo',
            detail:
              'Scegli abiti esatti per ogni inquadratura e rifinisci tagli o espressioni dialogando — basta tentativi casuali.',
          },
          {
            label: 'Master Express 4K Cinema & Barriera Movimento',
            detail:
              'Ascolta dialoghi clonati, narrazione, SFX e colonna sonora su frame 4K animati in continuità — pronti da esportare a $149 o da approvare prima della spesa full-motion.',
          },
          {
            label: 'Audio Agent, Stills Agent & Clips Agent Autonomi',
            detail:
              'Genera scena per scena oppure avvia i Production Agents completi per costruire e montare automaticamente.',
          },
        ],
        visuals: {
          topBadge: 'Shot Director · Costume Scelto · Taglio Express 4K Pronto',
          bottomBadge: 'Audio Agent, Stills Agent & Clips Agent Orchestrano Tutte le Scene',
          thumbLabels: [
            'Inq. 1 · Campo Lungo Vault',
            'Inq. 3 · Macro Oggetto',
            'Scena 2 · Consegna',
            'Scena 3 · Carrellata',
          ],
        },
      },
      {
        id: 'screening-room',
        stepNumber: '04',
        tabLabel: 'Screening Room',
        badge: 'Revisione al Fotogramma, 70+ Lingue & Pubblicazione',
        title: 'Collabora via Link Privato & Distribuisci Globalmente in Ogni Lingua',
        promise:
          'Visiona tagli Express 4K Cinema, premontati e master 4K full-motion in un unico player. L’approvazione del cliente può avviare automaticamente il render 4K e inviare il link via email — più 70+ tracce doppiate in scena.',
        creatorExampleTitle: 'Master da Anteprima, Trailer Promo & Doppiaggi Globali',
        creatorExampleNote:
          'Taglia automaticamente trailer verticali 9:16, genera dialoghi localizzati per 70+ mercati e pubblica su YouTube o candidati a SceneFlow Originals.',
        serviceExampleTitle: 'Revisione Clienti Senza Attriti & Consegna Multilingue',
        serviceExampleNote:
          'I clienti guardano da telefono o desktop senza alcun login, lasciano note con timecode e ricevono MP4 impeccabili nella lingua della propria famiglia o forza lavoro.',
        callouts: [
          {
            label: 'Link di Revisione Condivisi Senza Login',
            detail:
              'Invia link privati `/share/screening-room/` per un’approvazione immediata di clienti, dirigenti o familiari.',
          },
          {
            label: 'Flussi Sincronizzati in Scena in 70+ Lingue',
            detail:
              'Preserva effetti ambientali e colonna sonora allineando voci e dialoghi localizzati per i mercati internazionali.',
          },
          {
            label: 'Export Master 4K & Tagli Promozionali',
            detail:
              'Scarica master commerciali puliti con piena proprietà IP o pubblica trailer direttamente sui canali social.',
          },
        ],
        visuals: {
          topBadge: 'Note al Fotogramma · Link Cliente Senza Login',
          bottomBadge: 'Interfaccia Studio Multilingue · 70+ Flussi Doppiati in Scena',
          thumbLabels: [
            'EN · Master Originale',
            'IT / ES · Doppiaggio Sync',
            'ZH / TH / HI · Flussi',
            'Cutdown Promo 9:16',
          ],
        },
      },
    ],
  },
  useCaseDirectory: {
    viewByUseCaseLabel: 'Esplora per Caso d’Uso',
    viewByRoomLabel: 'Esplora per Sala dello Studio',
    tracks: [
      {
        id: 'memoir-services',
        tabLabel: 'Memorie Video & Eredità Familiare',
        badge: 'Servizio Clienti di Punta · $149–$1,250/Film',
        headline: 'Trasforma Interviste di Famiglia & Foto d’Archivio in Cinema di Famiglia',
        description:
          'Raccogli una storia di vita in oltre 70 lingue di film, rifinisci e ringiovanisci i ritratti in Character Selfie Studio dagli anni ’70 a oggi, avvia i Production Agents autonomi, applica fix in 1 clic con FlowDirector e consegna via link Screening Room senza login.',
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
        tabLabel: 'Agenzie 20 Progetti & Video Formazione',
        badge: '20+ Progetti Paralleli · Production Agent Unificato + QA FlowDirector',
        headline: 'Gestisci 20 Progetti Clienti Paralleli al 50%–80% di Costo in Meno con Automazione',
        description:
          'Avvia portali white-label e tetti crediti PM, verifica margini netti su Blueprint condivisi, lancia il Production Agent unificato su Audio Pre-Vis, Keyframe Stills, Clip in Movimento e Render Scena MP4 con recupero autoriparante [Investigate], revisiona in FlowDirector e consegna 70+ lingue.',
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
        tabLabel: 'Serie Episodiche & Animazione Stilizzata',
        badge: 'IP Multi-Episodio · Direzione Artistica & Cast Bloccati',
        headline: 'Gestisci un’Intera Bibbia da Showrunner dall’Episodio 1 al Finale di Stagione',
        description:
          'Costruisci un arco stagionale multi-episodio, blocca direzione artistica fotorealistica o 3D stilizzata in ogni puntata, dirigi beat di storyboard e keyframe, e avvia il Production Agent unificato per clip cinema da 10s con fallback autoriparante Creative Kling AI F2V.',
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
        tabLabel: 'Canali YouTube & Podcast Narrativi',
        badge: 'Canali Faceless Alta Ritenzione · Show Multi-Voce',
        headline: 'Pubblica Episodi Narrativi Settimanali con Voci Studio, Musica & Rifinitura',
        description:
          'Testa gli hook di ritenzione prima del render, dirigi l’intesa tra più conduttori, spunti narrativi sincronizzati alle inquadrature e colonna sonora su misura, rifinisci mix a 4 stem e pubblica flussi 16:9 + 9:16 con OAuth in 1 clic.',
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
        tabLabel: 'Pre-Vis Registi & Trailer di Pitch',
        badge: 'Deck Greenlight · Cinema Proof-of-Concept',
        headline: 'Metti alla Prova la Sceneggiatura ed Entra nei Pitch con un Trailer Finito',
        description:
          'Scrivi insieme a FlowDirector, valuta il ritmo strutturale con Audience Resonance ai gate Blueprint e Sceneggiatura, condividi storyboard illustrati con stime di budget, formatta sceneggiature standard e monta trailer cinematografici proof-of-concept.',
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
    badge: 'Automazione Workflow & 39 Capacità Studio · Film Cinema Narrati WebM',
    title: 'Automatizza Produzione & QA Video Esperto su 20+ Progetti Paralleli',
    subtitle:
      'Ogni capacità include un film cinema narrato WebM pulito e ottimizzato per mobile. Scopri come Portali White-Label, Selfie Studio, fix 1 clic di FlowDirector e agenti autonomi sostituiscono oltre 300 prompt manuali.',
    expandCta: 'Esplora le 39 Capacità Studio Narrate',
    collapseCta: 'Nascondi Elenco Capacità Studio',
    automationEyebrow: 'Progettato per Creator ad Alto Volume & Studi Video da 20 Progetti',
    automationTitle:
      'Automazione End-to-End: Gli Agenti Costruiscono. FlowDirector Controlla e Corregge in 1 Clic.',
    automationSubtitle:
      'Smetti di seguire i prompt clip dopo clip. Gli agenti autonomi Audio, Stills, Clips e Production eseguono le scene in background mentre FlowDirector ispeziona ogni MP4 renderizzato per Audience Resonance e conformità registica — ricreando le clip segnalate via Shot Director in un clic.',
    spotlightFlowDirectorLabel: 'FlowDirector QA Video Scena',
    spotlightFlowDirectorMeta: 'Pubblico AR + Conformità Regista · Fix 1 Clic Ricrea le Clip',
    spotlightAgentsLabel: 'Production Agents Autonomi',
    spotlightAgentsMeta: '300+ Prompt Automatizzati · Autoriparazione su 20 Progetti Attivi',
    spotlightNarrated5kLabel: '39 Capacità · Film Cinema Narrati',
    spotlightNarrated5kMeta: 'Walkthrough WebM 16:9 + Narrazione Studio Multilingue',
  },
  academyStrip: {
    badge: 'Garanzia Curva di Apprendimento Zero · Studio Academy',
    title: 'Non Sentirti Mai Sopraffatto. Premi ? Ovunque per una Guida Visiva di 60 Secondi.',
    subtitle:
      'Ogni sala dello Studio include una Mappa Schermata Just-In-Time (JIT) con richiami numerati, azioni in un clic, protezioni crediti Pre-vis e il nostro simulatore interattivo «Il Tuo Primo Film in 10 Minuti».',
    pills: [
      'Mappe Schermata Contestuali ?',
      'Simulatore «Primo Film in 10 Min»',
      'Protezioni Crediti Pre-vis Integrate',
    ],
    watchAcademyCta: 'Guarda Tour Academy (30s)',
    startExplorerCta: 'Inizia con Explorer — $9',
  },
  mobileCompanion: {
    eyebrow: 'Link Clienti Senza Login + PWA Mobile Operatore · iOS & Android',
    title: 'Potenza da Studio Desktop.',
    titleAccent: 'Portali Mobili Immediati per Clienti e Team.',
    subtitle:
      'I clienti paganti non hanno mai bisogno di un account SceneFlow, di scaricare app o di abbonarsi — interagiscono tramite i tuoi link web mobile white-label, mentre tu e i tuoi Project Manager (PM) seguite avvisi, tappe e tetti crediti da una Mobile Companion PWA ad installazione istantanea.',
    whyPwaBadge: 'Zero Login Cliente · PWA Operatore Istantanea',
    whyPwaNote:
      'I clienti aprono link Safari/Chrome puliti con il tuo brand; operatori e PM installano la PWA Companion in un tocco con notifiche Web Push native.',
    modeCustomerTab: 'Flusso Cliente White-Label',
    modeTeamTab: 'Hub Operatore & PM (PWA)',
    customerHeading: 'Portali Mobili Senza Login con il Brand del Tuo Studio',
    customerSubheading:
      'I clienti paganti non vedono mai i prezzi in crediti SceneFlow né creano account — raccontano la storia, caricano foto e approvano attraverso quattro link mobile white-label.',
    customerSteps: [
      {
        step: '01',
        badge: 'Intake Senza Login',
        title: 'Racconta a Voce o Testo & Registra Consenso Immagine',
        detail:
          'I clienti aprono il tuo link /intake brandizzato sul telefono, accettano la liberatoria media e immagine e raccontano la loro storia senza creare alcun account.',
        linkLabel: '/intake · Brief Voce & Testo White-Label',
        phoneHeadline: 'Memoria Famiglia Harbor',
        phoneStatus: 'Consenso Registrato · Bozza Blueprint Pronta',
        phoneMeta: 'Zero login cliente · Tetto produttore: 2.500 cr',
      },
      {
        step: '02',
        badge: 'Blueprint Condiviso & ARA',
        title: 'Approva gli Snodi Narrativi Prima della Spesa Render',
        detail:
          'Rifinisci il ritmo con Audience Resonance su desktop, poi invia un link Blueprint white-label per feedback mobile e via libera del cliente.',
        linkLabel: '/blueprint/share · Approvazione Pre-Spesa',
        phoneHeadline: 'Revisione Blueprint & Beat',
        phoneStatus: '94 / 100 Audience Resonance · Approvato',
        phoneMeta: 'Round 1 di 2 usato · Pronto per Continuità',
      },
      {
        step: '03',
        badge: 'Link Continuità Condiviso',
        title: 'Carica Foto dal Telefono (Senza EXIF) & Blocca Cast',
        detail:
          'I clienti aprono il link Continuità per caricare foto reali di famiglia, immobili o prodotti dalla galleria o fotocamera e approvare Cast, Costumi e Set.',
        linkLabel: '/share/continuity · Caricamento Galleria & Camera',
        phoneHeadline: 'Continuità & Raccolta Foto',
        phoneStatus: '6 Foto Cliente Caricate · Cast & Set Bloccati',
        phoneMeta: 'EXIF GPS rimosso in automatico · Zero training IA',
      },
      {
        step: '04',
        badge: 'Screening Room Condivisa',
        title: 'Proiezione Mobile al Fotogramma & Consegna Master',
        detail:
          'I clienti guardano anteprime doppiate e tagli 4K su qualsiasi telefono senza login, lasciano note con timestamp e approvano il master finale.',
        linkLabel: '/share/screening-room · Approvazione Finale',
        phoneHeadline: 'Screening Room di Anteprima',
        phoneStatus: 'Master 4K Finale Approvato ✓',
        phoneMeta: 'Flussi multilingue consegnati · Upload grezzi eliminabili',
      },
    ],
    teamHeading: 'Comando Tascabile in Tempo Reale per Produttori, Registi & PM',
    teamSubheading:
      'Mantieni ogni produzione in movimento anche lontano dalla scrivania — con visibilità per ruolo tra amministratori workspace e Project Manager assegnati.',
    teamPillars: [
      {
        id: 'alerts',
        title: 'Notifiche Web Push Istantanee',
        detail:
          'Ricevi un avviso nell’istante in cui un agente autonomo completa un render, un cliente avvia un brief o arrivano nuove foto di Continuità.',
        metric: 'Push Live + Inbox',
      },
      {
        id: 'status',
        title: 'Tracker Tappe a 5 Fasi & Ritmo',
        detail:
          'Monitora l’avanzamento di Blueprint, Resonance, Continuità, Produzione e Screening Room più il ritmo giornaliero delle scene.',
        metric: 'Visibilità sul Ritmo',
      },
      {
        id: 'budget',
        title: 'Saldo Crediti & Tetti di Budget Rigidi',
        detail:
          'Controlla i crediti studio disponibili, i tetti per singolo progetto cliente e le soglie mensili per PM in tempo reale.',
        metric: 'Protezione Margini',
      },
      {
        id: 'links',
        title: 'Condivisione Link Mobile Nativa in 1 Tocco',
        detail:
          'Invia link Blueprint, Resonance, Caricamento Continuità e Screening Room via SMS, WhatsApp, Slack o Email.',
        metric: '4 Portali Condivisi',
      },
    ],
    phoneHeaderBrand: 'SceneFlow Companion',
    phoneCreditsPill: '14.250 cr',
    phonePmBadge: 'PM Connesso',
    phoneVoiceBriefPill: 'Voce / Brief',
    phoneContinuitySlots: ['Cast ✓', 'Costumi ✓', 'Location ✓', 'Oggetti ✓'],
    phoneMasterLabel: 'Master 4K',
    phoneStageBarLabels: ['Blueprint', 'Resonance', 'Continuità', 'Produzione', 'Proiezione'],
    phoneTeamAlertTitle: 'Nuovo Upload Continuità Cliente',
    phoneTeamAlertBody: 'Elena ha caricato 6 foto di famiglia · Tocca per rivedere e promuovere',
    phoneTeamBudgetLabel: 'Budget Crediti Progetto',
    phoneTeamBudgetValue: '1.180 / 2.500 cr',
    phoneTeamPaceBadge: 'In Linea · Sotto Budget',
    installIosBadge: 'iOS Safari: Condividi → Aggiungi alla schermata Home',
    installAndroidBadge: 'Android / Chrome: Installa App in 1 tocco',
    ctaPrimary: 'Inizia con Studio + PWA Mobile ($9)',
  },
}
