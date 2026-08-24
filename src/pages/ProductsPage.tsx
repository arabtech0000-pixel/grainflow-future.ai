import React, { useState } from 'react';
import { Product, User, Wallet } from '../types';
import { Package, ShieldCheck, CheckCircle2, AlertCircle, ArrowDownLeft, Clock, Zap, TrendingUp } from 'lucide-react';
import { formatUGX } from '../utils/formatters';
import { ProductCard } from '../components/ProductCard';
import { db } from '../lib/firebase';
import { ref, get, update, push } from 'firebase/database';



interface ProductsPageProps {
  products: Product[];
  user: User;
  wallet: Wallet;
  onOpenDeposit: (product?: Product) => void;
  onRefresh: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  user,
  wallet,
  onOpenDeposit,
  onRefresh
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewStep, setReviewStep] = useState<'idle' | 'reviewing' | 'under_review' | 'success'>('idle');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenInvest = (product: Product) => {
    setSelectedProduct(product);
    setReviewStep('idle');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleConfirmInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (wallet.availableBalance < selectedProduct.investmentAmount) {
      setErrorMsg(`Insufficient balance. You need ${formatUGX(selectedProduct.investmentAmount - wallet.availableBalance)} more.`);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setReviewStep('reviewing');

    // Simulate 2-second review step 1
    setTimeout(async () => {
      setReviewStep('under_review');
      try {
        let apiSuccess = false;
        try {
          const res = await fetch('/api/investments/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid || user.id, productId: selectedProduct.id })
          });
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (res.ok && data.success) {
              apiSuccess = true;
            } else if (!res.ok && data.error) {
              throw new Error(data.error);
            }
          }
        } catch (apiErr: any) {
          if (apiErr.message && !apiErr.message.includes('JSON')) {
            throw apiErr;
          }
        }

        if (!apiSuccess) {
          // Direct Firebase Realtime Database fallback
          const userId = user.uid || user.id;
          const userSnap = await get(ref(db, `users/${userId}`));
          if (!userSnap.exists()) throw new Error("User account not found");
          const uData = userSnap.val();

          if (uData.status && uData.status !== 'active') {
            throw new Error("Account is restricted");
          }

          if ((uData.balance || 0) < selectedProduct.investmentAmount) {
            throw new Error("Insufficient balance");
          }

          const now = Date.now();
          const invRef = push(ref(db, "investments"));
          const txRef = push(ref(db, "transactions"));

          const updates: any = {};
          updates[`users/${userId}/balance`] = (uData.balance || 0) - selectedProduct.investmentAmount;

          updates[`investments/${invRef.key}`] = {
            id: invRef.key,
            userId,
            planId: selectedProduct.id,
            planName: selectedProduct.name,
            investmentAmount: selectedProduct.investmentAmount,
            dailyIncome: selectedProduct.dailyIncome,
            durationDays: selectedProduct.durationDays,
            expectedEarnings: selectedProduct.totalExpectedEarnings || (selectedProduct.dailyIncome * selectedProduct.durationDays),
            totalPayout: selectedProduct.totalPayout || (selectedProduct.investmentAmount + (selectedProduct.dailyIncome * selectedProduct.durationDays)),
            accruedEarnings: 0,
            daysAccrued: 0,
            startDate: now,
            lastAccrualDate: now,
            status: "pending_review",
            createdAt: now,
            updatedAt: now
          };

          updates[`transactions/${txRef.key}`] = {
            id: txRef.key,
            userId,
            type: "investment",
            amount: selectedProduct.investmentAmount,
            description: `Purchased Investment Plan: ${selectedProduct.name}`,
            status: "completed",
            createdAt: now
          };

          await update(ref(db), updates);
        }

        setReviewStep('success');
        setSuccessMsg(`Successfully submitted ${selectedProduct.name} for review! It will become active once approved by administration.`);
        setTimeout(() => {
          setSelectedProduct(null);
          setReviewStep('idle');
          setSuccessMsg('');
          onRefresh();
        }, 2200);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error occurred');
        setReviewStep('idle');
      } finally {
        setLoading(false);
      }
    }, 2000);

  };

  return (
    <div className="space-y-4 pb-20 md:pb-8 max-w-3xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-white">Investment Plans</h2>
          <p className="text-[11px] text-slate-400">
            Select an agricultural investment tier. Daily returns accrue automatically upon administrative approval.
          </p>
        </div>
        <div className="text-right pl-3">
          <div className="text-[9px] font-bold text-slate-400 uppercase">Available Balance</div>
          <div className="text-xs sm:text-sm font-black text-emerald-400">
            {formatUGX(wallet.availableBalance)}
          </div>
        </div>
      </div>

      {/* Product Catalog Grid (Compact Cards with Agricultural Images) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {products.map((prod) => (
          <ProductCard
            key={prod.id}
            product={prod}
            onInvest={handleOpenInvest}
          />
        ))}
      </div>

      {/* Invest Modal with Review Flow */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">Investment Review</h3>
              {reviewStep === 'idle' && (
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-xs transition-colors"
                >✕</button>
              )}
            </div>

            {reviewStep === 'reviewing' && (
              <div className="text-center py-8 space-y-3">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-sm font-bold text-white">Reviewing Investment</div>
                <p className="text-xs text-slate-400">Your investment details are being reviewed...</p>
              </div>
            )}

            {reviewStep === 'under_review' && (
              <div className="text-center py-8 space-y-3">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-sm font-bold text-white">Investment Under Review</div>
                <p className="text-xs text-slate-400">Your investment request has been received and is currently being reviewed.</p>
              </div>
            )}

            {reviewStep === 'success' && (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-white mb-1">Submitted for Approval</div>
                <p className="text-xs text-emerald-400">{successMsg}</p>
              </div>
            )}

            {reviewStep === 'idle' && (
              <form onSubmit={handleConfirmInvestment} className="space-y-4">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center">
                  <div className="text-xs font-bold text-white mb-0.5">{selectedProduct.name}</div>
                  <div className="text-xl font-black text-amber-500 mb-2">{formatUGX(selectedProduct.investmentAmount)}</div>
                  <div className="flex justify-center gap-4 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {selectedProduct.durationDays} Days</span>
                    <span className="flex items-center gap-1 text-emerald-400"><TrendingUp className="w-3 h-3" /> {formatUGX(selectedProduct.dailyIncome)}/day</span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>{errorMsg}</div>
                  </div>
                )}

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 text-[10px] text-slate-400">
                  By confirming, {formatUGX(selectedProduct.investmentAmount)} will be submitted for administrative approval.
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                  >Cancel</button>
                  {wallet.availableBalance < selectedProduct.investmentAmount ? (
                    <button
                      type="button"
                      onClick={() => { setSelectedProduct(null); onOpenDeposit(); }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors"
                    >Deposit Funds</button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all uppercase disabled:opacity-50"
                    >{loading ? 'Processing...' : 'Confirm Payment'}</button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
