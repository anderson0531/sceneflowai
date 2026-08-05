import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

/**
 * Shared cache of machine-translated creative content.
 *
 * Keyed on a hash of the normalized source text rather than on entity ids. That
 * choice matters:
 *  - an identical string is paid for once across the whole platform,
 *  - editing a field naturally produces a new key instead of a stale hit, so
 *    there is no invalidation logic to get wrong,
 *  - rows orphaned by edits are evictable by `last_used_at` without needing to
 *    know which project they came from.
 */
export interface ContentTranslationAttributes {
  source_hash: string
  target_locale: string
  source_locale: string
  translated_text: string
  provider: string
  char_count: number
  last_used_at: Date
  created_at: Date
}

export interface ContentTranslationCreationAttributes
  extends Optional<
    ContentTranslationAttributes,
    'source_locale' | 'char_count' | 'last_used_at' | 'created_at'
  > {}

export class ContentTranslation
  extends Model<ContentTranslationAttributes, ContentTranslationCreationAttributes>
  implements ContentTranslationAttributes
{
  declare source_hash: string
  declare target_locale: string
  declare source_locale: string
  declare translated_text: string
  declare provider: string
  declare char_count: number
  declare last_used_at: Date
  declare created_at: Date
}

ContentTranslation.init(
  {
    source_hash: {
      type: DataTypes.CHAR(64),
      allowNull: false,
      primaryKey: true,
    },
    target_locale: {
      type: DataTypes.STRING(12),
      allowNull: false,
      primaryKey: true,
    },
    source_locale: {
      type: DataTypes.STRING(12),
      allowNull: false,
      defaultValue: 'en',
    },
    translated_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    char_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'content_translations',
    timestamps: false,
    indexes: [
      {
        fields: ['last_used_at'],
        name: 'idx_content_translations_lru',
      },
    ],
  }
)

export default ContentTranslation
