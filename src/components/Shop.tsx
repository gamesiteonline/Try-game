import React, { useState } from "react";
import { User, SKINS_DATA, THEMES_DATA, SkinId, ThemeId } from "../types";
import { api } from "../lib/api";
import { sound } from "../lib/sound";

interface ShopProps {
  user: User | null;
  onBalanceUpdated: (newUser: User) => void;
}

export default function Shop({ user, onBalanceUpdated }: ShopProps) {
  const [activeTab, setActiveTab] = useState<"skins" | "themes">("skins");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePurchaseSkin = async (skinId: SkinId, price: number) => {
    if (!user) {
      setError("Please login to purchase cosmetics.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await api.purchaseSkin(skinId, price);
      onBalanceUpdated(data.user);
      sound.playUnlock();
      setSuccess(`Unlocked skin: ${SKINS_DATA[skinId].name}! Ready to equip.`);
    } catch (err: any) {
      setError(err.message || "Failed to purchase skin.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseTheme = async (themeId: ThemeId, price: number) => {
    if (!user) {
      setError("Please login to purchase themes.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await api.purchaseTheme(themeId, price);
      onBalanceUpdated(data.user);
      sound.playUnlock();
      setSuccess(`Unlocked theme: ${THEMES_DATA[themeId].name}! Ready to equip.`);
    } catch (err: any) {
      setError(err.message || "Failed to purchase theme.");
    } finally {
      setLoading(false);
    }
  };

  const handleEquipSkin = async (skinId: SkinId) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedUser = await api.equip(skinId, undefined);
      onBalanceUpdated(updatedUser);
      sound.playClick();
      setSuccess(`Equipped skin: ${SKINS_DATA[skinId].name}!`);
    } catch (err: any) {
      setError(err.message || "Failed to equip skin.");
    } finally {
      setLoading(false);
    }
  };

  const handleEquipTheme = async (themeId: ThemeId) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedUser = await api.equip(undefined, themeId);
      onBalanceUpdated(updatedUser);
      sound.playClick();
      setSuccess(`Equipped arena theme: ${THEMES_DATA[themeId].name}!`);
    } catch (err: any) {
      setError(err.message || "Failed to equip theme.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-green-400 uppercase tracking-wider">
            ORCHARD COSMETIC SHOP
          </h3>
          <p className="text-xs text-slate-400">
            Unlock lovely custom skins for your snake and gorgeous orchard environment themes!
          </p>
        </div>

        {user && (
          <div className="bg-slate-900 p-3 px-5 border border-green-500/10 rounded-xl font-mono text-center">
            <span className="text-[9px] text-slate-500 block">YOUR WALLET BALANCE</span>
            <span className="text-xl font-bold text-glow-green text-green-300">{user.balance} Coins</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/40 p-3 text-red-300 text-xs font-mono rounded mb-4">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 text-emerald-300 text-xs font-mono rounded mb-4">
          ✅ {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800 mb-6">
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab("skins");
            setError(null);
            setSuccess(null);
          }}
          className={`pb-3 text-sm font-bold tracking-wider uppercase border-b-2 transition-all outline-none ${
            activeTab === "skins"
              ? "border-green-500 text-green-400 text-glow-green"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
          id="tab-shop-skins"
        >
          COZY SNAKE SKINS
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab("themes");
            setError(null);
            setSuccess(null);
          }}
          className={`pb-3 text-sm font-bold tracking-wider uppercase border-b-2 transition-all border-none ${
            activeTab === "themes"
              ? "border-b-2 border-green-500 text-green-400 text-glow-green"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
          id="tab-shop-themes"
        >
          ORCHARD CORNER THEMES
        </button>
      </div>

      {/* Skins Tab Grid */}
      {activeTab === "skins" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(SKINS_DATA).map((skin) => {
            const isUnlocked = user ? user.unlockedSkins.includes(skin.id) : skin.price === 0;
            const isEquipped = user ? user.activeSkin === skin.id : skin.id === SkinId.CLASSIC_GREEN;

            return (
              <div
                key={skin.id}
                className={`arcade-panel p-5 bg-slate-900/90 flex flex-col justify-between relative transition-all ${
                  isEquipped ? "border-green-500/40 ring-1 ring-green-500/10" : "border-slate-800"
                }`}
              >
                {/* Visual skin preview dot */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-slate-700 shadow-md"
                      style={{
                        backgroundColor: skin.color,
                      }}
                    />
                    <h4 className="font-bold text-white tracking-wide text-sm">{skin.name}</h4>
                  </div>
                  {isEquipped && (
                    <span className="px-2 py-0.5 bg-green-950/50 text-green-400 border border-green-500/25 rounded font-mono text-[8px] font-bold uppercase tracking-wider">
                      EQUIPPED
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-6 leading-relaxed flex-1">
                  {skin.description}
                </p>

                <div className="border-t border-slate-800/60 pt-4 flex items-center justify-between">
                  <div>
                    {!isUnlocked ? (
                      <div className="font-mono text-xs">
                        <span className="text-slate-500 block text-[9px]">PRICE</span>
                        <span className="text-green-400 font-bold">{skin.price} Coins</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                        UNLOCKED
                      </span>
                    )}
                  </div>

                  {!user ? (
                    <span className="text-[9px] text-slate-500">SIGN IN TO ACCESS</span>
                  ) : isUnlocked ? (
                    <button
                      onClick={() => handleEquipSkin(skin.id)}
                      disabled={isEquipped || loading}
                      className={`px-4 py-2 text-xs font-bold tracking-wider rounded-xl border ${
                        isEquipped
                          ? "bg-slate-950 text-slate-500 border-slate-900 cursor-not-allowed"
                          : "bg-green-950/40 border-green-500/30 hover:bg-green-500 hover:text-slate-950 text-green-400 hover:border-green-500 transition-all"
                      }`}
                      id={`btn-equip-skin-${skin.id}`}
                    >
                      {isEquipped ? "EQUIPPED" : "EQUIP"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchaseSkin(skin.id, skin.price)}
                      disabled={loading || user.balance < skin.price}
                      className={`px-4 py-2 text-xs font-bold tracking-wider rounded-xl border transition-all ${
                        user.balance < skin.price
                          ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-amber-500 hover:bg-amber-400 border-amber-500 text-slate-950"
                      }`}
                      id={`btn-buy-skin-${skin.id}`}
                    >
                      {user.balance < skin.price ? "LOCKED" : "UNLOCK"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Themes Tab Grid */}
      {activeTab === "themes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(THEMES_DATA).map((theme) => {
            const isUnlocked = user ? user.unlockedThemes.includes(theme.id) : theme.price === 0;
            const isEquipped = user ? user.activeTheme === theme.id : theme.id === ThemeId.COZY_MEADOW;

            return (
              <div
                key={theme.id}
                className={`arcade-panel p-5 bg-slate-900/90 flex flex-col justify-between relative transition-all ${
                  isEquipped ? "border-green-500/40 ring-1 ring-green-500/10" : "border-slate-800"
                }`}
              >
                {/* Visual grid line preview */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-slate-700"
                      style={{
                        backgroundColor: theme.backgroundColor,
                      }}
                    />
                    <h4 className="font-bold text-white tracking-wide text-sm">{theme.name}</h4>
                  </div>
                  {isEquipped && (
                    <span className="px-2 py-0.5 bg-green-950/50 text-green-400 border border-green-500/25 rounded font-mono text-[8px] font-bold uppercase tracking-wider">
                      ACTIVE THEME
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-6 leading-relaxed flex-1">
                  {theme.description}
                </p>

                <div className="border-t border-slate-800/60 pt-4 flex items-center justify-between">
                  <div>
                    {!isUnlocked ? (
                      <div className="font-mono text-xs">
                        <span className="text-slate-500 block text-[9px]">PRICE</span>
                        <span className="text-green-400 font-bold">{theme.price} Coins</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                        UNLOCKED
                      </span>
                    )}
                  </div>

                  {!user ? (
                    <span className="text-[9px] text-slate-500">SIGN IN TO ACCESS</span>
                  ) : isUnlocked ? (
                    <button
                      onClick={() => handleEquipTheme(theme.id)}
                      disabled={isEquipped || loading}
                      className={`px-4 py-2 text-xs font-bold tracking-wider rounded-xl border ${
                        isEquipped
                          ? "bg-slate-950 text-slate-500 border-slate-900 cursor-not-allowed"
                          : "bg-green-950/40 border-green-500/30 hover:bg-green-500 hover:text-slate-950 text-green-400 hover:border-green-500 transition-all"
                      }`}
                      id={`btn-equip-theme-${theme.id}`}
                    >
                      {isEquipped ? "EQUIPPED" : "EQUIP"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchaseTheme(theme.id, theme.price)}
                      disabled={loading || user.balance < theme.price}
                      className={`px-4 py-2 text-xs font-bold tracking-wider rounded-xl border transition-all ${
                        user.balance < theme.price
                          ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-amber-500 hover:bg-amber-400 border-amber-500 text-slate-950"
                      }`}
                      id={`btn-buy-theme-${theme.id}`}
                    >
                      {user.balance < theme.price ? "LOCKED" : "UNLOCK"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
