import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { analyzeSpending, generateFinancialStory, smartPurchaseAdvisor } from '../lib/gemini';
import { subscribeToTransactions, subscribeToBudgets, Transaction, Budget } from '../lib/firestore';
import { BrainCircuit, Loader2, Sparkles, AlertTriangle, TrendingUp, ShieldCheck, BookOpen, ShoppingBag } from 'lucide-react';
import Markdown from 'react-markdown';

export default function AIAdvisor() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [purchaseItem, setPurchaseItem] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseAdvice, setPurchaseAdvice] = useState<string | null>(null);
  const [advising, setAdvising] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubTx = subscribeToTransactions(user.uid, workspace, (data) => {
      setTransactions(data);
      setLoading(false);
    });
    const unsubBg = subscribeToBudgets(user.uid, workspace, (data) => {
      setBudgets(data);
    });
    return () => { unsubTx(); unsubBg(); };
  }, [user, workspace]);

  const handleAnalyze = async () => {
    if (transactions.length === 0) {
      alert("Not enough data to analyze. Add some transactions first.");
      return;
    }
    
    setAnalyzing(true);
    try {
      const [analysisResult, storyResult] = await Promise.all([
        analyzeSpending(transactions, budgets),
        generateFinancialStory(transactions)
      ]);
      setAnalysis(analysisResult);
      setStory(storyResult);
    } catch (error) {
      alert("Failed to analyze spending. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePurchaseAdvice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseItem || !purchasePrice) return;
    
    setAdvising(true);
    try {
      const advice = await smartPurchaseAdvisor(purchaseItem, Number(purchasePrice), transactions, budgets);
      setPurchaseAdvice(advice);
    } catch (error) {
      alert("Failed to get advice.");
    } finally {
      setAdvising(false);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-indigo-600" />
            AI Financial Advisor
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Get personalized insights and recommendations based on your spending habits.
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing || transactions.length === 0}
          className="flex items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {analysis ? 'Re-analyze' : 'Analyze My Finances'}
        </button>
      </div>

      {!analysis && !analyzing && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Ready for your financial checkup?</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Our AI will analyze your transactions to find saving opportunities, detect unusual spending, and calculate your financial health score.
          </p>
        </div>
      )}

      {analyzing && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Analyzing your financial data...</h3>
          <p className="text-slate-500">
            Looking for patterns, anomalies, and savings opportunities.
          </p>
        </div>
      )}

      {analysis && !analyzing && (
        <div className="space-y-6">
          {/* Story */}
          {story && (
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5" />
                <h2 className="text-lg font-bold">Your Financial Story</h2>
              </div>
              <div className="text-indigo-50 leading-relaxed">
                <Markdown>{story}</Markdown>
              </div>
            </div>
          )}

          {/* Health Score */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-6">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={analysis.financialHealthScore >= 70 ? '#10b981' : analysis.financialHealthScore >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${analysis.financialHealthScore}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{analysis.financialHealthScore}</span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Financial Health Score</h2>
              <p className="text-slate-600">{analysis.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Category */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Top Spending Category</h3>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{analysis.topSpendingCategory}</p>
              <p className="text-sm text-slate-500">This is where most of your money goes.</p>
            </div>

            {/* Unnecessary Spending */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Anomalies & Warnings</h3>
              </div>
              <ul className="space-y-2">
                {analysis.unnecessarySpending.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-rose-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
                {analysis.unnecessarySpending.length === 0 && (
                  <li className="text-sm text-slate-500">No unusual spending detected. Great job!</li>
                )}
              </ul>
            </div>

            {/* Savings Suggestions */}
            <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Actionable Recommendations</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analysis.savingsSuggestions.map((item: string, i: number) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-sm text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Purchase Advisor */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Smart Purchase Advisor</h3>
            <p className="text-sm text-slate-500">Thinking of buying something? Ask AI if you can afford it.</p>
          </div>
        </div>

        <form onSubmit={handlePurchaseAdvice} className="flex gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              required
              value={purchaseItem}
              onChange={(e) => setPurchaseItem(e.target.value)}
              placeholder="What do you want to buy? (e.g. PS5)"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="w-32">
            <input
              type="number"
              required
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="Price (₹)"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={advising || !purchaseItem || !purchasePrice}
            className="px-6 py-2 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {advising ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask AI'}
          </button>
        </form>

        {purchaseAdvice && (
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <div className="prose prose-sm max-w-none">
              <Markdown>{purchaseAdvice}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
