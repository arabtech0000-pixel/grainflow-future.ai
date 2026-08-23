import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, Users, ArrowDownLeft, ArrowUpRight, TrendingUp, CheckCircle, XCircle, AlertCircle, RefreshCw, X, Trash2, Package } from 'lucide-react';
import { AdminStats, Product, DepositRequest, WithdrawalRequest, User, Investment } from '../types';
import { formatUGX, formatDate } from '../utils/formatters';
import { auth, db, storage } from '../lib/firebase';
import { ref, onValue, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Logo } from '../components/Logo';

interface AdminPageProps {
  onRefresh: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'deposits' | 'withdrawals' | 'investments' | 'users'>('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalInvestments: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalEarningsPaid: 0,
    pendingTransactions: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0
  });

  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [investmentsList, setInvestmentsList] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [brokenScreenshots, setBrokenScreenshots] = useState<{ [key: string]: boolean }>({});

  const fetchAdminDeposits = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/deposits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch deposits');
      const data = await res.json();
      
      const deps = (data.deposits || []).map((dep: any) => ({
        ...dep,
        date: new Date(dep.createdAt || Date.now()).toISOString()
      }));
      
      let pending = 0;
      let totalCompleted = 0;
      deps.forEach((dep: any) => {
        if (dep.status === 'PENDING_ADMIN_APPROVAL' || dep.status === 'pending') pending++;
        if (dep.status === 'completed' || dep.status === 'APPROVED') totalCompleted += Number(dep.amount || 0);
      });
      
      setDeposits(deps);
      setStats(prev => ({
        ...prev,
        pendingDeposits: pending,
        totalDeposits: totalCompleted,
        pendingTransactions: prev.pendingWithdrawals + pending
      }));
    } catch (e) {
      console.error('Error fetching admin deposits:', e);
    }
  }, []);

  useEffect(() => {
    fetchAdminDeposits();
    const interval = setInterval(fetchAdminDeposits, 5000);

    const unsubUsers = onValue(ref(db, 'users'), (snap) => {
      if (!snap.exists()) return;
      const usrs: any[] = [];
      snap.forEach(child => {
        const val = child.val() || {};
        const uid = val.uid || child.key;
        usrs.push({ ...val, id: child.key, uid });
      });
      setUsers(usrs);
      
      setStats(prev => ({
        ...prev,
        totalUsers: usrs.length,
        activeUsers: usrs.filter(u => u.status === 'active').length
      }));
    });

    const unsubWit = onValue(ref(db, 'withdrawals'), (snap) => {
      if (!snap.exists()) {
        setWithdrawals([]);
        return;
      }
      const wits: any[] = [];
      let pending = 0;
      let totalCompleted = 0;
      snap.forEach(child => {
        const wit = child.val();
        wits.push({
          ...wit,
          id: child.key,
          date: new Date(wit.createdAt || Date.now()).toISOString()
        });
        if (wit.status === 'pending') pending++;
        if (wit.status === 'completed') totalCompleted += Number(wit.amount || 0);
      });
      wits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setWithdrawals(wits);
      setStats(prev => ({
        ...prev,
        pendingWithdrawals: pending,
        totalWithdrawals: totalCompleted,
        pendingTransactions: prev.pendingDeposits + pending
      }));
    });

    const unsubInv = onValue(ref(db, 'investments'), (snap) => {
      if (!snap.exists()) {
        setInvestmentsList([]);
        setLoading(false);
        return;
      }
      const invs: any[] = [];
      let totalInv = 0;
      let totalEarned = 0;
      snap.forEach(child => {
        const i = child.val();
        invs.push({
          ...i,
          id: child.key,
          date: new Date(i.createdAt || i.startDate || Date.now()).toISOString()
        });
        if (i.status === 'active') totalInv++;
        totalEarned += Number(i.accruedEarnings || 0);
      });
      invs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setInvestmentsList(invs);
      setStats(prev => ({
        ...prev,
        totalInvestments: totalInv,
        totalEarningsPaid: totalEarned
      }));
      setLoading(false);
    });

    return () => {
      clearInterval(interval);
      unsubUsers();
      unsubWit();
      unsubInv();
    };
  }, [fetchAdminDeposits]);

  const handleDepositAction = async (id: string, action: 'completed' | 'APPROVED' | 'REJECTED') => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Action failed');
      }
      onRefresh();
      fetchAdminDeposits();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleWithdrawalAction = async (id: string, action: 'completed' | 'REJECTED') => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Action failed');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleInvestmentAction = async (id: string, action: 'active' | 'cancelled') => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/investments/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Action failed');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleClearDepositHistory = async () => {
    if (!confirm('Are you sure you want to clear completed and rejected deposit history? This action is irreversible.')) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/deposits/history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to clear history');
      }
      const data = await res.json();
      alert(`Cleared ${data.count || 0} deposit record(s).`);
      fetchAdminDeposits();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getUserName = (uid: string) => {
    const u = users.find(user => user.uid === uid || user.id === uid);
    return u ? (u.fullName || u.email || uid.substring(0, 8)) : uid.substring(0, 8);
  };

  const updateUserStatus = async (uid: string, status: 'active' | 'suspended' | 'deleted') => {
    if (!confirm(`Are you sure you want to set this user to ${status}?`)) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (status === 'deleted') {
        if (!confirm('This action is irreversible. The user will be completely deleted from authentication and the database. Continue?')) return;
        const res = await fetch(`/api/admin/users/${uid}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to delete user');
        }
      } else {
        const res = await fetch(`/api/admin/users/${uid}/status`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Action failed');
        }
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const pendingInvestmentsCount = investmentsList.filter(i => i.status === 'pending_review').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Admin Dashboard</h2>
            <p className="text-[11px] text-slate-400 font-medium">Platform management & approvals</p>
          </div>
        </div>
        {(stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0 || pendingInvestmentsCount > 0) && (
          <div className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-xl border border-red-500/20 text-[10px] font-bold flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-pulse"></span>
            {stats.pendingDeposits + stats.pendingWithdrawals + pendingInvestmentsCount} Pending Tasks
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-1 hide-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'deposits', label: `Deposits ${stats.pendingDeposits > 0 ? `(${stats.pendingDeposits})` : ''}`, icon: ArrowDownLeft },
          { id: 'withdrawals', label: `Withdrawals ${stats.pendingWithdrawals > 0 ? `(${stats.pendingWithdrawals})` : ''}`, icon: ArrowUpRight },
          { id: 'investments', label: `Investments ${pendingInvestmentsCount > 0 ? `(${pendingInvestmentsCount})` : ''}`, icon: Package },
          { id: 'users', label: 'Users', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                isActive 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Users</div>
            <div className="text-xl font-black text-white">{stats.totalUsers}</div>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Active Investments</div>
            <div className="text-xl font-black text-amber-500">{stats.totalInvestments}</div>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Deposits</div>
            <div className="text-xl font-black text-emerald-400">{formatUGX(stats.totalDeposits)}</div>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Withdrawals</div>
            <div className="text-xl font-black text-orange-400">{formatUGX(stats.totalWithdrawals)}</div>
          </div>
        </div>
      )}

      {/* Deposits Tab */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">Pending Deposits</h3>
            <button 
              onClick={handleClearDepositHistory}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </button>
          </div>
          {deposits.filter(d => d.status === 'PENDING_ADMIN_APPROVAL' || d.status === 'pending' || d.status === 'pending_approval').length === 0 ? (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center text-slate-400 text-sm">
              No pending deposit requests.
            </div>
          ) : (
            deposits.filter(d => d.status === 'PENDING_ADMIN_APPROVAL' || d.status === 'pending' || d.status === 'pending_approval').map((dep, index) => {
              const depKey = `dep-${dep.id || dep.reference || index}`;
              return (
                <div key={depKey} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col gap-4 max-w-xl">
                  
                  {/* User Account */}
                  <div>
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">User Account</span>
                    <div className="text-white font-bold text-base mt-1">{dep.userEmail || dep.userName || dep.userId}</div>
                  </div>

                  {/* Amount */}
                  <div>
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Amount</span>
                    <div className="text-emerald-400 font-black text-xl mt-1">{formatUGX(dep.amount)}</div>
                  </div>

                  {/* Screenshot */}
                  <div>
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Payment Screenshot</span>
                    {dep.screenshot && !brokenScreenshots[depKey] ? (
                      <div 
                        onClick={() => setSelectedScreenshot(dep.screenshot)}
                        className="w-32 h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center relative group"
                      >
                        <img 
                          src={dep.screenshot} 
                          alt="Payment Proof" 
                          className="w-full h-full object-cover"
                          onError={() => {
                            setBrokenScreenshots(prev => ({ ...prev, [depKey]: true }));
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <span className="text-white text-xs font-bold">View Full</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                        <span className="text-slate-500 text-xs text-center p-2">
                          {brokenScreenshots[depKey] ? 'Error loading image' : 'No screenshot provided'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-2 pt-4 border-t border-slate-800/50">
                    <button
                      onClick={async () => {
                        await handleDepositAction(dep.id, 'APPROVED');
                        fetchAdminDeposits();
                      }}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={async () => {
                        await handleDepositAction(dep.id, 'REJECTED');
                        fetchAdminDeposits();
                      }}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-xl text-sm font-bold transition-colors"
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Screenshot Preview Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Payment Screenshot Proof</h3>
            <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 p-2 max-h-[70vh] flex items-center justify-center">
              <img src={selectedScreenshot} alt="Full Payment Proof" className="max-h-[65vh] object-contain rounded-xl" />
            </div>
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Withdrawals Tab */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-3">
          {withdrawals.length === 0 ? (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
              No withdrawal requests found.
            </div>
          ) : (
            withdrawals.map((wit, index) => (
              <div key={`wit-${wit.id || wit.reference || index}`} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm">{wit.userName || getUserName(wit.userId)}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      wit.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      wit.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {wit.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 space-x-2">
                    <span>{wit.bankName}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-300">{wit.accountNumber}</span>
                  </div>
                  <div className="text-xs font-black text-orange-400 mt-1">{formatUGX(wit.amount)}</div>
                </div>
                
                {wit.status === 'pending' && (
                  <div className="flex gap-2 w-full md:w-auto shrink-0">
                    <button
                      onClick={() => handleWithdrawalAction(wit.id, 'completed')}
                      className="flex-1 md:flex-none px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleWithdrawalAction(wit.id, 'REJECTED')}
                      className="flex-1 md:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Investments Tab */}
      {activeTab === 'investments' && (
        <div className="space-y-3">
          {investmentsList.length === 0 ? (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
              No investment plans recorded yet.
            </div>
          ) : (
            investmentsList.map((inv, index) => (
              <div key={`inv-${inv.id || index}`} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{inv.planName}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      inv.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      inv.status === 'pending_review' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      inv.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {inv.status === 'pending_review' ? 'Pending Approval' : inv.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    User: <span className="font-semibold text-white">{getUserName(inv.userId)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex flex-wrap gap-2">
                    <span>Invested: <strong className="text-white">{formatUGX(inv.investmentAmount)}</strong></span>
                    <span>•</span>
                    <span>Daily: <strong className="text-emerald-400">+{formatUGX(inv.dailyIncome)}/day</strong></span>
                    <span>•</span>
                    <span>Duration: <strong className="text-slate-300">{inv.durationDays} Days</strong></span>
                    <span>•</span>
                    <span>Accrued: <strong className="text-amber-400">{formatUGX(inv.accruedEarnings || 0)}</strong></span>
                  </div>
                </div>

                {inv.status === 'pending_review' && (
                  <div className="flex gap-2 w-full md:w-auto shrink-0">
                    <button
                      onClick={() => handleInvestmentAction(inv.id, 'active')}
                      className="flex-1 md:flex-none px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve Plan
                    </button>
                    <button
                      onClick={() => handleInvestmentAction(inv.id, 'cancelled')}
                      className="flex-1 md:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject Plan
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role / Status</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {users.map((u, index) => {
                  const userKey = `user-${u.uid || u.id || index}`;
                  const userTargetId = u.uid || u.id;
                  return (
                    <tr key={userKey} className="hover:bg-slate-800/20">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white mb-0.5">{u.fullName || 'User'}</div>
                        <div className="text-[10px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase mb-1 border border-slate-700 bg-slate-800 text-slate-300">
                          {u.role}
                        </div>
                        <div className={`text-[10px] font-bold ${
                          u.status === 'active' ? 'text-emerald-400' : 
                          u.status === 'suspended' ? 'text-amber-400' : 'text-red-400'
                        }`}>{u.status}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-amber-500">
                        {formatUGX(u.balance || 0)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {u.status !== 'suspended' && u.status !== 'deleted' && (
                          <button onClick={() => updateUserStatus(userTargetId, 'suspended')} className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded">Suspend</button>
                        )}
                        {u.status === 'suspended' && (
                          <button onClick={() => updateUserStatus(userTargetId, 'active')} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">Activate</button>
                        )}
                        {u.status !== 'deleted' && (
                          <button onClick={() => updateUserStatus(userTargetId, 'deleted')} className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded">Delete</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
