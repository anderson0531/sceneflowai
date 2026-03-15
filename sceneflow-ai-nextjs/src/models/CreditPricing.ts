import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

/**
 * CreditPricing Model
 * 
 * Database-backed credit pricing configuration for dynamic price adjustments.
 * Allows updating credit costs without code deployments.
 * 
 * Pricing Philosophy:
 * - Exchange Rate: $1.00 USD = 100 Credits (1 credit = $0.01)
 * - Target Margin: 40-60% profit margin
 * - BYOK Discount: 20% of standard price (platform fee only)
 */

export type CreditProvider = 
  | 'google_vertex'     // Imagen, Veo, Gemini via Vertex AI
  | 'google_genai'      // Gemini via consumer API
  | 'elevenlabs'        // TTS, SFX, Music
  | 'openai'            // DALL-E, GPT (fallback)
  | 'stability'         // Stable Diffusion (future)
  | 'runway'            // Runway Gen-2 (future)
  | 'platform'          // Internal platform operations (render, storage)

export type CreditCategory = 
  | 'image_generation'  // Frame, scene, character images
  | 'video_generation'  // Veo video clips
  | 'text_generation'   // LLM prompts, scripts, analysis
  | 'audio_tts'         // Text-to-speech narration/dialogue
  | 'audio_sfx'         // Sound effects generation
  | 'audio_music'       // Music generation
  | 'video_upscale'     // Topaz-style upscaling
  | 'render'            // MP4 export, animatic compilation
  | 'storage'           // Blob storage

export type CreditMetric =
  | 'per_image'         // Per image generated
  | 'per_video_8s'      // Per 8-second video clip
  | 'per_1k_chars'      // Per 1000 characters (TTS)
  | 'per_generation'    // Per generation (SFX, music)
  | 'per_minute'        // Per minute (render, upscale)
  | 'per_1k_tokens'     // Per 1000 tokens (LLM)
  | 'per_gb'            // Per gigabyte (storage)

export interface CreditPricingAttributes {
  id: string
  provider: CreditProvider
  category: CreditCategory
  operation: string              // e.g., 'imagen_4', 'veo_fast', 'elevenlabs_tts'
  model: string                  // Specific model version
  metric: CreditMetric
  credits_per_unit: number       // Credits charged per unit
  provider_cost_usd: number      // Actual provider cost in USD
  margin_percent: number         // Calculated margin percentage
  is_active: boolean
  effective_from: Date
  effective_to: Date | null
  notes: string | null           // Admin notes for price changes
  created_at: Date
  updated_at: Date
}

export interface CreditPricingCreationAttributes extends Optional<CreditPricingAttributes, 
  'id' | 'margin_percent' | 'effective_to' | 'notes' | 'created_at' | 'updated_at'
> {}

export class CreditPricing extends Model<CreditPricingAttributes, CreditPricingCreationAttributes> 
  implements CreditPricingAttributes {
  public id!: string
  public provider!: CreditProvider
  public category!: CreditCategory
  public operation!: string
  public model!: string
  public metric!: CreditMetric
  public credits_per_unit!: number
  public provider_cost_usd!: number
  public margin_percent!: number
  public is_active!: boolean
  public effective_from!: Date
  public effective_to!: Date | null
  public notes!: string | null
  public created_at!: Date
  public updated_at!: Date

  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  /**
   * Calculate margin percentage from credits and provider cost
   */
  static calculateMargin(creditsPerUnit: number, providerCostUsd: number): number {
    const revenueUsd = creditsPerUnit * 0.01 // 1 credit = $0.01
    if (providerCostUsd === 0) return 100
    return ((revenueUsd - providerCostUsd) / revenueUsd) * 100
  }

  /**
   * Get effective price for an operation (with caching)
   */
  static async getEffectivePrice(
    provider: CreditProvider,
    operation: string,
    model?: string
  ): Promise<CreditPricingAttributes | null> {
    const now = new Date()
    
    const whereClause: any = {
      provider,
      operation,
      is_active: true,
      effective_from: { [sequelize.Sequelize.Op.lte]: now },
    }
    
    if (model) {
      whereClause.model = model
    }
    
    return await CreditPricing.findOne({
      where: whereClause,
      order: [['effective_from', 'DESC']],
    })
  }

  /**
   * Get all active prices (for admin dashboard)
   */
  static async getAllActivePrices(): Promise<CreditPricingAttributes[]> {
    const now = new Date()
    
    return await CreditPricing.findAll({
      where: {
        is_active: true,
        effective_from: { [sequelize.Sequelize.Op.lte]: now },
      },
      order: [['provider', 'ASC'], ['category', 'ASC'], ['operation', 'ASC']],
    })
  }
}

