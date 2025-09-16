'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function Phase3TestPage() {
  const [results, setResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const add = (msg: string) => setResults(r => [...r, `${new Date().toLocaleTimeString()}: ${msg}`]);
  const clear = () => setResults([]);

  const runDemo = async () => {
    setIsRunning(true);
    add('🚀 Starting Phase 3 Demo...');
    try {
      const { runPhase3Demo } = await import('@/examples/Phase3Demo');
      const ok = await runPhase3Demo();
      add(ok ? '✅ Phase 3 Demo completed' : '❌ Phase 3 Demo failed');
    } catch (e) {
      add(`❌ Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-sf-background text-sf-text-primary p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">🚀 SceneFlow AI - Phase 3 Test</h1>
          <p className="text-sf-text-secondary">Validate enhanced workflow steps with review and optimization</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-sf-surface p-6 rounded-lg border border-sf-border">
            <h2 className="text-2xl font-semibold mb-4">🧪 Controls</h2>
            <div className="space-y-3">
              <Button onClick={runDemo} disabled={isRunning} className="w-full" variant="primary">
                {isRunning ? 'Running...' : '🚀 Run Phase 3 Demo'}
              </Button>
              <Button onClick={clear} className="w-full" variant="secondary">🗑️ Clear Results</Button>
            </div>
          </div>

          <div className="bg-sf-surface p-6 rounded-lg border border-sf-border">
            <h2 className="text-2xl font-semibold mb-4">📋 Info</h2>
            <ul className="text-sm text-sf-text-secondary space-y-1">
              <li>• Steps: Ideation → Storyboard → Scene Direction → Video → Review → Optimization</li>
              <li>• Uses automation rules and quality thresholds</li>
            </ul>
          </div>
        </div>

        <div className="bg-sf-surface p-6 rounded-lg border border-sf-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">📊 Results</h2>
            <span className="text-sm text-sf-text-secondary">{results.length} results</span>
          </div>
          <div className="bg-sf-background p-4 rounded border border-sf-border min-h-[300px] max-h-[600px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-sf-text-secondary text-center py-8">No results yet.</div>
            ) : (
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="text-sm font-mono p-2 rounded bg-sf-surface-light">{r}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}















