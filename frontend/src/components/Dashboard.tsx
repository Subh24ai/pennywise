'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingDown, Zap, Activity, RefreshCw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SummaryData {
  total_requests: number;
  total_cost: number;
  cost_saved: number;
  cache_hit_rate: number;
  avg_cost_per_request: number;
  daily_breakdown: Array<{
    date: string;
    cost: number;
    requests: number;
    saved: number;
  }>;
  provider_breakdown: Array<{
    provider: string;
    cost: number;
    requests: number;
  }>;
  top_users: Array<{
    user_id: string;
    cost: number;
    requests: number;
  }>;
}

const Dashboard = () => {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/v1/summary`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = async () => {
    try {
      await fetch(`${API_URL}/v1/demo-data`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      setError('Failed to generate demo data');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">❌ {error}</div>
          <div className="text-slate-400 mb-4">Make sure the backend is running on port 8000</div>
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.total_requests === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-white text-2xl font-bold mb-4">👋 Welcome to PennyWise!</div>
          <div className="text-slate-300 mb-6">No data yet. Generate demo data to see the dashboard in action.</div>
          <button
            onClick={generateDemoData}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-lg transition"
          >
            Generate Demo Data
          </button>
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];
  const savingsRate = (data.cost_saved / (data.total_cost + data.cost_saved)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">PennyWise by Subhash Gupta</h1>
              <p className="text-xs text-slate-400">LLM Cost Analytics</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={generateDemoData}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition"
            >
              Generate Demo Data
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Spend</span>
              <DollarSign className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              ${data.total_cost.toFixed(2)}
            </div>
            <div className="text-xs text-slate-400">Last 30 days</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Saved</span>
              <TrendingDown className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-green-400 mb-1">
              ${data.cost_saved.toFixed(2)}
            </div>
            <div className="text-xs text-green-400 font-medium">
              {savingsRate.toFixed(1)}% reduction
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Requests</span>
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {(data.total_requests / 1000).toFixed(1)}K
            </div>
            <div className="text-xs text-slate-400">
              {(data.total_requests / 30).toFixed(0)} per day avg
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Cache Hit Rate</span>
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {data.cache_hit_rate.toFixed(1)}%
            </div>
            <div className="text-xs text-yellow-400 font-medium">
              Excellent performance
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Cost Trend */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cost Trend (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.daily_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  style={{ fontSize: '11px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Cost ($)"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="saved" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Saved ($)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Provider Breakdown */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cost by Provider</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.provider_breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ provider, cost }) => `${provider} ${cost.toFixed(0)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="cost"
                  >
                    {data.provider_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {data.provider_breakdown.map((provider, idx) => (
                <div key={provider.provider} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                  />
                  <div className="flex-1">
                    <div className="text-sm text-white capitalize">{provider.provider}</div>
                    <div className="text-xs text-slate-400">${provider.cost.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Request Volume */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Request Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.daily_breakdown.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8" 
                style={{ fontSize: '11px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Bar dataKey="requests" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Users Table */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Users by Cost</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">User</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Requests</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Cost</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Avg/Request</th>
                </tr>
              </thead>
              <tbody>
                {data.top_users.slice(0, 10).map((user, idx) => (
                  <tr key={user.user_id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                          {user.user_id.charAt(5) || 'U'}
                        </div>
                        <div className="text-white text-sm font-medium">{user.user_id}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-white text-sm">
                      {user.requests.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-white text-sm font-medium">
                      ${user.cost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-sm">
                      ${(user.cost / user.requests).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ROI Calculator */}
        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur border border-blue-700/50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-2">💰 Your ROI</h3>
          <p className="text-slate-300 mb-4">
            With PennyWise optimization, you're saving an average of{' '}
            <span className="font-bold text-green-400">{savingsRate.toFixed(1)}%</span> on LLM costs
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Annual Projection</div>
              <div className="text-2xl font-bold text-white">
                ${(data.cost_saved * 12).toFixed(0)}
              </div>
              <div className="text-xs text-green-400 mt-1">saved per year</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">PennyWise Cost</div>
              <div className="text-2xl font-bold text-white">$99/mo</div>
              <div className="text-xs text-slate-400 mt-1">unlimited usage</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Net Savings</div>
              <div className="text-2xl font-bold text-green-400">
                ${(data.cost_saved * 12 - 99 * 12).toFixed(0)}
              </div>
              <div className="text-xs text-green-400 mt-1 font-medium">
                {((data.cost_saved * 12 - 99 * 12) / (99 * 12)).toFixed(0)}x ROI
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;