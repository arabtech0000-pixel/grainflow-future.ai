import React, { useState } from 'react';
import { User, ReferralData } from '../types';
import { Users, Copy, Check, Share2, Award, ArrowUpRight, ShieldCheck, UserCheck } from 'lucide-react';
import { formatUGX, formatDate } from '../utils/formatters';

interface TeamPageProps {
  user: User;
  referralData: ReferralData;
  onRefresh: () => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({ user, referralData }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.referralCode || referralData.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/register?ref=${user.referralCode || referralData.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/register?ref=${user.referralCode || referralData.referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Grainflow',
          text: 'Invest in agriculture and grow with Grainflow. Join my team using my referral link!',
          url: link
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8 max-w-3xl mx-auto">
      {/* Top Banner (Compact Gradient) */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-5 text-slate-950 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[10px] font-extrabold text-slate-900/80 uppercase tracking-wider">
              GRAINFLOW TEAM NETWORK
            </div>
            <h2 className="text-lg font-black text-white">Your Agricultural Team & Referrals</h2>
          </div>
          <span className="px-2.5 py-0.5 bg-slate-950/20 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
            Active
          </span>
        </div>
        <p className="text-[11px] text-slate-950/90 mt-1 font-medium leading-tight">
          Invite new members using your unique link or code to receive 10% direct commission bonuses into your wallet.
        </p>
      </div>

      {/* Summary Metrics (4 Compact Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 text-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            TOTAL REFERRALS
          </div>
          <div className="text-sm sm:text-base font-black text-white">
            {referralData.totalReferrals}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 text-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            DIRECT TEAM
          </div>
          <div className="text-sm sm:text-base font-black text-amber-400">
            {referralData.teamMembers.length}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 text-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            ACTIVE MEMBERS
          </div>
          <div className="text-sm sm:text-base font-black text-teal-400">
            {referralData.teamMembers.length}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 text-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            TEAM REWARDS
          </div>
          <div className="text-sm sm:text-base font-black text-emerald-400">
            {formatUGX(referralData.referralEarnings)}
          </div>
        </div>
      </div>

      {/* Referral Code & Share Link Boxes */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Your Invitation Credentials</span>
          </h3>
          <button
            onClick={handleShare}
            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Link</span>
          </button>
        </div>

        <div className="space-y-3">
          {/* Referral Link */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">My Referral Link</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 font-mono text-slate-300 text-xs truncate">
                {`${window.location.origin}/register?ref=${user.referralCode || referralData.referralCode}`}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all flex-shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Referral Code */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">Referral Code</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 font-mono font-bold text-amber-400 text-xs">
                {user.referralCode || referralData.referralCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all flex-shrink-0 border border-slate-700"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Team Performance Overview */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2 shadow-sm">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>Commission & Growth Rules</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          You earn a 10% commission bonus whenever a member of your team activates a new agricultural investment plan. Commissions are credited directly to your available wallet balance in real time.
        </p>
      </div>

      {/* Team Members List */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Referred Team Members ({referralData.teamMembers.length})</span>
          </h3>
        </div>

        {referralData.teamMembers.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-1">
            <Users className="w-6 h-6 text-slate-600 mx-auto mb-1" />
            <div className="text-xs font-semibold text-slate-300">No team members registered yet</div>
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
              Share your referral link above to invite friends and earn rewards.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {referralData.teamMembers.map((member) => (
              <div key={member.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-xs">
                    {member.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{member.fullName}</div>
                    <div className="text-[10px] text-slate-400">{member.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-400 font-bold">Active Member</div>
                  <div className="text-[9px] text-slate-500">{formatDate(member.joinedDate)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

