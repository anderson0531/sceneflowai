export const marketOutlookData = (region, language) => {
  // This is placeholder data. In a real application, you would fetch this
  // from an API based on the selected region and language.
  const allConcepts = [
    {
      id: 1,
      title: "AI Detective in Neo-Tokyo",
      description: "A classic noir detective story set in a futuristic, neon-lit Tokyo, where the lead detective is a highly advanced AI.",
      regions: ['global', 'as'],
      languages: ['en', 'jp'],
    },
    {
      id: 2,
      title: "The Last Library",
      description: "In a world where all knowledge is digital and controlled, a small group of rebels fight to protect the last physical library.",
      regions: ['global', 'na', 'eu'],
      languages: ['en', 'fr', 'es'],
    },
    {
      id: 3,
      title: "Startup Sitcom",
      description: "A lighthearted comedy about the trials and tribulations of a group of friends trying to launch a tech startup.",
      regions: ['na'],
      languages: ['en'],
    },
    {
      id: 4,
      title: "El Corazón de la Selva",
      description: "An adventure story about a young botanist who travels deep into the Amazon rainforest to find a mythical healing plant.",
      regions: ['sa'],
      languages: ['es'],
    },
    {
        id: 5,
        title: "Parisian Pastry Chef Mystery",
        description: "A cozy mystery series where a Parisian pastry chef solves crimes in her spare time.",
        regions: ['eu'],
        languages: ['fr', 'en'],
    }
  ];

  return allConcepts.filter(concept => 
    (region === 'global' || concept.regions.includes(region)) &&
    (concept.languages.includes(language))
  );
};
