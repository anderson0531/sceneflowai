# Environment Setup Guide

## 🔐 **Encryption Key Generation**

The VideoGenerationGateway requires a secure encryption key for AES-256-GCM encryption of AI provider credentials.

### **Generate Encryption Key**
```bash
# Method 1: Using Node.js crypto module
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 2: Using OpenSSL
openssl rand -hex 32

# Method 3: Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### **Example Output**
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678
```

## 🗄️ **Database Configuration**

### **1. PostgreSQL Installation**

#### **macOS (using Homebrew)**
```bash
brew install postgresql
brew services start postgresql
```

#### **Ubuntu/Debian**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### **Windows**
Download and install from [PostgreSQL Official Website](https://www.postgresql.org/download/windows/)

### **2. Create Database and User**
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database
CREATE DATABASE sceneflow_ai;

# Create user
CREATE USER sceneflow_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sceneflow_ai TO sceneflow_user;

# Exit PostgreSQL
\q
```

### **3. Test Database Connection**
```bash
psql -h localhost -U sceneflow_user -d sceneflow_ai
# Enter password when prompted
```

## 🔧 **Environment Variables Setup**

### **1. Create .env.local file**
```bash
# In your project root directory
cp .env.example .env.local
```

### **2. Configure .env.local**
```bash
# Required for encryption
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=sceneflow_user
DB_PASSWORD=your_secure_password
DB_NAME=sceneflow_ai

# Application settings
NODE_ENV=development
PORT=3000
```

### **3. Environment Variables Reference**

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM | ✅ | `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678` |
| `DB_HOST` | PostgreSQL host | ✅ | `localhost` |
| `DB_PORT` | PostgreSQL port | ✅ | `5432` |
| `DB_USERNAME` | Database username | ✅ | `sceneflow_user` |
| `DB_PASSWORD` | Database password | ✅ | `your_secure_password` |
| `DB_NAME` | Database name | ✅ | `sceneflow_ai` |
| `NODE_ENV` | Environment mode | ❌ | `development` |
| `PORT` | Application port | ❌ | `3000` |

## 🚀 **Quick Setup Script**

### **1. Create setup-database.sh**
```bash
#!/bin/bash

echo "🚀 Setting up SceneFlow AI Database..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Create database and user
psql -h localhost -U postgres -c "CREATE DATABASE sceneflow_ai;" 2>/dev/null || echo "Database already exists"
psql -h localhost -U postgres -c "CREATE USER sceneflow_user WITH PASSWORD 'sceneflow_password';" 2>/dev/null || echo "User already exists"
psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE sceneflow_ai TO sceneflow_user;"

echo "✅ Database setup completed!"
echo "📝 Update your .env.local with:"
echo "   DB_USERNAME=sceneflow_user"
echo "   DB_PASSWORD=sceneflow_password"
echo "   DB_NAME=sceneflow_ai"
```

### **2. Make executable and run**
```bash
chmod +x setup-database.sh
./setup-database.sh
```

## 🔍 **Verification Steps**

### **1. Test Database Connection**
```bash
# Test with your credentials
psql -h localhost -U sceneflow_user -d sceneflow_ai -c "SELECT version();"
```

### **2. Test Encryption Service**
```bash
# Run the encryption test
npm run test:encryption
```

### **3. Test Database Models**
```bash
# Run database tests
npm run test:database
```

## 🚨 **Security Considerations**

### **1. Encryption Key Security**
- ✅ Store encryption key in environment variables
- ✅ Never commit encryption keys to version control
- ✅ Use different keys for development, staging, and production
- ✅ Rotate encryption keys periodically

### **2. Database Security**
- ✅ Use strong, unique passwords
- ✅ Limit database user privileges
- ✅ Enable SSL connections in production
- ✅ Regular database backups

### **3. Environment Variables**
- ✅ Use `.env.local` for local development
- ✅ Use `.env.production` for production (never commit)
- ✅ Validate all required variables on startup

## 📋 **Troubleshooting**

### **Common Issues**

#### **1. "Encryption service is not properly configured"**
- Check if `ENCRYPTION_KEY` is set in `.env.local`
- Verify the key is exactly 32 bytes (64 hex characters)
- Restart your development server after setting the key

#### **2. "Database connection failed"**
- Verify PostgreSQL is running
- Check database credentials in `.env.local`
- Ensure database and user exist
- Test connection manually with `psql`

#### **3. "Permission denied"**
- Check database user privileges
- Verify user has access to the database
- Check if user can create tables

### **Debug Commands**
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Check database connections
psql -h localhost -U postgres -c "SELECT * FROM pg_stat_activity;"

# Check user privileges
psql -h localhost -U postgres -c "\du"

# Test encryption key length
node -e "console.log(process.env.ENCRYPTION_KEY?.length || 'Not set')"
```

## 🎯 **Next Steps**

After completing the environment setup:

1. **Run Database Migration**: Initialize database tables
2. **Test Provider Connections**: Verify AI provider credentials
3. **Integration Testing**: Test video generation workflows
4. **Production Deployment**: Deploy with proper security measures

## 📞 **Support**

If you encounter issues during setup:

1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL is running and accessible
4. Check the application logs for detailed error messages
