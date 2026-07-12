import React, { useEffect, useState } from "react";
import { LeaderboardEntry, SKINS_DATA } from "../types";
import { api } from "../lib/api";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setEntries(data);
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="arcade-panel p-6 bg-slate-900 border-green-500/10 max-w-xl mx-auto relative overflow-hidden">
      <div className="absolute top-0 right-0 h-24 w-24 bg-green-500/5 rounded-full blur-2xl" />

      <h3 className="text-lg font-bold text-green-400 mb-4 tracking-wider uppercase border-b border-green-500/10 pb-2 flex justify-between items-center">
        <span>GLOBAL HIGHSCORES</span>
        <button
          onClick={fetchLeaderboard}
          className="text-[10px] text-green-400 hover:text-green-200 hover:underline font-mono"
          id="btn-refresh-leaderboard"
        >
          REFRESH
        </button>
      </h3>

      {loading ? (
        <div className="text-center py-8 text-xs font-mono text-slate-500 animate-pulse">
          RETRIEVING HIGHSCORES...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-xs font-mono text-slate-500">
          No scores logged in current cycle.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            const skinName = SKINS_DATA[entry.activeSkin]?.name || "Classic Green";

            return (
              <div
                key={rank + entry.username}
                className={`flex items-center justify-between p-3 rounded-xl font-mono text-xs border ${
                  rank === 1
                    ? "bg-amber-950/20 border-amber-500/30 text-amber-100"
                    : rank === 2
                      ? "bg-slate-800/50 border-slate-700/20 text-slate-200"
                      : rank === 3
                        ? "bg-orange-950/20 border-orange-500/20 text-orange-200"
                        : "bg-slate-950/20 border-slate-900 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank circle */}
                  <span
                    className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      rank === 1
                        ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                        : rank === 2
                          ? "bg-slate-400 text-slate-950 shadow-lg shadow-slate-500/20"
                          : rank === 3
                            ? "bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20"
                            : "bg-slate-950 border border-slate-850 text-slate-500"
                    }`}
                  >
                    {rank}
                  </span>

                  <div>
                    <span className="font-bold text-white text-sm">{entry.username}</span>
                    <span className="text-[9px] text-slate-500 block truncate max-w-[150px]">
                      SKIN: {skinName}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-bold font-mono ${
                      rank === 1
                        ? "text-amber-400"
                        : rank === 2
                          ? "text-slate-200"
                          : rank === 3
                            ? "text-orange-400"
                            : "text-green-400"
                    }`}
                  >
                    {entry.score} <span className="text-[10px] font-normal text-slate-500">PTS</span>
                  </div>
                  <span className="text-[8px] text-slate-600 block">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
