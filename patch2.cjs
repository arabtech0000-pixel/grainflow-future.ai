const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const oldRegex = /expressApp\.patch\("\/api\/admin\/deposits\/:id"[\s\S]*?res\.status\(400\)\.json\({ error: e\.message }\);\s*\}\s*\});/g;

const depositApprovalNew = `expressApp.patch("/api/admin/deposits/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; 
  try {
    const targetStatus = (action === "approved" || action === "completed") ? "approved" : "rejected";
    const now = Date.now();

    // Use runTransaction to prevent double approval
    const { committed, snapshot } = await runTransaction(ref(db, \`deposits/\${id}\`), (dep) => {
      if (dep) {
        if (dep.status === "approved" || dep.status === "rejected") {
          return; // Abort transaction if already processed
        }
        dep.status = targetStatus;
        if (targetStatus === "approved") {
          dep.approvedAt = now;
          dep.approvedBy = req.user.uid;
        } else {
          dep.rejectedAt = now;
          dep.rejectedBy = req.user.uid;
        }
        dep.updatedAt = now;
      }
      return dep;
    });

    if (!committed) {
      return res.status(400).json({ error: "Deposit already processed or locked" });
    }
    const dep = snapshot.val();

    if (targetStatus === "approved") {
      // Safely increment user balance
      await runTransaction(ref(db, \`users/\${dep.userId}\`), (user) => {
        if (user) {
          user.balance = (user.balance || 0) + Number(dep.amount);
          user.totalDeposited = (user.totalDeposited || 0) + Number(dep.amount);
        }
        return user;
      });

      const txRef = push(ref(db, "transactions"));
      await update(ref(db), {
        [\`transactions/\${txRef.key}\`]: {
          id: txRef.key,
          userId: dep.userId,
          type: "deposit",
          amount: Number(dep.amount),
          description: \`Approved deposit via \${dep.method}\`,
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
});`;

code = code.replace(oldRegex, depositApprovalNew);

fs.writeFileSync('server.ts', code);
