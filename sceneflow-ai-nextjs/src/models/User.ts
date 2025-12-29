import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import bcrypt from 'bcryptjs'

export interface UserAttributes {
  id: string
  email: string
  username: string
  password_hash: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  is_active: boolean
  email_verified: boolean
  credits?: number
  subscription_tier_id?: string | null // FK to SubscriptionTier
  subscription_status: 'active' | 'cancelled' | 'expired' | 'trial' | null
  subscription_start_date?: Date | null
  subscription_end_date?: Date | null
  subscription_credits_monthly: number // Bundled credits from subscription
  subscription_credits_expires_at?: Date | null // Monthly expiry
  addon_credits: number // Purchased top-up credits (never expire)
  storage_used_gb: number
  paddle_customer_id?: string | null
  paddle_subscription_id?: string | null
  one_time_tiers_purchased: string[]
  // Compliance/Trust fields
  trust_score: number                    // 0-100, increases with positive behavior
  voice_cloning_enabled: boolean         // Whether user has access to voice cloning
  account_verified_at?: Date | null      // When identity was verified
  last_login?: Date
  created_at: Date
  updated_at: Date
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'email_verified' | 'subscription_status' | 'subscription_credits_monthly' | 'addon_credits' | 'storage_used_gb' | 'one_time_tiers_purchased' | 'trust_score' | 'voice_cloning_enabled' | 'account_verified_at'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {                                                             
  public id!: string
  public email!: string
  public username!: string
  public password_hash!: string
  public first_name?: string
  public last_name?: string
  public avatar_url?: string
  public is_active!: boolean
  public email_verified!: boolean
  public credits?: number
  public subscription_tier_id?: string | null
  public subscription_status!: 'active' | 'cancelled' | 'expired' | 'trial' | null
  public subscription_start_date?: Date | null
  public subscription_end_date?: Date | null
  public subscription_credits_monthly!: number
  public subscription_credits_expires_at?: Date | null
  public addon_credits!: number
  public storage_used_gb!: number
  public paddle_customer_id?: string | null
  public paddle_subscription_id?: string | null
  public one_time_tiers_purchased!: string[]
  // Compliance/Trust fields
  public trust_score!: number
  public voice_cloning_enabled!: boolean
  public account_verified_at?: Date | null
  public last_login?: Date
  public created_at!: Date
  public updated_at!: Date

  // Timestamps
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Instance methods
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password_hash)
  }

  public async hashPassword(password: string): Promise<void> {
    this.password_hash = await bcrypt.hash(password, 12)
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        is: /^[a-zA-Z0-9_-]+$/,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    credits: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    subscription_tier_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscription_tiers',
        key: 'id',
      },
    },
    subscription_status: {
      type: DataTypes.ENUM('active', 'cancelled', 'expired', 'trial'),
      allowNull: true,
      defaultValue: null,
    },
    subscription_start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    subscription_end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    subscription_credits_monthly: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    subscription_credits_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    addon_credits: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    storage_used_gb: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    paddle_customer_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    paddle_subscription_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    one_time_tiers_purchased: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    // Compliance/Trust fields
    trust_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    voice_cloning_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    account_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_login: {
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
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['email'],
        name: 'unique_email',
      },
      {
        unique: true,
        fields: ['username'],
        name: 'unique_username',
      },
      {
        fields: ['is_active'],
        name: 'idx_is_active',
      },
    ],
  }
)

export default User
