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

  // Video generation state
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState('A cinematic panning shot across a futuristic cityscape at sunset, flying cars gliding between skyscrapers');
  const [videoSourceImage, setVideoSourceImage] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [videoResult, setVideoResult] = useState<any>(null);

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

  const handleVideoSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoSourceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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

  const runVideoTest = async () => {
    setVideoLoading(true);
    setVideoResult(null);
    try {
      const res = await fetch('/api/admin/test-flux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: 'video',
          prompt: videoPrompt,
          sourceImage: videoSourceImage || result?.imageUrl,
          duration: videoDuration
        }),
      });
      const data = await res.json();
      setVideoResult(data);
    } catch (err) {
      console.error(err);
      alert('Video test failed');
    } finally {
      setVideoLoading(false);
    }
  };

  const useGeneratedImageForVideo = () => {
    if (result?.imageUrl) {
      setVideoSourceImage(result.imageUrl);
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

      {/* Pro Tips Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-bold text-blue-900 mb-2">💡 Pro Tips for Better Results</h2>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Quality:</strong> Use 95-100 for production, 80-90 for testing</li>
          <li><strong>Format:</strong> PNG for transparency, WebP for best compression, JPEG for compatibility</li>
          <li><strong>Reference Images:</strong> Keep strength at 0.01-0.10 for style guidance without overriding prompt</li>
          <li><strong>Prompt Upsampling:</strong> Keep enabled for better prompt interpretation</li>
          <li><strong>Seed:</strong> Use same seed to reproduce exact results or leave blank for variety</li>
          <li><strong>Safety:</strong> If content is blocked, increase tolerance to 3-4</li>
        </ul>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4 h-fit">
          <div>
            <label className="block text-sm font-bold mb-1">
              Prompt
              <span className="ml-2 text-xs font-normal text-gray-500">(Be specific and detailed)</span>
            </label>
            <textarea 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-2 border rounded text-sm h-32 text-gray-900 bg-white"
              placeholder="Example: A cinematic wide shot of a futuristic city at sunset, flying cars, neon lights, 8k, photorealistic"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Aspect Ratio
              <span className="ml-2 text-xs font-normal text-gray-500">(Choose based on use case)</span>
            </label>
            <select 
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full p-2 border rounded text-sm text-gray-900 bg-white"
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="21:9">21:9 (Ultrawide)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Reference Images
              <span className="ml-2 text-xs font-normal text-gray-500">(Optional, max 3)</span>
            </label>
            <div className="text-xs text-blue-600 mb-2">
              💡 For style only: Keep strength low (0.01-0.10)
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={referenceImages.length >= 3}
              className="w-full p-2 border rounded text-sm disabled:opacity-50 text-gray-900 bg-white"
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
            <label className="block text-sm font-bold mb-1">
              Output Quality
              <span className="ml-2 text-xs font-normal text-gray-500">(Higher = better but slower)</span>
            </label>
            <select 
              value={outputQuality}
              onChange={(e) => setOutputQuality(Number(e.target.value))}
              className="w-full p-2 border rounded text-sm text-gray-900 bg-white"
            >
              <option value="80">Standard (80) - Fast</option>
              <option value="90">High (90) - Recommended</option>
              <option value="95">Very High (95) - Production</option>
              <option value="100">Maximum (100) - Best Quality</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Output Format
              <span className="ml-2 text-xs font-normal text-gray-500">(File type)</span>
            </label>
            <select 
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full p-2 border rounded text-sm text-gray-900 bg-white"
            >
              <option value="jpg">JPEG - Smallest size</option>
              <option value="png">PNG - Best quality</option>
              <option value="webp">WebP - Balanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Safety Tolerance
              <span className="ml-2 text-xs font-normal text-gray-500">(0-6, increase if blocked)</span>
            </label>
            <select 
              value={safetyTolerance}
              onChange={(e) => setSafetyTolerance(Number(e.target.value))}
              className="w-full p-2 border rounded text-sm text-gray-900 bg-white"
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
            <label className="block text-sm font-bold mb-1">
              Seed
              <span className="ml-2 text-xs font-normal text-gray-500">(Optional, for reproducibility)</span>
            </label>
            <input
              type="number"
              value={seed || ''}
              onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Random (leave blank for variety)"
              className="w-full p-2 border rounded text-sm text-gray-900 bg-white"
            />
            <div className="text-xs text-blue-600 mt-1">
              💡 Use same seed to get identical results
            </div>
          </div>

          <div className="bg-green-50 p-3 rounded border border-green-200">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={promptUpsampling}
                onChange={(e) => setPromptUpsampling(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-bold text-green-900">Prompt Upsampling</span>
            </label>
            <div className="text-xs text-green-700 mt-1">
              ✨ Recommended: Automatically enhances your prompt for better results
            </div>
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

      {/* Video Generation Section */}
      <div className="mt-12 border-t-4 border-indigo-500 pt-8">
        <h2 className="text-2xl font-bold mb-4 text-indigo-900">🎬 Video Generation Test</h2>
        
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-bold text-indigo-900 mb-2">💡 Video Generation Tips</h3>
          <ul className="text-sm text-indigo-800 space-y-1">
            <li><strong>Image-to-Video:</strong> Use a generated or uploaded image as the starting frame</li>
            <li><strong>Duration:</strong> 5 seconds is standard, longer videos take more time</li>
            <li><strong>Prompt:</strong> Describe camera movement and action (pan, zoom, walk forward)</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Video Controls */}
          <div className="bg-white p-6 rounded-lg shadow-md space-y-4 h-fit">
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">
                Video Prompt
                <span className="ml-2 text-xs font-normal text-gray-500">(Describe motion/action)</span>
              </label>
              <textarea 
                value={videoPrompt} 
                onChange={(e) => setVideoPrompt(e.target.value)}
                className="w-full p-2 border rounded text-sm h-24 text-gray-900 bg-white"
                placeholder="Example: Camera slowly pans across the scene, clouds drifting in the background"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">
                Source Image
                <span className="ml-2 text-xs font-normal text-gray-500">(Starting frame)</span>
              </label>
              
              {result?.imageUrl && (
                <button
                  onClick={useGeneratedImageForVideo}
                  className="w-full mb-2 bg-indigo-100 text-indigo-700 py-2 rounded text-sm hover:bg-indigo-200 border border-indigo-300"
                >
                  ✨ Use Generated Image Above
                </button>
              )}
              
              <input
                type="file"
                accept="image/*"
                onChange={handleVideoSourceUpload}
                className="w-full p-2 border rounded text-sm text-gray-900 bg-white"
              />
              
              {videoSourceImage && (
                <div className="mt-2 relative">
                  <img src={videoSourceImage} alt="Video source" className="w-full rounded border" />
                  <button
                    onClick={() => setVideoSourceImage('')}
                    className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-gray-900">
                Duration (seconds)
              </label>
              <select 
                value={videoDuration}
                onChange={(e) => setVideoDuration(Number(e.target.value))}
                className="w-full p-2 border rounded text-sm text-gray-900 bg-white"
              >
                <option value="3">3 seconds - Fast</option>
                <option value="5">5 seconds - Standard</option>
                <option value="10">10 seconds - Extended</option>
              </select>
            </div>

            <button 
              onClick={runVideoTest} 
              disabled={videoLoading || (!videoSourceImage && !result?.imageUrl)}
              className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {videoLoading ? 'Generating Video...' : '🎬 Generate Video'}
            </button>

            {!videoSourceImage && !result?.imageUrl && (
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Generate an image first or upload a source image
              </div>
            )}

            {videoResult?.error && (
              <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                <strong>Error:</strong> {videoResult.error}
              </div>
            )}

            {videoResult?.logs && (
              <div className="mt-4 p-4 bg-gray-900 text-green-400 rounded text-xs font-mono overflow-auto max-h-48">
                <div className="font-bold mb-2 text-white">Video Generation Logs:</div>
                <pre>{videoResult.logs}</pre>
              </div>
            )}
          </div>

          {/* Video Results */}
          <div className="md:col-span-2 space-y-6">
            {videoResult && videoResult.success && (
              <div className="space-y-2">
                <h3 className="font-bold text-center text-gray-900">Generated Video</h3>
                <div className="relative border-2 border-gray-200 rounded overflow-hidden bg-gray-100 min-h-[300px] flex items-center justify-center">
                  <video 
                    src={videoResult.videoUrl} 
                    controls
                    autoPlay
                    loop
                    className="max-w-full max-h-[600px] shadow-lg" 
                  />
                </div>
                <div className="text-center text-sm text-gray-500 mt-2">
                  <a href={videoResult.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Download Video
                  </a>
                </div>
              </div>
            )}
            
            {!videoResult && !videoLoading && (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-gray-500">
                Generated video will appear here
              </div>
            )}

            {videoLoading && (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-gray-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <div>Generating video... This may take 1-3 minutes</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
