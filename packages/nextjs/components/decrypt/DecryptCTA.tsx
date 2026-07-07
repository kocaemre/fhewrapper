"use client";

import { useState } from "react";
import type { DecryptStage } from "~~/hooks/useUserDecrypt";

const SERIF = "var(--font-gelasio), Georgia, serif";

/**
 * State-driven Sign & Decrypt button (DEC-02/DEC-03). Presentational: the label
 * and disabled state are derived from the shared engine `stage` plus connection
 * and cached-permit status, matching the 03-UI-SPEC state machine exactly.
 *
 * Label priority: not-connected → busy (signing/decrypting) → revealed →
 * token-not-ready (`disabled`) → permit-active (Decrypt, skips signing; DEC-03)
 * → default (Sign & Decrypt).
 */
export function DecryptCTA({
  stage,
  disabled,
  hasPermit,
  isConnected,
  onClick,
}: {
  stage: DecryptStage;
  /** Token not ready (empty/invalid/not-confidential/checking) — force-disable. */
  disabled: boolean;
  hasPermit: boolean | undefined;
  isConnected: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);

  let label: string;
  let isDisabled: boolean;

  if (!isConnected) {
    label = "Connect wallet to decrypt";
    isDisabled = true;
  } else if (stage === "signing") {
    label = "Check your wallet — sign the EIP-712 message…";
    isDisabled = true;
  } else if (stage === "decrypting") {
    label = "Decrypting via gateway…";
    isDisabled = true;
  } else if (stage === "revealed") {
    label = "Decrypt another";
    isDisabled = false;
  } else if (disabled) {
    label = "Enter an ERC-7984 address";
    isDisabled = true;
  } else if (hasPermit) {
    label = "Decrypt";
    isDisabled = false;
  } else {
    label = "Sign & Decrypt (EIP-712)";
    isDisabled = false;
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: "2px solid var(--line)",
        background: isDisabled ? "var(--panel2)" : "var(--block)",
        color: isDisabled ? "var(--faint)" : "var(--block-fg)",
        padding: 15,
        width: "100%",
        fontFamily: SERIF,
        fontSize: 16,
        fontWeight: 700,
        cursor: isDisabled ? "not-allowed" : "pointer",
        transform: !isDisabled && hover ? "translate(-1px,-1px)" : "none",
        transition: "transform 0.12s ease",
      }}
    >
      {label}
    </button>
  );
}
