"use client";

import { useAccount, useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";
import { useUserDecrypt } from "~~/hooks/useUserDecrypt";
import { toDecryptError } from "~~/lib/decryptErrors";
import { formatConfidentialAmount } from "~~/lib/formatConfidential";
import { normalizeSymbol } from "~~/lib/tokenSymbol";
import type { RegistryPair } from "~~/registry/types";

const MONO = "var(--font-jetbrains-mono), monospace";

/** State-chip copy per the 03-UI-SPEC decrypt state machine. */
const CHIP: Record<"idle" | "signing" | "decrypting" | "revealed", { label: string; color: string }> = {
  idle: { label: "◈ ENCRYPTED CIPHERTEXT", color: "var(--blue)" },
  signing: { label: "✎ AWAITING EIP-712 SIGNATURE…", color: "var(--red)" },
  decrypting: { label: "◌ GATEWAY DECRYPTING…", color: "var(--red)" },
  revealed: { label: "✓ DECRYPTED BALANCE", color: "var(--green)" },
};

/**
 * Per-card confidential-balance decrypt (DEC-01 / DEC-03 / DEC-04), appended to
 * the Phase-2 `PairCard`. The Phase-2 registry renders for EVERYONE and is NOT
 * under `ChainGuard`, so this component SELF-gates on connection + Sepolia and
 * shows a muted hint otherwise — it never wraps the whole card/registry in a
 * chain gate (no Phase-2 regression).
 *
 * Consumes the shared `useUserDecrypt` engine so a granted permit reveals across
 * cards without re-signing (DEC-03). Blur→reveal treatment + 4-state machine per
 * 03-UI-SPEC; reduced motion is handled by the `.cipher-blur` / `.reveal-num`
 * CSS. Cleartext is formatted by the confidential token's OWN decimals (Pitfall
 * 5), never hardcoded 18.
 */
export function PairCardDecrypt({ pair }: { pair: RegistryPair }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const onSepolia = chainId === sepolia.id;

  const { confidential } = pair;
  const cSymbol = normalizeSymbol(confidential.symbol);
  const { stage, reveal, reset, value, error } = useUserDecrypt(confidential.address, {
    decimals: confidential.decimals,
  });

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderTop: "1px dashed var(--line-soft)",
    paddingTop: 12,
  };

  // Gate: registry stays ungated for browse; decrypt requires wallet + Sepolia.
  if (!isConnected || !onSepolia) {
    return (
      <div style={rowStyle}>
        <span style={{ fontSize: 12.5, color: "var(--faint)", fontStyle: "italic" }}>
          Connect on Sepolia to decrypt your {cSymbol} balance
        </span>
      </div>
    );
  }

  // A NoCiphertext failure is a valid zero balance, not an error (DEC-04).
  const errInfo = stage === "error" ? toDecryptError(error) : null;
  const isZeroReveal = errInfo?.chip === "DECRYPTED BALANCE";
  const effectiveStage: "idle" | "signing" | "decrypting" | "revealed" | "error" = isZeroReveal ? "revealed" : stage;

  const chip = effectiveStage === "error" ? null : CHIP[effectiveStage];

  const controlLabel =
    effectiveStage === "signing"
      ? "Signing…"
      : effectiveStage === "decrypting"
        ? "Decrypting…"
        : effectiveStage === "revealed"
          ? "Decrypt another"
          : "Decrypt";
  const busy = effectiveStage === "signing" || effectiveStage === "decrypting";
  const onControl = effectiveStage === "revealed" ? reset : reveal;

  const displayValue = isZeroReveal
    ? "0"
    : value !== undefined
      ? formatConfidentialAmount(value, confidential.decimals)
      : "";

  return (
    <div style={{ ...rowStyle, flexWrap: "wrap" }}>
      {/* State chip */}
      {chip && (
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: chip.color,
            flex: "none",
          }}
        >
          {chip.label}
        </span>
      )}

      {/* Error chip + body (DEC-04 — typed, never a hanging spinner) */}
      {effectiveStage === "error" && errInfo && (
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--red)",
            }}
          >
            {errInfo.chip ? `✕ ${errInfo.chip}` : "✕"}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--muted)", fontStyle: "italic" }}>{errInfo.body}</span>
        </span>
      )}

      {/* Value area: blurred ciphertext (idle/in-flight) or revealed cleartext */}
      {effectiveStage !== "error" &&
        (effectiveStage === "revealed" ? (
          <span className="reveal-num" style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: "var(--red)" }}>{displayValue}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>{cSymbol}</span>
          </span>
        ) : (
          <span
            className="cipher-blur"
            aria-hidden
            style={{
              fontFamily: MONO,
              fontSize: 18,
              fontWeight: 600,
              color: "var(--blue)",
              padding: "2px 14px",
            }}
          >
            0x{confidential.address.slice(2, 14)}
          </span>
        ))}

      <div style={{ flex: 1 }} />

      {/* Decrypt control */}
      <button
        type="button"
        disabled={busy}
        aria-disabled={busy}
        onClick={onControl}
        style={{
          border: `2px solid ${busy ? "var(--line-soft)" : "var(--line)"}`,
          background: busy ? "transparent" : "var(--bg2)",
          color: busy ? "var(--faint)" : "var(--ink)",
          padding: "6px 14px",
          fontWeight: 600,
          fontSize: 13,
          fontFamily: "var(--font-gelasio), Georgia, serif",
          cursor: busy ? "not-allowed" : "pointer",
          flex: "none",
        }}
      >
        {controlLabel}
      </button>
    </div>
  );
}
