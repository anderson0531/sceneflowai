import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import type { ReferenceAssetAttributes, ReferenceAssetKind } from '@/types/referenceLibrary'

export interface ReferenceAssetModelAttributes {
  id: string
  user_id: string
  kind: ReferenceAssetKind
  parent_asset_id?: string | null
  name: string
  canonical_name: string
  description?: string | null
  reference_image_url?: string | null
  attributes: ReferenceAssetAttributes
  tags: string[]
  origin_project_id?: string | null
  origin_series_id?: string | null
  use_count: number
  last_used_at?: Date | null
  archived_at?: Date | null
  created_at: Date
  updated_at: Date
}

export interface ReferenceAssetCreationAttributes
  extends Optional<
    ReferenceAssetModelAttributes,
    | 'id'
    | 'parent_asset_id'
    | 'description'
    | 'reference_image_url'
    | 'attributes'
    | 'tags'
    | 'origin_project_id'
    | 'origin_series_id'
    | 'use_count'
    | 'last_used_at'
    | 'archived_at'
    | 'created_at'
    | 'updated_at'
  > {}

export class ReferenceAsset
  extends Model<ReferenceAssetModelAttributes, ReferenceAssetCreationAttributes>
  implements ReferenceAssetModelAttributes
{
  declare id: string
  declare user_id: string
  declare kind: ReferenceAssetKind
  declare parent_asset_id: string | null | undefined
  declare name: string
  declare canonical_name: string
  declare description: string | null | undefined
  declare reference_image_url: string | null | undefined
  declare attributes: ReferenceAssetAttributes
  declare tags: string[]
  declare origin_project_id: string | null | undefined
  declare origin_series_id: string | null | undefined
  declare use_count: number
  declare last_used_at: Date | null | undefined
  declare archived_at: Date | null | undefined
  declare created_at: Date
  declare updated_at: Date

  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

ReferenceAsset.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    kind: {
      type: DataTypes.ENUM('character', 'wardrobe', 'location', 'prop'),
      allowNull: false,
    },
    parent_asset_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'reference_assets', key: 'id' },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    canonical_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reference_image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    attributes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    origin_project_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    origin_series_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    use_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    archived_at: {
      type: DataTypes.DATE,
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
    tableName: 'reference_assets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id', 'kind'], name: 'idx_reference_assets_user_kind' },
      { fields: ['user_id', 'canonical_name'], name: 'idx_reference_assets_user_canonical' },
      { fields: ['parent_asset_id'], name: 'idx_reference_assets_parent' },
    ],
  }
)

export default ReferenceAsset
