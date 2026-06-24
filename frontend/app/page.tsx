"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress } from "viem";
import { useState, useEffect } from "react";
import { PROOF_PASS_ADDRESS, PROOF_PASS_ABI } from "./abi";

const BADGE_PRESETS = ["Developer", "Contributor", "Auditor", "Graduate", "KYC Verified"];

export default function Home() {
  const { address, isConnected } = useAccount();
  const [issueAddress, setIssueAddress] = useState("");
  const [badgeTypeInput, setBadgeTypeInput] = useState("Developer");
  const [revokeId, setRevokeId] = useState("");
  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupResult, setLookupResult] = useState<{ has: boolean; checked: boolean }>({ has: false, checked: false });
  const [txMsg, setTxMsg] = useState("");

  const { data: owner } = useReadContract({
    address: PROOF_PASS_ADDRESS, abi: PROOF_PASS_ABI, functionName: "owner",
  });
  const { data: totalIssued, refetch: refetchTotal } = useReadContract({
    address: PROOF_PASS_ADDRESS, abi: PROOF_PASS_ABI, functionName: "totalIssued",
  });
  const { data: myHasBadge, refetch: refetchMyBadge } = useReadContract({
    address: PROOF_PASS_ADDRESS, abi: PROOF_PASS_ABI, functionName: "hasBadge",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: lookupHasBadge, refetch: refetchLookup } = useReadContract({
    address: PROOF_PASS_ADDRESS, abi: PROOF_PASS_ABI, functionName: "hasBadge",
    args: isAddress(lookupAddress) ? [lookupAddress as `0x${string}`] : undefined,
    query: { enabled: false },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  useEffect(() => {
    if (isSuccess) {
      refetchTotal();
      refetchMyBadge();
      setTxMsg("Transaction confirmed!");
      setTimeout(() => setTxMsg(""), 4000);
    }
  }, [isSuccess, refetchTotal, refetchMyBadge]);

  const handleIssue = () => {
    if (!isAddress(issueAddress) || !badgeTypeInput.trim()) return;
    writeContract({
      address: PROOF_PASS_ADDRESS, abi: PROOF_PASS_ABI, functionName: "issueBadge",
      args: [issueAddress as `0x${string}`, badgeTypeInput.trim()],
    });
  };

  const handleRevoke = () => {
    if (!revokeId) return;
    writeContract({
      address: PROOF_PASS_ADDRESS, abi: PROOF_PASS_ABI, functionName: "revokeBadge",
      args: [BigInt(revokeId)],
    });
  };

  const handleLookup = async () => {
    if (!isAddress(lookupAddress)) return;
    const result = await refetchLookup();
    setLookupResult({ has: !!result.data, checked: true });
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-purple-400">🎓 ProofPass</h1>
          <p className="text-sm text-white/50">Soulbound credential badges · Sepolia</p>
        </div>
        <ConnectButton />
      </div>

      <div className="space-y-4">
        {/* Stats */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-white/50 mb-1">Total Badges Issued</p>
              <p className="text-4xl font-bold text-purple-400">{totalIssued?.toString() ?? "0"}</p>
            </div>
            {isConnected && (
              <div>
                <p className="text-sm text-white/50 mb-1">Your Status</p>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-semibold ${
                  myHasBadge
                    ? "text-purple-400 bg-purple-400/10 border-purple-400/30"
                    : "text-white/40 bg-white/5 border-white/10"
                }`}>
                  {myHasBadge ? "✅ Badge holder" : "⭕ No badge"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Verify any address */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-semibold mb-4 text-purple-400">🔍 Verify Badge</h2>
          <div className="flex gap-2">
            <input
              type="text" value={lookupAddress}
              onChange={(e) => { setLookupAddress(e.target.value); setLookupResult({ has: false, checked: false }); }}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
              placeholder="Wallet address to verify (0x...)"
            />
            <button
              onClick={handleLookup}
              disabled={!isAddress(lookupAddress)}
              className="bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-black font-semibold px-5 py-2 rounded-xl transition-colors"
            >
              Check
            </button>
          </div>
          {lookupResult.checked && (
            <p className={`text-sm mt-3 ${lookupResult.has ? "text-purple-400" : "text-white/50"}`}>
              {lookupResult.has ? "✅ This address holds a valid ProofPass badge." : "⭕ This address has no badge."}
            </p>
          )}
        </div>

        {/* Owner: Issue badge */}
        {isConnected && isOwner && (
          <div className="rounded-2xl border border-purple-400/30 bg-purple-400/5 p-6">
            <h2 className="font-semibold mb-4 text-purple-400">⚡ Issue Badge (Owner)</h2>
            <div className="space-y-3">
              <input
                type="text" value={issueAddress}
                onChange={(e) => setIssueAddress(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
                placeholder="Recipient wallet address (0x...)"
              />
              <div className="flex gap-2 flex-wrap">
                {BADGE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setBadgeTypeInput(preset)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      badgeTypeInput === preset
                        ? "bg-purple-500 border-purple-500 text-black font-semibold"
                        : "border-white/20 text-white/60 hover:border-purple-400 hover:text-purple-400"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text" value={badgeTypeInput}
                onChange={(e) => setBadgeTypeInput(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
                placeholder="Badge type (or type a custom one)"
              />
              <button
                onClick={handleIssue}
                disabled={isPending || !isAddress(issueAddress) || !badgeTypeInput.trim()}
                className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-black font-semibold py-2 rounded-xl transition-colors"
              >
                {isPending ? "..." : "Issue Badge"}
              </button>
            </div>
          </div>
        )}

        {/* Owner: Revoke badge */}
        {isConnected && isOwner && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-semibold mb-4 text-purple-400">🚫 Revoke Badge (Owner)</h2>
            <div className="flex gap-2">
              <input
                type="number" min="0" value={revokeId}
                onChange={(e) => setRevokeId(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-400"
                placeholder="Token ID to revoke"
              />
              <button
                onClick={handleRevoke}
                disabled={isPending || !revokeId}
                className="bg-red-500 hover:bg-red-400 disabled:opacity-40 text-black font-semibold px-6 py-2 rounded-xl transition-colors"
              >
                {isPending ? "..." : "Revoke"}
              </button>
            </div>
          </div>
        )}

        {/* Tx feedback */}
        {txMsg && (
          <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-green-400 text-sm text-center">
            ✅ {txMsg}
          </div>
        )}
        {txHash && !isSuccess && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/50 text-center">
            Waiting for confirmation...{" "}
            <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" className="text-purple-400 underline">
              View on Etherscan
            </a>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-white/20 mt-8">
        Contract:{" "}
        <a href={`https://sepolia.etherscan.io/address/${PROOF_PASS_ADDRESS}`} target="_blank" className="underline hover:text-white/40">
          {PROOF_PASS_ADDRESS.slice(0, 6)}...{PROOF_PASS_ADDRESS.slice(-4)}
        </a>
      </p>
    </main>
  );
}
