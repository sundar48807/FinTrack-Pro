import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { logOut } from '../lib/firebase';
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  Target, 
  TrendingUp, 
  BrainCircuit, 
  LogOut,
  Menu,
  X,
  User,
  Users,
  Repeat,
  Smartphone,
  CircleDollarSign
} from 'lucide-react';
import { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import Background3D from './Background3D';
import Chatbot from './Chatbot';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const { user } = useAuth();
  const { workspace, setWorkspace } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
    { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
    { name: 'Budgets', path: '/budgets', icon: Wallet },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Investments', path: '/investments', icon: TrendingUp },
    { name: 'Family', path: '/family', icon: Users },
    { name: 'AI Advisor', path: '/ai-advisor', icon: BrainCircuit },
  ];

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-white flex relative overflow-hidden">
      <Background3D />
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:block flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-slate-200">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="relative">
                <Smartphone className="w-6 h-6 text-indigo-600" />
                <CircleDollarSign className="w-3 h-3 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full" />
              </div>
              FinTrack Pro
            </h1>
            <button 
              className="ml-auto lg:hidden text-slate-500"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Workspace Toggle */}
          <div className="p-4 border-b border-slate-200">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setWorkspace('personal')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all",
                  workspace === 'personal' 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <User className="w-4 h-4" />
                Personal
              </button>
              <button
                onClick={() => setWorkspace('family')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all",
                  workspace === 'family' 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Users className="w-4 h-4" />
                Family
              </button>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-indigo-700" : "text-slate-400")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 mb-2 hover:bg-slate-50 rounded-xl transition-colors">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} 
                alt="Profile" 
                className="w-8 h-8 rounded-full bg-slate-200"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user.displayName || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user.email}
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <header className="h-16 flex items-center px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200 lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="ml-4 text-lg font-semibold text-slate-900">
            {navItems.find(item => item.path === location.pathname)?.name || 'FinTrack Pro'}
          </h1>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
        <Chatbot />
      </main>
    </div>
  );
}
