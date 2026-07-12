import React, { useEffect, useState } from "react";
import ThreeSnakeGame from "./components/ThreeSnakeGame";
import Auth from "./components/Auth";
import Transactions from "./components/Transactions";
import Shop from "./components/Shop";
import Leaderboard from "./components/Leaderboard";
import { User, SkinId, ThemeId } from "./types";
import { api } from "./lib/api";
import { sound } from "./lib/sound";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"game" | "transactions" | "shop" | "leaderboard" | "auth">("game");
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [dailyBonusReward, setDailyBonusReward] = useState<number | null>(null);
  const [gameOverPopup, setGameOverPopup] = useState<{
    score: number;
    creditsEarned: number;
    isNewHigh: boolean;
  } | null>(null);

  // Auto-fetch profile on boot if token exists
  useEffect(() => {
    const token = localStorage.getItem("cyber_token");
    if (token) {
      api.getProfile()
        .then((res) => {
          setUser(res.user);
          if (res.dailyBonusAwarded && res.dailyBonusAmount) {
            setDailyBonusReward(res.dailyBonusAmount);
            sound.playReward();
          }
        })
        .catch(() => {
          localStorage.removeItem("cyber_token");
        });
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser: User, dailyBonusAmount?: number) => {
    setUser(authenticatedUser);
    setActiveTab("game"); // Switch back to game on success
    if (dailyBonusAmount) {
      setDailyBonusReward(dailyBonusAmount);
      sound.playReward();
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab("game");
  };

  const handleBalanceUpdated = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleGameOver = async (finalScore: number) => {
    setIsGameRunning(false);

    if (user) {
      try {
        const res = await api.submitScore(finalScore);
        setUser(res.user);
        setGameOverPopup({
          score: finalScore,
          creditsEarned: res.creditsReward,
          isNewHigh: res.isNewHigh,
        });
      } catch (e) {
        console.error("Failed to submit game over score:", e);
        setGameOverPopup({
          score: finalScore,
          creditsEarned: 0,
          isNewHigh: false,
        });
      }
    } else {
      // Unauthenticated game over state
      setGameOverPopup({
        score: finalScore,
        creditsEarned: 0,
        isNewHigh: false,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b131a] text-slate-200 relative pb-12">
      {/* Moving background grid effect */}
      <div className="absolute inset-0 arcade-grid opacity-35 pointer-events-none" />

      {/* Modern arcade header banner */}
      <header className="border-b border-emerald-500/10 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border-2 border-green-500 bg-green-500/10 flex items-center justify-center font-black text-green-400 text-glow-green shadow-green-900/20 shadow-lg text-lg rotate-3">
              🍎
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wider uppercase">
                3D ORCHARD SNAKE
              </h1>
              <p className="text-[9px] text-slate-400 font-mono tracking-wider uppercase">
                SECURE CAD 10433574279 CRDB PAYMENT HUB
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-wrap gap-2 md:gap-3 justify-center">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("game");
                setGameOverPopup(null);
              }}
              className={`arcade-btn px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-all ${
                activeTab === "game"
                  ? "bg-green-500 text-slate-950 border-green-400"
                  : "bg-slate-800/40 text-green-400 border-green-500/10 hover:border-green-400/50 hover:text-green-200"
              }`}
              id="nav-game"
            >
              PLAY SNAKE
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("transactions");
                setGameOverPopup(null);
              }}
              className={`arcade-btn px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-all ${
                activeTab === "transactions"
                  ? "bg-green-500 text-slate-950 border-green-400"
                  : "bg-slate-800/40 text-green-400 border-green-500/10 hover:border-green-400/50 hover:text-green-200"
              }`}
              id="nav-transactions"
            >
              TOP-UP / WALLET
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("shop");
                setGameOverPopup(null);
              }}
              className={`arcade-btn px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-all ${
                activeTab === "shop"
                  ? "bg-green-500 text-slate-950 border-green-400"
                  : "bg-slate-800/40 text-green-400 border-green-500/10 hover:border-green-400/50 hover:text-green-200"
              }`}
              id="nav-shop"
            >
              UNLOCK SKINS
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("leaderboard");
                setGameOverPopup(null);
              }}
              className={`arcade-btn px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-all ${
                activeTab === "leaderboard"
                  ? "bg-green-500 text-slate-950 border-green-400"
                  : "bg-slate-800/40 text-green-400 border-green-500/10 hover:border-green-400/50 hover:text-green-200"
              }`}
              id="nav-leaderboard"
            >
              LEADERBOARD
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("auth");
                setGameOverPopup(null);
              }}
              className={`arcade-btn px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                activeTab === "auth"
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : "bg-slate-800/40 text-amber-400 border-amber-500/10 hover:border-amber-400/50 hover:text-amber-200"
              }`}
              id="nav-auth"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {user ? user.username : "SIGN IN / UP"}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {activeTab === "game" && (
          <div className="flex flex-col gap-6">
            <ThreeSnakeGame
              activeSkin={user ? user.activeSkin : SkinId.CLASSIC_GREEN}
              activeTheme={user ? user.activeTheme : ThemeId.COZY_MEADOW}
              isGameRunning={isGameRunning}
              onGameStart={() => {
                setIsGameRunning(true);
                setGameOverPopup(null);
              }}
              onGameOver={handleGameOver}
            />

            {/* In-game quick balance guide if unauthenticated */}
            {!user && (
              <div className="max-w-xl mx-auto p-4 bg-slate-900/90 border border-green-500/10 rounded-2xl text-center mt-4 shadow-xl">
                <span className="text-green-400 font-bold text-xs uppercase block mb-1">
                  💡 ACCOUNT PERKS & PROGRESSION
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  You are playing in Guest mode. Sign up under <strong className="text-green-400 cursor-pointer hover:underline" onClick={() => setActiveTab("auth")}>SIGN IN / UP</strong> to unlock adorable skins, save custom highscores, and purchase credits via secure CRDB Bank Transfer (CAD Account 10433574279)!
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "transactions" && (
          <Transactions user={user} onBalanceUpdated={handleBalanceUpdated} />
        )}

        {activeTab === "shop" && (
          <Shop user={user} onBalanceUpdated={handleBalanceUpdated} />
        )}

        {activeTab === "leaderboard" && <Leaderboard />}

        {activeTab === "auth" && (
          <Auth
            user={user}
            onAuthSuccess={handleAuthSuccess}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Game Over Modal overlay */}
      {gameOverPopup && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="arcade-panel p-6 bg-slate-900/95 border-amber-500 max-w-md w-full text-center relative shadow-2xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-amber-500 text-slate-950 font-extrabold text-[10px] tracking-wider uppercase rounded-full">
              ROUND ENDED
            </div>

            <h2 className="text-4xl font-black text-amber-400 uppercase mb-2 mt-2">
              GAME OVER
            </h2>

            <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-xl my-5">
              <div className="text-xs font-mono text-slate-400">FINAL SCORE</div>
              <div className="text-4xl font-black text-glow-green text-green-400 font-mono my-1">
                {gameOverPopup.score}
              </div>
              
              {user ? (
                <div className="mt-3.5 pt-3.5 border-t border-slate-900 flex flex-col gap-1 text-[11px] font-sans">
                  {gameOverPopup.isNewHigh && (
                    <div className="text-emerald-400 font-bold">
                      🏆 NEW PERSONAL HIGH SCORE!
                    </div>
                  )}
                  <div className="text-slate-300">
                    Earned Coins: <span className="text-amber-400">+{gameOverPopup.creditsEarned} Coins</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    (Coins are awarded at a rate of 0.5 per score point)
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-amber-400/80 mt-3 font-sans">
                  ⚠️ Sign up under SIGN IN / UP to claim coins for your score!
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setGameOverPopup(null);
                  setIsGameRunning(true);
                }}
                className="arcade-btn flex-1 py-3 bg-green-500 hover:bg-green-400 text-slate-950 font-black uppercase tracking-wider text-sm"
                id="btn-retry-over"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={() => {
                  setGameOverPopup(null);
                }}
                className="arcade-btn px-6 py-3 bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white text-sm"
                id="btn-close-over"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Daily Login Reward Modal */}
      {dailyBonusReward !== null && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="arcade-panel p-6 bg-slate-900 border-green-500/20 max-w-sm w-full text-center relative shadow-2xl overflow-hidden">
            {/* Ambient decorative glow */}
            <div className="absolute -top-12 -left-12 h-32 w-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 h-32 w-32 bg-green-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-5xl mb-4 animate-bounce">🎁</div>
            
            <h2 className="text-2xl font-black text-amber-400 uppercase tracking-wider mb-2">
              Daily Reward!
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Welcome back to the orchard, <strong className="text-white">{user?.username}</strong>! Here is your daily login bonus reward:
            </p>

            <div className="bg-slate-950/80 p-4 border border-slate-800 rounded-xl mb-6">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">REWARD CREDITED</div>
              <div className="text-3xl font-black text-green-400 font-mono flex items-center justify-center gap-1.5 my-1.5">
                <span>+ {dailyBonusReward}</span>
                <span className="text-lg text-green-500 font-sans">Coins</span>
              </div>
              <div className="text-[9px] text-slate-500 font-mono">Come back tomorrow for another login bonus!</div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setDailyBonusReward(null);
              }}
              className="arcade-btn w-full py-3 bg-green-500 hover:bg-green-400 text-slate-950 font-black uppercase tracking-wider text-sm shadow-lg"
              id="btn-claim-daily-reward"
            >
              COLLECT REWARD
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
