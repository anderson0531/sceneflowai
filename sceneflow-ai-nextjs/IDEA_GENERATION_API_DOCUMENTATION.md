# 💡 Idea Generation API Documentation

## 🎬 **Overview**

The Idea Generation API endpoint (`/api/ideation/generate`) creates 4 distinct video ideas based on finalized conversation history and concept data. It uses advanced LLM prompt engineering to generate creative, audience-targeted video concepts with detailed scene outlines and strength ratings.

## 🎯 **Core Functionality**

### **What It Does**
- **Generates 4 Unique Ideas**: Each with different approaches and execution styles
- **LLM-Powered Creation**: Uses sophisticated prompt engineering for quality output
- **Audience-Focused**: Tailors ideas to the defined target audience
- **Strength Rating**: Calculates 1-5 rating based on audience appeal potential
- **Complete Outlines**: Provides detailed scene breakdowns for each idea

### **Key Features**
- **Provider Integration**: Incorporates AI provider capabilities and limitations
- **Context Awareness**: Uses conversation history for contextual idea generation
- **Quality Assurance**: Ensures ideas meet minimum quality standards
- **Metadata Generation**: Provides comprehensive generation analytics

---

## 📡 **API Endpoint**

### **POST /api/ideation/generate**

**URL**: `http://localhost:3000/api/ideation/generate`

**Purpose**: Generate 4 distinct video ideas based on finalized concept and conversation history

---

## 📥 **Request Format**

### **Headers**
```http
Content-Type: application/json
```

### **Request Body**
```typescript
interface IdeaGenerationRequest {
  userId: string                    // Required: User identifier
  conversationHistory: ConversationMessage[]  // Required: Chat history with Cue
  finalizedConcept: {               // Required: Finalized concept details
    title?: string
    description?: string
    targetAudience: string          // Required: Target audience definition
    keyMessage: string              // Required: Core message
    tone?: string                   // Optional: Emotional tone
    genre?: string                  // Optional: Content genre
    duration?: number               // Optional: Video duration in seconds
    platform?: string               // Optional: Target platform
    callToAction?: string           // Optional: Call to action
  }
  provider?: AIProvider             // Optional: AI provider for context
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
    "ideas": [
      {
        "id": "uuid-string-1",
        "title": "Compelling video title",
        "synopsis": "2-3 sentence description of the video concept",
        "scene_outline": [
          "Scene 1: Opening hook and setup",
          "Scene 2: Problem introduction",
          "Scene 3: Solution demonstration",
          "Scene 4: Call to action"
        ],
        "thumbnail_prompt": "Detailed description for generating an engaging thumbnail image",
        "strength_rating": 4.5
      },
      {
        "id": "uuid-string-2",
        "title": "Second video title",
        "synopsis": "Description of second concept",
        "scene_outline": ["Scene 1...", "Scene 2...", "Scene 3...", "Scene 4..."],
        "thumbnail_prompt": "Thumbnail description for second concept",
        "strength_rating": 4.2
      }
      // ... 2 more ideas
    ],
    "conceptSummary": {
      "targetAudience": "Young professionals aged 25-35",
      "keyMessage": "Sustainable living is accessible to everyone",
      "tone": "Educational and inspiring",
      "genre": "How-to/Educational",
      "estimatedDuration": 90
    },
    "generationMetadata": {
      "totalIdeas": 4,
      "averageStrengthRating": 4.35,
      "strongestIdea": { /* idea object */ },
      "generationTimestamp": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "Video ideas generated successfully"
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

### **Generated Ideas**
- **`id`**: Unique identifier for each idea
- **`title`**: Compelling, audience-focused video title
- **`synopsis`**: 2-3 sentence concept description
- **`scene_outline`**: Detailed scene breakdown (4-6 scenes)
- **`thumbnail_prompt`**: Visual description for thumbnail generation
- **`strength_rating`**: 1-5 rating based on audience appeal potential

### **Concept Summary**
- **`targetAudience`**: Refined audience definition
- **`keyMessage`**: Core message being communicated
- **`tone`**: Emotional approach and style
- **`genre`**: Content category and format
- **`estimatedDuration`**: Suggested video length

### **Generation Metadata**
- **`totalIdeas`**: Always 4 ideas generated
- **`averageStrengthRating`**: Mean rating across all ideas
- **`strongestIdea`**: Highest-rated idea object
- **`generationTimestamp`**: When ideas were created

---

## 🎬 **Usage Examples**

### **Example 1: Sustainable Living Concept**
```bash
curl -X POST http://localhost:3000/api/ideation/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "conversationHistory": [
      {
        "role": "user",
        "content": "I want to create a video about sustainable living for young professionals.",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "role": "assistant",
        "content": "That\'s a great topic! Let me help you develop this concept.",
        "timestamp": "2024-01-15T10:31:00.000Z"
      }
    ],
    "finalizedConcept": {
      "targetAudience": "Young professionals aged 25-35 interested in sustainability",
      "keyMessage": "Sustainable living is accessible and affordable for everyone",
      "tone": "Educational and inspiring",
      "genre": "How-to/Educational",
      "duration": 90,
      "platform": "Instagram and YouTube",
      "callToAction": "Start your zero-waste journey today"
    }
  }'
