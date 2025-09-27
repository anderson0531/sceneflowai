'use client';
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';

interface OptimizationRecommendation {
  type: 'model' | 'template' | 'prompt' | 'cost';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action: string;
  estimatedImprovement: number;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  costEfficiency: number;
  qualityScore: number;
  userSatisfaction: number;
  errorRate: number;
  throughput: number;
}

interface OptimizationSummary {
  totalRecommendations: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  estimatedSavings: number;
  estimatedQualityImprovement: number;
}

export default function OptimizationPage() {
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [summary, setSummary] = useState<OptimizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [trend, setTrend] = useState<'improving' | 'stable' | 'declining'>('stable');
  const [trendConfidence, setTrendConfidence] = useState(0);
  const [trendFactors, setTrendFactors] = useState<string[]>([]);

  useEffect(() => {
    loadOptimizationData();
  }, []);

  const loadOptimizationData = async () => {
    setLoading(true);
    try {
      // Load optimization summary
      const summaryResponse = await fetch('/api/dol/optimization/summary');
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.summary);
      }

      // Load performance metrics
      const metricsResponse = await fetch('/api/dol/optimization/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.metrics);
      }

      // Load recommendations
      const recommendationsResponse = await fetch('/api/dol/optimization/recommendations');
      if (recommendationsResponse.ok) {
        const recommendationsData = await recommendationsResponse.json();
        setRecommendations(recommendationsData.recommendations);
      }

      // Load performance trends
      const trendsResponse = await fetch('/api/dol/optimization/trends');
      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json();
        setTrend(trendsData.trend);
        setTrendConfidence(trendsData.confidence);
        setTrendFactors(trendsData.factors);
      }
    } catch (error) {
      console.error('Error loading optimization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyOptimizations = async () => {
    setApplying(true);
    try {
      const response = await fetch('/api/dol/optimization/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendations })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Optimizations applied successfully!\nApplied: ${result.applied}\nFailed: ${result.failed}`);
        await loadOptimizationData(); // Refresh data
      }
    } catch (error) {
      console.error('Error applying optimizations:', error);
      alert('Failed to apply optimizations');
    } finally {
      setApplying(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'model': return '🤖';
      case 'template': return '📝';
      case 'prompt': return '💬';
      case 'cost': return '💰';
      default: return '❓';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-500';
      case 'declining': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-xl">Loading optimization data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🔧 DOL Performance Optimization</h1>
        
        {/* Performance Overview */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-blue-900 border border-blue-600 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">Response Time</h3>
              <p className="text-3xl font-bold">{metrics.averageResponseTime.toFixed(0)}ms</p>
              <p className="text-sm text-blue-300">Average</p>
            </div>
            
            <div className="p-6 bg-green-900 border border-green-600 rounded-lg">
              <h3 className="text-lg font-semibold text-green-400 mb-2">Cost Efficiency</h3>
              <p className="text-3xl font-bold">{metrics.costEfficiency.toFixed(1)}%</p>
              <p className="text-sm text-green-300">Efficiency Score</p>
            </div>
            
            <div className="p-6 bg-purple-900 border border-purple-600 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-400 mb-2">Quality Score</h3>
              <p className="text-3xl font-bold">{metrics.qualityScore.toFixed(1)}/100</p>
              <p className="text-sm text-purple-300">Average Quality</p>
            </div>
            
            <div className="p-6 bg-yellow-900 border border-yellow-600 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">User Satisfaction</h3>
              <p className="text-3xl font-bold">{metrics.userSatisfaction}/100</p>
              <p className="text-sm text-yellow-300">Satisfaction Score</p>
            </div>
            
            <div className="p-6 bg-red-900 border border-red-600 rounded-lg">
              <h3 className="text-lg font-semibold text-red-400 mb-2">Error Rate</h3>
              <p className="text-3xl font-bold">{metrics.errorRate.toFixed(1)}%</p>
              <p className="text-sm text-red-300">Error Percentage</p>
            </div>
            
            <div className="p-6 bg-indigo-900 border border-indigo-600 rounded-lg">
              <h3 className="text-lg font-semibold text-indigo-400 mb-2">Throughput</h3>
              <p className="text-3xl font-bold">{metrics.throughput.toFixed(1)}</p>
              <p className="text-sm text-indigo-300">Requests/Day</p>
            </div>
          </div>
        )}

        {/* Performance Trends */}
        <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Performance Trends</h2>
          <div className="flex items-center space-x-4">
            <span className={`text-4xl ${getTrendIcon(trend)}`}></span>
            <div>
              <h3 className={`text-2xl font-bold ${getTrendColor(trend)}`}>
                Performance is {trend}
              </h3>
              <p className="text-gray-300">Confidence: {trendConfidence}%</p>
            </div>
          </div>
          
          {trendFactors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">Key Factors:</h4>
              <ul className="space-y-1">
                {trendFactors.map((factor, index) => (
                  <li key={index} className="text-gray-300">• {factor}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Optimization Summary */}
        {summary && (
          <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Optimization Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{summary.totalRecommendations}</p>
                <p className="text-sm text-gray-300">Total Recommendations</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{summary.highPriority}</p>
                <p className="text-sm text-gray-300">High Priority</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{summary.mediumPriority}</p>
                <p className="text-sm text-gray-300">Medium Priority</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{summary.lowPriority}</p>
                <p className="text-sm text-gray-300">Low Priority</p>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-green-900 border border-green-600 rounded-lg">
                <p className="text-2xl font-bold text-green-400">${summary.estimatedSavings.toFixed(2)}</p>
                <p className="text-sm text-green-300">Estimated Cost Savings</p>
              </div>
              
              <div className="text-center p-4 bg-blue-900 border border-blue-600 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">+{summary.estimatedQualityImprovement.toFixed(1)}</p>
                <p className="text-sm text-blue-300">Quality Improvement Points</p>
              </div>
            </div>
          </div>
        )}

        {/* Optimization Recommendations */}
        <div className="mb-8 p-6 bg-gray-800 border border-gray-600 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Optimization Recommendations</h2>
            <button
              onClick={applyOptimizations}
              disabled={applying || recommendations.length === 0}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium"
            >
              {applying ? 'Applying...' : 'Apply All Optimizations'}
            </button>
          </div>
          
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="p-4 bg-gray-700 border border-gray-600 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getTypeIcon(recommendation.type)}</span>
                      <div>
                        <h3 className="font-semibold">{recommendation.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(recommendation.priority)}`}>
                          {recommendation.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-400">+{recommendation.estimatedImprovement.toFixed(1)}</p>
                      <p className="text-xs text-gray-300">Improvement</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-3">{recommendation.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong className="text-gray-300">Impact:</strong> {recommendation.impact}</p>
                      <p><strong className="text-gray-300">Action:</strong> {recommendation.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <p className="text-xl">🎉 No optimization recommendations found!</p>
              <p className="text-sm mt-2">Your DOL system is performing optimally</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-gray-800 border border-gray-600 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="flex space-x-4">
            <button
              onClick={loadOptimizationData}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              Refresh Data
            </button>
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium">
              Generate Report
            </button>
            <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium">
              Schedule Optimization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
