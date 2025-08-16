import crypto from 'crypto'

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32 // 256 bits
  private static readonly IV_LENGTH = 16 // 128 bits
  private static readonly TAG_LENGTH = 16 // 128 bits

  /**
   * Encrypts sensitive data using AES-256-GCM
   * @param plaintext - The data to encrypt
   * @returns Encrypted data in format: iv:tag:encryptedData
   */
  static encrypt(plaintext: string): string {
    try {
      const encryptionKey = this.getEncryptionKey()
      const iv = crypto.randomBytes(this.IV_LENGTH)
      const cipher = crypto.createCipher(this.ALGORITHM, encryptionKey)
      
      cipher.setAAD(Buffer.from('SceneFlow AI Credentials', 'utf8'))
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      // Return format: iv:tag:encryptedData
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt credentials')
    }
  }

  /**
   * Decrypts encrypted data using AES-256-GCM
   * @param encryptedData - The encrypted data in format: iv:tag:encryptedData
   * @returns Decrypted plaintext
   */
  static decrypt(encryptedData: string): string {
    try {
      const encryptionKey = this.getEncryptionKey()
      const parts = encryptedData.split(':')
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }
      
      const [ivHex, tagHex, encryptedHex] = parts
      const iv = Buffer.from(ivHex, 'hex')
      const tag = Buffer.from(tagHex, 'hex')
      const encrypted = Buffer.from(encryptedHex, 'hex')
      
      const decipher = crypto.createDecipher(this.ALGORITHM, encryptionKey)
      decipher.setAAD(Buffer.from('SceneFlow AI Credentials', 'utf8'))
      decipher.setAuthTag(tag)
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt credentials')
    }
  }

  /**
   * Generates a secure encryption key from environment variables
   * @returns Buffer containing the encryption key
   */
  private static getEncryptionKey(): Buffer {
    const encryptionKey = process.env.ENCRYPTION_KEY
    
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set')
    }
    
    if (encryptionKey.length < this.KEY_LENGTH * 2) { // hex string length
      throw new Error('ENCRYPTION_KEY must be at least 64 characters (32 bytes)')
    }
    
    // Convert hex string to buffer
    const keyBuffer = Buffer.from(encryptionKey, 'hex')
    
    if (keyBuffer.length !== this.KEY_LENGTH) {
      throw new Error('Invalid encryption key length')
    }
    
    return keyBuffer
  }

  /**
   * Generates a new secure encryption key
   * @returns Hex string of the generated key
   */
  static generateNewKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex')
  }

  /**
   * Validates if the encryption key is properly set
   * @returns boolean indicating if encryption is properly configured
   */
  static isEncryptionConfigured(): boolean {
    try {
      this.getEncryptionKey()
      return true
    } catch {
      return false
    }
  }
}
