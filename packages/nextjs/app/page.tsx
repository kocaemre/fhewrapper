"use client";

import { useEffect, useMemo, useState } from "react";
import { PairCardSkeleton } from "~~/components/registry/PairCardSkeleton";
import { PairGrid } from "~~/components/registry/PairGrid";
import { RegistryEmpty } from "~~/components/registry/RegistryEmpty";
import { RegistryError } from "~~/components/registry/RegistryError";
import { RegistryHero } from "~~/components/registry/RegistryHero";
import { RegistryToolbar } from "~~/components/registry/RegistryToolbar";
import { SideMotifs } from "~~/components/registry/SideMotifs";
import { useRegistryPairs } from "~~/hooks/useRegistryPairs";
import { type RegistryFilter, filterPairs } from "~~/lib/filterPairs";
import { signalRegistrySettled } from "~~/lib/preloadSignals";

/**
 * Registry browse — Cellar Registry engraving UI (02-02) + search/filter/states (02-03).
 *
 * The client-only FHE provider tree (app/layout.tsx -> DappWrapperWithProviders)
 * is inherited from Phase 1, untouched. The browse is READ-ONLY and renders for
 * EVERYONE — connected or not (REG-01 SC1: a fresh/incognito wallet must see the
 * pair list). `useRegistryPairs` reads the public Sepolia RPC and needs no
 * connected account, so the registry is NOT wrapped in `ChainGuard`. The connect
 * button lives in the global Header; `ChainGuard` stays available for future
 * write actions (wrap ships Phase 4).
 *
 * State branching (02-03 Task 2):
 *   isLoading            -> a grid of 6 PairCardSkeletons
 *   isError              -> RegistryError banner whose Retry calls refetch
 *   resolved, 0 visible  -> RegistryEmpty (echoes the search when one is active)
 *   resolved, N visible  -> PairGrid
 *
 * `search`/`filter` are lifted here and combined (AND) via the pure `filterPairs`.
 */

/** A grid of loading placeholders that mirrors PairGrid's layout. */
function SkeletonGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: 18,
        width: "100%",
      }}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <PairCardSkeleton key={index} />
      ))}
    </div>
  );
}

function RegistryBody() {
  const { pairs, validCount, isLoading, isError, refetch } = useRegistryPairs();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RegistryFilter>("all");

  const visible = useMemo(() => filterPairs(pairs, search, filter), [pairs, search, filter]);

  // Tell the site-wide Preloader the registry's first load has settled (data OR
  // error) so it can lift the cover onto a fully-populated grid. Idempotent.
  useEffect(() => {
    if (!isLoading) signalRegistrySettled();
  }, [isLoading]);

  return (
    <>
      <RegistryHero pairCount={validCount} />

      {isLoading && <SkeletonGrid />}

      {!isLoading && isError && <RegistryError onRetry={refetch} />}

      {!isLoading && !isError && (
        <>
          <RegistryToolbar search={search} onSearchChange={setSearch} filter={filter} onFilterChange={setFilter} />
          {visible.length === 0 ? <RegistryEmpty search={search} /> : <PairGrid pairs={visible} />}
        </>
      )}
    </>
  );
}

export default function Home() {
  return (
    // position:relative establishes the full-page-height containing block for the
    // absolutely-positioned SideMotifs (top:0; bottom:0) so they scroll with the
    // page and flank the content top-to-bottom. overflowX:clip guards against any
    // gutter strip ever nudging horizontal scroll.
    <div style={{ position: "relative", overflowX: "clip" }}>
      {/* Decorative engraving strips flanking the centered content (absolute, full
          page height, behind everything, hidden < 1280px — see SideMotifs). */}
      <SideMotifs />
      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1180,
          margin: "0 auto",
          padding: "40px 30px 120px",
          width: "100%",
        }}
      >
        <RegistryBody />
      </main>
    </div>
  );
}
