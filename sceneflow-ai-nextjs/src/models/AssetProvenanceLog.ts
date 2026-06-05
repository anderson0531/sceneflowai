/**
 * AssetProvenanceLog — forensic chain-of-custody for generated video assets.
 */

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type GenerativeModelSource = 'veo-3.1' | 'kling-v3'
export type GenerationProviderSource = 'vertex' | 'fal'

export interface AssetProvenanceLogAttributes {
  id: string
  user_id: string
  project_id: string
  scene_id?: string | null
  segment_id?: string | null
  content_hash: string
  signature: string
  generative_model: GenerativeModelSource
  generation_provider: GenerationProviderSource
  was_policy_fallback: boolean
  vertex_policy_attempts?: number | null
  asset_url?: string | null
  c2pa_status: 'pending' | 'complete' | 'failed' | 'skipped'
  c2pa_manifest_url?: string | null
  sidecar_json?: Record<string, unknown> | null
  created_at: Date
}

export interface AssetProvenanceLogCreationAttributes
  extends Optional<
    AssetProvenanceLogAttributes,
    | 'id'
    | 'scene_id'
    | 'segment_id'
    | 'vertex_policy_attempts'
    | 'asset_url'
    | 'c2pa_status'
    | 'c2pa_manifest_url'
    | 'sidecar_json'
    | 'created_at'
  > {}

export class AssetProvenanceLog
  extends Model<AssetProvenanceLogAttributes, AssetProvenanceLogCreationAttributes>
  implements AssetProvenanceLogAttributes
{
  declare id: string
  declare user_id: string
  declare project_id: string
  declare scene_id: string | null | undefined
  declare segment_id: string | null | undefined
  declare content_hash: string
  declare signature: string
  declare generative_model: GenerativeModelSource
  declare generation_provider: GenerationProviderSource
  declare was_policy_fallback: boolean
  declare vertex_policy_attempts: number | null | undefined
  declare asset_url: string | null | undefined
  declare c2pa_status: 'pending' | 'complete' | 'failed' | 'skipped'
  declare c2pa_manifest_url: string | null | undefined
  declare sidecar_json: Record<string, unknown> | null | undefined
  declare created_at: Date
}

AssetProvenanceLog.init(
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
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
    },
    scene_id: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    segment_id: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    content_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    signature: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    generative_model: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    generation_provider: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    was_policy_fallback: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    vertex_policy_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    asset_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    c2pa_status: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'pending',
    },
    c2pa_manifest_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sidecar_json: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'asset_provenance_logs',
    timestamps: false,
    indexes: [
      { fields: ['content_hash'], name: 'idx_asset_provenance_content_hash' },
      { fields: ['user_id', 'created_at'], name: 'idx_asset_provenance_user_created' },
      { fields: ['project_id'], name: 'idx_asset_provenance_project' },
    ],
  }
)

export default AssetProvenanceLog
