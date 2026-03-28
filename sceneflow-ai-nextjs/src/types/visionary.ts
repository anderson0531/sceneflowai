export interface OptimizedCreative {
  // Creative Core
  optimizedTitle: string;        // The "High CTR" Title (e.g., 'The Path to Grandmaster')
  seriesHook: string;            // The first 30 seconds strategy
  conceptBrief: string;          // The narrative "arc" of the series

  // Market-Specific Strategy
  targetMarket: {
    language: string;            // e.g., 'Japanese'
    region: string;              // e.g., 'JP'
    culturalAngle: string;       // Why this specific market will watch this
  };

  // YouTube Growth Metrics
  productionFocus: {
    visualStyle: string;         // e.g., 'High-energy CGI overlays', 'Cinematic Noir'
    pacingNote: string;          // e.g., 'Fast-cut, no dead air' or 'Deep-dive analytical'
    thumbnailConcept: string;    // Specific visual advice for the localized thumbnail
  };

  // The SceneFlow Advantage
  localizationStrategy: {
    voiceTone: string;           // e.g., 'Authoritative Sensei' or 'Excited Peer'
    onscreenTextNeeds: string;   // What needs to be visually translated vs. dubbed
  };
}

export interface MarketSelection {
  selectedMarketId: string;      // Links back to the Arbitrage Map ID
  originalConcept: string;
}
