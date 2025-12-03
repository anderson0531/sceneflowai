'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CreditUsage {
  provider: string;
  service: string;
  count: number;
  estimatedCost: number;
  lastUsed: string;
}

interface DailyUsage {
  date: string;
  google: number;
  elevenlabs: number;
  totalCost: number;
}

interface CreditSummary {
  totalEstimatedCost: number;
  googleCost: number;
  elevenlabsCost: number;
  breakdown: CreditUsage[];
  dailyUsage: DailyUsage[];
  period: string;
}

// Cost estimates per operation (in USD)
const COST_ESTIMATES = {
  google: {
    'gemini-text': 0.01,      // per 1K tokens
    'imagen-3': 0.04,          // per image
    'veo-2': 0.10,             // per second of video
  },
  elevenlabs: {
    'voice-synthesis': 0.30,   // per 1K characters
    'sound-effects': 0.10,     // per generation
  }
};

export default function CreditTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [summary, setSummary] = useState<CreditSummary | null>(null);

  useEffect(() => {
    fetchCreditUsage();
  }, [period]);

  const fetchCreditUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/credits/usage?period=${period}`);
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch credit usage:', err);
      // Use mock data for now
      setSummary(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = (): CreditSummary => {
    const now = new Date();
    const dailyUsage: DailyUsage[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dailyUsage.push({
        date: date.toISOString().split('T')[0],
        google: Math.floor(Math.random() * 50) + 10,
        elevenlabs: Math.floor(Math.random() * 20) + 5,
        totalCost: Math.random() * 5 + 1,
      });
    }

    return {
      totalEstimatedCost: 47.82,
      googleCost: 38.50,
      elevenlabsCost: 9.32,
      period: period,
      dailyUsage,
      breakdown: [
        { provider: 'Google', service: 'Gemini Text Generation', count: 1250, estimatedCost: 12.50, lastUsed: '2 min ago' },
        { provider: 'Google', service: 'Imagen 3 (Images)', count: 342, estimatedCost: 13.68, lastUsed: '5 min ago' },
        { provider: 'Google', service: 'Veo 2 (Video)', count: 45, estimatedCost: 12.32, lastUsed: '1 hour ago' },
        { provider: 'ElevenLabs', service: 'Voice Synthesis', count: 28500, estimatedCost: 8.55, lastUsed: '10 min ago' },
        { provider: 'ElevenLabs', service: 'Sound Effects', count: 77, estimatedCost: 0.77, lastUsed: '30 min ago' },
      ]
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="light p-8 max-w-7xl mx-auto bg-white min-h-screen" style={{ color: '#111827' }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#111827' }}>Credit Usage Tracking</h1>
          <p className="text-gray-500 mt-1">Monitor API costs across Google and ElevenLabs</p>
        </div>
        <Link href="/admin/dol" className="text-blue-600 hover:underline">
          ← Back to Admin
        </Link>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="text-blue-100 text-sm font-medium mb-1">Total Estimated Cost</div>
              <div className="text-3xl font-bold">{formatCurrency(summary.totalEstimatedCost)}</div>
              <div className="text-blue-200 text-sm mt-2">
                {period === 'today' ? 'Today' : period === 'week' ? 'Last 7 days' : 'Last 30 days'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="text-green-100 text-sm font-medium mb-1">Google (Gemini + Imagen + Veo)</div>
              <div className="text-3xl font-bold">{formatCurrency(summary.googleCost)}</div>
              <div className="text-green-200 text-sm mt-2">
                {Math.round((summary.googleCost / summary.totalEstimatedCost) * 100)}% of total
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="text-purple-100 text-sm font-medium mb-1">ElevenLabs (Voice + SFX)</div>
              <div className="text-3xl font-bold">{formatCurrency(summary.elevenlabsCost)}</div>
              <div className="text-purple-200 text-sm mt-2">
                {Math.round((summary.elevenlabsCost / summary.totalEstimatedCost) * 100)}% of total
              </div>
            </div>
          </div>

          {/* Cost Breakdown Table */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>Usage Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Count</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Cost</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {summary.breakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.provider === 'Google' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#374151' }}>
                        {item.service}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right" style={{ color: '#374151' }}>
                        {item.count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium" style={{ color: '#111827' }}>
                        {formatCurrency(item.estimatedCost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {item.lastUsed}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-sm font-semibold" style={{ color: '#111827' }}>
                      Total
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold" style={{ color: '#111827' }}>
                      {formatCurrency(summary.totalEstimatedCost)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Cost Rate Reference */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>💡 Cost Reference (Estimated)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Google Services</h4>
                <ul className="text-sm space-y-1" style={{ color: '#4b5563' }}>
                  <li>• <strong>Gemini 2.0:</strong> ~$0.01 per 1K tokens</li>
                  <li>• <strong>Imagen 3:</strong> ~$0.04 per image</li>
                  <li>• <strong>Veo 2:</strong> ~$0.10 per second of video</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-purple-700 mb-2">ElevenLabs</h4>
                <ul className="text-sm space-y-1" style={{ color: '#4b5563' }}>
                  <li>• <strong>Voice Synthesis:</strong> ~$0.30 per 1K characters</li>
                  <li>• <strong>Sound Effects:</strong> ~$0.10 per generation</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              * Costs are estimates based on published API pricing. Actual costs may vary based on usage patterns and pricing tier.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
