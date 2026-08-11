"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount, useReadContract, useReadContracts,
  useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { isAddress } from "viem";
import { useState, useEffect, useMemo, useRef } from "react";
import { PROOF_PASS_ADDRESS, PROOF_PASS_ABI } from "./abi";

type Record_ = { tokenId: number; type: string; holder: string };

const pad = (s: string, n: number) => (s + "<".repeat(n)).slice(0, n);
const mrzLine = (s: string, n = 40) => pad(s.toUpperCase().replace(/[^A-Z0-9]/g, "<"), n);

/* ───────── generative sigil, deterministic per bearer ───────── */
function Sigil({ seed, dim }: { seed?: string; dim?: boolean }) {
  const n = useMemo(() => {
    const h = (seed ?? "0x0").replace(/^0x/, "").toLowerCase().padEnd(40, "0");
    return Array.from({ length: 13 }, (_, i) => parseInt(h.slice(i * 3, i * 3 + 3), 16) || 0);
  }, [seed]);

  const pts = 5 + (n[0] % 7);          // 5..11 vertices
  const rings = 3 + (n[1] % 3);        // 3..5 rings
  const poly = (r: number, rot: number) =>
    Array.from({ length: pts }, (_, i) => {
      const a = (i / pts) * Math.PI * 2 + rot;
      return `${100 + Math.cos(a) * r},${100 + Math.sin(a) * r}`;
    }).join(" ");

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="iri" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <g opacity={dim ? 0.18 : 0.95}>
        {Array.from({ length: rings }).map((_, i) => {
          const r = 26 + i * (58 / rings);
          return (
            <polygon key={i} points={poly(r, (n[i + 2] % 360) * (Math.PI / 180))}
              fill="none" stroke="url(#iri)" strokeWidth={1.6 - i * 0.18}
              opacity={0.85 - i * 0.13} />
          );
        })}
        {/* orbiting nodes */}
        {Array.from({ length: pts }).map((_, i) => {
          const a = (i / pts) * Math.PI * 2 + (n[6] % 360) * (Math.PI / 180);
          const r = 78;
          return <circle key={i} cx={100 + Math.cos(a) * r} cy={100 + Math.sin(a) * r}
            r={1.3 + (n[(i % 6) + 7] % 3) * 0.5} fill="url(#iri)" opacity="0.8" />;
        })}
        <circle cx="100" cy="100" r={9 + (n[10] % 7)} fill="none" stroke="url(#iri)" strokeWidth="1.4" />
        <circle cx="100" cy="100" r="2.6" fill="url(#iri)" />
      </g>
    </svg>
  );
}

