import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import type {
  PropertyBranding,
  PropertyHostingTier,
  PropertyLifestyleId,
  PropertyLightingId,
  PropertyRoom,
  PropertySpecs,
  PropertyStyleId,
  PropertyTourDTO,
  PropertyTourStatus,
} from '@/lib/propertyTours/types'

export interface PropertyTourAttributes {
  id: string
  user_id: string
  producer_profile_id: string | null
  slug: string
  title: string
  property_address: string | null
  property_specs: PropertySpecs
  status: PropertyTourStatus
  hosting_tier: PropertyHostingTier
  monthly_hosting_credits: number
  published_at: Date | null
  hosting_renewed_at: Date | null
  branding: PropertyBranding
  default_room_id: string | null
  available_styles: PropertyStyleId[]
  available_lighting: PropertyLightingId[]
  available_lifestyles: PropertyLifestyleId[]
  blueprint_rooms: PropertyRoom[]
  view_count: number
  lead_count: number
  total_generation_credits: number
  created_at: Date
  updated_at: Date
}

export interface PropertyTourCreationAttributes
  extends Optional<
    PropertyTourAttributes,
    | 'id'
    | 'producer_profile_id'
    | 'property_address'
    | 'property_specs'
    | 'status'
    | 'hosting_tier'
    | 'monthly_hosting_credits'
    | 'published_at'
    | 'hosting_renewed_at'
    | 'branding'
    | 'default_room_id'
    | 'available_styles'
    | 'available_lighting'
    | 'available_lifestyles'
    | 'blueprint_rooms'
    | 'view_count'
    | 'lead_count'
    | 'total_generation_credits'
    | 'created_at'
    | 'updated_at'
  > {}

export class PropertyTour
  extends Model<PropertyTourAttributes, PropertyTourCreationAttributes>
  implements PropertyTourAttributes
{
  declare id: string
  declare user_id: string
  declare producer_profile_id: string | null
  declare slug: string
  declare title: string
  declare property_address: string | null
  declare property_specs: PropertySpecs
  declare status: PropertyTourStatus
  declare hosting_tier: PropertyHostingTier
  declare monthly_hosting_credits: number
  declare published_at: Date | null
  declare hosting_renewed_at: Date | null
  declare branding: PropertyBranding
  declare default_room_id: string | null
  declare available_styles: PropertyStyleId[]
  declare available_lighting: PropertyLightingId[]
  declare available_lifestyles: PropertyLifestyleId[]
  declare blueprint_rooms: PropertyRoom[]
  declare view_count: number
  declare lead_count: number
  declare total_generation_credits: number
  declare created_at: Date
  declare updated_at: Date

  toDTO(): PropertyTourDTO {
    return {
      id: this.id,
      userId: this.user_id,
      producerProfileId: this.producer_profile_id,
      slug: this.slug,
      title: this.title,
      propertyAddress: this.property_address,
      propertySpecs: this.property_specs || {},
      status: this.status,
      hostingTier: this.hosting_tier,
      monthlyHostingCredits: Number(this.monthly_hosting_credits || 150),
      publishedAt: this.published_at ? new Date(this.published_at).toISOString() : null,
      hostingRenewedAt: this.hosting_renewed_at
        ? new Date(this.hosting_renewed_at).toISOString()
        : null,
      branding: this.branding || {},
      defaultRoomId: this.default_room_id,
      availableStyles: Array.isArray(this.available_styles)
        ? this.available_styles
        : ['as_is', 'modern_coastal', 'chefs_remodel'],
      availableLighting: Array.isArray(this.available_lighting)
        ? this.available_lighting
        : ['daylight', 'golden_hour', 'twilight'],
      availableLifestyles: Array.isArray(this.available_lifestyles)
        ? this.available_lifestyles
        : ['architectural', 'quiet_morning', 'entertaining'],
      rooms: Array.isArray(this.blueprint_rooms) ? this.blueprint_rooms : [],
      viewCount: Number(this.view_count || 0),
      leadCount: Number(this.lead_count || 0),
      totalGenerationCredits: Number(this.total_generation_credits || 0),
      createdAt: this.created_at ? new Date(this.created_at).toISOString() : new Date().toISOString(),
      updatedAt: this.updated_at ? new Date(this.updated_at).toISOString() : new Date().toISOString(),
    }
  }
}

PropertyTour.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    producer_profile_id: { type: DataTypes.UUID, allowNull: true },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    property_address: { type: DataTypes.STRING(300), allowNull: true },
    property_specs: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'draft' },
    hosting_tier: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'standard' },
    monthly_hosting_credits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 150 },
    published_at: { type: DataTypes.DATE, allowNull: true },
    hosting_renewed_at: { type: DataTypes.DATE, allowNull: true },
    branding: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    default_room_id: { type: DataTypes.STRING(100), allowNull: true },
    available_styles: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ['as_is', 'modern_coastal', 'warm_transitional', 'chefs_remodel'],
    },
    available_lighting: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ['daylight', 'golden_hour', 'twilight'],
    },
    available_lifestyles: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ['architectural', 'quiet_morning', 'entertaining'],
    },
    blueprint_rooms: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    view_count: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    lead_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    total_generation_credits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'property_tours',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id', 'status'], name: 'idx_property_tours_user_status' },
      { fields: ['slug'], unique: true, name: 'uq_property_tours_slug' },
    ],
  }
)

export default PropertyTour
