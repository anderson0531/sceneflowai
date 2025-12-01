'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function FluxTestPage() {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('A cinematic shot of a futuristic city with flying cars, 8k resolution, photorealistic.');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [outputQuality, setOutputQuality] = useState<number>(90);
  const [outputFormat, setOutputFormat] = useState<string>('jpg');
  const [safetyTolerance, setSafetyTolerance] = useState<number>(2);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [promptUpsampling, setPromptUpsampling] = useState<boolean>(true);
  const [imagePromptStrength, setImagePromptStrength] = useState<number>(0.05);
  const [result, setResult] = useState<any>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReferenceImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/test-flux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          aspectRatio, 
          referenceImages, 
          outputQuality,
          outputFormat,
          safetyTolerance,
          seed,
          promptUpsampling,
          imagePromptStrength
        }),
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

          <div>
            <label className="block text-sm font-bold mb-1">Reference Images (Optional, max 3)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={referenceImages.length >= 3}
              className="w-full p-2 border rounded text-sm disabled:opacity-50"
            />
            {referenceImages.length > 0 && (
              <div className="mt-2 space-y-2">
                {referenceImages.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} alt={`Reference ${idx + 1}`} className="w-full rounded border" />
                    <button
                      onClick={() => removeReferenceImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {referenceImages.length > 0 && (
            <div>
              <label className="block text-sm font-bold mb-1">Image Prompt Strength (0.0 - 1.0)</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={imagePromptStrength}
                onChange={(e) => setImagePromptStrength(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-600 text-center font-bold">{imagePromptStrength.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">
                <strong>Style reference only:</strong> 0.01-0.10 (recommended)<br/>
                <strong>Balanced:</strong> 0.20-0.40<br/>
                <strong>Strong influence:</strong> 0.50+
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-1">Output Quality</label>
            <select 
              value={outputQuality}
              onChange={(e) => setOutputQuality(Number(e.target.value))}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="80">Standard (80)</option>
              <option value="90">High (90)</option>
              <option value="95">Very High (95)</option>
              <option value="100">Maximum (100)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Output Format</label>
            <select 
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="jpg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Safety Tolerance (0-6)</label>
            <select 
              value={safetyTolerance}
              onChange={(e) => setSafetyTolerance(Number(e.target.value))}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="0">0 - Most Restrictive</option>
              <option value="1">1 - Very Restrictive</option>
              <option value="2">2 - Moderate (Default)</option>
              <option value="3">3 - Balanced</option>
              <option value="4">4 - Permissive</option>
              <option value="5">5 - Very Permissive</option>
              <option value="6">6 - Least Restrictive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Seed (Optional)</label>
            <input
              type="number"
              value={seed || ''}
              onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Random"
              className="w-full p-2 border rounded text-sm"
            />
            <div className="text-xs text-gray-500 mt-1">Same seed = reproducible results</div>
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={promptUpsampling}
                onChange={(e) => setPromptUpsampling(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-bold">Prompt Upsampling</span>
            </label>
            <div className="text-xs text-gray-500 mt-1">Automatically improve prompt for better results</div>
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
