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

// Define the structural Acts for the Kanban board
export type Act = 'ACT_I' | 'ACT_IIA' | 'ACT_IIB' | 'ACT_III';

export interface Beat {
  id: string;
  act: Act; // The column the beat currently resides in
  title: string; // e.g., "Inciting Incident"
  summary: string;
  charactersPresent: string[]; // IDs referencing CharacterProfile
  structuralPurpose: string;
}

export interface ProductionGuide {
  projectId: string;
  title: string;
  filmTreatment: string; // HTML string from Tiptap
  characters: CharacterProfile[];
  beatSheet: Beat[];
}