CreditPricing.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    operation: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    metric: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    credits_per_unit: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    provider_cost_usd: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
    },
    margin_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    effective_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    effective_to: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'credit_pricing',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeSave: (instance) => {
        // Auto-calculate margin before saving
        instance.margin_percent = CreditPricing.calculateMargin(
          instance.credits_per_unit,
          Number(instance.provider_cost_usd)
        )
      },
    },
    indexes: [
      {
        unique: false,
        fields: ['provider', 'operation', 'is_active'],
      },
      {
        unique: false,
        fields: ['category', 'is_active'],
      },
    ],
  }
)

/**
 * Default pricing data for seeding the database
 * Based on creditCosts.ts configuration
 */
export const DEFAULT_CREDIT_PRICING: Omit<CreditPricingCreationAttributes, 'id' | 'created_at' | 'updated_at'>[] = [
  // Image Generation
  {
    provider: 'google_vertex',
    category: 'image_generation',
    operation: 'imagen_4',
    model: 'imagen-3.0-generate-001',
    metric: 'per_image',
    credits_per_unit: 10,
    provider_cost_usd: 0.04,
    margin_percent: 60,
    is_active: true,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    notes: 'Imagen 4 standard image generation',
  },
  {
    provider: 'google_vertex',
    category: 'image_generation',
    operation: 'frame_generation',
    model: 'imagen-3.0-generate-001',
    metric: 'per_image',
    credits_per_unit: 10,
    provider_cost_usd: 0.04,
    margin_percent: 60,
    is_active: true,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    notes: 'Start/End frame generation for video segments',
  },
  
  // Video Generation
  {
    provider: 'google_vertex',
    category: 'video_generation',
    operation: 'veo_fast',
    model: 'veo-3.1-fast',
    metric: 'per_video_8s',
    credits_per_unit: 150,
    provider_cost_usd: 0.75,
    margin_percent: 50,
    is_active: true,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    notes: 'Veo 3.1 Fast 1080p - 8 second clips',
  },
  {
    provider: 'google_vertex',
    category: 'video_generation',
    operation: 'veo_quality',
    model: 'veo-3.1-quality',
    metric: 'per_video_8s',
    credits_per_unit: 250,
    provider_cost_usd: 1.30,
    margin_percent: 48,
    is_active: true,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    notes: 'Veo 3.1 Quality 4K - Pro/Studio only',
  },
  
  // Audio - TTS
  {
    provider: 'elevenlabs',
    category: 'audio_tts',
    operation: 'elevenlabs_tts',
    model: 'eleven_v3',
    metric: 'per_1k_chars',
    credits_per_unit: 80,
    provider_cost_usd: 0.35,
    margin_percent: 56,
    is_active: true,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    notes: 'ElevenLabs text-to-speech narration/dialogue',
  },
  
  // Audio - Sound Effects
  {
    provider: 'elevenlabs',
    category: 'audio_sfx',
    operation: 'elevenlabs_sfx',
    model: 'sound_generation_v1',
    metric: 'per_generation',
    credits_per_unit: 15,
    provider_cost_usd: 0.05,
    margin_percent: 67,
    is_active: true,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    notes: 'ElevenLabs AI sound effect generation',
  },
  
  // Audio - Music
  {
    provider: 'elevenlabs',
    category: 'audio_music',
    operation: 'elevenlabs_music',
    model: 'music_v1',
    metric: 'per_generation',
    credits_per_unit: 25,
    provider_cost_usd: 0.10,
    margin_percent: 60,
    is_active: true,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    notes: 'ElevenLabs AI music generation',
  },
  
  // Text Generation
  {
    provider: 'google_vertex',
    category: 'text_generation',
    operation: 'gemini_flash',
    model: 'gemini-2.5-flash',
    metric: 'per_1k_tokens',
    credits_per_unit: 5,
    provider_cost_usd: 0.01,
    margin_percent: 80,
    is_active: true,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    notes: 'Gemini 2.5 Flash for quick operations',
  },
  {
    provider: 'google_vertex',
    category: 'text_generation',
    operation: 'gemini_pro',
    model: 'gemini-2.5-pro',
    metric: 'per_1k_tokens',
    credits_per_unit: 10,
    provider_cost_usd: 0.03,
    margin_percent: 67,
    is_active: true,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    notes: 'Gemini 2.5 Pro for complex analysis',
  },
  
  // Platform - Render
  {
    provider: 'platform',
    category: 'render',
    operation: 'mp4_export',
    model: 'ffmpeg',
    metric: 'per_minute',
    credits_per_unit: 5,
    provider_cost_usd: 0.02,
    margin_percent: 60,
    is_active: true,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    notes: 'Final MP4 video export/render',
  },
]

export default CreditPricing
