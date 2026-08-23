import React, { useState, useEffect, useCallback } from 'react';
import { User, Wallet, Product, Investment, Transaction, ReferralData } from './types';
import { Navigation } from './components/Navigation';
import { Logo } from './components/Logo';
import { MarziPaymentModal } from './components/MarziPaymentModal';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { TeamPage } from './pages/TeamPage';
import { AccountPage } from './pages/AccountPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { formatUGX } from './utils/formatters';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, get, set } from 'firebase/database';
import { Headphones } from 'lucide-react';
import { isValidUgandanPhoneNumber } from './utils/validators';


export const APP_NAME = "Grain Flow";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');

  // 5-minute inactivity security timeout
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes
    
    const updateActivity = () => {
      localStorage.setItem('grainflow_last_active', String(Date.now()));
    };

    if (!localStorage.getItem('grainflow_last_active')) {
      updateActivity();
    }

    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    const checkInterval = setInterval(async () => {
      const lastActiveStr = localStorage.getItem('grainflow_last_active');
      const lastActive = lastActiveStr ? Number(lastActiveStr) : Date.now();
      const now = Date.now();

      if (now - lastActive > INACTIVITY_LIMIT) {
        try {
          await signOut(auth);
        } catch (e) {
          console.error(e);
        }
        localStorage.removeItem('grainflow_last_active');
        setUser(null);
        setSessionExpiredMessage('Your session expired due to inactivity. Please log in again to continue.');
      }
    }, 5000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'grainflow_last_active' && !e.newValue && user) {
        signOut(auth).catch(() => {});
        setUser(null);
        setSessionExpiredMessage('Your session expired due to inactivity. Please log in again to continue.');
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(checkInterval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user]);

  // App Data State
  const [wallet, setWallet] = useState<Wallet>({
    userId: '',
    availableBalance: 0,
    totalDeposited: 0,
    totalInvested: 0,
    totalEarnings: 0,
    pendingWithdrawals: 0
  });
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [referralData, setReferralData] = useState<ReferralData>({
    referralCode: '',
    referralLink: '',
    totalReferrals: 0,
    referralEarnings: 0,
    teamMembers: []
  });

  // Modals state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositProduct, setDepositProduct] = useState<Product | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(20000);
  const [depositMethod, setDepositMethod] = useState('MTN Mobile Money');
  const [depositPhone, setDepositPhone] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositMsg, setDepositMsg] = useState('');

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(10000);
  const [withdrawNumber, setWithdrawNumber] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('MTN Mobile Money');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState('');

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = ref(db, `users/${firebaseUser.uid}`);
        const userSnap = await get(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.val() as User);
        } else {
          const isAdmin = firebaseUser.email?.toLowerCase() === 'ashirafashes04@gmail.com';
          const newUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            fullName: isAdmin ? 'Ashraf H' : (firebaseUser.email?.split('@')[0] || 'User'),
            phone: '+256700000000',
            role: isAdmin ? 'admin' : 'user',
            balance: 0,
            totalEarnings: 0,
            referralCode: isAdmin ? 'ASHRAF01' : (firebaseUser.email?.substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900)),
            referredBy: null,
            referralEarnings: 0,
            totalReferrals: 0,
            status: 'active',
            createdAt: Date.now()
          };
          await set(userRef, newUser);
          setUser(newUser as User);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    
    // Trigger backend earnings synchronization
    fetch('/api/user/sync-earnings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.uid })
    }).catch(() => {});

    // Realtime User Updates
    const userUnsub = onValue(ref(db, `users/${user.uid}`), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setUser(data as User);
        setWallet(prev => ({
          ...prev,
          userId: user.uid,
          availableBalance: data.balance || 0,
          totalEarnings: Math.max(data.totalEarnings || 0, prev.totalEarnings)
        }));
        setReferralData(prev => ({
          ...prev,
          referralCode: data.referralCode,
          referralLink: window.location.origin,
          referralEarnings: 0
        }));
      }
    });

    // Realtime Investments
    const invUnsub = onValue(ref(db, 'investments'), (snap) => {
      if (!snap.exists()) {
        setInvestments([]);
        setWallet(prev => ({ ...prev, totalInvested: 0, totalEarnings: 0 }));
        return;
      }
      const invs: any = [];
      let totalInvested = 0;
      let calculatedEarnings = 0;
      snap.forEach(child => {
        const i = child.val();
        if (i && i.userId === user.uid) {
          const invStartDate = Number(i.startDate || i.createdAt || Date.now());
          const durationDays = Number(i.durationDays || 0);
          const dailyIncome = Number(i.dailyIncome || 0);
          const investmentAmount = Number(i.investmentAmount || 0);
          const accruedEarnings = Number(i.accruedEarnings || 0);
          const daysAccrued = Number(i.daysAccrued || 0);
          const expectedProfit = Number(i.expectedEarnings) || (dailyIncome * durationDays);

          invs.push({
            ...i,
            id: child.key,
            investmentAmount,
            dailyIncome,
            durationDays,
            expectedEarnings: expectedProfit,
            accruedEarnings,
            daysAccrued,
            startDate: new Date(invStartDate).toISOString(),
            endDate: new Date(invStartDate + (durationDays * 24 * 60 * 60 * 1000)).toISOString()
          });

          if (i.status === 'active' || i.status === 'APPROVED' || i.status === 'completed') {
            totalInvested += investmentAmount;
            calculatedEarnings += expectedProfit;
          }
        }
      });
      setInvestments(invs);
      setWallet(prev => ({ 
        ...prev, 
        totalInvested,
        totalEarnings: calculatedEarnings
      }));
    });

    // Realtime Transactions
    const txUnsub = onValue(ref(db, 'transactions'), (snap) => {
      if (!snap.exists()) {
        setTransactions([]);
        return;
      }
      const txs: any = [];
      snap.forEach(child => {
        const t = child.val();
        if (t.userId === user.uid) {
          txs.push({
            ...t,
            id: child.key,
            date: new Date(t.createdAt || Date.now()).toISOString()
          });
        }
      });
      txs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(txs);
    });

    // Realtime Team
    let teamUnsub: any = null;
    if (user.referralCode) {
      teamUnsub = onValue(ref(db, 'users'), (snap) => {
        if (!snap.exists()) return;
        const team: any = [];
        snap.forEach(child => {
          const t = child.val();
          if (t.referredBy === user.referralCode) {
            team.push({
              id: child.key,
              fullName: t.fullName,
              email: t.email,
              joinedDate: new Date(t.createdAt || Date.now()).toISOString()
            });
          }
        });
        setReferralData(prev => ({
          ...prev,
          totalReferrals: team.length,
          teamMembers: team
        }));
      });
    }
    
    return () => {
      userUnsub();
      invUnsub();
      txUnsub();
      if (teamUnsub) teamUnsub();
    };
  }, [user?.uid, user?.referralCode]);

  // Load Products globally
  useEffect(() => {
    const unsub = onValue(ref(db, 'products'), (snap) => {
      if (!snap.exists()) {
        setProducts([]);
        return;
      }
      const prods: any = [];
      snap.forEach(child => {
        const p = child.val();
        if (p.isActive) {
          prods.push({ ...p, id: child.key });
        }
      });
      prods.sort((a: any, b: any) => a.investmentAmount - b.investmentAmount);
      setProducts(prods);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
      const cleanup = loadUserData();
      return () => { cleanup.then(fn => fn && fn()) };
    }
  }, [user?.uid, loadUserData]);

  const openDeposit = (product?: Product) => {
    setDepositError('');
    setDepositMsg('');
    if (user?.phone) {
      setDepositPhone(user.phone);
    }
    if (product) {
      setDepositProduct(product);
      setDepositAmount(product.investmentAmount);
    } else {
      setDepositProduct(null);
      setDepositAmount(20000);
    }
    setIsDepositOpen(true);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setCurrentTab('home');
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError('');
    setDepositMsg('');

    if (!user) {
      setDepositError('Please log in to make a deposit.');
      return;
    }

    if (!isValidUgandanPhoneNumber(depositPhone)) {
      setDepositError('Please enter a valid Ugandan mobile money number (e.g. 07XXXXXXXX or +2567XXXXXXXX)');
      return;
    }

    if (!depositAmount || depositAmount < 20000) {
      setDepositError('Minimum deposit amount is UGX 20,000');
      return;
    }

    setDepositLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const body: any = { userId: user.uid, amount: depositAmount, method: depositMethod, phone: depositPhone };
      if (depositProduct) body.productId = depositProduct.id;

      const res = await fetch('/api/deposits/request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response:", text);
        throw new Error("Payment service returned an invalid response. Please try again later.");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Deposit initiation failed. Please try again.');
      }

      setDepositMsg(data.message || 'Payment request sent. Please check your phone and approve the mobile-money payment.');
      setTimeout(() => {
        setIsDepositOpen(false);
        setDepositMsg('');
        setDepositProduct(null);
      }, 5000);
    } catch (err: any) {
      setDepositError(err.message || 'An error occurred during payment initiation.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isValidUgandanPhoneNumber(withdrawNumber)) {
      alert('Please enter a valid Ugandan mobile money number (e.g. 07XXXXXXXX)');
      return;
    }
    setWithdrawLoading(true);
    setWithdrawMsg('');
    try {
      if (wallet.availableBalance < withdrawAmount) {
        throw new Error("Insufficient available balance");
      }
      
      const res = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, amount: withdrawAmount, accountNumber: withdrawNumber, bankName: withdrawBank })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit withdrawal');
      
      setWithdrawMsg('Withdrawal request submitted successfully!');
      setTimeout(() => {
        setIsWithdrawOpen(false);
        setWithdrawMsg('');
      }, 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-amber-500">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 animate-pulse">
          <Logo iconClassName="w-12 h-12 text-slate-950" />
        </div>
        <div className="text-amber-500 font-bold uppercase tracking-wider text-xs">Loading Grain Flow...</div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'signup') {
      return <SignupPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToSignup={() => setAuthView('signup')} sessionMessage={sessionExpiredMessage} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navigation currentTab={currentTab} setCurrentTab={setCurrentTab} user={user} onLogout={handleLogout} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6">
        {currentTab === 'home' && (
          <HomePage
            user={user}
            wallet={wallet}
            investments={investments}
            products={products}
            transactions={transactions}
            setCurrentTab={setCurrentTab}
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenWithdraw={() => setIsWithdrawOpen(true)}
            onRefresh={loadUserData}
          />
        )}
        {currentTab === 'products' && (
          <ProductsPage
            products={products}
            user={user}
            wallet={wallet}
            onOpenDeposit={() => openDeposit()}
            onRefresh={loadUserData}
          />
        )}
        {currentTab === 'team' && (
          <TeamPage
            user={user}
            referralData={referralData}
            onRefresh={loadUserData}
          />
        )}
        {currentTab === 'account' && (
          <AccountPage
            user={user}
            wallet={wallet}
            investments={investments}
            transactions={transactions}
            referralData={referralData}
            setCurrentTab={setCurrentTab}
            onLogout={handleLogout}
            onOpenDeposit={() => openDeposit()}
            onOpenWithdraw={() => setIsWithdrawOpen(true)}
            onRefresh={loadUserData}
          />
        )}
        {currentTab === 'profile' && (
          <ProfilePage
            user={user}
            wallet={wallet}
            investments={investments}
            onLogout={handleLogout}
          />
        )}
        {currentTab === 'admin' && user.role === 'admin' && (
          <AdminPage onRefresh={loadUserData} />
        )}
      </main>

      {/* MarziPay Mobile Money Deposit Modal */}
      <MarziPaymentModal
        isOpen={isDepositOpen}
        onClose={() => {
          setIsDepositOpen(false);
          setDepositProduct(null);
        }}
        user={user}
        product={depositProduct}
        initialAmount={depositAmount}
        onSuccess={() => {
          loadUserData();
        }}
      />

      {/* Withdrawal Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Withdraw Funds</h3>
                <p className="text-[11px] text-slate-400">Payout to your mobile money or bank</p>
              </div>
              <button
                onClick={() => setIsWithdrawOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
              >✕</button>
            </div>
            {withdrawMsg ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-center text-xs font-semibold">{withdrawMsg}</div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-3.5 text-xs">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Available Balance:</span>
                  <span className="text-emerald-400 font-bold text-sm">{formatUGX(wallet.availableBalance)}</span>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payout Method</label>
                  <select
                    value={withdrawBank}
                    onChange={(e) => setWithdrawBank(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  >
                    <option value="MTN Mobile Money">MTN Mobile Money</option>
                    <option value="Airtel Money">Airtel Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mobile Money Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0770000000"
                    value={withdrawNumber}
                    onChange={(e) => setWithdrawNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Withdrawal Amount (UGX)</label>
                  <input
                    type="number"
                    min="10000"
                    max={wallet.availableBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    required
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                    <span>Min: UGX 10,000</span>
                    {wallet.availableBalance >= 10000 && (
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(wallet.availableBalance)}
                        className="text-amber-400 font-bold hover:underline"
                      >Max All</button>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={withdrawLoading || withdrawAmount > wallet.availableBalance || wallet.availableBalance < 10000}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all uppercase tracking-wide disabled:opacity-40"
                >{withdrawLoading ? 'Processing...' : 'Confirm Withdrawal'}</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating Support Button */}
    </div>
  );
}
