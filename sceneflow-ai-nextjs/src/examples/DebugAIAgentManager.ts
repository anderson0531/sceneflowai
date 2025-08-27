// Debug AIAgentManager - Test what methods are actually available

export const debugAIAgentManager = async () => {
  console.log('🔍 Debugging AIAgentManager...');
  
  try {
    // Import the manager
    const { aiAgentManager } = await import('../services/AIAgentManager');
    
    console.log('✅ AIAgentManager imported successfully');
    console.log('🔍 aiAgentManager object:', aiAgentManager);
    console.log('🔍 aiAgentManager type:', typeof aiAgentManager);
    console.log('🔍 aiAgentManager constructor:', aiAgentManager.constructor);
    
    // Check what methods are available
    console.log('🔍 Available methods:');
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(aiAgentManager));
    console.log('Methods:', methods);
    
    // Check if getAgentByType exists
    console.log('🔍 getAgentByType exists:', typeof aiAgentManager.getAgentByType);
    console.log('🔍 getAgentsByType exists:', typeof aiAgentManager.getAgentsByType);
    
    // Try to call getAgentsByType
    try {
      const agents = aiAgentManager.getAgentsByType('ideation-specialist');
      console.log('✅ getAgentsByType works:', agents.length, 'agents found');
    } catch (error) {
      console.error('❌ getAgentsByType failed:', error);
    }
    
    // Try to call getAgentByType
    try {
      const agents = aiAgentManager.getAgentByType('ideation-specialist');
      console.log('✅ getAgentByType works:', agents.length, 'agents found');
    } catch (error) {
      console.error('❌ getAgentByType failed:', error);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return false;
  }
};

export default debugAIAgentManager;
