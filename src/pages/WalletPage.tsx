import React, { useState } from 'react';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, XCircle, X, History } from 'lucide-react';
import { Wallet, Transaction, User } from '../types';
import { formatUGX, formatDate } from '../utils/formatters';
import { isValidUgandanPhoneNumber } from '../utils/validators';
import { MarziPaymentModal } from '../components/MarziPaymentModal';

interface WalletPageProps {
  wallet: Wallet;
  transactions: Transaction[];
  user: User;
  onRefresh: () => void;
  isDepositOpen: boolean;
  setIsDepositOpen: (open: boolean) => void;
  isWithdrawOpen: boolean;
  setIsWithdrawOpen: (open: boolean) => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  wallet,
  transactions,
  user,
  onRefresh,
  isDepositOpen,
  setIsDepositOpen,
  isWithdrawOpen,
  setIsWithdrawOpen
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState<number>(50000);
  const [withdrawPhone, setWithdrawPhone] = useState(user.phone || '');
  const [bankName, setBankName] = useState('MTN Mobile Money');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState('');

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawMsg('');

    if (withdrawAmount > wallet.availableBalance) {
      setWithdrawError('Amount exceeds available balance.');
      return;
    }

    if (!isValidUgandanPhoneNumber(withdrawPhone)) {
      setWithdrawError('Please enter a valid Ugandan mobile money number (e.g. 07XXXXXXXX)');
      return;
    }

    setWithdrawLoading(true);

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid || user.id,
          amount: withdrawAmount,
          accountNumber: withdrawPhone,
          bankName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal failed');

      setWithdrawMsg('Withdrawal request initiated. Please wait while your transaction is processed.');
      setTimeout(() => {
        setIsWithdrawOpen(false);
        setWithdrawMsg('');
        onRefresh();
      }, 3000);
    } catch (err: any) {
      setWithdrawError(err.message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10">
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Digital Wallet</h1>
          <p className="text-sm text-slate-400 mt-1">Manage funds, deposits, and secure withdrawals.</p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button
            onClick={() => setIsDepositOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit</span>
          </button>
          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded-xl border border-slate-700 transition-all text-sm"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Available Balance</span>
          <div className="text-3xl font-extrabold text-white mt-1">{formatUGX(wallet.availableBalance)}</div>
          <div className="text-xs text-emerald-400 mt-2">Ready to invest or withdraw</div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Deposited</span>
          <div className="text-2xl font-bold text-white mt-1">{formatUGX(wallet.totalDeposited)}</div>
          <div className="text-xs text-slate-500 mt-2">Lifetime deposits credited</div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Invested</span>
          <div className="text-2xl font-bold text-white mt-1">{formatUGX(wallet.totalInvested)}</div>
          <div className="text-xs text-teal-400 mt-2">Active capital in portfolios</div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Earnings</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{formatUGX(wallet.totalEarnings)}</div>
          <div className="text-xs text-slate-500 mt-2">Cumulative returns generated</div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending Withdrawals</span>
          <div className="text-2xl font-bold text-orange-400 mt-1">{formatUGX(wallet.pendingWithdrawals)}</div>
          <div className="text-xs text-slate-500 mt-2">In verification queue</div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-2 mb-6">
          <History className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Full Transaction History</h2>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No transaction history found.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800/60">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' :
                    tx.type === 'withdrawal' ? 'bg-orange-500/10 text-orange-400' :
                    tx.type === 'investment' ? 'bg-teal-500/10 text-teal-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> :
                     tx.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> :
                     <WalletIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white capitalize flex items-center space-x-2">
                      <span>{tx.type}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                        tx.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        (tx.status === 'PENDING_ADMIN_APPROVAL' || tx.status === 'PENDING_PAYMENT' || tx.status === 'pending') ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{tx.description} • <span className="font-mono text-[11px] text-slate-500">{tx.reference}</span></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${tx.type === 'withdrawal' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {tx.type === 'withdrawal' ? '-' : '+'}{formatUGX(tx.amount)}
                  </div>
                  <div className="text-[10px] text-slate-500">{formatDate(tx.date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MarziPay Mobile Money Deposit Modal */}
      <MarziPaymentModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        user={user}
        initialAmount={50000}
        onSuccess={() => {
          onRefresh();
        }}
      />

      {/* Withdrawal Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsWithdrawOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-1">Withdraw Funds</h2>
            <p className="text-sm text-slate-400 mb-6">Transfer earnings or capital to your mobile money or bank account.</p>

            {withdrawError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {withdrawError}
              </div>
            )}

            {withdrawMsg && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{withdrawMsg}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Withdrawal Amount (UGX)</span>
                  <span>Available: {formatUGX(wallet.availableBalance)}</span>
                </div>
                <input
                  type="number"
                  min={20000}
                  step={10000}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Destination Method</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="MTN Mobile Money">MTN Mobile Money</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="Stanbic Bank">Stanbic Bank</option>
                  <option value="Centenary Bank">Centenary Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Destination Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 07XXXXXXXX"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={withdrawLoading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm mt-2"
              >
                {withdrawLoading ? 'Processing...' : 'WITHDRAW / SEND MONEY'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
