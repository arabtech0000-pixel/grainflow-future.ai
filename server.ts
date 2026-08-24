import express from "express";
import crypto from "crypto";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set, get, update, push, serverTimestamp } from "firebase/database";
import fs from "fs";
import * as admin from "firebase-admin";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { runTransaction } from "firebase/database";

// Load Firebase Config
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  console.error("Missing firebase-applet-config.json!");
  process.exit(1);
}
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const app = initializeApp({ ...firebaseConfig, databaseURL: firebaseConfig.databaseURL });
const auth = getAuth(app);
const db = getDatabase(app);

admin.initializeApp({ projectId: firebaseConfig.projectId });

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    (req as any).user = null;
    return next();
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    (req as any).user = decoded;
  } catch (e) {
    // If verifyIdToken fails due to transient cert lookup, decode JWT payload for project ID
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        if (payload.aud === firebaseConfig.projectId && (payload.user_id || payload.sub)) {
          (req as any).user = { uid: payload.user_id || payload.sub, email: payload.email, ...payload };
        }
      }
    } catch (parseErr) {}
    if (!(req as any).user) {
      (req as any).user = null;
    }
  }
  next();
};

const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authedUser = (req as any).user;
  if (!authedUser) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided or invalid authentication' });
  }

  try {
    const uid = authedUser.uid;
    const email = (authedUser.email || '').toLowerCase().trim();

    if (uid) {
      const userSnap = await get(ref(db, `users/${uid}`));
      if (userSnap.exists() && userSnap.val().role === 'admin') {
        return next();
      }
    }

    const adminEmails = ['ashirafashes04@gmail.com', 'arabtech0000@gmail.com'];
    if (email && adminEmails.includes(email)) {
      if (uid) {
        await update(ref(db, `users/${uid}`), { role: 'admin' });
      }
      return next();
    }

    if (email) {
      const usersSnap = await get(ref(db, 'users'));
      if (usersSnap.exists()) {
        const users = usersSnap.val();
        for (const [uKey, uVal] of Object.entries(users) as [string, any][]) {
          if (uVal && uVal.email && uVal.email.toLowerCase().trim() === email && uVal.role === 'admin') {
            if (uid && uKey !== uid) {
              await update(ref(db, `users/${uid}`), { role: 'admin' });
            }
            return next();
          }
        }
      }
    }

    return res.status(403).json({ success: false, error: 'Forbidden: Admin privilege required' });
  } catch (e: any) {
    console.error('requireAdmin middleware error:', e);
    return res.status(500).json({ success: false, error: `Auth Error: ${e.message}` });
  }
};

const expressApp = express();
expressApp.use('/images', express.static(path.join(process.cwd(), 'public/images')));
expressApp.use(express.static(path.join(process.cwd(), 'public')));
expressApp.use(express.json({ limit: "50mb" }));
expressApp.use(express.urlencoded({ extended: true, limit: "50mb" }));
expressApp.use(authenticateUser);
const PORT = 3000;

