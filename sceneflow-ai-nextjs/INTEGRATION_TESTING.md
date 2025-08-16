# Integration Testing Guide

## 🧪 **Integration Testing Overview**

This guide covers testing the VideoGenerationGateway service with real AI provider APIs to ensure end-to-end functionality works correctly in production.

## 🔧 **Prerequisites**

### **1. Environment Setup**
```bash
# Ensure all dependencies are installed
npm install

# Verify encryption service is configured
npm run test:encryption

# Verify database connection
npm run test:database
```

### **2. Real API Credentials**
You'll need valid API credentials for at least one AI provider:

- **Google Veo**: Service account JSON file
- **Runway ML**: API key
- **Stability AI**: API key

### **3. Test Database**
```bash
# Set up test database with sample data
npm run setup:database:sample
```

## 🎯 **Testing Strategy**

### **1. Unit Tests (Already Implemented)**
- ✅ Adapter creation and validation
- ✅ Request validation
- ✅ Encryption/decryption
- ✅ Database operations

### **2. Integration Tests (This Guide)**
- 🔄 Real API credential validation
- 🔄 End-to-end video generation
- 🔄 Status checking and monitoring
- 🔄 Error handling with real APIs

### **3. Load Tests**
- 🔄 Concurrent request handling
- 🔄 Rate limit compliance
- 🔄 Performance under stress

## 🚀 **Step-by-Step Integration Testing**

### **Phase 1: Credential Validation**

#### **1.1 Test Google Veo Credentials**
```typescript
// src/scripts/test-integration.ts
import { videoGenerationGateway } from '../services/VideoGenerationGateway'
import { AIProvider } from '../models/UserProviderConfig'

async function testGoogleVeoCredentials() {
  console.log('🔐 Testing Google Veo Credentials...')
  
  try {
    const result = await videoGenerationGateway.testProviderConnection(
      'test_user_001',
      AIProvider.GOOGLE_VEO
    )
    
    if (result.success) {
      console.log('✅ Google Veo credentials valid!')
      console.log('📊 Connection status:', result.data)
      console.log('📝 Message:', result.message)
    } else {
      console.log('❌ Google Veo credentials invalid:', result.error)
    }
    
  } catch (error) {
    console.error('💥 Google Veo test failed:', error)
  }
}
```

#### **1.2 Test Runway ML Credentials**
```typescript
async function testRunwayCredentials() {
  console.log('🔐 Testing Runway ML Credentials...')
  
  try {
    const result = await videoGenerationGateway.testProviderConnection(
      'test_user_001',
      AIProvider.RUNWAY
    )
    
    if (result.success) {
      console.log('✅ Runway ML credentials valid!')
      console.log('📊 Connection status:', result.data)
    } else {
      console.log('❌ Runway ML credentials invalid:', result.error)
    }
    
  } catch (error) {
    console.error('💥 Runway ML test failed:', error)
  }
}
```

#### **1.3 Test Stability AI Credentials**
```typescript
async function testStabilityAICredentials() {
  console.log('🔐 Testing Stability AI Credentials...')
  
  try {
    const result = await videoGenerationGateway.testProviderConnection(
      'test_user_001',
      AIProvider.STABILITY_AI
    )
    
    if (result.success) {
      console.log('✅ Stability AI credentials valid!')
      console.log('📊 Connection status:', result.data)
    } else {
      console.log('❌ Stability AI credentials invalid:', result.error)
    }
    
  } catch (error) {
    console.error('💥 Stability AI test failed:', error)
  }
}
```

### **Phase 2: End-to-End Video Generation**

#### **2.1 Test Video Generation Request**
```typescript
async function testVideoGeneration() {
  console.log('🎬 Testing Video Generation...')
  
  const request = {
    prompt: 'A serene forest with sunlight filtering through trees, peaceful atmosphere',
    negative_prompt: 'dark, scary, stormy, low quality',
    aspect_ratio: '16:9',
    motion_intensity: 3, // Low motion for peaceful scene
    duration: 10,
    resolution: '1920x1080',
    style: 'realistic',
    quality: 'high',
    fps: 30
  }
  
  try {
    // Test with Google Veo
    console.log('   Testing with Google Veo...')
    const googleResult = await videoGenerationGateway.trigger_generation(
      'test_user_001',
      request,
      AIProvider.GOOGLE_VEO
    )
    
    if (googleResult.success) {
      console.log('   ✅ Google Veo generation initiated!')
      console.log('   📊 Status:', googleResult.data?.status)
      console.log('   🆔 Job ID:', googleResult.data?.provider_job_id)
      
      // Test status checking
      await testStatusChecking(
        'test_user_001',
        AIProvider.GOOGLE_VEO,
        googleResult.data!.provider_job_id!
      )
    } else {
      console.log('   ❌ Google Veo generation failed:', googleResult.error)
    }
    
  } catch (error) {
    console.error('   💥 Google Veo generation test failed:', error)
  }
}
```

