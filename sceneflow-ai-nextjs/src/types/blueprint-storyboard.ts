    export interface BlueprintFrame {
  id: string;
  index: number;
  slugline?: string;
  shot: string;
  description: string;
  imagePrompt: string;
  audioCues: string;
  durationSec: number;
  camera?: string;
  lighting?: string;
  mood?: string;
  imageUrl?: string;
  notes?: string[];
}

export interface BlueprintStoryboard {
  frames: BlueprintFrame[];
  totalDurationSec: number;
  source: {
    fountain?: string;
    scriptBlocksHash?: string;
  };
}


