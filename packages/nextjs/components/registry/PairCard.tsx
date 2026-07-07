import type { RegistryPair } from "~~/registry/types";

/**
 * Minimal PairCard (REG-06) — REAL onchain data only, no theme/icons/search.
 * The full Cellar-engraving card (icons, copy affordance, parchment/cellar
 * themes) lands in 02-02; this proves both-side metadata + addresses + status.
 *
 * Onchain `name`/`symbol` are untrusted display strings rendered through normal
 * JSX (React escaping) — never dangerouslySetInnerHTML (T-02-01).
 */
export function PairCard({ pair }: { pair: RegistryPair }) {
  const { underlying, confidential, isValid } = pair;
  return (
    <div
      style={{
        border: "1px solid #999",
        borderRadius: 8,
        padding: 16,
        opacity: isValid ? 1 : 0.6,
        fontFamily: "monospace",
        fontSize: 13,
        lineHeight: 1.6,
        wordBreak: "break-all",
        textAlign: "left",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700 }}>
        {confidential.symbol} <span style={{ opacity: 0.6 }}>←</span> {underlying.symbol}
      </div>
      <div style={{ opacity: 0.8 }}>{confidential.name}</div>
      <div>
        <strong>{isValid ? "✓ Valid" : "✕ Revoked"}</strong>
        {pair.source === "local" ? " · local" : ""}
      </div>
      <hr style={{ margin: "8px 0", opacity: 0.3 }} />
      <div>
        ERC-7984: {confidential.address} · {confidential.decimalsKnown ? `${confidential.decimals} dp` : "? dp"}
      </div>
      <div>
        ERC-20: {underlying.address} · {underlying.decimalsKnown ? `${underlying.decimals} dp` : "? dp"}
      </div>
    </div>
  );
}
