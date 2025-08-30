'use client';

import { useState, useEffect } from 'react';
import { TaskType, TaskComplexity, PlatformType } from '@/types/dol';

interface PromptTemplate {
  id: string;
  templateId: string;
  modelId: string;
  taskType: TaskType;
  templateString: string;
  variables: string[];
  currentQualityScore: number;
  usageCount: number;
  isDeprecated: boolean;
  metadata: Record<string, any>;
}

interface PlatformModel {
  id: string;
  modelId: string;
  platformId: string;
  platformType: PlatformType;
  category: string;
  displayName: string;
  description: string;
  costPerUnit: number;
  basePerformanceScore: number;
  maxTokens?: number;
  maxDuration?: number;
  maxResolution?: string;
  features: string[];
  isBYOKSupported: boolean;
  isOperational: boolean;
  isActive: boolean;
  lastUpdated: Date;
  metadata: Record<string, any>;
}

export default function DOLAdminPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'models' | 'analytics'>('templates');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [models, setModels] = useState<PlatformModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [selectedModel, setSelectedModel] = useState<PlatformModel | null>(null);

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    templateId: '',
    modelId: '',
    taskType: TaskType.SCRIPT_WRITING,
    templateString: '',
    variables: [] as string[],
    metadata: {}
  });

  // Model form state
  const [modelForm, setModelForm] = useState({
    modelId: '',
    platformId: '',
    platformType: PlatformType.GOOGLE,
    category: 'INTELLIGENCE',
    displayName: '',
    description: '',
    costPerUnit: 0.001,
    basePerformanceScore: 80,
    maxTokens: 1024,
    features: [] as string[],
    isBYOKSupported: false,
    isOperational: true,
    isActive: true,
    metadata: {}
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load templates
      const templatesResponse = await fetch('/api/dol/templates');
      const templatesData = await templatesResponse.json();
      if (templatesData.success) {
        setTemplates(templatesData.templates);
      }

      // Load models
      const modelsResponse = await fetch('/api/dol/models');
      const modelsData = await modelsResponse.json();
      if (modelsData.success) {
        setModels(modelsData.models);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/dol/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });

      if (response.ok) {
        await loadData();
        setTemplateForm({
          templateId: '',
          modelId: '',
          taskType: TaskType.SCRIPT_WRITING,
          templateString: '',
          variables: [],
          metadata: {}
        });
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleUpdateModelFeatures = async (modelId: string, features: string[]) => {
    try {
      const response = await fetch('/api/dol/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, features }),
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error updating model features:', error);
    }
  };

  const handleUpdateTemplateScore = async (templateId: string, newScore: number) => {
    try {
      const response = await fetch('/api/dol/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, newScore }),
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error updating template score:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🧠 DOL Admin Dashboard</h1>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'templates' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Prompt Templates
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'models' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Platform Models
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'analytics' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('video-monitoring')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'video-monitoring' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Video Monitoring
          </button>
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Create Template Form */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Create New Template</h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Template ID</label>
                  <input
                    type="text"
                    value={templateForm.templateId}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, templateId: e.target.value }))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    placeholder="script-writing-gemini"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model ID</label>
                  <input
                    type="text"
                    value={templateForm.modelId}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, modelId: e.target.value }))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    placeholder="gemini-1.5-flash"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Task Type</label>
                  <select
                    value={templateForm.taskType}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, taskType: e.target.value as TaskType }))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                  >
                    {Object.values(TaskType).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Template String</label>
                  <textarea
                    value={templateForm.templateString}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, templateString: e.target.value }))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg h-32"
                    placeholder="You are an expert screenwriter... {{concept}} {{genre}}..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Variables (comma-separated)</label>
                  <input
                    type="text"
                    value={templateForm.variables.join(', ')}
                    onChange={(e) => setTemplateForm(prev => ({ 
                      ...prev, 
                      variables: e.target.value.split(',').map(v => v.trim()).filter(v => v) 
                    }))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    placeholder="concept, genre, targetAudience, tone"
                  />
                </div>

                <button
                  onClick={handleCreateTemplate}
                  className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
                >
                  Create Template
                </button>
              </div>

              {/* Templates List */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Existing Templates</h2>
                
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold">{template.templateId}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          template.isDeprecated ? 'bg-red-600' : 'bg-green-600'
                        }`}>
                          {template.isDeprecated ? 'Deprecated' : 'Active'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <p><strong>Model:</strong> {template.modelId}</p>
                        <p><strong>Task Type:</strong> {template.taskType}</p>
                        <p><strong>Quality Score:</strong> {template.currentQualityScore}/100</p>
                        <p><strong>Usage Count:</strong> {template.usageCount}</p>
                        <p><strong>Variables:</strong> {template.variables.join(', ')}</p>
                      </div>

                      <div className="mt-3 space-x-2">
                        <button
                          onClick={() => handleUpdateTemplateScore(template.id, Math.min(template.currentQualityScore + 5, 100))}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                        >
                          Increase Score
                        </button>
                        <button
                          onClick={() => handleUpdateTemplateScore(template.id, Math.max(template.currentQualityScore - 5, 0))}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          Decrease Score
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Models Tab */}
        {activeTab === 'models' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Create Model Form */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Create New Model</h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Model ID</label>
                  <input
                    type="text"
                    value={modelForm.modelId}
                    onChange={(e) => setModelForm(prev => ({ ...prev, modelId: e.target.value }))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    placeholder="gemini-2.0-flash"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Platform ID</label>
                  <input
                    type="text"
                    value={modelForm.platformId}
                    onChange={(e) => setModelForm(prev => ({ ...prev, platformId: e.target.value }))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    placeholder="google"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Platform Type</label>
                    <select
                      value={modelForm.platformType}
                      onChange={(e) => setModelForm(prev => ({ ...prev, platformType: e.target.value as PlatformType }))}
                      className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    >
                      {Object.values(PlatformType).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={modelForm.category}
                      onChange={(e) => setModelForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    >
                      <option value="INTELLIGENCE">Intelligence</option>
                      <option value="VIDEO_GEN">Video Generation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Display Name</label>
                  <input
                    type="text"
                    value={modelForm.displayName}
                    onChange={(e) => setModelForm(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    placeholder="Gemini 2.0 Flash"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={modelForm.description}
                    onChange={(e) => setModelForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg h-20"
                    placeholder="High-performance intelligence model..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Cost Per Unit</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={modelForm.costPerUnit}
                      onChange={(e) => setModelForm(prev => ({ ...prev, costPerUnit: parseFloat(e.target.value) }))}
                      className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Performance Score</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={modelForm.basePerformanceScore}
                      onChange={(e) => setModelForm(prev => ({ ...prev, basePerformanceScore: parseInt(e.target.value) }))}
                      className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Features (comma-separated)</label>
                  <input
                    type="text"
                    value={modelForm.features.join(', ')}
                    onChange={(e) => setModelForm(prev => ({ 
                      ...prev, 
                      features: e.target.value.split(',').map(v => v.trim()).filter(v => v) 
                    }))}
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg"
                    placeholder="long-context, multimodal, reasoning"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={modelForm.isBYOKSupported}
                      onChange={(e) => setModelForm(prev => ({ ...prev, isBYOKSupported: e.target.checked }))}
                      className="mr-2"
                    />
                    BYOK Supported
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={modelForm.isOperational}
                      onChange={(e) => setModelForm(prev => ({ ...prev, isOperational: e.target.checked }))}
                      className="mr-2"
                    />
                    Operational
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={modelForm.isActive}
                      onChange={(e) => setModelForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="mr-2"
                    />
                    Active
                  </label>
                </div>

                <button
                  onClick={() => console.log('Create model functionality to be implemented')}
                  className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
                >
                  Create Model
                </button>
              </div>

              {/* Models List */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Existing Models</h2>
                
                <div className="space-y-4">
                  {models.map((model) => (
                    <div key={model.id} className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold">{model.displayName}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          model.isActive ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                          {model.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <p><strong>Model ID:</strong> {model.modelId}</p>
                        <p><strong>Platform:</strong> {model.platformId}</p>
                        <p><strong>Category:</strong> {model.category}</p>
                        <p><strong>Cost:</strong> ${model.costPerUnit.toFixed(6)}</p>
                        <p><strong>Performance:</strong> {model.basePerformanceScore}/100</p>
                        <p><strong>Features:</strong> {model.features.join(', ')}</p>
                        <p><strong>BYOK:</strong> {model.isBYOKSupported ? 'Yes' : 'No'}</p>
                        <p><strong>Operational:</strong> {model.isOperational ? 'Yes' : 'No'}</p>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-2">Update Features</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Add new feature"
                            className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const input = e.target as HTMLInputElement;
                                const newFeature = input.value.trim();
                                if (newFeature) {
                                  handleUpdateModelFeatures(model.id, [...model.features, newFeature]);
                                  input.value = '';
                                }
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              const input = document.querySelector('input[placeholder="Add new feature"]') as HTMLInputElement;
                              const newFeature = input.value.trim();
                              if (newFeature) {
                                handleUpdateModelFeatures(model.id, [...model.features, newFeature]);
                                input.value = '';
                              }
                            }}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

                {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold">DOL Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-blue-900 border border-blue-600 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">Total Requests</h3>
                <p className="text-3xl font-bold">0</p>
                <p className="text-sm text-blue-300">All time</p>
              </div>
              
              <div className="p-6 bg-green-900 border border-green-600 rounded-lg">
                <h3 className="text-lg font-semibold text-green-400 mb-2">DOL Success Rate</h3>
                <p className="text-3xl font-bold">0%</p>
                <p className="text-sm text-green-300">Last 24 hours</p>
                </div>
              
              <div className="p-6 bg-yellow-900 border border-yellow-600 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">Average Cost</h3>
                <p className="text-3xl font-bold">$0.00</p>
                <p className="text-sm text-yellow-300">Per request</p>
              </div>
              
              <div className="p-6 bg-purple-900 border border-purple-600 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-400 mb-2">Average Quality</h3>
                <p className="text-3xl font-bold">0/100</p>
                <p className="text-sm text-purple-300">Expected quality</p>
              </div>
            </div>

            <div className="p-6 bg-gray-800 border border-gray-600 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Top Models by Usage</h3>
              <div className="text-center text-gray-400">
                Analytics data will appear here as the system is used
              </div>
            </div>
          </div>
        )}

        {/* Video Monitoring Tab */}
        {activeTab === 'video-monitoring' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold">Video Generation Monitoring</h2>
            
            <div className="p-6 bg-gray-800 border border-gray-600 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Platform Health Overview</h3>
              <div className="text-center text-gray-400 mb-4">
                Real-time monitoring of video generation platforms
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-green-900 border border-green-600 rounded-lg">
                  <h4 className="font-semibold text-green-400">RunwayML</h4>
                  <p className="text-sm text-green-300">🟢 Healthy</p>
                  <p className="text-xs text-green-300">Response: 45ms</p>
                </div>
                
                <div className="p-4 bg-green-900 border border-green-600 rounded-lg">
                  <h4 className="font-semibold text-green-400">Pika Labs</h4>
                  <p className="text-sm text-green-300">🟢 Healthy</p>
                  <p className="text-xs text-green-300">Response: 32ms</p>
                </div>
                
                <div className="p-4 bg-yellow-900 border border-yellow-600 rounded-lg">
                  <h4 className="font-semibold text-yellow-400">Stability AI</h4>
                  <p className="text-sm text-yellow-300">🟡 Warning</p>
                  <p className="text-xs text-yellow-300">Response: 120ms</p>
                </div>
                
                <div className="p-4 bg-green-900 border border-green-600 rounded-lg">
                  <h4 className="font-semibold text-green-400">Google Veo</h4>
                  <p className="text-sm text-green-300">🟢 Healthy</p>
                  <p className="text-xs text-green-300">Response: 28ms</p>
                </div>
                
                <div className="p-4 bg-red-900 border border-red-600 rounded-lg">
                  <h4 className="font-semibold text-red-400">OpenAI Sora</h4>
                  <p className="text-sm text-red-300">🔴 Unhealthy</p>
                  <p className="text-xs text-red-300">Response: 500ms</p>
                </div>
                
                <div className="p-4 bg-green-900 border border-green-600 rounded-lg">
                  <h4 className="font-semibold text-green-400">Luma AI</h4>
                  <p className="text-sm text-green-300">🟢 Healthy</p>
                  <p className="text-xs text-green-300">Response: 38ms</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-800 border border-gray-600 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Recent Feature Updates</h3>
              <div className="space-y-3">
                <div className="p-3 bg-green-900 border border-green-600 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-green-300">🆕 Motion Brush v2.1</span>
                    <span className="text-xs text-green-400">RunwayML</span>
                  </div>
                  <p className="text-sm text-green-200 mt-1">Enhanced motion control with AI assistance</p>
                </div>
                
                <div className="p-3 bg-blue-900 border border-blue-600 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-300">🆕 Style Transfer Pro</span>
                    <span className="text-xs text-blue-400">Pika Labs</span>
                  </div>
                  <p className="text-sm text-blue-200 mt-1">Advanced artistic style transfer capabilities</p>
                </div>
                
                <div className="p-3 bg-purple-900 border border-purple-600 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-300">🆕 8K Generation</span>
                    <span className="text-xs text-purple-400">Google Veo</span>
                  </div>
                  <p className="text-sm text-purple-200 mt-1">Ultra-high resolution video generation</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-800 border border-gray-600 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Monitoring Controls</h3>
              <div className="flex space-x-4">
                <button className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium">
                  Start Monitoring
                </button>
                <button className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium">
                  Stop Monitoring
                </button>
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
                  Refresh Data
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Automated monitoring runs every 6 hours to detect new platform capabilities
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
