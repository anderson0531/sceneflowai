export interface SeriesBible {
  seriesTitle: string;
  logline: string;
  synopsis: string;
  protagonist: {
    name: string;
    role: string;
    backstory: string;
    trait: string;
  };
  setting: {
    locationName: string;
    description: string;
    atmosphericNote: string;
  };
  formatStyle: string;
}

export interface MarketSelection {
  originalConcept: string;
  selectedMarket: {
    language: string;
    languageName: string;
    region: string;
    regionName: string;
    arbitrageScore: number;
    culturalNotes: string;
  };
}