/* ───────── the collectible credential card ───────── */
function Credential({ rec, subject }: { rec?: Record_; subject?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({
      x: -((e.clientY - r.top) / r.height - 0.5) * 12,
      y: ((e.clientX - r.left) / r.width - 0.5) * 14,
    });
  };

  const valid = !!rec;
  const holder = rec?.holder ?? subject;

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{ perspective: "1500px" }} className="w-full max-w-[352px]">
      <div
        className="holo relative overflow-hidden rounded-[18px] aspect-[5/7] flex flex-col"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 240ms cubic-bezier(.22,1,.36,1)",
          padding: "9px",
          background: valid
            ? "linear-gradient(150deg, rgba(34,211,238,0.55), rgba(168,85,247,0.5) 45%, rgba(236,72,153,0.5))"
            : "linear-gradient(150deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))",
          boxShadow: valid
            ? "0 34px 90px rgba(0,0,0,0.65), 0 0 70px rgba(168,85,247,0.22)"
            : "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* inner card face */}
        <div className="guilloche relative flex-1 flex flex-col rounded-[11px] overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.12)" }}>

          {/* ── name bar ── */}
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5"
            style={{ background: "rgba(0,0,0,0.34)", borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
            <p className="font-doc text-[15px] font-bold leading-tight truncate"
              style={{ color: valid ? "#f6f7fd" : "rgba(255,255,255,0.28)" }}>
              {rec?.type ?? "Unassigned"}
            </p>
            <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full"
              style={{ background: valid ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.05)" }}>
              <span className="led w-1.5 h-1.5 rounded-full"
                style={{ background: valid ? "var(--valid)" : "#5c6579" }} />
              <span className="font-mrz text-[8px] tracking-[0.16em]"
                style={{ color: valid ? "var(--valid)" : "#7d879b" }}>
                {valid ? "VALID" : "VOID"}
              </span>
            </div>
          </div>

          {/* ── art window ── */}
          <div className="relative mx-3 mt-3 rounded-md overflow-hidden"
            style={{
              aspectRatio: "1 / 0.86",
              background: "radial-gradient(circle at 50% 45%, rgba(168,85,247,0.20), rgba(4,5,12,0.75) 70%)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}>
            <div className="absolute inset-0 p-3">
              <Sigil seed={holder} dim={!valid} />
            </div>
            {/* seal sits on the art like a rarity foil */}
            {valid && (
              <div className="seal seal-stamp absolute bottom-2 right-2 w-[52px] h-[52px] rounded-full grid place-items-center text-center"
                style={{ transform: "rotate(-11deg)", background: "rgba(4,5,12,0.72)" }}>
                <div>
                  <p className="font-doc text-[15px] font-bold leading-none iri-text">#{rec!.tokenId}</p>
                  <p className="font-mrz text-[5.5px] tracking-[0.12em] mt-0.5 text-white/65">SOULBOUND</p>
                </div>
              </div>
            )}
          </div>

          {/* ── type line ── */}
          <div className="px-3.5 pt-3 pb-2">
            <p className="font-mrz text-[8px] tracking-[0.26em] text-white/40">
              SOULBOUND CREDENTIAL · ERC-721 · SEPOLIA
            </p>
          </div>

          {/* ── stat rows ── */}
          <div className="px-3.5 space-y-1.5 flex-1">
            <div className="flex items-baseline justify-between gap-2 py-1.5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="font-mrz text-[8px] tracking-[0.2em] text-white/40 shrink-0">BEARER</span>
              <span className="font-mrz text-[9.5px] text-white/85 truncate">
                {holder ? `${holder.slice(0, 10)}…${holder.slice(-8)}` : "—"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 py-1.5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="font-mrz text-[8px] tracking-[0.2em] text-white/40">TRANSFER</span>
              <span className="font-mrz text-[9.5px]" style={{ color: "var(--revoked)" }}>
                PERMANENTLY DISABLED
              </span>
            </div>
          </div>

          {/* ── MRZ + set line ── */}
          <div className="mrz px-3.5 py-2 font-mrz text-[7.5px] leading-[1.6] text-white/45 overflow-hidden">
            <p className="whitespace-nowrap">{mrzLine(holder?.replace("0x", "0X") ?? "")}</p>
            <p className="whitespace-nowrap">{mrzLine(rec ? `BADGE<${rec.type}` : "NO<RECORD")}</p>
          </div>
          <div className="flex items-center justify-between px-3.5 py-1.5"
            style={{ background: "rgba(0,0,0,0.34)" }}>
            <span className="font-mrz text-[7.5px] tracking-[0.18em] text-white/35">
              {valid ? `NO. ${String(rec!.tokenId).padStart(3, "0")}` : "NO. ---"} · SOULBOUND SERIES
            </span>
            <span className="font-mrz text-[7.5px] tracking-[0.18em]"
              style={{ color: valid ? "var(--valid)" : "#5c6579" }}>
              {valid ? "◆ NON-TRANSFERABLE" : "◇ UNISSUED"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [query, setQuery] = useState("");
  const [issueTo, setIssueTo] = useState("");
  const [issueType, setIssueType] = useState("Solidity Developer");
  const [revokeId, setRevokeId] = useState("");

  const P = { address: PROOF_PASS_ADDRESS, abi: PROOF_PASS_ABI } as const;

  const { data: owner } = useReadContract({ ...P, functionName: "owner" });
  const { data: totalIssued, refetch: rTotal } = useReadContract({
    ...P, functionName: "totalIssued", query: { refetchInterval: 12000 },
  });

  const n = totalIssued ? Number(totalIssued) : 0;
  const ids = useMemo(() => Array.from({ length: n }, (_, i) => i), [n]);

  // No address→tokenId mapping on-chain, so scan the issued range.
  // Revoked tokens are burned: ownerOf reverts and returns status "failure".
  const { data: scan, refetch: rScan } = useReadContracts({
    contracts: ids.flatMap((i) => [
      { ...P, functionName: "ownerOf", args: [BigInt(i)] } as const,
      { ...P, functionName: "badgeType", args: [BigInt(i)] } as const,
    ]),
    query: { enabled: n > 0 },
  });

  const registry = useMemo(() => {
    const m = new Map<string, Record_>();
    ids.forEach((i) => {
      const o = scan?.[i * 2], t = scan?.[i * 2 + 1];
      if (o?.status === "success" && o.result) {
        const holder = String(o.result);
        m.set(holder.toLowerCase(), {
          tokenId: i,
          type: (t?.status === "success" ? String(t.result) : "") || "Credential",
          holder,
        });
      }
    });
    return m;
  }, [scan, ids]);

  const liveCount = registry.size;
  const isOwner = !!address && !!owner && address.toLowerCase() === String(owner).toLowerCase();
  const subject = isAddress(query) ? query : address;
  const shown = subject ? registry.get(subject.toLowerCase()) : undefined;

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const busy = isPending || isMining;
  useEffect(() => {
    if (isSuccess) { rTotal(); rScan(); reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const doIssue = () =>
    writeContract({ ...P, functionName: "issueBadge", args: [issueTo as `0x${string}`, issueType] });
  const doRevoke = () =>
    writeContract({ ...P, functionName: "revokeBadge", args: [BigInt(revokeId || "0")] });

  const PRESETS = ["Solidity Developer", "Smart Contract Auditor", "DeFi Engineer", "Course Graduate"];
  const field =
    "w-full font-mrz text-[11px] bg-black/25 border border-white/12 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-[rgba(168,85,247,0.6)] transition-colors";

  return (
    <div className="relative min-h-dvh">
      <div className="aurora" />

      <div className="relative z-10 min-h-dvh flex flex-col">
        <header className="flex items-center justify-between gap-6 px-5 md:px-10 py-5">
          <div className="flex items-baseline gap-3">
            <h1 className="font-doc text-xl font-bold tracking-[0.22em] iri-text">PROOFPASS</h1>
            <span className="font-mrz text-[10px] tracking-[0.22em] text-white/30 hidden sm:inline">
              SOULBOUND CREDENTIAL REGISTRY
            </span>
          </div>
          <ConnectButton />
        </header>

        <main className="flex-1 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-14 lg:gap-28 xl:gap-36 px-5 md:px-10 lg:px-16 py-10 lg:py-12 items-center max-w-[1560px] w-full mx-auto">
          <section className="flex flex-col items-center gap-5">
            <Credential rec={shown} subject={subject} />
            <p className="font-mrz text-[10px] tracking-[0.2em] text-white/30 text-center max-w-[352px]">
              {isAddress(query)
                ? "▸ VIEWING A LOOKED-UP ADDRESS"
                : isConnected ? "▸ YOUR CREDENTIAL" : "▸ CONNECT, OR LOOK UP ANY ADDRESS"}
            </p>
          </section>

          <section className="glass glass-edge rounded-2xl p-6 md:p-7 space-y-7">
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: "IN CIRCULATION", v: String(liveCount), c: "var(--valid)" },
                { k: "EVER ISSUED", v: String(n), c: "#e6eaf7" },
                { k: "TRANSFERABLE", v: "0", c: "var(--revoked)" },
              ].map((s) => (
                <div key={s.k}>
                  <p className="font-mrz text-[8.5px] tracking-[0.18em] text-white/35 leading-tight">{s.k}</p>
                  <p className="font-doc text-2xl font-bold tabular mt-1" style={{ color: s.c }}>{s.v}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="font-mrz text-[10px] tracking-[0.26em] text-white/45 mb-2.5">VERIFY AN ADDRESS</p>
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="0x… paste any wallet"
                className={`${field} ${query && !isAddress(query) ? "!border-rose-500/60" : ""}`} />
              <p className="font-mrz text-[9px] text-white/30 mt-2">
                {isAddress(query)
                  ? registry.has(query.toLowerCase())
                    ? "▸ CREDENTIAL FOUND — SHOWN ON THE LEFT"
                    : "▸ NO CREDENTIAL ON RECORD"
                  : "ANYONE CAN VERIFY — NO WALLET REQUIRED"}
              </p>
            </div>

            {isOwner ? (
              <div className="border-t border-white/10 pt-6 space-y-5">
                <p className="font-mrz text-[10px] tracking-[0.26em] iri-text">◆ ISSUING AUTHORITY</p>

                <div>
                  <p className="font-mrz text-[9px] tracking-[0.2em] text-white/35 mb-2">ISSUE CREDENTIAL</p>
                  <input value={issueTo} onChange={(e) => setIssueTo(e.target.value)}
                    placeholder="0x… recipient" className={`${field} mb-2`} />
                  <input value={issueType} onChange={(e) => setIssueType(e.target.value)}
                    placeholder="Badge type"
                    className="w-full font-doc text-sm bg-black/25 border border-white/12 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-[rgba(168,85,247,0.6)] transition-colors" />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PRESETS.map((p) => (
                      <button key={p} onClick={() => setIssueType(p)}
                        className={`font-mrz text-[9px] px-2 py-1 rounded-md border transition-colors ${
                          issueType === p
                            ? "border-violet-400/60 text-violet-200 bg-violet-400/10"
                            : "border-white/10 text-white/40 hover:text-white hover:border-white/25"
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button onClick={doIssue} disabled={busy || !isAddress(issueTo) || !issueType.trim()}
                    className="iri-fill w-full mt-3 font-doc font-bold tracking-wide py-3 rounded-lg transition-all disabled:opacity-30 hover:brightness-110">
                    {busy ? "PROCESSING…" : "Issue & Seal"}
                  </button>
                  <button onClick={() => setIssueTo(address ?? "")}
                    className="w-full mt-2 font-mrz text-[9px] text-white/30 hover:text-white/65 transition-colors">
                    use my own address
                  </button>
                </div>

                <div>
                  <p className="font-mrz text-[9px] tracking-[0.2em] text-white/35 mb-2">REVOKE BY TOKEN ID</p>
                  <div className="flex gap-2">
                    <input value={revokeId} onChange={(e) => setRevokeId(e.target.value)}
                      placeholder="0" type="number" min="0" className={`${field} flex-1 tabular`} />
                    <button onClick={doRevoke} disabled={busy || revokeId === ""}
                      className="px-5 rounded-lg font-doc font-semibold border transition-all disabled:opacity-30 hover:bg-rose-400/10"
                      style={{ borderColor: "rgba(251,113,133,0.45)", color: "var(--revoked)" }}>
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-white/10 pt-6">
                <p className="font-mrz text-[9px] tracking-[0.2em] text-white/35 mb-2">ISSUING AUTHORITY</p>
                <p className="font-mrz text-[11px] text-white/55 break-all">{String(owner ?? "—")}</p>
                <p className="text-sm text-white/45 mt-3 leading-relaxed">
                  Only this address can issue or revoke. Holders cannot transfer, sell or gift a
                  credential — the transfer functions revert by design.
                </p>
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-4">
              <a href={`https://sepolia.etherscan.io/address/${PROOF_PASS_ADDRESS}`} target="_blank" rel="noreferrer"
                className="font-mrz text-[9px] tracking-wider text-white/25 hover:text-white/55 transition-colors">
                {PROOF_PASS_ADDRESS.slice(0, 10)}…{PROOF_PASS_ADDRESS.slice(-8)}
              </a>
              {txHash && !isSuccess && (
                <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer"
                  className="font-mrz text-[9px] tracking-wider iri-text">◆ AWAITING CONFIRMATION</a>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
