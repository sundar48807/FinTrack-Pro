import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { subscribeToTransactions, Transaction } from '../lib/firestore';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Mail, Phone, FileText, MessageSquare, Loader2, CheckCircle2, Edit2, Save, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, isAfter } from 'date-fns';

export default function Profile() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

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
        const data = docSnap.data();
        setUserData(data);
        setEditPhoneValue(prev => prev || data.mobileNumber || '');
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

  const handleSavePhone = async () => {
    if (!user) return;
    setSavingPhone(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        mobileNumber: editPhoneValue
      }, { merge: true });
      setUserData((prev: any) => ({ ...prev, mobileNumber: editPhoneValue }));
      setIsEditingPhone(false);
    } catch (error) {
      console.error("Error saving phone number:", error);
      alert("Failed to save phone number.");
    } finally {
      setSavingPhone(false);
    }
  };

  // Calculate financial status
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Prepare chart data (last 6 months)
  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStr = format(date, 'MMM yyyy');
    
    const monthTxs = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate.getMonth() === date.getMonth() && txDate.getFullYear() === date.getFullYear();
    });

    const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return {
      name: monthStr,
      Income: income,
      Expense: expense,
      Balance: income - expense
    };
  });

  const handleSendSms = async () => {
    if (!userData?.mobileNumber) {
      alert("No mobile number found in your profile. Please add one during registration.");
      return;
    }

    setSendingSms(true);
    setSmsStatus('idle');

    try {
      const message = `FinTrack Pro Summary:\nTotal Income: $${totalIncome.toFixed(2)}\nTotal Expenses: $${totalExpense.toFixed(2)}\nNet Balance: $${balance.toFixed(2)}`;
      
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <User className="w-6 h-6 text-indigo-600" />
        My Profile
      </h1>

      {/* User Info Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-6">
        <img 
          src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.email}`} 
          alt="Profile" 
          className="w-20 h-20 rounded-full bg-slate-200"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">
            {userData?.displayName || user?.displayName || 'User'}
          </h2>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Mail className="w-4 h-4" /> {user?.email}
            </p>
            
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-500" />
              {isEditingPhone ? (
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={editPhoneValue}
                    onChange={(e) => setEditPhoneValue(e.target.value)}
                    placeholder="+1234567890"
                    className="text-sm px-2 py-1 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={savingPhone}
                  />
                  <button 
                    onClick={handleSavePhone}
                    disabled={savingPhone}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                  >
                    {savingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingPhone(false);
                      setEditPhoneValue(userData?.mobileNumber || '');
                    }}
                    disabled={savingPhone}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-sm text-slate-500">
                    {userData?.mobileNumber || <span className="italic text-slate-400">No mobile number added</span>}
                  </p>
                  <button 
                    onClick={() => setIsEditingPhone(true)}
                    className={`flex items-center gap-1 p-1 transition-all rounded-md ${userData?.mobileNumber ? 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600' : 'text-indigo-600 opacity-100 hover:bg-indigo-50 px-2'}`}
                    title={userData?.mobileNumber ? "Edit Phone Number" : "Add Phone Number"}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {!userData?.mobileNumber && <span className="text-xs font-medium">Add Number</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Status Graph */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Overall Financial Status</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `$${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
                itemStyle={{ color: '#1e293b' }}
              />
              <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handleSendSms}
          disabled={sendingSms || !userData?.mobileNumber}
          className="flex items-center justify-center gap-2 py-4 px-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {sendingSms ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : 
           smsStatus === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
           <MessageSquare className="w-5 h-5 text-indigo-600" />}
          <span className="font-medium text-slate-900">
            {smsStatus === 'success' ? 'SMS Sent!' : 'Send SMS Report'}
          </span>
        </button>

        <button
          onClick={handleSendEmail}
          disabled={sendingEmail}
          className="flex items-center justify-center gap-2 py-4 px-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {sendingEmail ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : 
           emailStatus === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
           <FileText className="w-5 h-5 text-indigo-600" />}
          <span className="font-medium text-slate-900">
            {emailStatus === 'success' ? 'Email Sent!' : 'Email PDF Report'}
          </span>
        </button>
      </div>
    </div>
  );
}
