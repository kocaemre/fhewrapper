"use client";

import { useState } from "react";
import Link from "next/link";
import { PairCardDecrypt } from "../decrypt/PairCardDecrypt";
import { TokenIcon } from "../registry/TokenIcon";
import { WrapStageIndicator } from "./WrapStageIndicator";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { sepolia } from "viem/chains";
import { useAccount, useReadContract } from "wagmi";
import { useWrap } from "~~/hooks/useWrap";
import { formatConfidentialAmount } from "~~/lib/formatConfidential";
import { normalizeSymbol } from "~~/lib/tokenSymbol";
import { toWrapError } from "~~/lib/wrapErrors";
import type { RegistryPair } from "~~/registry/types";

const MONO = "var(--font-jetbrains-mono), monospace";
const SERIF = "var(--font-gelasio), Georgia, serif";

/**
 * Wrap panel (WRP-01 / WRP-02) — the design's Wrap/Unwrap panel, Wrap direction.
 * The Unwrap tab is a functional `next/link` to `/unwrap?token=` (Phase 5, SC4
 * loop continuity).
 *
 * Left "From · Public ERC-20": an amount input in the underlying token + its
 * live ERC-20 balance with a Max affordance. Right "To · Confidential ERC-7984":
 * the onchain-accurate preview from `useWrap` — `formatConfidentialAmount(confRaw,
 * confidential.decimals)`, NEVER hardcoding 18 (WRP-02). When `belowOneUnit`, a
 * warning shows and Wrap is disabled (Pitfall 2).
 *
 * The single "Approve & Wrap" button runs `useWrap.wrap` (one approve→wrap flow),
 * the 4-stage indicator tracks progress, and errors render via `toWrapError` (no
 * raw revert). On `done`, the Phase-3 decrypt surface reveals the new confidential
 * balance so the judge confirms decrypt == preview (the WRP-01/02 correctness proof).
 */
