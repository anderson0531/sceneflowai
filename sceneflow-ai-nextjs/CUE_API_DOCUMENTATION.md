# Cue API Documentation

## 🎭 **Overview**

The Cue API endpoint (`/api/ideation/cue`) implements an advanced AI conversation system with dual persona prompt engineering. Cue acts as both a **Professional Scriptwriter/Director** and an **Audience Analyst** to help users develop video concepts iteratively.

## 🎯 **Dual Persona Strategy**

### **1. Professional Scriptwriter/Director**
- **Narrative Structure**: Focuses on storytelling techniques, pacing, and visual flow
- **Execution Feasibility**: Evaluates technical aspects like shot composition and production requirements
- **Creative Originality**: Assesses artistic merit and creative innovation
- **Visual Storytelling**: Considers editing flow, character development, and cinematic elements

### **2. Audience Analyst**
- **Target Demographics**: Analyzes viewer preferences and viewing habits
- **Market Trends**: Evaluates current engagement patterns and content performance
- **Commercial Viability**: Assesses audience appeal and market positioning
- **Cultural Relevance**: Considers social impact and cultural context

## 📡 **API Endpoint**

### **POST /api/ideation/cue**

**URL**: `http://localhost:3000/api/ideation/cue`

**Purpose**: Generate Cue's response using dual persona analysis

---

## 📥 **Request Format**

### **Headers**
```http
Content-Type: application/json
```

### **Request Body**
```typescript
interface CueRequest {
  userId: string                    // Required: User identifier
  conversationHistory: ConversationMessage[]  // Required: Chat history
  currentConcept?: {               // Optional: Current concept state
    title?: string
    description?: string
    targetAudience?: string
    keyMessage?: string
    tone?: string
    genre?: string
    duration?: number
  }
  provider?: AIProvider            // Optional: AI provider for context
}
```

### **Conversation Message Structure**
```typescript
interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}
```

---

## 📤 **Response Format**

### **Success Response (200)**
```json
{
  "success": true,
  "data": {
    "message": "Cue's conversational response incorporating both personas",
    "suggestions": [
      "Specific suggestion 1",
      "Specific suggestion 2", 
      "Specific suggestion 3"
    ],
    "completeness_score": 0.65,
    "analysis": {
      "narrative_strength": 0.7,
      "audience_alignment": 0.6,
      "market_potential": 0.8,
      "execution_feasibility": 0.5
    },
    "next_questions": [
      "Question 1",
      "Question 2",
      "Question 3"
    ],
    "concept_refinements": {
      "title": "Refined title",
      "description": "Enhanced description",
      "targetAudience": "More specific audience",
      "keyMessage": "Sharpened key message",
      "tone": "Refined tone",
      "genre": "Specific genre",
      "duration": 60
    }
  },
  "message": "Cue response generated successfully"
}
```

### **Error Response (400/500)**
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

---

## 🔍 **Response Fields Explained**

### **Core Response**
- **`message`**: Cue's conversational response that incorporates insights from both personas
- **`suggestions`**: 3 actionable suggestions for concept improvement
- **`completeness_score`**: 0.0-1.0 score indicating concept development progress

### **Analysis Metrics**
- **`narrative_strength`**: Story structure and creative execution (0.0-1.0)
- **`audience_alignment`**: Target audience fit and appeal (0.0-1.0)
- **`market_potential`**: Commercial viability and market opportunity (0.0-1.0)
- **`execution_feasibility`**: Technical and production feasibility (0.0-1.0)

### **Guidance Elements**
- **`next_questions`**: 3 probing questions to guide user thinking
- **`concept_refinements`**: Suggested improvements to current concept elements

---

## 🎬 **Usage Examples**

### **Example 1: Initial Concept Development**
```bash
curl -X POST http://localhost:3000/api/ideation/cue \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "conversationHistory": [
      {
        "role": "user",
        "content": "I want to create a video about sustainable living for young professionals.",
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ]
  }'
```

**Expected Response**: Low completeness score (0.2-0.4) with foundational suggestions and basic questions

### **Example 2: Refined Concept Review**
```bash
curl -X POST http://localhost:3000/api/ideation/cue \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "conversationHistory": [
      {
        "role": "user",
        "content": "I think my concept is ready. Can you review it?",
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ],
    "currentConcept": {
      "title": "Zero Waste Kitchen: 10 Easy Swaps",
      "description": "A comprehensive guide showing young professionals how to reduce kitchen waste",
      "targetAudience": "Young professionals aged 25-35 interested in sustainability",
      "keyMessage": "Sustainable living is accessible and affordable for everyone",
      "tone": "Educational and inspiring",
      "genre": "How-to/Educational",
      "duration": 90
    },
    "provider": "GOOGLE_VEO"
  }'
```

**Expected Response**: High completeness score (0.8-0.9) with production-ready suggestions and advanced questions

---

## 🧠 **Prompt Engineering Details**

