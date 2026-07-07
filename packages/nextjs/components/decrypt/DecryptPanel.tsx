"use client";

import { useState } from "react";
import { useIsConfidential, useMetadata } from "@zama-fhe/react-sdk";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";
import { DecryptAddressInput } from "~~/components/decrypt/DecryptAddressInput";
import { DecryptCTA } from "~~/components/decrypt/DecryptCTA";
import { DecryptStateBox } from "~~/components/decrypt/DecryptStateBox";
import { useUserDecrypt } from "~~/hooks/useUserDecrypt";
import { validateDecryptTarget } from "~~/lib/decryptValidate";

const SERIF = "var(--font-gelasio), Georgia, serif";

/**
 * Dedicated paste-an-address decrypt screen (DEC-02 / DEC-03 / DEC-04).
 *
 * The two-stage trust gate before any relayer call (T-03-04):
 *   1. `validateDecryptTarget` — viem isAddress + getAddress checksum (FORMAT).
 *   2. `useIsConfidential(address)` — on-chain ERC-165 confidential-token check.
 * Only when BOTH pass does the address reach the shared `useUserDecrypt` engine.
 * A malformed string or a valid-but-non-ERC-7984 address is rejected with the
 * exact 03-UI-SPEC reason and the CTA stays disabled.
 *
 * Decimals + symbol come from `useMetadata` (never hardcode 18; Pitfall 5). The
 * single reusable EIP-712 permit (via the engine's `useAllow`) means a permit
 * already granted on a registry card decrypts the pasted token WITHOUT a second
 * signature — the CTA shows "Decrypt" instead of "Sign & Decrypt" (DEC-03).
 *
 * Rendered under the Phase-1 ChainGuard by app/decrypt/page.tsx, so it only
 * mounts when a wallet is connected on Sepolia (CONTEXT decision C).
 */
export function DecryptPanel() {
  const { isConnected } = useAccount();
  const [raw, setRaw] = useState("");

  // Gate 1 — address format.
  const { ok, address, reason: formatReason } = validateDecryptTarget(raw);
  const validAddr = ok ? address : undefined;

  // Gate 2 — on-chain ERC-165 confidential-token check (only for a valid address).
  const { data: isConf, isLoading: confLoading } = useIsConfidential(validAddr ?? zeroAddress, { enabled: ok });

  // Token's own decimals/symbol — only once confirmed confidential (never 18).
  const { data: metadata } = useMetadata(validAddr ?? zeroAddress, {
    enabled: ok && isConf === true,
  });

  const confirmedConfidential = ok && isConf === true && metadata !== undefined;
  const decimals = metadata?.decimals ?? 0;
  const symbol = metadata?.symbol ?? "";

  // Only a confirmed confidential token drives the decrypt engine.
  const decryptAddr = confirmedConfidential ? validAddr : undefined;
  const { stage, reveal, reset, value, error, hasPermit } = useUserDecrypt(decryptAddr, { decimals });

  // Input error row: malformed format, or a valid-but-non-confidential address.
  let inputReason: string | undefined;
  if (raw.trim() !== "" && !ok) {
    inputReason = formatReason; // "NOT A VALID ADDRESS"
  } else if (ok && isConf === false) {
    inputReason = "NOT A CONFIDENTIAL (ERC-7984) TOKEN";
  }

  const checking = ok && (confLoading || (isConf === true && metadata === undefined));

  const onCta =
    stage === "revealed"
      ? () => {
          reset();
          setRaw("");
        }
      : reveal;

  return (
    <section style={{ maxWidth: 880, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: 30 }}>
        <h1
          style={{
            fontFamily: SERIF,
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.1,
            margin: "0 0 12px",
            color: "var(--ink)",
          }}
        >
          Reveal a <em style={{ fontStyle: "italic", fontWeight: 500, color: "var(--blue)" }}>confidential</em> balance
        </h1>
        <p style={{ color: "var(--muted)", margin: "0 auto", maxWidth: 520, fontSize: 15, textWrap: "pretty" }}>
          Encrypted balances are ciphertext on-chain. Sign one EIP-712 message and the FHE gateway decrypts them — for
          your eyes only.
        </p>
      </header>

      {/* Panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(200px, 260px) 1fr",
          border: "2px solid var(--line)",
          boxShadow: "var(--shadow)",
          background: "var(--panel)",
        }}
      >
        {/* Left — engraving illustration placeholder (hero art added in 03-03). */}
        <div
          aria-hidden
          style={{
            borderRight: "2px solid var(--line)",
            background: "var(--panel2)",
            minHeight: 420,
          }}
        />

        {/* Right — the form column */}
        <div
          style={{
            background: "var(--panel)",
            padding: 26,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <DecryptAddressInput value={raw} onChange={setRaw} reason={inputReason} />

          {checking && (
            <span style={{ fontSize: 12, color: "var(--faint)", fontStyle: "italic" }}>Checking token on-chain…</span>
          )}

          <DecryptStateBox stage={stage} value={value} error={error} decimals={decimals} symbol={symbol} />

          <DecryptCTA
            stage={stage}
            disabled={!confirmedConfidential}
            hasPermit={hasPermit}
            isConnected={isConnected}
            onClick={onCta}
          />

          <p
            style={{
              textAlign: "center",
              fontStyle: "italic",
              fontSize: 12,
              color: "var(--faint)",
              margin: 0,
            }}
          >
            One EIP-712 signature grants a re-encryption key scoped to your address. Nothing is broadcast on-chain.
          </p>
        </div>
      </div>
    </section>
  );
}