export function WrapPanel({ pair }: { pair: RegistryPair }) {
  const { underlying, confidential } = pair;
  const { address } = useAccount();

  const uSymbol = normalizeSymbol(underlying.symbol);
  const cSymbol = normalizeSymbol(confidential.symbol);

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<unknown>(null);

  const { stage, wrap, rate, preview } = useWrap(confidential.address);

  // Live underlying ERC-20 balance (Sepolia-pinned; enabled once connected).
  const { data: balanceRaw } = useReadContract({
    address: underlying.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address && underlying.decimalsKnown },
  });

  const balanceDisplay =
    balanceRaw !== undefined && underlying.decimalsKnown ? formatUnits(balanceRaw, underlying.decimals) : "—";

  const p = preview(amount, underlying.decimals, confidential.decimals);
  const previewText = p ? formatConfidentialAmount(p.confRaw, confidential.decimals) : "0";
  const belowOneUnit = !!p && p.belowOneUnit && amount.trim() !== "" && Number(amount) > 0;

  const busy = stage === "approving" || stage === "wrapping" || stage === "confirming";
  const done = stage === "done";
  const hasAmount = amount.trim() !== "" && Number(amount) > 0;
  const canWrap = hasAmount && !!p && !p.belowOneUnit && rate !== undefined && underlying.decimalsKnown && !busy;

  const primaryLabel = busy
    ? stage === "approving"
      ? "Approving…"
      : stage === "wrapping"
        ? "Wrapping…"
        : "Confirming…"
    : done
      ? "✓ Wrapped & sealed"
      : `Approve & Wrap ${uSymbol}`;

  async function onWrap() {
    if (!p || p.belowOneUnit) return;
    setError(null);
    try {
      const underlyingRaw = parseUnits(amount.trim(), underlying.decimals);
      await wrap(underlyingRaw); // approvalStrategy defaults to "max" (smoother repeat demo)
    } catch (e) {
      setError(e);
    }
  }

  const boxStyle: React.CSSProperties = {
    border: "2px solid var(--line)",
    background: "var(--panel)",
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  return (
    <section style={{ maxWidth: 900, margin: "0 auto", textAlign: "left" }}>
      <Link
        href="/"
        style={{ color: "var(--muted)", fontSize: 14.5, fontWeight: 600, fontFamily: SERIF, textDecoration: "none" }}
      >
        ← Back to the ledger
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "16px 0 26px", flexWrap: "wrap" }}>
        <TokenIcon confidentialSymbol={confidential.symbol} />
        <div>
          <h1 style={{ fontWeight: 700, fontSize: 28, margin: 0, lineHeight: 1.15 }}>{confidential.name}</h1>
          <div style={{ color: "var(--muted)", fontSize: 12.5, fontFamily: MONO }}>
            {uSymbol} ⇄ {cSymbol} · {confidential.decimalsKnown ? confidential.decimals : "?"} decimals · Sepolia
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Wrap ⇄ Unwrap toggle — Wrap active here, Unwrap links to /unwrap (SC4 loop). */}
        <div style={{ display: "flex", border: "2px solid var(--line)" }}>
          <span
            style={{
              padding: "10px 22px",
              fontSize: 14.5,
              fontWeight: 700,
              fontFamily: SERIF,
              background: "var(--block)",
              color: "var(--block-fg)",
            }}
          >
            Wrap
          </span>
          <Link
            href={`/unwrap?token=${confidential.address}`}
            style={{
              padding: "10px 22px",
              fontSize: 14.5,
              fontWeight: 700,
              fontFamily: SERIF,
              borderLeft: "2px solid var(--line)",
              color: "var(--ink)",
              textDecoration: "none",
            }}
          >
            Unwrap
          </Link>
        </div>
      </div>

      {/* From / arrow / To */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 1fr", alignItems: "stretch", gap: 0 }}>
        {/* From · Public ERC-20 */}
        <div style={boxStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--muted)",
              }}
            >
              From · Public ERC-20
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
              balance{" "}
              <button
                type="button"
                onClick={() => balanceRaw !== undefined && setAmount(formatUnits(balanceRaw, underlying.decimals))}
                disabled={balanceRaw === undefined}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--red)",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: 0,
                  fontFamily: MONO,
                  cursor: balanceRaw === undefined ? "default" : "pointer",
                }}
              >
                {balanceDisplay}
              </button>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              aria-label={`Amount of ${uSymbol} to wrap`}
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                background: "transparent",
                color: "var(--ink)",
                fontFamily: MONO,
                fontSize: 30,
                fontWeight: 600,
                padding: 0,
              }}
            />
            <span
              style={{
                border: "1.5px solid var(--line)",
                background: "var(--bg2)",
                padding: "6px 14px",
                fontWeight: 700,
                fontSize: 13,
                flex: "none",
                fontFamily: MONO,
              }}
            >
              {uSymbol}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
            Wrapping locks {uSymbol} and mints confidential {cSymbol}.
          </div>
        </div>

        {/* arrow */}
        <div style={{ display: "grid", placeItems: "center" }}>
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              border: "2px solid var(--line)",
              background: "var(--bg)",
              display: "grid",
              placeItems: "center",
              color: "var(--red)",
              fontSize: 16,
              fontWeight: 700,
              zIndex: 1,
            }}
          >
            →
          </div>
        </div>

        {/* To · Confidential ERC-7984 */}
        <div style={{ ...boxStyle, borderColor: "var(--blue-line)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--blue)",
              }}
            >
              To · Confidential ERC-7984 ◈
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: MONO,
                fontSize: 30,
                fontWeight: 600,
                color: hasAmount && !belowOneUnit ? "var(--red)" : "var(--faint)",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {previewText}
            </div>
            <span
              style={{
                border: "1.5px solid var(--blue-line)",
                background: "var(--bg2)",
                padding: "6px 14px",
                fontWeight: 700,
                fontSize: 13,
                flex: "none",
                fontFamily: MONO,
              }}
            >
              {cSymbol}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
            {rate === undefined
              ? "Reading conversion rate…"
              : `Rounded down to whole ${cSymbol} base units (rate read onchain).`}
          </div>
        </div>
      </div>

      {/* Below-one-unit warning (WRP-02 / Pitfall 2) */}
      {belowOneUnit && (
        <div
          role="alert"
          style={{
            display: "flex",
            gap: 13,
            alignItems: "center",
            border: "2px solid var(--red)",
            background: "var(--red-dim)",
            padding: "12px 18px",
            margin: "16px 0 0",
            fontSize: 14,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 20,
              height: 20,
              flex: "none",
              border: "2px solid var(--red)",
              color: "var(--red)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            !
          </span>
          <span>Amount too small — below one confidential unit for this pair.</span>
        </div>
      )}

      {/* Stage indicator */}
      <WrapStageIndicator stage={stage} />

      {/* Error row (no raw revert) */}
      {error != null && stage === "error" && (
        <div
          role="alert"
          style={{
            display: "flex",
            gap: 13,
            alignItems: "center",
            border: "2px solid var(--red)",
            background: "var(--red-dim)",
            padding: "14px 18px",
            margin: "0 0 18px",
            fontSize: 14,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 20,
              height: 20,
              flex: "none",
              border: "2px solid var(--red)",
              color: "var(--red)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            !
          </span>
          <span>{toWrapError(error)}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              color: "var(--muted)",
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Primary action */}
      <button
        type="button"
        onClick={onWrap}
        disabled={!canWrap}
        aria-disabled={!canWrap}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "2px solid var(--line)",
          background: canWrap ? "var(--block)" : "transparent",
          color: canWrap ? "var(--block-fg)" : "var(--faint)",
          padding: 16,
          fontWeight: 700,
          fontSize: 17,
          fontFamily: SERIF,
          cursor: canWrap ? "pointer" : "not-allowed",
        }}
      >
        {primaryLabel}
      </button>
      <p style={{ color: "var(--faint)", fontSize: 12.5, textAlign: "center", marginTop: 14, fontStyle: "italic" }}>
        Wrapping signs <span style={{ fontFamily: MONO, fontStyle: "normal" }}>approve()</span> on the ERC-20, then{" "}
        <span style={{ fontFamily: MONO, fontStyle: "normal" }}>wrap()</span> on the ERC-7984 wrapper.
      </p>

      {/* Correctness proof (WRP-01/02): reveal the new confidential balance == preview. */}
      {done && (
        <div style={{ marginTop: 8, border: "2px solid var(--blue-line)", background: "var(--panel)", padding: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>
            Verify: decrypt your new confidential balance — it should equal the preview above.
          </div>
          <PairCardDecrypt pair={pair} />
        </div>
      )}
    </section>
  );
}
