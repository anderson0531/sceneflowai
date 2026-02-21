/**
 * Prompt Moderator
 * 
 * Client-side pre-screening for video generation prompts.
 * Detects words/phrases that commonly trigger Vertex AI content safety filters
 * and provides actionable suggestions for rephrasing.
 * 
 * @module promptModerator
 */

/**
 * Words that commonly trigger Veo's content safety filters
 * Mapped to cinematically-appropriate alternatives
 */
export const TRIGGER_WORD_ALTERNATIVES: Record<string, string[]> = {
  // Medical/biological terms
  'necrotic': ['darkened', 'discolored', 'shadowed', 'blackened', 'withered'],
  'rotting': ['deteriorating', 'decaying slowly', 'weathered', 'aged'],
  'decaying': ['deteriorating', 'fading', 'withering', 'crumbling'],
  'festering': ['spreading', 'growing', 'worsening'],
  'gangrenous': ['blackened', 'discolored', 'withered'],
  'infected': ['affected', 'spreading', 'damaged'],
  'pus': ['fluid', 'discharge', 'liquid'],
  'lesion': ['mark', 'spot', 'blemish'],
  'tumor': ['growth', 'mass', 'swelling'],
  'cancer': ['illness', 'disease', 'condition'],
  
  // Violence/gore terms
  'gore': ['visceral detail', 'intense imagery', 'dramatic effect'],
  'gory': ['intense', 'visceral', 'dramatic'],
  'blood': ['dark liquid', 'crimson', 'red fluid', 'life force'],
  'bloody': ['stained', 'marked', 'crimson-covered'],
  'bloodied': ['stained', 'marked', 'wounded'],
  'bleeding': ['flowing', 'dripping', 'wounded'],
  'corpse': ['motionless figure', 'still form', 'lifeless body', 'fallen figure'],
  'dead body': ['motionless figure', 'fallen form', 'still figure'],
  'cadaver': ['still form', 'motionless figure'],
  'wound': ['injury', 'mark', 'damage'],
  'wounds': ['injuries', 'marks', 'damage'],
  'wounded': ['injured', 'hurt', 'damaged'],
  'mutilated': ['damaged', 'scarred', 'marked'],
  'mutilation': ['damage', 'scarring', 'injury'],
  'severed': ['separated', 'detached', 'cut'],
  'dismembered': ['broken apart', 'separated', 'torn'],
  'decapitated': ['fallen', 'separated'],
  'disemboweled': ['struck', 'fallen'],
  'impaled': ['struck', 'pierced', 'hit'],
  'stabbed': ['struck', 'hit', 'attacked'],
  'slashed': ['cut', 'marked', 'struck'],
  'guts': ['interior', 'inside'],
  'entrails': ['interior', 'contents'],
  'intestines': ['interior'],
  'organs': ['interior', 'inside'],
  
  // Death-related terms
  'death': ['end', 'final moment', 'passing', 'fate'],
  'dying': ['fading', 'weakening', 'failing', 'falling'],
  'kill': ['stop', 'end', 'defeat', 'overcome'],
  'killed': ['stopped', 'ended', 'defeated', 'overcome'],
  'killing': ['ending', 'stopping', 'defeating'],
  'murder': ['crime', 'act', 'incident', 'event'],
  'murdered': ['attacked', 'harmed'],
  'murderer': ['attacker', 'antagonist', 'villain'],
  'assassinate': ['target', 'attack'],
  'slaughter': ['attack', 'overwhelm', 'defeat'],
  'massacre': ['attack', 'conflict', 'battle'],
  'execution': ['ending', 'finale', 'conclusion'],
  'suicide': ['fall', 'ending', 'tragedy'],
  
  // Torture/suffering terms
  'torture': ['suffering', 'ordeal', 'distress', 'struggle'],
  'tortured': ['suffering', 'struggling', 'in distress'],
  'torment': ['struggle', 'suffering', 'difficulty'],
  'agony': ['pain', 'distress', 'struggle'],
  'anguish': ['distress', 'sorrow', 'pain'],
  
  // Violence descriptors
  'violent': ['intense', 'dramatic', 'forceful', 'powerful'],
  'violently': ['intensely', 'dramatically', 'forcefully'],
  'brutal': ['harsh', 'intense', 'severe', 'unforgiving'],
  'brutally': ['harshly', 'intensely', 'severely'],
  'savage': ['fierce', 'wild', 'untamed'],
  'vicious': ['fierce', 'intense', 'aggressive'],
  'gruesome': ['unsettling', 'disturbing', 'haunting', 'dark'],
  'horrific': ['terrifying', 'shocking', 'intense'],
  'grisly': ['dark', 'disturbing', 'unsettling'],
  'macabre': ['dark', 'eerie', 'haunting'],
  
  // Weapons with violent context
  'gun': ['weapon', 'firearm', 'piece'],
  'knife': ['blade', 'tool', 'edge'],
  'sword': ['blade', 'weapon', 'steel'],
  'weapon': ['tool', 'instrument', 'object'],
  
  // Sexual/explicit terms (block entirely or replace)
  'naked': ['unclothed', 'bare', 'exposed'],
  'nude': ['unclothed', 'bare'],
  'sexual': ['intimate', 'romantic'],
  'erotic': ['romantic', 'intimate'],
  
  // Drug-related
  'drugs': ['substances', 'chemicals'],
  'cocaine': ['substance', 'powder'],
  'heroin': ['substance'],
  'overdose': ['collapse', 'fall'],
  
  // Emotional/atmospheric terms (trigger Vertex AI classifiers)
  // These work in Gemini Chat but get flagged by the stricter Enterprise API
  'unsettling': ['cinematic', 'atmospheric', 'evocative', 'dramatic'],
  'psychological unease': ['high-contrast lighting', 'dramatic tension', 'moody atmosphere'],
  'psychological': ['emotional', 'intense', 'deep'],
  'unease': ['tension', 'atmosphere', 'mood'],
  'foreboding': ['atmospheric', 'dramatic', 'suspenseful', 'anticipatory'],
  'dread': ['anticipation', 'tension', 'suspense'],
  'terror': ['intensity', 'suspense', 'drama'],
  'terrifying': ['intense', 'dramatic', 'gripping'],
  'horrifying': ['intense', 'shocking', 'dramatic'],
  'disturbing': ['intense', 'provocative', 'thought-provoking'],
  'creepy': ['mysterious', 'enigmatic', 'atmospheric'],
  'eerie': ['mysterious', 'atmospheric', 'ethereal'],
  'sinister': ['mysterious', 'shadowy', 'ominous-feeling'],
  'menacing': ['imposing', 'powerful', 'commanding'],
  'threatening': ['imposing', 'intense', 'formidable'],
  'ominous': ['atmospheric', 'dramatic', 'portentous'],
  
  // Biological/organic terms that trigger "gross-out" filters
  'organic material': ['complex textures', 'natural surfaces', 'textured materials'],
  'organic': ['natural', 'flowing', 'textured'],
  'corroded': ['weathered', 'industrial', 'aged', 'patinated'],
  'corrosion': ['weathering', 'patina', 'aging'],
  'decay': ['aging', 'weathering', 'time-worn'],
  'decayed': ['aged', 'weathered', 'time-worn'],
  'moldy': ['textured', 'aged', 'weathered'],
  'slimy': ['glossy', 'wet', 'reflective'],
  'putrid': ['aged', 'deteriorated', 'weathered'],
  'rancid': ['aged', 'deteriorated'],
  'festering': ['spreading', 'growing', 'developing'],
  'necrotic': ['darkened', 'shadowed', 'blackened'],
  'tissue': ['material', 'surface', 'substance'],
  'flesh': ['surface', 'material', 'skin-like texture'],
  'visceral': ['intense', 'raw', 'powerful', 'emotional'],
  
  // Body-related terms
  'veins': ['lines', 'patterns', 'networks'],
  'arteries': ['pathways', 'channels', 'networks'],
  'neural': ['network', 'connected', 'intricate'],
  'biological': ['natural', 'organic-looking', 'living'],
  
  // Intense emotional states
  'agonizing': ['intense', 'powerful', 'profound'],
  'tormented': ['struggling', 'conflicted', 'troubled'],
  'suffering': ['struggling', 'enduring', 'persevering'],
  'claustrophobic': ['intimate', 'close', 'confined'],
  'suffocating': ['pressing', 'enclosing', 'enveloping'],
  'oppressive': ['heavy', 'weighty', 'imposing'],
  
  // Replacement for sci-fi/tech contexts
  'pulsating': ['glowing', 'rhythmic', 'dynamic'],
  'throbbing': ['pulsing', 'rhythmic', 'dynamic'],
  'writhing': ['flowing', 'undulating', 'moving'],
};

