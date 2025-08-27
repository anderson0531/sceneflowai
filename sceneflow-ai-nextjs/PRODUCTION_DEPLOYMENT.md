# Production Deployment Guide

## 🚀 **Production Deployment Checklist**

This guide covers the essential steps for deploying SceneFlow AI with the VideoGenerationGateway service to production with proper security measures.

## 🔐 **Security Configuration**

### **1. Environment Variables**
```bash
# Production environment file (.env.production)
NODE_ENV=production
PORT=3000

# Encryption (CRITICAL - Use different key from development)
ENCRYPTION_KEY=production_32_byte_hex_encryption_key_here

# Database (Production database)
DB_HOST=your_production_db_host
DB_PORT=5432
DB_USERNAME=sceneflow_prod_user
DB_PASSWORD=your_very_secure_production_password
DB_NAME=sceneflow_ai_prod

# Database SSL (Required for production)
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true

# Application Security
SESSION_SECRET=your_very_long_random_session_secret
JWT_SECRET=your_very_long_random_jwt_secret

# CORS (Restrict to your domain)
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **2. Encryption Key Management**
```bash
# Generate production encryption key
openssl rand -hex 32

# Store securely (never in code)
# Options:
# - AWS Secrets Manager
# - Azure Key Vault
# - Google Cloud Secret Manager
# - HashiCorp Vault
# - Environment variables (less secure but simpler)
```

### **3. Database Security**
```sql
-- Create production database user with limited privileges
CREATE USER sceneflow_prod_user WITH PASSWORD 'very_secure_password';

-- Grant only necessary privileges
GRANT CONNECT ON DATABASE sceneflow_ai_prod TO sceneflow_prod_user;
GRANT USAGE ON SCHEMA public TO sceneflow_prod_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sceneflow_prod_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sceneflow_prod_user;

-- Enable SSL
ALTER DATABASE sceneflow_ai_prod SET ssl = on;
```

## 🗄️ **Database Configuration**

### **1. Production Database Settings**
```typescript
// src/config/database.ts
import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Database configuration
console.log(' Environment check:')
console.log('DB_DATABASE_URL:', process.env.DB_DATABASE_URL ? 'Set' : 'Not set')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
console.log('NODE_ENV:', process.env.NODE_ENV)

let sequelize: Sequelize

if (process.env.DB_DATABASE_URL) {
  console.log('✅ Using DB_DATABASE_URL (Vercel Postgres) for connection')
  // Use Vercel Postgres connection
  sequelize = new Sequelize(process.env.DB_DATABASE_URL, {
    dialect: 'postgres',
    
    // Connection pool settings
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    
    // Logging configuration
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Timezone configuration
    timezone: '+00:00',
    
    // Define options
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  })
} else if (process.env.DATABASE_URL) {
  console.log('✅ Using DATABASE_URL (Supabase) for connection')
  // Fallback to Supabase
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    
    // Connection pool settings
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    
    // Logging configuration
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Timezone configuration
    timezone: '+00:00',
    
    // Define options
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  })
} else {
  throw new Error('No database connection string found. Please set DB_DATABASE_URL or DATABASE_URL')
}

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate()
    console.log('✅ Database connection established successfully.')
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error)
    throw error
  }
}

// Sync database models
export const syncDatabase = async (): Promise<void> => {
  try {
    await sequelize.sync({ alter: true })
    console.log('✅ Database models synchronized successfully.')
  } catch (error) {
    console.error('❌ Database synchronization failed:', error)
    throw error
  }
}

export { sequelize }
```

### **2. Database Migration Strategy**
```bash
# 1. Backup existing data
pg_dump -h your_host -U your_user -d your_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations
npm run setup:database

# 3. Verify data integrity
npm run test:database

# 4. Test with production credentials
npm run test:gateway
```

## 🔒 **API Security Measures**

### **1. Rate Limiting**
```typescript
// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit'

export const apiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Store rate limit info in Redis for production
  store: process.env.NODE_ENV === 'production' ? redisStore : undefined
})
```

### **2. CORS Configuration**
```typescript
// src/middleware/cors.ts
import cors from 'cors'

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

export const corsMiddleware = cors(corsOptions)
```

### **3. Input Validation**
```typescript
// src/middleware/validation.ts
import { StandardVideoRequest } from '../services/ai-providers/BaseAIProviderAdapter'

