"use client";

import { useState } from "react";
import Link from "next/link";
import { PairCardDecrypt } from "../decrypt/PairCardDecrypt";
import { AddressCopyButton } from "./AddressCopyButton";
import { PairBadge } from "./PairBadge";
import { TokenIcon } from "./TokenIcon";
import { normalizeSymbol } from "~~/lib/tokenSymbol";
import type { RegistryPair } from "~~/registry/types";

/**
 * Full Cellar-engraving pair card (02-UI-SPEC PairCard) — REG-06.
 *
 * Sections top→bottom:
 *   1. TokenIcon (46px) + `cSymbol ⇄ symbol` + italic name + valid/revoked badge
 *   2. dashed divider → ERC-20 copy row + ERC-7984 (blue) copy row
 *   3. dashed divider → decimals + Wrap CTA
 *
 * Revoked pairs render at opacity 0.6 with a disabled `Unavailable` CTA. The
 * `Wrap →` CTA is FUNCTIONAL as of Phase 4 — it links to `/wrap?token=<confidential
 * address>`. Each side's own decimals are shown separately (Pitfall 4).
 *
 * Onchain `name`/`symbol` are untrusted strings rendered through React/JSX
 * escaping only — never dangerouslySetInnerHTML (T-02-01).
 */
export function PairCard({ pair }: { pair: RegistryPair }) {
  const { underlying, confidential, isValid } = pair;
  const [hover, setHover] = useState(false);

  const cSymbol = normalizeSymbol(confidential.symbol);
  const symbol = normalizeSymbol(underlying.symbol);
  const dec = (m: RegistryPair["underlying"]) => (m.decimalsKnown ? String(m.decimals) : "?");
  const decimalsDiffer =
    confidential.decimals !== underlying.decimals || confidential.decimalsKnown !== underlying.decimalsKnown;

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: "2px solid var(--line)",
        background: "var(--panel)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: isValid ? 1 : 0.6,
        transform: isValid && hover ? "translate(-2px,-2px)" : "none",
        boxShadow: isValid && hover ? "var(--shadow)" : "none",
        transition: "transform 0.12s, box-shadow 0.12s",
        textAlign: "left",
      }}
    >
      {/* Section 1 — identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TokenIcon confidentialSymbol={confidential.symbol} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 17 }}>{cSymbol}</span>
            <span style={{ color: "var(--faint)", fontSize: 13, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
              ⇄ {symbol}
            </span>
          </div>
          <div
            style={{
              color: "var(--muted)",
              fontSize: 13.5,
              fontStyle: "italic",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {confidential.name}
          </div>
        </div>
        <PairBadge isValid={isValid} />
      </div>

      {/* Section 2 — both-network addresses (copyable) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          borderTop: "1px dashed var(--line-soft)",
          paddingTop: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 86,
              flex: "none",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 10.5,
              color: "var(--muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            ERC-20
          </span>
          <AddressCopyButton address={underlying.address} standard="ERC-20" symbol={symbol} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 86,
              flex: "none",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 10.5,
              color: "var(--blue)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            ERC-7984 ◈
          </span>
          <AddressCopyButton address={confidential.address} standard="ERC-7984" symbol={cSymbol} />
        </div>
      </div>

      {/* Section 3 — decimals + Wrap CTA */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderTop: "1px dashed var(--line-soft)",
          paddingTop: 13,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
          decimals{" "}
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontStyle: "normal",
              color: "var(--ink)",
              fontWeight: 600,
            }}
          >
            {dec(confidential)}
          </span>
          {decimalsDiffer && (
            <span style={{ color: "var(--faint)" }}>
              {" "}
              · ERC-20{" "}
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontStyle: "normal",
                  color: "var(--ink)",
                  fontWeight: 600,
                }}
              >
                {dec(underlying)}
              </span>
            </span>
          )}
        </span>
        <div style={{ flex: 1 }} />
        {isValid ? (
          // Functional in Phase 4: navigate to the wrap screen for this pair,
          // keyed by the ERC-7984 confidential (= wrapper) address from the
          // trusted registry (WRP-01, T-04-09).
          <Link
            href={`/wrap?token=${confidential.address}`}
            style={{
              border: "2px solid var(--line)",
              background: "var(--block)",
              color: "var(--block-fg)",
              padding: "8px 18px",
              fontWeight: 600,
              fontSize: 14,
              fontFamily: "var(--font-gelasio), Georgia, serif",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Wrap →
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled
            style={{
              border: "2px solid var(--line-soft)",
              background: "transparent",
              color: "var(--faint)",
              padding: "8px 18px",
              fontWeight: 600,
              fontSize: 14,
              fontFamily: "var(--font-gelasio), Georgia, serif",
              cursor: "not-allowed",
            }}
          >
            Unavailable
          </button>
        )}
      </div>

      {/* Section 4 — per-card confidential-balance decrypt (03-01, DEC-01/03/04).
          Self-gates on connection + Sepolia; registry browse stays ungated. */}
      <PairCardDecrypt pair={pair} />
    </article>
  );
}
