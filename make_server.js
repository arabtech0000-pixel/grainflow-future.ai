const fs = require('fs');

const code = `import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set, get, child, update, push, serverTimestamp, query, orderByChild, equalTo } from "firebase/database";
import fs from "fs";

// Load Firebase Config
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  console.error("Missing firebase-applet-config.json!");
  process.exit(1);
}
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const app = initializeApp({ ...firebaseConfig, databaseURL: "https://elearning-e9601-default-rtdb.firebaseio.com" });
const auth = getAuth(app);
const db = getDatabase(app);

const expressApp = express();
const PORT = 3000;
expressApp.use(express.json());

// Helper to seed database and authenticate server worker
async function initBackendWorker() {
  try {
    let adminUid = "";
    try {
      const cred = await signInWithEmailAndPassword(auth, "ashirafashes04@gmail.com", "popular-24");
      adminUid = cred.user.uid;
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        const cred = await createUserWithEmailAndPassword(auth, "ashirafashes04@gmail.com", "popular-24");
        adminUid = cred.user.uid;
        await set(ref(db, \`users/\${adminUid}\`), {
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
          createdAt: serverTimestamp()
        });
      } else if (e.code === 'auth/operation-not-allowed') {
        console.error("Email/Password authentication is disabled in your Firebase project.");
      } else {
        throw e;
      }
    }
    
    // Seed VIP Plans
    const plansRef = ref(db, "products");
    const plansSnap = await get(plansRef);
    if (!plansSnap.exists()) {
      const plans = [
        { id: "vip1", name: "VIP 1 - Solar Panel", investmentAmount: 20000, dailyIncome: 1000, durationDays: 30, totalExpectedEarnings: 30000, totalPayout: 50000 },
        { id: "vip2", name: "VIP 2 - Solar Battery", investmentAmount: 50000, dailyIncome: 3000, durationDays: 30, totalExpectedEarnings: 90000, totalPayout: 140000 },
        { id: "vip3", name: "VIP 3 - Solar Inverter", investmentAmount: 120000, dailyIncome: 8000, durationDays: 30, totalExpectedEarnings: 240000, totalPayout: 360000 }
      ];
      for (const p of plans) {
        await set(ref(db, \`products/\${p.id}\`), { ...p, createdAt: serverTimestamp() });
      }
    }
  } catch (err) {
    console.error("Worker init failed:", err);
  }
}

// Process Deposit
expressApp.patch("/api/admin/deposits/:id", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  try {
    const depRef = ref(db, \`deposits/\${id}\`);
    const depSnap = await get(depRef);
    if (!depSnap.exists()) throw new Error("Deposit not found");
    const dep = depSnap.val();
    if (dep.status !== "pending") throw new Error("Deposit already processed");
    
    const updates = {};
    updates[\`deposits/\${id}/status\`] = action;
    updates[\`deposits/\${id}/updatedAt\`] = serverTimestamp();
    
    // Update tx status
    const txQ = query(ref(db, "transactions"), orderByChild("reference"), equalTo(dep.reference));
    const txSnap = await get(txQ);
    if (txSnap.exists()) {
      txSnap.forEach(t => {
        updates[\`transactions/\${t.key}/status\`] = action;
      });
    }
    
    if (action === "completed") {
      const userSnap = await get(ref(db, \`users/\${dep.userId}\`));
      if (userSnap.exists()) {
        const user = userSnap.val();
        updates[\`users/\${dep.userId}/balance\`] = (user.balance || 0) + dep.amount;
      }
    }
    
    await update(ref(db), updates);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Process Withdrawal
expressApp.patch("/api/admin/withdrawals/:id", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  try {
    const witRef = ref(db, \`withdrawals/\${id}\`);
    const witSnap = await get(witRef);
    if (!witSnap.exists()) throw new Error("Withdrawal not found");
    const wit = witSnap.val();
    if (wit.status !== "pending") throw new Error("Withdrawal already processed");
    
    const updates = {};
    updates[\`withdrawals/\${id}/status\`] = action;
    updates[\`withdrawals/\${id}/updatedAt\`] = serverTimestamp();
    
    const txQ = query(ref(db, "transactions"), orderByChild("reference"), equalTo(wit.reference));
    const txSnap = await get(txQ);
    if (txSnap.exists()) {
      txSnap.forEach(t => {
        updates[\`transactions/\${t.key}/status\`] = action;
      });
    }
    
    if (action === "rejected") {
      const userSnap = await get(ref(db, \`users/\${wit.userId}\`));
      if (userSnap.exists()) {
        const user = userSnap.val();
        updates[\`users/\${wit.userId}/balance\`] = (user.balance || 0) + wit.amount;
        
        const newTxRef = push(ref(db, "transactions"));
        updates[\`transactions/\${newTxRef.key}\`] = {
          userId: wit.userId,
          type: "deposit",
          amount: wit.amount,
          description: "Withdrawal rejection refund",
          status: "completed",
          createdAt: serverTimestamp()
        };
      }
    }
    
    await update(ref(db), updates);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Purchase Investment
expressApp.post("/api/investments/purchase", async (req, res) => {
  const { userId, productId } = req.body;
  if (!userId || !productId) return res.status(400).json({ error: "Missing parameters" });
  try {
    const userSnap = await get(ref(db, \`users/\${userId}\`));
    if (!userSnap.exists()) throw new Error("User not found");
    const user = userSnap.val();
    
    const prodSnap = await get(ref(db, \`products/\${productId}\`));
    if (!prodSnap.exists()) throw new Error("Plan not found");
    const prod = prodSnap.val();
    
    if (user.balance < prod.investmentAmount) {
      throw new Error("Insufficient balance. Please deposit funds first.");
    }
    
    const updates = {};
    updates[\`users/\${userId}/balance\`] = user.balance - prod.investmentAmount;
    
    const invRef = push(ref(db, "investments"));
    updates[\`investments/\${invRef.key}\`] = {
      userId,
      planId: productId,
      planName: prod.name,
      investmentAmount: prod.investmentAmount,
      dailyIncome: prod.dailyIncome,
      durationDays: prod.durationDays,
      expectedEarnings: prod.totalExpectedEarnings,
      totalPayout: prod.totalPayout,
      accruedEarnings: 0,
      daysAccrued: 0,
      startDate: serverTimestamp(),
      lastAccrualDate: serverTimestamp(),
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const txRef = push(ref(db, "transactions"));
    updates[\`transactions/\${txRef.key}\`] = {
      userId,
      type: "investment",
      amount: prod.investmentAmount,
      description: \`Purchased plan: \${prod.name}\`,
      status: "completed",
      createdAt: serverTimestamp()
    };
    
    if (user.referredBy) {
      const refQ = query(ref(db, "users"), orderByChild("referralCode"), equalTo(user.referredBy));
      const refSnap = await get(refQ);
      if (refSnap.exists()) {
        refSnap.forEach(r => {
          const referrer = r.val();
          const commission = prod.investmentAmount * 0.10;
          updates[\`users/\${r.key}/balance\`] = (referrer.balance || 0) + commission;
          updates[\`users/\${r.key}/referralEarnings\`] = (referrer.referralEarnings || 0) + commission;
          updates[\`users/\${r.key}/totalEarnings\`] = (referrer.totalEarnings || 0) + commission;
          
          const refTx = push(ref(db, "transactions"));
          updates[\`transactions/\${refTx.key}\`] = {
            userId: r.key,
            type: "referral_bonus",
            amount: commission,
            description: \`10% Commission for \${user.fullName}'s investment\`,
            status: "completed",
            createdAt: serverTimestamp()
          };
        });
      }
    }
    
    await update(ref(db), updates);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    expressApp.use(express.static(distPath));
    expressApp.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  expressApp.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
    initBackendWorker().catch(console.error);
  });
}
startServer();
`;

fs.writeFileSync('server.ts', code);
