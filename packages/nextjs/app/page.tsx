"use client";

import { ChainGuard } from "~~/components/ChainGuard";
import { PairGrid } from "~~/components/registry/PairGrid";
import { useRegistryPairs } from "~~/hooks/useRegistryPairs";

/**
 * Registry browse — minimal live render (02-01).
 *
 * The client-only FHE provider tree (app/layout.tsx -> DappWrapperWithProviders)
 * and `ChainGuard` (connect + Sepolia gate) are inherited from Phase 1, untouched.
 * `RegistryBody` mounts only once ChainGuard passes, so `useRegistryPairs` runs
 * under a connected Sepolia wallet. This proves the registry read + multicall +
 * merge end-to-end with real data — the full Cellar UI (icons, search, themes)
 * lands in 02-02/02-03.
 */
function RegistryBody() {
  const { pairs, validCount, isLoading, isError, refetch } = useRegistryPairs();

  if (isLoading) {
    return <div>Loading registry pairs…</div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-2 items-center">
        <div>Failed to read the registry.</div>
        <button className="btn btn-sm" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (pairs.length === 0) {
    return <div>No wrapper pairs found in the registry.</div>;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="text-sm opacity-70">
        {pairs.length} pair{pairs.length === 1 ? "" : "s"} · {validCount} valid
      </div>
      <PairGrid pairs={pairs} />
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-8 items-center w-full px-3 md:px-0">
      <div className="max-w-6xl w-full mx-auto p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Confidential Wrapper Registry</h1>
          <p className="text-gray-600">Official ERC-20 ↔ ERC-7984 wrapper pairs on Sepolia</p>
        </div>
        <ChainGuard>
          <RegistryBody />
        </ChainGuard>
      </div>
    </div>
  );
}
