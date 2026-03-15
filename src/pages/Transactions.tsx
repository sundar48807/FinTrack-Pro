import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { addTransaction, subscribeToTransactions, deleteTransaction, Transaction } from '../lib/firestore';
import { parseVoiceCommand, parseReceiptImage, parseBankSMS } from '../lib/gemini';
import { Mic, Upload, Plus, Trash2, Loader2, IndianRupee, FileText, MessageSquare, Tag, CreditCard, Users } from 'lucide-react';
import { format } from 'date-fns';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Transactions() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSMSInput, setShowSMSInput] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: 'Food',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    paymentMethod: 'Cash',
    tags: '',
    familyMember: ''
  });

  const categories = {
    expense: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Education', 'Other'],
    income: ['Salary', 'Freelance', 'Business', 'Investment', 'Other']
  };

  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Other'];

  useEffect(() => {
    if (!user) return;
    
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.familyMembers && Array.isArray(data.familyMembers)) {
          const parsedMembers = data.familyMembers.map((m: any) => 
            typeof m === 'string' ? m : m.name
          );
          setFamilyMembers(parsedMembers);
          if (parsedMembers.length > 0 && !formData.familyMember) {
            setFormData(prev => ({ ...prev, familyMember: parsedMembers[0] }));
          }
        }
      }
    });

    const unsubscribe = subscribeToTransactions(user.uid, workspace, (data) => {
      setTransactions(data);
      setLoading(false);
    });
    
    return () => {
      unsubscribe();
      unsubUser();
    };
  }, [user, workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.amount) return;

    try {
      await addTransaction({
        userId: user.uid,
        type: formData.type,
        amount: Number(formData.amount),
        category: formData.category,
        date: formData.date,
        notes: formData.notes,
        paymentMethod: formData.paymentMethod,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        workspace,
        familyMember: workspace === 'family' ? formData.familyMember : undefined
      });
      setFormData({ ...formData, amount: '', notes: '', tags: '' });
    } catch (error) {
      console.error(error);
      alert("Failed to add transaction");
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      setIsProcessing(true);
      
      try {
        const parsed = await parseVoiceCommand(transcript);
        if (parsed.amount && parsed.category && parsed.type) {
          setFormData({
            ...formData,
            type: parsed.type,
            amount: parsed.amount.toString(),
            category: parsed.category,
            notes: parsed.notes || transcript
          });
        } else {
          alert("Could not understand the transaction details. Please try again.");
        }
      } catch (error) {
        alert("Failed to process voice command.");
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setIsProcessing(false);
      alert("Error recognizing speech.");
    };

    recognition.start();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const parsed = await parseReceiptImage(base64, file.type);
        
        if (parsed.amount && parsed.category) {
          let parsedDate = formData.date;
          if (parsed.date) {
            try {
              const d = new Date(parsed.date);
              if (!isNaN(d.getTime())) {
                parsedDate = d.toISOString().split('T')[0];
              }
            } catch (e) {
              console.error("Invalid date from receipt:", parsed.date);
            }
          }

          setFormData({
            ...formData,
            type: 'expense',
            amount: parsed.amount.toString(),
            category: parsed.category,
            notes: parsed.merchant || 'Receipt scan',
            date: parsedDate
          });
        }
      } catch (error) {
        alert("Failed to process receipt.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSMSParse = async () => {
    if (!smsText.trim()) return;
    
    setIsProcessing(true);
    try {
      const parsed = await parseBankSMS(smsText);
      if (parsed.amount && parsed.category && parsed.type) {
        let parsedDate = formData.date;
        if (parsed.date) {
          try {
            const d = new Date(parsed.date);
            if (!isNaN(d.getTime())) {
              parsedDate = d.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error("Invalid date from SMS:", parsed.date);
          }
        }

        setFormData({
          ...formData,
          type: parsed.type,
          amount: parsed.amount.toString(),
          category: parsed.category,
          notes: parsed.notes || 'SMS Auto-detected',
          date: parsedDate
        });
        setShowSMSInput(false);
        setSmsText('');
      } else {
        alert("Could not understand the SMS details. Please try again.");
      }
    } catch (error) {
      alert("Failed to process SMS.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Transaction Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Add Transaction</h2>
          
          <div className="flex gap-2 mb-6">
            <button
              onClick={handleVoiceInput}
              disabled={isProcessing}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl border transition-colors ${
                isRecording 
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isRecording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              <span className="text-xs font-medium">Voice</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {isProcessing && !isRecording && !showSMSInput ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="text-xs font-medium">Receipt</span>
            </button>
            <button
              onClick={() => setShowSMSInput(!showSMSInput)}
              disabled={isProcessing}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl border transition-colors ${
                showSMSInput 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs font-medium">SMS</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
          </div>

          {showSMSInput && (
            <div className="mb-6 space-y-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <label className="block text-xs font-medium text-indigo-800">Paste Bank SMS</label>
              <textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder="e.g. Rs. 500.00 spent on your Credit Card XX1234 at STARBUCKS on 12-Oct-23..."
                className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSMSInput(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSMSParse}
                  disabled={!smsText.trim() || isProcessing}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isProcessing && showSMSInput ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Parse SMS
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex rounded-xl p-1 bg-slate-100">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense', category: 'Food' })}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  formData.type === 'expense' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'income', category: 'Salary' })}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  formData.type === 'income' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500'
                }`}
              >
                Income
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {categories[formData.type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {workspace === 'family' && familyMembers.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Family Member</label>
                <select
                  value={formData.familyMember}
                  onChange={(e) => setFormData({ ...formData, familyMember: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {familyMembers.map(member => (
                    <option key={member} value={member}>{member}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. vacation, urgent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Optional notes"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add {formData.type === 'income' ? 'Income' : 'Expense'}
            </button>
          </form>
        </div>

        {/* Transactions List */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Recent Transactions</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No transactions yet. Add one to get started!
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      t.type === 'income' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-rose-100 text-rose-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{t.category}</p>
                      <p className="text-xs text-slate-500">
                        {t.date ? (() => {
                          try {
                            return format(new Date(t.date), 'MMM d, yyyy');
                          } catch (e) {
                            return t.date;
                          }
                        })() : 'Unknown Date'} {t.notes && `• ${t.notes}`}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.paymentMethod && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            <CreditCard className="w-3 h-3" />
                            {t.paymentMethod}
                          </span>
                        )}
                        {workspace === 'family' && t.familyMember && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-600">
                            <Users className="w-3 h-3" />
                            {t.familyMember}
                          </span>
                        )}
                        {t.tags && t.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600">
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}₹{(t.amount || 0).toLocaleString()}
                    </span>
                    <button 
                      onClick={() => t.id && deleteTransaction(t.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
