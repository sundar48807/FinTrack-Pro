import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { subscribeToTransactions, Transaction } from '../lib/firestore';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Plus, Trash2, Loader2, IndianRupee, PieChart as PieChartIcon, Activity, UserPlus, ArrowRight, Wallet, History, Send, X, CheckCircle2, MessageSquare } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface FamilyMember {
  name: string;
  email: string;
  phone: string;
}

export default function Family() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Send Report State
  const [isSendingReports, setIsSendingReports] = useState(false);
  const [reportStatus, setReportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Remove Member Modal State
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<FamilyMember | null>(null);
  const [removeOtpSent, setRemoveOtpSent] = useState(false);
  const [removeOtpInput, setRemoveOtpInput] = useState('');
  const [removeGeneratedOtp, setRemoveGeneratedOtp] = useState('');
  const [isSendingRemoveOtp, setIsSendingRemoveOtp] = useState(false);

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
          // Handle legacy string arrays and new object arrays
          const parsedMembers = data.familyMembers.map((m: any) => 
            typeof m === 'string' ? { name: m, email: '', phone: '' } : m
          );
          setFamilyMembers(parsedMembers);
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.phone) {
      alert("Name and Phone number are required.");
      return;
    }

    setIsSendingOtp(true);
    try {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(otp);
      
      const message = `Your FinTrack Pro Family invitation OTP is: ${otp}`;
      
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newMember.phone,
          message
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send SMS');
      }

      setOtpSent(true);
    } catch (error) {
      console.error("Error sending OTP:", error);
      alert("Failed to send OTP. Make sure Vonage credentials are set in .env. For testing, check the console.");
      console.log(`TESTING OTP: ${generatedOtp}`); // Fallback for testing
      setOtpSent(true); // Allow proceeding for testing purposes
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtpAndAdd = async () => {
    if (otpInput !== generatedOtp && otpInput !== '1234') { // 1234 as a universal bypass for testing
      alert("Invalid OTP. Please try again.");
      return;
    }

    if (!user) return;

    setIsSaving(true);
    try {
      const updatedMembers = [...familyMembers, newMember];
      await setDoc(doc(db, 'users', user.uid), {
        familyMembers: updatedMembers
      }, { merge: true });
      
      setShowAddModal(false);
      setNewMember({ name: '', email: '', phone: '' });
      setOtpSent(false);
      setOtpInput('');
    } catch (error) {
      console.error("Error adding family member:", error);
      alert("Failed to add family member");
    } finally {
      setIsSaving(false);
    }
  };

  const initiateRemoveMember = async (member: FamilyMember) => {
    setMemberToRemove(member);
    setShowRemoveModal(true);
  };

  const executeRemoveMember = async (member: FamilyMember) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updatedMembers = familyMembers.filter(m => m.name !== member.name);
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

  const handleSendRemoveOtp = async () => {
    if (!memberToRemove || !memberToRemove.phone) return;
    setIsSendingRemoveOtp(true);
    try {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      setRemoveGeneratedOtp(otp);
      
      const message = `Your FinTrack Pro Family removal OTP is: ${otp}`;
      
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: memberToRemove.phone,
          message
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send SMS');
      }

      setRemoveOtpSent(true);
    } catch (error) {
      console.error("Error sending OTP:", error);
      alert("Failed to send OTP. Check console for testing.");
      console.log(`TESTING REMOVE OTP: ${removeGeneratedOtp}`);
      setRemoveOtpSent(true);
    } finally {
      setIsSendingRemoveOtp(false);
    }
  };

  const handleVerifyOtpAndRemove = async () => {
    if (removeOtpInput !== removeGeneratedOtp && removeOtpInput !== '1234') {
      alert("Invalid OTP. Please try again.");
      return;
    }

    if (!memberToRemove) return;

    await executeRemoveMember(memberToRemove);
    
    setShowRemoveModal(false);
    setMemberToRemove(null);
    setRemoveOtpSent(false);
    setRemoveOtpInput('');
  };

  const handleSendReportsToAll = async () => {
    if (!user) return;
    setIsSendingReports(true);
    setReportStatus('idle');

    try {
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
      const balance = totalIncome - totalExpense;

      const reportData = {
        income: totalIncome,
        expense: totalExpense,
        transactions: transactions.slice(0, 10).map(t => ({
          date: t.date,
          category: t.category,
          amount: t.amount,
          type: t.type
        }))
      };

      const smsMessage = `FinTrack Pro Family Summary:\nTotal Income: $${totalIncome.toFixed(2)}\nTotal Expenses: $${totalExpense.toFixed(2)}\nNet Balance: $${balance.toFixed(2)}`;

      const promises = familyMembers.map(async (member) => {
        // Send SMS if phone exists
        if (member.phone) {
          try {
            await fetch('/api/send-sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: member.phone, message: smsMessage })
            });
          } catch (e) {
            console.error(`Failed to send SMS to ${member.name}`, e);
          }
        }

        // Send Email if email exists
        if (member.email) {
          try {
            await fetch('/api/send-pdf-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: member.email, reportData })
            });
          } catch (e) {
            console.error(`Failed to send Email to ${member.name}`, e);
          }
        }
      });

      await Promise.all(promises);
      setReportStatus('success');
      setTimeout(() => setReportStatus('idle'), 3000);
    } catch (error) {
      console.error("Error sending reports:", error);
      setReportStatus('error');
      alert("Failed to send some reports. Check console for details.");
    } finally {
      setIsSendingReports(false);
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
    const memberTxs = transactions.filter(t => t.familyMember === member.name);
    const income = memberTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const expense = memberTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    return { name: member.name, income, expense, balance: income - expense };
  });

  // Add "Unassigned" for transactions without a family member
  const unassignedTxs = transactions.filter(t => !t.familyMember || !familyMembers.find(m => m.name === t.familyMember));
  if (unassignedTxs.length > 0) {
    const income = unassignedTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const expense = unassignedTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    memberAnalysis.push({ name: 'Unassigned / Former', income, expense, balance: income - expense });
  }

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  const expenseData = memberAnalysis.filter(m => m.expense > 0).map(m => ({ name: m.name, value: m.expense }));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
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
          
          <button
            onClick={handleSendReportsToAll}
            disabled={isSendingReports || familyMembers.length === 0}
            className="flex items-center justify-center gap-2 py-3 px-6 bg-white text-indigo-600 rounded-xl shadow-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 font-medium whitespace-nowrap"
          >
            {isSendingReports ? <Loader2 className="w-5 h-5 animate-spin" /> : 
             reportStatus === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
             <Send className="w-5 h-5" />}
            {reportStatus === 'success' ? 'Reports Sent!' : 'Send Reports to All'}
          </button>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Quick Actions / Members Grid - BHIM Style */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 px-2">Family Members</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
          {/* Add Member Circle */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 bg-white rounded-full shadow-md border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-500 transition-all">
              <UserPlus className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-600">Add New</span>
          </button>

          {familyMembers.map((member, index) => (
            <div key={member.name} className="flex flex-col items-center gap-2 group relative">
              <div 
                className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white font-bold text-xl transform group-hover:scale-110 transition-all cursor-pointer"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                title={`${member.name}\n${member.email}\n${member.phone}`}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-900 truncate w-full text-center">{member.name}</span>
              <button
                onClick={() => initiateRemoveMember(member)}
                className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-slate-400 hover:text-red-500 opacity-100 transition-all border border-slate-100"
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

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Add Family Member</h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setOtpSent(false);
                }}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input
                      type="text"
                      required
                      value={newMember.name}
                      onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. jane@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={newMember.phone}
                      onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="+1234567890"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isSendingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-slate-900">Enter OTP</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      We've sent a code to {newMember.phone}
                    </p>
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full px-3 py-3 text-center text-2xl tracking-widest border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="••••"
                    />
                  </div>
                  
                  <button
                    onClick={handleVerifyOtpAndAdd}
                    disabled={otpInput.length < 4 || isSaving}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Add Member'}
                  </button>
                  
                  <button
                    onClick={() => setOtpSent(false)}
                    className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Back to details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Remove Member Modal */}
      {showRemoveModal && memberToRemove && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Remove Family Member</h3>
              <button 
                onClick={() => {
                  setShowRemoveModal(false);
                  setMemberToRemove(null);
                  setRemoveOtpSent(false);
                  setRemoveOtpInput('');
                }}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {!memberToRemove.phone ? (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-slate-900">Remove {memberToRemove.name}?</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      Are you sure you want to remove this family member? Their past transactions will still be visible.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await executeRemoveMember(memberToRemove);
                      setShowRemoveModal(false);
                      setMemberToRemove(null);
                    }}
                    disabled={isSaving}
                    className="w-full py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Remove Member'}
                  </button>
                </div>
              ) : !removeOtpSent ? (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-slate-900">Remove {memberToRemove.name}?</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      We will send an OTP to {memberToRemove.phone} to confirm removal.
                    </p>
                  </div>
                  <button
                    onClick={handleSendRemoveOtp}
                    disabled={isSendingRemoveOtp}
                    className="w-full py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isSendingRemoveOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP to Remove'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-slate-900">Enter OTP</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      We've sent a code to {memberToRemove.phone}
                    </p>
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      maxLength={4}
                      value={removeOtpInput}
                      onChange={(e) => setRemoveOtpInput(e.target.value)}
                      className="w-full px-3 py-3 text-center text-2xl tracking-widest border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="••••"
                    />
                  </div>
                  
                  <button
                    onClick={handleVerifyOtpAndRemove}
                    disabled={removeOtpInput.length < 4 || isSaving}
                    className="w-full py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Remove Member'}
                  </button>
                  
                  <button
                    onClick={() => setRemoveOtpSent(false)}
                    className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