/**
 * Phrases that are commonly flagged (multi-word patterns)
 */
const TRIGGER_PHRASES: Record<string, string> = {
  'pool of blood': 'dark pool',
  'covered in blood': 'stained and marked',
  'soaked in blood': 'deeply stained',
  'dripping with blood': 'dripping crimson',
  'blood everywhere': 'crimson everywhere',
  'dead bodies': 'motionless figures',
  'pile of bodies': 'fallen figures',
  'mass grave': 'burial site',
  'self-harm': 'struggling',
  'self harm': 'struggling',
  'cut themselves': 'hurt',
  'cuts themselves': 'hurts',
  'slit wrists': 'injured',
  'slit throat': 'attacked',
  'blow their brains': 'fall',
  'shoot themselves': 'collapse',
  
  // Emotional/atmospheric phrases (trigger Vertex AI but not Gemini Chat)
  'psychological unease': 'dramatic tension',
  'sense of dread': 'sense of anticipation',
  'feeling of terror': 'feeling of intensity',
  'unsettling atmosphere': 'atmospheric tension',
  'creeping horror': 'building suspense',
  'visceral fear': 'intense emotion',
  'primal fear': 'deep emotion',
  'bone-chilling': 'spine-tingling',
  'blood-curdling': 'intense',
  'gut-wrenching': 'emotionally powerful',
  'heart-stopping': 'breathtaking',
  
  // Biological/organic phrases
  'organic material': 'textured material',
  'organic matter': 'natural textures',
  'biological matter': 'complex surfaces',
  'living tissue': 'dynamic surface',
  'neural network': 'intricate network',
  'neural pathways': 'glowing pathways',
  'pulsating veins': 'glowing circuit lines',
  'throbbing mass': 'dynamic form',
  
  // Dark aesthetic phrases (safe replacements)
  'corroded metal': 'weathered industrial metal',
  'rusted and corroded': 'weathered and patinated',
  'decaying surface': 'aged textured surface',
  'rotting wood': 'weathered aged wood',
};

