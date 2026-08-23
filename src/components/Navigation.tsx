import React from 'react';
import { Home, Package, Users, User, ShieldAlert, Bell, LogOut } from 'lucide-react';
import { User as UserType } from '../types';
import { Logo } from './Logo';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: UserType;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, setCurrentTab, user, onLogout }) => {
  const isAdmin = user.role === 'admin';

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => setCurrentTab('home')}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
              <Logo iconClassName="w-5 h-5 text-slate-950" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-base tracking-tight bg-gradient-to-r from-amber-400 to-orange-300 bg-clip-text text-transparent">
                Grain Flow
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-800/90 text-amber-400 rounded-md border border-amber-500/20">
                UG
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => alert("All systems running smoothly. Daily earnings are processed automatically.")}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full ring-2 ring-slate-900"></span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setCurrentTab('admin')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  currentTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-800/80 text-amber-400 hover:bg-slate-700/80 border border-amber-500/30'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div
                onClick={() => setCurrentTab('account')}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <img
                  src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                  alt={user.fullName}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-500/60"
                />
                <span className="hidden sm:inline-block text-xs font-semibold text-slate-200 max-w-[100px] truncate">
                  {user.fullName}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sub Navigation Bar */}
      <div className="hidden md:block bg-slate-900/60 border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center space-x-6 text-xs">
          {[
            { id: 'home', label: 'Home', icon: Home },
            { id: 'products', label: 'Products', icon: Package },
            { id: 'team', label: 'Team Network', icon: Users },
            { id: 'account', label: 'My Account', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center space-x-1.5 font-semibold transition-all py-1.5 border-b-2 ${
                  active
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar: Home | Products | Team | Account */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 shadow-2xl">
        <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
          {[
            { id: 'home', label: 'Home', icon: Home },
            { id: 'products', label: 'Products', icon: Package },
            { id: 'team', label: 'Team', icon: Users },
            { id: 'account', label: 'Account', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`relative flex flex-col items-center justify-center space-y-1 transition-colors ${
                  active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {active && (
                  <span className="absolute top-0 w-10 h-0.5 bg-amber-500 rounded-full"></span>
                )}
                <Icon className="w-6 h-6" />
                <span className={`text-xs ${active ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
