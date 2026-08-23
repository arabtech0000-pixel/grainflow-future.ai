import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { Logo } from '../components/Logo';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { ref, get } from 'firebase/database';

interface LoginPageProps {
  onSwitchToSignup: () => void;
  sessionMessage?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignup, sessionMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const userSnap = await get(ref(db, 'users/' + cred.user.uid));
      
      if (userSnap.exists() && userSnap.val().status === 'suspended') {
        await auth.signOut();
        throw new Error('Your account is suspended. Please contact administration.');
      }
      
      // Auth listener in App.tsx handles the rest
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else {
        setError(err.message || 'An error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Logo iconClassName="w-10 h-10 text-slate-950" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-white">
          GRAIN FLOW
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Sign in to manage your agricultural investments & daily returns
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-6 px-4 shadow-xl sm:rounded-3xl sm:px-8 border border-slate-800">
          {sessionMessage && (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3.5 py-2.5 rounded-xl text-xs font-medium text-center">
              {sessionMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-3.5 py-2.5 rounded-xl text-xs">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300">Email Address</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-xs"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => alert("Please contact support hotline or email support to reset your account password.")}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-xs"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-amber-500/20 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 focus:outline-none transition-all uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-amber-400 font-bold hover:underline ml-1"
              >
                Create Account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