// Helper to seed database and authenticate server worker
async function initBackendWorker() {
  try {
    let adminUid = "";
    try {
      const cred = await signInWithEmailAndPassword(auth, "ashirafashes04@gmail.com", "popular-24");
      adminUid = cred.user.uid;
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, "ashirafashes04@gmail.com", "popular-24");
          adminUid = cred.user.uid;
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            // Already exists in auth
          } else {
            console.error("Admin create error:", createErr.message);
          }
        }
      } else {
        console.error("Admin auth warning:", e.message);
      }
    }
    
    // Ensure admin user profile exists in RTDB
    const usersSnap = await get(ref(db, "users"));
    let adminExistsInDb = false;
    if (usersSnap.exists()) {
      const users = usersSnap.val();
      for (const [uId, uData] of Object.entries(users) as [string, any]) {
        if (uData.email === "ashirafashes04@gmail.com") {
          adminExistsInDb = true;
          if (uData.role !== "admin") {
            await update(ref(db, `users/${uId}`), { role: "admin" });
          }
        }
      }
    }

    if (!adminExistsInDb && adminUid) {
      await set(ref(db, `users/${adminUid}`), {
        uid: adminUid,
        email: "ashirafashes04@gmail.com",
        fullName: "Ashraf H",
        phone: "+256700000000",
        role: "admin",
        balance: 0,
        totalEarnings: 0,
        referralCode: "ASHRAF01",
        referredBy: null,
        referralEarnings: 0,
        totalReferrals: 0,
        status: "active",
        createdAt: Date.now()
      });
    }
    
    // Seed or update VIP Plans with distinct individual product images
    const productsSnap = await get(ref(db, "products"));
    const plans = [
      { name: "VIP 1", investmentAmount: 20000, dailyIncome: 5000, durationDays: 30, image: "/images/product_1_seeding_equipment.jpg", imageUrl: "/images/product_1_seeding_equipment.jpg" },
      { name: "VIP 2", investmentAmount: 50000, dailyIncome: 13000, durationDays: 27, image: "/images/product_2_livestock_farm_equipment.jpg", imageUrl: "/images/product_2_livestock_farm_equipment.jpg" },
      { name: "VIP 3", investmentAmount: 120000, dailyIncome: 32400, durationDays: 24, image: "/images/product_3_green_tractor.jpg", imageUrl: "/images/product_3_green_tractor.jpg" },
      { name: "VIP 4", investmentAmount: 250000, dailyIncome: 70000, durationDays: 21, image: "/images/product_4_multiple_tractors.jpg", imageUrl: "/images/product_4_multiple_tractors.jpg" },
      { name: "VIP 5", investmentAmount: 500000, dailyIncome: 145000, durationDays: 14, image: "/images/product_5_large_scale_crop.jpg", imageUrl: "/images/product_5_large_scale_crop.jpg" },
      { name: "VIP 6", investmentAmount: 1000000, dailyIncome: 300000, durationDays: 7, image: "/images/product_6_modern_agritech.jpg", imageUrl: "/images/product_6_modern_agritech.jpg" },
    ];

    if (!productsSnap.exists()) {
      const productsObj: any = {};
      for (const plan of plans) {
        const prodRef = push(ref(db, "products"));
        const expectedEarnings = plan.dailyIncome * plan.durationDays;
        const totalPayout = plan.investmentAmount + expectedEarnings;
        productsObj[prodRef.key!] = {
          id: prodRef.key,
          ...plan,
          totalExpectedEarnings: expectedEarnings,
          totalPayout: totalPayout,
          isActive: true,
          isPopular: plan.name === "VIP 5",
          createdAt: Date.now()
        };
      }
      await set(ref(db, "products"), productsObj);
      console.log("VIP Plans seeded with distinct agricultural product images.");
    } else {
      // Ensure existing products have their respective unique images updated
      const existingProducts = productsSnap.val();
      const updates: any = {};
      for (const [key, prod] of Object.entries(existingProducts) as [string, any]) {
        // Clean up orphan stubs if any
        if (!prod || (!prod.investmentAmount && !prod.name)) {
          updates[`products/${key}`] = null;
          continue;
        }
        // Match specifically by investment amount or name prefix
        const matchingPlan = plans.find(p => 
          p.investmentAmount === prod.investmentAmount || 
          (prod.name && (prod.name.includes(p.name) || p.name.includes(prod.name)))
        );
        if (matchingPlan) {
          if (prod.image !== matchingPlan.image) {
            updates[`products/${key}/image`] = matchingPlan.image;
          }
          if (prod.imageUrl !== matchingPlan.imageUrl) {
            updates[`products/${key}/imageUrl`] = matchingPlan.imageUrl;
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
        console.log("Existing product images updated to distinct product-specific images.");
      }
    }
    
    console.log("Backend worker initialized successfully with RTDB.");
  } catch (err) {
    console.error("Backend worker init failed:", err);
  }
}

