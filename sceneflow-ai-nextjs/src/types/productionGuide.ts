export interface CharacterArc {
  act1: string;
  act2: string;
  act3: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  archetype: string;
  motivation: string;
  internalConflict: string;
  externalConflict: string;
  arc: CharacterArc;
}

// Define the structural Acts for the Kanban board (legacy - keeping for backward compatibility)
export type Act = 'ACT_I' | 'ACT_IIA' | 'ACT_IIB' | 'ACT_III';

export type BeatFunction = 
  | 'inciting_incident' | 'plot_point' | 'conflict' | 'revelation' | 'climax' 
  | 'resolution' | 'setup' | 'payoff' | 'transition' | 'character_development'
  | 'exposition' | 'rising_action' | 'falling_action' | 'complication' | 'turning_point';

export type EmotionalCharge = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

export type LocationType = 'INT' | 'EXT' | 'MIXED';
export type TimeOfDay = 'DAWN' | 'MORNING' | 'DAY' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'CONTINUOUS';

export interface ProductionTags {
  location?: string; // e.g., "Laboratory", "Home Office"
  locationType?: LocationType; // INT/EXT
  timeOfDay?: TimeOfDay;
  weatherCondition?: string; // e.g., "Sunny", "Rainy", "Stormy"
  mood?: string; // e.g., "Tense", "Peaceful", "Chaotic"
}

export interface Beat {
  id: string;
  act: string; // The column ID the beat currently resides in (now supports any template column)
  title: string; // e.g., "Inciting Incident"
  summary: string;
  charactersPresent: string[]; // IDs referencing CharacterProfile
  structuralPurpose: string;
  // Timeline view properties
  estimatedDuration?: number; // Duration in minutes
  startTime?: number; // Start time in minutes from beginning
  pacing?: 'slow' | 'medium' | 'fast'; // Pacing indicator
  importance?: 'low' | 'medium' | 'high' | 'critical'; // Story importance
  // Enhanced visual metadata
  beatFunction?: BeatFunction; // Narrative function for icon display
  emotionalCharge?: EmotionalCharge; // Emotional trajectory indicator
  keywords?: string[]; // Story/thematic keywords
  productionTags?: ProductionTags; // Hidden by default, expert-level metadata
}

export type ViewMode = 'kanban' | 'timeline';

export interface ProductionGuide {
  projectId: string;
  title: string;
  filmTreatment: string; // HTML string from Tiptap
  characters: CharacterProfile[];
  beatSheet: Beat[];
  beatTemplate?: string; // Template ID for the current structure
  viewMode?: ViewMode; // Current visualization mode
}