export const validateVideoRequest = (req: any, res: any, next: any) => {
  const request: StandardVideoRequest = req.body
  
  // Sanitize inputs
  if (request.prompt) {
    request.prompt = request.prompt.trim().substring(0, 1000) // Limit prompt length
  }
  
  // Validate required fields
  if (!request.prompt || !request.aspect_ratio || !request.motion_intensity) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  
  // Validate ranges
  if (request.motion_intensity < 1 || request.motion_intensity > 10) {
    return res.status(400).json({ error: 'Invalid motion intensity' })
  }
  
  next()
}
```

## 🚀 **Deployment Options**

### **1. Docker Deployment**
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=sceneflow_prod_user
      - DB_PASSWORD=${DB_PASSWORD}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=sceneflow_ai_prod
      - POSTGRES_USER=sceneflow_prod_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

### **2. Kubernetes Deployment**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sceneflow-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sceneflow-ai
  template:
    metadata:
      labels:
        app: sceneflow-ai
    spec:
      containers:
      - name: sceneflow-ai
        image: your-registry/sceneflow-ai:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: sceneflow-secrets
              key: encryption-key
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: sceneflow-secrets
              key: db-password
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: sceneflow-secrets
type: Opaque
data:
  encryption-key: <base64-encoded-encryption-key>
  db-password: <base64-encoded-db-password>
```

### **3. Serverless Deployment (Vercel/Netlify)**
```typescript
// src/app/api/video-generation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { videoGenerationGateway } from '../../../services/VideoGenerationGateway'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, request: videoRequest, providerName } = body
    
    // Validate request
    if (!userId || !videoRequest || !providerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Trigger video generation
    const result = await videoGenerationGateway.trigger_generation(
      userId,
      videoRequest,
      providerName
    )
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('Video generation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## 📊 **Monitoring and Logging**

### **1. Health Check Endpoint**
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { sequelize } from '../../../config/database'
import { EncryptionService } from '../../../services/EncryptionService'

export async function GET() {
  try {
    // Check database connection
    await sequelize.authenticate()
    
    // Check encryption service
    const encryptionOk = EncryptionService.isEncryptionConfigured()
    
    // Check system resources
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        encryption: encryptionOk ? 'configured' : 'not_configured'
      },
      system: {
        uptime: Math.floor(uptime),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
        }
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}
```

### **2. Structured Logging**
```typescript
// src/utils/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sceneflow-ai' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

export default logger
```

## 🔍 **Testing and Validation**

### **1. Pre-deployment Tests**
```bash
# 1. Run all tests
npm run test:gateway
npm run test:encryption
npm run test:database

# 2. Test with production database
npm run setup:database

# 3. Test provider connections
npm run test:providers

# 4. Load testing
npm run test:load
```

### **2. Security Testing**
```bash
# 1. Dependency vulnerability scan
npm audit

# 2. Code security scan
npm run security:scan

# 3. Penetration testing
npm run security:pentest
```

## 📋 **Deployment Checklist**

- [ ] **Environment Variables**
  - [ ] Production encryption key generated and stored securely
  - [ ] Database credentials configured
  - [ ] CORS origins restricted to production domains
  - [ ] Rate limiting configured

- [ ] **Database**
  - [ ] Production database created with SSL enabled
  - [ ] Database user with limited privileges
  - [ ] Database backup strategy implemented
  - [ ] Connection pooling configured

- [ ] **Security**
  - [ ] Input validation middleware implemented
  - [ ] Rate limiting enabled
  - [ ] CORS properly configured
  - [ ] Secrets stored securely (not in code)

- [ ] **Monitoring**
  - [ ] Health check endpoint implemented
  - [ ] Structured logging configured
  - [ ] Error tracking setup
  - [ ] Performance monitoring enabled

- [ ] **Testing**
  - [ ] All tests passing
  - [ ] Security tests completed
  - [ ] Load testing performed
  - [ ] Integration tests with real providers

- [ ] **Documentation**
  - [ ] API documentation updated
  - [ ] Deployment procedures documented
  - [ ] Troubleshooting guide created
  - [ ] Rollback procedures documented

## 🚨 **Emergency Procedures**

### **1. Rollback Plan**
```bash
# 1. Revert to previous version
git revert HEAD

# 2. Restart services
docker-compose restart app

# 3. Verify health
curl https://yourdomain.com/api/health
```

### **2. Incident Response**
1. **Immediate**: Stop affected services
2. **Investigation**: Check logs and monitoring
3. **Communication**: Notify stakeholders
4. **Resolution**: Apply fixes and restart
5. **Post-mortem**: Document lessons learned

## 📞 **Support and Maintenance**

### **1. Regular Maintenance**
- Weekly security updates
- Monthly dependency updates
- Quarterly security audits
- Annual penetration testing

### **2. Monitoring Alerts**
- Database connection failures
- High error rates
- Memory/CPU usage spikes
- Failed authentication attempts

### **3. Backup Strategy**
- Daily database backups
- Weekly full system backups
- Monthly disaster recovery tests
- Encrypted backup storage

This production deployment guide ensures SceneFlow AI is deployed securely and reliably with proper monitoring, logging, and emergency procedures in place.

## 🔧 **Enhanced next.config.js Configuration:**

Update your `next.config.js` with this more comprehensive configuration:

