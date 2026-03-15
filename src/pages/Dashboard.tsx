import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { subscribeToTransactions, Transaction } from '../lib/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { IndianRupee, TrendingUp, TrendingDown, Wallet, Loader2, Download, Activity, MessageSquare, FileText, CheckCircle2 } from 'lucide-react';
import { format, subMonths, isSameMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Dashboard() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  const [sendingSms, setSendingSms] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [smsStatus, setSmsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
        setUserData(docSnap.data());
      } else {
        setUserData({});
      }
      isUserDataLoaded = true;
      checkLoading();
    }, (error) => {
      console.error("Error fetching user data:", error);
      isUserDataLoaded = true;
      checkLoading();
    });

    const unsubTx = subscribeToTransactions(user.uid, workspace, (data) => {
      setTransactions(data);
      isTransactionsLoaded = true;
      checkLoading();
    });

    return () => {
      unsubUser();
      unsubTx();
    };
  }, [user, workspace]);

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(`Financial Report - ${workspace === 'personal' ? 'Personal' : 'Family'}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 30);
    
    // Summary
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    
    doc.text(`Total Balance: INR ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 40);
    doc.text(`Total Income: INR ${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 46);
    doc.text(`Total Expenses: INR ${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 52);

    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
      body: transactions.map(t => [
        format(new Date(t.date), 'MMM dd, yyyy'),
        t.type === 'income' ? 'Income' : 'Expense',
        t.category,
        t.notes || '-',
        `INR ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`FinTrack_Report_${workspace}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const generateCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Payment Method', 'Tags', 'Notes'];
    const rows = transactions.map(t => [
      t.date,
      t.type,
      t.category,
      t.amount,
      t.paymentMethod || '',
      (t.tags || []).join('; '),
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `FinTrack_Data_${workspace}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendSms = async () => {
    if (!userData?.mobileNumber) {
      alert("No mobile number found in your profile. Please add one during registration.");
      return;
    }

    setSendingSms(true);
    setSmsStatus('idle');

    try {
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIncome - totalExpense;

      const message = `FinTrack Pro Summary:\nTotal Income: ₹${totalIncome.toLocaleString()}\nTotal Expenses: ₹${totalExpense.toLocaleString()}\nNet Balance: ₹${balance.toLocaleString()}`;
      
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: userData.mobileNumber,
          message
        })
      });

      if (!response.ok) throw new Error('Failed to send SMS');
      setSmsStatus('success');
      setTimeout(() => setSmsStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setSmsStatus('error');
      alert("Failed to send SMS. Make sure Vonage credentials are set in .env");
    } finally {
      setSendingSms(false);
    }
  };

  const handleSendEmail = async () => {
    if (!user?.email) return;

    setSendingEmail(true);
    setEmailStatus('idle');

    try {
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

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

      const response = await fetch('/api/send-pdf-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          reportData
        })
      });

      if (!response.ok) throw new Error('Failed to send Email');
      setEmailStatus('success');
      setTimeout(() => setEmailStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setEmailStatus('error');
      alert("Failed to send Email. Make sure SMTP credentials are set in .env");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const currentMonth = new Date();
  const currentMonthTransactions = transactions.filter(t => isSameMonth(new Date(t.date), currentMonth));
  
  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const totalExpense = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const balance = totalIncome - totalExpense;

  // Calculate Health Score (Simple algorithm for dashboard)
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const healthScore = Math.round(Math.max(0, Math.min(100, (savingsRate * 1.5) + 50)));

  // Calculate Expense Prediction
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const currentDay = currentMonth.getDate();
  const predictedExpense = Math.round((totalExpense / currentDay) * daysInMonth);
  const isOverspending = predictedExpense > totalIncome && totalIncome > 0;

  // Prepare data for Category Pie Chart
  const expensesByCategory = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value: value as number
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

  // Prepare data for Monthly Trend Bar Chart (last 6 months)
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(currentMonth, 5 - i);
    const monthTransactions = transactions.filter(t => isSameMonth(new Date(t.date), date));
    
    return {
      name: format(date, 'MMM'),
      Income: monthTransactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0),
      Expense: monthTransactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0),
    };
  });

  // Calculate family member breakdown if in family workspace
  const familyMemberExpenses = workspace === 'family' ? currentMonthTransactions
    .filter(t => t.type === 'expense' && t.familyMember)
    .reduce((acc, curr) => {
      const member = curr.familyMember || 'Unassigned';
      acc[member] = (acc[member] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>) : {};

  const familyPieData = Object.entries(familyMemberExpenses).map(([name, value]) => ({
    name,
    value: value as number
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSendSms}
            disabled={sendingSms || !userData?.mobileNumber}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
            title="Send SMS Report"
          >
            {sendingSms ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             smsStatus === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
             <MessageSquare className="w-4 h-4" />}
            <span className="hidden sm:inline">{smsStatus === 'success' ? 'Sent' : 'SMS'}</span>
          </button>
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
            title="Email PDF Report"
          >
            {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             emailStatus === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
             <FileText className="w-4 h-4" />}
            <span className="hidden sm:inline">{emailStatus === 'success' ? 'Sent' : 'Email'}</span>
          </button>
          <button
            onClick={generateCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Balance</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                ₹{balance.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Monthly Income</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                ₹{totalIncome.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Monthly Expense</p>
              <p className="text-2xl font-bold text-rose-600 mt-2">
                ₹{totalExpense.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Health Score</p>
              <div className="flex items-end gap-1 mt-2">
                <p className="text-2xl font-bold text-slate-900">
                  {healthScore}
                </p>
                <p className="text-sm text-slate-500 mb-1">/ 100</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-6 text-slate-900">Income vs Expense (6 Months)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-slate-900">Spending by Category</h2>
            <div className="h-48">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`₹${value}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  No expenses this month
                </div>
              )}
            </div>
          </div>

          {workspace === 'family' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-6 text-slate-900">Spending by Member</h2>
              <div className="h-48">
                {familyPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={familyPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {familyPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`₹${value}`, 'Amount']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    No member expenses this month
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">AI Expense Prediction</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Predicted Monthly Expense</p>
                <p className={`text-2xl font-bold mt-1 ${isOverspending ? 'text-rose-600' : 'text-slate-900'}`}>
                  ₹{predictedExpense.toLocaleString()}
                </p>
              </div>
              {isOverspending ? (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <p className="text-sm text-rose-600">
                    Warning: You are on track to exceed your income this month. Consider reducing discretionary spending.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-sm text-emerald-600">
                    You are on track to stay within your income this month. Great job!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
