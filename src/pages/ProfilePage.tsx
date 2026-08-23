import React, { useState } from 'react';
import { User, Shield, Bell, Lock, HelpCircle, FileText, LogOut, ChevronRight, CheckCircle2, UserCheck, PhoneCall, Info } from 'lucide-react';
import { User as UserType } from '../types';
import { formatDate } from '../utils/formatters';

interface ProfilePageProps {
  user: UserType;
  profile: any;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, profile, onLogout }) => {
  const [successMsg, setSuccessMsg] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'support' | null>(null);

  const handleActionClick = (title: string) => {
    alert(`${title} settings updated successfully.`);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-10 max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black text-3xl shadow-xl ring-4 ring-amber-500/30">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <span className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 text-slate-950 rounded-full shadow-md">
            <UserCheck className="w-4 h-4" />
          </span>
        </div>

        <div className="text-center sm:text-left flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-white">{user.fullName}</h1>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/30 self-center">
              {user.role === 'admin' ? 'Administrator' : 'Verified Investor'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Account Status</span>
              <span className="text-emerald-400 font-bold mt-0.5 block">Active & Verified</span>
            </div>
            <div>
              <span className="text-slate-500 block">Registered Phone</span>
              <span className="text-white font-medium mt-0.5 block">{user.phone || '+256 700 000 000'}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-500 block">Member Since</span>
              <span className="text-white font-medium mt-0.5 block">{formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Default Withdrawal Notice Box */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center space-x-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
          <PhoneCall className="w-5 h-5" />
        </div>
        <div className="text-xs">
          <div className="font-bold text-white">Default Withdrawal Phone Number</div>
          <p className="text-slate-400 mt-0.5">
            Your registered phone number (<span className="text-amber-400 font-mono font-bold">{user.phone || '+256 700 000 000'}</span>) is automatically set as the default destination for all mobile money withdrawals.
          </p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl divide-y divide-slate-800 overflow-hidden">
        {/* Account Section */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Account</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleActionClick("Edit Profile")}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Edit Profile Details</div>
                  <div className="text-xs text-slate-400">Update name and account preferences</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => handleActionClick("Change Password")}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Change Password</div>
                  <div className="text-xs text-slate-400">Update your account credentials securely</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Security Section */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Security & Verification</h3>
          <div className="space-y-2">
            <button
              onClick={() => alert("Two-factor authentication is active via secure email tokens.")}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Two-Factor Authentication (2FA)</div>
                  <div className="text-xs text-slate-400">Secured with cryptographic email codes</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">Active</span>
            </button>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Preferences</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Push Notifications</div>
                  <div className="text-xs text-slate-400">Receive alerts on daily earnings and withdrawals</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Support & Legal</h3>
          <div className="space-y-2">
            <button
              onClick={() => setActiveModal('support')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Help & 24/7 Support</div>
                  <div className="text-xs text-slate-400">Contact our financial advisory team</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => setActiveModal('privacy')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Privacy Policy</div>
                  <div className="text-xs text-slate-400">Review data handling and user confidentiality</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => setActiveModal('terms')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Terms & Conditions</div>
                  <div className="text-xs text-slate-400">Review agricultural investment terms and compliance</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="p-6">
          <button
            onClick={onLogout}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl transition-colors text-sm flex items-center justify-center space-x-2 border border-red-500/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout from Grainflow</span>
          </button>
        </div>
      </div>

      {/* Modals for Support, Privacy, Terms */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white capitalize">
                {activeModal === 'privacy' ? 'Privacy Policy' : activeModal === 'terms' ? 'Terms & Conditions' : 'Help & 24/7 Support'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-xs"
              >✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              {activeModal === 'privacy' && (
                <>
                  <p className="font-semibold text-white">Grainflow Privacy Policy</p>
                  <p>At Grainflow, we prioritize the confidentiality and security of your personal and financial information. This policy governs how we collect, store, and protect your data.</p>
                  <p className="font-semibold text-white mt-2">1. Information Collection</p>
                  <p>We collect your full name, email address, registered phone number for mobile money withdrawals, and transaction history to facilitate secure agricultural investments.</p>
                  <p className="font-semibold text-white mt-2">2. Data Security</p>
                  <p>All data is encrypted using secure protocols and stored in verified, encrypted databases with strict access controls.</p>
                </>
              )}

              {activeModal === 'terms' && (
                <>
                  <p className="font-semibold text-white">Grainflow Terms & Conditions</p>
                  <p>By using Grainflow and activating agricultural investment plans, you agree to comply with East African financial and agricultural regulatory standards.</p>
                  <p className="font-semibold text-white mt-2">1. Investment Returns</p>
                  <p>Daily returns accrue automatically upon administrative approval. Principal and accumulated earnings are credited upon plan maturity.</p>
                  <p className="font-semibold text-white mt-2">2. Withdrawals</p>
                  <p>Withdrawals are processed directly to your registered mobile money phone number. Standard verification protocols apply.</p>
                </>
              )}

              {activeModal === 'support' && (
                <>
                  <p className="font-semibold text-white">Grainflow Support Center</p>
                  <p>Our agricultural advisory and technical support team is available 24/7 to assist you with deposits, investments, and payouts.</p>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 mt-3">
                    <div><span className="text-slate-400">Support Hotline:</span> <span className="text-white font-bold">+256 800 200 000</span></div>
                    <div><span className="text-slate-400">Email Support:</span> <span className="text-white font-bold">support@grainflow.agri</span></div>
                    <div><span className="text-slate-400">Office Location:</span> <span className="text-white font-bold">Kampala Agricultural Hub, Uganda</span></div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-right">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
