import express from "express";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { SkinId, ThemeId, Transaction, User, LeaderboardEntry } from "./src/types";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "data-store.json");

app.use(express.json());

// In-memory sessions
const SESSIONS: Record<string, string> = {}; // token -> userId

// Database Interface
interface DatabaseSchema {
  users: Record<string, User & { passwordHash: string; salt: string }>;
  transactions: Transaction[];
  leaderboard: LeaderboardEntry[];
}

// Helper to initialize and read DB
async function getDB(): Promise<DatabaseSchema> {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    const defaultDB: DatabaseSchema = {
      users: {},
      transactions: [],
      leaderboard: [
        { username: "MeadowGlider", score: 320, activeSkin: SkinId.RUBY_RED, timestamp: new Date().toISOString() },
        { username: "AppleCatcher", score: 240, activeSkin: SkinId.CLASSIC_GREEN, timestamp: new Date().toISOString() },
        { username: "SkyHigh", score: 180, activeSkin: SkinId.SKY_BLUE, timestamp: new Date().toISOString() },
      ],
    };
    await fs.writeFile(DB_FILE, JSON.stringify(defaultDB, null, 2), "utf-8");
    return defaultDB;
  }
}

// Helper to write DB
async function saveDB(db: DatabaseSchema): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

// Authentication Middleware
async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. Please login." });
  }
  const token = authHeader.split(" ")[1];
  const userId = SESSIONS[token];
  if (!userId) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
  const db = await getDB();
  const user = db.users[userId];
  if (!user) {
    return res.status(401).json({ error: "User not found." });
  }
  (req as any).user = user;
  (req as any).token = token;
  next();
}