export interface ModerationResult {
  isClean: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  flaggedTerms: Array<{
    term: string;
    alternatives: string[];
    position: number;
  }>;
  suggestedPrompt: string;
  warnings: string[];
}

/**
 * Analyze a prompt for content that may trigger safety filters
 */
export function moderatePrompt(prompt: string): ModerationResult {
  const flaggedTerms: ModerationResult['flaggedTerms'] = [];
  const warnings: string[] = [];
  let sanitizedPrompt = prompt;
  const lowerPrompt = prompt.toLowerCase();

  // Check for trigger phrases first (multi-word patterns)
  for (const [phrase, replacement] of Object.entries(TRIGGER_PHRASES)) {
    const phraseIndex = lowerPrompt.indexOf(phrase);
    if (phraseIndex !== -1) {
      flaggedTerms.push({
        term: phrase,
        alternatives: [replacement],
        position: phraseIndex,
      });
      // Replace in sanitized prompt (case-insensitive)
      const regex = new RegExp(phrase, 'gi');
      sanitizedPrompt = sanitizedPrompt.replace(regex, replacement);
    }
  }

  // Check for individual trigger words
  for (const [word, alternatives] of Object.entries(TRIGGER_WORD_ALTERNATIVES)) {
    // Word boundary matching to avoid partial matches
    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    
    while ((match = wordRegex.exec(lowerPrompt)) !== null) {
      // Check if this position was already covered by a phrase
      const alreadyFlagged = flaggedTerms.some(
        ft => match!.index >= ft.position && match!.index < ft.position + ft.term.length
      );
      
      if (!alreadyFlagged) {
        flaggedTerms.push({
          term: match[0],
          alternatives,
          position: match.index,
        });
        // Replace in sanitized prompt with first alternative
        sanitizedPrompt = sanitizedPrompt.replace(
          new RegExp(`\\b${word}\\b`, 'i'),
          alternatives[0]
        );
      }
    }
  }

  // Determine severity based on number and type of flagged terms
  let severity: ModerationResult['severity'] = 'none';
  if (flaggedTerms.length > 0) {
    const highSeverityTerms = ['gore', 'gory', 'mutilated', 'dismembered', 'decapitated', 'torture', 'massacre'];
    const hasHighSeverity = flaggedTerms.some(ft => 
      highSeverityTerms.includes(ft.term.toLowerCase())
    );
    
    if (hasHighSeverity || flaggedTerms.length >= 5) {
      severity = 'high';
      warnings.push('This prompt contains multiple terms that are very likely to be flagged by content safety filters.');
    } else if (flaggedTerms.length >= 3) {
      severity = 'medium';
      warnings.push('This prompt contains several terms that may trigger content safety filters.');
    } else {
      severity = 'low';
      warnings.push('This prompt contains terms that might be flagged. Consider using the suggested alternatives.');
    }
  }

  return {
    isClean: flaggedTerms.length === 0,
    severity,
    flaggedTerms,
    suggestedPrompt: sanitizedPrompt,
    warnings,
  };
}

/**
 * Quick check if a prompt is likely to be flagged
 */
export function isPromptRisky(prompt: string): boolean {
  const result = moderatePrompt(prompt);
  return result.severity === 'medium' || result.severity === 'high';
}

