import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { addInvestment, subscribeToInvestments, deleteInvestment, Investment } from '../lib/firestore';
import { TrendingUp, Plus, Trash2, Loader2, PieChart as PieChartIcon, IndianRupee } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function Investments() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    symbol: '',
    type: 'Stock',
    amount: '',
    purchasePrice: ''
  });

  const investmentTypes = ['Stock', 'Crypto', 'Mutual Fund', 'ETF', 'Bond', 'Real Estate', 'Other'];
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToInvestments(user.uid, workspace, (data) => {
      setInvestments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.symbol || !formData.amount || !formData.purchasePrice) return;

    setIsProcessing(true);
    try {
      await addInvestment({
        userId: user.uid,
        symbol: formData.symbol.toUpperCase(),
        type: formData.type,
        amount: Number(formData.amount),
        purchasePrice: Number(formData.purchasePrice),
        workspace
      });
      setFormData({ symbol: '', type: 'Stock', amount: '', purchasePrice: '' });
    } catch (error) {
      console.error(error);
      alert("Failed to add investment");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount * inv.purchasePrice), 0);

  // Prepare data for Portfolio Allocation Pie Chart
  const allocationByType = investments.reduce((acc, curr) => {
    const value = curr.amount * curr.purchasePrice;
    acc[curr.type] = (acc[curr.type] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(allocationByType).map(([name, value]) => ({
    name,
    value: value as number
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Investment Tracker</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Invested</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              ₹{totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Assets</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {investments.length}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <PieChartIcon className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Investment Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Add Asset</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Asset Symbol / Name</label>
              <input
                type="text"
                required
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                placeholder="e.g. AAPL, BTC, NIFTY50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Asset Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {investmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  step="any"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Avg. Price</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    required
                    step="any"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Investment
            </button>
          </form>
        </div>

        {/* Portfolio & List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Allocation Chart */}
          {pieData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 text-slate-900">Asset Allocation</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`₹${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Invested']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Investments List */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">Your Assets</h2>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : investments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No investments yet. Add an asset to start tracking your portfolio!
              </div>
            ) : (
              <div className="space-y-3">
                {investments.map((inv) => {
                  const totalValue = inv.amount * inv.purchasePrice;
                  
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-700">
                          {inv.symbol.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{inv.symbol}</p>
                          <p className="text-xs text-slate-500">
                            {inv.type} • {inv.amount} units @ ₹{inv.purchasePrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            ₹{totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <button 
                          onClick={() => inv.id && deleteInvestment(inv.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
