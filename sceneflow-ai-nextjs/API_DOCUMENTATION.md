# SceneFlow AI API Documentation

## 🚀 **Overview**

The SceneFlow AI API provides endpoints for managing AI provider credentials and generating videos using various AI services. All endpoints return JSON responses and use standard HTTP status codes.

## 🔐 **Authentication**

Currently, the API uses a simple header-based user identification system. In production, this should be replaced with proper JWT authentication.

```http
x-user-id: demo_user_001
```

## 📍 **Base URL**

```
http://localhost:3000/api
```

## 🏥 **Health Check**

### **GET /api/health**

Check the health status of the system.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": "5ms",
  "services": {
    "encryption": "configured",
    "api": "operational"
  },
  "system": {
    "uptime": 3600,
    "memory": {
      "rss": "45MB",
      "heapUsed": "25MB",
      "heapTotal": "30MB",
      "external": "5MB"
    },
    "nodeVersion": "v18.17.0",
    "platform": "darwin",
    "arch": "x64"
  },
  "environment": {
    "nodeEnv": "development",
    "encryptionConfigured": true
  }
}
```

**Status Codes:**
- `200` - System is healthy
- `503` - System is unhealthy

---

## ⚙️ **Provider Management**

### **GET /api/settings/providers**

List all configured providers for a user (credentials are NOT returned).

**Headers:**
```http
x-user-id: demo_user_001
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "provider": "GOOGLE_VEO",
      "displayName": "Google Veo",
      "description": "Google's advanced AI video generation model with cinematic quality",
      "icon": "🎬",
      "isConnected": true,
      "isConfigured": true,
      "capabilities": {
        "maxDuration": 60,
        "supportedResolutions": ["1920x1080", "1080x1920"],
        "motionIntensityRange": { "min": 1, "max": 10 }
      },
      "lastTested": "2024-01-15T10:30:00.000Z",
      "status": "connected"
    }
  ],
  "message": "Found 1 providers"
}
```

**Status Codes:**
- `200` - Success
- `500` - Internal server error

---

### **POST /api/settings/providers**

Add or update provider credentials. This endpoint validates credentials using the adapter's `validate_credentials` method.

**Headers:**
```http
Content-Type: application/json
x-user-id: demo_user_001
```

**Request Body:**
```json
{
  "provider": "GOOGLE_VEO",
  "credentials": {
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "your-private-key-id",
    "private_key": "-----BEGIN PRIVATE KEY-----\nYour Private Key\n-----END PRIVATE KEY-----",
    "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
    "client_id": "your-client-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "GOOGLE_VEO",
    "displayName": "Google Veo",
    "description": "Google's advanced AI video generation model with cinematic quality",
    "icon": "🎬",
    "isConnected": true,
    "isConfigured": true,
    "status": "connected",
    "lastTested": "2024-01-15T10:30:00.000Z"
  },
  "message": "Provider GOOGLE_VEO configured successfully"
}
```

**Status Codes:**
- `200` - Provider configured successfully
- `400` - Invalid request or validation failed
- `500` - Internal server error

**Error Response:**
```json
{
  "error": "Provider credentials validation failed",
  "details": "Failed to authenticate with Google Cloud"
}
```

---

### **PUT /api/settings/providers**

Update provider configuration (e.g., enable/disable provider).

**Headers:**
```http
Content-Type: application/json
x-user-id: demo_user_001
```

**Request Body:**
```json
{
  "provider": "GOOGLE_VEO",
  "is_valid": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Provider GOOGLE_VEO disabled successfully"
}
```

**Status Codes:**
- `200` - Provider updated successfully
- `400` - Invalid request
- `404` - Provider not found
- `500` - Internal server error

---

### **DELETE /api/settings/providers**

Remove provider configuration.

**Headers:**
```http
x-user-id: demo_user_001
```

**Query Parameters:**
```
?provider=GOOGLE_VEO
```

**Response:**
```json
{
  "success": true,
  "message": "Provider GOOGLE_VEO removed successfully"
}
```

**Status Codes:**
- `200` - Provider removed successfully
- `400` - Invalid provider name
- `404` - Provider not found
- `500` - Internal server error

---

## 🎬 **Video Generation**

### **POST /api/video/generate**

Initiate video generation using a configured AI provider.

**Headers:**
```http
Content-Type: application/json
x-user-id: demo_user_001
```

**Request Body:**
```json
{
  "provider": "GOOGLE_VEO",
  "request": {
    "prompt": "A beautiful sunset over a calm ocean with gentle waves",
    "negative_prompt": "dark, gloomy, stormy weather, low quality",
    "aspect_ratio": "16:9",
    "motion_intensity": 7,
    "duration": 15,
    "resolution": "1920x1080",
    "style": "cinematic",
    "quality": "high",
    "fps": 30,
    "seed": 42
  }
}
```

**Request Validation Rules:**
- `prompt`: Required, max 1000 characters
- `aspect_ratio`: Required
- `motion_intensity`: Required, range 1-10
- `duration`: Optional, range 1-120 seconds
- `fps`: Optional, range 6-60
- `seed`: Optional, range 0-999999999
- `negative_prompt`: Optional, max 1000 characters

**Response:**
```json
{
  "success": true,
  "data": {
    "generationId": "veo_1234567890_abc123",
    "status": "QUEUED",
    "estimatedTimeRemaining": 300,
    "progress": 0,
    "message": "Video generation initiated successfully"
  },
  "message": "Video generation initiated successfully"
}
```

**Status Codes:**
- `200` - Generation initiated successfully
- `400` - Invalid request or validation failed
- `500` - Internal server error

**Error Response:**
```json
{
  "error": "Video generation failed",
  "details": "Provider credentials are not valid",
  "data": {
    "status": "FAILED",
    "error_message": "Provider credentials are not valid"
  }
}
```

---

### **GET /api/video/generate**

Check the status of a video generation job.

**Headers:**
```http
x-user-id: demo_user_001
```

**Query Parameters:**
```
?provider=GOOGLE_VEO&jobId=veo_1234567890_abc123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "veo_1234567890_abc123",
    "provider": "GOOGLE_VEO",
    "status": "PROCESSING",
    "progress": 45,
    "estimatedTimeRemaining": 180,
    "videoUrl": null,
    "errorMessage": null,
    "metadata": {
      "duration": 15,
      "resolution": "1920x1080",
      "format": "mp4",
      "provider": "GOOGLE_VEO"
    },
    "message": "Status check completed: PROCESSING"
  }
}
```

**Status Values:**
- `QUEUED` - Job is waiting to be processed
- `PROCESSING` - Job is currently being processed
- `COMPLETED` - Job completed successfully
- `FAILED` - Job failed
- `CANCELLED` - Job was cancelled

**Status Codes:**
- `200` - Status retrieved successfully
- `400` - Invalid request
- `500` - Internal server error

---

### **DELETE /api/video/generate**

Cancel a video generation job.

**Headers:**
```http
x-user-id: demo_user_001
```

**Query Parameters:**
```
?provider=GOOGLE_VEO&jobId=veo_1234567890_abc123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "veo_1234567890_abc123",
    "provider": "GOOGLE_VEO",
    "cancelled": true,
    "message": "Video generation cancelled successfully"
  }
}
```

**Status Codes:**
- `200` - Generation cancelled successfully
- `400` - Invalid request
- `500` - Internal server error

---

## 🔧 **Provider Credentials**

### **Google Veo**

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYour Private Key\n-----END PRIVATE KEY-----",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
}
```

