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
  last_login?: Date
  created_at: Date
  updated_at: Date
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'email_verified'> {}

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
