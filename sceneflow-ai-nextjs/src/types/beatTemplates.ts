export interface BeatTemplateColumn {
  id: string;
  label: string;
  description: string;
  color: string; // Tailwind color class
  icon: string; // Lucide icon name
  order: number;
}

export interface BeatTemplate {
  id: string;
  name: string;
  description: string;
  category: 'classical' | 'modern' | 'genre-specific';
  columns: BeatTemplateColumn[];
  defaultBeats?: {
    columnId: string;
    title: string;
    summary: string;
    structuralPurpose: string;
  }[];
}

// Standard 3-Act Structure
export const threeActTemplate: BeatTemplate = {
  id: 'three-act',
  name: 'Classic 3-Act Structure',
  description: 'The foundational storytelling structure used in most films and narratives',
  category: 'classical',
  columns: [
    {
      id: 'ACT_I',
      label: 'Act I: Setup',
      description: 'Establish world, characters, and inciting incident',
      color: 'blue',
      icon: 'Play',
      order: 1
    },
    {
      id: 'ACT_II',
      label: 'Act II: Confrontation',
      description: 'Rising action, obstacles, and character development',
      color: 'orange',
      icon: 'Zap',
      order: 2
    },
    {
      id: 'ACT_III',
      label: 'Act III: Resolution',
      description: 'Climax, falling action, and resolution',
      color: 'green',
      icon: 'CheckCircle',
      order: 3
    }
  ],
  defaultBeats: [
    {
      columnId: 'ACT_I',
      title: 'Opening Image',
      summary: 'First impression of the story world and tone',
      structuralPurpose: 'Hook the audience and establish visual style'
    },
    {
      columnId: 'ACT_I',
      title: 'Inciting Incident',
      summary: 'The event that sets the story in motion',
      structuralPurpose: 'Launch the main conflict and story question'
    },
    {
      columnId: 'ACT_II',
      title: 'First Plot Point',
      summary: 'Protagonist commits to the journey',
      structuralPurpose: 'Lock the protagonist into the main story'
    },
    {
      columnId: 'ACT_II',
      title: 'Midpoint',
      summary: 'Major revelation or plot twist',
      structuralPurpose: 'Shift the story dynamic and raise stakes'
    },
    {
      columnId: 'ACT_III',
      title: 'Climax',
      summary: 'Final confrontation and peak tension',
      structuralPurpose: 'Resolve the main conflict'
    },
    {
      columnId: 'ACT_III',
      title: 'Resolution',
      summary: 'New normal and final image',
      structuralPurpose: 'Show the changed world and characters'
    }
  ]
};

// 5-Act Structure (Freytag's Pyramid)
export const fiveActTemplate: BeatTemplate = {
  id: 'five-act',
  name: '5-Act Structure (Freytag\'s Pyramid)',
  description: 'Classical dramatic structure with detailed rising and falling action',
  category: 'classical',
  columns: [
    {
      id: 'EXPOSITION',
      label: 'Exposition',
      description: 'Background information and character introduction',
      color: 'blue',
      icon: 'BookOpen',
      order: 1
    },
    {
      id: 'RISING_ACTION',
      label: 'Rising Action',
      description: 'Building tension and developing conflict',
      color: 'yellow',
      icon: 'TrendingUp',
      order: 2
    },
    {
      id: 'CLIMAX',
      label: 'Climax',
      description: 'Turning point and peak tension',
      color: 'red',
      icon: 'Zap',
      order: 3
    },
    {
      id: 'FALLING_ACTION',
      label: 'Falling Action',
      description: 'Consequences of the climax unfold',
      color: 'orange',
      icon: 'TrendingDown',
      order: 4
    },
    {
      id: 'DENOUEMENT',
      label: 'Denouement',
      description: 'Resolution and new equilibrium',
      color: 'green',
      icon: 'CheckCircle',
      order: 5
    }
  ]
};

// Save the Cat Beat Sheet
export const saveCatTemplate: BeatTemplate = {
  id: 'save-the-cat',
  name: 'Save the Cat! Beat Sheet',
  description: 'Blake Snyder\'s popular 15-beat structure for screenwriting',
  category: 'modern',
  columns: [
    {
      id: 'SETUP',
      label: 'Setup (1-10%)',
      description: 'Opening image, theme, and character introduction',
      color: 'blue',
      icon: 'Camera',
      order: 1
    },
    {
      id: 'CATALYST',
      label: 'Catalyst (10-25%)',
      description: 'Inciting incident and debate',
      color: 'purple',
      icon: 'Spark',
      order: 2
    },
    {
      id: 'DEBATE',
      label: 'Debate & Break',
      description: 'Decision point and entering Act II',
      color: 'indigo',
      icon: 'MessageSquare',
      order: 3
    },
    {
      id: 'FUN_GAMES',
      label: 'Fun & Games (25-50%)',
      description: 'Promise of the premise delivered',
      color: 'green',
      icon: 'Gamepad2',
      order: 4
    },
    {
      id: 'MIDPOINT',
      label: 'Midpoint (50%)',
      description: 'False victory or defeat, stakes raised',
      color: 'yellow',
      icon: 'Target',
      order: 5
    },
    {
      id: 'BAD_GUYS',
      label: 'Bad Guys Close In (50-75%)',
      description: 'Internal and external forces converge',
      color: 'orange',
      icon: 'Shield',
      order: 6
    },
    {
      id: 'DARK_NIGHT',
      label: 'Dark Night (75%)',
      description: 'All is lost moment',
      color: 'red',
      icon: 'Moon',
      order: 7
    },
    {
      id: 'FINALE',
      label: 'Finale (75-100%)',
      description: 'Climax, resolution, and final image',
      color: 'emerald',
      icon: 'Crown',
      order: 8
    }
  ]
};

