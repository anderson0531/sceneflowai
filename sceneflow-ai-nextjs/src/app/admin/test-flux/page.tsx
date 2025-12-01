'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function FluxTestPage() {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('A cinematic shot of a futuristic city with flying cars, 8k resolution, photorealistic.');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [result, setResult] = useState<any>(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/test-flux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio }),
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Flux 1.1 Pro Test</h1>
        <Link href="/admin/test-imagen" className="text-blue-600 hover:underline">
          &larr; Back to Imagen Test
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4 h-fit">
          <div>
            <label className="block text-sm font-bold mb-1">Prompt</label>
            <textarea 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-2 border rounded text-sm h-32"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Aspect Ratio</label>
            <select 
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="21:9">21:9 (Ultrawide)</option>
            </select>
          </div>

          <button 
            onClick={runTest} 
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded font-bold hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Generating with Flux...' : 'Generate Image'}
          </button>

          {result?.error && (
             <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
               <strong>Error:</strong> {result.error}
             </div>
          )}

          {result?.logs && (
            <div className="mt-4 p-4 bg-gray-900 text-green-400 rounded text-xs font-mono overflow-auto max-h-48">
              <div className="font-bold mb-2 text-white">Generation Logs:</div>
              <pre>{result.logs}</pre>
            </div>
          )}
        </div>

        {/* Results Display */}
        <div className="md:col-span-2 space-y-6">
          {result && result.success && (
            <div className="space-y-2">
              <h3 className="font-bold text-center">Generated Image (Flux 1.1 Pro)</h3>
              <div className="relative border-2 border-gray-200 rounded overflow-hidden bg-gray-100 min-h-[300px] flex items-center justify-center">
                <img 
                  src={result.imageUrl} 
                  className="max-w-full max-h-[600px] object-contain shadow-lg" 
                  alt="Generated" 
                />
              </div>
              <div className="text-center text-sm text-gray-500 mt-2">
                <a href={result.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Open Full Size
                </a>
              </div>
            </div>
          )}
          
          {!result && !loading && (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-gray-400">
              Generated image will appear here
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-gray-400">
              <div className="animate-pulse">Generating...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
