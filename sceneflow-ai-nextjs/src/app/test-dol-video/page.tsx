'use client';

import { useState } from 'react';

interface VideoGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio: string;
  motion_intensity: number;
  duration: number;
  resolution: string;
  style: string;
  quality: string;
  fps: number;
  custom_settings: Record<string, any>;
  userId: string;
  qualityRequirement?: 'low' | 'medium' | 'high';
  budget?: number;
  byokPlatformId?: string;
}

interface CostEstimate {
  estimatedCost: number;
  model: string;
  platform: string;
  reasoning: string;
}

interface VideoGenerationResult {
  status: string;
  video_url?: string;
  provider_job_id?: string;
  error_message?: string;
  progress?: number;
  estimated_time_remaining?: number;
  dolMetadata: {
    modelUsed: string;
    platformUsed: string;
    estimatedCost: number;
    expectedQuality: number;
    reasoning: string;
    optimizationApplied: boolean;
  };
}

export default function DOLVideoTestPage() {
  const [request, setRequest] = useState<VideoGenerationRequest>({
    prompt: 'A futuristic cityscape at sunset with flying cars and neon lights',
    negative_prompt: 'blurry, low resolution, artifacts',
    aspect_ratio: '16:9',
    motion_intensity: 5,
    duration: 6,
    resolution: '1920x1080',
    style: 'cinematic',
    quality: 'standard',
    fps: 24,
    custom_settings: {},
    userId: 'test-user-123'
  });

  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [generationResult, setGenerationResult] = useState<VideoGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'cost-estimate'>('generate');

  const handleInputChange = (field: keyof VideoGenerationRequest, value: any) => {
    setRequest(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomSettingChange = (key: string, value: any) => {
    setRequest(prev => ({
      ...prev,
      custom_settings: { ...prev.custom_settings, [key]: value }
    }));
  };

  const getCostEstimate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dol/video/cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      if (data.success) {
        setCostEstimate(data.estimate);
      } else {
        console.error('Cost estimation failed:', data.error);
      }
    } catch (error) {
      console.error('Cost estimation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dol/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      if (data.success) {
        setGenerationResult(data.result);
      } else {
        console.error('Video generation failed:', data.error);
      }
    } catch (error) {
      console.error('Video generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🎬 DOL Video Generation Test</h1>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'generate' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Generate Video
          </button>
          <button
            onClick={() => setActiveTab('cost-estimate')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'cost-estimate' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Cost Estimate
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Video Configuration</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Prompt</label>
              <textarea
                value={request.prompt}
                onChange={(e) => handleInputChange('prompt', e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg h-24"
                placeholder="Describe your video..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Negative Prompt</label>
              <input
                type="text"
                value={request.negative_prompt}
                onChange={(e) => handleInputChange('negative_prompt', e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                placeholder="What to avoid..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                <select
                  value={request.aspect_ratio}
                  onChange={(e) => handleInputChange('aspect_ratio', e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                >
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:3">4:3 (Classic)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
                <input
                  type="number"
                  value={request.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  min="1"
                  max="16"
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Motion Intensity</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={request.motion_intensity}
                  onChange={(e) => handleInputChange('motion_intensity', parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm text-gray-400">{request.motion_intensity}/10</span>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">FPS</label>
                <select
                  value={request.fps}
                  onChange={(e) => handleInputChange('fps', parseInt(e.target.value))}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                >
                  <option value="24">24 fps</option>
                  <option value="30">30 fps</option>
                  <option value="60">60 fps</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Style</label>
                <select
                  value={request.style}
                  onChange={(e) => handleInputChange('style', e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="realistic">Realistic</option>
                  <option value="artistic">Artistic</option>
                  <option value="cartoon">Cartoon</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quality</label>
                <select
                  value={request.quality}
                  onChange={(e) => handleInputChange('quality', e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Resolution</label>
              <select
                value={request.resolution}
                onChange={(e) => handleInputChange('resolution', e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
              >
                <option value="1024x1024">1024x1024</option>
                <option value="1920x1080">1920x1080 (Full HD)</option>
                <option value="2560x1440">2560x1440 (2K)</option>
                <option value="3840x2160">3840x2160 (4K)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quality Requirement</label>
              <select
                value={request.qualityRequirement || 'medium'}
                onChange={(e) => handleInputChange('qualityRequirement', e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
              >
                <option value="low">Low (Cost-optimized)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Quality-optimized)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Budget (optional)</label>
              <input
                type="number"
                step="0.01"
                value={request.budget || ''}
                onChange={(e) => handleInputChange('budget', e.target.value ? parseFloat(e.target.value) : '')}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                placeholder="0.10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">BYOK Platform ID (optional)</label>
              <input
                type="text"
                value={request.byokPlatformId || ''}
                onChange={(e) => handleInputChange('byokPlatformId', e.target.value || undefined)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                placeholder="runwayml, pika-labs, etc."
              />
            </div>

            {/* Custom Settings */}
            <div>
              <label className="block text-sm font-medium mb-2">Custom Settings</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={request.custom_settings.imageInput || false}
                    onChange={(e) => handleCustomSettingChange('imageInput', e.target.checked)}
                    className="mr-2"
                  />
                  Image Input (Image-to-Video)
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={request.custom_settings.videoInput || false}
                    onChange={(e) => handleCustomSettingChange('videoInput', e.target.checked)}
                    className="mr-2"
                  />
                  Video Input (Video-to-Video)
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={request.custom_settings.styleTransfer || false}
                    onChange={(e) => handleCustomSettingChange('styleTransfer', e.target.checked)}
                    className="mr-2"
                  />
                  Style Transfer
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={request.custom_settings.motionControl || false}
                    onChange={(e) => handleCustomSettingChange('motionControl', e.target.checked)}
                    className="mr-2"
                  />
                  Motion Control
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {activeTab === 'cost-estimate' ? (
                <button
                  onClick={getCostEstimate}
                  disabled={loading}
                  className="w-full p-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium"
                >
                  {loading ? 'Calculating...' : 'Get Cost Estimate'}
                </button>
              ) : (
                <button
                  onClick={generateVideo}
                  disabled={loading}
                  className="w-full p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium"
                >
                  {loading ? 'Generating...' : 'Generate Video with DOL'}
                </button>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Results</h2>
            
            {/* Cost Estimate Results */}
            {activeTab === 'cost-estimate' && costEstimate && (
              <div className="p-6 bg-green-900 border border-green-600 rounded-lg">
                <h3 className="text-xl font-semibold text-green-400 mb-4">💰 Cost Estimate</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Estimated Cost:</span>
                    <span className="font-semibold">${costEstimate.estimatedCost.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Recommended Model:</span>
                    <span className="font-semibold">{costEstimate.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Platform:</span>
                    <span className="font-semibold">{costEstimate.platform}</span>
                  </div>
                  <div className="mt-4 p-3 bg-gray-800 rounded">
                    <span className="text-sm text-gray-300">Reasoning:</span>
                    <p className="text-sm mt-1">{costEstimate.reasoning}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Video Generation Results */}
            {activeTab === 'generate' && generationResult && (
              <div className="space-y-4">
                <div className={`p-4 border rounded-lg ${
                  generationResult.status === 'COMPLETED' ? 'bg-green-900 border-green-600' :
                  generationResult.status === 'FAILED' ? 'bg-red-900 border-red-600' :
                  'bg-blue-900 border-blue-600'
                }`}>
                  <h3 className="font-semibold mb-2">Video Generation Status</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Status:</strong> {generationResult.status}</p>
                    {generationResult.progress && (
                      <p><strong>Progress:</strong> {generationResult.progress}%</p>
                    )}
                    {generationResult.provider_job_id && (
                      <p><strong>Job ID:</strong> {generationResult.provider_job_id}</p>
                    )}
                    {generationResult.error_message && (
                      <p className="text-red-400"><strong>Error:</strong> {generationResult.error_message}</p>
                    )}
                  </div>
                </div>

                {/* DOL Metadata */}
                <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                  <h4 className="font-semibold mb-3">🧠 DOL Optimization Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Model Used:</span>
                      <span>{generationResult.dolMetadata.modelUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Platform:</span>
                      <span>{generationResult.dolMetadata.platformUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Estimated Cost:</span>
                      <span>${generationResult.dolMetadata.estimatedCost.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Expected Quality:</span>
                      <span>{generationResult.dolMetadata.expectedQuality}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Optimization Applied:</span>
                      <span className={generationResult.dolMetadata.optimizationApplied ? 'text-green-400' : 'text-yellow-400'}>
                        {generationResult.dolMetadata.optimizationApplied ? 'Yes' : 'No (Fallback)'}
                      </span>
                    </div>
                    <div className="mt-3 p-3 bg-gray-700 rounded">
                      <span className="text-sm text-gray-300">Reasoning:</span>
                      <p className="text-sm mt-1">{generationResult.dolMetadata.reasoning}</p>
                    </div>
                  </div>
                </div>

                {/* Video URL if completed */}
                {generationResult.video_url && (
                  <div className="p-4 bg-green-900 border border-green-600 rounded-lg">
                    <h4 className="text-xl font-semibold text-green-400 mb-2">✅ Video Generated Successfully!</h4>
                    <a
                      href={generationResult.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      View Video
                    </a>
                  </div>
                )}
              </div>
            )}

            {!costEstimate && !generationResult && (
              <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg text-center text-gray-400">
                {activeTab === 'cost-estimate' 
                  ? 'Get a cost estimate to see results here'
                  : 'Generate a video to see results here'
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