/**
 * Get a user-friendly message explaining content policy issues
 */
export function getContentPolicyMessage(result: ModerationResult): string {
  if (result.isClean) {
    return 'Your prompt looks good!';
  }

  const termList = result.flaggedTerms
    .slice(0, 3) // Show max 3 terms
    .map(ft => `"${ft.term}" → "${ft.alternatives[0]}"`)
    .join(', ');

  const moreCount = result.flaggedTerms.length - 3;
  const moreText = moreCount > 0 ? ` and ${moreCount} more` : '';

  return `Some terms may trigger content filters: ${termList}${moreText}. Click "Auto-Fix" to use cinematic alternatives.`;
}

/**
 * Build system prompt for Gemini to regenerate a flagged prompt
 */
export function buildRegenerationSystemPrompt(): string {
  return `You are a cinematic prompt engineer helping rephrase video generation prompts to avoid content safety filter triggers.

Your task is to take a prompt that was flagged by Google Vertex AI's content safety system and rewrite it to:
1. Preserve the creative intent and visual storytelling
2. Replace graphic/explicit terms with cinematic alternatives
3. Focus on visual descriptions rather than violent actions
4. Maintain the emotional tone without triggering filters

Guidelines:
- "blood" → "crimson", "dark liquid", "stained"
- "corpse/dead body" → "motionless figure", "fallen form"
- "wound" → "injury", "mark"
- "violent" → "intense", "dramatic", "forceful"
- "gore" → "visceral detail", "dramatic imagery"
- "torture" → "suffering", "ordeal", "struggle"
- "death/dying" → "fading", "falling", "end"
- "kill" → "defeat", "stop", "overcome"

Focus on camera movements, lighting, composition, and emotion rather than graphic details.
Keep the response concise - output only the rephrased prompt with no explanations.`;
}

/**
 * Build user prompt for Gemini regeneration
 */
export function buildRegenerationUserPrompt(originalPrompt: string, flaggedTerms: string[]): string {
  return `The following video generation prompt was flagged by content safety filters.
Please rewrite it to achieve the same cinematic effect while avoiding these flagged terms: ${flaggedTerms.join(', ')}

Original prompt:
"${originalPrompt}"

Rephrased prompt:`;
}

/**
 * Auto-sanitize a prompt for API submission.
 * Silently applies safe alternatives without user intervention.
 * Use this for server-side automatic moderation before Vertex AI calls.
 * 
 * @param prompt - The original prompt
 * @param options - Sanitization options
 * @returns The sanitized prompt (or original if already clean)
 */
export function autoSanitizePrompt(
  prompt: string,
  options: {
    /** Log sanitization actions for debugging */
    logChanges?: boolean;
    /** Only sanitize if severity is at or above this level */
    minSeverity?: 'low' | 'medium' | 'high';
  } = {}
): { sanitizedPrompt: string; wasModified: boolean; changes: string[] } {
  const { logChanges = false, minSeverity = 'low' } = options;
  
  const result = moderatePrompt(prompt);
  
  // If clean, return original
  if (result.isClean) {
    return { sanitizedPrompt: prompt, wasModified: false, changes: [] };
  }
  
  // Check if severity meets threshold
  const severityOrder = { none: 0, low: 1, medium: 2, high: 3 };
  if (severityOrder[result.severity] < severityOrder[minSeverity]) {
    return { sanitizedPrompt: prompt, wasModified: false, changes: [] };
  }
  
  // Build change log
  const changes = result.flaggedTerms.map(
    ft => `"${ft.term}" → "${ft.alternatives[0]}"`
  );
  
  if (logChanges && changes.length > 0) {
    console.log('[PromptModerator] Auto-sanitized prompt:', changes.join(', '));
  }
  
  return {
    sanitizedPrompt: result.suggestedPrompt,
    wasModified: true,
    changes
  };
}

/**
 * Check if a prompt is likely to fail Vertex AI but pass Gemini Chat.
 * These are prompts with "emotional trigger" words that the stricter
 * Enterprise classifier flags, but the consumer classifier allows.
 * 
 * @param prompt - The prompt to check
 * @returns true if the prompt may need Gemini fallback
 */
export function mayNeedGeminiFallback(prompt: string): boolean {
  const emotionalTriggers = [
    'unsettling', 'psychological', 'foreboding', 'dread', 'terror',
    'creepy', 'eerie', 'sinister', 'menacing', 'ominous', 'disturbing',
    'organic material', 'corroded', 'decay', 'visceral', 'flesh',
    'claustrophobic', 'suffocating', 'agonizing', 'tormented'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  return emotionalTriggers.some(trigger => lowerPrompt.includes(trigger));
}
