import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Target, Plus, Trash2, Loader2, Trophy, Flame, CalendarOff } from 'lucide-react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { subscribeToTransactions, Transaction } from '../lib/firestore';

export interface SavingsGoal {
  id?: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string;
  createdAt: any;
  workspace?: string;
}

export default function Goals() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: ''
  });

  const [addFundsData, setAddFundsData] = useState<{id: string, amount: string} | null>(null);

  // Wealth Simulator State
  const [simInitial, setSimInitial] = useState(10000);
  const [simMonthly, setSimMonthly] = useState(2000);
  const [simYears, setSimYears] = useState(10);
  const [simRate, setSimRate] = useState(8);
  
  const calculateWealth = () => {
    const r = simRate / 100 / 12;
    const n = simYears * 12;
    // Future Value of a Series formula + Compound Interest for principal
    const futureValue = simInitial * Math.pow(1 + r, n) + simMonthly * ((Math.pow(1 + r, n) - 1) / r);
    return futureValue;
  };

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'savingsGoals'),
      where('userId', '==', user.uid),
      where('workspace', '==', workspace),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeGoals = onSnapshot(q, (snapshot) => {
      const data: SavingsGoal[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as SavingsGoal);
      });
      setGoals(data);
      setLoading(false);
    });

    const unsubscribeTx = subscribeToTransactions(user.uid, workspace, (data) => {
      setTransactions(data);
    });

    return () => {
      unsubscribeGoals();
      unsubscribeTx();
    };
  }, [user, workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.targetAmount) return;

    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'savingsGoals'), {
        userId: user.uid,
        name: formData.name,
        targetAmount: Number(formData.targetAmount),
        savedAmount: 0,
        deadline: formData.deadline || null,
        createdAt: serverTimestamp(),
        workspace
      });
      setFormData({ name: '', targetAmount: '', deadline: '' });
    } catch (error) {
      console.error(error);
      alert("Failed to create goal");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'savingsGoals', id));
    } catch (error) {
      console.error(error);
      alert("Failed to delete goal");
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFundsData || !addFundsData.amount) return;

    const goal = goals.find(g => g.id === addFundsData.id);
    if (!goal) return;

    try {
      await updateDoc(doc(db, 'savingsGoals', goal.id!), {
        savedAmount: goal.savedAmount + Number(addFundsData.amount)
      });
      setAddFundsData(null);
    } catch (error) {
      console.error(error);
      alert("Failed to add funds");
    }
  };

  // Calculate No-Spend Days
  const calculateNoSpendDays = () => {
    const expenseDates = new Set(
      transactions
        .filter(t => t.type === 'expense')
        .map(t => format(new Date(t.date), 'yyyy-MM-dd'))
    );

    let streak = 0;
    let today = startOfDay(new Date());
    
    // Check if today is a no-spend day
    if (!expenseDates.has(format(today, 'yyyy-MM-dd'))) {
      streak++;
    }

    // Check previous days
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (!expenseDates.has(format(d, 'yyyy-MM-dd'))) {
        streak++;
      } else {
        break;
      }
    }

    const totalNoSpendThisMonth = 30 - expenseDates.size; // rough estimate for last 30 days

    return { streak, totalNoSpendThisMonth: Math.max(0, totalNoSpendThisMonth) };
  };

  const { streak, totalNoSpendThisMonth } = calculateNoSpendDays();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Savings Goals</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Goal Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Create New Goal</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Goal Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. New Car, Vacation"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Target Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  required
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Deadline (Optional)</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              Create Goal
            </button>
          </form>
        </div>

        {/* Goals List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">Your Goals</h2>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No savings goals yet. Create one to start saving!
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => {
                  const percentage = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
                  const isComplete = percentage >= 100;

                  return (
                    <div key={goal.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                          }`}>
                            {isComplete ? <Trophy className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{goal.name}</h3>
                            {goal.deadline && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Target: {format(new Date(goal.deadline), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => goal.id && handleDelete(goal.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          ₹{goal.savedAmount.toLocaleString()}
                        </span>
                        <span className="text-slate-500">
                          of ₹{goal.targetAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden mb-4">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isComplete ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {!isComplete && (
                        <div className="flex items-center gap-2">
                          {addFundsData?.id === goal.id ? (
                            <form onSubmit={handleAddFunds} className="flex flex-1 gap-2">
                              <input
                                type="number"
                                required
                                autoFocus
                                value={addFundsData.amount}
                                onChange={(e) => setAddFundsData({ ...addFundsData, amount: e.target.value })}
                                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                                placeholder="Amount to add"
                              />
                              <button
                                type="submit"
                                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddFundsData(null)}
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <button
                              onClick={() => setAddFundsData({ id: goal.id!, amount: '' })}
                              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Add Funds
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wealth Simulator */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">Wealth Growth Simulator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Initial Amount (₹)</label>
                  <input
                    type="number"
                    value={simInitial}
                    onChange={(e) => setSimInitial(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Monthly Contribution (₹)</label>
                  <input
                    type="number"
                    value={simMonthly}
                    onChange={(e) => setSimMonthly(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Years</label>
                    <input
                      type="number"
                      value={simYears}
                      onChange={(e) => setSimYears(Number(e.target.value))}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Return Rate (%)</label>
                    <input
                      type="number"
                      value={simRate}
                      onChange={(e) => setSimRate(Number(e.target.value))}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center items-center p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-sm font-medium text-indigo-600 mb-2">Projected Wealth</p>
                <p className="text-4xl font-bold text-slate-900">
                  ₹{Math.round(calculateWealth()).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-4 text-center">
                  Total Contributions: ₹{(simInitial + (simMonthly * 12 * simYears)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
