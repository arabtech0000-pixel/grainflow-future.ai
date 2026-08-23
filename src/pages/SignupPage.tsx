import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, Phone, ArrowRight, Share2 } from 'lucide-react';
import { User } from '../types';
import { Logo } from '../components/Logo';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get, serverTimestamp } from 'firebase/database';
import { auth, db } from '../lib/firebase';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSwitchToLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      const trimmed = refParam.trim().toUpperCase();
      setReferralCode(trimmed);
      const attribution = {
        code: trimmed,
        timestamp: Date.now()
      };
      localStorage.setItem('grainflow_ref_attribution', JSON.stringify(attribution));
    } else {
      const storedAttributionStr = localStorage.getItem('grainflow_ref_attribution');
      if (storedAttributionStr) {
        try {
          const attr = JSON.parse(storedAttributionStr);
          const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
          if (attr && attr.code && (Date.now() - attr.timestamp < THIRTY_DAYS)) {
            setReferralCode(attr.code);
          } else {
            localStorage.removeItem('grainflow_ref_attribution');
          }
        } catch (e) {
          const storedRef = localStorage.getItem('grainflow_ref');
          if (storedRef) {
            setReferralCode(storedRef);
          }
        }
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the terms and conditions');
      return;
    }

    setLoading(true);

    try {
      const trimmedRef = referralCode.trim().toUpperCase();
      let referrerUid: string | null = null;
      let validReferralCode: string | null = null;

      const usersSnap = await get(ref(db, 'users'));
      const existingCodes = new Set<string>();
      const allUsers = usersSnap.exists() ? usersSnap.val() : {};

      for (const [uId, uData] of Object.entries(allUsers) as [string, any]) {
        if (uData.referralCode) {
          existingCodes.add(uData.referralCode);
        }
        if (trimmedRef && (uData.referralCode === trimmedRef || uId === trimmedRef)) {
          referrerUid = uId;
          validReferralCode = uData.referralCode || trimmedRef;
        }
      }

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      
      if (referrerUid === cred.user.uid) {
        throw new Error("You cannot refer yourself.");
      }

      // Generate collision-free unique referral code
      let userRefCode = '';
      let isUnique = false;
      const baseName = (fullName.trim().substring(0, 3) || 'AGR').toUpperCase().replace(/[^A-Z]/g, 'AGR');
      for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = `${baseName}${Math.floor(1000 + Math.random() * 9000)}`;
        if (!existingCodes.has(candidate)) {
          userRefCode = candidate;
          isUnique = true;
          break;
        }
      }
      if (!isUnique) {
        userRefCode = 'GF' + Math.floor(100000 + Math.random() * 900000);
      }
      
      const updates: any = {};
      updates[`users/${cred.user.uid}`] = {
        uid: cred.user.uid,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: "user",
        balance: 0,
        totalEarnings: 0,
        referralCode: userRefCode,
        referredBy: referrerUid ? validReferralCode : null,
        referralEarnings: 0,
        totalReferrals: 0,
        status: "active",
        createdAt: serverTimestamp()
      };

      if (referrerUid) {
        updates[`referrals/${referrerUid}/${cred.user.uid}`] = {
          userId: cred.user.uid,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          createdAt: serverTimestamp(),
          status: 'active'
        };
      }

      await set(ref(db), updates);
      localStorage.removeItem('grainflow_ref_attribution');
      localStorage.removeItem('grainflow_ref');
      // Auth listener in App.tsx will pick up the logged in user automatically
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered');
      } else {
        setError(err.message || 'An error occurred during registration');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-8 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Logo iconClassName="w-10 h-10 text-slate-950" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-white">
          Create Grain Flow Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Join Grain Flow to start earning daily agricultural yields
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-6 px-4 shadow-xl sm:rounded-3xl sm:px-8 border border-slate-800">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-3.5 py-2.5 rounded-xl text-xs">
              {error}
            </div>
          )}

          <form className="space-y-3.5 text-xs" onSubmit={handleSubmit}>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="e.g. Samuel Kigozi"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Phone Number (MTN / Airtel)</label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="+256 700 000 000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-8 pr-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-amber-500 outline-none text-xs"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Confirm</label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-8 pr-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-amber-500 outline-none text-xs"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Referral Code (Optional)</label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Share2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 font-mono uppercase focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="e.g. ASHRAF01"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-0"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-400">
                I agree to the platform investment terms & privacy policy.
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-md shadow-amber-500/20 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition-all uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Complete Registration'}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-amber-400 font-bold hover:underline ml-1"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
