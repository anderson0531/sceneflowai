import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import type { ReferenceLinkAddedBy } from '@/types/referenceLibrary'

export interface ReferenceAssetLinkModelAttributes {
  id: string
  asset_id: string
  project_id?: string | null
  series_id?: string | null
  added_by: ReferenceLinkAddedBy
  created_at: Date
}

export interface ReferenceAssetLinkCreationAttributes
  extends Optional<
    ReferenceAssetLinkModelAttributes,
    'id' | 'project_id' | 'series_id' | 'created_at'
  > {}

export class ReferenceAssetLink
  extends Model<ReferenceAssetLinkModelAttributes, ReferenceAssetLinkCreationAttributes>
  implements ReferenceAssetLinkModelAttributes
{
  declare id: string
  declare asset_id: string
  declare project_id: string | null | undefined
  declare series_id: string | null | undefined
  declare added_by: ReferenceLinkAddedBy
  declare created_at: Date

  declare readonly createdAt: Date
}

ReferenceAssetLink.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    asset_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'reference_assets', key: 'id' },
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'projects', key: 'id' },
    },
    series_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'series', key: 'id' },
    },
    added_by: {
      type: DataTypes.ENUM('auto', 'user', 'series'),
      allowNull: false,
      defaultValue: 'user',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'reference_asset_links',
    timestamps: false,
    indexes: [
      { fields: ['asset_id'], name: 'idx_reference_asset_links_asset' },
      { fields: ['project_id'], name: 'idx_reference_asset_links_project' },
      { fields: ['series_id'], name: 'idx_reference_asset_links_series' },
    ],
  }
)

export default ReferenceAssetLink
