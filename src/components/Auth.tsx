import React, { useState } from "react";
import { User } from "../types";
import { api } from "../lib/api";

interface AuthProps {
  user: User | null;
  onAuthSuccess: (user: User, dailyBonusAmount?: number) => void;
  onLogout: () => void;
}

export default function Auth({ user, onAuthSuccess, onLogout }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const data = await api.login(email, password);
        onAuthSuccess(data.user, data.dailyBonusAwarded ? data.dailyBonusAmount : undefined);
      } else {
        if (!username) {
          setError("Username is required.");
          setLoading(false);
          return;
        }
        const data = await api.register(username, email, password);
        onAuthSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    setError(null);
    try {
      await api.logout();
      onLogout();
    } catch (err: any) {
      setError(err.message || "Failed to logout");
    }
  };

  if (user) {
    return (
      <div className="arcade-panel p-6 bg-slate-900 border-green-500/20 max-w-md mx-auto relative overflow-hidden shadow-2xl">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 h-16 w-16 bg-green-500/10 rounded-full blur-2xl" />

        <div className="flex items-center gap-4 border-b border-green-500/10 pb-4 mb-5">
          <div className="h-14 w-14 rounded-full bg-slate-950 border-2 border-green-500 flex items-center justify-center font-bold text-green-400 text-lg">
            {user.username.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-mono text-green-400 tracking-wider">STATUS: CONNECTED</div>
            <div className="text-xl font-bold tracking-tight text-white">{user.username}</div>
            <div className="text-xs text-slate-500 truncate max-w-[200px]">{user.email}</div>
          </div>
        </div>

        {/* User stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-950/60 p-3 border border-slate-800 rounded-xl">
            <div className="text-[10px] font-mono text-slate-500">COIN WALLET</div>
            <div className="text-2xl font-bold font-mono text-glow-green text-green-300">
              {user.balance} <span className="text-xs text-green-400/80">Coins</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 border border-slate-800 rounded-xl">
            <div className="text-[10px] font-mono text-slate-500">BEST HIGHSCORE</div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {user.highScore} <span className="text-[10px] text-amber-500">PTS</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 border border-slate-800 rounded-xl">
            <div className="text-[10px] font-mono text-slate-500">GAMES PLAYED</div>
            <div className="text-lg font-bold font-mono text-slate-300">
              {user.totalGames} <span className="text-[10px] text-slate-500">ROUNDS</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 border border-slate-800 rounded-xl">
            <div className="text-[10px] font-mono text-slate-500">SKINS OWNED</div>
            <div className="text-lg font-bold font-mono text-slate-300">
              {user.unlockedSkins.length} <span className="text-[10px] text-slate-500">TYPES</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogoutClick}
          className="arcade-btn w-full py-3 bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 text-red-400 font-bold tracking-wider hover:border-red-500 rounded-xl"
          id="btn-logout"
        >
          LOG OUT OF PROFILE
        </button>
      </div>
    );
  }

  return (
    <div className="arcade-panel p-6 bg-slate-900 border-green-500/20 max-w-md mx-auto relative overflow-hidden shadow-2xl">
      <div className="absolute -top-10 -left-10 h-32 w-32 bg-green-500/5 rounded-full blur-3xl" />

      <div className="text-center mb-6">
        <h3 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-amber-400 uppercase mb-2">
          {isLogin ? "PLAYER SIGN IN" : "CREATE ACCOUNT"}
        </h3>
        <p className="text-xs text-slate-400">
          {isLogin ? "Sign in to save progress and equip gorgeous skins." : "Create a free profile to track your scores!"}
        </p>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/40 p-3 text-red-300 text-xs font-mono rounded-xl mb-4 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isLogin && (
          <div>
            <label className="block text-[10px] font-mono text-slate-400 tracking-wider uppercase mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. SunnyGamer"
              className="w-full bg-slate-950 border border-green-500/10 focus:border-green-500/40 rounded-xl p-3 text-sm font-mono text-white outline-none"
              id="input-reg-username"
            />
          </div>
        )}

        <div>
          <label className="block text-[10px] font-mono text-slate-400 tracking-wider uppercase mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. gamer@orchard.net"
            className="w-full bg-slate-950 border border-green-500/10 focus:border-green-500/40 rounded-xl p-3 text-sm font-mono text-white outline-none"
            id="input-auth-email"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-400 tracking-wider uppercase mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full bg-slate-950 border border-green-500/10 focus:border-green-500/40 rounded-xl p-3 text-sm font-mono text-white outline-none"
            id="input-auth-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="arcade-btn w-full py-4 bg-green-500 text-slate-950 hover:bg-green-400 font-black tracking-wider uppercase transition-all rounded-xl mt-2 disabled:opacity-50 text-sm shadow-lg"
          id="btn-auth-submit"
        >
          {loading ? "AUTHENTICATING..." : isLogin ? "LOG IN" : "REGISTER"}
        </button>
      </form>

      <div className="text-center mt-6 pt-4 border-t border-slate-800/60">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
          className="text-xs font-mono text-green-400/80 hover:text-green-400 hover:underline"
          id="btn-toggle-auth-mode"
        >
          {isLogin ? "Don't have an account? REGISTER HERE" : "Already registered? LOG IN HERE"}
        </button>
      </div>
    </div>
  );
}
