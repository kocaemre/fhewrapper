"use client";

import { ChainGuard } from "~~/components/ChainGuard";
import { PairGrid } from "~~/components/registry/PairGrid";
import { RegistryHero } from "~~/components/registry/RegistryHero";
import { useRegistryPairs } from "~~/hooks/useRegistryPairs";

/**
 * Registry browse — Cellar Registry engraving UI (02-02).
 *
 * The client-only FHE provider tree (app/layout.tsx -> DappWrapperWithProviders)
 * and `ChainGuard` (connect + Sepolia gate) are inherited from Phase 1, untouched.
 * `RegistryBody` mounts only once ChainGuard passes, so `useRegistryPairs` runs
 * under a connected Sepolia wallet.
 *
 * This plan dresses the working 02-01 slice in the locked engraving design:
 * hero banner + full PairCard grid. Search/filter + skeleton/error polish land
 * in 02-03; loading/error keep a minimal engraving-styled fallback here.
 */
function RegistryBody() {
  const { pairs, validCount, isLoading, isError, refetch } = useRegistryPairs();

  return (
    <>
      <RegistryHero pairCount={validCount} />

      {isLoading && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: "60px 0", fontStyle: "italic" }}>
          Reading the ledger…
        </div>
      )}

      {isError && (
        <div
          role="alert"
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            border: "2px solid var(--red)",
            background: "var(--red-dim)",
            padding: "14px 18px",
            fontSize: 14.5,
          }}
        >
          <span>
            <strong>The ledger could not be read.</strong> The Sepolia registry didn&apos;t respond — usually a
            public-RPC hiccup.
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              marginLeft: "auto",
              border: "2px solid var(--red)",
              background: "transparent",
              color: "var(--red)",
              padding: "7px 16px",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "var(--font-gelasio), Georgia, serif",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && pairs.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: "60px 0", fontStyle: "italic" }}>
          No wrapper pairs are listed on the registry yet.
        </div>
      )}

      {!isLoading && !isError && pairs.length > 0 && <PairGrid pairs={pairs} />}
    </>
  );
}

export default function Home() {
  return (
    <main style={{ position: "relative", maxWidth: 1180, margin: "0 auto", padding: "40px 30px 120px", width: "100%" }}>
      <ChainGuard>
        <RegistryBody />
      </ChainGuard>
    </main>
  );
}
