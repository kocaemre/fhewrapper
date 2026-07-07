"use client";

import type { DecryptStage } from "~~/hooks/useUserDecrypt";
import { toDecryptError } from "~~/lib/decryptErrors";
import { formatConfidentialAmount } from "~~/lib/formatConfidential";

const MONO = "var(--font-jetbrains-mono), monospace";

/** State-chip copy + color per the 03-UI-SPEC decrypt state machine. */
const CHIP: Record<Exclude<DecryptStage, "error">, { label: string; color: string }> = {
  idle: { label: "◈ ENCRYPTED CIPHERTEXT", color: "var(--blue)" },
  signing: { label: "✎ AWAITING EIP-712 SIGNATURE…", color: "var(--red)" },
  decrypting: { label: "◌ GATEWAY DECRYPTING…", color: "var(--red)" },
  revealed: { label: "✓ DECRYPTED BALANCE", color: "var(--green)" },
};

// A fixed decorative "ciphertext" handle shown blurred while encrypted/in-flight.
// Purely visual — the real cleartext replaces it on reveal.
const MOCK_HANDLE = "0x9f3c7a1e0b8d4562fae19c7b3d05e28af641c9d0";

/**
 * Blur→reveal display + state chip for the dedicated /decrypt panel (DEC-02/04).
 *
 * Consumes the shared engine's stage/value/error and renders the four visual
 * states: idle/signing/decrypting show the blurred ciphertext (`.cipher-blur`);
 * revealed shows the decimals-formatted cleartext (`.reveal-num`) + symbol +
 * caption; error renders the typed `toDecryptError` chip/body. A NoCiphertext
 * failure is a valid zero balance (chip DECRYPTED BALANCE) and is rendered as a
 * revealed `0`, not an error (DEC-04). Motion is handled by the 03-01 CSS with
 * `prefers-reduced-motion` fallbacks.
 */
export function DecryptStateBox({
  stage,
  value,
  error,
  decimals,
  symbol,
}: {
  stage: DecryptStage;
  value?: bigint;
  error?: unknown;
  decimals: number;
  symbol: string;
}) {
  // A NoCiphertext failure resolves to a valid zero balance, not an error.
  const errInfo = stage === "error" ? toDecryptError(error) : null;
  const isZeroReveal = errInfo?.chip === "DECRYPTED BALANCE";
  const effectiveStage: DecryptStage = isZeroReveal ? "revealed" : stage;

  const chip = effectiveStage === "error" ? null : CHIP[effectiveStage];

  const displayValue = isZeroReveal ? "0" : value !== undefined ? formatConfidentialAmount(value, decimals) : "";

  return (
    <div
      style={{
        border: "2px solid var(--blue-line)",
        background: "var(--bg2)",
        padding: 26,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        textAlign: "center",
      }}
    >
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
          }}
        >
          {chip.label}
        </span>
      )}

      {/* Error chip + body (DEC-04 — typed, never a hanging spinner) */}
      {effectiveStage === "error" && errInfo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
          <span style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic", maxWidth: 360 }}>
            {errInfo.body}
          </span>
        </div>
      )}

      {/* Revealed cleartext */}
      {effectiveStage === "revealed" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span className="reveal-num" style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 36, fontWeight: 700, color: "var(--red)", lineHeight: 1 }}>
              {displayValue}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 600, color: "var(--blue)" }}>{symbol}</span>
          </span>
          <span style={{ fontSize: 12.5, color: "var(--faint)", fontStyle: "italic" }}>
            Decrypted locally — never leaves your session.
          </span>
        </div>
      )}

      {/* Blurred ciphertext while encrypted / in flight */}
      {(effectiveStage === "idle" || effectiveStage === "signing" || effectiveStage === "decrypting") && (
        <span
          className="cipher-blur"
          aria-hidden
          style={{
            fontFamily: MONO,
            fontSize: 20,
            fontWeight: 600,
            color: "var(--blue)",
            padding: "6px 18px",
            userSelect: "none",
            wordBreak: "break-all",
          }}
        >
          {MOCK_HANDLE}
        </span>
      )}
    </div>
  );
}
