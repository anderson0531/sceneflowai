'use client';

import { useState, useEffect } from 'react';
import { PlatformType } from '@/types/dol';

interface PlatformCapability {
  platformId: string;
  modelId: string;
  feature: string;
  status: 'available' | 'unavailable' | 'deprecated';
  confidence: number;
  lastChecked: Date;
  metadata: Record<string, any>;
}

interface PlatformHealth {
  platformId: string;
  isHealthy: boolean;
  responseTime: number;
  lastCheck: Date;
  errorCount: number;
  features: PlatformCapability[];
}

interface FeatureUpdate {
  id: string;
  platformId: string;
  modelId: string;
  feature: string;
  status: 'added' | 'removed' | 'updated';
  description: string;
  source: 'automated' | 'manual' | 'community';
  confidence: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export default function VideoMonitoringPage() {
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth[]>([]);
  const [featureUpdates, setFeatureUpdates] = useState<FeatureUpdate[]>([]);
  const [metrics, setMetrics] = useState({
    totalPlatforms: 0,
    healthyPlatforms: 0,
    averageResponseTime: 0,
    totalFeatures: 0
  });
  const [loading, setLoading] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);

  useEffect(() => {
    loadMonitoringData();
  }, []);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      // Load platform health data
      const healthResponse = await fetch('/api/dol/monitoring/platform-health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setPlatformHealth(healthData.platforms || []);
      }

      // Load feature updates
      const updatesResponse = await fetch('/api/dol/monitoring/feature-updates');
      if (updatesResponse.ok) {
        const updatesData = await updatesResponse.json();
        setFeatureUpdates(updatesData.updates || []);
      }

      // Load metrics
      const metricsResponse = await fetch('/api/dol/monitoring/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.metrics || {});
      }
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startMonitoring = async () => {
    try {
      const response = await fetch('/api/dol/monitoring/start', { method: 'POST' });
      if (response.ok) {
        setMonitoringActive(true);
        console.log('Automated monitoring started');
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  };

  const stopMonitoring = async () => {
    try {
      const response = await fetch('/api/dol/monitoring/stop', { method: 'POST' });
      if (response.ok) {
        setMonitoringActive(false);
        console.log('Automated monitoring stopped');
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    }
  };

  const refreshData = async () => {
    await loadMonitoringData();
  };

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-500' : 'text-red-500';
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? '🟢' : '🔴';
  };

  const getFeatureStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-500';
      case 'unavailable': return 'text-red-500';
      case 'deprecated': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🎬 DOL Video Generation Monitoring</h1>
        
        {/* Control Panel */}
        <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Monitoring Control Panel</h2>
          <div className="flex space-x-4">
            <button
              onClick={startMonitoring}
              disabled={monitoringActive}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium"
            >
              Start Automated Monitoring
            </button>
            <button
              onClick={stopMonitoring}
              disabled={!monitoringActive}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-medium"
            >
              Stop Monitoring
            </button>
            <button
              onClick={refreshData}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              Refresh Data
            </button>
          </div>
          <div className="mt-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              monitoringActive ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'
            }`}>
              {monitoringActive ? '🟢 Active' : '🔴 Inactive'}
            </span>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-6 bg-blue-900 border border-blue-600 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Total Platforms</h3>
            <p className="text-3xl font-bold">{metrics.totalPlatforms}</p>
            <p className="text-sm text-blue-300">Monitored</p>
          </div>
          
          <div className="p-6 bg-green-900 border border-green-600 rounded-lg">
            <h3 className="text-lg font-semibold text-green-400 mb-2">Healthy Platforms</h3>
            <p className="text-3xl font-bold">{metrics.healthyPlatforms}</p>
            <p className="text-sm text-green-300">Operational</p>
          </div>
          
          <div className="p-6 bg-yellow-900 border border-yellow-600 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Avg Response Time</h3>
            <p className="text-3xl font-bold">{metrics.averageResponseTime.toFixed(0)}ms</p>
            <p className="text-sm text-yellow-300">Performance</p>
          </div>
          
          <div className="p-6 bg-purple-900 border border-purple-600 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Total Features</h3>
            <p className="text-3xl font-bold">{metrics.totalFeatures}</p>
            <p className="text-sm text-purple-300">Available</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Platform Health */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Platform Health Status</h2>
            
            <div className="space-y-4">
              {platformHealth.map((platform) => (
                <div key={platform.platformId} className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold capitalize">{platform.platformId.replace('-', ' ')}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      platform.isHealthy ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {getStatusIcon(platform.isHealthy)} {platform.isHealthy ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Response Time:</span>
                      <span className={getStatusColor(platform.isHealthy)}>
                        {platform.responseTime}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Last Check:</span>
                      <span>{new Date(platform.lastCheck).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold">Error Count:</span>
                      <span className={platform.errorCount > 0 ? 'text-red-400' : 'text-green-400'}>
                        {platform.errorCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Features:</span>
                      <span>{platform.features.length}</span>
                    </div>
                  </div>

                  {/* Platform Features */}
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Available Features:</h4>
                    <div className="flex flex-wrap gap-2">
                      {platform.features.map((feature, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-xs ${getFeatureStatusColor(feature.status)}`}
                        >
                          {feature.feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Updates */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Recent Feature Updates</h2>
            
            <div className="space-y-4">
              {featureUpdates.length > 0 ? (
                featureUpdates.map((update) => (
                  <div key={update.id} className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold">{update.feature}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        update.status === 'added' ? 'bg-green-900 text-green-300' :
                        update.status === 'removed' ? 'bg-red-900 text-red-300' :
                        'bg-yellow-900 text-yellow-300'
                      }`}>
                        {update.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <p><strong>Platform:</strong> {update.platformId}</p>
                      <p><strong>Model:</strong> {update.modelId}</p>
                      <p><strong>Description:</strong> {update.description}</p>
                      <p><strong>Source:</strong> {update.source}</p>
                      <p><strong>Confidence:</strong> {update.confidence}%</p>
                      <p><strong>Detected:</strong> {new Date(update.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg text-center text-gray-400">
                  No feature updates detected yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monitoring Log */}
        <div className="mt-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Monitoring Log</h2>
          <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm">
            <div className="text-green-400">✅ Monitoring system initialized</div>
            <div className="text-blue-400">🔍 Checking platform health...</div>
            <div className="text-green-400">✅ Platform health check completed</div>
            <div className="text-blue-400">🔍 Scanning for new features...</div>
            <div className="text-green-400">✅ Feature scan completed</div>
            <div className="text-gray-500">Last updated: {new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