#### **2.2 Test Status Checking**
```typescript
async function testStatusChecking(
  userId: string,
  provider: AIProvider,
  providerJobId: string
) {
  console.log('🔍 Testing Status Checking...')
  
  let attempts = 0
  const maxAttempts = 20 // Check for up to 10 minutes
  
  while (attempts < maxAttempts) {
    attempts++
    console.log(`   📊 Status check attempt ${attempts}/${maxAttempts}`)
    
    try {
      const statusResult = await videoGenerationGateway.check_generation_status(
        userId,
        provider,
        providerJobId
      )
      
      if (statusResult.success) {
        const status = statusResult.data?.status
        const progress = statusResult.data?.progress || 0
        
        console.log(`   📈 Status: ${status}, Progress: ${progress}%`)
        
        if (status === 'COMPLETED') {
          console.log('   🎉 Video generation completed!')
          if (statusResult.data?.video_url) {
            console.log('   🎥 Video URL:', statusResult.data.video_url)
          }
          break
        } else if (status === 'FAILED') {
          console.log('   ❌ Video generation failed:', statusResult.data?.error_message)
          break
        } else if (status === 'CANCELLED') {
          console.log('   🚫 Video generation was cancelled')
          break
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 30000)) // 30 seconds
        
      } else {
        console.log('   ❌ Status check failed:', statusResult.error)
        break
      }
      
    } catch (error) {
      console.error('   💥 Status check error:', error)
      break
    }
  }
  
  if (attempts >= maxAttempts) {
    console.log('   ⏰ Status checking timed out')
  }
}
```

### **Phase 3: Error Handling and Edge Cases**

#### **3.1 Test Invalid Requests**
```typescript
async function testInvalidRequests() {
  console.log('🚫 Testing Invalid Requests...')
  
  const invalidRequests = [
    {
      name: 'Empty prompt',
      request: {
        prompt: '',
        aspect_ratio: '16:9',
        motion_intensity: 5
      }
    },
    {
      name: 'Invalid motion intensity',
      request: {
        prompt: 'Test prompt',
        aspect_ratio: '16:9',
        motion_intensity: 15 // Out of range
      }
    },
    {
      name: 'Invalid duration',
      request: {
        prompt: 'Test prompt',
        aspect_ratio: '16:9',
        motion_intensity: 5,
        duration: 200 // Too long
      }
    },
    {
      name: 'Invalid FPS',
      request: {
        prompt: 'Test prompt',
        aspect_ratio: '16:9',
        motion_intensity: 5,
        fps: 100 // Too high
      }
    }
  ]
  
  for (const testCase of invalidRequests) {
    console.log(`   Testing: ${testCase.name}`)
    
    try {
      const result = await videoGenerationGateway.trigger_generation(
        'test_user_001',
        testCase.request as any,
        AIProvider.GOOGLE_VEO
      )
      
      if (!result.success) {
        console.log(`   ✅ Correctly rejected: ${result.error}`)
      } else {
        console.log(`   ⚠️ Unexpectedly accepted: ${testCase.name}`)
      }
      
    } catch (error) {
      console.log(`   ✅ Correctly threw error: ${error}`)
    }
  }
}
```

#### **3.2 Test Rate Limiting**
```typescript
async function testRateLimiting() {
  console.log('⏱️ Testing Rate Limiting...')
  
  const requests = []
  const maxConcurrent = 5
  
  console.log(`   Sending ${maxConcurrent} concurrent requests...`)
  
  for (let i = 0; i < maxConcurrent; i++) {
    const request = {
      prompt: `Test video ${i + 1}: A beautiful landscape`,
      aspect_ratio: '16:9',
      motion_intensity: 5,
      duration: 5,
      resolution: '1920x1080',
      quality: 'standard'
    }
    
    requests.push(
      videoGenerationGateway.trigger_generation(
        'test_user_001',
        request,
        AIProvider.GOOGLE_VEO
      )
    )
  }
  
  try {
    const results = await Promise.allSettled(requests)
    
    let successCount = 0
    let failureCount = 0
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++
        console.log(`   ✅ Request ${index + 1} succeeded`)
      } else {
        failureCount++
        console.log(`   ❌ Request ${index + 1} failed`)
      }
    })
    
    console.log(`   📊 Results: ${successCount} succeeded, ${failureCount} failed`)
    
  } catch (error) {
    console.error('   💥 Rate limiting test failed:', error)
  }
}
```

### **Phase 4: Performance Testing**

#### **4.1 Test Adapter Creation Performance**
```typescript
async function testAdapterPerformance() {
  console.log('⚡ Testing Adapter Performance...')
  
  const iterations = 100
  const startTime = Date.now()
  
  try {
    for (let i = 0; i < iterations; i++) {
      videoGenerationGateway.get_adapter(AIProvider.GOOGLE_VEO)
    }
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`   ✅ Created ${iterations} adapters in ${duration}ms`)
    console.log(`   📊 Average: ${duration / iterations}ms per adapter`)
    console.log(`   🚀 Performance: ${Math.round(1000 / (duration / iterations))} adapters/second`)
    
  } catch (error) {
    console.error('   💥 Performance test failed:', error)
  }
}
```

