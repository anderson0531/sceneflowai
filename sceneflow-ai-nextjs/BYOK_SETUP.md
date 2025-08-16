# BYOK (Bring Your Own Key) Setup Guide

## Overview
The BYOK feature allows users to connect their external AI generation accounts to SceneFlow AI. This implementation uses the Adapter design pattern for maintainability and ensures high security for credentials using AES-256-GCM encryption.

## Security Features
- **AES-256-GCM Encryption**: All credentials are encrypted at rest
- **Environment Variable Management**: Encryption keys are managed via environment variables
- **Secure Credential Storage**: No plaintext credentials are ever stored in the database
- **Provider Validation**: Credentials are validated before storage

## Supported AI Providers
1. **Google Veo** - Google's latest AI video generation model
2. **Runway ML** - Professional-grade AI video generation
3. **Stability AI** - Stable Video Diffusion model

## Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=sceneflow_ai

# Security Configuration
# Generate a secure 64-character hex string for AES-256-GCM encryption
ENCRYPTION_KEY=your_64_character_hex_encryption_key_here

# AI Provider API Keys (Optional - for testing)
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id
GOOGLE_CLOUD_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_CLOUD_PRIVATE_KEY=your_private_key
GOOGLE_CLOUD_CLIENT_EMAIL=your_client_email
GOOGLE_CLOUD_CLIENT_ID=your_client_id

RUNWAY_API_KEY=your_runway_api_key
RUNWAY_ORGANIZATION_ID=your_runway_org_id

STABILITY_AI_API_KEY=your_stability_ai_api_key
STABILITY_AI_ORGANIZATION_ID=your_stability_org_id

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Generating Encryption Key

To generate a secure encryption key, run this command:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output a 64-character hex string that you should use as your `ENCRYPTION_KEY`.

## Database Setup

1. **Install Dependencies**:
   ```bash
   npm install sequelize pg pg-hstore
   ```

2. **Database Migration**:
   The system will automatically create the required tables when you first run the application.

3. **Test Connection**:
   ```typescript
   import { testConnection } from './src/config/database'
   
   // Test database connection
   await testConnection()
   ```

## Usage Examples

### Storing Provider Configuration
```typescript
import { BYOKService } from './src/services/BYOKService'
import { AIProvider } from './src/models/UserProviderConfig'

// Store Google Veo credentials
const credentials = {
  projectId: 'your-project-id',
  privateKeyId: 'your-private-key-id',
  privateKey: 'your-private-key',
  clientEmail: 'your-client-email',
  clientId: 'your-client-id',
  authUri: 'https://accounts.google.com/o/oauth2/auth',
  tokenUri: 'https://oauth2.googleapis.com/token',
  authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
  clientX509CertUrl: 'your-cert-url'
}

const config = await BYOKService.storeProviderConfig(
  'user-123',
  AIProvider.GOOGLE_VEO,
  credentials
)
```

### Generating Videos
```typescript
import { BYOKService } from './src/services/BYOKService'
import { AIProvider } from './src/models/UserProviderConfig'

const request = {
  prompt: 'A beautiful sunset over the ocean with gentle waves',
  duration: 15,
  resolution: '1920x1080',
  aspectRatio: '16:9',
  style: 'cinematic',
  negativePrompt: 'dark, gloomy, stormy weather'
}

const result = await BYOKService.generateVideo(
  'user-123',
  AIProvider.GOOGLE_VEO,
  request
)
```

### Checking Provider Status
```typescript
import { BYOKService } from './src/services/BYOKService'

// Get all provider summaries
const summaries = await BYOKService.getProviderSummaries('user-123')

// Test a specific provider connection
const isValid = await BYOKService.testProviderConnection(
  'user-123',
  AIProvider.GOOGLE_VEO
)
```

## Architecture

### Adapter Pattern
The system uses the Adapter design pattern to provide a unified interface for different AI providers:

- `BaseAIProviderAdapter` - Abstract base class defining the interface
- `GoogleVeoAdapter` - Google Veo implementation
- `RunwayAdapter` - Runway ML implementation
- `StabilityAIAdapter` - Stability AI implementation

### Security Layers
1. **Encryption Service**: AES-256-GCM encryption for all credentials
2. **Database Security**: Encrypted storage with no plaintext access
3. **Credential Validation**: Automatic validation before storage
4. **Access Control**: User-scoped credential access

### Database Schema
```sql
CREATE TABLE user_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  provider_name VARCHAR(50) NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider_name)
);

CREATE INDEX idx_provider_name ON user_provider_configs(provider_name);
CREATE INDEX idx_is_valid ON user_provider_configs(is_valid);
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Security Tests
```bash
npm run test:security
```

## Troubleshooting

### Common Issues

1. **Encryption Key Not Set**
   - Error: "ENCRYPTION_KEY environment variable is not set"
   - Solution: Set the ENCRYPTION_KEY in your .env file

2. **Database Connection Failed**
   - Error: "Unable to connect to the database"
   - Solution: Check database credentials and connection settings

3. **Provider Validation Failed**
   - Error: "Provider configuration is not valid"
   - Solution: Verify API keys and test provider connection

### Debug Mode
Enable debug logging by setting:
```bash
NODE_ENV=development
```

## Security Best Practices

1. **Never commit .env files** to version control
2. **Rotate encryption keys** regularly
3. **Use strong passwords** for database access
4. **Monitor API usage** and implement rate limiting
5. **Regular security audits** of the system

## Support

For technical support or questions about the BYOK implementation, please refer to the project documentation or contact the development team.
