import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Bell, Users, Package, ChevronRight, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import { User, Wallet as WalletType, Investment, Product, Transaction } from '../types';
import { formatUGX, formatDate } from '../utils/formatters';

interface HomePageProps {
  user: User;
  wallet: WalletType;
  investments: Investment[];
  products: Product[];
  transactions?: Transaction[];
  setCurrentTab: (tab: string) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onRefresh: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  user,
  wallet,
  investments,
  products,
  transactions = [],
  setCurrentTab,
  onOpenDeposit,
  onOpenWithdraw,
  onRefresh
}) => {
  const activeInvestments = investments.filter((i) => i.status === 'active');
  const pendingInvestments = investments.filter((i) => i.status === 'pending_review');
  
  // Calculate completed withdrawals
  const totalCompletedWithdrawals = transactions
    .filter((t) => t.type === 'withdrawal' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4 pb-20 md:pb-8 max-w-3xl mx-auto">
      {/* Professional Farming Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&auto=format&fit=crop&q=80"
            alt="Farming Agriculture"
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col items-start space-y-3">
          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-full">
            Sustainable Agriculture
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight max-w-md">
            Invest in Agriculture. Grow With Grainflow.
          </h1>
          <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
            Empowering modern agricultural production across East Africa with secure, transparent daily returns.
          </p>
          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => setCurrentTab('products')}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs uppercase shadow-lg shadow-amber-500/20 transition-all"
            >
              Explore Investments
            </button>
            <button
              onClick={onOpenDeposit}
              className="px-5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 transition-colors"
            >
              Deposit Funds
            </button>
          </div>
        </div>
      </div>

      {/* Top Welcome Card (Compact Gradient) */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 text-slate-950 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-extrabold text-slate-900/80 uppercase tracking-wider">
              GRAINFLOW PORTFOLIO DASHBOARD
            </div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center space-x-1.5">
              <span>Welcome, @{user.fullName.toLowerCase().replace(/\s+/g, '')}</span>
            </h2>
          </div>
          <span className="px-2.5 py-0.5 bg-slate-950/25 backdrop-blur text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
            UGANDA
          </span>
        </div>

        {/* Compact Ticker Notice */}
        <div className="mt-3 bg-slate-950/20 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center space-x-2 text-[11px] font-medium text-slate-950">
          <Bell className="w-3.5 h-3.5 text-amber-100 flex-shrink-0" />
          <span className="truncate">
            Automatic daily returns: Higher investment tiers mature faster!
          </span>
        </div>
      </div>

      {/* Action Buttons: Compact Deposit & Withdraw */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onOpenDeposit}
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3 text-left flex items-center space-x-3 transition-all group shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">Deposit</div>
            <div className="text-[10px] text-slate-400 truncate">Add wallet balance</div>
          </div>
        </button>

        <button
          onClick={onOpenWithdraw}
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3 text-left flex items-center space-x-3 transition-all group shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">Withdraw</div>
            <div className="text-[10px] text-slate-400 truncate">Payout to mobile money</div>
          </div>
        </button>
      </div>

      {/* Compact Statistic Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800/90 text-center flex flex-col justify-center min-h-[72px]">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            ACCOUNT BALANCE
          </div>
          <div className="text-sm sm:text-base font-black text-white truncate">
            {formatUGX(wallet.availableBalance)}
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800/90 text-center flex flex-col justify-center min-h-[72px]">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            TOTAL EARNINGS
          </div>
          <div className="text-sm sm:text-base font-black text-emerald-400 truncate">
            {formatUGX(wallet.totalEarnings)}
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800/90 text-center flex flex-col justify-center min-h-[72px]">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            TOTAL PAID OUT
          </div>
          <div className="text-sm sm:text-base font-black text-orange-400 truncate">
            {formatUGX(totalCompletedWithdrawals)}
          </div>
        </div>
      </div>

      {/* How to Deposit Section */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            How to Deposit & Invest
          </h3>
          <button
            onClick={onOpenDeposit}
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
          >
            Start Deposit →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">1</div>
            <div className="text-xs font-bold text-white">Select Deposit</div>
            <p className="text-[11px] text-slate-400">Click deposit and choose your preferred mobile money or bank network.</p>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">2</div>
            <div className="text-xs font-bold text-white">Transfer & Reference</div>
            <p className="text-[11px] text-slate-400">Transfer funds and submit transaction reference for instant crediting.</p>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">3</div>
            <div className="text-xs font-bold text-white">Activate Plan</div>
            <p className="text-[11px] text-slate-400">Browse verified agricultural plans and activate your daily earnings stream.</p>
          </div>
        </div>
      </div>

      {/* Active Investment Snapshot */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Your Active & Pending Plans {pendingInvestments.length > 0 && <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full">{pendingInvestments.length} Pending</span>}
          </h3>
          <button
            onClick={() => setCurrentTab('account')}
            className="text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center group"
          >
            View All <ChevronRight className="w-3 h-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        
        <div className="p-4">
          {activeInvestments.length === 0 && pendingInvestments.length === 0 ? (
            <div className="text-center py-4 bg-slate-950 rounded-xl border border-dashed border-slate-800">
              <Package className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 mb-3">No active investment plans found.</p>
              <button
                onClick={() => setCurrentTab('products')}
                className="px-4 py-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-bold rounded-lg transition-colors border border-amber-500/30"
              >
                Browse Plans
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {[...pendingInvestments, ...activeInvestments].slice(0, 3).map((inv) => (
                <div key={inv.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700 flex flex-col items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-amber-500 mb-0.5" />
                      <span className="text-[8px] font-black text-slate-400">{inv.durationDays}D</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-2">
                        {inv.planName}
                        {inv.status === 'pending_review' && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] px-1.5 py-0.5 rounded font-semibold">
                            Pending Review
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className="text-emerald-400 font-medium">+{formatUGX(inv.dailyIncome)}/day</span>
                        <span className="text-slate-600">•</span>
                        <span>Earned: {formatUGX(inv.accruedEarnings)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <div className="text-xs font-black text-white">{formatUGX(inv.investmentAmount)}</div>
                    <div className="text-[9px] text-slate-500 uppercase font-semibold capitalize">{inv.status === 'pending_review' ? 'Pending' : 'Active'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Why Invest in Agriculture Info Section */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white">Why Invest with Grainflow?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-bold text-amber-400">High-Yield Agricultural Growth</div>
            <p className="text-[11px] text-slate-400">Directly fund verified commercial farming operations with guaranteed daily returns.</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-bold text-emerald-400">Secure & Transparent Payouts</div>
            <p className="text-[11px] text-slate-400">All investments and withdrawals are audited and processed promptly through mobile money.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
