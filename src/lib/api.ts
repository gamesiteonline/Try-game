import { User, Transaction, LeaderboardEntry, SkinId, ThemeId } from "../types";

const API_URL = ""; // Relative URL for our Express proxy

function getHeaders() {
  const token = localStorage.getItem("cyber_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  async register(username: string, email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    localStorage.setItem("cyber_token", data.token);
    return data;
  },

  async login(email: string, password: string): Promise<{ user: User; token: string; dailyBonusAwarded?: boolean; dailyBonusAmount?: number }> {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    localStorage.setItem("cyber_token", data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: getHeaders(),
      });
    } catch (e) {
      console.error("Logout request failed, cleaning storage anyway", e);
    }
    localStorage.removeItem("cyber_token");
  },

  async getProfile(): Promise<{ user: User; dailyBonusAwarded?: boolean; dailyBonusAmount?: number }> {
    const res = await fetch(`${API_URL}/api/auth/profile`, {
      method: "GET",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch profile");
    return data;
  },

  // Transactions
  async topUp(amount: number, reference: string, proofName?: string): Promise<Transaction> {
    const res = await fetch(`${API_URL}/api/transactions/topup`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ amount, reference, proofName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Top up submission failed");
    return data.transaction;
  },

  async verifyInstant(transactionId: string): Promise<{ transaction: Transaction; user: User }> {
    const res = await fetch(`${API_URL}/api/transactions/verify-instant`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ transactionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Instant verification failed");
    return data;
  },

  async getTransactionHistory(): Promise<Transaction[]> {
    const res = await fetch(`${API_URL}/api/transactions/history`, {
      method: "GET",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch transaction history");
    return data.transactions;
  },

  // Shop
  async purchaseSkin(skinId: SkinId, price: number): Promise<{ user: User; transaction: Transaction }> {
    const res = await fetch(`${API_URL}/api/shop/purchase-skin`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ skinId, price }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Skin purchase failed");
    return data;
  },

  async purchaseTheme(themeId: ThemeId, price: number): Promise<{ user: User; transaction: Transaction }> {
    const res = await fetch(`${API_URL}/api/shop/purchase-theme`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ themeId, price }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Theme purchase failed");
    return data;
  },

  async equip(activeSkin?: SkinId, activeTheme?: ThemeId): Promise<User> {
    const res = await fetch(`${API_URL}/api/shop/equip`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ activeSkin, activeTheme }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to equip items");
    return data.user;
  },

  // Game Score & Leaderboard
  async submitScore(score: number): Promise<{ user: User; isNewHigh: boolean; creditsReward: number }> {
    const res = await fetch(`${API_URL}/api/game/submit-score`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ score }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit score");
    return data;
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const res = await fetch(`${API_URL}/api/game/leaderboard`, {
      method: "GET",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch leaderboard");
    return data.leaderboard;
  },
};