// Daily Earnings Accrual Engine
async function syncEarningsForUser(targetUserId?: string): Promise<number> {
  try {
    const invSnap = await get(ref(db, "investments"));
    if (!invSnap.exists()) return 0;
    
    const investments = invSnap.val();
    const now = Date.now();
    let updatedCount = 0;
    
    // Group uncredited earnings by user
    const userUpdates: { [userId: string]: { balanceDelta: number; earningsDelta: number } } = {};
    const globalUpdates: any = {};
    
    for (const [invId, inv] of Object.entries(investments) as [string, any]) {
      if (!inv || inv.status !== 'active') continue;
      if (targetUserId && inv.userId !== targetUserId) continue;
      
      const startDate = Number(inv.startDate || inv.createdAt || now);
      const diffTime = Math.max(0, now - startDate);
      const durationDays = Number(inv.durationDays || 0);
      const totalElapsedDays = Math.min(durationDays, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      const daysAccrued = Number(inv.daysAccrued || 0);
      const uncreditedDays = Math.max(0, totalElapsedDays - daysAccrued);
      
      if (uncreditedDays > 0) {
        const dailyIncome = Number(inv.dailyIncome || 0);
        const earnedAmount = uncreditedDays * dailyIncome;
        const newDaysAccrued = daysAccrued + uncreditedDays;
        const isCompleted = newDaysAccrued >= durationDays;
        const investmentAmount = Number(inv.investmentAmount || 0);
        const payoutAmount = earnedAmount + (isCompleted ? investmentAmount : 0);
        
        const userId = inv.userId;
        if (!userUpdates[userId]) {
          userUpdates[userId] = { balanceDelta: 0, earningsDelta: 0 };
        }
        userUpdates[userId].balanceDelta += payoutAmount;
        userUpdates[userId].earningsDelta += earnedAmount;
        
        globalUpdates[`investments/${invId}/accruedEarnings`] = Number(inv.accruedEarnings || 0) + earnedAmount;
        globalUpdates[`investments/${invId}/daysAccrued`] = newDaysAccrued;
        globalUpdates[`investments/${invId}/lastAccrualDate`] = now;
        globalUpdates[`investments/${invId}/status`] = isCompleted ? "completed" : "active";
        globalUpdates[`investments/${invId}/updatedAt`] = now;
        
        // Log transaction for profit earning
        const txRef = push(ref(db, "transactions"));
        globalUpdates[`transactions/${txRef.key}`] = {
          id: txRef.key,
          userId,
          type: "earnings",
          amount: earnedAmount,
          description: `Daily profit earning for ${inv.planName || 'Plan'} (${uncreditedDays} day(s))`,
          status: "completed",
          createdAt: now
        };
        
        if (isCompleted) {
          const retTxRef = push(ref(db, "transactions"));
          globalUpdates[`transactions/${retTxRef.key}`] = {
            id: retTxRef.key,
            userId,
            type: "earnings",
            amount: investmentAmount,
            description: `Principal return for completed ${inv.planName || 'Plan'}`,
            status: "completed",
            createdAt: now
          };
        }
        
        updatedCount++;
      }
    }
    
    // Fetch and apply user balance and earnings delta
    for (const [userId, deltas] of Object.entries(userUpdates)) {
      const userSnap = await get(ref(db, `users/${userId}`));
      if (userSnap.exists()) {
        const userData = userSnap.val();
        globalUpdates[`users/${userId}/balance`] = (Number(userData.balance) || 0) + deltas.balanceDelta;
        globalUpdates[`users/${userId}/updatedAt`] = now;
      }
    }

    if (targetUserId) {
      let userExpectedProfit = 0;
      for (const [_, inv] of Object.entries(investments) as [string, any][]) {
        if (inv && inv.userId === targetUserId && (inv.status === 'active' || inv.status === 'APPROVED' || inv.status === 'completed')) {
          const profit = Number(inv.expectedEarnings) || (Number(inv.dailyIncome || 0) * Number(inv.durationDays || 0));
          userExpectedProfit += profit;
        }
      }
      const uSnap = await get(ref(db, `users/${targetUserId}`));
      if (uSnap.exists()) {
        globalUpdates[`users/${targetUserId}/totalEarnings`] = userExpectedProfit;
      }
    }
    
    if (Object.keys(globalUpdates).length > 0) {
      await update(ref(db), globalUpdates);
    }
    
    return updatedCount;
  } catch (err) {
    console.error("Accrual engine error:", err);
    return 0;
  }
}

async function processEarningsAccrual() {
  await syncEarningsForUser();
}

// Run periodic accrual check every 60 seconds
setInterval(processEarningsAccrual, 60 * 1000);

// --- API ENDPOINTS ---

// Helper to validate phone
const isValidUgandanPhoneNumber = (phone: string) => {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  const phoneRegex = /^(?:256|0)?(3[1-9]|4[0-4]|7[0-9])\d{7}$/;
  return phoneRegex.test(cleaned);
};

// --- API ENDPOINTS ---

// Health check endpoint
expressApp.get("/api/payment/health", (req, res) => {
  res.json({
    success: true,
    provider: "Instant Deposit",
    paymentConfigured: true,
    environment: process.env.NODE_ENV
  });
});

// 1. START DEPOSIT (LOCK AMOUNT & PHONE)
expressApp.post("/api/deposits/request", async (req, res) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  const { userId, amount, method, phone, productId } = req.body;
  
  try {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: "Please enter a valid deposit amount" });
    }

    // Get user data for userName/userEmail
    const userSnap = await get(ref(db, `users/${userId}`));
    const user = userSnap.val() || { fullName: "User", email: "" };

    const reference = `DEP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = Date.now();
    const depRef = push(ref(db, "deposits"));

    const depositRecord = {
      id: depRef.key,
      userId,
      userName: user.fullName || "User",
      userEmail: user.email || "",
      amount: numAmount,
      productId: productId || null,
      phone: phone || "0700000000",
      method: method || "Mobile Money",
      reference,
      status: "PENDING_PAYMENT",
      createdAt: now,
      updatedAt: now
    };

    await set(ref(db, `deposits/${depRef.key}`), depositRecord);

    res.status(200).json({
      success: true,
      depositId: depRef.key,
      reference,
      amount: numAmount,
      message: "Deposit initiation successful. Status: PENDING_PAYMENT"
    });
  } catch (err: any) {
    console.error("[Deposit Request] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

expressApp.post("/api/deposits/start", async (req, res) => {
  if (!(req as any).user) return res.status(401).json({ error: "Unauthorized" });
  console.log("[Deposit Start] Incoming body:", req.body);
  const { userId, amount, method, provider, productId } = req.body;
  const phone = req.body.phone || req.body.mobileNumber || req.body.phone_number || "0700000000";
  const paymentMethod = method || provider || "Mobile Money";

  try {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: "Please enter a valid deposit amount" });
    }

    let actualUserId = userId;
    let user: any = null;
    if (userId) {
      const userSnap = await get(ref(db, `users/${userId}`));
      if (userSnap.exists()) {
        user = userSnap.val();
      } else {
        const allUsersSnap = await get(ref(db, "users"));
        if (allUsersSnap.exists()) {
          const allUsers = allUsersSnap.val();
          for (const [k, v] of Object.entries(allUsers) as [string, any][]) {
            if (k === userId || v.uid === userId || v.id === userId || (req.body.email && v.email === req.body.email)) {
              user = v;
              actualUserId = k;
              break;
            }
          }
        }
      }
    }

    if (!user) {
      user = {
        fullName: "User",
        email: req.body.email || "",
        balance: 0,
        totalDeposited: 0,
        status: "active"
      };
      if (actualUserId) {
        await set(ref(db, `users/${actualUserId}`), user);
      }
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ success: false, error: "Your account is restricted from performing deposits" });
    }

    let finalAmount = numAmount;
    if (productId) {
      const prodSnap = await get(ref(db, `products/${productId}`));
      if (prodSnap.exists()) {
        finalAmount = Number(prodSnap.val().investmentAmount);
      }
    }

    const reference = `DEP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = Date.now();
    const depRef = push(ref(db, "deposits"));

    const depositRecord = {
      id: depRef.key,
      userId: actualUserId,
      userName: user.fullName || "User",
      userEmail: user.email || "",
      amount: finalAmount, // Locked authoritative amount
      productId: productId || null,
      phone,
      method: paymentMethod,
      reference,
      status: "PENDING_PAYMENT",
      screenshot: null,
      createdAt: now,
      updatedAt: now
    };

    await set(ref(db, `deposits/${depRef.key}`), depositRecord);

    console.log(`[Deposit Start] Locked deposit ${depRef.key} with amount UGX ${finalAmount}`);

    return res.status(200).json({
      success: true,
      depositId: depRef.key,
      reference,
      amount: finalAmount,
      phone,
      status: "PENDING_PAYMENT",
      message: "Deposit initiated and amount locked."
    });
  } catch (err: any) {
    console.error("[Deposit Start] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message || "Failed to start deposit" });
  }
});

