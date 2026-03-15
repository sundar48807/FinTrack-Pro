import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { subscribeToTransactions, Transaction } from '../lib/firestore';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Plus, Trash2, Loader2, IndianRupee, PieChart as PieChartIcon, Activity, UserPlus, ArrowRight, Wallet, History } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Family() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    let isUserDataLoaded = false;
    let isTransactionsLoaded = false;

    const checkLoading = () => {
      if (isUserDataLoaded && isTransactionsLoaded) {
        setLoading(false);
      }
    };

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.familyMembers && Array.isArray(data.familyMembers)) {
          setFamilyMembers(data.familyMembers);
        }
      }
      isUserDataLoaded = true;
      checkLoading();
    });

    const unsubTx = subscribeToTransactions(user.uid, 'family', (data) => {
      setTransactions(data);
      isTransactionsLoaded = true;
      checkLoading();
    });

    return () => {
      unsubUser();
      unsubTx();
    };
  }, [user]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMember.trim() || familyMembers.includes(newMember.trim())) return;

    setIsSaving(true);
    try {
      const updatedMembers = [...familyMembers, newMember.trim()];
      await setDoc(doc(db, 'users', user.uid), {
        familyMembers: updatedMembers
      }, { merge: true });
      setNewMember('');
    } catch (error) {
      console.error("Error adding family member:", error);
      alert("Failed to add family member");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberToRemove: string) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to remove ${memberToRemove}? Their past transactions will still be visible.`)) return;

    setIsSaving(true);
    try {
      const updatedMembers = familyMembers.filter(m => m !== memberToRemove);
      await setDoc(doc(db, 'users', user.uid), {
        familyMembers: updatedMembers
      }, { merge: true });
    } catch (error) {
      console.error("Error removing family member:", error);
      alert("Failed to remove family member");
    } finally {
      setIsSaving(false);
    }
  };

  if (workspace !== 'family') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Family Workspace Required</h2>
        <p className="text-slate-500 max-w-md">
          To manage family members and view their analysis, please switch to the Family workspace using the toggle in the sidebar.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Calculate analysis per member
  const memberAnalysis = familyMembers.map(member => {
    const memberTxs = transactions.filter(t => t.familyMember === member);
    const income = memberTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = memberTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { name: member, income, expense, balance: income - expense };
  });

  // Add "Unassigned" for transactions without a family member
  const unassignedTxs = transactions.filter(t => !t.familyMember || !familyMembers.includes(t.familyMember));
  if (unassignedTxs.length > 0) {
    const income = unassignedTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = unassignedTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    memberAnalysis.push({ name: 'Unassigned / Former', income, expense, balance: income - expense });
  }

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  const expenseData = memberAnalysis.filter(m => m.expense > 0).map(m => ({ name: m.name, value: m.expense }));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Family Hub</h1>
          <p className="text-indigo-100 opacity-80">Manage your family's collective wealth and spending.</p>
          
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <p className="text-xs text-indigo-100 uppercase tracking-wider font-semibold">Total Members</p>
              <p className="text-2xl font-bold mt-1">{familyMembers.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <p className="text-xs text-indigo-100 uppercase tracking-wider font-semibold">Family Balance</p>
              <p className="text-2xl font-bold mt-1">₹{memberAnalysis.reduce((sum, m) => sum + m.balance, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Quick Actions / Members Grid - BHIM Style */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 px-2">Family Members</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
          {/* Add Member Circle */}
          <button
            onClick={() => {
              const name = prompt("Enter family member name:");
              if (name) {
                setNewMember(name);
                // Trigger add logic
                const updatedMembers = [...familyMembers, name.trim()];
                setDoc(doc(db, 'users', user!.uid), { familyMembers: updatedMembers }, { merge: true });
              }
            }}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 bg-white rounded-full shadow-md border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-500 transition-all">
              <UserPlus className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-600">Add New</span>
          </button>

          {familyMembers.map((member, index) => (
            <div key={member} className="flex flex-col items-center gap-2 group relative">
              <div 
                className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white font-bold text-xl transform group-hover:scale-110 transition-all cursor-pointer"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              >
                {member.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-900 truncate w-full text-center">{member}</span>
              <button
                onClick={() => handleRemoveMember(member)}
                className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all border border-slate-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Chart */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
              Expense Share
            </h3>
          </div>
          <div className="h-64">
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">No data available</div>
            )}
          </div>
        </div>

        {/* Member List with Progress */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Spending Breakdown
          </h3>
          <div className="space-y-6">
            {memberAnalysis.map((data, index) => {
              const maxExpense = Math.max(...memberAnalysis.map(m => m.expense), 1);
              const percentage = (data.expense / maxExpense) * 100;
              return (
                <div key={data.name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                        {data.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{data.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">₹{data.expense.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: COLORS[index % COLORS.length] 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Table Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Financial Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3 text-right">Income</th>
                <th className="px-4 py-3 text-right">Expense</th>
                <th className="px-4 py-3 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberAnalysis.map((data) => (
                <tr key={data.name} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-semibold text-slate-900">{data.name}</td>
                  <td className="px-4 py-4 text-right text-emerald-600">₹{data.income.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-rose-600">₹{data.expense.toLocaleString()}</td>
                  <td className={`px-4 py-4 text-right font-bold ${data.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ₹{data.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
