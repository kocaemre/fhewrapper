"use client";

import { useIsAllowed } from "@zama-fhe/react-sdk";
import type { Address } from "viem";
import { zeroAddress } from "viem";

const MONO = "var(--font-jetbrains-mono), monospace";

/**
 * Cached-permit status indicator (DEC-03 — "viewing key active").
 *
 * Reads the verified 3.0.0 `useIsAllowed` hook: it reports whether a session
 * signature (the single reusable EIP-712 permit granted via `useAllow`) is
 * cached in-window for the connected wallet AND covers the given token. When it
 * is, decrypts skip the wallet prompt — so we surface a small green
 * "◈ VIEWING KEY ACTIVE" badge to explain why the CTA reads "Decrypt" instead
 * of "Sign & Decrypt".
 *
 * W2 (non-empty-tuple): `useIsAllowed` requires `[Address, ...Address[]]`; an
 * empty array fails check-types. When no address is set we pass `zeroAddress`
 * (a cheap local IndexedDB read that simply reports "no permit") and gate the
 * badge on a real `address` being present — mirrors the `useUserDecrypt`
 * engine's placeholder pattern. The badge is hidden unless a permit truly
 * covers a real token, so it never shows for the zero placeholder.
 */
export function PermitIndicator({ address }: { address?: Address }) {
  const { data: allowed } = useIsAllowed({ contractAddresses: [address ?? zeroAddress] });

  if (!address || allowed !== true) return null;

  return (
    <span
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: MONO,
        fontSize: 10.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: "var(--green)",
        whiteSpace: "nowrap",
      }}
    >
      ◈ Viewing key active
    </span>
  );
}
