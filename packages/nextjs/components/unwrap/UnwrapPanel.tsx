"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PairCardDecrypt } from "../decrypt/PairCardDecrypt";
import { TokenIcon } from "../registry/TokenIcon";
import { ExplorerTxLink } from "../status/ExplorerTxLink";
import { notifyError, notifyPending, notifySuccess } from "../status/txToast";
import { UnwrapStageIndicator } from "./UnwrapStageIndicator";
import { type Hex, erc20Abi, formatUnits } from "viem";
import { sepolia } from "viem/chains";
import { useAccount, useReadContract } from "wagmi";
import { useUnwrap } from "~~/hooks/useUnwrap";
import { useUserDecrypt } from "~~/hooks/useUserDecrypt";
import { toAppError } from "~~/lib/appError";
import { formatConfidentialAmount } from "~~/lib/formatConfidential";
import { readPendingUnwrap } from "~~/lib/pendingUnshield";
import { normalizeSymbol } from "~~/lib/tokenSymbol";
import { parseUnwrapAmount } from "~~/lib/unwrapAmount";
import type { RegistryPair } from "~~/registry/types";

const MONO = "var(--font-jetbrains-mono), monospace";
const SERIF = "var(--font-gelasio), Georgia, serif";

/**
 * Unwrap panel (UNW-01 / UNW-02) — the mirror of `WrapPanel`, reversed
 * (From · Confidential ERC-7984 → To · Public ERC-20).
 *
 * Amount source (UNW-01): the Phase-3 `useUserDecrypt` reveals the decrypted
 * confidential balance; once revealed, "Max = decrypted balance" fills the input
 * and `parseUnwrapAmount` caps + validates it (decimals-driven, never 18). A
 * secondary "Unwrap all" runs `unwrapAll()` — no decrypt required (operates on
 * the balance handle), so a judge who hasn't decrypted can still unwrap.
 *
 * Honest end-state (UNW-02): success copy + the "ERC-20 arrived" proof render
 * ONLY inside the `stage === "finalized"` block — never at the burn/decrypt/
 * finalize steps. On `finalized` the underlying ERC-20 `balanceOf` is refetched
 * (wagmi) to show it INCREASED, and `<PairCardDecrypt>` reveals the confidential
 * balance DROPPED. No optimistic success anywhere earlier.
 *
 * Resume (Pitfall 3): a persisted burned-but-unfinalized unwrap surfaces a
 * "Resume interrupted unwrap" banner that drives `resumePending()` (which wraps
 * `useResumeUnshield`) through the SAME honest stage machine.
 */