// Hero's Journey
export const heroJourneyTemplate: BeatTemplate = {
  id: 'hero-journey',
  name: 'The Hero\'s Journey',
  description: 'Joseph Campbell\'s monomyth structure for mythic storytelling',
  category: 'classical',
  columns: [
    {
      id: 'ORDINARY_WORLD',
      label: 'Ordinary World',
      description: 'Hero\'s normal life before transformation',
      color: 'slate',
      icon: 'Home',
      order: 1
    },
    {
      id: 'CALL_ADVENTURE',
      label: 'Call to Adventure',
      description: 'Disruption and quest begins',
      color: 'blue',
      icon: 'MapPin',
      order: 2
    },
    {
      id: 'SPECIAL_WORLD',
      label: 'Special World',
      description: 'Crossing threshold, tests, and allies',
      color: 'purple',
      icon: 'Compass',
      order: 3
    },
    {
      id: 'ORDEAL',
      label: 'Ordeal',
      description: 'Greatest fear and death/rebirth',
      color: 'red',
      icon: 'Skull',
      order: 4
    },
    {
      id: 'REWARD',
      label: 'Reward',
      description: 'Seizing the sword and consequences',
      color: 'yellow',
      icon: 'Award',
      order: 5
    },
    {
      id: 'RETURN',
      label: 'Return',
      description: 'Road back and resurrection',
      color: 'green',
      icon: 'RotateCcw',
      order: 6
    }
  ]
};

// Documentary Structure
export const documentaryTemplate: BeatTemplate = {
  id: 'documentary',
  name: 'Documentary Structure',
  description: 'Non-fiction storytelling with investigation and revelation',
  category: 'genre-specific',
  columns: [
    {
      id: 'HOOK',
      label: 'Hook & Context',
      description: 'Compelling opening and background setup',
      color: 'blue',
      icon: 'Eye',
      order: 1
    },
    {
      id: 'INVESTIGATION',
      label: 'Investigation',
      description: 'Exploring the subject and gathering evidence',
      color: 'yellow',
      icon: 'Search',
      order: 2
    },
    {
      id: 'COMPLICATION',
      label: 'Complication',
      description: 'Obstacles, opposing views, and complexity',
      color: 'orange',
      icon: 'AlertTriangle',
      order: 3
    },
    {
      id: 'REVELATION',
      label: 'Revelation',
      description: 'Key insights and turning points',
      color: 'purple',
      icon: 'Lightbulb',
      order: 4
    },
    {
      id: 'SYNTHESIS',
      label: 'Synthesis',
      description: 'Conclusions and broader implications',
      color: 'green',
      icon: 'Puzzle',
      order: 5
    }
  ]
};

// Debate/Educational Structure (current default)
export const debateTemplate: BeatTemplate = {
  id: 'debate-educational',
  name: 'Debate & Educational',
  description: 'Structured exploration of multiple perspectives on a topic',
  category: 'genre-specific',
  columns: [
    {
      id: 'ACT_I',
      label: 'Setup & Stakes',
      description: 'Introduce topic and establish importance',
      color: 'blue',
      icon: 'Lightbulb',
      order: 1
    },
    {
      id: 'ACT_IIA',
      label: 'The Arguments',
      description: 'Present different perspectives and evidence',
      color: 'orange',
      icon: 'Settings',
      order: 2
    },
    {
      id: 'ACT_IIB',
      label: 'Finding Balance',
      description: 'Explore common ground and synthesis',
      color: 'green',
      icon: 'Scale',
      order: 3
    },
    {
      id: 'ACT_III',
      label: 'Resolution',
      description: 'Conclusions and key takeaways',
      color: 'purple',
      icon: 'CheckCircle',
      order: 4
    }
  ]
};

export const allTemplates: BeatTemplate[] = [
  debateTemplate, // Current default first
  threeActTemplate,
  fiveActTemplate,
  saveCatTemplate,
  heroJourneyTemplate,
  documentaryTemplate
];

export const getTemplateById = (id: string): BeatTemplate | undefined => {
  return allTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: BeatTemplate['category']): BeatTemplate[] => {
  return allTemplates.filter(template => template.category === category);
};
