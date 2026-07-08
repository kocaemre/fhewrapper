"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChainGuard } from "~~/components/ChainGuard";
import { WrapPanel } from "~~/components/wrap/WrapPanel";
import { useRegistryPairs } from "~~/hooks/useRegistryPairs";

/**
 * /wrap — the wrap screen (WRP-01 / WRP-02).
 *
 * Like /decrypt this is a connection-required (write) flow, so the panel is
 * wrapped in the Phase-1 `ChainGuard` (wallet on Sepolia). The target pair is
 * resolved from the `?token=<confidentialAddr>` query param against the trusted
 * onchain registry (`useRegistryPairs`) — never free contract input (V14 / T-04-09).
 *
 * `useSearchParams` requires a Suspense boundary during prerender (Next 15).
 */
function WrapResolver() {
  const token = useSearchParams().get("token");
  const { pairs, isLoading } = useRegistryPairs();

  const pair = token ? pairs.find(p => p.confidential.address.toLowerCase() === token.toLowerCase()) : undefined;

  if (!token || (!pair && !isLoading)) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", padding: "40px 0" }}>
        <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 16 }}>
          {token ? "That pair isn’t in the registry." : "Pick a pair from the registry to wrap."}
        </p>
        <Link
          href="/"
          style={{
            border: "2px solid var(--line)",
            background: "var(--block)",
            color: "var(--block-fg)",
            padding: "10px 20px",
            fontWeight: 600,
            fontSize: 14,
            fontFamily: "var(--font-gelasio), Georgia, serif",
            textDecoration: "none",
          }}
        >
          ← Back to the ledger
        </Link>
      </div>
    );
  }

  if (!pair) {
    return (
      <p style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
        Loading pair…
      </p>
    );
  }

  return <WrapPanel pair={pair} />;
}

export default function WrapPage() {
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 30px 120px", width: "100%" }}>
      <ChainGuard>
        <Suspense fallback={null}>
          <WrapResolver />
        </Suspense>
      </ChainGuard>
    </main>
  );
}
