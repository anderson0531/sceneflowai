import type { StudioLandingCopy } from './types'

export const STUDIO_LANDING_COPY_NL: StudioLandingCopy = {
  heroDock: {
    tagline:
      'Regisseer originele films en series — of bouw een winstgevend videoproductiebedrijf. Geen filmopleiding of prompt-ervaring nodig.',
    primaryCta: 'Start Studio ($9)',
    businessCta: 'Ontdek Videobedrijf',
    howItWorksCta: 'Bekijk Hoe Het Werkt',
  },
  audienceGateway: {
    eyebrow: 'Eén Studio · Drie Manieren om te Winnen',
    title: 'Creëer Originele Werelden.',
    titleAccent: 'Of Bouw een Winstgevend Videobedrijf.',
    subtitle:
      'SceneFlow combineert een deskundige AI-productiecrew met natuurlijke spraak- en tekstregie — voor zelfstandige verhalenvertellers, seriemakers én zakelijke videostudio’s.',
    cards: [
      {
        id: 'services',
        badge: 'Inkomstenkans · 65–90% Bruto Servicemarge',
        title: 'Videoproductiebedrijven',
        description:
          'Start met $149 Same-Day Express 4K Cinema-films en hoogrenderende Levensverhalen — en stapel daarna terugkerende maandabonnementen voor Training, Vastgoed en Merkfilms met volledige commerciële rechten.',
        highlights: [
          'White-label klantportalen zonder login voor Intake, Blueprint, Continuïteit & Screening Room',
          'Same-day $149 Express 4K Cinema-films (~88% marge) & naadloze upgrades naar Full-Motion',
          'Ingesproken Cinema Preview-firewall & vaste revisierondes voorkomen dure heropnames',
        ],
        ctaLabel: 'Bekijk Verdienmodellen & Marges',
        targetAnchor: 'video-services',
      },
      {
        id: 'aspiring',
        badge: 'Geen Filmacademie of Prompting Nodig',
        title: 'Startende Verhalenvertellers & Auteurs',
        description:
          'Heb je een biografie, roman of kanaalidee in je hoofd? Vertel je verhaal in gewone gesproken of getypte taal en laat SceneFlow direct je professionele basisscript en wereld genereren.',
        highlights: [
          'Directe professionele basis voor Serie, Blueprint & Productiescript',
          'Spreek of typ wijzigingen in gewone taal — nul prompt-syntaxis',
          'Bekijk je ingesproken Cinema Preview — of render hem direct als 4K Cinema-film',
        ],
        ctaLabel: 'Volg de 4-Stappen Studiotour',
        targetAnchor: 'studio-tour',
      },
      {
        id: 'experienced',
        badge: 'Serienetwerken · Podcasts · Investeerders-Pre-vis',
        title: 'Ervaren Creators & Filmmakers',
        description:
          'Stop met willekeurig opnieuw genereren. Vergrendel terugkerende gezichten, kleding per shot, eigen stemmen en decors in je Continuity Vault — en schaal je productie 10x met autonome agents.',
        highlights: [
          'Multi-aflevering Continuity Vault & kledingbeheer per shot',
          'Kwaliteitstoets met Audience Resonance & FlowDirector',
          'Autonome agents bouwen 27+ scènes & nasynchronisaties in 70+ talen',
        ],
        ctaLabel: 'Bekijk de 5 Studio-Superkrachten',
        targetAnchor: 'five-superpowers',
      },
    ],
  },
  superpowers: {
    eyebrow: 'De SceneFlow-Ontwerpfilosofie',
    title: 'Vijf Studio-Superkrachten.',
    titleAccent: 'Zonder Technisch Handboek.',
    subtitle:
      'Traditionele AI-video dwingt je te jongleren met losse tools en honderden kwetsbare prompts te schrijven. SceneFlow geeft je een intelligente basis, natuurlijke spraak- of tekstregie, uitvoerende QA en autonome productie-agents.',
    watchClipLabel: 'Bekijk Overzicht (30s)',
    pillars: [
      {
        id: 'baseline',
        number: '01',
        badge: 'Nooit Meer een Lege Pagina',
        title: 'Automatische Professionele Basisgeneratie',
        description:
          'Begin met een simpel concept of een kort verhaalinterview. SceneFlow schrijft automatisch een gestructureerde Seriebijbel, Film Blueprint en Productiescript — inclusief karakterbogen, tijdsechte locaties en dramatische wendingen.',
        outcomeTag: 'Serie · Blueprint · Productiescript',
        videoClipKey: 'comparison',
      },
      {
        id: 'dialog',
        number: '02',
        badge: 'Regie via Spraak of Tekst',
        title: 'Volledige Regiecontrole via Intelligente Dialoog',
        description:
          'Regisseer als een filmmaker, niet als een prompt-engineer. Spreek of typ om scènes bij te sturen, personages per levensfase te splitsen (17, 32, 62 jaar), exacte outfits per shot te kiezen of elk frame nauwkeurig te verfijnen.',
        outcomeTag: 'Nul Prompt-Engineering',
        videoClipKey: 'direction',
      },
      {
        id: 'review',
        number: '03',
        badge: 'Pre- & Post-Render Expert-QA',
        title: 'Audience Resonance & FlowDirector Videobeoordeling',
        description:
          'Audience Resonance beoordeelt je Serie, Blueprint en Script vóór het renderen — daarna controleert FlowDirector gerenderde scènevideo’s vanuit zowel Publieks- als Regisseursperspectief en herstelt clips met 1 klik via Shot Director over 20+ actieve klantprojecten.',
        outcomeTag: 'Publiek + Regisseur Video-QA · 1-Klik Clip-Fixes',
      },
      {
        id: 'agents',
        number: '04',
        badge: 'Handsfree Opschalen',
        title: 'Autonome Fast-Track Productie-Agents',
        description:
          'Zodra je script en ingesproken Cinema Preview kloppen, start je Audio Agent, Stills Agent, Clips Agent of volledige Production Agents om tientallen scènes te bouwen, mislukte takes zelf te herstellen en automatisch een 4K Cinema- of full-motion master op te leveren.',
        outcomeTag: '300+ Handmatige Prompts Vervangen',
        videoClipKey: 'agent',
      },
      {
        id: 'collaboration',
        number: '05',
        badge: 'Klantgoedkeuring & Wereldwijd Bereik',
        title: 'Deelbare Reviewlinks, Screening Room & 70+ Talen',
        description:
          'Deel strakke browserlinks voor Blueprint-, Script- en framenauwkeurige Screening Room-goedkeuring — en lever gelokaliseerde streams in 70+ talen vanuit een meertalige Studio-interface.',
        outcomeTag: 'Deellinks · Screening Room · 70+ Talen',
        videoClipKey: 'publish',
      },
    ],
    microVisuals: {
      baseline: {
        intakePrompt: 'Verhaal-intake: “Vertel me jouw verhaal…”',
        autoBadge: 'Automatisch in Seconden Gegenereerd',
        steps: [
          { step: '1 · Seriebijbel', detail: '6-Afl. Boog + Gedeelde Vault' },
          { step: '2 · Film Blueprint', detail: 'Sterke Beats + Multi-Leeftijd Cast' },
          { step: '3 · Productiescript', detail: 'Dialoog, Kleding & Camera' },
        ],
      },
      dialog: {
        quote:
          '“Splits John in 17, 32 en 62 jaar — en geef Elara haar zijden galajas aan in Shot 2.”',
        chipCast: '✓ 3 Leeftijdskaarten Vergrendeld',
        chipWardrobe: '✓ Shot 2 Kleding: Zijden Galajas',
      },
      review: {
        arLabel: 'Audience Resonance + FlowDirector',
        arStatus: 'Pre-Render Checks + Scène Video-QA',
        gateSeries: 'Serie 90',
        gateBlueprint: 'Blueprint 92',
        gateScript: 'Scène AR 86→89',
        flowDirectorNote:
          'FlowDirector Video-QA: Publiek AR 86 + Regisseur 81 → 1-klik fix herbouwt clip (+3 AR)',
      },
      agents: {
        rows: [
          { label: 'Audio Agent · Stemmen, SFX & Muziek', status: '27 / 27 Gereed' },
          { label: 'Stills Agent · Continuïteit-Keyframes', status: '100% Vergrendeld' },
          { label: 'Clips Agent · Zelfherstellende Beweging', status: 'Auto-Geverifieerd' },
        ],
      },
      collaboration: {
        approvedBadge: 'Goedgekeurd ✓',
        dubsChip: '+70 Talen',
      },
    },
  },
  videoServices: {
    eyebrow: 'Videoleveringsdiensten · Solo-Ondernemers & Bureaus',
    title: 'Lever $1,500+ Productiewaarde tegen',
    titleAccent: '50%–80% Lagere Productiekosten',
    subtitle:
      'Traditionele crews en 30 uur handmatige montage prijzen 90% van families, makelaars en lokale ondernemers uit de markt. Start met onze vlaggenschip Levensverhalen via lokale partners — en voeg terugkerende B2B-retainers toe met 50% tot 80% lagere totaalkosten (rekenkracht + PM-uren).',
    commercialRightsBadge: '100% Commerciële Rechten · White-Label Klantportalen (Pro+)',
    costSavingsPillLabel: 'Vlaggenschip Levensverhalen + Terugkerende B2B-Retainers',
    verticalsHeading: '1. Start met Ons Vlaggenschip — en Breid Uit naar Terugkerende Retainers',
    globalDemandLabel: 'Enorme Wereldwijde Marktvraag',
    whoBuysLabel: 'Wie Herhaaldelijk Koopt',
    partnerChannelsLabel: 'Verwijzingspartners Zonder Advertentiebudget',
    marginAdvantageLabel: 'SceneFlow Marge- & Scopevoordeel',
    calculatorBadge: 'Kosten- & Winstcalculator op Maat',
    calculatorTitle: '2. Stresstest Leveringskosten & Maandelijkse Servicewinst',
    priceTierLabel: 'Klantpakketniveau:',
    priceTierNames: ['Express 4K Cinema', 'Full-Motion Cinema', 'Signature 4K'],
    tierScopePrefix: 'Pakketinhoud:',
    volumeLabel: 'Klantleveringen / maand:',
    projectsPerMonthSuffix: 'projecten/mnd',
    projectsUnitLabel: 'projecten',
    stressTestToggleLabel: 'Stresstest: Maand-1 Opstart + Pro-abonnement ($149/mnd)',
    stressTestOnBadge: 'AAN',
    stressTestOffBadge: 'UIT',
    stressTestActiveNote:
      'Conservatieve opstart actief: +60% beginners-PM-uren, +30% extra heropname-rekenbuffer en $149/mnd Operator Pro-lidmaatschap (incl. 10.000 basiscredits/mnd + 150 GB Vault).',
    proPlanLineLabel: 'Pro-plan ($149/mnd) + extra rekenkracht',
    proPlanCreditsIncludedNote: ' (10k cr incl.)',
    perProjectProfitLabel: 'Servicewinst / project',
    traditionalMarketLabel: 'Gangbaar markttarief',
    typicalFeeLabel: 'Jouw klantprijs',
    fullyLoadedCostLabel: 'Leveringskosten / project',
    costBreakdownSubLabel: 'Credits + PM-tijd',
    estComputeLabel: 'Rekenkracht (incl. 20% heropnamebuffer)',
    activeHandsOnLabel: 'Operator- / PM-tijd (@$50/uur)',
    monthlyGrossLabel: 'Gesch. Maandelijkse Omzet',
    monthlyNetLabel: 'Gesch. Maandelijkse Servicewinst (na rekenkracht & PM-tijd)',
    perMonthSuffix: '/ mnd',
    marginBadgeSuffix: 'servicemarge',
    disclaimer:
      'Leveringskosten omvatten SceneFlow-rekenkracht ($0.01/credit add-ontarief met 20% heropnamebuffer) plus operator-/PM-tijd à $50/uur. Schakel de stresstest in voor opstarttijd en Pro ($149/mnd); exclusief lokale sales/marketing.',
    launchBusinessCta: 'Maak Je Eerste Voorbeeldfilm ($9)',
    launchBusinessSubnote:
      'Gebruik de $9 Explorer-proefvlucht voor een watermerkvrije portfoliofilm voor lokale partners — en upgrade naar Pro ($149/mnd) voor 100% White-Label Klantportalen.',
    foundingCharterCta:
      'Nu een klantstudio starten? Bekijk het Founding Operator Charter (25 plaatsen)',
    foundingCharterTitle: 'Founding Video Service Operator 90-Dagen Pro Charter',
    trustShieldHeading: 'Zakelijk Schild voor Marge, Privacy & Commerciële IP',
    trustShieldPillars: [
      {
        title: 'White-Label Portalen Zonder Login (Pro+)',
        detail:
          'Klanten beoordelen onder jouw studionaam, logo en huiskleuren zonder SceneFlow-login of zichtbare creditprijzen.',
      },
      {
        title: 'Express 4K Cinema & Full-Motion Firewall',
        detail:
          'Lever fotorealistische bewegende 4K-stills met gekloonde stemmen, SFX en muziek als volwaardige $149–$249 same-day master — of gebruik die exacte ingesproken versie als verspillingsvrije goedkeuringsfirewall vóór Full-Motion-kosten.',
      },
      {
        title: 'Klantfoto’s & Verhalen Blijven 100% Privé',
        detail:
          'Familiearchieven en B2B-bestanden blijven strikt privé — nooit gebruikt voor het trainen van publieke AI-modellen — met automatische EXIF GPS-verwijdering en vastgelegde portrettoestemming.',
      },
    ],
    playbooksBadge: 'Kant-en-Klare Service-in-a-Box Startkits Inbegrepen',
    playbooksHeading: 'Kant-en-Klare Playbooks, Tariefkaarten & Partner-Pitchtemplates',
    playbooksSubtitle:
      'Sla het gokwerk bij de start over met bewezen sector-SOP’s rechtstreeks ingebouwd in SceneFlow Studio:',
    playbooksItems: [
      'AI-Biograaf & Intake-Playbooks in 70+ Filmtalen (Meertalige Portaal-UI)',
      '3-Laags Tariefkaarten & Ingebouwde Minimale Margecalculator',
      '20% Verwijzingspartner-Pitchsheet (Woonzorg, Uitvaart & Makelaars)',
      'Ingebouwd Clickwrap-Register voor Media-, Multi-Leeftijd- & Stemtoestemming',
    ],
    blueprintFlywheel: {
      badge: 'Geautomatiseerde Intake met 0 PM-Minuten · 83% Nettomarge',
      title: 'Verdien Automatisch Omzet Nog Voordat een PM het Project Aanraakt',
      subtitle:
        'Klanten vinden het lastig om vanaf een leeg blad een film te schetsen — maar reageren moeiteloos op een geïllustreerd, ingesproken voorstel. SceneFlow maakt van onboarding een zelffinancierende Blueprint Pass die zelfs op pauzerende leads marge oplevert.',
      cards: [
        {
          tag: '$29 Pass + $19 Top-Ups · 0 PM-Min',
          title: 'Zelffinancierende Blueprint Pass & Extra Iteratiepakketten',
          detail:
            'Klanten betalen $29 vooraf voor geïllustreerde storyboards, meertalige voice-over en Audience Resonance binnen ~3 minuten (~83% marge zelfs als ze pauzeren) — plus zelfbedieningspakketten van $19 (+3 revisies / +2 AR) wanneer ze extra rondes willen.',
        },
        {
          tag: 'Snelle & Authentieke Versie 1',
          title: 'Geheugensteun-Chips, Snelle Check & Anti-Fictionalisering',
          detail:
            'Aantikbare mijlpaalchips per sector (huwelijken, promoties, sport, bewijs, ruimtes) en een 15-seconden spraak-/tekstcheck vangen snel kernpersonen en gebeurtenissen, terwijl strikte non-fictieregels nooit biografische feiten verzinnen.',
        },
        {
          tag: 'Tweelaags Delen & Triage',
          title: 'Alleen-Reageren Link voor Familie/Team & Regie bij Hoofdklant',
          detail:
            'Je klant ontvangt een privé Director Portal en deelt een alleen-reageren link met familie of collega’s. Gasten luisteren in 70+ filmtalen en reageren zonder rondes te verbruiken of goed te keuren; de hoofdklant bundelt notities + 1-klik AR-tips in 1 AI-update die audio & storyboards vernieuwt.',
        },
        {
          tag: 'Uitgestelde PM-Toewijzing',
          title: 'PM Pas Toegewezen na Akkoord + Blueprint-Conversiefunnel',
          detail:
            'Nul menselijke PM-uren tot de klant op Blueprint Goedkeuren klikt. Volg Actieve, Stille (>48u / >7d) en Uitgeputte leads in de Blueprint Funnel met 1-klik white-label herinneringen, +3 iteratietegoeden en automatische pass-omzet.',
        },
      ],
    },
    agencyScaleOps: {
      badge: 'Multi-PM Bureauschaal · Honderden Klantprojecten',
      title: 'Commandocentrum voor Bureaus, Rechtstreeks in de Studio Gebouwd',
      subtitle:
        'Groei van solo-operator naar een internationaal multi-PM videobureau zonder spreadsheets, verloren verkoopuren, weglekken van marge of volle opslag.',
      pillars: [
        {
          title: 'Blueprint Funnel, Kanban & SLA-Herinneringen',
          detail:
            'Scheid geautomatiseerde Blueprint Passes van actieve productie — signaleer stilstaande Blueprints (>48u/7d) en verbruikte rondes met 1-klik white-label herinneringsmails en +3 iteratietegoeden.',
        },
        {
          title: 'Klant-CRM, Pass-Omzet & PM-Scorecard',
          detail:
            'Tel automatisch $29 Blueprint Passes, $19 iteratiepakketten en volledige producties bij elkaar op terwijl je creditverbruik per PM, doorlooptijden en realtime brutomarge bewaakt.',
        },
        {
          title: 'Uitgestelde PM-Routing & Workspace-Isolatie',
          detail:
            'Houd Blueprint Passes vóór akkoord volledig handsfree, wijs taal-PM’s automatisch toe bij goedkeuring, delegeer Seriebijbels en isoleer teams met 0-credit QA-Reviewers.',
        },
        {
          title: 'Onbeperkte Schaal & 1-Klik Concept-Opschoning',
          detail:
            'Server-side zoeken en bulk-PM-acties over honderden projecten plus 1-klik Archiveren & Tussenbestanden Opschonen terwijl eindmasters intact blijven.',
        },
      ],
    },
    workflowHeading: 'Zo Verloopt een White-Label Klantproject in 4 Moeiteloze Stappen',
    stepPrefix: 'Stap',
    workflowSteps: [
      {
        step: '01',
        title: 'Zelffinancierende $29 Begeleide Intake',
        detail:
          'Klanten kopen je $29 Blueprint Pass, tikken sector-geheugensteunchips aan, vertellen hun verhaal per spraak of tekst met verplichte toestemming en doen een 15-seconden Snelle Check met strikte feitelijke juistheid.',
      },
      {
        step: '02',
        title: 'Levend Blueprint, Familietriage & Auto-Revisies',
        detail:
          'Binnen ~3 minuten ontvangen ze geïllustreerde storyboards, meertalige audio en AR-score, delen ze een commentaarlink met familie/team, filteren ze feedback naar AI-updates (of voegen $19 pakketten toe) en klikken ze Akkoord voor PM-toewijzing.',
      },
      {
        step: '03',
        title: 'Mobiele Foto-Upload, Uitspraak & Continuïteitslock',
        detail:
          'Klanten uploaden echte foto’s vanaf hun telefoon (EXIF GPS verwijderd), voegen een 10-seconden uitspraakgids voor namen/plaatsen toe en keuren multi-leeftijd Cast, Kleding & Decors goed binnen vaste rondes.',
      },
      {
        step: '04',
        title: 'Same-Day Express 4K of Full-Motion Screening-Levering',
        detail:
          'Kies voor 1-tik PM-vrijgave (of volledige automaat) naar de loginloze Screening Room. Klantakkoord start automatisch de 4K-masterrender en mailt de downloadlink — altijd zonder herwerk te upgraden naar Full-Motion.',
      },
    ],
    verticals: [
      {
        id: 'memoir',
        tabLabel: 'Video-Memoires',
        roleTag: '★ Vlaggenschip Hoog-Marge Aanbod',
        badge: '$149–$1,250 / film · Markttarief: $1,200–$4,500+',
        title: 'Levensverhalen, Mijlpaal-Eerbetonen & Familiebiografieën',
        description:
          'Start met een $149 Same-Day Express 4K Cinema-eerbetoon (fotorealistische bewegende 4K-stills, gekloonde stemmen, SFX & muziek) of upgrade naadloos naar Full-Motion reconstructies per levensfase (17 → 32 → 62 jaar) zonder herwerk.',
        globalMarketNeed:
          'Honderden miljoenen oudere ouders, 50-jarige huwelijken en levensvieringen vinden elk jaar wereldwijd plaats — toch wordt 90%+ nooit verfilmd omdat crews van $2,000+ te duur zijn of weken duren.',
        clientBuyer:
          'Families die mijlpaalverjaardagen, gouden bruiloften, pensioenen en herdenkingen vieren',
        partnerChannels:
          'Vermogensplanners, woonzorgcentra, uitvaartbegeleiders & eventplanners (15–20% partnermodel)',
        traditionalMarketRangeLabel: '$1,200–$4,500+',
        typicalRetailUsd: 599,
        priceTiersUsd: [149, 599, 1250],
        tierScopeLabels: [
          'Express 4K Cinema (5–8 min · Zelfde dag) · Bewegende 4K-stills + Stemmen, SFX & Muziek · Auto-4K Master',
          '12-min Full-Motion Familiememoire · Multi-Leeftijd Cast + Tijdperken · 2 Talen',
          '20-min Signature Erfgoeddocumentaire · 4K Full-Motion Tijdperken + Erfstuk-Locks · 4 Talen',
        ],
        computeTiersUsd: [6, 34, 72],
        operatorTiersUsd: [12, 88, 150],
        activeTimeTiersLabels: ['~15 min', '~1,75 uur', '~3,0 uur'],
        retailRangeLabel: '$149–$1,250',
        estComputeUsd: 34,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1,75 uur',
        keyAdvantage:
          '3-Staps Waardeladder: $29 Blueprint Pass → $149 Same-Day Express 4K Cinema (~$18 totaalkosten, ~88% marge) → $599+ Full-Motion upgrade zonder herwerk.',
      },
      {
        id: 'realestate',
        tabLabel: 'Vastgoedrondleidingen',
        roleTag: '↻ Terugkerende Makelaarsretainer',
        badge: '$149–$549 / woning · Markttarief: $450–$1,500+',
        title: 'Ingesproken Luxe Vastgoed- & Boetiekhotel-Tours',
        description:
          'Zet woningfoto’s en buurthighlights om in Same-Day $149 Express 4K-woningfilms of Full-Motion rondleidingen — plus directe Mandarijn-, Spaans-, Arabisch- of Portugeestalige versies voor internationale kopers.',
        globalMarketNeed:
          'Tientallen miljoenen woningen, vakantieverblijven en boetiekhotels strijden elke maand om binnen- en buitenlandse kopers — meestal nog met alleen statische foto’s.',
        clientBuyer:
          'Topmakelaars, luxe vastgoedkantoren, vakantiewoningen & boetiekhotels',
        partnerChannels:
          'Vastgoedfotografen, stylingteams, luxe makelaarsnetwerken & hospitality-marketeers',
        traditionalMarketRangeLabel: '$450–$1,500+',
        typicalRetailUsd: 299,
        priceTiersUsd: [149, 299, 549],
        tierScopeLabels: [
          'Express 4K Woningfilm (90s · Zelfde dag) · Bewegende 4K-stills + Voice-over & Muziek · 1 Taal',
          '2-min Full-Motion Woningtour · 4K Upscaled + 2 Talen',
          '3-min Luxe Landgoedfilm + 9:16 Reels · 4 Internationale Talen',
        ],
        computeTiersUsd: [5, 15, 28],
        operatorTiersUsd: [10, 50, 88],
        activeTimeTiersLabels: ['~12 min', '~1,0 uur', '~1,75 uur'],
        retailRangeLabel: '$149–$549',
        estComputeUsd: 15,
        estOperatorUsd: 50,
        activeMinutesLabel: '~1,0 uur',
        keyAdvantage:
          'Hoog herhaalvolume per makelaar: lever Same-Day $149 Express 4K-woningfilms (~$15 kosten, ~90% marge) of maandelijkse Full-Motion retainers zonder reistijd.',
      },
      {
        id: 'training',
        tabLabel: 'Training & SOP’s',
        roleTag: '↻ Terugkerende B2B-Retainer',
        badge: '$249–$1,800 / module · Markttarief: $1,500–$5,000+',
        title: 'Zakelijke Onboarding, Veiligheid & Meertalige Cursussen',
        description:
          'Vergrendel een vaste presentator, bedrijfskleding en werklocaties in je Continuity Vault — en lever Same-Day $249 Express 4K-SOP’s of Full-Motion cursussen in 70+ medewerkerstalen.',
        globalMarketNeed:
          'Elke fabrikant, kliniekketen, horecagroep en franchise wereldwijd kampt met personeelsverloop, veiligheidsregels en meertalige teams die duidelijke video-SOP’s nodig hebben.',
        clientBuyer:
          'HR- & L&D-leiders, maakbedrijven, zorgklinieken, restaurantketens & franchises',
        partnerChannels:
          'Interim HR-adviseurs, veiligheidsauditors, LMS-integrators & franchiseverenigingen',
        traditionalMarketRangeLabel: '$1,500–$5,000+',
        typicalRetailUsd: 950,
        priceTiersUsd: [249, 950, 1800],
        tierScopeLabels: [
          'Express 4K Ingesproken SOP (5 min · Zelfde dag) · Vaste instructeur + Gekloonde stem & SFX · 1 Taal',
          '10-min Full-Motion Veiligheid / Onboarding · 3 Medewerkerstalen',
          '20-min Multi-Hoofdstuk Curriculum · 6+ Medewerkerstalen',
        ],
        computeTiersUsd: [9, 40, 78],
        operatorTiersUsd: [18, 125, 210],
        activeTimeTiersLabels: ['~20 min', '~2,5 uur', '~4,2 uur'],
        retailRangeLabel: '$249–$1,800',
        estComputeUsd: 40,
        estOperatorUsd: 125,
        activeMinutesLabel: '~2,5 uur',
        keyAdvantage:
          'Langlopende B2B-retainers: start Same-Day $249 Express 4K-SOP’s (~$27 kosten, ~89% marge) of $950+ meertalige cursussen, en render nalevingsupdates in minuten opnieuw.',
      },
      {
        id: 'brand',
        tabLabel: 'Merkverhalen',
        roleTag: '↻ Terugkerend MKB- & Bureaupakket',
        badge: '$199–$1,200 / pakket · Markttarief: $3,000–$8,000+',
        title: 'Oprichtersfilms, Kliniek-Explainers & Social Advertenties',
        description:
          'Lever Same-Day $199 Express 4K Merkfilms of Full-Motion homepageverhalen met automatische verticale 9:16-trailers voor Instagram, TikTok en YouTube Shorts — goedgekeurd in de Screening Room.',
        globalMarketNeed:
          '30M+ lokale klinieken, advocatenkantoren, restaurants en oprichters wereldwijd hebben dringend vertrouwenwekkende homepagevideo’s en frisse 9:16-ads nodig — maar worden buitengesloten door $5,000+ bureaushoots.',
        clientBuyer:
          'Medische/tandartspraktijken, advocatenkantoren, lokaal MKB, webbureaus & e-commerce-oprichters',
        partnerChannels:
          'Lokale webbureaus, SEO-/performance-ad-bureaus, ondernemersverenigingen & praktijkadviseurs',
        traditionalMarketRangeLabel: '$3,000–$8,000+',
        typicalRetailUsd: 650,
        priceTiersUsd: [199, 650, 1200],
        tierScopeLabels: [
          'Express 4K Merkfilm (90s · Zelfde dag) · Bewegende 4K-stills + Voice-over & Muziek · Auto-4K Master',
          '2-min Full-Motion Oprichtersfilm + 2 Social 9:16 Cutdowns',
          'Signature Merkfilm + 4 Meertalige Paid-Ad Hook-Varianten',
        ],
        computeTiersUsd: [7, 28, 56],
        operatorTiersUsd: [15, 88, 150],
        activeTimeTiersLabels: ['~18 min', '~1,75 uur', '~3,0 uur'],
        retailRangeLabel: '$199–$1,200',
        estComputeUsd: 28,
        estOperatorUsd: 88,
        activeMinutesLabel: '~1,75 uur',
        keyAdvantage:
          'White-label uitvoering voor lokale web- en advertentiebureaus — $199 Same-Day Express 4K Merkfilms (~$22 kosten, ~89% marge) of $650 Full-Motion pakketten met 9:16 social cutdowns.',
      },
    ],
  },
  guidedTour: {
    eyebrow: 'Visuele Studiotour · Zonder Jargon',
    title: 'Vier Verbonden Ruimtes.',
    titleAccent: 'Eén Moeiteloze Flow.',
    subtitle:
      'Leer de 4 Studiodeuren kennen in 60 seconden — Series Room, Blueprint Room, Production Stage en Screening Room — voordat je diezelfde live deuren aanklikt in de 6 volledige Productievoorbeelden hieronder.',
    stepPrefix: 'Stap',
    lensLabel: 'Voorbeeldperspectief:',
    lensCreator: 'Originele Serie (“The Glass Ledger”)',
    lensService: 'Klantproject (“Levensverhaal Memoire”)',
    watchRoomVideoLabel: 'Bekijk Ruimtetour (30s)',
    inspectFullScreenLabel: 'Bekijk Volledig Studioscherm',
    openLiveScreeningLabel: 'Open Live Demo Screening Room',
    screeningModalTitle: 'The Glass Ledger — Demo Screening Room',
    examplesBridgeText:
      'Nu je de 4 Studiodeuren kent, test je ze live over 6 volledige genres:',
    examplesBridgeCta: 'Probeer de 4 Live Deuren in Productievoorbeelden',
    rooms: [
      {
        id: 'series-desk',
        stepNumber: '01',
        tabLabel: 'Series Room',
        badge: 'Multi-Aflevering Wereld & Continuïteitsbijbel',
        title: 'Bouw Eén Keer een Herbruikbaar Universum — Niet Slechts Eén Clip',
        promise:
          'Beschrijf een seriekanaal, trainingsprogramma of meerdelige biografie één keer. SceneFlow bouwt je Verhaalbijbel, Afleveringsoverzicht en gedeelde Reference Library zodat elke aflevering consistent blijft.',
        creatorExampleTitle: 'The Glass Ledger · 6-Delige Neo-Noir Thriller',
        creatorExampleNote:
          'Gedeelde cast (Elara Vance, Marcus Thorne, Dr. Aris Kael), Archive Vault-decor en Quartz Codex-rekwisiet vergrendeld over alle 6 afleveringen met een 91/100 Audience Resonance-basis.',
        serviceExampleTitle: 'Meerdelig Familie-Erfgoed of Bedrijfscurriculum',
        serviceExampleNote:
          'Sla goedgekeurde presentatoren, familietijdperken of bedrijfslocaties één keer op — en start Aflevering 2 t/m 10 in één klik zonder visuele afwijking.',
        callouts: [
          {
            label: 'Directe Seriebasis & Audience Resonance Score',
            detail:
              'Genereert automatisch synopsis, afleveringsbogen en Audience Resonance-score vóór de productie.',
          },
          {
            label: 'Gedeelde Reference Library',
            detail:
              'Personages, stemmen, kleding, decors en rekwisieten gaan automatisch mee naar elke aflevering.',
          },
          {
            label: 'Spraak- of Tekst-Serieregisseur',
            detail:
              'Spreek of typ aanpassingen om seizoensbogen of losse afleveringen moeiteloos te herschrijven.',
          },
        ],
        visuals: {
          topBadge: 'Serie AR: 91 / 100 · 6 Afleveringen Gesynchroniseerd',
          bottomBadge: 'Gedeelde Reference Library Vergrendeld over Alle Afleveringen',
          thumbLabels: [
            'Elara Vance · Hoofdrol',
            'Marcus Thorne · Cast',
            'Archive Vault · Decor',
            'Quartz Codex · Rekwisiet',
          ],
        },
      },
      {
        id: 'blueprint-board',
        stepNumber: '02',
        tabLabel: 'Blueprint Room',
        badge: 'Verhaal-Intake, Multi-Leeftijd Cast & Akkoord',
        title: 'Vergrendel een Sterk Verhaal & Cast Voordat Je aan Video Uitgeeft',
        promise:
          'Start vanuit een natuurlijk verhaalinterview of idee. Blueprint Room structureert je beats, licht losse personages per beat uit, vergrendelt multi-leeftijd identiteit en laat klanten via een deellink tekenen.',
        creatorExampleTitle: 'Beat-voor-Beat Treatment & Visuele Stijl Vergrendeld',
        creatorExampleNote:
          'Elke beat koppelt dramatische intentie aan deelnemende personages, anamorfe lichtregels en ingesproken Audience Resonance-feedback.',
        serviceExampleTitle: 'Nul-PM-Uren $29 Blueprint Pass & Familiecommentaar-Triage',
        serviceExampleNote:
          'Geheugensteunchips & anti-fictionalisering leveren binnen ~3 minuten een authentieke, geïllustreerde en ingesproken Versie 1. Klanten delen een commentaarlink met familie, bundelen opmerkingen + 1-klik AR-tips in AI-revisies (met ververste audio & storyboards) en schakelen pas bij Akkoord een PM in.',
        callouts: [
          {
            label: 'Geheugensteun-Intake & Anti-Fictionalisering',
            detail:
              'Sector-mijlpaalchips en een 15-seconden spraak-/tekstcheck vangen snel echte mensen en tijdperken — zonder ooit niet-gedeelde feiten te verzinnen.',
          },
          {
            label: 'Tweelaags Delen voor Familie / Team & Triage',
            detail:
              'Gasten luisteren in 70+ filmtalen en reageren zonder rondes te verbruiken of goed te keuren; de hoofdklant filtert opmerkingen tot 1 strakke AI-revisie.',
          },
          {
            label: 'Ververste Audio, Storyboards & $19 Top-Ups',
            detail:
              'Elke iteratie herillustreert gewijzigde hoofdstukken, regenereert voice-over, scoort Audience Resonance en biedt zelfbedieningspakketten van +3 iteraties.',
          },
        ],
        visuals: {
          topBadge: 'Blueprint AR: 92 / 100 · Cast per Beat Uitgelicht',
          bottomBadge: 'Multi-Leeftijd Continuïteit + Deelbare Klantakkoord-Link',
          thumbLabels: [
            'Hoofdpersonage-Boog',
            'Dr. Aris Kael · Beat 2',
            'Havenkade · Akte II',
            'Chrono-Sleutel · Plotlock',
          ],
        },
      },
      {
        id: 'production-stage',
        stepNumber: '03',
        tabLabel: 'Production Stage',
        badge: 'Shot Director, Kledingbeheer & Autonome Agents',
        title: 'Bekijk de Ingesproken Cinema Cut — Lever in 4K of Upgrade naar Full Motion',
        promise:
          'Controleer je Productiescript, vergrendel continuïteitsreferenties, bekijk de volledige fotorealistische bewegende Cinema Cut met gekloonde stemmen, SFX & muziek — lever direct als Same-Day Express 4K Cinema of laat autonome agents full-motion shots bouwen.',
        creatorExampleTitle: 'Scène 1: Ondergrondse Archive Vault · Anamorfisch 4K',
        creatorExampleNote:
          'Wissel Elara’s kleding per shot, regisseer camerakaders per spraak of tekst, mix dialoog/SFX/muziek in Production Mixer en start de Production Agents.',
        serviceExampleTitle: 'Same-Day $149 Express 4K Cinema of Hybride Full-Motion Upgrades',
        serviceExampleNote:
          'Lever binnen uren een ingesproken Express 4K Cinema-film (~$6 rekenkracht) of voeg AI full-motion reconstructies toe voor ongefotografeerde herinneringen — zodat een 12-minuten full-motion memoire rond ~$34 rekenkracht blijft.',
        callouts: [
          {
            label: 'Kleding per Shot & Spraak-/Tekst-Shot Director',
            detail:
              'Kies exacte outfits per shot en verfijn kadrering of expressies in gewone dialoog — geen gokwerk meer.',
          },
          {
            label: 'Express 4K Cinema Master & Bewegingsfirewall',
            detail:
              'Hoor gekloonde dialoog, voice-over, SFX en muziek over continuïteitsvergrendelde 4K-stills — direct exporteerbaar als $149 eindfilm of voor akkoord vóór full-motion kosten.',
          },
          {
            label: 'Autonome Audio Agent, Stills Agent & Clips Agent',
            detail:
              'Genereer scène voor scène of start volledige Production Agents om automatisch te bouwen en monteren.',
          },
        ],
        visuals: {
          topBadge: 'Shot Director · Kleding Gekozen · Express 4K Cinema Cut Gereed',
          bottomBadge: 'Audio Agent, Stills Agent & Clips Agent Orkestreren Alle Scènes',
          thumbLabels: [
            'Shot 1 · Totaal Vault',
            'Shot 3 · Macro Rekwisiet',
            'Scène 2 · Overdracht',
            'Scène 3 · Tracking-Shot',
          ],
        },
      },
      {
        id: 'screening-room',
        stepNumber: '04',
        tabLabel: 'Screening Room',
        badge: 'Framenauwkeurige Review, 70+ Talen & Publicatie',
        title: 'Werk Samen via Privélink & Lever Wereldwijd in Elke Taal',
        promise:
          'Bekijk Express 4K Cinema-cuts, ruwe montages en full-motion 4K-masters in één speler. Klantakkoord kan automatisch de 4K-render starten en de downloadlink mailen — plus 70+ gesynchroniseerde nagesynchroniseerde streams.',
        creatorExampleTitle: 'Premièreklare Master, Promotrailers & Wereldwijde Dubs',
        creatorExampleNote:
          'Knip automatisch verticale 9:16-trailers, regenereer gelokaliseerde dialoogstreams voor 70+ markten en publiceer op YouTube of meld je aan voor SceneFlow Originals.',
        serviceExampleTitle: 'Drempelloze Klantreview & Meertalige Levering',
        serviceExampleNote:
          'Klanten kijken op telefoon of desktop zonder inloggen, plaatsen tijdcode-opmerkingen en ontvangen strakke MP4-bestanden in de taal van hun familie of team.',
        callouts: [
          {
            label: 'Gedeelde Reviewlinks Zonder Login',
            detail:
              'Stuur privélinks `/share/screening-room/` voor moeiteloos akkoord van klanten, directie of familie.',
          },
          {
            label: 'In-Scène Gesynchroniseerde Streams in 70+ Talen',
            detail:
              'Behoudt omgevings-SFX en muziek terwijl gelokaliseerde stemmen en dialogen strak worden uitgelijnd voor wereldwijde markten.',
          },
          {
            label: '4K Master-Export & Promo-Cutdowns',
            detail:
              'Download schone commerciële masters met volledige IP-rechten of deel trailers direct op sociale kanalen.',
          },
        ],
        visuals: {
          topBadge: 'Framenauwkeurige Notities · Klantlink Zonder Login',
          bottomBadge: 'Meertalige Studio-UI · 70+ In-Scène Taalstreams',
          thumbLabels: [
            'EN · Originele Master',
            'NL / ES · Sync Dub',
            'ZH / TH / HI · Streams',
            '9:16 Promotie-Cutdown',
          ],
        },
      },
    ],
  },
  useCaseDirectory: {
    viewByUseCaseLabel: 'Blader op Toepassing',
    viewByRoomLabel: 'Blader op Studioruimte',
    tracks: [
      {
        id: 'memoir-services',
        tabLabel: 'Video-Memoires & Familie-Erfgoed',
        badge: 'Vlaggenschip Klantdienst · $149–$1,250/Film',
        headline: 'Verander Familie-Interviews & Bewaarfoto’s in Tijdloze Erfgoedcinema',
        description:
          'Leg een levensverhaal vast in 70+ filmtalen, verbeter en verjong portretten in Character Selfie Studio van de jaren 70 tot nu, start autonome Production Agents, herstel clips met 1 klik via FlowDirector en lever via een loginloze Screening Room-link.',
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
        tabLabel: '20-Projectbureaus & Trainingsvideo',
        badge: '20+ Gelijktijdige Projecten · Geünificeerde Production Agent + FlowDirector QA',
        headline: 'Beheer 20 Gelijktijdige Klantprojecten tegen 50%–80% Lagere Kosten met Automatisering',
        description:
          'Start white-label portalen & PM-creditlimieten, controleer nettomarges op gedeelde Blueprints, stuur de geünificeerde Production Agent aan over Pre-Vis Audio, Keyframe Stills, Motion Clips en MP4 Scènerenders met zelfherstellend [Investigate]-herstel, toets in FlowDirector en lever 70+ talen.',
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
        tabLabel: 'Episodische Series & Gestileerde Animatie',
        badge: 'Multi-Aflevering IP · Vergrendelde Art Direction & Cast',
        headline: 'Run een Complete Showrunner-Bijbel van Aflevering 1 tot Seizoensfinale',
        description:
          'Bouw een seizoensboog over meerdere afleveringen, bevries fotorealistische of gestileerde 3D-artdirection per aflevering, regisseer storyboard-beats en keyframes, en draai de geünificeerde Production Agent voor bioscoopwaardige 10s-clips met zelfherstellende Creative Kling AI F2V-fallback.',
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
        tabLabel: 'YouTube-Kanalen & Verhalende Podcasts',
        badge: 'Hoge Retentie Faceless Kanalen · Multi-Host Shows',
        headline: 'Publiceer Wekelijks Verhaalgedreven Afleveringen met Studiostem, Muziek & Afwerking',
        description:
          'Test retentie-hooks vóór het renderen, regisseer chemie tussen meerdere hosts, shot-uitgelijnde vertelcues en muziek op maat, polijst 4-stem mixen en publiceer 16:9 + 9:16 social streams via 1-Klik OAuth.',
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
        tabLabel: 'Filmmaker Pre-Vis & Pitch-Trailers',
        badge: 'Greenlight-Decks · Proof-of-Concept Cinema',
        headline: 'Stresstest Je Scenario en Loop Pitchmeetings Binnen met een Afgewerkte Trailer',
        description:
          'Schrijf samen met FlowDirector, scoor structuur en tempo met Audience Resonance bij Blueprint- en Scriptgates, deel geïllustreerde storyboards met budgetramingen, formatteer standaard filmscripts en monteer overtuigende proof-of-concept trailers.',
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
    badge: 'Workflow-Automatisering & 39 Studio-Capaciteiten · Ingesproken WebM-Cinemafilms',
    title: 'Automatiseer Productie & Expert Video-QA over 20+ Gelijktijdige Projecten',
    subtitle:
      'Elke capaciteit bevat een heldere, mobielvriendelijke WebM-cinemafilm met voice-over. Zie hoe White-Label Portalen, Selfie Studio, FlowDirector 1-klik clip-fixes en autonome agents 300+ handmatige prompts vervangen.',
    expandCta: 'Ontdek 39 Ingesproken Studio-Capaciteiten',
    collapseCta: 'Verberg Overzicht Studio-Capaciteiten',
    automationEyebrow: 'Gebouwd voor Hoog-Volume Creators & 20-Project Videobureaus',
    automationTitle:
      'End-to-End Workflow-Automatisering: Agents Bouwen. FlowDirector Controleert & Herstelt in 1 Klik.',
    automationSubtitle:
      'Stop met clip voor clip prompts bewaken. Autonome Audio-, Stills-, Clips- en Production Agents werken scènes op de achtergrond af terwijl FlowDirector elke gerenderde scène-MP4 toetst op Audience Resonance en Regie-naleving — en gemarkeerde clips met één klik via Shot Director opnieuw maakt.',
    spotlightFlowDirectorLabel: 'FlowDirector Scène Video-QA',
    spotlightFlowDirectorMeta: 'Publiek AR + Regie-Naleving · 1-Klik Fix Herbouwt Clips',
    spotlightAgentsLabel: 'Autonome Production Agents',
    spotlightAgentsMeta: '300+ Prompts Geautomatiseerd · Zelfherstellend over 20 Actieve Projecten',
    spotlightNarrated5kLabel: '39 Capaciteiten · Ingesproken Cinemafilms',
    spotlightNarrated5kMeta: 'Strakke 16:9 WebM Walkthroughs + Meertalige Studio-Voice-over',
  },
  academyStrip: {
    badge: 'Nul-Leercurve Garantie · Studio Academy',
    title: 'Raak Nooit Overweldigd. Druk Overal op ? voor een Visuele Gids van 60 Seconden.',
    subtitle:
      'Elke Studioruimte bevat een Just-In-Time (JIT) Schermkaart met genummerde aanwijzingen, 1-klik acties, Pre-vis creditbewaking en onze interactieve simulator “Je Eerste Film in 10 Minuten”.',
    pills: [
      'Contextgevoelige ? Schermkaarten',
      '“Eerste Film in 10 Min” Simulator',
      'Ingebouwde Pre-vis Creditbewaking',
    ],
    watchAcademyCta: 'Bekijk Academy-Tour (30s)',
    startExplorerCta: 'Start met Explorer — $9',
  },
  mobileCompanion: {
    eyebrow: 'Klantlinks Zonder Login + Operator Mobiele PWA · iOS & Android',
    title: 'Desktop Studiokracht.',
    titleAccent: 'Drempelloze Mobiele Portalen voor Klanten & Teams.',
    subtitle:
      'Betalende klanten hebben nooit een SceneFlow-login, app-download of abonnement nodig — zij werken via jouw white-label mobiele weblinks, terwijl jij en je Project Managers (PM’s) meldingen, mijlpalen en creditlimieten volgen in een direct installeerbare Mobile Companion PWA.',
    whyPwaBadge: 'Geen Klantlogin · Directe Operator-PWA',
    whyPwaNote:
      'Klanten openen schone Safari-/Chrome-links onder jouw merk; operators & PM’s installeren de Companion PWA in één tik met native Web Push-meldingen.',
    modeCustomerTab: 'White-Label Klantproces',
    modeTeamTab: 'Operator- & PM-Hub (PWA)',
    customerHeading: 'Mobiele Portalen Zonder Login Onder Jouw Eigen Studiomerk',
    customerSubheading:
      'Je betalende klanten zien nooit SceneFlow-creditprijzen en maken geen account aan — ze vertellen hun verhaal, uploaden foto’s en keuren goed via vier white-label mobiele links.',
    customerSteps: [
      {
        step: '01',
        badge: 'Intake Zonder Login',
        title: 'Spreek of Typ Verhaal-Intake & Leg Portrettoestemming Vast',
        detail:
          'Klanten openen jouw eigen /intake-link op hun telefoon, accepteren media- en portretrechten en vertellen of typen hun verhaal zonder account aan te maken.',
        linkLabel: '/intake · White-Label Spraak- & Tekstbriefing',
        phoneHeadline: 'Familie Harbor Memoire',
        phoneStatus: 'Toestemming Vastgelegd · Concept-Blueprint Gereed',
        phoneMeta: 'Geen klantlogin · Producentenlimiet: 2.500 cr',
      },
      {
        step: '02',
        badge: 'Gedeeld Blueprint & ARA',
        title: 'Keur Verhaalbeats Goed Vóór Renderuitgaven',
        detail:
          'Verfijn het tempo op desktop met Audience Resonance en stuur daarna een white-label Blueprint-link voor mobiele klantfeedback en groen licht.',
        linkLabel: '/blueprint/share · Akkoord Vóór Renderen',
        phoneHeadline: 'Blueprint- & Beatbeoordeling',
        phoneStatus: '94 / 100 Audience Resonance · Goedgekeurd',
        phoneMeta: 'Ronde 1 van 2 gebruikt · Klaar voor Continuïteit',
      },
      {
        step: '03',
        badge: 'Gedeelde Continuïteitslink',
        title: 'Upload Telefoonfoto’s (EXIF Verwijderd) & Vergrendel Cast',
        detail:
          'Klanten tikken op je Continuïteitslink om echte familie-, woning- of productfoto’s rechtstreeks uit hun galerij of camera te uploaden en Cast, Kleding & Decors goed te keuren.',
        linkLabel: '/share/continuity · Galerij- & Camera-Upload',
        phoneHeadline: 'Continuïteit & Fotoverzameling',
        phoneStatus: '6 Klantfoto’s Geüpload · Cast & Decors Vergrendeld',
        phoneMeta: 'EXIF GPS automatisch verwijderd · Geen AI-training',
      },
      {
        step: '04',
        badge: 'Gedeelde Screening Room',
        title: 'Framenauwkeurige Mobiele Screening & Masterlevering',
        detail:
          'Klanten bekijken ingesproken voorvertoningen en 4K-montages op elke telefoon zonder inloggen, plaatsen tijdcode-notities en keuren de definitieve master goed.',
        linkLabel: '/share/screening-room · Eindakkoord',
        phoneHeadline: 'Première Screening Room',
        phoneStatus: 'Definitieve 4K Master Goedgekeurd ✓',
        phoneMeta: 'Meertalige streams geleverd · Ruwe uploads verwijderbaar',
      },
    ],
    teamHeading: 'Realtime Mobiel Commandocentrum voor Producenten, Regisseurs & PM’s',
    teamSubheading:
      'Houd elke productie in beweging ook weg van je bureau — met rolgericht inzicht voor workspace-beheerders en toegewezen Project Managers.',
    teamPillars: [
      {
        id: 'alerts',
        title: 'Directe Web Push-Meldingen',
        detail:
          'Krijg meteen bericht zodra een autonome agent klaar is met renderen, een klant een briefing start of nieuwe Continuïteitsfoto’s binnenkomen.',
        metric: 'Directe Push + Inbox',
      },
      {
        id: 'status',
        title: '5-Fasen Mijlpaal- & Tempotracker',
        detail:
          'Volg de voortgang van Blueprint, Resonance, Continuïteit, Productie en Screening Room plus het dagelijkse scènetempo.',
        metric: 'Inzicht in Tempo',
      },
      {
        id: 'budget',
        title: 'Creditsaldo & Harde Budgetlimieten',
        detail:
          'Bewaak beschikbare studiocredits, budgetlimieten per klantproject en maandelijkse PM-creditlimieten in realtime.',
        metric: 'Margebewaking',
      },
      {
        id: 'links',
        title: '1-Tik Native Mobiele Links Delen',
        detail:
          'Deel Blueprint-, Resonance-, Continuïteitsupload- en Screening Room-links direct via SMS, WhatsApp, Slack of e-mail.',
        metric: '4 Gedeelde Portalen',
      },
    ],
    phoneHeaderBrand: 'SceneFlow Companion',
    phoneCreditsPill: '14.250 cr',
    phonePmBadge: 'PM Verbonden',
    phoneVoiceBriefPill: 'Spraak / Brief',
    phoneContinuitySlots: ['Cast ✓', 'Kleding ✓', 'Locaties ✓', 'Rekwisieten ✓'],
    phoneMasterLabel: '4K Master',
    phoneStageBarLabels: ['Blueprint', 'Resonance', 'Continuïteit', 'Bouw', 'Vertoning'],
    phoneTeamAlertTitle: 'Nieuwe Continuïteits-Upload van Klant',
    phoneTeamAlertBody: 'Elena uploadde 6 familiefoto’s · Tik om te bekijken en goed te keuren',
    phoneTeamBudgetLabel: 'Project-Creditbudget',
    phoneTeamBudgetValue: '1.180 / 2.500 cr',
    phoneTeamPaceBadge: 'Op Schema · Binnen Budget',
    installIosBadge: 'iOS Safari: Deel → Zet op beginscherm',
    installAndroidBadge: 'Android / Chrome: 1-Tik App Installeren',
    ctaPrimary: 'Start met Studio + Mobiele PWA ($9)',
  },
}