// Daily Login Bonus Checker
function checkAndApplyDailyBonus(user: any, db: any): { claimed: boolean; amount: number } {
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const lastClaimStr = user.lastLoginBonusClaimedAt ? user.lastLoginBonusClaimedAt.split("T")[0] : null;

  if (!lastClaimStr || lastClaimStr !== todayStr) {
    const bonusAmount = 50; // 50 credits/coins
    user.balance += bonusAmount;
    user.lastLoginBonusClaimedAt = new Date().toISOString();

    // Create a transaction record for history log
    const bonusTx: Transaction = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      type: "topup",
      amount: 0,
      creditsEarned: bonusAmount,
      status: "completed",
      reference: `DAILY-BONUS-${todayStr}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      timestamp: new Date().toISOString(),
      description: "Daily Login Reward 🎁",
    };
    db.transactions.unshift(bonusTx);
    return { claimed: true, amount: bonusAmount };
  }
  return { claimed: false, amount: 0 };
}

// Password Hashing
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

// API Routes

// Registration
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required." });
    }

    const db = await getDB();

    // Check existing
    const emailExists = Object.values(db.users).some((u) => u.email.toLowerCase() === email.toLowerCase());
    const usernameExists = Object.values(db.users).some((u) => u.username.toLowerCase() === username.toLowerCase());

    if (emailExists) {
      return res.status(400).json({ error: "Email is already registered." });
    }
    if (usernameExists) {
      return res.status(400).json({ error: "Username is already taken." });
    }

    const userId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);

    const newUser: User & { passwordHash: string; salt: string } = {
      id: userId,
      username,
      email,
      balance: 100, // Gift 100 Credits to start
      unlockedSkins: [SkinId.CLASSIC_GREEN],
      unlockedThemes: [ThemeId.COZY_MEADOW],
      activeSkin: SkinId.CLASSIC_GREEN,
      activeTheme: ThemeId.COZY_MEADOW,
      highScore: 0,
      totalGames: 0,
      passwordHash,
      salt,
      lastLoginBonusClaimedAt: new Date().toISOString(), // Initial claim on signup
    };

    db.users[userId] = newUser;
    await saveDB(db);

    const token = crypto.randomBytes(32).toString("hex");
    SESSIONS[token] = userId;

    const { passwordHash: _, salt: __, ...userPublic } = newUser;
    res.status(201).json({ user: userPublic, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const db = await getDB();
    const userEntry = Object.values(db.users).find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!userEntry) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const inputHash = hashPassword(password, userEntry.salt);
    if (inputHash !== userEntry.passwordHash) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    SESSIONS[token] = userEntry.id;

    // Apply daily bonus if applicable
    const bonusResult = checkAndApplyDailyBonus(userEntry, db);
    if (bonusResult.claimed) {
      await saveDB(db);
    }

    const { passwordHash: _, salt: __, ...userPublic } = userEntry;
    res.status(200).json({ 
      user: userPublic, 
      token,
      dailyBonusAwarded: bonusResult.claimed,
      dailyBonusAmount: bonusResult.amount 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post("/api/auth/logout", authenticate, (req, res) => {
  const token = (req as any).token;
  delete SESSIONS[token];
  res.status(200).json({ success: true });
});

// Get User Profile
app.get("/api/auth/profile", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const db = await getDB();
    const dbUser = db.users[user.id];

    if (!dbUser) {
      return res.status(404).json({ error: "User profile not found." });
    }

    // Apply daily bonus if applicable
    const bonusResult = checkAndApplyDailyBonus(dbUser, db);
    if (bonusResult.claimed) {
      await saveDB(db);
    }

    const { passwordHash: _, salt: __, ...userPublic } = dbUser;
    res.status(200).json({ 
      user: userPublic,
      dailyBonusAwarded: bonusResult.claimed,
      dailyBonusAmount: bonusResult.amount 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Top Up Transaction (CRDB Bank payments)
app.post("/api/transactions/topup", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { amount, reference, proofName } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "A valid top-up amount in CAD is required." });
    }
    if (!reference) {
      return res.status(400).json({ error: "A payment transaction reference number is required." });
    }

    const db = await getDB();

    // Prevent duplicate references
    const referenceExists = db.transactions.some(
      (t) => t.reference.toLowerCase() === reference.toLowerCase() && t.status !== "failed"
    );
    if (referenceExists) {
      return res.status(400).json({ error: "This transaction reference has already been submitted." });
    }

    const creditsEarned = Math.round(amount * 100); // 1 CAD = 100 credits

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      type: "topup",
      amount,
      creditsEarned,
      status: "pending",
      reference,
      proofName: proofName || null,
      timestamp: new Date().toISOString(),
      description: `CRDB Bank Transfer to CAD A/C 10433574279 - Ref: ${reference}`,
    };

    db.transactions.unshift(newTransaction);
    await saveDB(db);

    res.status(201).json({ transaction: newTransaction });

    // Simulate "Real-time Transaction Processing" in the background
    // After 8 seconds, verify and complete the payment automatically!
    setTimeout(async () => {
      try {
        const bgDb = await getDB();
        const txIndex = bgDb.transactions.findIndex((t) => t.id === newTransaction.id);
        if (txIndex !== -1 && bgDb.transactions[txIndex].status === "pending") {
          bgDb.transactions[txIndex].status = "verifying";
          await saveDB(bgDb);

          // Wait another 7 seconds for actual clearing simulation
          setTimeout(async () => {
            try {
              const finalDb = await getDB();
              const finalTxIndex = finalDb.transactions.findIndex((t) => t.id === newTransaction.id);
              if (finalTxIndex !== -1 && finalDb.transactions[finalTxIndex].status === "verifying") {
                finalDb.transactions[finalTxIndex].status = "completed";

                // Add balance to user
                const txUser = finalDb.users[user.id];
                if (txUser) {
                  txUser.balance += creditsEarned;
                }
                await saveDB(finalDb);
                console.log(`[REAL-TIME TRANSACTION] Transaction ${newTransaction.id} verified. Credited ${creditsEarned} credits to user ${user.id}.`);
              }
            } catch (err) {
              console.error("Error finalizing transaction in background:", err);
            }
          }, 7000);
        }
      } catch (err) {
        console.error("Error updating transaction status in background:", err);
      }
    }, 6000);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Force trigger instant transaction verification for immediate credits
app.post("/api/transactions/verify-instant", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: "Transaction ID is required." });
    }

    const db = await getDB();
    const tx = db.transactions.find((t) => t.id === transactionId && t.userId === user.id);

    if (!tx) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    if (tx.status === "completed") {
      return res.status(400).json({ error: "Transaction is already completed." });
    }

    tx.status = "completed";
    const u = db.users[user.id];
    if (u) {
      u.balance += tx.creditsEarned;
    }

    await saveDB(db);
    const { passwordHash: _, salt: __, ...userPublic } = u;
    res.status(200).json({ transaction: tx, user: userPublic });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get User's Transaction History
app.get("/api/transactions/history", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const db = await getDB();
    const userTransactions = db.transactions.filter((t) => t.userId === user.id);
    res.status(200).json({ transactions: userTransactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Purchase Skin
app.post("/api/shop/purchase-skin", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { skinId, price } = req.body;

    if (!skinId || price === undefined) {
      return res.status(400).json({ error: "Skin ID and price are required." });
    }

    const db = await getDB();
    const u = db.users[user.id];

    if (u.unlockedSkins.includes(skinId)) {
      return res.status(400).json({ error: "Skin is already unlocked." });
    }

    if (u.balance < price) {
      return res.status(400).json({ error: `Insufficient Neon Credits. You need ${price} credits but have ${u.balance}.` });
    }

    u.balance -= price;
    u.unlockedSkins.push(skinId);

    // Record purchase transaction
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      type: "purchase",
      amount: 0,
      creditsEarned: -price,
      status: "completed",
      reference: `PURCHASE-${skinId.toUpperCase()}-${crypto.randomBytes(4).toString("hex")}`,
      timestamp: new Date().toISOString(),
      description: `Unlocked skin: ${skinId}`,
    };
    db.transactions.unshift(newTx);

    await saveDB(db);

    const { passwordHash: _, salt: __, ...userPublic } = u;
    res.status(200).json({ user: userPublic, transaction: newTx });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Purchase Theme
app.post("/api/shop/purchase-theme", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { themeId, price } = req.body;

    if (!themeId || price === undefined) {
      return res.status(400).json({ error: "Theme ID and price are required." });
    }

    const db = await getDB();
    const u = db.users[user.id];

    if (u.unlockedThemes.includes(themeId)) {
      return res.status(400).json({ error: "Theme is already unlocked." });
    }

    if (u.balance < price) {
      return res.status(400).json({ error: `Insufficient Neon Credits. You need ${price} credits but have ${u.balance}.` });
    }

    u.balance -= price;
    u.unlockedThemes.push(themeId);

    // Record purchase transaction
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      type: "purchase",
      amount: 0,
      creditsEarned: -price,
      status: "completed",
      reference: `PURCHASE-${themeId.toUpperCase()}-${crypto.randomBytes(4).toString("hex")}`,
      timestamp: new Date().toISOString(),
      description: `Unlocked theme: ${themeId}`,
    };
    db.transactions.unshift(newTx);

    await saveDB(db);

    const { passwordHash: _, salt: __, ...userPublic } = u;
    res.status(200).json({ user: userPublic, transaction: newTx });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Active Customization
app.post("/api/shop/equip", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { activeSkin, activeTheme } = req.body;

    const db = await getDB();
    const u = db.users[user.id];

    if (activeSkin) {
      if (!u.unlockedSkins.includes(activeSkin)) {
        return res.status(400).json({ error: "You haven't unlocked this skin." });
      }
      u.activeSkin = activeSkin;
    }

    if (activeTheme) {
      if (!u.unlockedThemes.includes(activeTheme)) {
        return res.status(400).json({ error: "You haven't unlocked this theme." });
      }
      u.activeTheme = activeTheme;
    }

    await saveDB(db);
    const { passwordHash: _, salt: __, ...userPublic } = u;
    res.status(200).json({ user: userPublic });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update User Highscore and Game count
app.post("/api/game/submit-score", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { score } = req.body;

    if (score === undefined || isNaN(score)) {
      return res.status(400).json({ error: "Score is required." });
    }

    const db = await getDB();
    const u = db.users[user.id];

    u.totalGames += 1;
    let isNewHigh = false;
    if (score > u.highScore) {
      u.highScore = score;
      isNewHigh = true;

      // Add to leaderboard
      db.leaderboard.push({
        username: u.username,
        score,
        activeSkin: u.activeSkin,
        timestamp: new Date().toISOString(),
      });

      // Sort and keep top 10
      db.leaderboard.sort((a, b) => b.score - a.score);
      db.leaderboard = db.leaderboard.slice(0, 10);
    }

    // Earn some free credits for playing! (e.g. 1 Credit per food item eaten / point scored)
    const creditsReward = Math.floor(score * 0.5); // 0.5 Credits per score point
    if (creditsReward > 0) {
      u.balance += creditsReward;
    }

    await saveDB(db);

    const { passwordHash: _, salt: __, ...userPublic } = u;
    res.status(200).json({
      user: userPublic,
      isNewHigh,
      creditsReward,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Leaderboard
app.get("/api/game/leaderboard", async (req, res) => {
  try {
    const db = await getDB();
    res.status(200).json({ leaderboard: db.leaderboard });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Start server function incorporating Vite middleware
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Cyberpunk Snake Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
