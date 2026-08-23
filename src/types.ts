export interface User {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  createdAt: any;
  avatar?: string;
  referralCode?: string;
  referredBy?: string | null;
  balance: number;
  totalEarnings: number;
  referralEarnings: number;
  totalReferrals: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  investmentAmount: number;
  dailyIncome: number;
  durationDays: number;
  totalExpectedEarnings: number;
  totalPayout: number;
  isActive: boolean;
  isPopular?: boolean;
  image?: string;
  imageUrl?: string;
}

export interface Investment {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  investmentAmount: number;
  dailyIncome: number;
  durationDays: number;
  expectedEarnings: number;
  totalPayout: number;
  accruedEarnings: number;
  daysAccrued: number;
  startDate: any;
  lastAccrualDate: any;
  status: 'active' | 'completed' | 'cancelled' | 'pending_review';
  createdAt?: any;
  updatedAt?: any;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'earnings' | 'earning' | 'refund' | 'referral_bonus' | 'checkin_reward';
  amount: number;
  date: string;
  reference?: string;
  status: 'completed' | 'pending' | 'rejected';
  description: string;
  balanceBefore?: number;
  balanceAfter?: number;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  method: string;
  reference: string;
  date: string;
  status: 'pending' | 'completed' | 'rejected';
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  accountNumber: string;
  bankName: string;
  date: string;
  status: 'PENDING_PAYMENT' | 'PENDING_ADMIN_APPROVAL' | 'completed' | 'REJECTED' | 'APPROVED';
}

export interface Wallet {
  userId: string;
  availableBalance: number;
  totalDeposited: number;
  totalInvested: number;
  totalEarnings: number;
  pendingWithdrawals: number;
}

export interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  referralEarnings: number;
  teamMembers: Array<{
    id: string;
    fullName: string;
    email: string;
    joinedDate: string;
    investmentCount: number;
  }>;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalInvestments: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalEarningsPaid: number;
  pendingTransactions: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}