### **Runway ML**

```json
{
  "apiKey": "your-runway-api-key"
}
```

### **Stability AI**

```json
{
  "apiKey": "your-stability-api-key"
}
```

---

## 📊 **Error Handling**

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details if available"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (health check)

---

## 🧪 **Testing**

### **Run API Tests**

```bash
# Test all API endpoints
npm run test:api

# Test specific functionality
npx ts-node src/scripts/test-api.ts
```

### **Test with curl**

```bash
# Health check
curl http://localhost:3000/api/health

# List providers
curl -H "x-user-id: demo_user_001" http://localhost:3000/api/settings/providers

# Add provider
curl -X POST -H "Content-Type: application/json" -H "x-user-id: demo_user_001" \
  -d '{"provider":"GOOGLE_VEO","credentials":{"apiKey":"test"}}' \
  http://localhost:3000/api/settings/providers

# Generate video
curl -X POST -H "Content-Type: application/json" -H "x-user-id: demo_user_001" \
  -d '{"provider":"GOOGLE_VEO","request":{"prompt":"A beautiful sunset","aspect_ratio":"16:9","motion_intensity":5}}' \
  http://localhost:3000/api/video/generate
```

---

## 🚀 **Next Steps**

1. **Set up environment** - Configure encryption keys and database
2. **Test endpoints** - Run the API test script
3. **Configure providers** - Add real AI provider credentials
4. **Integration testing** - Test with actual provider APIs
5. **Production deployment** - Deploy with proper security measures

---

## 📞 **Support**

For API-related issues:
1. Check the health endpoint for system status
2. Review error messages and details
3. Check server logs for additional information
4. Verify provider credentials are valid
5. Ensure encryption service is configured

This API provides a complete backend for SceneFlow AI's video generation capabilities with secure credential management and comprehensive error handling.