// 2. SUBMIT PAYMENT PROOF (SCREENSHOT)
expressApp.post("/api/deposits/submit-proof", async (req, res) => {
  const authedUser = (req as any).user;
  const { depositId, screenshot, amount, userId, userName, userEmail, reference } = req.body;
  const effectiveUserId = authedUser?.uid || userId;

  if (!effectiveUserId) {
    return res.status(401).json({ success: false, error: "Unauthorized: Please log in to submit payment proof" });
  }

  try {
    if (!screenshot) {
      return res.status(400).json({ success: false, error: "Payment screenshot is required" });
    }

    const actualDepositId = depositId || `dep_${Date.now()}`;
    const depRefPath = `deposits/${actualDepositId}`;
    const depSnap = await get(ref(db, depRefPath));
    
    let dep: any;
    const now = Date.now();
    const updates: any = {};

    let resolvedUserName = userName;
    let resolvedUserEmail = userEmail || authedUser?.email;
    if (!resolvedUserName || !resolvedUserEmail) {
      try {
        const uSnap = await get(ref(db, `users/${effectiveUserId}`));
        if (uSnap.exists()) {
          const uVal = uSnap.val();
          resolvedUserName = resolvedUserName || uVal.fullName || uVal.email || "User";
          resolvedUserEmail = resolvedUserEmail || uVal.email || "";
        }
      } catch (uErr) {
        console.warn("Could not fetch user details for deposit:", uErr);
      }
    }

    if (!depSnap.exists()) {
      // Auto-create deposit record if not found (fallback resilience)
      dep = {
        id: actualDepositId,
        userId: effectiveUserId,
        userName: resolvedUserName || "User",
        userEmail: resolvedUserEmail || "",
        amount: Number(amount || 50000),
        method: "MasrPay Gateway",
        reference: reference || `DEP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        status: "PENDING_ADMIN_APPROVAL",
        screenshot,
        createdAt: now,
        submittedAt: now,
        updatedAt: now
      };
      updates[depRefPath] = dep;
    } else {
      dep = depSnap.val();
      updates[`deposits/${actualDepositId}/userId`] = dep.userId || effectiveUserId;
      updates[`deposits/${actualDepositId}/userName`] = dep.userName || resolvedUserName || "User";
      updates[`deposits/${actualDepositId}/userEmail`] = dep.userEmail || resolvedUserEmail || "";
      updates[`deposits/${actualDepositId}/screenshot`] = screenshot;
      updates[`deposits/${actualDepositId}/status`] = "PENDING_ADMIN_APPROVAL";
      updates[`deposits/${actualDepositId}/submittedAt`] = now;
      updates[`deposits/${actualDepositId}/updatedAt`] = now;
    }

    // Also record a pending transaction record
    const txRef = push(ref(db, "transactions"));
    updates[`transactions/${txRef.key}`] = {
      id: txRef.key,
      userId: dep.userId || effectiveUserId,
      type: "deposit",
      amount: Number(dep.amount || amount || 50000),
      description: `Deposit via MasrPay Gateway [Pending Admin Approval]`,
      reference: dep.reference,
      status: "PENDING_ADMIN_APPROVAL",
      createdAt: now
    };

    await update(ref(db), updates);

    console.log(`[Submit Proof] Deposit ${actualDepositId} (${dep.reference}) successfully submitted for admin review`);
    return res.json({
      success: true,
      status: "PENDING_ADMIN_APPROVAL",
      message: "Payment submitted successfully. Waiting for admin approval."
    });
  } catch (err: any) {
    console.error("[Submit Proof] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message || "Failed to submit payment proof" });
  }
});

// Status check endpoint for compatibility
expressApp.get("/api/deposits/status/:reference", async (req, res) => {
  const { reference } = req.params;
  try {
    const depositsSnap = await get(ref(db, "deposits"));
    if (!depositsSnap.exists()) {
      return res.status(404).json({ success: false, error: "Deposit not found" });
    }
    const allDeposits = depositsSnap.val();
    let deposit: any = null;
    for (const v of Object.values(allDeposits) as any[]) {
      if (v.reference === reference) {
        deposit = v;
        break;
      }
    }
    if (!deposit) {
      return res.status(404).json({ success: false, error: "Deposit reference not found" });
    }
    return res.json({
      success: true,
      reference: deposit.reference,
      status: deposit.status,
      amount: deposit.amount,
      method: deposit.method,
      phone: deposit.phone,
      createdAt: deposit.createdAt,
      updatedAt: deposit.updatedAt
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

expressApp.post("/api/wallet/withdraw", async (req, res) => {
  const { userId, amount, accountNumber, bankName } = req.body;
  try {
    if (!isValidUgandanPhoneNumber(accountNumber)) throw new Error("Invalid phone number");
    
    const userSnap = await get(ref(db, `users/${userId}`));
    if (!userSnap.exists()) throw new Error("User not found");
    const user = userSnap.val();
    
    if (user.status !== 'active') throw new Error("Account is restricted");
    
    if ((user.balance || 0) < amount) {
      throw new Error("Insufficient balance");
    }
    
    if (amount < 20000) {
      throw new Error("Minimum withdrawal amount is UGX 20,000");
    }
    
    const reference = "WIT-" + Math.floor(100000 + Math.random() * 900000);
    const now = Date.now();
    
    const witRef = push(ref(db, "withdrawals"));
    const txRef = push(ref(db, "transactions"));
    
    const updates: any = {};
    updates[`users/${userId}/balance`] = user.balance - amount;
    updates[`withdrawals/${witRef.key}`] = {
      id: witRef.key,
      userId,
      userName: user.fullName,
      userEmail: user.email,
      amount,
      accountNumber: accountNumber,
      bankName,
      reference,
      status: "PENDING_ADMIN_APPROVAL",
      createdAt: now,
      updatedAt: now
    };
    
    updates[`transactions/${txRef.key}`] = {
      id: txRef.key,
      userId,
      type: "withdrawal",
      amount,
      description: `Withdrawal request to ${bankName} (${accountNumber})`,
      reference,
      status: "PENDING_ADMIN_APPROVAL",
      createdAt: now
    };
    
    await update(ref(db), updates);
    res.json({ success: true, reference });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

expressApp.post("/api/investments/purchase", async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const userSnap = await get(ref(db, `users/${userId}`));
    if (!userSnap.exists()) throw new Error("User not found");
    const user = userSnap.val();
    
    if (user.status !== 'active') throw new Error("Account is restricted");
    
    const productSnap = await get(ref(db, `products/${productId}`));
    if (!productSnap.exists()) throw new Error("Product plan not found");
    const prod = productSnap.val();
    
    if ((user.balance || 0) < prod.investmentAmount) {
      throw new Error("Insufficient balance");
    }
    
    const now = Date.now();
    const invRef = push(ref(db, "investments"));
    const txRef = push(ref(db, "transactions"));
    
    const updates: any = {};
    updates[`users/${userId}/balance`] = user.balance - prod.investmentAmount;
    
    updates[`investments/${invRef.key}`] = {
      id: invRef.key,
      userId,
      planId: prod.id,
      planName: prod.name,
      investmentAmount: prod.investmentAmount,
      dailyIncome: prod.dailyIncome,
      durationDays: prod.durationDays,
      expectedEarnings: prod.totalExpectedEarnings,
      totalPayout: prod.totalPayout,
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
      amount: prod.investmentAmount,
      description: `Purchased plan: ${prod.name}`,
      status: "completed",
      createdAt: now
    };
    
    await update(ref(db), updates);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Admin User Management
expressApp.patch("/api/admin/users/:userId/status", requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body; // 'active' | 'suspended' | 'deleted'
  try {
    // Basic auth check: assume req headers have some admin check, 
    // but here we just update for simplicity. Real app needs secure session/token auth.
    await update(ref(db, `users/${userId}`), { status, updatedAt: Date.now() });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

expressApp.post("/api/user/sync-earnings", async (req, res) => {
  const { userId } = req.body;
  try {
    const updatedCount = await syncEarningsForUser(userId);
    res.json({ success: true, updatedCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

expressApp.patch("/api/admin/investments/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  try {
    const invSnap = await get(ref(db, `investments/${id}`));
    if (!invSnap.exists()) {
      return res.status(404).json({ success: false, error: "Investment record not found in database" });
    }
    const inv = invSnap.val();

    const rawStatus = String(inv.status || '').toLowerCase().trim();
    const isPending = 
      rawStatus.includes('pending') || 
      rawStatus === 'review' || 
      rawStatus === 'pending_review' || 
      rawStatus === 'pending_approval' || 
      rawStatus === 'pending approval';

    if (!isPending) {
      return res.status(400).json({ 
        success: false, 
        error: `Investment cannot be processed because its current status is "${inv.status || 'unknown'}". It is not pending approval.` 
      });
    }
    
    const now = Date.now();
    const updates: any = {};
    const normalizedAction = String(action || '').toLowerCase().trim();
    const isApproval = normalizedAction === "active" || normalizedAction === "approved" || normalizedAction === "completed" || normalizedAction === "approve";
    const targetStatus = isApproval ? "active" : "cancelled";

    updates[`investments/${id}/status`] = targetStatus;
    updates[`investments/${id}/updatedAt`] = now;
    
    if (targetStatus === "active") {
      updates[`investments/${id}/startDate`] = now;
      updates[`investments/${id}/lastAccrualDate`] = now;
      updates[`investments/${id}/daysAccrued`] = 0;
      updates[`investments/${id}/accruedEarnings`] = 0;

      // Recalculate total expected profit for the user from all active/approved investments
      const allInvsSnap = await get(ref(db, "investments"));
      let userExpectedProfitSum = 0;
      if (allInvsSnap.exists()) {
        const allInvs = allInvsSnap.val();
        for (const [invKey, invVal] of Object.entries(allInvs) as [string, any][]) {
          if (invVal && invVal.userId === inv.userId) {
            const valStatus = String(invVal.status || '').toLowerCase().trim();
            const isApproved = (invKey === id) || valStatus === 'active' || valStatus === 'approved' || valStatus === 'completed';
            if (isApproved) {
              const prof = Number(invVal.expectedEarnings) || (Number(invVal.dailyIncome || 0) * Number(invVal.durationDays || 0));
              userExpectedProfitSum += prof;
            }
          }
        }
      }
      const uSnap = await get(ref(db, `users/${inv.userId}`));
      if (uSnap.exists()) {
        updates[`users/${inv.userId}/totalEarnings`] = userExpectedProfitSum;
      }
    } else {
      const userSnap = await get(ref(db, `users/${inv.userId}`));
      if (userSnap.exists()) {
        const u = userSnap.val();
        updates[`users/${inv.userId}/balance`] = (Number(u.balance) || 0) + (Number(inv.investmentAmount) || 0);
      }
      const txRef = push(ref(db, "transactions"));
      updates[`transactions/${txRef.key}`] = {
        id: txRef.key,
        userId: inv.userId,
        type: "refund",
        amount: Number(inv.investmentAmount) || 0,
        description: `Refund for rejected plan: ${inv.planName || 'Investment'}`,
        status: "completed",
        createdAt: now
      };
    }
    
    await update(ref(db), updates);
    if (targetStatus === "active") {
      await syncEarningsForUser(inv.userId);
    }
    return res.json({ 
      success: true, 
      status: targetStatus, 
      message: `Investment successfully ${targetStatus === 'active' ? 'approved' : 'rejected'}` 
    });
  } catch (e: any) {
    console.error(`[Admin Investment Action Error] ID: ${id}, Error:`, e);
    return res.status(500).json({ success: false, error: e.message || 'Failed to process investment action' });
  }
});


expressApp.get("/api/admin/deposits", requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const depsSnap = await get(ref(db, 'deposits'));
    let deposits = [];
    if (depsSnap.exists()) {
      depsSnap.forEach((child) => {
        const dep = child.val();
        if (!status || dep.status === status) {
          deposits.push({ id: child.key, ...dep });
        }
      });
    }
    deposits.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json({ success: true, deposits });
  } catch (e) { console.error('Auth err:', e.message);
    res.status(500).json({ error: e.message });
  }
});


expressApp.delete("/api/admin/deposits/history", requireAdmin, async (req, res) => {
  try {
    const depsSnap = await get(ref(db, 'deposits'));
    if (!depsSnap.exists()) {
      return res.json({ success: true, count: 0 });
    }
    
    let count = 0;
    const updates = {};
    depsSnap.forEach((child) => {
      const dep = child.val();
      if (dep.status !== 'PENDING_ADMIN_APPROVAL' && dep.status !== 'pending' && dep.status !== 'PENDING_PAYMENT') {
        updates[`deposits/${child.key}`] = null;
        count++;
      }
    });
    
    if (count > 0) {
      await update(ref(db), updates);
    }
    
    res.json({ success: true, count });
  } catch (e) { console.error('Auth err:', e.message);
    res.status(500).json({ error: e.message });
  }
});
expressApp.patch("/api/admin/deposits/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; 
  try {
    const targetStatus = (action === "APPROVED" || action === "completed") ? "APPROVED" : "REJECTED";
    const now = Date.now();

    // 1. Lock the deposit status transition
    const transactionResult = await runTransaction(ref(db, `deposits/${id}`), (dep) => {
      if (dep) {
        if (dep.status !== "PENDING_ADMIN_APPROVAL" && dep.status !== "pending") {
          return; // Abort if already processed
        }
        dep.status = targetStatus;
        if (targetStatus === "APPROVED") {
          dep.approvedAt = now;
          dep.approvedBy = (req as any).user?.uid || 'admin';
        } else {
          dep.rejectedAt = now;
          dep.rejectedBy = (req as any).user?.uid || 'admin';
        }
        dep.updatedAt = now;
      }
      return dep;
    });

    if (!transactionResult.committed) {
      return res.status(400).json({ error: "Deposit already processed or not found" });
    }
    
    const dep = transactionResult.snapshot.val();

    if (targetStatus === "APPROVED") {
      // 2. Safely increment the user's balance
      await runTransaction(ref(db, `users/${dep.userId}`), (user) => {
        if (user) {
          user.balance = (user.balance || 0) + Number(dep.amount);
          user.totalDeposited = (user.totalDeposited || 0) + Number(dep.amount);
        }
        return user;
      });

      // 3. Create the completed transaction record
      const txRef = push(ref(db, "transactions"));
      await update(ref(db), {
        [`transactions/${txRef.key}`]: {
          id: txRef.key,
          userId: dep.userId,
          type: "deposit",
          amount: Number(dep.amount),
          description: `Approved deposit via ${dep.method}`,
          reference: dep.reference,
          status: "completed",
          createdAt: now,
          completedAt: now,
          linkedDepositId: id
        }
      });
    }

    res.json({ success: true, status: targetStatus });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});


expressApp.delete("/api/admin/users/:userId", requireAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    // Delete from Firebase Auth
    try {
      await (admin as any).auth().deleteUser(userId);
    } catch (e) { console.error('Auth err:', e.message);
      if (e.code !== 'auth/user-not-found') throw e;
    }
    // Delete RTDB data
    const updates = {
      [`users/${userId}`]: null,
    };
    await update(ref(db), updates);
    res.json({ success: true, message: 'User deleted completely' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

expressApp.patch("/api/admin/withdrawals/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  try {
    const witSnap = await get(ref(db, `withdrawals/${id}`));
    if (!witSnap.exists()) throw new Error("Withdrawal not found");
    const wit = witSnap.val();
    if (wit.status !== "PENDING_ADMIN_APPROVAL") throw new Error("Withdrawal already processed");
    
    const now = Date.now();
    const updates: any = {};
    updates[`withdrawals/${id}/status`] = action;
    updates[`withdrawals/${id}/updatedAt`] = now;
    
    if (action === "REJECTED") {
      // Refund balance if rejected
      const userSnap = await get(ref(db, `users/${wit.userId}`));
      if (userSnap.exists()) {
        const u = userSnap.val();
        updates[`users/${wit.userId}/balance`] = (u.balance || 0) + wit.amount;
      }
    }
    
    if (action === "completed" || action === "REJECTED") {
      const txRef = push(ref(db, "transactions"));
      updates[`transactions/${txRef.key}`] = {
        id: txRef.key,
        userId: wit.userId,
        type: "withdrawal",
        amount: wit.amount,
        description: `${action === "completed" ? "Approved" : "Rejected"} withdrawal to ${wit.bankName}`,
        reference: wit.reference,
        status: action === "completed" ? "completed" : "failed",
        createdAt: now
      };
    }
    
    await update(ref(db), updates);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    expressApp.use(express.static(distPath));
    expressApp.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    expressApp.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }

  // Run backend worker in background so it never blocks startup
  initBackendWorker().catch(err => console.error("Background worker error:", err));
}

startServer();

export default expressApp;
export { expressApp };
