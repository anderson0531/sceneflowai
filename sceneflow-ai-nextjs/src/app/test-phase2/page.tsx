'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function Phase2TestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runFullDemo = async () => {
    setIsRunning(true);
    addResult('🚀 Starting Phase 2 Demo...');
    
    try {
      // Import and run the demo
      const { runPhase2Demo } = await import('@/examples/Phase2Demo');
      const success = await runPhase2Demo();
      
      if (success) {
        addResult('✅ Phase 2 Demo completed successfully!');
      } else {
        addResult('❌ Phase 2 Demo failed');
      }
    } catch (error) {
      addResult(`❌ Error running demo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsRunning(false);
  };

  const runSimpleTest = async () => {
    setIsRunning(true);
    addResult('🧪 Starting Simple Phase 2 Test...');
    
    try {
      // Import and run the simple test
      const { runSimplePhase2Test } = await import('@/examples/SimplePhase2Test');
      const success = await runSimplePhase2Test();
      
      if (success) {
        addResult('✅ Simple Phase 2 Test completed successfully!');
      } else {
        addResult('❌ Simple Phase 2 Test failed');
      }
    } catch (error) {
      addResult(`❌ Error running simple test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsRunning(false);
  };

  const debugAIAgentManager = async () => {
    setIsRunning(true);
    addResult('🔍 Debugging AIAgentManager...');
    
    try {
      const { debugAIAgentManager: debugFn } = await import('@/examples/DebugAIAgentManager');
      const success = await debugFn();
      
      if (success) {
        addResult('✅ Debug completed - check browser console for details');
      } else {
        addResult('❌ Debug failed');
      }
    } catch (error) {
      addResult(`❌ Error running debug: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsRunning(false);
  };

  const testAIAgents = async () => {
    addResult('🤖 Testing AI Agents...');
    
    try {
      // Run debug first to inspect available methods on aiAgentManager
      try {
        const { debugAIAgentManager: debugFn } = await import('@/examples/DebugAIAgentManager');
        await debugFn();
        addResult('ℹ️ Debug output printed to console');
      } catch (e) {
        addResult('⚠️ Debug helper not available, continuing with demo');
      }

      const { demoAIAgentManagement } = await import('@/examples/Phase2Demo');
      await demoAIAgentManagement();
      addResult('✅ AI Agents test completed');
    } catch (error) {
      addResult(`❌ AI Agents test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testIntelligentWorkflow = async () => {
    addResult('🔄 Testing Intelligent Workflow...');
    
    try {
      const { demoIntelligentWorkflowManagement } = await import('@/examples/Phase2Demo');
      await demoIntelligentWorkflowManagement();
      addResult('✅ Intelligent Workflow test completed');
    } catch (error) {
      addResult(`❌ Intelligent Workflow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAIOrchestration = async () => {
    addResult('🎬 Testing AI Orchestration...');
    
    try {
      const { demoAIOrchestration } = await import('@/examples/Phase2Demo');
      await demoAIOrchestration();
      addResult('✅ AI Orchestration test completed');
    } catch (error) {
      addResult(`❌ AI Orchestration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAgentTypes = async () => {
    addResult('👥 Testing Agent Types...');
    
    try {
      const { demoAgentTypes } = await import('@/examples/Phase2Demo');
      demoAgentTypes();
      addResult('✅ Agent Types test completed');
    } catch (error) {
      addResult(`❌ Agent Types test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testWorkflowAutomation = async () => {
    addResult('⚙️ Testing Workflow Automation...');
    
    try {
      const { demoWorkflowAutomation } = await import('@/examples/Phase2Demo');
      demoWorkflowAutomation();
      addResult('✅ Workflow Automation test completed');
    } catch (error) {
      addResult(`❌ Workflow Automation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAgentCollaboration = async () => {
    addResult('🤝 Testing Agent Collaboration...');
    
    try {
      const { demoAgentCollaboration } = await import('@/examples/Phase2Demo');
      demoAgentCollaboration();
      addResult('✅ Agent Collaboration test completed');
    } catch (error) {
      addResult(`❌ Agent Collaboration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-sf-background text-sf-text-primary p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-sf-text-primary mb-4">
            🚀 SceneFlow AI - Phase 2 Test
          </h1>
          <p className="text-sf-text-secondary text-lg">
            Test the AI Agents and Intelligent Workflow functionality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Test Controls */}
          <div className="bg-sf-surface p-6 rounded-lg border border-sf-border">
            <h2 className="text-2xl font-semibold mb-4">🧪 Test Controls</h2>
            
            <div className="space-y-3">
              <Button
                onClick={runFullDemo}
                disabled={isRunning}
                className="w-full"
                variant="primary"
              >
                {isRunning ? 'Running...' : '🚀 Run Full Phase 2 Demo'}
              </Button>
              
              <Button
                onClick={runSimpleTest}
                disabled={isRunning}
                className="w-full"
                variant="primary"
              >
                {isRunning ? 'Running...' : '🧪 Run Simple Test'}
              </Button>
              
              <Button
                onClick={debugAIAgentManager}
                disabled={isRunning}
                className="w-full"
                variant="secondary"
              >
                {isRunning ? 'Running...' : '🔍 Debug AIAgentManager'}
              </Button>
              
              <Button
                onClick={testAIAgents}
                disabled={isRunning}
                className="w-full"
                variant="outline"
              >
                🤖 Test AI Agents
              </Button>
              
              <Button
                onClick={testIntelligentWorkflow}
                disabled={isRunning}
                className="w-full"
                variant="outline"
              >
                🔄 Test Intelligent Workflow
              </Button>
              
              <Button
                onClick={testAIOrchestration}
                disabled={isRunning}
                className="w-full"
                variant="outline"
              >
                🎬 Test AI Orchestration
              </Button>
              
              <Button
                onClick={testAgentTypes}
                disabled={isRunning}
                className="w-full"
                variant="outline"
              >
                👥 Test Agent Types
              </Button>
              
              <Button
                onClick={testWorkflowAutomation}
                disabled={isRunning}
                className="w-full"
                variant="outline"
              >
                ⚙️ Test Workflow Automation
              </Button>
              
              <Button
                onClick={testAgentCollaboration}
                disabled={isRunning}
                className="w-full"
                variant="outline"
              >
                🤝 Test Agent Collaboration
              </Button>
              
              <Button
                onClick={clearResults}
                className="w-full"
                variant="secondary"
              >
                🗑️ Clear Results
              </Button>
            </div>
          </div>

          {/* Test Information */}
          <div className="bg-sf-surface p-6 rounded-lg border border-sf-border">
            <h2 className="text-2xl font-semibold mb-4">📋 Test Information</h2>
            
            <div className="space-y-4 text-sm text-sf-text-secondary">
              <div>
                <h3 className="font-semibold text-sf-text-primary mb-2">Phase 2 Features:</h3>
                <ul className="space-y-1 ml-4">
                  <li>• AI Agents System (8 specialized agents)</li>
                  <li>• Intelligent Workflow Management</li>
                  <li>• AI Agent Orchestration</li>
                  <li>• Automated Workflow Rules</li>
                  <li>• Quality Thresholds & Monitoring</li>
                  <li>• Agent Collaboration & Coordination</li>
                  <li>• Performance Analytics & Metrics</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-sf-text-primary mb-2">Agent Types:</h3>
                <ul className="space-y-1 ml-4">
                  <li>• Ideation Specialist</li>
                  <li>• Storyboard Artist</li>
                  <li>• Scene Director</li>
                  <li>• Video Producer</li>
                  <li>• Quality Assurance</li>
                  <li>• Collaboration Coordinator</li>
                  <li>• Optimization Expert</li>
                  <li>• Research Analyst</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-sf-text-primary mb-2">Workflow Steps:</h3>
                <ul className="space-y-1 ml-4">
                  <li>• Ideation → Storyboard → Scene Direction</li>
                  <li>• Video Generation → Review → Optimization</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-sf-surface p-6 rounded-lg border border-sf-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">📊 Test Results</h2>
            <span className="text-sm text-sf-text-secondary">
              {testResults.length} results
            </span>
          </div>
          
          <div className="bg-sf-background p-4 rounded border border-sf-border min-h-[400px] max-h-[600px] overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-sf-text-secondary text-center py-8">
                No test results yet. Run a test to see results here.
              </div>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className="text-sm font-mono p-2 rounded bg-sf-surface-light"
                  >
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-sf-surface p-6 rounded-lg border border-sf-border">
          <h2 className="text-2xl font-semibold mb-4">📖 Instructions</h2>
          
          <div className="space-y-4 text-sf-text-secondary">
            <div>
              <h3 className="font-semibold text-sf-text-primary mb-2">How to Test:</h3>
              <ol className="space-y-2 ml-4 list-decimal">
                <li>Click "Run Full Phase 2 Demo" to test all functionality</li>
                <li>Or run individual tests to focus on specific features</li>
                <li>Check the browser console for detailed output</li>
                <li>Review test results in the results panel</li>
                <li>Use "Clear Results" to reset the test output</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold text-sf-text-primary mb-2">Console Output:</h3>
              <p className="ml-4">
                Open your browser's developer console (F12) to see detailed test output, 
                including agent interactions, workflow progress, and performance metrics.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-sf-text-primary mb-2">Expected Results:</h3>
              <ul className="space-y-1 ml-4 list-disc">
                <li>8 AI agents should be initialized with different capabilities</li>
                <li>5 automation rules should be created for workflow management</li>
                <li>4 quality thresholds should be set for different step types</li>
                <li>Workflows should execute with agent coordination</li>
                <li>Performance metrics should be tracked and updated</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
