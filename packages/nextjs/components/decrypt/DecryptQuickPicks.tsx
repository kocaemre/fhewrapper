"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { getAddress } from "viem";
import { useRegistryPairs } from "~~/hooks/useRegistryPairs";
import { normalizeSymbol } from "~~/lib/tokenSymbol";

const MONO = "var(--font-jetbrains-mono), monospace";

/**
 * Registry-token quick-picks for the decrypt panel (DEC-02 "both entry points").
 *
 * The paste-an-address input proves "any ERC-7984 token"; these chips prove the
 * *registry* entry point — the connected wallet's official ERC-20 ⇄ ERC-7984
 * pairs surfaced as one-click decrypt targets (CONTEXT decision B). Clicking a
 * chip sets the panel's target address to that pair's confidential (ERC-7984)
 * side, which then flows through the same two-stage trust gate + engine.
 *
 * Source of truth is the SAME Phase-2 `useRegistryPairs()` that powers the
 * registry browse — VALID pairs only (an invalid/paused pair is not offered as
 * a decrypt target). Symbols are display-normalized (`cUSDCMock` → `cUSDC`) via
 * the shared `normalizeSymbol` helper. Deduped by confidential address so an
 * onchain+local overlap never renders a chip twice.
 *
 * Purely presentational: the parent owns the selected address and the decrypt
 * flow; this component only reports picks. No new relayer/RPC calls beyond the
 * registry read that Phase 2 already performs.
 */
export function DecryptQuickPicks({ onPick, selected }: { onPick: (address: Address) => void; selected?: Address }) {
  const { pairs } = useRegistryPairs();

  // Valid pairs only, deduped by confidential address (onchain+local overlap).
  const chips = useMemo(() => {
    const seen = new Set<string>();
    const out: { address: Address; symbol: string }[] = [];
    for (const p of pairs) {
      if (!p.isValid) continue;
      const address = getAddress(p.confidential.address);
      const key = address.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ address, symbol: normalizeSymbol(p.confidential.symbol) });
    }
    return out;
  }, [pairs]);

  // Nothing to offer yet (list still loading or empty) — stay silent, the paste
  // input remains the always-available entry point.
  if (chips.length === 0) return null;

  const selectedKey = selected ? selected.toLowerCase() : undefined;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <span style={{ fontStyle: "italic", fontSize: 12, color: "var(--faint)" }}>or pick:</span>
      {chips.map(chip => {
        const isSel = chip.address.toLowerCase() === selectedKey;
        return (
          <button
            key={chip.address}
            type="button"
            onClick={() => onPick(chip.address)}
            aria-pressed={isSel}
            title={chip.address}
            style={{
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 13px",
              cursor: "pointer",
              color: isSel ? "var(--blue)" : "var(--ink)",
              background: isSel ? "var(--blue-dim)" : "var(--bg2)",
              border: `1.5px solid ${isSel ? "var(--blue)" : "var(--line-soft)"}`,
              lineHeight: 1,
              transition: "border-color 0.12s, background 0.12s, color 0.12s",
            }}
          >
            ◈ {chip.symbol}
          </button>
        );
      })}
    </div>
  );
}
