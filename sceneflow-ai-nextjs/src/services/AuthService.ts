import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { User } from '../models/User'
import { Op } from 'sequelize'

export interface AuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    username: string
    first_name?: string
    last_name?: string
  }
  token?: string
  error?: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  first_name?: string
  last_name?: string
}

export interface LoginData {
  email: string
  password: string
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
  private static readonly JWT_EXPIRES_IN = '7d'

  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResult> {
    try {
      console.log('🔍 Starting registration for:', data.email)
      
      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: data.email },
            { username: data.username }
          ]
        }
      })

      if (existingUser) {
        console.log('❌ User already exists:', existingUser.email)
        return {
          success: false,
          error: existingUser.email === data.email 
            ? 'Email already registered' 
            : 'Username already taken'
        }
      }

      console.log('✅ No existing user found, creating new user...')
      
      // Create new user
      const user = await User.create({
        email: data.email,
        username: data.username,
        password_hash: '', // Will be set by the model
        first_name: data.first_name,
        last_name: data.last_name,
        is_active: true,
        email_verified: false
      })

      console.log('✅ User created, hashing password...')
      
      // Hash the password
      await user.hashPassword(data.password)
      console.log('✅ Password hashed, saving user...')
      await user.save()

      console.log('✅ User saved successfully, generating token...')
      
      // Generate JWT token
      const token = this.generateToken(user.id)

      console.log('🎉 Registration completed successfully')

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name
        },
        token
      }
    } catch (error) {
      console.error('❌ Registration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginData): Promise<AuthResult> {
    try {
      // Find user by email
      const user = await User.findOne({
        where: { email: data.email }
      })

      if (!user || !user.is_active) {
        return {
          success: false,
          error: 'Invalid credentials'
        }
      }

      // Verify password
      const isValidPassword = await user.comparePassword(data.password)
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid credentials'
        }
      }

      // Update last login
      user.last_login = new Date()
      await user.save()

      // Generate JWT token
      const token = this.generateToken(user.id)

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name
        },
        token
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: 'Login failed'
      }
    }
  }

  /**
   * Verify JWT token and return user
   */
  static async verifyToken(token: string): Promise<AuthResult> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string }
      
      const user = await User.findByPk(decoded.userId)
      if (!user || !user.is_active) {
        return {
          success: false,
          error: 'Invalid token'
        }
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid token'
      }
    }
  }

  /**
   * Generate JWT token
   */
  private static generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    )
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    try {
      return await User.findByPk(userId)
    } catch (error) {
      console.error('Get user error:', error)
      return null
    }
  }
}

