'use client';

import { useState } from 'react';
import { TaskType, TaskComplexity } from '@/types/dol';

interface DOLTestResult {
  success: boolean;
  result?: {
    model: {
      displayName: string;
      platformId: string;
      isBYOKSupported: boolean;
      features: string[];
    };
    prompt: string;
    parameters: Record<string, any>;
    estimatedCost: number;
    expectedQuality: number;
    reasoning: string;
  };
  error?: string;
  metadata?: {
    modelUsed: string;
    platformUsed: string;
    estimatedCost: number;
    expectedQuality: number;
    reasoning: string;
  };
}

export default function DOLTestPage() {
  const [taskType, setTaskType] = useState<TaskType>(TaskType.SCRIPT_WRITING);
  const [complexity, setComplexity] = useState<TaskComplexity>(TaskComplexity.MEDIUM);
  const [userInput, setUserInput] = useState('');
  const [byokPlatformId, setByokPlatformId] = useState('');
  const [result, setResult] = useState<DOLTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dol/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType,
          complexity,
          userInput: JSON.parse(userInput || '{}'),
          byokPlatformId: byokPlatformId || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('DOL test failed:', error);
      setResult({
        success: false,
        error: 'Test failed - check console for details'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🧠 DOL Test Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Configuration */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Test Configuration</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Task Type</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
              >
                {Object.values(TaskType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Complexity</label>
              <select
                value={complexity}
                onChange={(e) => setComplexity(e.target.value as TaskComplexity)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
              >
                {Object.values(TaskComplexity).map((comp) => (
                  <option key={comp} value={comp}>{comp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">User Input (JSON)</label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder='{"concept": "A cyberpunk story", "genre": "Sci-fi"}'
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg h-32"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">BYOK Platform ID (optional)</label>
              <input
                type="text"
                value={byokPlatformId}
                onChange={(e) => setByokPlatformId(e.target.value)}
                placeholder="runwayml, pika-labs, etc."
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
              />
            </div>

            <button
              onClick={handleTest}
              disabled={loading}
              className="w-full p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium"
            >
              {loading ? 'Testing...' : 'Test DOL Optimization'}
            </button>
          </div>

          {/* Test Results */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Test Results</h2>
            
            {result && (
              <div className="space-y-4">
                {result.success ? (
                  <>
                    <div className="p-4 bg-green-900 border border-green-600 rounded-lg">
                      <h3 className="font-semibold text-green-400">✅ Optimization Successful</h3>
                      <div className="mt-2 space-y-2 text-sm">
                        <p><strong>Model:</strong> {result.metadata?.modelUsed}</p>
                        <p><strong>Platform:</strong> {result.metadata?.platformUsed}</p>
                        <p><strong>Estimated Cost:</strong> ${result.metadata?.estimatedCost.toFixed(6)}</p>
                        <p><strong>Expected Quality:</strong> {result.metadata?.expectedQuality}/100</p>
                      </div>
                    </div>

                    {result.result && (
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                          <h4 className="font-semibold mb-2">Selected Model Details</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Name:</strong> {result.result.model.displayName}</p>
                            <p><strong>Platform:</strong> {result.result.model.platformId}</p>
                            <p><strong>BYOK Supported:</strong> {result.result.model.isBYOKSupported ? 'Yes' : 'No'}</p>
                            <p><strong>Features:</strong> {result.result.model.features.join(', ')}</p>
                          </div>
                        </div>

                        <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                          <h4 className="font-semibold mb-2">Optimized Prompt</h4>
                          <p className="text-sm whitespace-pre-wrap">{result.result.prompt}</p>
                        </div>

                        <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                          <h4 className="font-semibold mb-2">Parameters</h4>
                          <pre className="text-sm overflow-auto">{JSON.stringify(result.result.parameters, null, 2)}</pre>
                        </div>

                        <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                          <h4 className="font-semibold mb-2">Reasoning</h4>
                          <p className="text-sm">{result.result.reasoning}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-red-900 border border-red-600 rounded-lg">
                    <h3 className="font-semibold text-red-400">❌ Optimization Failed</h3>
                    <p className="mt-2">{result.error}</p>
                  </div>
                )}
              </div>
            )}

            {!result && (
              <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg text-center text-gray-400">
                Run a test to see results here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
