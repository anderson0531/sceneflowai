'use client';

import { useState } from 'react';

export default function TestPhase1Page() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const runPhase1Test = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    addResult('🧪 Starting Phase 1 Test...');
    
    try {
      // Test 1: Check if services can be imported
      addResult('📦 Testing service imports...');
      
      try {
        const { aiCapabilityManager } = await import('../../services/AICapabilityManager');
        addResult('✅ AICapabilityManager imported successfully');
      } catch (error) {
        addResult(`❌ AICapabilityManager import failed: ${error}`);
      }
      
      try {
        const { dynamicPromptEngine } = await import('../../services/DynamicPromptEngine');
        addResult('✅ DynamicPromptEngine imported successfully');
      } catch (error) {
        addResult(`❌ DynamicPromptEngine import failed: ${error}`);
      }
      
      try {
        const { enhancedProjectManager } = await import('../../services/EnhancedProjectManager');
        addResult('✅ EnhancedProjectManager imported successfully');
      } catch (error) {
        addResult(`❌ EnhancedProjectManager import failed: ${error}`);
      }
      
      // Test 2: Check if store can be imported
      addResult('🏪 Testing store import...');
      
      try {
        const { useEnhancedStore } = await import('../../store/enhancedStore');
        addResult('✅ Enhanced store imported successfully');
      } catch (error) {
        addResult(`❌ Enhanced store import failed: ${error}`);
      }
      
      // Test 3: Check if types can be imported
      addResult('📝 Testing type imports...');
      
      try {
        const types = await import('../../types/ai-adaptability');
        addResult('✅ AI adaptability types imported successfully');
      } catch (error) {
        addResult(`❌ AI adaptability types import failed: ${error}`);
      }
      
      try {
        const projectTypes = await import('../../types/enhanced-project');
        addResult('✅ Enhanced project types imported successfully');
      } catch (error) {
        addResult(`❌ Enhanced project types import failed: ${error}`);
      }
      
      // Test 4: Try to run the demo
      addResult('🎬 Testing demo execution...');
      
      try {
        const demo = await import('../../examples/Phase1Demo');
        addResult('✅ Phase1Demo imported successfully');
        
        if (demo.runPhase1Demo) {
          addResult('✅ runPhase1Demo function found');
        } else {
          addResult('❌ runPhase1Demo function not found');
        }
      } catch (error) {
        addResult(`❌ Phase1Demo import failed: ${error}`);
      }
      
      addResult('✅ Phase 1 test completed!');
      
    } catch (error) {
      addResult(`❌ Test failed with error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-sf-background text-sf-text-primary p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          🧪 SceneFlow AI - Phase 1 Test
        </h1>
        
        <div className="bg-sf-surface-light rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Test Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={runPhase1Test}
              disabled={isRunning}
              className="bg-sf-primary text-sf-background px-6 py-3 rounded-lg hover:bg-sf-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? '🔄 Running Test...' : '🚀 Run Phase 1 Test'}
            </button>
            
            <button
              onClick={clearResults}
              className="bg-sf-surface border border-sf-border text-sf-text-primary px-6 py-3 rounded-lg hover:bg-sf-surface-light"
            >
              🗑️ Clear Results
            </button>
          </div>
        </div>
        
        <div className="bg-sf-surface-light rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Test Results</h2>
          
          {testResults.length === 0 ? (
            <p className="text-sf-text-secondary text-center py-8">
              No test results yet. Click "Run Phase 1 Test" to start testing.
            </p>
          ) : (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    result.includes('✅') 
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : result.includes('❌')
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-sf-surface-light rounded-lg p-6 mt-8">
          <h2 className="text-2xl font-semibold mb-4">What This Test Does</h2>
          <div className="space-y-3 text-sf-text-secondary">
            <p>✅ <strong>Service Imports:</strong> Tests if all Phase 1 services can be imported</p>
            <p>✅ <strong>Store Import:</strong> Tests if the enhanced Zustand store can be imported</p>
            <p>✅ <strong>Type Imports:</strong> Tests if all TypeScript interfaces can be imported</p>
            <p>✅ <strong>Demo Import:</strong> Tests if the Phase 1 demo can be imported</p>
          </div>
          
          <div className="mt-6 p-4 bg-sf-primary/10 rounded-lg">
            <h3 className="font-semibold mb-2">Next Steps After Testing:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>If all tests pass: Phase 1 is ready for Phase 2 development</li>
              <li>If some tests fail: Fix the issues before proceeding</li>
                             <li>Run the full demo in browser console: <code className="bg-sf-surface px-2 py-1 rounded">{`import("/src/examples/Phase1Demo.ts").then(m => m.runPhase1Demo())`}</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
