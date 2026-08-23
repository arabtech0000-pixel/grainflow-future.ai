import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  Upload,
  ExternalLink,
  Clock
} from 'lucide-react';
import { formatUGX } from '../utils/formatters';
import { Product, User } from '../types';

import { auth, storage } from '../lib/firebase';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

interface MarziPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  product?: Product | null;
  initialAmount?: number;
  onSuccess?: () => void;
}

export const MarziPaymentModal: React.FC<MarziPaymentModalProps> = ({
  isOpen,
  onClose,
  user,
  product,
  initialAmount = 50000,
  onSuccess
}) => {
  const [step, setStep] = useState<'input' | 'payment_and_proof' | 'submitted_pending'>('input');
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(initialAmount);
  
  const [depositId, setDepositId] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [lockedAmount, setLockedAmount] = useState<number>(initialAmount);
  
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setLoading(false);
      setErrorMessage('');
      setScreenshotPreview('');
      if (product) {
        setAmount(product.investmentAmount);
      } else if (initialAmount) {
        setAmount(initialAmount);
      }
    }
  }, [isOpen, product, initialAmount]);

  if (!isOpen) return null;

  // Step 1: Start deposit by hitting the server to create PENDING_PAYMENT transaction, then open gateway
  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!user) {
      setErrorMessage('Please log in to your account to deposit.');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('Please enter a valid deposit amount.');
      return;
    }

    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/deposits/request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.uid || user.id,
          email: user.email,
          amount: numAmount,
          method: 'MarzPay',
          productId: product?.id
        })
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
        throw new Error(data.error || 'Failed to start deposit');
      }

      setDepositId(data.depositId);
      setReference(data.reference);
      setLockedAmount(data.amount || numAmount);
      setStep('payment_and_proof');

      // Open MasrPay hosted payment gateway in a new tab
      try {
        const newWindow = window.open('https://wallet.wearemarz.com/pay/d6e9f656-9712-4d9b-b967-8a6b273d0e60', '_blank');
        if (!newWindow) {
          console.warn('Popup blocked by browser; fallback link available.');
        }
      } catch (err) {
        console.warn('Window open error:', err);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMasrPayAgain = () => {
    window.open('https://wallet.wearemarz.com/pay/d6e9f656-9712-4d9b-b967-8a6b273d0e60', '_blank');
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(reader.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please upload a valid image file (JPG, JPEG, PNG, or WEBP).');
      return;
    }

    setErrorMessage('');
    try {
      const compressedDataUrl = await compressImage(file);
      if (compressedDataUrl) {
        setScreenshotPreview(compressedDataUrl);
      } else {
        setErrorMessage('Failed to process image. Please try another file.');
      }
    } catch {
      setErrorMessage('Failed to process image. Please try another file.');
    }
  };

  // Step 2: Submit payment screenshot proof to backend for admin approval
  const handleSubmitProof = async () => {
    if (!screenshotPreview) {
      setErrorMessage('Please upload a screenshot of your completed payment.');
      return;
    }

    if (loading) {
      return; // Prevent duplicate concurrent submissions
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Retrieve authorization token with timeout protection
      let token: string | undefined;
      try {
        token = await Promise.race([
          auth.currentUser?.getIdToken(),
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3000))
        ]);
      } catch (tErr) {
        console.warn('Token fetch warning:', tErr);
      }

      // 2. Prepare payload with optimized screenshot
      const payload = {
        depositId: depositId || `dep_${Date.now()}`,
        amount: lockedAmount,
        userId: user?.uid || user?.id,
        userName: user?.fullName || 'User',
        userEmail: user?.email || '',
        reference,
        screenshot: screenshotPreview
      };

      // 3. Submit proof payload with 15-second abort controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let res: Response;
      try {
        res = await fetch('/api/deposits/submit-proof', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
          data = { success: true };
        }
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to submit payment proof.');
      }

      // 4. Transition view to pending approval confirmation
      setStep('submitted_pending');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('[Submit Proof Error]:', err);
      if (err.name === 'AbortError') {
        setErrorMessage('Request timed out. Please check your network and try again.');
      } else {
        setErrorMessage(err.message || 'Failed to submit payment proof. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'submitted_pending' ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Awaiting Admin Approval</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Your payment screenshot has been submitted. Your wallet will be credited after an administrator approves the deposit.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left mb-6 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono text-white">{reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Locked Amount:</span>
                <span className="text-emerald-400 font-bold">{formatUGX(lockedAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="text-amber-400 font-bold uppercase tracking-wider">Pending Admin Approval</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
            >
              Done / Return to Wallet
            </button>
          </div>
        ) : step === 'payment_and_proof' ? (
          <div>
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ExternalLink className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Payment Submitted</h3>
                <p className="text-xs text-slate-400">Upload a screenshot of your completed payment for verification.</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Locked Information Summary */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Deposit Amount (Locked):</span>
                  <span className="font-bold text-emerald-400 text-sm">{formatUGX(lockedAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Reference ID:</span>
                  <span className="font-mono text-slate-400">{reference}</span>
                </div>
              </div>

              {/* Action: Open MasrPay Again if popup was blocked */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3 flex items-center justify-between">
                <span className="text-xs text-slate-300">Need to complete payment on MasrPay?</span>
                <button
                  type="button"
                  onClick={handleOpenMasrPayAgain}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Gateway</span>
                </button>
              </div>

              {/* Action: Upload Screenshot */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Upload Payment Screenshot (JPG, PNG, WEBP)
                </label>

                {screenshotPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-2 text-center">
                    <img 
                      src={screenshotPreview} 
                      alt="Payment Proof Preview" 
                      className="max-h-36 mx-auto rounded-xl object-contain mb-2"
                    />
                    <div className="flex justify-center space-x-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors">
                        <span>Replace Screenshot</span>
                        <input 
                          type="file" 
                          accept="image/jpeg,image/jpg,image/png,image/webp" 
                          onChange={handleFileChange} 
                          className="hidden" 
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setScreenshotPreview('')}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-all group">
                    <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center mb-2 transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-300">Click to upload payment screenshot</span>
                    <span className="text-[10px] text-slate-500 mt-1">Supports JPG, PNG, WEBP</span>
                    <input 
                      type="file" 
                      accept="image/jpeg,image/jpg,image/png,image/webp" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>

              <button
                type="button"
                disabled={loading || !screenshotPreview}
                onClick={handleSubmitProof}
                className="w-full mt-2 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>SUBMIT FOR APPROVAL</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Wallet Deposit</h3>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleMakePayment} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Amount (UGX)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-500 font-bold text-sm">UGX</span>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    disabled={!!product}
                    className="w-full pl-14 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                    required
                  />
                </div>
                {product && (
                  <p className="text-[11px] text-amber-400 mt-1">Amount locked for selected investment plan.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>MAKE PAYMENT →</span>
                )}
              </button>

              <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-400 pt-1 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Your deposit will be locked while payment is being processed.</span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
