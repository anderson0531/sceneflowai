'use client';

import { useState, useEffect } from 'react';

interface DOLAnalytics {
  totalRequests: number;
  dolSuccessRate: number;
  averageCost: number;
  averageQuality: number;
  topModels: Array<{ model: string; usage: number; successRate: number }>;
  recentTrends: Array<{
    date: string;
    successRate: number;
    averageCost: number;
    averageQuality: number;
    requestCount: number;
  }>;
}

interface PlatformPerformance {
  platformId: string;
  modelId: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageCost: number;
  averageQuality: number;
  averageResponseTime: number;
  lastUsed: Date;
  features: string[];
}

interface TemplatePerformance {
  templateId: string;
  modelId: string;
  totalUsage: number;
  averageQuality: number;
  userSatisfaction: number;
  lastUpdated: Date;
  isDeprecated: boolean;
}

export const dynamic = 'force-dynamic'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<DOLAnalytics | null>(null);
  const [platformPerformance, setPlatformPerformance] = useState<PlatformPerformance[]>([]);
  const [templatePerformance, setTemplatePerformance] = useState<TemplatePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load DOL analytics
      const analyticsResponse = await fetch('/api/dol/analytics');
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.analytics);
      }

      // Load platform performance
      const platformResponse = await fetch('/api/dol/analytics/platform-performance');
      if (platformResponse.ok) {
        const platformData = await platformResponse.json();
        setPlatformPerformance(platformData.platforms);
      }

      // Load template performance
      const templateResponse = await fetch('/api/dol/analytics/template-performance');
      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        setTemplatePerformance(templateData.templates);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getStatusColor = (successRate: number) => {
    if (successRate >= 90) return 'text-green-500';
    if (successRate >= 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusIcon = (successRate: number) => {
    if (successRate >= 90) return '🟢';
    if (successRate >= 75) return '🟡';
    return '🔴';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-xl">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">📊 DOL Analytics Dashboard</h1>
        
        {/* Time Range Selector */}
        <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Time Range</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-4 py-2 rounded-lg ${
                timeRange === '7d' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-4 py-2 rounded-lg ${
                timeRange === '30d' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeRange('90d')}
              className={`px-4 py-2 rounded-lg ${
                timeRange === '90d' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Last 90 Days
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="p-6 bg-blue-900 border border-blue-600 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">Total Requests</h3>
              <p className="text-3xl font-bold">{formatNumber(analytics.totalRequests)}</p>
              <p className="text-sm text-blue-300">All time</p>
            </div>
            
            <div className="p-6 bg-green-900 border border-green-600 rounded-lg">
              <h3 className="text-lg font-semibold text-green-400 mb-2">DOL Success Rate</h3>
              <p className="text-3xl font-bold">{formatPercentage(analytics.dolSuccessRate)}</p>
              <p className="text-sm text-green-300">Last {timeRange}</p>
            </div>
            
            <div className="p-6 bg-yellow-900 border border-yellow-600 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">Average Cost</h3>
              <p className="text-3xl font-bold">{formatCurrency(analytics.averageCost)}</p>
              <p className="text-sm text-yellow-300">Per request</p>
            </div>
            
            <div className="p-6 bg-purple-900 border border-purple-600 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-400 mb-2">Average Quality</h3>
              <p className="text-3xl font-bold">{analytics.averageQuality.toFixed(1)}/100</p>
              <p className="text-sm text-purple-300">Expected quality</p>
            </div>
          </div>
        )}

        {/* Platform Performance */}
        <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Platform Performance</h3>
          {platformPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-2">Platform</th>
                    <th className="text-left p-2">Model</th>
                    <th className="text-left p-2">Requests</th>
                    <th className="text-left p-2">Success Rate</th>
                    <th className="text-left p-2">Avg Cost</th>
                    <th className="text-left p-2">Avg Quality</th>
                    <th className="text-left p-2">Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {platformPerformance.map((platform, index) => (
                    <tr key={index} className="border-b border-gray-700">
                      <td className="p-2 capitalize">{platform.platformId.replace('-', ' ')}</td>
                      <td className="p-2">{platform.modelId}</td>
                      <td className="p-2">{formatNumber(platform.totalRequests)}</td>
                      <td className={`p-2 ${getStatusColor(platform.successCount / platform.totalRequests * 100)}`}>
                        {getStatusIcon(platform.successCount / platform.totalRequests * 100)} 
                        {formatPercentage(platform.successCount / platform.totalRequests * 100)}
                      </td>
                      <td className="p-2">{formatCurrency(platform.averageCost)}</td>
                      <td className="p-2">{platform.averageQuality.toFixed(1)}/100</td>
                      <td className="p-2">{platform.averageResponseTime.toFixed(0)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-400 h-32 flex items-center justify-center">
              No platform performance data available
            </div>
          )}
        </div>

        {/* Template Performance */}
        <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Template Performance</h3>
          {templatePerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-2">Template ID</th>
                    <th className="text-left p-2">Model</th>
                    <th className="text-left p-2">Usage Count</th>
                    <th className="text-left p-2">Quality Score</th>
                    <th className="text-left p-2">User Satisfaction</th>
                    <th className="text-left p-2">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {templatePerformance.map((template, index) => (
                    <tr key={index} className="border-b border-gray-700">
                      <td className="p-2">{template.templateId}</td>
                      <td className="p-2">{template.modelId}</td>
                      <td className="p-2">{formatNumber(template.totalUsage)}</td>
                      <td className="p-2">{template.averageQuality.toFixed(1)}/100</td>
                      <td className="p-2">{template.userSatisfaction.toFixed(1)}/100</td>
                      <td className="p-2">{new Date(template.lastUpdated).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-400 h-32 flex items-center justify-center">
              No template performance data available
            </div>
          )}
        </div>

        {/* Export Controls */}
        <div className="p-6 bg-gray-800 border border-gray-600 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Export & Actions</h3>
          <div className="flex space-x-4">
            <button className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium">
              Export Analytics Report
            </button>
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
              Generate Performance Report
            </button>
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium">
              Send Weekly Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