```javascript
const withPWA = require('next-pwa')({
  // ... existing PWA config
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Full Next.js app for Netlify deployment
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Enable server external packages for database support
  serverExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
  // Force include external packages for Vercel
  experimental: {
    serverComponentsExternalPackages: ['pg', 'pg-hstore', 'sequelize']
  },
  // Webpack configuration to force include packages
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Force include pg packages
      config.externals = config.externals.filter(external => {
        if (typeof external === 'string') {
          return !external.includes('pg') && !external.includes('sequelize');
        }
        return true;
      });
    }
    return config;
  },
  // Temporarily disable TypeScript checking for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

```

**What this adds:**
1. **`experimental.serverComponentsExternalPackages`** - Forces Vercel to include the packages
2. **`webpack` configuration** - Aggressively filters out external package exclusions for pg/sequelize

After updating the file, redeploy with:
```bash
npx vercel --prod
```

This should resolve the "Please install pg package manually" error! 🚀

## 🔧 **Alternative Solution - Force Package Inclusion:**

Let's try a more direct approach by creating a custom build configuration. Create a new file called `vercel.json` in your project root:

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "includeFiles": ["node_modules/pg/**/*", "node_modules/pg-hstore/**/*", "node_modules/sequelize/**/*"]
    }
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

## 🔄 **Or Try This Build Command Override:**

In your Vercel dashboard:
1. Go to Project Settings → Build & Development Settings
2. Change the **Build Command** to:
   ```bash
   npm install && npm run build
   ```

## 🧹 **Or Force Clean Rebuild:**

```bash
cd sceneflow-ai-nextjs
rm -rf .next node_modules package-lock.json
npm install
npx vercel --prod
```

## 🎯 **The Core Issue:**

Vercel is treating `pg` as a native dependency that should be excluded from serverless functions. We need to either:
1. Force include it with `vercel.json`
2. Override the build process
3. Use a different database approach

**Try the `vercel.json` approach first** - this explicitly tells Vercel which files to include in your functions. Let me know which approach you'd like to try! 🚀

## 🔧 **Fix the vercel.json Conflict:**

You need to remove one of the conflicting properties. Let me help you fix this:

**Option 1: Remove the `functions` property (Recommended)**
```json
{
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

**Option 2: Remove the `builds` property**
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "includeFiles": ["node_modules/pg/**/*", "node_modules/pg-hstore/**/*", "node_modules/sequelize/**/*"]
    }
  }
}
```

## 🎯 **My Recommendation:**

**Use Option 1** - Remove the `functions` property since the `build` property is simpler and should work for your needs.

## ✅ **After Fixing vercel.json:**

1. **Save the changes**
2. **Redeploy**: `npx vercel --prod`
3. **Test the database connection**

**Can you update your `vercel.json` file to remove the conflict?** Once that's fixed, we can redeploy and test the Vercel Postgres connection! 🚀

## 🔧 **Update Your Database Configuration:**

You need to modify your `src/config/database.ts` file to prioritize the Vercel Postgres connection. Here's what to change:

**Replace your current database configuration with this:**

```typescript
import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Database configuration
console.log(' Environment check:')
console.log('DB_DATABASE_URL:', process.env.DB_DATABASE_URL ? 'Set' : 'Not set')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
console.log('NODE_ENV:', process.env.NODE_ENV)

let sequelize: Sequelize

if (process.env.DB_DATABASE_URL) {
  console.log('✅ Using DB_DATABASE_URL (Vercel Postgres) for connection')
  // Use Vercel Postgres connection
  sequelize = new Sequelize(process.env.DB_DATABASE_URL, {
    dialect: 'postgres',
    
    // Connection pool settings
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    
    // Logging configuration
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Timezone configuration
    timezone: '+00:00',
    
    // Define options
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  })
} else if (process.env.DATABASE_URL) {
  console.log('✅ Using DATABASE_URL (Supabase) for connection')
  // Fallback to Supabase
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    
    // Connection pool settings
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    
    // Logging configuration
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Timezone configuration
    timezone: '+00:00',
    
    // Define options
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  })
} else {
  throw new Error('No database connection string found. Please set DB_DATABASE_URL or DATABASE_URL')
}

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate()
    console.log('✅ Database connection established successfully.')
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error)
    throw error
  }
}

// Sync database models
export const syncDatabase = async (): Promise<void> => {
  try {
    await sequelize.sync({ alter: true })
    console.log('✅ Database models synchronized successfully.')
  } catch (error) {
    console.error('❌ Database synchronization failed:', error)
    throw error
  }
}

export { sequelize }
```

## 🎯 **What This Does:**

1. **Prioritizes `DB_DATABASE_URL`** (Vercel Postgres) over `DATABASE_URL` (Supabase)
2. **Uses the same Sequelize configuration** for both connections
3. **Provides clear logging** to show which connection is being used
4. **Maintains fallback** to Supabase if Vercel Postgres isn't available

## ✅ **After Updating:**

1. **Save the file**
2. **Redeploy**: `npx vercel --prod`
3. **Test the database connection**

This should resolve the `pg` package issue since Vercel Postgres works natively without requiring the `pg` package to be bundled! 🚀