export function UnwrapPanel({ pair }: { pair: RegistryPair }) {
  const { underlying, confidential } = pair;
  const { address } = useAccount();

  const uSymbol = normalizeSymbol(underlying.symbol);
  const cSymbol = normalizeSymbol(confidential.symbol);

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pendingHash, setPendingHash] = useState<Hex | null>(null);
  // The pending toast id, reused so success/error replaces it in place. Held in a
  // ref so the finalized effect (the ONLY honest success point) can resolve it.
  const toastIdRef = useRef<string | null>(null);

  const { stage, unwrap, unwrapAll, resumePending, txHash } = useUnwrap(confidential.address);

  // Phase-3 decrypt provides the confidential balance ceiling (UNW-01).
  const {
    stage: decryptStage,
    reveal,
    value: decryptedValue,
  } = useUserDecrypt(confidential.address, { decimals: confidential.decimals });

  // Live underlying ERC-20 balance — refetched on `finalized` to PROVE arrival.
  const { data: erc20Raw, refetch: refetchErc20 } = useReadContract({
    address: underlying.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address && underlying.decimalsKnown },
  });

  const erc20Display =
    erc20Raw !== undefined && underlying.decimalsKnown ? formatUnits(erc20Raw, underlying.decimals) : "—";

  // On mount / address change, surface any burned-but-unfinalized unwrap.
  useEffect(() => {
    let alive = true;
    void readPendingUnwrap(confidential.address).then(h => {
      if (alive) setPendingHash(h);
    });
    return () => {
      alive = false;
    };
  }, [confidential.address]);

  // Honest proof: refetch the ERC-20 balance the moment the finalize resolves.
  // The success toast fires ONLY here (stage === "finalized") — never optimistically
  // at burn/decrypt/finalize (T-06-06, UNW-02). The pending toast id is reused so
  // it replaces the "this can take a moment" toast in place, carrying the burn tx.
  useEffect(() => {
    if (stage !== "finalized") return;
    void refetchErc20();
    if (toastIdRef.current) {
      notifySuccess({
        id: toastIdRef.current,
        title: `Unwrapped ${cSymbol}`,
        desc: `Gateway decryption complete — ${uSymbol} released to your wallet.`,
        hash: txHash,
      });
      toastIdRef.current = null;
    }
  }, [stage, refetchErc20, cSymbol, uSymbol, txHash]);

  const p = parseUnwrapAmount(amount, confidential.decimals, decryptedValue);
  const revealed = decryptStage === "revealed" && decryptedValue !== undefined;

  const busy = stage === "requesting" || stage === "decrypting" || stage === "finalizing";
  const finalized = stage === "finalized";
  const canUnwrap = p.valid && !busy;

  const primaryLabel = busy
    ? stage === "requesting"
      ? "Requesting…"
      : stage === "decrypting"
        ? "Decrypting…"
        : "Finalizing…"
    : finalized
      ? "✓ Unwrapped"
      : `Unwrap ${cSymbol}`;

  // Open the reassuring pending toast; success fires later in the finalized effect.
  function startPendingToast() {
    toastIdRef.current = notifyPending(
      `Unwrapping ${cSymbol}`,
      "Burn, gateway decryption, then finalize — this can take a moment.",
    );
  }

  function failToast(e: unknown) {
    setError(e);
    if (toastIdRef.current) {
      notifyError({ id: toastIdRef.current, title: "Unwrap failed", desc: toAppError(e, { flow: "unwrap" }).body });
      toastIdRef.current = null;
    }
  }

  async function onUnwrap() {
    if (!p.valid) return;
    setError(null);
    startPendingToast();
    try {
      await unwrap(p.raw);
    } catch (e) {
      failToast(e);
    }
  }

  async function onUnwrapAll() {
    setError(null);
    startPendingToast();
    try {
      await unwrapAll();
    } catch (e) {
      failToast(e);
    }
  }

  async function onResume() {
    setError(null);
    startPendingToast();
    try {
      await resumePending();
      setPendingHash(null); // cleared on finalize resolve
    } catch (e) {
      failToast(e);
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
            {cSymbol} ⇄ {uSymbol} · {confidential.decimalsKnown ? confidential.decimals : "?"} decimals · Sepolia
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Wrap ⇄ Unwrap toggle — Unwrap active here, Wrap links back to /wrap. */}
        <div style={{ display: "flex", border: "2px solid var(--line)" }}>
          <Link
            href={`/wrap?token=${confidential.address}`}
            style={{
              padding: "10px 22px",
              fontSize: 14.5,
              fontWeight: 700,
              fontFamily: SERIF,
              color: "var(--ink)",
              textDecoration: "none",
            }}
          >
            Wrap
          </Link>
          <span
            style={{
              padding: "10px 22px",
              fontSize: 14.5,
              fontWeight: 700,
              fontFamily: SERIF,
              borderLeft: "2px solid var(--line)",
              background: "var(--block)",
              color: "var(--block-fg)",
            }}
          >
            Unwrap
          </span>
        </div>
      </div>

      {/* Resume banner (Pitfall 3) — a burned-but-unfinalized unwrap is recoverable. */}
      {pendingHash && stage === "idle" && (
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
          <span>An earlier unwrap burned your balance but never finalized — the ERC-20 hasn’t been released yet.</span>
          <button
            type="button"
            onClick={onResume}
            style={{
              marginLeft: "auto",
              border: "2px solid var(--red)",
              background: "var(--block)",
              color: "var(--block-fg)",
              padding: "8px 16px",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: SERIF,
              cursor: "pointer",
            }}
          >
            Resume interrupted unwrap
          </button>
        </div>
      )}

      {/* From / arrow / To */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 1fr", alignItems: "stretch", gap: 0 }}>
        {/* From · Confidential ERC-7984 */}
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
              From · Confidential ERC-7984 ◈
            </span>
            {revealed ? (
              <span style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                balance{" "}
                <button
                  type="button"
                  onClick={() => setAmount(formatUnits(decryptedValue, confidential.decimals))}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--red)",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: 0,
                    fontFamily: MONO,
                    cursor: "pointer",
                  }}
                >
                  {formatConfidentialAmount(decryptedValue, confidential.decimals)}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void reveal()}
                disabled={decryptStage === "signing" || decryptStage === "decrypting"}
                style={{
                  border: "1.5px solid var(--blue-line)",
                  background: "var(--bg2)",
                  color: "var(--blue)",
                  padding: "4px 12px",
                  fontWeight: 700,
                  fontSize: 12,
                  fontFamily: MONO,
                  cursor: decryptStage === "signing" || decryptStage === "decrypting" ? "wait" : "pointer",
                }}
              >
                {decryptStage === "signing" ? "Signing…" : decryptStage === "decrypting" ? "Decrypting…" : "Reveal max"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              aria-label={`Amount of ${cSymbol} to unwrap`}
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
            {revealed
              ? `Unwrapping burns confidential ${cSymbol} and releases ${uSymbol}.`
              : `Reveal your decrypted balance to cap the amount — or use Unwrap all below.`}
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

        {/* To · Public ERC-20 */}
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
              To · Public ERC-20
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
              balance <span style={{ fontFamily: MONO, color: "var(--ink)", fontWeight: 700 }}>{erc20Display}</span>
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
                color: p.valid ? "var(--red)" : "var(--faint)",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {p.valid ? amount.trim() : "0"}
            </div>
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
            Released after the oracle decrypts the burn and the finalize tx confirms.
          </div>
        </div>
      </div>

      {/* Amount validation reasons (UNW-01) */}
      {p.exceedsBalance && (
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
          <span>Amount exceeds your decrypted confidential balance.</span>
        </div>
      )}
      {amount.trim() !== "" && p.belowMinimum && (
        <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic", margin: "12px 0 0" }}>
          Amount too small — below one confidential base unit for this pair.
        </div>
      )}

      {/* Stage indicator */}
      <UnwrapStageIndicator stage={stage} />

      {/* Inline explorer link — follow the burn/finalize tx; shown once a tx exists. */}
      {txHash && (busy || finalized) && (
        <div style={{ margin: "-6px 0 10px" }}>
          <ExplorerTxLink hash={txHash} />
        </div>
      )}

      {/* Error row (no raw revert) — unified toAppError chip + body */}
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
          <span style={{ minWidth: 0 }}>
            {(() => {
              const appErr = toAppError(error, { flow: "unwrap" });
              return (
                <>
                  {appErr.chip ? (
                    <strong style={{ display: "block", fontFamily: MONO, fontSize: 11.5, color: "var(--red)" }}>
                      {appErr.chip}
                    </strong>
                  ) : null}
                  {appErr.body}
                </>
              );
            })()}
          </span>
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

      {/* Primary + secondary actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onUnwrap}
          disabled={!canUnwrap}
          aria-disabled={!canUnwrap}
          style={{
            flex: 1,
            minWidth: 220,
            boxSizing: "border-box",
            border: "2px solid var(--line)",
            background: canUnwrap ? "var(--block)" : "transparent",
            color: canUnwrap ? "var(--block-fg)" : "var(--faint)",
            padding: 16,
            fontWeight: 700,
            fontSize: 17,
            fontFamily: SERIF,
            cursor: canUnwrap ? "pointer" : "not-allowed",
          }}
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          onClick={onUnwrapAll}
          disabled={busy}
          aria-disabled={busy}
          style={{
            flex: "none",
            border: "2px solid var(--line)",
            background: "transparent",
            color: busy ? "var(--faint)" : "var(--ink)",
            padding: "16px 22px",
            fontWeight: 700,
            fontSize: 15,
            fontFamily: SERIF,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Unwrap all
        </button>
      </div>
      <p style={{ color: "var(--faint)", fontSize: 12.5, textAlign: "center", marginTop: 14, fontStyle: "italic" }}>
        Unwrapping burns confidential {cSymbol}, waits for the oracle to decrypt the burn, then{" "}
        <span style={{ fontFamily: MONO, fontStyle: "normal" }}>finalize()</span> releases the ERC-20 — no success until
        it lands.
      </p>

      {/* Honest end-state proof (UNW-02) — ONLY at finalized. */}
      {finalized && (
        <div style={{ marginTop: 8, border: "2px solid var(--green)", background: "var(--panel)", padding: 18 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4, color: "var(--green)" }}>
            ✓ Unwrapped — the ERC-20 arrived.
          </div>
          <div style={{ fontSize: 13.5, marginBottom: 12 }}>
            Your public {uSymbol} balance is now{" "}
            <span style={{ fontFamily: MONO, fontWeight: 700, color: "var(--red)" }}>{erc20Display}</span> (refetched
            after finalize). Decrypt below to confirm the confidential {cSymbol} balance dropped.
          </div>
          <PairCardDecrypt pair={pair} />
        </div>
      )}
    </section>
  );
}
