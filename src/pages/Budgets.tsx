import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { addBudget, subscribeToBudgets, deleteBudget, subscribeToTransactions, Budget, Transaction } from '../lib/firestore';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { format, isSameMonth } from 'date-fns';

export default function Budgets() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    category: 'Food',
    amount: '',
    month: format(new Date(), 'yyyy-MM')
  });

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Education', 'Other'];

  useEffect(() => {
    if (!user) return;
    
    let budgetsLoaded = false;
    let transactionsLoaded = false;

    const checkLoading = () => {
      if (budgetsLoaded && transactionsLoaded) setLoading(false);
    };

    const unsubBudgets = subscribeToBudgets(user.uid, workspace, (data) => {
      setBudgets(data);
      budgetsLoaded = true;
      checkLoading();
    });

    const unsubTransactions = subscribeToTransactions(user.uid, workspace, (data) => {
      setTransactions(data);
      transactionsLoaded = true;
      checkLoading();
    });

    return () => {
      unsubBudgets();
      unsubTransactions();
    };
  }, [user, workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.amount) return;

    setIsProcessing(true);
    try {
      await addBudget({
        userId: user.uid,
        category: formData.category,
        amount: Number(formData.amount),
        month: formData.month,
        workspace
      });
      setFormData({ ...formData, amount: '' });
    } catch (error) {
      console.error(error);
      alert("Failed to add budget");
    } finally {
      setIsProcessing(false);
    }
  };

  const getSpentAmount = (category: string, monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const targetDate = new Date(parseInt(year), parseInt(month) - 1);
    
    return transactions
      .filter(t => t.type === 'expense' && t.category === category && isSameMonth(new Date(t.date), targetDate))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Budget Planner</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Budget Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Set Budget</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Month</label>
              <input
                type="month"
                required
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Set Budget
            </button>
          </form>
        </div>

        {/* Budgets List */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Current Budgets</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No budgets set. Create one to start tracking!
            </div>
          ) : (
            <div className="space-y-4">
              {budgets.map((budget) => {
                const spent = getSpentAmount(budget.category, budget.month);
                const percentage = Math.min(100, (spent / budget.amount) * 100);
                const isOverBudget = spent > budget.amount;
                const isNearBudget = percentage >= 80 && !isOverBudget;

                return (
                  <div key={budget.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900">{budget.category}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                            {format(new Date(budget.month + '-01'), 'MMM yyyy')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          ₹{spent.toLocaleString()} spent of ₹{budget.amount.toLocaleString()}
                        </p>
                      </div>
                      <button 
                        onClick={() => budget.id && deleteBudget(budget.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3">
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOverBudget ? 'bg-red-500' : isNearBudget ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      
                      {isOverBudget && (
                        <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Over budget by ₹{(spent - budget.amount).toLocaleString()}
                        </p>
                      )}
                      {isNearBudget && (
                        <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-2 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Nearing budget limit ({percentage.toFixed(0)}%)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