```

**Expected Response**: 4 distinct ideas with strength ratings 3.5-4.8, covering different approaches (story-driven, educational, comparison, behind-the-scenes)

### **Example 2: Creative Block Concept**
```bash
curl -X POST http://localhost:3000/api/ideation/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_456",
    "conversationHistory": [
      {
        "role": "user",
        "content": "I want to help creative professionals overcome creative blocks.",
        "timestamp": "2024-01-15T11:00:00.000Z"
      }
    ],
    "finalizedConcept": {
      "targetAudience": "Creative professionals and artists experiencing creative blocks",
      "keyMessage": "Creativity is a skill that can be developed and nurtured",
      "tone": "Inspirational and encouraging",
      "genre": "Motivational/Educational",
      "duration": 120
    }
  }'
```

**Expected Response**: 4 motivational ideas with strength ratings 4.0-4.9, focusing on different creative breakthrough techniques

---

## 🧠 **Prompt Engineering Strategy**

### **System Prompt Structure**
The API constructs a sophisticated system prompt that:

1. **Defines the Role**: Expert video concept developer and creative strategist
2. **Analyzes the Concept**: Incorporates all finalized concept details
3. **Sets Requirements**: Specifies exactly 4 distinct ideas with unique approaches
4. **Establishes Criteria**: Defines strength rating system (1-5 scale)
5. **Enforces Format**: Strict JSON response structure with validation

### **Creative Requirements**
- **Uniqueness**: Each idea must be distinct in approach and execution
- **Variety**: Ideas should vary in style, format, and storytelling approach
- **Audience Focus**: Optimized for the specified target audience
- **Execution Feasibility**: Ideas must be achievable within constraints
- **Platform Optimization**: Tailored for specified platform and audience behavior

### **Strength Rating Criteria**
- **1-2**: Basic concept, limited audience appeal
- **3**: Good concept, moderate audience appeal
- **4**: Strong concept, high audience appeal
- **5**: Exceptional concept, maximum audience appeal

**Rating Factors**:
- Relevance to target audience
- Clarity of message delivery
- Emotional engagement potential
- Shareability and virality potential
- Brand alignment and positioning
- Execution feasibility

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
- **Async Processing**: Non-blocking idea generation
- **Caching Ready**: Structure supports response caching
- **Scalable**: Designed for high-volume idea generation

---

## 🧪 **Testing**

### **Run Tests**
```bash
# Test idea generation API endpoint
npm run test:ideas

# Test specific scenarios
npx ts-node src/scripts/test-idea-generation.ts
```

### **Test Coverage**
- **Basic Functionality**: Endpoint availability and response structure
- **Concept Scenarios**: Various concept types and complexity levels
- **Error Handling**: Invalid requests and edge cases
- **Response Validation**: JSON structure and data integrity

---

## 🚀 **Integration Guide**

### **Frontend Integration**
1. **Send Requests**: POST to `/api/ideation/generate` with concept data
2. **Handle Responses**: Process structured JSON responses
3. **Display Ideas**: Show ideas with ratings and scene outlines
4. **User Selection**: Allow users to choose preferred ideas

### **Workflow Integration**
1. **Ideation Phase**: Use after concept reaches 80% completeness
2. **Idea Selection**: Present generated ideas for user choice
3. **Storyboarding**: Use selected idea's scene outline for next phase
4. **Quality Assurance**: Validate ideas meet production standards

---

## 🔮 **Future Enhancements**

### **Planned Features**
- **Real LLM Integration**: Connect to actual AI provider APIs
- **Response Caching**: Cache common responses for performance
- **Multi-language Support**: Internationalization for global users
- **Advanced Analytics**: Detailed idea performance metrics

### **Scalability Improvements**
- **Rate Limiting**: Prevent API abuse
- **Response Streaming**: Real-time idea generation updates
- **Batch Processing**: Handle multiple concept generations simultaneously
- **Load Balancing**: Distribute requests across multiple instances

---

## 📞 **Support & Troubleshooting**

### **Common Issues**
1. **Invalid JSON**: Ensure request body is valid JSON
2. **Missing Fields**: Check required fields (userId, conversationHistory, finalizedConcept)
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
- **Concept Details**: Provide comprehensive finalized concept
- **Provider Selection**: Specify provider for relevant context

### **Response Handling**
- **Idea Validation**: Review generated ideas for quality
- **Rating Interpretation**: Use strength ratings to guide selection
- **Scene Analysis**: Evaluate scene outlines for feasibility
- **Thumbnail Generation**: Use prompts for visual asset creation

This API provides a sophisticated foundation for AI-powered video idea generation with professional-grade creative output and audience-focused optimization! 🎬✨
