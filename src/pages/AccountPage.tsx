import React, { useState } from 'react';
import { User, Wallet, Investment, Transaction, ReferralData } from '../types';
import { User as UserIcon, Package, Users, Gift, Download, Landmark, FileText, ArrowDownLeft, ArrowUpRight, Building2, LogOut, ChevronRight, CheckCircle2, ShieldCheck, Clock, ExternalLink } from 'lucide-react';
import { formatUGX, formatDate } from '../utils/formatters';

interface AccountPageProps {
  user: User;
  wallet: Wallet;
  investments: Investment[];
  transactions: Transaction[];
  referralData: ReferralData;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onRefresh: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  user,
  wallet,
  investments,
  transactions,
  referralData,
  setCurrentTab,
  onLogout,
  onOpenDeposit,
  onOpenWithdraw,
  onRefresh
}) => {
  const [activeSubView, setActiveSubView] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMsg, setRedeemMsg] = useState('');
  const [payoutNumber, setPayoutNumber] = useState(user.phone || '');
  const [payoutBank, setPayoutBank] = useState('MTN Mobile Money');
  const [payoutSaved, setPayoutSaved] = useState(false);

  const handleRedeemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode) return;
    setRedeemMsg('');
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, code: redeemCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      setRedeemMsg(`Success! Redeemed UGX ${data.bonus.toLocaleString()} bonus.`);
      setRedeemCode('');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSavePayout = (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutSaved(true);
    setTimeout(() => setPayoutSaved(false), 2000);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8 max-w-3xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 text-slate-950 shadow-md relative overflow-hidden flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <img
            src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
            alt={user.fullName}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/40 shadow-sm"
          />
          <div>
            <div className="font-black text-base text-white">@{user.fullName.toLowerCase().replace(/\s+/g, '')}</div>
            <div className="text-[11px] font-semibold text-slate-900/90">{user.phone || user.email}</div>
            <div className="mt-1 inline-flex items-center px-2.5 py-0.5 bg-slate-950/20 text-white font-bold text-[9px] rounded-full uppercase tracking-wider">
              {user.role === 'admin' ? 'Platform Admin' : 'Verified Investor'}
            </div>
          </div>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-1 bg-slate-950/30 text-white font-bold text-[10px] rounded-xl uppercase tracking-wider">
          UGANDA
        </span>
      </div>

      {/* Balance Summary Row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 text-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">BALANCE</div>
          <div className="text-xs sm:text-sm font-black text-white truncate">{formatUGX(wallet.availableBalance)}</div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 text-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">WITHDRAWING</div>
          <div className="text-xs sm:text-sm font-black text-slate-300 truncate">{formatUGX(wallet.pendingWithdrawals)}</div>
        </div>
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 text-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">EARNINGS</div>
          <div className="text-xs sm:text-sm font-black text-emerald-400 truncate">{formatUGX(wallet.totalEarnings)}</div>
        </div>
      </div>

      {/* Account Services List */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-800/80">
        <div className="bg-slate-850 px-4 py-2.5 text-slate-300 font-bold text-xs uppercase tracking-wider flex justify-between items-center border-b border-slate-800">
          <span>Account Services</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md">
            Member
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
          {/* Column 1 */}
          <div className="divide-y divide-slate-800/80">
            <button
              onClick={() => setActiveSubView('profile')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">My Profile</div>
                  <div className="text-[10px] text-slate-400">Account info & ID</div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>

            <button
              onClick={() => setActiveSubView('investments')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">My Investments</div>
                  <div className="text-[10px] text-slate-400">{investments.length} Active Solar Plan(s)</div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>

            <button
              onClick={() => setActiveSubView('transactions')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Transaction History</div>
                  <div className="text-[10px] text-slate-400">Deposits, earnings & payouts</div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>

          {/* Column 2 */}
          <div className="divide-y divide-slate-800/80">
            <button
              onClick={() => setActiveSubView('redeem')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Redeem Gift Code</div>
                  <div className="text-[10px] text-slate-400">Claim voucher bonuses</div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>

            {/* Payout Settings */}
            <button
              onClick={() => setActiveSubView('payout')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Payout Settings</div>
                  <div className="text-[10px] text-slate-400">Mobile money account</div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          onClick={onLogout}
          className="w-full py-3 bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Account</span>
        </button>
      </div>

      {/* Sub-view Modal */}
      {activeSubView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {activeSubView === 'profile' && 'My Profile'}
                {activeSubView === 'investments' && 'My Active Investments'}
                {activeSubView === 'transactions' && 'Transaction History'}
                {activeSubView === 'redeem' && 'Redeem Gift Code'}
                {activeSubView === 'payout' && 'Payout Settings'}
              </h3>
              <button
                onClick={() => setActiveSubView(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Profile Subview */}
            {activeSubView === 'profile' && (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Full Name:</span>
                    <span className="text-white font-semibold">{user.fullName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Email:</span>
                    <span className="text-white font-semibold">{user.email}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Phone:</span>
                    <span className="text-white font-semibold">{user.phone || 'Not linked'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Referral Code:</span>
                    <span className="text-amber-400 font-mono font-bold">{user.referralCode}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Member Since:</span>
                    <span className="text-slate-300">{formatDate(user.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Investments Subview */}
            {activeSubView === 'investments' && (
              <div className="space-y-2.5">
                {investments.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No active agricultural investment plans. Go to Products to activate one.
                  </div>
                ) : (
                  investments.map((inv) => (
                    <div key={inv.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between font-bold text-white">
                        <span>{inv.planName}</span>
                        <span className="text-emerald-400">+{formatUGX(inv.dailyIncome)}/day</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>Invested: {formatUGX(inv.investmentAmount)}</span>
                        <span>{inv.durationDays} Days Plan</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span>Accrued: {formatUGX(inv.accruedEarnings)}</span>
                        <span className={`font-semibold capitalize ${inv.status === 'active' ? 'text-emerald-400' : inv.status === 'pending_review' ? 'text-amber-400' : 'text-slate-400'}`}>
                          {inv.status === 'pending_review' ? 'Pending Review' : inv.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Transactions Subview */}
            {activeSubView === 'transactions' && (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {transactions.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No transaction records found yet.
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{tx.description}</div>
                        <div className="text-[10px] text-slate-500">{formatDate(tx.date)} • Ref: {tx.reference}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${tx.type === 'withdrawal' || tx.type === 'investment' ? 'text-slate-300' : 'text-emerald-400'}`}>
                          {tx.type === 'withdrawal' || tx.type === 'investment' ? '-' : '+'}{formatUGX(tx.amount)}
                        </div>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Redeem Subview */}
            {activeSubView === 'redeem' && (
              <form onSubmit={handleRedeemSubmit} className="space-y-3 text-xs">
                <p className="text-slate-400 text-[11px]">
                  Enter an official promotional voucher code to claim instant cash directly into your available balance.
                </p>
                {redeemMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-center font-bold">
                    {redeemMsg}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="e.g. DLIGHT2026"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase focus:ring-1 focus:ring-amber-500 outline-none"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl uppercase tracking-wider transition-all"
                >
                  Redeem Code
                </button>
              </form>
            )}

            {/* Payout Settings Subview */}
            {activeSubView === 'payout' && (
              <form onSubmit={handleSavePayout} className="space-y-3 text-xs">
                {payoutSaved && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-center font-bold">
                    Payout settings saved successfully!
                  </div>
                )}
                <div>
                  <label className="text-slate-400 block mb-1">Primary Payment Channel</label>
                  <select
                    value={payoutBank}
                    onChange={(e) => setPayoutBank(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="MTN Mobile Money">MTN Mobile Money Uganda</option>
                    <option value="Airtel Money">Airtel Money Uganda</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Mobile Money Number</label>
                  <input
                    type="text"
                    value={payoutNumber}
                    onChange={(e) => setPayoutNumber(e.target.value)}
                    placeholder="0770000000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl uppercase tracking-wider transition-all"
                >
                  Save Payout Account
                </button>
              </form>
            )}
            
            {/* Support Subview */}
            {/* Removed Support View */}
          </div>
        </div>
      )}
    </div>
  );
};
