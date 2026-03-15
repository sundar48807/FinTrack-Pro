import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { addSubscription, subscribeToSubscriptions, deleteSubscription, Subscription } from '../lib/firestore';
import { Plus, Trash2, Loader2, Repeat, Calendar, AlertCircle } from 'lucide-react';
import { format, isBefore, addMonths, addYears } from 'date-fns';

export default function Subscriptions() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    nextBillingDate: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToSubscriptions(user.uid, workspace, (data) => {
      setSubscriptions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.amount) return;

    setIsProcessing(true);
    try {
      await addSubscription({
        userId: user.uid,
        name: formData.name,
        amount: Number(formData.amount),
        billingCycle: formData.billingCycle,
        nextBillingDate: formData.nextBillingDate,
        workspace
      });
      setFormData({ ...formData, name: '', amount: '' });
    } catch (error) {
      console.error(error);
      alert("Failed to add subscription");
    } finally {
      setIsProcessing(false);
    }
  };

  const monthlyTotal = subscriptions.reduce((sum, sub) => {
    return sum + (sub.billingCycle === 'monthly' ? sub.amount : sub.amount / 12);
  }, 0);

  const yearlyTotal = subscriptions.reduce((sum, sub) => {
    return sum + (sub.billingCycle === 'yearly' ? sub.amount : sub.amount * 12);
  }, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Subscriptions & Recurring</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Monthly Commitment</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              ₹{monthlyTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Repeat className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Yearly Projection</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              ₹{yearlyTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Subscription Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Add Subscription</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Service Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. Netflix, Gym, Rent"
              />
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
                  step="any"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Billing Cycle</label>
              <select
                value={formData.billingCycle}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as 'monthly' | 'yearly' })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Next Billing Date</label>
              <input
                type="date"
                required
                value={formData.nextBillingDate}
                onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Subscription
            </button>
          </form>
        </div>

        {/* Subscriptions List */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Active Subscriptions</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No active subscriptions. Add one to start tracking!
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const nextDate = new Date(sub.nextBillingDate);
                const isDueSoon = isBefore(nextDate, addMonths(new Date(), 1));
                
                return (
                  <div key={sub.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-bold text-indigo-600">
                        {sub.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{sub.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="capitalize">{sub.billingCycle}</span>
                          <span>•</span>
                          <span className={isDueSoon ? "text-amber-600 font-medium" : ""}>
                            Next: {format(nextDate, 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          ₹{sub.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <button 
                        onClick={() => sub.id && deleteSubscription(sub.id)}
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
  );
}
