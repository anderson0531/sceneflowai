'use client';

import { useState } from 'react';

export default function ImagenTestPage() {
  const [loading, setLoading] = useState(false);
  const [gcsUri, setGcsUri] = useState('gs://sceneflow-character-refs/characters/ben-anderson-1764493473538.jpg');
  const [prompt, setPrompt] = useState('A professional studio portrait of [1], 8k resolution, sharp focus.');
  const [subjectDescription, setSubjectDescription] = useState('person [1]');
  const [result, setResult] = useState<any>(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/test-imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gcsUri, prompt, subjectDescription }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert('Test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen text-black">
      <h1 className="text-3xl font-bold mb-6">Imagen 3.0 Reference Image Debugger</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4 h-fit">
          <div>
            <label className="block text-sm font-bold mb-1">GCS URI (Reference)</label>
            <input 
              type="text" 
              value={gcsUri} 
              onChange={(e) => setGcsUri(e.target.value)}
              className="w-full p-2 border rounded text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Prompt</label>
            <textarea 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-2 border rounded text-sm h-24"
            />
            <p className="text-xs text-gray-500 mt-1">Use [1] to refer to the image.</p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Subject Description</label>
            <input 
              type="text" 
              value={subjectDescription} 
              onChange={(e) => setSubjectDescription(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">The anchor text linking image to prompt.</p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={runTest} 
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Run Test'}
            </button>
            
            <button 
              onClick={() => {
                setPrompt('A professional studio portrait of [1], 8k resolution, sharp focus.');
                setSubjectDescription('person [1]');
              }}
              className="px-3 py-3 bg-gray-200 text-gray-700 rounded font-bold hover:bg-gray-300"
              title="Reset to Force Reference defaults"
            >
              Reset
            </button>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <h4 className="font-bold text-yellow-800 mb-1">API Reference Guide</h4>
            <ul className="list-disc pl-4 space-y-1 text-yellow-700">
              <li><strong>Force Reference:</strong> Ensure <code>[1]</code> appears in BOTH Prompt and Subject Description.</li>
              <li><strong>Prompt:</strong> "A photo of [1]..."</li>
              <li><strong>Subject Desc:</strong> "person [1]"</li>
              <li><strong>Model:</strong> imagen-3.0-capability-001</li>
            </ul>
          </div>

          {result?.logs && (
            <div className="mt-4 p-2 bg-gray-900 text-green-400 text-xs font-mono rounded h-48 overflow-y-auto">
              {result.logs.map((l: string, i: number) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>

        {/* Results Display */}
        <div className="md:col-span-2 space-y-6">
          {result && result.success && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-bold text-center">Reference (Input)</h3>
                <div className="aspect-square relative border-2 border-blue-200 rounded overflow-hidden bg-gray-200">
                  <img 
                    src={`data:image/jpeg;base64,${result.referenceBase64}`} 
                    className="object-contain w-full h-full" 
                    alt="Reference" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-bold text-center">Generated (Output)</h3>
                <div className="aspect-square relative border-2 border-green-200 rounded overflow-hidden bg-gray-200">
                  <img 
                    src={`data:image/png;base64,${result.generatedBase64}`} 
                    className="object-contain w-full h-full" 
                    alt="Generated" 
                  />
                </div>
              </div>
            </div>
          )}
          
          {!result && !loading && (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded border-dashed border-2 border-gray-300 text-gray-400">
              Run a test to see results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
