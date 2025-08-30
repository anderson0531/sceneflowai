import { PlatformType, PlatformModel } from '@/types/dol';

export interface PlatformAdapter {
  optimize: (
    prompt: string, 
    parameters: Record<string, any>, 
    features: string[]
  ) => { 
    prompt: string; 
    parameters: Record<string, any>; 
  };
  
  getCapabilities: () => Record<string, any>;
  validateParameters: (parameters: Record<string, any>) => { isValid: boolean; errors: string[] };
}

// Google Adapter for Gemini models
const googleAdapter: PlatformAdapter = {
  optimize: (prompt, parameters, features) => {
    let optimizedPrompt = prompt;
    let optimizedParams = { ...parameters };

    // Apply Google-specific optimizations
    if (features.includes('long-context')) {
      // Optimize for long context models
      optimizedPrompt = `Context: You are an expert AI assistant. ${prompt}`;
    }

    if (features.includes('multimodal')) {
      // Add multimodal capabilities if available
      optimizedParams.multimodal = true;
    }

    return { prompt: optimizedPrompt, parameters: optimizedParams };
  },

  getCapabilities: () => ({
    maxTokens: 32768,
    supportsMultimodal: true,
    supportsLongContext: true
  }),

  validateParameters: (parameters) => {
    const errors: string[] = [];
    
    if (parameters.maxTokens && parameters.maxTokens > 32768) {
      errors.push('maxTokens cannot exceed 32768 for Google models');
    }

    return { isValid: errors.length === 0, errors };
  }
};

// OpenAI Adapter for GPT models
const openaiAdapter: PlatformAdapter = {
  optimize: (prompt, parameters, features) => {
    let optimizedPrompt = prompt;
    let optimizedParams = { ...parameters };

    // Apply OpenAI-specific optimizations
    if (features.includes('advanced-reasoning')) {
      optimizedPrompt = `Please think through this step by step: ${prompt}`;
    }

    if (features.includes('long-context')) {
      optimizedParams.max_tokens = Math.min(parameters.maxTokens || 4096, 128000);
    }

    return { prompt: optimizedPrompt, parameters: optimizedParams };
  },

  getCapabilities: () => ({
    maxTokens: 128000,
    supportsAdvancedReasoning: true,
    supportsLongContext: true
  }),

  validateParameters: (parameters) => {
    const errors: string[] = [];
    
    if (parameters.maxTokens && parameters.maxTokens > 128000) {
      errors.push('maxTokens cannot exceed 128000 for OpenAI models');
    }

    return { isValid: errors.length === 0, errors };
  }
};

// RunwayML Adapter for video generation
const runwayAdapter: PlatformAdapter = {
  optimize: (prompt, parameters, features) => {
    let optimizedPrompt = prompt;
    let optimizedParams = { ...parameters };

    // Apply Runway-specific optimizations
    if (features.includes('motion-brush-v2') && parameters.motionSettings) {
      optimizedParams.motion_control = parameters.motionSettings;
      delete optimizedParams.motionSettings;
    }

    if (features.includes('neg-prompting-advanced') && !parameters.negative_prompt) {
      optimizedParams.negative_prompt = "blurry, low resolution, artifacts, distorted, poor quality, watermark";
    }

    if (features.includes('style-transfer') && parameters.style) {
      optimizedParams.style_preset = parameters.style;
      delete optimizedParams.style;
    }

    return { prompt: optimizedPrompt, parameters: optimizedParams };
  },

  getCapabilities: () => ({
    maxDuration: 16,
    maxResolution: '1920x1080',
    supportsMotionControl: true,
    supportsStyleTransfer: true
  }),

  validateParameters: (parameters) => {
    const errors: string[] = [];
    
    if (parameters.duration && parameters.duration > 16) {
      errors.push('Duration cannot exceed 16 seconds for Runway models');
    }

    if (parameters.resolution && !['1920x1080', '1080x1920', '1024x1024'].includes(parameters.resolution)) {
      errors.push('Unsupported resolution for Runway models');
    }

    return { isValid: errors.length === 0, errors };
  }
};

// Pika Labs Adapter
const pikaAdapter: PlatformAdapter = {
  optimize: (prompt, parameters, features) => {
    let optimizedPrompt = prompt;
    let optimizedParams = { ...parameters };

    // Apply Pika-specific optimizations
    if (features.includes('style-transfer')) {
      optimizedParams.style_preset = parameters.style || 'cinematic';
    }

    if (features.includes('fast-generation')) {
      optimizedParams.quality = 'draft'; // Pika is optimized for speed
    }

    return { prompt: optimizedPrompt, parameters: optimizedParams };
  },

  getCapabilities: () => ({
    maxDuration: 6,
    maxResolution: '1024x1024',
    supportsStyleTransfer: true,
    fastGeneration: true
  }),

  validateParameters: (parameters) => {
    const errors: string[] = [];
    
    if (parameters.duration && parameters.duration > 6) {
      errors.push('Duration cannot exceed 6 seconds for Pika models');
    }

    return { isValid: errors.length === 0, errors };
  }
};

// Google Veo Adapter
const veoAdapter: PlatformAdapter = {
  optimize: (prompt, parameters, features) => {
    let optimizedPrompt = prompt;
    let optimizedParams = { ...parameters };

    // Apply Veo-specific optimizations
    if (features.includes('high-quality')) {
      optimizedParams.quality = 'high';
    }

    if (features.includes('advanced-motion')) {
      optimizedParams.motion_intensity = Math.min(parameters.motionIntensity || 5, 10);
    }

    if (features.includes('style-control')) {
      optimizedParams.style_preset = parameters.style || 'realistic';
    }

    return { prompt: optimizedPrompt, parameters: optimizedParams };
  },

  getCapabilities: () => ({
    maxDuration: 10,
    maxResolution: '1920x1080',
    supportsHighQuality: true,
    supportsAdvancedMotion: true
  }),

  validateParameters: (parameters) => {
    const errors: string[] = [];
    
    if (parameters.duration && parameters.duration > 10) {
      errors.push('Duration cannot exceed 10 seconds for Veo models');
    }

    return { isValid: errors.length === 0, errors };
  }
};

// Generic Adapter (Fallback)
const genericAdapter: PlatformAdapter = {
  optimize: (prompt, parameters) => ({ prompt, parameters }),
  
  getCapabilities: () => ({
    generic: true
  }),

  validateParameters: () => ({ isValid: true, errors: [] })
};

/**
 * Get platform adapter based on platform ID
 */
export const getPlatformAdapter = (platformId: string): PlatformAdapter => {
  switch (platformId.toLowerCase()) {
    case 'google':
    case 'google-veo':
      return googleAdapter;
    case 'openai':
      return openaiAdapter;
    case 'runwayml':
    case 'runway':
      return runwayAdapter;
    case 'pika-labs':
    case 'pika':
      return pikaAdapter;
    case 'stability-ai':
    case 'stable-video':
      return genericAdapter; // TODO: Implement Stability AI adapter
    case 'luma-ai':
    case 'luma':
      return genericAdapter; // TODO: Implement Luma AI adapter
    default:
      return genericAdapter;
  }
};

/**
 * Get all available platform adapters
 */
export const getAllPlatformAdapters = (): Record<string, PlatformAdapter> => ({
  google: googleAdapter,
  openai: openaiAdapter,
  runway: runwayAdapter,
  pika: pikaAdapter,
  veo: veoAdapter,
  generic: genericAdapter
});
