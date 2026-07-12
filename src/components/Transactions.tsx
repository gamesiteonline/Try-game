import React, { useState, useEffect } from "react";
import { User, Transaction } from "../types";
import { api } from "../lib/api";

interface TransactionsProps {
  user: User | null;
  onBalanceUpdated: (newUser: User) => void;
}

export default function Transactions({ user, onBalanceUpdated }: TransactionsProps) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch History on load and periodically to show real-time changes
  const fetchHistory = async () => {
    if (!user) return;
    try {
      const txs = await api.getTransactionHistory();
      setHistory(txs);
    } catch (err: any) {
      console.error("Failed to load transactions", err);
    }
  };

  useEffect(() => {
    fetchHistory();
    // Poll transaction history every 3 seconds to show background processing in real-time!
    const interval = setInterval(() => {
      fetchHistory();
      // If user profile changed, pull that too
      if (user) {
        api.getProfile().then((res) => {
          if (res.user.balance !== user.balance) {
            onBalanceUpdated(res.user);
          }
        }).catch(() => {});
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  // Handle Drag Over
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Basic check
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Only Image or PDF receipts are accepted.");
      }
    }
  };

  // Handle Manual Input click
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  // Submit payment claim
  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please authenticate before making transactions.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid deposit amount.");
      return;
    }

    if (!reference.trim()) {
      setError("A Bank wire / deposit reference number is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const proofName = selectedFile ? selectedFile.name : undefined;
      const tx = await api.topUp(numericAmount, reference, proofName);
      setSuccessMsg(`Deposit submitted successfully! Reference logged: ${tx.reference}. Real-time processing started.`);
      
      // Clear forms
      setAmount("");
      setReference("");
      setSelectedFile(null);

      // Re-fetch
      await fetchHistory();
    } catch (err: any) {
      setError(err.message || "Failed to submit transaction claim.");
    } finally {
      setLoading(false);
    }
  };

  // Immediate Verification Backdoor
  const handleVerifyInstant = async (txId: string) => {
    try {
      const result = await api.verifyInstant(txId);
      onBalanceUpdated(result.user);
      setSuccessMsg("Transaction cleared in real-time! Neon balance credited immediately.");
      fetchHistory();
    } catch (err: any) {
      setError(err.message || "Failed to verify transaction.");
    }
  };

  if (!user) {
    return (
      <div className="arcade-panel p-6 bg-slate-900 border-green-500/10 text-center max-w-xl mx-auto">
        <h3 className="text-xl font-bold text-green-400 mb-2">SECURE TRANSACTIONS</h3>
        <p className="text-sm text-slate-400 mb-6">
          Authentication required to access the CAD payment hub for CRDB Bank.
        </p>
        <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded inline-block text-xs text-green-300">
          🚨 PLEASE SIGN IN OR UP TO TOP UP YOUR WALLET
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto p-2">
      {/* Transaction Submission Side */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Deposit details card */}
        <div className="arcade-panel p-5 bg-gradient-to-br from-slate-900 to-slate-850 border-emerald-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-[8px] font-mono bg-emerald-500/20 text-emerald-300 tracking-wider rounded-bl-lg">
            CRDB DIRECT DEPOSIT
          </div>
          <h3 className="text-sm font-bold text-green-400 mb-4 tracking-wider uppercase border-b border-green-500/10 pb-2">
            CRDB BANK TRANSFER DETAILS
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono mb-4">
            <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
              <span className="text-slate-500 block mb-1">RECIPIENT BANK:</span>
              <span className="text-slate-200 font-bold">CRDB Bank Plc</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
              <span className="text-slate-500 block mb-1">SETTLE CURRENCY:</span>
              <span className="text-emerald-400 font-bold">CAD (Canadian Dollar)</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded border border-slate-800 md:col-span-2 relative">
              <span className="text-slate-500 block mb-1">ACCOUNT NUMBER (CAD):</span>
              <span className="text-green-300 font-bold text-lg text-glow-green">10433574279</span>
              <button 
                onClick={() => navigator.clipboard.writeText("10433574279")}
                className="absolute top-3 right-3 text-[10px] text-green-400 hover:text-green-200 border border-green-500/20 px-2 py-0.5 rounded"
              >
                COPY
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950 p-3 rounded border border-slate-800">
            <span className="text-green-400 font-bold">INSTRUCTIONS:</span> Make a wire transfer or deposit in CAD to the CRDB account above. Enter your reference number below and optionally upload your receipt image or PDF. Coins are instantly calculated at a rate of <strong className="text-green-300">1 CAD = 100 Coins</strong>.
          </div>
        </div>

        {/* Form Container */}
        <div className="arcade-panel p-5 bg-slate-900 border-green-500/10">
          <h3 className="text-sm font-bold text-green-400 mb-4 tracking-wider uppercase">
            LOG NEW DEPOSIT
          </h3>

          {error && (
            <div className="bg-red-950/40 border border-red-500/40 p-3 text-red-300 text-xs font-mono rounded mb-4">
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 text-emerald-300 text-xs font-mono rounded mb-4">
              ✅ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmitTopup} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Amount Transferred (CAD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 10.00"
                    className="w-full bg-slate-950 border border-green-500/10 focus:border-green-500/40 rounded p-3 pr-10 text-sm font-mono text-white outline-none"
                    id="input-tx-amount"
                  />
                  <span className="absolute right-3 top-3.5 text-[10px] font-mono text-slate-500">CAD</span>
                </div>
                {amount && (
                  <span className="text-[9px] font-mono text-green-400/80 mt-1 block">
                    = {Math.round(parseFloat(amount) * 100 || 0)} Coins
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  CRDB Reference / Tx ID
                </label>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. TXN-827394-CRDB"
                  className="w-full bg-slate-950 border border-green-500/10 focus:border-green-500/40 rounded p-3 text-sm font-mono text-white outline-none"
                  id="input-tx-ref"
                />
              </div>
            </div>

            {/* Receipt Uploader supporting Drag & Drop */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                Upload Proof of Deposit (Optional)
              </label>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-5 text-center transition-all ${
                  dragActive 
                    ? "border-green-400 bg-green-950/20" 
                    : selectedFile 
                      ? "border-emerald-500/40 bg-emerald-950/10" 
                      : "border-slate-800 bg-slate-950/40 hover:border-green-500/30"
                }`}
              >
                <input
                  type="file"
                  id="file-receipt-upload"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {!selectedFile ? (
                  <label htmlFor="file-receipt-upload" className="cursor-pointer block">
                    <div className="text-xl mb-1">📁</div>
                    <div className="text-xs text-green-300 hover:underline mb-1">
                      Drag & Drop payment slip, or <span className="text-amber-400 font-bold">Browse</span>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono">
                      JPG, PNG, PDF receipts (Max 5MB)
                    </p>
                  </label>
                ) : (
                  <div className="flex items-center justify-between font-mono text-xs bg-slate-950 p-2.5 rounded border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400 truncate max-w-[80%]">
                      <span>🧾</span>
                      <span className="truncate">{selectedFile.name}</span>
                      <span className="text-[10px] text-slate-500">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-red-400 hover:text-red-300 font-bold text-xs"
                      id="btn-remove-slip"
                    >
                      REMOVE
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="arcade-btn py-4 bg-green-500 hover:bg-green-400 text-slate-950 font-black tracking-wider uppercase rounded-xl disabled:opacity-50 text-sm shadow-lg"
              id="btn-submit-deposit"
            >
              {loading ? "PROCESSING DEPOSIT..." : "SUBMIT DEPOSIT CLAIM"}
            </button>
          </form>
        </div>
      </div>

      {/* Real-time Ledger status tracker */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="arcade-panel p-5 bg-slate-900 border-green-500/10 flex-1 flex flex-col">
          <h3 className="text-sm font-bold text-green-400 mb-4 tracking-wider uppercase border-b border-green-500/10 pb-2 flex justify-between items-center">
            <span>TRANSACTION HISTORY</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </h3>

          {history.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500">
              <div className="text-3xl mb-2">📡</div>
              <p className="text-xs">No transactions logged on your profile yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-1">
              {history.map((tx) => {
                const isPending = tx.status === "pending";
                const isVerifying = tx.status === "verifying";
                const isCompleted = tx.status === "completed";

                return (
                  <div
                    key={tx.id}
                    className={`p-3.5 rounded-xl border font-mono text-[11px] ${
                      isCompleted
                        ? "bg-slate-950/40 border-emerald-500/20 text-slate-300"
                        : isVerifying
                          ? "bg-slate-950/60 border-yellow-500/30 text-yellow-100"
                          : "bg-slate-950/80 border-green-500/20 text-green-100 animate-pulse"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-500">REF: {tx.reference}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          isCompleted
                            ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/20"
                            : isVerifying
                              ? "bg-yellow-950/50 text-yellow-400 border border-yellow-500/20"
                              : "bg-green-950/50 text-green-400 border border-green-500/20"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-end my-1.5">
                      <div>
                        {tx.type === "topup" ? (
                           <div className="text-xs font-bold text-white">
                             Deposit: <span className="text-emerald-400">${tx.amount} CAD</span>
                           </div>
                        ) : (
                          <div className="text-xs font-bold text-white">
                            Cosmetic Purchase
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500 block">
                          {tx.type === "topup" ? `+${tx.creditsEarned} Coins` : `-${tx.creditsEarned} Coins`}
                        </span>
                      </div>

                      {/* Manual Verification backdoor trigger */}
                      {(isPending || isVerifying) && (
                        <button
                          onClick={() => handleVerifyInstant(tx.id)}
                          className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-[9px] tracking-wider rounded border border-emerald-400/40 shadow-sm"
                        >
                          FORCE VERIFY
                        </button>
                      )}
                    </div>

                    {/* Timeline visualization for real-time payments */}
                    {(isPending || isVerifying) && (
                      <div className="mt-3.5 pt-2.5 border-t border-slate-950">
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1.5 font-bold">
                          REAL-TIME DEPOSIT TIMELINE
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                          <span className={`h-1.5 w-1.5 rounded-full ${isPending || isVerifying ? "bg-emerald-400 animate-ping" : "bg-emerald-400"}`} />
                          <span>Submitted</span>
                          <span className="text-slate-700">➔</span>
                          <span className={`h-1.5 w-1.5 rounded-full ${isVerifying ? "bg-yellow-400 animate-pulse" : "bg-slate-700"}`} />
                          <span className={isVerifying ? "text-yellow-400" : "text-slate-500"}>Verifying</span>
                          <span className="text-slate-700">➔</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                          <span className="text-slate-500">Credited</span>
                        </div>
                      </div>
                    )}

                    <div className="text-[9px] text-slate-600 mt-2 text-right">
                      {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