### **System Prompt Structure**
The API constructs a sophisticated system prompt that:

1. **Defines Dual Personas**: Clear instructions for both scriptwriter/director and audience analyst roles
2. **Sets Guidelines**: Specific conversation rules and response requirements
3. **Provides Context**: Technical provider information and current concept state
4. **Enforces Format**: Strict JSON response structure with validation

### **Dynamic Prompt Generation**
- **Provider Context**: Includes AI provider capabilities and limitations
- **Concept Analysis**: Incorporates current concept state for contextual responses
- **Stage Awareness**: Adapts response strategy based on concept development stage

---

## 📊 **Concept Development Stages**

### **Stage 1: Initial (0.0-0.3)**
- **Characteristics**: Basic idea, minimal details
- **Focus**: Foundation building, audience definition
- **Response Strategy**: Encouraging, foundational questions, basic guidance

### **Stage 2: Developing (0.3-0.6)**
- **Characteristics**: Some elements defined, gaps remain
- **Focus**: Specific refinement, audience alignment
- **Response Strategy**: Constructive feedback, targeted suggestions, probing questions

### **Stage 3: Refined (0.6-0.8)**
- **Characteristics**: Most elements defined, minor refinements needed
- **Focus**: Fine-tuning, production preparation
- **Response Strategy**: Detailed analysis, production guidance, final refinements

### **Stage 4: Complete (0.8-1.0)**
- **Characteristics**: Production-ready concept
- **Focus**: Production planning, distribution strategy
- **Response Strategy**: Validation, production guidance, next steps

---

## 🔧 **Technical Implementation**

### **Provider Integration**
- **Credential Validation**: Checks user's configured AI providers
- **Capability Context**: Incorporates provider limitations and features
- **Fallback Handling**: Graceful degradation when providers unavailable

### **Response Generation**
- **LLM Integration**: Ready for real LLM API integration
- **Simulation Mode**: Intelligent fallback for demo/testing
- **Response Parsing**: Robust JSON parsing with validation
- **Error Handling**: Comprehensive error handling and fallback responses

### **Performance Features**
- **Async Processing**: Non-blocking response generation
- **Caching Ready**: Structure supports response caching
- **Scalable**: Designed for high-volume conversation handling

---

## 🧪 **Testing**

### **Run Tests**
```bash
# Test Cue API endpoint
npm run test:cue

# Test specific scenarios
npx ts-node src/scripts/test-cue-api.ts
```

### **Test Coverage**
- **Basic Functionality**: Endpoint availability and response structure
- **Conversation Scenarios**: Various concept development stages
- **Error Handling**: Invalid requests and edge cases
- **Response Validation**: JSON structure and data integrity

---

## 🚀 **Integration Guide**

### **Frontend Integration**
1. **Send Requests**: POST to `/api/ideation/cue` with conversation data
2. **Handle Responses**: Process structured JSON responses
3. **Update UI**: Display suggestions, scores, and guidance
4. **Iterate**: Use responses to guide user through concept development

### **Workflow Integration**
1. **Ideation Phase**: Use Cue for concept development
2. **Progress Tracking**: Monitor completeness scores
3. **Provider Selection**: Use provider context for video generation
4. **Quality Assurance**: Validate concepts before production

---

## 🔮 **Future Enhancements**

### **Planned Features**
- **Real LLM Integration**: Connect to actual AI provider APIs
- **Response Caching**: Cache common responses for performance
- **Multi-language Support**: Internationalization for global users
- **Advanced Analytics**: Detailed concept performance metrics

### **Scalability Improvements**
- **Rate Limiting**: Prevent API abuse
- **Response Streaming**: Real-time conversation updates
- **Batch Processing**: Handle multiple conversations simultaneously
- **Load Balancing**: Distribute requests across multiple instances

---

## 📞 **Support & Troubleshooting**

### **Common Issues**
1. **Invalid JSON**: Ensure request body is valid JSON
2. **Missing Fields**: Check required fields (userId, conversationHistory)
3. **Provider Errors**: Verify AI provider configuration
4. **Response Parsing**: Validate response structure

### **Debug Information**
- **Console Logs**: Detailed logging for troubleshooting
- **Error Details**: Specific error messages and context
- **Request Validation**: Input validation and error reporting
- **Response Validation**: Output structure validation

---

## 🎯 **Best Practices**

### **Request Optimization**
- **Conversation History**: Keep history focused and relevant
- **Concept Updates**: Provide current concept state for context
- **Provider Selection**: Specify provider for relevant suggestions

### **Response Handling**
- **Score Interpretation**: Use completeness scores to guide development
- **Suggestion Implementation**: Act on actionable suggestions
- **Question Follow-up**: Use next questions to continue development
- **Iterative Refinement**: Build concept through multiple conversations

This API provides a sophisticated foundation for AI-powered video concept development with professional-grade guidance and analysis! 🎬✨
