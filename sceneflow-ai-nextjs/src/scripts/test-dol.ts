import { dol } from '../services/DOL/DynamicOptimizationLayer';
import { TaskType, TaskComplexity } from '../types/dol';

async function testDOL() {
  console.log('🧪 Testing Dynamic Optimization Layer (DOL)...\n');

  // Test 1: Intelligence task with high complexity
  console.log('🔍 Test 1: High complexity intelligence task');
  try {
    const result1 = await dol.optimize({
      taskType: TaskType.SCRIPT_WRITING,
      complexity: TaskComplexity.HIGH,
      userInput: {
        concept: 'A cyberpunk detective story set in 2045',
        genre: 'Sci-fi thriller',
        targetAudience: 'Young adults',
        tone: 'Dark and gritty'
      }
    });

    if (result1.success && result1.result) {
      console.log('✅ Test 1 passed');
      console.log(`   Model: ${result1.result.model.displayName}`);
      console.log(`   Platform: ${result1.result.model.platformId}`);
      console.log(`   Estimated Cost: $${result1.result.estimatedCost.toFixed(6)}`);
      console.log(`   Expected Quality: ${result1.result.expectedQuality}/100`);
      console.log(`   Reasoning: ${result1.result.reasoning}`);
    } else {
      console.log('❌ Test 1 failed:', result1.error);
    }
  } catch (error) {
    console.log('❌ Test 1 error:', error);
  }

  console.log('\n');

  // Test 2: Video generation task with BYOK
  console.log('🎬 Test 2: Video generation with BYOK');
  try {
    const result2 = await dol.optimize({
      taskType: TaskType.TEXT_TO_VIDEO,
      complexity: TaskComplexity.MEDIUM,
      userInput: {
        sceneDescription: 'A futuristic cityscape at sunset',
        style: 'Cinematic',
        mood: 'Mysterious',
        duration: 8,
        motion: 'Slow pan'
      },
      byokPlatformId: 'runwayml'
    });

    if (result2.success && result2.result) {
      console.log('✅ Test 2 passed');
      console.log(`   Model: ${result2.result.model.displayName}`);
      console.log(`   Platform: ${result2.result.model.platformId}`);
      console.log(`   BYOK: ${result2.result.model.isBYOKSupported ? 'Yes' : 'No'}`);
      console.log(`   Features: ${result2.result.model.features.join(', ')}`);
    } else {
      console.log('❌ Test 2 failed:', result2.error);
    }
  } catch (error) {
    console.log('❌ Test 2 error:', error);
  }

  console.log('\n');

  // Test 3: Cost optimization for simple task
  console.log('💰 Test 3: Cost optimization for simple task');
  try {
    const result3 = await dol.optimize({
      taskType: TaskType.STORY_ANALYSIS,
      complexity: TaskComplexity.LOW,
      userInput: {
        story: 'A simple fairy tale about a brave mouse',
        focus: 'Character development'
      },
      budget: 0.001
    });

    if (result3.success && result3.result) {
      console.log('✅ Test 3 passed');
      console.log(`   Model: ${result3.result.model.displayName}`);
      console.log(`   Cost: $${result3.result.estimatedCost.toFixed(6)}`);
      console.log(`   Budget: $${0.001}`);
      console.log(`   Within Budget: ${result3.result.estimatedCost <= 0.001 ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Test 3 failed:', result3.error);
    }
  } catch (error) {
    console.log('❌ Test 3 error:', error);
  }

  console.log('\n🎉 DOL testing completed!');
}

// Run the test
testDOL().catch(console.error);