#### **4.2 Test Database Query Performance**
```typescript
async function testDatabasePerformance() {
  console.log('🗄️ Testing Database Performance...')
  
  const iterations = 100
  const startTime = Date.now()
  
  try {
    for (let i = 0; i < iterations; i++) {
      await videoGenerationGateway.getAvailableProviders('test_user_001')
    }
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`   ✅ Executed ${iterations} database queries in ${duration}ms`)
    console.log(`   📊 Average: ${duration / iterations}ms per query`)
    console.log(`   🚀 Performance: ${Math.round(1000 / (duration / iterations))} queries/second`)
    
  } catch (error) {
    console.error('   💥 Database performance test failed:', error)
  }
}
```

## 🔍 **Test Execution**

### **1. Run All Integration Tests**
```bash
# Create the integration test script
npx ts-node src/scripts/test-integration.ts
```

### **2. Run Specific Test Phases**
```typescript
// Modify the main execution to run specific phases
if (require.main === module) {
  const phase = process.argv[2] || 'all'
  
  switch (phase) {
    case 'credentials':
      testGoogleVeoCredentials()
        .then(() => testRunwayCredentials())
        .then(() => testStabilityAICredentials())
        .then(() => console.log('✅ Credential tests completed'))
        .catch(console.error)
      break
      
    case 'generation':
      testVideoGeneration()
        .then(() => console.log('✅ Generation tests completed'))
        .catch(console.error)
      break
      
    case 'errors':
      testInvalidRequests()
        .then(() => testRateLimiting())
        .then(() => console.log('✅ Error handling tests completed'))
        .catch(console.error)
      break
      
    case 'performance':
      testAdapterPerformance()
        .then(() => testDatabasePerformance())
        .then(() => console.log('✅ Performance tests completed'))
        .catch(console.error)
      break
      
    case 'all':
    default:
      // Run all tests
      testGoogleVeoCredentials()
        .then(() => testRunwayCredentials())
        .then(() => testStabilityAICredentials())
        .then(() => testVideoGeneration())
        .then(() => testInvalidRequests())
        .then(() => testRateLimiting())
        .then(() => testAdapterPerformance())
        .then(() => testDatabasePerformance())
        .then(() => console.log('🎉 All integration tests completed!'))
        .catch(console.error)
      break
  }
}
```

## 📊 **Test Results Analysis**

### **1. Success Criteria**
- ✅ All provider credentials validate successfully
- ✅ Video generation requests are accepted
- ✅ Status checking works correctly
- ✅ Error handling rejects invalid requests
- ✅ Rate limiting prevents abuse
- ✅ Performance meets requirements

### **2. Performance Benchmarks**
- **Adapter Creation**: < 1ms per adapter
- **Database Queries**: < 10ms per query
- **API Response Time**: < 5 seconds for generation initiation
- **Status Check Time**: < 2 seconds per check

### **3. Error Rate Targets**
- **Credential Validation**: < 1% failure rate
- **Request Processing**: < 5% failure rate
- **Status Checking**: < 2% failure rate

## 🚨 **Troubleshooting Common Issues**

### **1. Credential Validation Failures**
```bash
# Check encryption key
npm run test:encryption

# Verify database connection
npm run test:database

# Check provider API status
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.provider.com/status
```

### **2. Database Connection Issues**
```bash
# Test database connection
psql -h localhost -U sceneflow_user -d sceneflow_ai -c "SELECT version();"

# Check database logs
tail -f /var/log/postgresql/postgresql-*.log
```

### **3. API Rate Limiting**
```bash
# Check provider rate limits
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.provider.com/rate-limits

# Implement exponential backoff in your tests
```

## 📋 **Integration Testing Checklist**

- [ ] **Environment Setup**
  - [ ] All dependencies installed
  - [ ] Encryption service configured
  - [ ] Database connection working
  - [ ] Test database populated

- [ ] **Credential Testing**
  - [ ] Google Veo credentials valid
  - [ ] Runway ML credentials valid
  - [ ] Stability AI credentials valid
  - [ ] All providers accessible

- [ ] **Video Generation Testing**
  - [ ] Generation requests accepted
  - [ ] Job IDs returned correctly
  - [ ] Status checking works
  - [ ] Progress tracking functional

- [ ] **Error Handling Testing**
  - [ ] Invalid requests rejected
  - [ ] Error messages clear
  - [ ] Rate limiting enforced
  - [ ] Edge cases handled

- [ ] **Performance Testing**
  - [ ] Adapter creation fast
  - [ ] Database queries efficient
  - [ ] API response times acceptable
  - [ ] Memory usage stable

- [ ] **Documentation**
  - [ ] Test results documented
  - [ ] Issues logged and tracked
  - [ ] Performance benchmarks recorded
  - [ ] Recommendations documented

## 🎯 **Next Steps After Integration Testing**

1. **Fix Issues**: Address any problems found during testing
2. **Performance Tuning**: Optimize slow operations
3. **Security Review**: Verify all security measures work
4. **Production Deployment**: Deploy with confidence
5. **Monitoring Setup**: Implement production monitoring
6. **User Acceptance Testing**: Test with real users

This integration testing guide ensures your VideoGenerationGateway service is thoroughly tested and ready for production deployment.
