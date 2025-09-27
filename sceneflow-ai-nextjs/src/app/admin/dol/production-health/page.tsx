'use client';
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';

interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    database: HealthComponent;
    api: HealthComponent;
    monitoring: HealthComponent;
    optimization: HealthComponent;
    featureDetection: HealthComponent;
  };
  metrics: {
    uptime: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    costEfficiency: number;
  };
  alerts: HealthAlert[];
  lastUpdated: Date;
}

interface HealthComponent {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastCheck: Date;
  responseTime: number;
}

interface HealthAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export default function ProductionHealthPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadHealthStatus();
    
    if (autoRefresh) {
      const interval = setInterval(loadHealthStatus, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadHealthStatus = async () => {
    try {
      const response = await fetch('/api/dol/production-health/status');
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data.healthStatus);
        setSystemStatus(data.systemStatus);
      }
    } catch (error) {
      console.error('Error loading health status:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch('/api/dol/production-health/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });
      await loadHealthStatus(); // Refresh data
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '��';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-900 border-red-600';
      case 'warning': return 'bg-yellow-900 border-yellow-600';
      case 'info': return 'bg-blue-900 border-blue-600';
      default: return 'bg-gray-900 border-gray-600';
    }
  };

  const formatUptime = (uptimeMs: number) => {
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-xl">Loading production health status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🏥 DOL Production Health Monitor</h1>
        
        {/* System Status Overview */}
        {systemStatus && (
          <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">System Status</h2>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="mr-2"
                  />
                  Auto-refresh (30s)
                </label>
                <button
                  onClick={loadHealthStatus}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Refresh Now
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{systemStatus.status}</p>
                <p className="text-sm text-gray-300">Status</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{systemStatus.uptime}</p>
                <p className="text-sm text-gray-300">Uptime</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-400">{systemStatus.components}</p>
                <p className="text-sm text-gray-300">Components</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{systemStatus.alerts}</p>
                <p className="text-sm text-gray-300">Active Alerts</p>
              </div>
            </div>
          </div>
        )}

        {/* Overall Health Status */}
        {healthStatus && (
          <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Overall Health Status</h2>
            <div className="flex items-center space-x-4 mb-6">
              <span className={`text-6xl ${getStatusIcon(healthStatus.overall)}`}></span>
              <div>
                <h3 className={`text-3xl font-bold ${getStatusColor(healthStatus.overall)}`}>
                  {healthStatus.overall.toUpperCase()}
                </h3>
                <p className="text-gray-300">
                  Last updated: {new Date(healthStatus.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
            
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-blue-900 border border-blue-600 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-400">{formatUptime(healthStatus.metrics.uptime)}</p>
                <p className="text-sm text-blue-300">Uptime</p>
              </div>
              
              <div className="p-4 bg-green-900 border border-green-600 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{healthStatus.metrics.totalRequests.toLocaleString()}</p>
                <p className="text-sm text-green-300">Total Requests</p>
              </div>
              
              <div className="p-4 bg-red-900 border border-red-600 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-400">{(healthStatus.metrics.errorRate * 100).toFixed(2)}%</p>
                <p className="text-sm text-red-300">Error Rate</p>
              </div>
              
              <div className="p-4 bg-yellow-900 border border-yellow-600 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-400">{healthStatus.metrics.averageResponseTime}ms</p>
                <p className="text-sm text-yellow-300">Avg Response</p>
              </div>
              
              <div className="p-4 bg-purple-900 border border-purple-600 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-400">{healthStatus.metrics.costEfficiency.toFixed(1)}%</p>
                <p className="text-sm text-purple-300">Cost Efficiency</p>
              </div>
            </div>
          </div>
        )}

        {/* Component Health */}
        {healthStatus && (
          <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Component Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(healthStatus.components).map(([name, component]) => (
                <div key={name} className="p-4 bg-gray-700 border border-gray-600 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</h3>
                    <span className={`text-2xl ${getStatusIcon(component.status)}`}></span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className={getStatusColor(component.status)}>{component.message}</p>
                    <p className="text-gray-300">
                      Last check: {new Date(component.lastCheck).toLocaleTimeString()}
                    </p>
                    <p className="text-gray-300">
                      Response: {component.responseTime}ms
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Alerts */}
        {healthStatus && healthStatus.alerts.length > 0 && (
          <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Active Alerts</h2>
            <div className="space-y-4">
              {healthStatus.alerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.level)}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-semibold capitalize">{alert.component}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          alert.level === 'critical' ? 'bg-red-700 text-white' :
                          alert.level === 'warning' ? 'bg-yellow-700 text-white' :
                          'bg-blue-700 text-white'
                        }`}>
                          {alert.level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-200">{alert.message}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Alerts Message */}
        {healthStatus && healthStatus.alerts.length === 0 && (
          <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Active Alerts</h2>
            <div className="text-center text-gray-400 py-8">
              <p className="text-xl">🎉 No active alerts!</p>
              <p className="text-sm mt-2">All systems are operating normally</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-6 bg-gray-800 border border-gray-600 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="flex space-x-4">
            <button className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium">
              Run Full Health Check
            </button>
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
              Generate Health Report
            </button>
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium">
              Send Status Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
